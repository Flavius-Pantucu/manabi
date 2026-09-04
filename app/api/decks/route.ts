/**
 * Custom flashcard decks.
 *
 * The only content in this app that Postgres owns. Everything else — 8,034
 * words, 2,211 kanji — is static JSON generated from JMdict and KANJIDIC2 and
 * served from the CDN, so a learner's own cards are the one thing that has
 * nowhere else to live.
 *
 * They schedule through the same FSRS code as everything else: a custom card's
 * state is an ordinary `srs_card` row keyed `custom:<uuid>`. The scheduler,
 * the queue builder and the review screen never learn that custom cards exist.
 */

import { and, asc, count, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { ok, readJson, route } from "@/lib/api/respond";
import { bumpRevision } from "@/lib/api/decks";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { customDeck, customCard } = schema;

export const GET = route(async () => {
  const me = await requireUser();

  /**
   * The card count comes from a joined aggregate rather than a correlated
   * subquery written with `sql`…``.
   *
   * Drizzle renders a bare column inside a template unqualified, so
   * `where ${customCard.deckId} = ${customDeck.id}` becomes
   * `where "deck_id" = "id"` — inside the subquery both names resolve against
   * `custom_card`, the predicate is never true, and every deck reports zero
   * cards. A derived table is aliased, so its columns are always qualified and
   * the join condition means what it says.
   */
  const counts = db
    .select({ deckId: customCard.deckId, n: count().as("n") })
    .from(customCard)
    .where(eq(customCard.deleted, false))
    .groupBy(customCard.deckId)
    .as("card_counts");

  const decks = await db
    .select({
      id: customDeck.id,
      name: customDeck.name,
      description: customDeck.description,
      tone: customDeck.tone,
      level: customDeck.level,
      archived: customDeck.archived,
      createdAt: customDeck.createdAt,
      updatedAt: customDeck.updatedAt,
      cards: sql<number>`coalesce(${counts.n}, 0)`,
    })
    .from(customDeck)
    .leftJoin(counts, eq(counts.deckId, customDeck.id))
    .where(and(eq(customDeck.userId, me.id), eq(customDeck.deleted, false)))
    .orderBy(asc(customDeck.createdAt));

  return ok({ decks: decks.map((d) => ({ ...d, cards: Number(d.cards) })) });
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullable().optional(),
  tone: z
    .enum(["sakura", "ai", "matsuba", "shu", "fuji", "kincha"])
    .default("sakura"),
  level: z.string().max(8).nullable().optional(),
});

export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const body = createSchema.parse(await readJson(req));

  const [deck] = await db
    .insert(customDeck)
    .values({
      userId: me.id,
      name: body.name,
      description: body.description ?? null,
      tone: body.tone,
      level: body.level ?? null,
      revision: await bumpRevision(me.id),
    })
    .returning();

  return ok({ deck }, { status: 201 });
});
