/** One custom deck: rename, re-tone, archive, delete. */

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { notFound, ok, readJson, route } from "@/lib/api/respond";
import { bumpRevision, ownedDeck } from "@/lib/api/decks";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { customDeck, customCard } = schema;

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const deck = await ownedDeck(me.id, id);

  const cards = await db
    .select()
    .from(customCard)
    .where(and(eq(customCard.deckId, deck.id), eq(customCard.deleted, false)))
    .orderBy(customCard.position);

  return ok({ deck, cards });
});

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  tone: z.enum(["sakura", "ai", "matsuba", "shu", "fuji", "kincha"]).optional(),
  level: z.string().max(8).nullable().optional(),
  archived: z.boolean().optional(),
});

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const body = patchSchema.parse(await readJson(req));

  const [deck] = await db
    .update(customDeck)
    .set({ ...body, revision: await bumpRevision(me.id), updatedAt: new Date() })
    .where(
      and(
        eq(customDeck.id, id),
        eq(customDeck.userId, me.id),
        eq(customDeck.deleted, false),
      ),
    )
    .returning();

  if (!deck) throw notFound("No such deck.");
  return ok({ deck });
});

/**
 * A tombstone, not a DELETE.
 *
 * Sync answers "what changed after cursor N", and a removed row is not a
 * change — the learner's other devices would go on showing the deck forever.
 * The scheduling rows in `srs_card` are left alone deliberately: undeleting a
 * deck should not reset the learner's memory of its cards to zero.
 */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const rev = await bumpRevision(me.id);

  const [deck] = await db
    .update(customDeck)
    .set({ deleted: true, revision: rev, updatedAt: new Date() })
    .where(and(eq(customDeck.id, id), eq(customDeck.userId, me.id)))
    .returning();

  if (!deck) throw notFound("No such deck.");

  await db
    .update(customCard)
    .set({ deleted: true, revision: rev, updatedAt: new Date() })
    .where(eq(customCard.deckId, deck.id));

  return ok({ ok: true });
});
