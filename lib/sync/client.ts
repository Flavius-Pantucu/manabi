"use client";

/**
 * The browser half of sync.
 *
 * Redux stays the write path. Nothing here blocks a review: `gradeCard` still
 * lands in localStorage synchronously, and this module reconciles with the
 * server afterwards, whenever there is a network. That ordering is the whole
 * reason the app still works on the Yamanote line.
 *
 * What it has to get right is not sending everything every time. A learner
 * with 4,000 cards would otherwise push a megabyte on each keystroke-sized
 * change, so the client keeps a high-water mark of what it has already
 * successfully pushed and sends only what moved past it.
 */

import type { SrsState } from "@/lib/store/features/srs-slice";
import type { LearningState } from "@/lib/store/features/learning-slice";
import type { SyncChanges, SyncResponse } from "./protocol";

const DEVICE_KEY = "manabi.deviceId";
const CURSOR_KEY = "manabi.syncCursor";
const PUSHED_KEY = "manabi.syncPushedAt";
const OWNER_KEY = "manabi.stateOwner";

/**
 * A stable id for this browser profile.
 *
 * Not the user id: the point is to tell two of the learner's own devices
 * apart, so the server can avoid handing each one back its own writes.
 */
export function deviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export const readCursor = (): number =>
  typeof window === "undefined" ? 0 : Number(localStorage.getItem(CURSOR_KEY) ?? 0);

export const writeCursor = (n: number) => {
  if (typeof window !== "undefined") localStorage.setItem(CURSOR_KEY, String(n));
};

/**
 * The high-water mark: the newest `lastReview` this device has already pushed.
 *
 * Kept outside redux deliberately. It describes what happened between this
 * browser and the server, not what the learner knows, so it has no business in
 * a store that gets exported, imported and merged.
 */
const readPushedAt = (): number =>
  typeof window === "undefined" ? 0 : Number(localStorage.getItem(PUSHED_KEY) ?? 0);

const writePushedAt = (n: number) => {
  if (typeof window !== "undefined") localStorage.setItem(PUSHED_KEY, String(n));
};

/**
 * Whose progress the persisted store currently holds.
 *
 * `null` means it was accumulated signed-out and belongs to nobody yet — the
 * case where adopting it into a new account is the right thing to do.
 */
export const stateOwner = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem(OWNER_KEY);

export const claimState = (userId: string) => {
  if (typeof window !== "undefined") localStorage.setItem(OWNER_KEY, userId);
};

/** Reset local sync bookkeeping — on sign-out, or when switching accounts. */
export function clearSyncState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURSOR_KEY);
  localStorage.removeItem(PUSHED_KEY);
  localStorage.removeItem(OWNER_KEY);
  // The device id survives: it identifies the browser, not the account.
}

export interface PushInput {
  srs: SrsState;
  learning: LearningState;
  /** Send everything regardless of the high-water mark — first sync after login. */
  full?: boolean;
}

/**
 * Everything changed since the last successful push.
 *
 * Cards are selected by `lastReview` rather than by diffing against a stored
 * copy of the previous state: a copy would double the app's localStorage
 * footprint, and `lastReview` already is the timestamp the server's merge rule
 * compares on.
 *
 * The gap that leaves is cards edited without being reviewed — bury and
 * reset — which is why both are included explicitly by due date.
 */
export function collectPush({ srs, learning, full }: PushInput) {
  const since = full ? 0 : readPushedAt();
  const now = Date.now();

  const cards = Object.values(srs.cards).filter((c) => {
    if (full) return true;
    if ((c.lastReview ?? 0) > since) return true;
    // Buried and reset cards move `due` without touching `lastReview`.
    return c.phase === "new" ? false : c.due > since && (c.lastReview ?? 0) === 0;
  });

  const reviews = srs.log.filter((l) => full || l.at > since);

  // Only days that could still be moving. Older rows are settled, and the
  // server already has them.
  const recentDays = new Set(
    reviews.map((r) => new Date(r.at).toISOString().slice(0, 10)),
  );
  recentDays.add(new Date(now).toISOString().slice(0, 10));

  const daily = Object.entries(srs.daily)
    .filter(([day]) => full || recentDays.has(day))
    .map(([day, v]) => ({ day, ...v }));

  return {
    deviceId: deviceId(),
    cursor: readCursor(),
    cards: cards.map((c) => ({
      id: c.id,
      phase: c.phase,
      stability: c.stability,
      difficulty: c.difficulty,
      due: c.due,
      lastReview: c.lastReview,
      reps: c.reps,
      lapses: c.lapses,
      step: c.step,
    })),
    reviews: reviews.map((l) => ({
      id: l.id,
      grade: l.grade,
      at: l.at,
      elapsed: l.elapsed,
      scheduled: l.scheduled,
      phase: l.phase,
      durationMs: l.durationMs,
    })),
    daily,
    settings: { ...srs.settings, updatedAt: now },
    learning: {
      streak: learning.streak,
      wordsLearned: learning.wordsLearned,
      verbsMastered: learning.verbsMastered,
      lessonsCompleted: learning.lessonsCompleted,
      learnedToday: learning.learnedToday,
      lastActivityDate: learning.lastActivityDate,
      dailyGoal: learning.dailyGoal,
      showFurigana: learning.showFurigana,
      autoPlayAudio: learning.autoPlayAudio,
      updatedAt: now,
    },
    statuses: [
      ...Object.entries(learning.vocabStatus).map(([refId, status]) => ({
        kind: "vocab" as const, refId: String(refId), status, updatedAt: now,
      })),
      ...Object.entries(learning.kanjiStatus).map(([refId, status]) => ({
        kind: "kanji" as const, refId: String(refId), status, updatedAt: now,
      })),
    ],
    bookmarks: learning.bookmarkedGrammar.map((refId) => ({
      kind: "grammar", refId: String(refId), updatedAt: now,
    })),
    activity: learning.activityLog
      .filter((a) => full || a.timestamp > since)
      .map((a) => ({
        clientId: a.id, action: a.action, category: a.category, at: a.timestamp,
      })),
  };
}

export class SyncError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "SyncError";
  }
}

/** One round trip: push local changes, receive everyone else's. */
export async function pushAndPull(input: PushInput): Promise<SyncResponse> {
  const body = collectPush(input);

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Sync is never worth serving stale.
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new SyncError(res.status, detail.message ?? `Sync failed (${res.status}).`);
  }

  const data = (await res.json()) as SyncResponse;

  // Advance both marks only after the server has confirmed the write. A
  // failure mid-push leaves them where they were, so the next attempt resends
  // — duplicates are free (the server de-duplicates), lost reviews are not.
  writeCursor(data.cursor);
  const newestPushed = Math.max(
    readPushedAt(),
    ...body.reviews.map((r) => r.at),
    ...body.cards.map((c) => c.lastReview ?? 0),
  );
  writePushedAt(newestPushed);

  return data;
}

/** Pull only. Used on a cold start, before anything local exists to send. */
export async function pull(cursor = readCursor()): Promise<SyncResponse> {
  const res = await fetch(
    `/api/sync?deviceId=${encodeURIComponent(deviceId())}&cursor=${cursor}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new SyncError(res.status, detail.message ?? `Sync failed (${res.status}).`);
  }
  const data = (await res.json()) as SyncResponse;
  writeCursor(data.cursor);
  return data;
}

export type { SyncChanges };
