/**
 * The activity feed.
 *
 * The client keeps the last 50 entries; the server keeps all of them. That is
 * the difference between "you studied 14 days running" being a fact and being
 * a number the browser asserts.
 */

import { desc, eq, gte, and, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { ok, readJson, route } from "@/lib/api/respond";
import { bumpRevision } from "@/lib/api/decks";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { activity } = schema;

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  days: z.coerce.number().int().min(1).max(3650).optional(),
});

export const GET = route(async (req: Request) => {
  const me = await requireUser();
  const url = new URL(req.url);
  const { limit, days } = querySchema.parse({
    limit: url.searchParams.get("limit") ?? undefined,
    days: url.searchParams.get("days") ?? undefined,
  });

  const rows = await db
    .select()
    .from(activity)
    .where(
      and(
        eq(activity.userId, me.id),
        days
          ? gte(activity.createdAt, new Date(Date.now() - days * 86_400_000))
          : undefined,
      ),
    )
    .orderBy(desc(activity.createdAt))
    .limit(limit);

  return ok({ activity: rows });
});

const postSchema = z.object({
  clientId: z.string().min(1).max(64),
  action: z.string().min(1).max(300),
  category: z.enum([
    "Vocabulary", "Grammar", "Kanji", "Verbs", "Quiz", "Reading", "General",
  ]),
  at: z.number().int().positive().optional(),
});

export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const body = postSchema.parse(await readJson(req));

  const [row] = await db
    .insert(activity)
    .values({
      userId: me.id,
      action: body.action,
      category: body.category,
      clientId: body.clientId,
      revision: await bumpRevision(me.id),
      createdAt: body.at ? new Date(body.at) : new Date(),
    })
    .onConflictDoNothing({ target: [activity.userId, activity.clientId] })
    .returning();

  return ok({ activity: row ?? null }, { status: row ? 201 : 200 });
});
