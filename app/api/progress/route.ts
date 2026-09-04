/**
 * Progress statistics, computed in Postgres.
 *
 * The client can already derive all of this from its local state — and still
 * does, because the progress page has to work offline. This endpoint exists
 * for the things local state cannot answer honestly:
 *
 *  - the client caps its review log at 5,000 entries, so "retention over the
 *    last year" is a statistic it no longer has the data for;
 *  - a learner on three devices has three partial histories and one true one.
 *
 * Everything here is an aggregate over indexed columns, so none of it ships
 * the review log to the browser to be counted there.
 */

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { ok, route } from "@/lib/api/respond";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { srsCard, reviewLog, dailyStat } = schema;

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).default(30),
  forecastDays: z.coerce.number().int().min(1).max(365).default(30),
  leechThreshold: z.coerce.number().int().min(2).max(50).default(4),
});

export const GET = route(async (req: Request) => {
  const me = await requireUser();
  const url = new URL(req.url);
  const { days, forecastDays, leechThreshold } = querySchema.parse({
    days: url.searchParams.get("days") ?? undefined,
    forecastDays: url.searchParams.get("forecastDays") ?? undefined,
    leechThreshold: url.searchParams.get("leechThreshold") ?? undefined,
  });

  const since = new Date(Date.now() - days * 86_400_000);
  const mine = eq(srsCard.userId, me.id);

  const [maturity, retention, forecast, heatmap, leeches, byDeck, hardest] =
    await Promise.all([
      // Maturity mirrors maturityBreakdown() in lib/srs/queue.ts: young and
      // mature split at 21 days of stability.
      db
        .select({
          new: sql<number>`count(*) filter (where ${srsCard.phase} = 'new')`,
          learning: sql<number>`count(*) filter (where ${srsCard.phase} in ('learning','relearning'))`,
          young: sql<number>`count(*) filter (where ${srsCard.phase} = 'review' and ${srsCard.stability} < 21)`,
          mature: sql<number>`count(*) filter (where ${srsCard.phase} = 'review' and ${srsCard.stability} >= 21)`,
          total: sql<number>`count(*)`,
        })
        .from(srsCard)
        .where(mine),

      // True retention: only reviews of cards already in the review phase.
      // Learning-phase repetitions measure the session, not memory, and
      // including them inflates the number by ten points or more.
      db
        .select({
          sample: sql<number>`count(*)`,
          recalled: sql<number>`count(*) filter (where ${reviewLog.grade} > 1)`,
        })
        .from(reviewLog)
        .where(
          and(
            eq(reviewLog.userId, me.id),
            gte(reviewLog.reviewedAt, since),
            eq(reviewLog.phase, "review"),
          ),
        ),

      // Due counts per day. Overdue cards collapse into day 0, which is what
      // the learner actually faces when they open the app.
      db
        .select({
          day: sql<string>`to_char(greatest(${srsCard.due}, now())::date, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)`,
        })
        .from(srsCard)
        .where(
          and(
            mine,
            sql`${srsCard.phase} <> 'new'`,
            sql`${srsCard.due} < now() + make_interval(days => ${forecastDays})`,
          ),
        )
        .groupBy(sql`1`)
        .orderBy(sql`1`),

      db
        .select({
          day: dailyStat.day,
          reviews: dailyStat.reviews,
          newCards: dailyStat.newCards,
          correct: dailyStat.correct,
        })
        .from(dailyStat)
        .where(and(eq(dailyStat.userId, me.id), gte(dailyStat.day, since.toISOString().slice(0, 10))))
        .orderBy(dailyStat.day),

      db
        .select({
          cardId: srsCard.cardId,
          lapses: srsCard.lapses,
          reps: srsCard.reps,
          difficulty: srsCard.difficulty,
          deck: srsCard.deck,
          level: srsCard.level,
        })
        .from(srsCard)
        .where(and(mine, gte(srsCard.lapses, leechThreshold)))
        .orderBy(desc(srsCard.lapses))
        .limit(50),

      db
        .select({
          deck: srsCard.deck,
          total: sql<number>`count(*)`,
          mature: sql<number>`count(*) filter (where ${srsCard.stability} >= 21)`,
          due: sql<number>`count(*) filter (where ${srsCard.due} <= now() and ${srsCard.phase} <> 'new')`,
        })
        .from(srsCard)
        .where(mine)
        .groupBy(srsCard.deck),

      // The cards costing the most reviews for the least retention — the ones
      // worth reformulating rather than grinding.
      db
        .select({
          cardId: reviewLog.cardId,
          attempts: sql<number>`count(*)`,
          again: sql<number>`count(*) filter (where ${reviewLog.grade} = 1)`,
        })
        .from(reviewLog)
        .where(and(eq(reviewLog.userId, me.id), gte(reviewLog.reviewedAt, since)))
        .groupBy(reviewLog.cardId)
        .having(sql`count(*) >= 4 and count(*) filter (where ${reviewLog.grade} = 1) * 2 >= count(*)`)
        .orderBy(sql`count(*) filter (where ${reviewLog.grade} = 1) desc`)
        .limit(20),
    ]);

  const r = retention[0];
  const sample = Number(r?.sample ?? 0);

  return ok({
    window: { days, since: since.toISOString() },
    maturity: {
      new: Number(maturity[0]?.new ?? 0),
      learning: Number(maturity[0]?.learning ?? 0),
      young: Number(maturity[0]?.young ?? 0),
      mature: Number(maturity[0]?.mature ?? 0),
      total: Number(maturity[0]?.total ?? 0),
    },
    retention: {
      rate: sample ? Number(r.recalled) / sample : 0,
      sample,
    },
    forecast: forecast.map((f) => ({ date: f.day, count: Number(f.count) })),
    heatmap,
    leeches,
    byDeck: byDeck.map((d) => ({
      deck: d.deck ?? "unknown",
      total: Number(d.total),
      mature: Number(d.mature),
      due: Number(d.due),
    })),
    hardest: hardest.map((h) => ({
      cardId: h.cardId,
      attempts: Number(h.attempts),
      again: Number(h.again),
      lapseRate: Number(h.again) / Number(h.attempts),
    })),
  });
});
