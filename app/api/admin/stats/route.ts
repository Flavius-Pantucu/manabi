/**
 * The admin console's numbers.
 *
 * Guarded by `requireAdmin`, which answers 404 rather than 403 to a
 * non-admin — a console that confirms its own existence to every signed-in
 * account is an invitation.
 *
 * Deliberately aggregate-only. There is no endpoint here that returns one
 * learner's cards or review history: an admin has no reason to read a
 * learner's study data, and not building the route is the only version of that
 * guarantee that cannot be misconfigured.
 */

import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { ok, route } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { user, srsCard, reviewLog, quizAttempt, customDeck } = schema;

export const GET = route(async () => {
  await requireAdmin();

  const [users, cards, reviews, quizzes, decks, activeDays] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        verified: sql<number>`count(*) filter (where ${user.emailVerified})`,
        admins: sql<number>`count(*) filter (where ${user.role} = 'admin')`,
        last7: sql<number>`count(*) filter (where ${user.createdAt} > now() - interval '7 days')`,
      })
      .from(user),
    db.select({ n: sql<number>`count(*)` }).from(srsCard),
    db
      .select({
        total: sql<number>`count(*)`,
        last24h: sql<number>`count(*) filter (where ${reviewLog.reviewedAt} > now() - interval '24 hours')`,
        recalled: sql<number>`count(*) filter (where ${reviewLog.grade} > 1 and ${reviewLog.phase} = 'review')`,
        mature: sql<number>`count(*) filter (where ${reviewLog.phase} = 'review')`,
      })
      .from(reviewLog),
    db
      .select({
        total: sql<number>`count(*)`,
        avgScore: sql<number>`coalesce(avg(${quizAttempt.score}::float / nullif(${quizAttempt.total}, 0)), 0)`,
      })
      .from(quizAttempt),
    db.select({ n: sql<number>`count(*) filter (where ${customDeck.deleted} = false)` }).from(customDeck),
    // Learners who reviewed anything in the last 7 days.
    db
      .select({
        n: sql<number>`count(distinct ${reviewLog.userId})`,
      })
      .from(reviewLog)
      .where(sql`${reviewLog.reviewedAt} > now() - interval '7 days'`),
  ]);

  const r = reviews[0];
  return ok({
    users: {
      total: Number(users[0].total),
      verified: Number(users[0].verified),
      admins: Number(users[0].admins),
      newLast7Days: Number(users[0].last7),
      activeLast7Days: Number(activeDays[0].n),
    },
    cards: Number(cards[0].n),
    reviews: {
      total: Number(r.total),
      last24h: Number(r.last24h),
      trueRetention: Number(r.mature) ? Number(r.recalled) / Number(r.mature) : 0,
    },
    quizzes: {
      attempts: Number(quizzes[0].total),
      averageScore: Number(quizzes[0].avgScore),
    },
    customDecks: Number(decks[0].n),
  });
});
