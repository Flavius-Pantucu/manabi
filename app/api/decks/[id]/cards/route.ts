/** Cards inside one custom deck. */

import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { ok, readJson, route } from "@/lib/api/respond";
import { bumpRevision, ownedDeck } from "@/lib/api/decks";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { customCard } = schema;

type Ctx = { params: Promise<{ id: string }> };

const cardSchema = z.object({
  front: z.string().min(1).max(500),
  back: z.string().min(1).max(500),
  reading: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  /** Extra answers accepted for typed recall, as ReviewItem.accepts does. */
  accepts: z.array(z.string().max(200)).max(20).default([]),
  speak: z.string().max(200).nullable().optional(),
});

/** Accepts one card or a batch — importing a list should be one request. */
const bodySchema = z.union([cardSchema, z.array(cardSchema).min(1).max(500)]);

export const POST = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const deck = await ownedDeck(me.id, id);
  const parsed = bodySchema.parse(await readJson(req));
  const incoming = Array.isArray(parsed) ? parsed : [parsed];

  const rev = await bumpRevision(me.id);

  // Positions are floats and start after the current maximum, so inserting
  // between two cards later is an update to one row rather than a renumbering
  // of every row after it.
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${customCard.position}), 0)` })
    .from(customCard)
    .where(eq(customCard.deckId, deck.id));

  const cards = await db
    .insert(customCard)
    .values(
      incoming.map((c, i) => ({
        deckId: deck.id,
        userId: me.id,
        front: c.front,
        back: c.back,
        reading: c.reading ?? null,
        notes: c.notes ?? null,
        accepts: c.accepts,
        speak: c.speak ?? null,
        position: Number(max) + i + 1,
        revision: rev,
      })),
    )
    .returning();

  return ok({ cards }, { status: 201 });
});

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const deck = await ownedDeck(me.id, id);

  const cards = await db
    .select()
    .from(customCard)
    .where(and(eq(customCard.deckId, deck.id), eq(customCard.deleted, false)))
    .orderBy(customCard.position);

  return ok({ cards });
});
