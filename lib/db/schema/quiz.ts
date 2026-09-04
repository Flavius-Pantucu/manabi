/**
 * Quiz results and user-authored flashcards.
 *
 * Quizzes are generated fresh from the corpus every time (`lib/quiz/generate.ts`),
 * so there is no quiz to store — only what happened in one. `quiz_answer`
 * captures the per-question detail the client currently throws away: keeping
 * which distractor was chosen is what turns "you scored 7/10" into "you keep
 * picking 貸す for 借りる", and it is not recoverable after the fact.
 */

import { sql } from "drizzle-orm";
import {
  boolean, index, integer, pgTable, real, smallint, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { createdAt, revision, updatedAt } from "./_shared";
import { user } from "./auth";

export const quizAttempt = pgTable(
  "quiz_attempt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** The generator's seed/id for this quiz — reproduces the exact paper. */
    quizId: text("quiz_id").notNull(),
    quizTitle: text("quiz_title").notNull(),
    /** vocab-meaning | kanji-reading | verb-form | … , or null for a mixed set. */
    kind: text("kind"),
    level: text("level"),

    /** Questions answered correctly, and how many were asked. */
    score: integer("score").notNull().default(0),
    total: integer("total").notNull().default(0),
    durationMs: integer("duration_ms"),

    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Client-minted, so an offline attempt pushed twice lands once. */
    clientId: text("client_id"),
    revision: revision(),
    createdAt: createdAt(),
  },
  (t) => [
    index("quiz_attempt_user_time_idx").on(t.userId, t.completedAt),
    index("quiz_attempt_sync_idx").on(t.userId, t.revision),
    uniqueIndex("quiz_attempt_client_uq").on(t.userId, t.clientId),
  ],
);

export const quizAnswer = pgTable(
  "quiz_answer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempt.id, { onDelete: "cascade" }),
    /** Order within the attempt — questions are shuffled, so index ≠ meaning. */
    position: integer("position").notNull(),
    questionId: text("question_id").notNull(),
    kind: text("kind").notNull(),
    prompt: text("prompt").notNull(),
    /** The options as shown, so a stored answer index still means something. */
    options: text("options").array().notNull(),
    /** Index into `options`. Null when the learner skipped or ran out of time. */
    chosen: smallint("chosen"),
    answer: smallint("answer").notNull(),
    correct: boolean("correct").notNull(),
    durationMs: integer("duration_ms"),
  },
  (t) => [index("quiz_answer_attempt_idx").on(t.attemptId, t.position)],
);

// ── User-authored flashcards ────────────────────────────────────────────────

/**
 * Custom decks are the one kind of card the corpus cannot provide, so unlike
 * everything else in the app they are content *and* live in Postgres.
 *
 * They still schedule through the same FSRS code: a custom card's scheduling
 * state is an ordinary `srs_card` row keyed `custom:<uuid>`, which the deck
 * registry can mint alongside `vocab:…` and `kanji:…` without the scheduler,
 * the queue builder or the review screen learning anything new.
 */
export const customDeck = pgTable(
  "custom_deck",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /** Matches DeckMeta.tone in lib/srs/decks.ts. */
    tone: text("tone").notNull().default("sakura"),
    level: text("level"),
    /** Hidden from the deck list but still scheduling — the learner's call. */
    archived: boolean("archived").notNull().default(false),
    /** Tombstone, so a deletion propagates to the learner's other devices. */
    deleted: boolean("deleted").notNull().default(false),
    revision: revision(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("custom_deck_user_idx").on(t.userId),
    index("custom_deck_sync_idx").on(t.userId, t.revision),
  ],
);

export const customCard = pgTable(
  "custom_card",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deckId: uuid("deck_id")
      .notNull()
      .references(() => customDeck.id, { onDelete: "cascade" }),
    /** Denormalised so "all my cards" and the ownership check skip the join. */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    front: text("front").notNull(),
    back: text("back").notNull(),
    reading: text("reading"),
    notes: text("notes"),
    /** Extra accepted answers for typed recall, as `ReviewItem.accepts` does. */
    accepts: text("accepts").array().notNull().default(sql`'{}'`),
    /** What to hand the speech synthesiser; falls back to `front`. */
    speak: text("speak"),
    position: real("position").notNull().default(0),
    deleted: boolean("deleted").notNull().default(false),

    revision: revision(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("custom_card_deck_idx").on(t.deckId, t.position),
    index("custom_card_sync_idx").on(t.userId, t.revision),
  ],
);

