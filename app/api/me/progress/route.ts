/**
 * Erase the caller's study history, keeping the account.
 *
 * Distinct from deleting the account, which Better Auth owns: this is the
 * "start over" a learner wants when the numbers on their profile came from
 * somewhere they don't recognise — a shared browser, an import, a prototype
 * build. Without it the only way to zero the app was to clear site data, which
 * a signed-in learner would reasonably expect not to work, because the data is
 * on the server too.
 *
 * Requires the learner to type their own email back. A single unguarded DELETE
 * on the one irreplaceable thing in the product is not a button worth having.
 */

import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { badRequest, ok, readJson, route } from "@/lib/api/respond";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /** Must equal the signed-in account's address, case-insensitively. */
  confirm: z.string().min(1),
});

export const DELETE = route(async (req: Request) => {
  const me = await requireUser();
  const { confirm } = bodySchema.parse(await readJson(req));

  if (confirm.trim().toLowerCase() !== me.email.toLowerCase()) {
    throw badRequest("Type your email address exactly to confirm.");
  }

  const {
    srsCard, reviewLog, dailyStat, activity, bookmark, contentStatus,
    quizAttempt, learningProfile, srsSetting, userRevision, syncDevice,
  } = schema;

  await db.transaction(async (tx) => {
    await tx.delete(srsCard).where(eq(srsCard.userId, me.id));
    await tx.delete(reviewLog).where(eq(reviewLog.userId, me.id));
    await tx.delete(dailyStat).where(eq(dailyStat.userId, me.id));
    await tx.delete(activity).where(eq(activity.userId, me.id));
    await tx.delete(bookmark).where(eq(bookmark.userId, me.id));
    await tx.delete(contentStatus).where(eq(contentStatus.userId, me.id));
    // quiz_answer cascades from quiz_attempt.
    await tx.delete(quizAttempt).where(eq(quizAttempt.userId, me.id));

    // Custom decks are the learner's own authored content, not history, so
    // they survive. Their scheduling state went with `srs_card` above.

    /**
     * Every other device is still holding the old state and will push it back
     * on its next sync unless it is told to start over. Bumping the revision
     * past anything they know, then resetting the rows they sync against, is
     * what makes the erase stick across devices rather than bouncing back.
     */
    const [rev] = await tx
      .insert(userRevision)
      .values({ userId: me.id, value: 1 })
      .onConflictDoUpdate({
        target: userRevision.userId,
        set: { value: sql`${userRevision.value} + 1` },
      })
      .returning({ value: userRevision.value });
    const revision = Number(rev.value);

    await tx
      .update(learningProfile)
      .set({
        streak: 0, wordsLearned: 0, verbsMastered: 0, lessonsCompleted: 0,
        learnedToday: 0, lastActivityDate: null,
        revision, updatedAt: new Date(),
      })
      .where(eq(learningProfile.userId, me.id));

    await tx
      .update(srsSetting)
      .set({ revision, updatedAt: new Date() })
      .where(eq(srsSetting.userId, me.id));

    // Force every device to re-pull from nothing rather than trust its cursor.
    await tx.delete(syncDevice).where(eq(syncDevice.userId, me.id));
  });

  return ok({ ok: true });
});
