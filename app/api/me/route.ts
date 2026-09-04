/**
 * The learner's account, settings and headline numbers.
 *
 * One request that the profile page can render from entirely, rather than the
 * three it would otherwise make. Deliberately does not include cards or the
 * review log — that is sync's job, and this endpoint is for the parts a page
 * shows immediately.
 */

import { and, count, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { badRequest, ok, readJson, route } from "@/lib/api/respond";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { user, srsCard, reviewLog, srsSetting, learningProfile, syncDevice } = schema;

export const GET = route(async () => {
  const me = await requireUser();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);

  const [profile, settings, cardCounts, recentReviews, devices, account] =
    await Promise.all([
      db.select().from(learningProfile).where(eq(learningProfile.userId, me.id)),
      db.select().from(srsSetting).where(eq(srsSetting.userId, me.id)),
      db
        .select({
          phase: srsCard.phase,
          n: count(),
          // "Mature" is 21 days of stability — three weeks is where the
          // forgetting curve flattens enough to call something known.
          mature: sql<number>`count(*) filter (where ${srsCard.stability} >= 21)`,
        })
        .from(srsCard)
        .where(eq(srsCard.userId, me.id))
        .groupBy(srsCard.phase),
      db
        .select({ n: count() })
        .from(reviewLog)
        .where(and(eq(reviewLog.userId, me.id), gte(reviewLog.reviewedAt, monthAgo))),
      db
        .select({
          deviceId: syncDevice.deviceId,
          label: syncDevice.label,
          userAgent: syncDevice.userAgent,
          lastPushAt: syncDevice.lastPushAt,
          lastPullAt: syncDevice.lastPullAt,
        })
        .from(syncDevice)
        .where(eq(syncDevice.userId, me.id)),
      db.select().from(user).where(eq(user.id, me.id)),
    ]);

  return ok({
    user: {
      id: me.id,
      name: me.name,
      email: me.email,
      image: me.image ?? null,
      role: (me as { role?: string }).role ?? "user",
      emailVerified: me.emailVerified,
      joinedAt: account[0]?.createdAt ?? null,
    },
    profile: profile[0] ?? null,
    settings: settings[0] ?? null,
    cards: Object.fromEntries(cardCounts.map((c) => [c.phase, Number(c.n)])),
    mature: cardCounts.reduce((n, c) => n + Number(c.mature), 0),
    reviewsLast30Days: Number(recentReviews[0]?.n ?? 0),
    devices,
  });
});

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  image: z.string().url().max(500).nullable().optional(),
  dailyGoal: z.number().int().min(1).max(500).optional(),
  showFurigana: z.boolean().optional(),
  autoPlayAudio: z.boolean().optional(),
  voiceUri: z.string().max(300).nullable().optional(),
  voiceRate: z.number().min(0.1).max(3).optional(),
});

/**
 * `role` and `email` are absent from the schema by design. Role is not
 * self-serve, and changing an email has to re-verify it — Better Auth's
 * `/api/auth/change-email` owns that flow.
 */
export const PATCH = route(async (req: Request) => {
  const me = await requireUser();
  const body = patchSchema.parse(await readJson(req));

  const { name, image, ...prefs } = body;

  if (name !== undefined || image !== undefined) {
    await db
      .update(user)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(image !== undefined ? { image } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, me.id));
  }

  if (Object.keys(prefs).length > 0) {
    // The revision bump is what tells the learner's other devices to pick the
    // change up on their next sync.
    const [rev] = await db
      .insert(schema.userRevision)
      .values({ userId: me.id, value: 1 })
      .onConflictDoUpdate({
        target: schema.userRevision.userId,
        set: { value: sql`${schema.userRevision.value} + 1` },
      })
      .returning({ value: schema.userRevision.value });

    const updated = await db
      .update(learningProfile)
      .set({ ...prefs, revision: Number(rev.value), updatedAt: new Date() })
      .where(eq(learningProfile.userId, me.id))
      .returning();

    if (updated.length === 0) throw badRequest("No learning profile for this account.");
  }

  return ok({ ok: true });
});
