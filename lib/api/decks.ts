/**
 * Shared plumbing for the custom-deck routes.
 *
 * Ownership is checked with a `WHERE user_id = …` on every statement rather
 * than a fetch-then-compare. A separate read leaves a window between the check
 * and the write, and more practically it is one line that is easy to forget on
 * the fifth endpoint — a filter in the query cannot be.
 */

import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { notFound } from "./respond";

const { customDeck, userRevision } = schema;

/** Bump the learner's revision so the change reaches their other devices. */
export async function bumpRevision(userId: string): Promise<number> {
  const [rev] = await db
    .insert(userRevision)
    .values({ userId, value: 1 })
    .onConflictDoUpdate({
      target: userRevision.userId,
      set: { value: sql`${userRevision.value} + 1` },
    })
    .returning({ value: userRevision.value });
  return Number(rev.value);
}

export async function ownedDeck(userId: string, deckId: string) {
  const [deck] = await db
    .select()
    .from(customDeck)
    .where(
      and(
        eq(customDeck.id, deckId),
        eq(customDeck.userId, userId),
        eq(customDeck.deleted, false),
      ),
    );
  if (!deck) throw notFound("No such deck.");
  return deck;
}

/** `custom:<uuid>` — the id this card schedules under in `srs_card`. */
export const scheduleId = (cardId: string) => `custom:${cardId}`;
