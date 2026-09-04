/** One card in a custom deck. */

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { notFound, ok, readJson, route } from "@/lib/api/respond";
import { bumpRevision, ownedDeck } from "@/lib/api/decks";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { customCard } = schema;

type Ctx = { params: Promise<{ id: string; cardId: string }> };

const patchSchema = z.object({
  front: z.string().min(1).max(500).optional(),
  back: z.string().min(1).max(500).optional(),
  reading: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  accepts: z.array(z.string().max(200)).max(20).optional(),
  speak: z.string().max(200).nullable().optional(),
  position: z.number().finite().optional(),
});

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id, cardId } = await ctx.params;
  await ownedDeck(me.id, id);
  const body = patchSchema.parse(await readJson(req));

  const [card] = await db
    .update(customCard)
    .set({ ...body, revision: await bumpRevision(me.id), updatedAt: new Date() })
    .where(
      and(
        eq(customCard.id, cardId),
        eq(customCard.deckId, id),
        eq(customCard.userId, me.id),
        eq(customCard.deleted, false),
      ),
    )
    .returning();

  if (!card) throw notFound("No such card.");
  return ok({ card });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id, cardId } = await ctx.params;
  await ownedDeck(me.id, id);

  const [card] = await db
    .update(customCard)
    .set({ deleted: true, revision: await bumpRevision(me.id), updatedAt: new Date() })
    .where(
      and(
        eq(customCard.id, cardId),
        eq(customCard.deckId, id),
        eq(customCard.userId, me.id),
      ),
    )
    .returning();

  if (!card) throw notFound("No such card.");
  return ok({ ok: true });
});
