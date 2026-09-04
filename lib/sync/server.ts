/**
 * Applying a push, and collecting what to send back.
 *
 * Every write in a push shares one revision, allocated once at the top of the
 * transaction (see `lib/db/schema/_shared.ts`). That is what makes the cursor
 * the client feeds back meaningful: "everything up to and including push N".
 *
 * The merge rules are the ones in `lib/srs/backup.ts`, moved into SQL so they
 * run as one statement per table rather than a read-modify-write per row. They
 * are expressed as `ON CONFLICT … DO UPDATE … WHERE`, which means a row that
 * loses the comparison is not written at all — no revision bump, so a stale
 * device pushing old state cannot make every other device re-download it.
 */

import { and, asc, desc, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AppliedCounts, PushBody, SyncChanges, WireCard } from "./protocol";

const {
  srsCard, reviewLog, dailyStat, srsSetting, syncDevice,
  learningProfile, bookmark, contentStatus, activity, userRevision,
} = schema;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Postgres caps a statement at 65535 parameters; stay well clear of it. */
const CHUNK = 400;

function chunk<T>(rows: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

const ms = (n: number) => new Date(n);
const msOrNull = (n: number | null | undefined) =>
  n === null || n === undefined ? null : new Date(n);

/**
 * Take the next revision for this learner.
 *
 * The upsert-with-increment is deliberate: it takes a row lock, so two devices
 * pushing at the same moment serialise here instead of both reading the same
 * value and writing rows that share a revision one of them will never pull.
 */
async function allocateRevision(tx: Tx, userId: string): Promise<number> {
  const [row] = await tx
    .insert(userRevision)
    .values({ userId, value: 1 })
    .onConflictDoUpdate({
      target: userRevision.userId,
      set: { value: sql`${userRevision.value} + 1` },
    })
    .returning({ value: userRevision.value });
  return Number(row.value);
}

export async function currentRevision(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: userRevision.value })
    .from(userRevision)
    .where(eq(userRevision.userId, userId));
  return Number(row?.value ?? 0);
}

/** `vocab:食べる@たべる:meaning` → deck `vocab`. Best-effort; only for stats. */
function deckOf(card: WireCard): string | null {
  if (card.deck) return card.deck;
  const head = card.id.split(":")[0];
  return head === "kana" ? `kana-${card.id.split(":")[1] === "ka" ? "katakana" : "hiragana"}` : head || null;
}

export async function applyPush(
  userId: string,
  body: PushBody,
): Promise<{ revision: number; applied: AppliedCounts }> {
  return db.transaction(async (tx) => {
    const rev = await allocateRevision(tx, userId);
    const applied: AppliedCounts = {
      cards: 0, reviews: 0, daily: 0, statuses: 0,
      bookmarks: 0, activity: 0, settings: 0, learning: 0,
    };

    // ── cards ───────────────────────────────────────────────────────────────
    // Whole-row replacement, never field-by-field: a card is one coherent
    // scheduling state, and taking `stability` from one device and `due` from
    // another yields a card no sequence of reviews could have produced.
    for (const part of chunk(body.cards)) {
      const rows = part.map((c) => ({
        userId,
        cardId: c.id,
        phase: c.phase,
        stability: c.stability,
        difficulty: c.difficulty,
        due: ms(c.due),
        lastReview: msOrNull(c.lastReview),
        reps: c.reps,
        lapses: c.lapses,
        step: c.step,
        deck: deckOf(c),
        level: c.level ?? null,
        deviceId: body.deviceId,
        revision: rev,
      }));

      const res = await tx
        .insert(srsCard)
        .values(rows)
        .onConflictDoUpdate({
          target: [srsCard.userId, srsCard.cardId],
          set: {
            phase: sql`excluded.phase`,
            stability: sql`excluded.stability`,
            difficulty: sql`excluded.difficulty`,
            due: sql`excluded.due`,
            lastReview: sql`excluded.last_review`,
            reps: sql`excluded.reps`,
            lapses: sql`excluded.lapses`,
            step: sql`excluded.step`,
            deck: sql`excluded.deck`,
            level: sql`excluded.level`,
            deviceId: sql`excluded.device_id`,
            revision: rev,
            updatedAt: sql`now()`,
          },
          // Most-recently-reviewed wins, exactly as mergeBackup does.
          //
          // `>=` rather than `>` on purpose: burying and resetting a card move
          // `due` without touching `last_review`, so a strict comparison would
          // drop those edits on the floor. The cost is that re-pushing
          // unchanged state bumps the revision and the device pulls its own
          // echo back — which `device_id` filtering below removes anyway.
          setWhere: sql`coalesce(excluded.last_review, to_timestamp(0)) >= coalesce(${srsCard.lastReview}, to_timestamp(0))`,
        });
      applied.cards += res.rowCount ?? 0;
    }

    // ── review log ──────────────────────────────────────────────────────────
    // Append-only. The unique index on (user, card, reviewed_at) makes a
    // re-push of an unacknowledged batch a no-op rather than a duplicate, so
    // the client can retry without bookkeeping.
    for (const part of chunk(body.reviews)) {
      const res = await tx
        .insert(reviewLog)
        .values(
          part.map((r) => ({
            userId,
            cardId: r.id,
            grade: r.grade,
            reviewedAt: ms(r.at),
            elapsed: r.elapsed,
            scheduled: r.scheduled,
            phase: r.phase,
            durationMs: r.durationMs ?? null,
            deviceId: body.deviceId,
            revision: rev,
          })),
        )
        .onConflictDoNothing({
          target: [reviewLog.userId, reviewLog.cardId, reviewLog.reviewedAt],
        });
      applied.reviews += res.rowCount ?? 0;
    }

    // ── daily counters ──────────────────────────────────────────────────────
    // Per-field maximum. These are caps the queue builder reads, so the safe
    // direction on a conflict is the higher count: under-counting would let a
    // learner blow through the daily new-card limit by switching devices.
    for (const part of chunk(body.daily)) {
      const res = await tx
        .insert(dailyStat)
        .values(
          part.map((d) => ({
            userId,
            day: d.day,
            reviews: d.reviews,
            newCards: d.newCards,
            correct: d.correct,
            revision: rev,
          })),
        )
        .onConflictDoUpdate({
          target: [dailyStat.userId, dailyStat.day],
          set: {
            reviews: sql`greatest(${dailyStat.reviews}, excluded.reviews)`,
            newCards: sql`greatest(${dailyStat.newCards}, excluded.new_cards)`,
            correct: sql`greatest(${dailyStat.correct}, excluded.correct)`,
            revision: rev,
            updatedAt: sql`now()`,
          },
          setWhere: sql`excluded.reviews > ${dailyStat.reviews}
            or excluded.new_cards > ${dailyStat.newCards}
            or excluded.correct > ${dailyStat.correct}`,
        });
      applied.daily += res.rowCount ?? 0;
    }

    // ── settings ────────────────────────────────────────────────────────────
    if (body.settings) {
      const s = body.settings;
      const res = await tx
        .insert(srsSetting)
        .values({
          userId,
          newPerDay: s.newPerDay,
          maxReviewsPerDay: s.maxReviewsPerDay,
          disabledDecks: s.disabledDecks,
          levels: s.levels,
          revision: rev,
          updatedAt: ms(s.updatedAt),
        })
        .onConflictDoUpdate({
          target: srsSetting.userId,
          set: {
            newPerDay: sql`excluded.new_per_day`,
            maxReviewsPerDay: sql`excluded.max_reviews_per_day`,
            disabledDecks: sql`excluded.disabled_decks`,
            levels: sql`excluded.levels`,
            revision: rev,
            updatedAt: sql`excluded.updated_at`,
          },
          setWhere: sql`excluded.updated_at >= ${srsSetting.updatedAt}`,
        });
      applied.settings = res.rowCount ?? 0;
    }

    // ── learning profile ────────────────────────────────────────────────────
    if (body.learning) {
      const l = body.learning;
      const res = await tx
        .insert(learningProfile)
        .values({
          userId,
          streak: l.streak,
          wordsLearned: l.wordsLearned,
          verbsMastered: l.verbsMastered,
          lessonsCompleted: l.lessonsCompleted,
          learnedToday: l.learnedToday,
          lastActivityDate: l.lastActivityDate,
          dailyGoal: l.dailyGoal,
          showFurigana: l.showFurigana,
          autoPlayAudio: l.autoPlayAudio,
          voiceUri: l.voiceUri ?? null,
          voiceRate: l.voiceRate ?? 1,
          revision: rev,
          updatedAt: ms(l.updatedAt),
        })
        .onConflictDoUpdate({
          target: learningProfile.userId,
          set: {
            // Counters take the maximum: they only ever go up, and a device
            // that has been offline a week would otherwise roll them back.
            streak: sql`greatest(${learningProfile.streak}, excluded.streak)`,
            wordsLearned: sql`greatest(${learningProfile.wordsLearned}, excluded.words_learned)`,
            verbsMastered: sql`greatest(${learningProfile.verbsMastered}, excluded.verbs_mastered)`,
            lessonsCompleted: sql`greatest(${learningProfile.lessonsCompleted}, excluded.lessons_completed)`,
            // These are settings, not counters — newest edit wins.
            learnedToday: sql`excluded.learned_today`,
            lastActivityDate: sql`greatest(${learningProfile.lastActivityDate}, excluded.last_activity_date)`,
            dailyGoal: sql`excluded.daily_goal`,
            showFurigana: sql`excluded.show_furigana`,
            autoPlayAudio: sql`excluded.auto_play_audio`,
            voiceUri: sql`excluded.voice_uri`,
            voiceRate: sql`excluded.voice_rate`,
            revision: rev,
            updatedAt: sql`excluded.updated_at`,
          },
          setWhere: sql`excluded.updated_at >= ${learningProfile.updatedAt}`,
        });
      applied.learning = res.rowCount ?? 0;
    }

    // ── content statuses ────────────────────────────────────────────────────
    for (const part of chunk(body.statuses)) {
      const res = await tx
        .insert(contentStatus)
        .values(
          part.map((s) => ({
            userId,
            kind: s.kind,
            refId: s.refId,
            status: s.status,
            deleted: s.deleted ?? false,
            revision: rev,
            updatedAt: ms(s.updatedAt),
          })),
        )
        .onConflictDoUpdate({
          target: [contentStatus.userId, contentStatus.kind, contentStatus.refId],
          set: {
            status: sql`excluded.status`,
            deleted: sql`excluded.deleted`,
            revision: rev,
            updatedAt: sql`excluded.updated_at`,
          },
          setWhere: sql`excluded.updated_at >= ${contentStatus.updatedAt}`,
        });
      applied.statuses += res.rowCount ?? 0;
    }

    // ── bookmarks ───────────────────────────────────────────────────────────
    for (const part of chunk(body.bookmarks)) {
      const res = await tx
        .insert(bookmark)
        .values(
          part.map((b) => ({
            userId,
            kind: b.kind,
            refId: b.refId,
            deleted: b.deleted ?? false,
            revision: rev,
            updatedAt: ms(b.updatedAt),
          })),
        )
        .onConflictDoUpdate({
          target: [bookmark.userId, bookmark.kind, bookmark.refId],
          set: {
            deleted: sql`excluded.deleted`,
            revision: rev,
            updatedAt: sql`excluded.updated_at`,
          },
          setWhere: sql`excluded.updated_at >= ${bookmark.updatedAt}`,
        });
      applied.bookmarks += res.rowCount ?? 0;
    }

    // ── activity feed ───────────────────────────────────────────────────────
    for (const part of chunk(body.activity)) {
      const res = await tx
        .insert(activity)
        .values(
          part.map((a) => ({
            userId,
            action: a.action,
            category: a.category,
            clientId: a.clientId,
            revision: rev,
            createdAt: ms(a.at),
          })),
        )
        .onConflictDoNothing({ target: [activity.userId, activity.clientId] });
      applied.activity += res.rowCount ?? 0;
    }

    // ── device bookkeeping ──────────────────────────────────────────────────
    await tx
      .insert(syncDevice)
      .values({
        userId,
        deviceId: body.deviceId,
        cursor: rev,
        lastPushAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [syncDevice.userId, syncDevice.deviceId],
        set: { cursor: rev, lastPushAt: sql`now()` },
      });

    return { revision: rev, applied };
  });
}

/**
 * Everything this learner changed after `cursor`, excluding what `deviceId`
 * wrote itself.
 *
 * The review log is capped at the newest 5,000 — the same ceiling
 * `srs-slice.ts` keeps locally, so nothing is dropped that the client would
 * have kept anyway. Statistics that need the full history read the server
 * directly through `/api/progress` rather than shipping it to the browser.
 */
export async function collectChanges(
  userId: string,
  cursor: number,
  deviceId?: string,
): Promise<SyncChanges> {
  const mine = eq(srsCard.userId, userId);
  const after = gt(srsCard.revision, cursor);
  const notEcho = deviceId
    ? or(isNull(srsCard.deviceId), ne(srsCard.deviceId, deviceId))
    : undefined;

  const [cards, reviews, daily, settings, learning, statuses, bookmarks] =
    await Promise.all([
      db.select().from(srsCard).where(and(mine, after, notEcho)),

      db
        .select()
        .from(reviewLog)
        .where(
          and(
            eq(reviewLog.userId, userId),
            gt(reviewLog.revision, cursor),
            deviceId
              ? or(isNull(reviewLog.deviceId), ne(reviewLog.deviceId, deviceId))
              : undefined,
          ),
        )
        .orderBy(desc(reviewLog.reviewedAt))
        .limit(5_000),

      db
        .select()
        .from(dailyStat)
        .where(and(eq(dailyStat.userId, userId), gt(dailyStat.revision, cursor)))
        .orderBy(asc(dailyStat.day)),

      db
        .select()
        .from(srsSetting)
        .where(and(eq(srsSetting.userId, userId), gt(srsSetting.revision, cursor))),

      db
        .select()
        .from(learningProfile)
        .where(
          and(eq(learningProfile.userId, userId), gt(learningProfile.revision, cursor)),
        ),

      db
        .select()
        .from(contentStatus)
        .where(
          and(eq(contentStatus.userId, userId), gt(contentStatus.revision, cursor)),
        ),

      db
        .select()
        .from(bookmark)
        .where(and(eq(bookmark.userId, userId), gt(bookmark.revision, cursor))),
    ]);

  return {
    cards: cards.map((c) => ({
      id: c.cardId,
      phase: c.phase as WireCard["phase"],
      stability: c.stability,
      difficulty: c.difficulty,
      due: c.due.getTime(),
      lastReview: c.lastReview?.getTime() ?? null,
      reps: c.reps,
      lapses: c.lapses,
      step: c.step,
      deck: c.deck ?? undefined,
      level: c.level ?? undefined,
    })),
    // Restored to ascending: the client appends to a log it treats as
    // chronological, and `trueRetention` reads windows off the end of it.
    reviews: reviews.reverse().map((r) => ({
      id: r.cardId,
      grade: r.grade as 1 | 2 | 3 | 4,
      at: r.reviewedAt.getTime(),
      elapsed: r.elapsed,
      scheduled: r.scheduled,
      phase: r.phase as WireCard["phase"],
      durationMs: r.durationMs ?? undefined,
    })),
    daily: daily.map((d) => ({
      day: d.day,
      reviews: d.reviews,
      newCards: d.newCards,
      correct: d.correct,
    })),
    settings: settings[0]
      ? {
          newPerDay: settings[0].newPerDay,
          maxReviewsPerDay: settings[0].maxReviewsPerDay,
          disabledDecks: settings[0].disabledDecks,
          levels: settings[0].levels,
          updatedAt: settings[0].updatedAt.getTime(),
        }
      : null,
    learning: learning[0]
      ? {
          streak: learning[0].streak,
          wordsLearned: learning[0].wordsLearned,
          verbsMastered: learning[0].verbsMastered,
          lessonsCompleted: learning[0].lessonsCompleted,
          learnedToday: learning[0].learnedToday,
          lastActivityDate: learning[0].lastActivityDate,
          dailyGoal: learning[0].dailyGoal,
          showFurigana: learning[0].showFurigana,
          autoPlayAudio: learning[0].autoPlayAudio,
          voiceUri: learning[0].voiceUri,
          voiceRate: learning[0].voiceRate,
          updatedAt: learning[0].updatedAt.getTime(),
        }
      : null,
    statuses: statuses.map((s) => ({
      kind: s.kind as "vocab" | "kanji",
      refId: s.refId,
      status: s.status,
      deleted: s.deleted,
      updatedAt: s.updatedAt.getTime(),
    })),
    bookmarks: bookmarks.map((b) => ({
      kind: b.kind,
      refId: b.refId,
      deleted: b.deleted,
      updatedAt: b.updatedAt.getTime(),
    })),
  };
}
