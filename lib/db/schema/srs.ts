/**
 * Scheduling state — the server-side mirror of `lib/store/features/srs-slice.ts`.
 *
 * ## Why `card_id` is text, not a foreign key
 *
 * Cards are derived from content, not stored as rows. `lib/srs/decks.ts` mints
 * ids like `vocab:食べる@たべる:meaning`, `kanji:生:reading` or
 * `kana:hi:shi` — deliberately keyed on the content itself so that
 * regenerating `public/data/` from JMdict cannot silently reassign a learner's
 * schedule to a different word. Giving those a numeric FK into a content table
 * would reintroduce exactly the fragility that naming scheme exists to avoid,
 * and would mean the 8,034-word corpus had to live in Postgres to be
 * referenced at all. So `card_id` is an opaque string and the content stays
 * static JSON on the CDN.
 *
 * The one consequence to know: a card id that no longer appears in any deck
 * (a word dropped from the corpus) keeps its row and simply stops being
 * scheduled, because `buildQueue` iterates over content and looks state up,
 * never the reverse. Orphans are inert, not broken.
 */

import { sql } from "drizzle-orm";
import {
  bigint, date, index, integer, pgTable, primaryKey, real, smallint,
  text, timestamp, unique, uuid,
} from "drizzle-orm/pg-core";
import { createdAt, revision, updatedAt } from "./_shared";
import { user } from "./auth";

/** Mirrors `CardPhase` in lib/srs/scheduler.ts. */
export const CARD_PHASES = ["new", "learning", "review", "relearning"] as const;

export const srsCard = pgTable(
  "srs_card",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id").notNull(),

    phase: text("phase").notNull().default("new"),
    /** Days. FSRS stability; 0 while still in the learning steps. */
    stability: real("stability").notNull().default(0),
    /** 1..10. */
    difficulty: real("difficulty").notNull().default(0),
    due: timestamp("due", { withTimezone: true }).notNull(),
    lastReview: timestamp("last_review", { withTimezone: true }),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    step: integer("step").notNull().default(0),

    /**
     * Denormalised from the card id so the admin dashboard and per-deck stats
     * can aggregate in SQL instead of pulling every row into JS to re-parse
     * its id. Never read by the scheduler.
     */
    deck: text("deck"),
    level: text("level"),

    /**
     * Which device last wrote this row. Lets a pull skip handing a device back
     * its own writes — correctness does not depend on it (the client merges
     * with the same last-review-wins rule, so an echo is a no-op) but on a
     * phone it is the difference between a small delta and the whole deck.
     */
    deviceId: text("device_id"),

    revision: revision(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.cardId] }),
    // The pull query: "everything of mine that changed after cursor N".
    index("srs_card_sync_idx").on(t.userId, t.revision),
    // The queue query: due cards, most overdue first.
    index("srs_card_due_idx").on(t.userId, t.due),
  ],
);

/**
 * Append-only review history. Retention, forecasting and the heatmap all read
 * from here, and card state can be rebuilt from it by replaying
 * `lib/srs/scheduler.ts` — the scheduler is pure, so a replay is exact.
 *
 * The unique constraint is the whole idempotency story for sync: a client that
 * loses its acknowledgement and re-pushes the same batch conflicts on
 * (user, card, reviewed_at) and the insert is dropped. It is the same
 * `id@timestamp` key `lib/srs/backup.ts` already de-duplicates imports on.
 */
export const reviewLog = pgTable(
  "review_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id").notNull(),
    /** 1 Again · 2 Hard · 3 Good · 4 Easy. */
    grade: smallint("grade").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    /** Days since the previous review; 0 for a first exposure. */
    elapsed: real("elapsed").notNull().default(0),
    /** Interval handed out by this review, in days. */
    scheduled: real("scheduled").notNull().default(0),
    /** The phase the card was in *before* this review. */
    phase: text("phase").notNull(),
    durationMs: integer("duration_ms"),
    /** Which device produced it — lets a client skip its own echoes on pull. */
    deviceId: text("device_id"),
    revision: revision(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("review_log_dedup").on(t.userId, t.cardId, t.reviewedAt),
    index("review_log_user_time_idx").on(t.userId, t.reviewedAt),
    index("review_log_sync_idx").on(t.userId, t.revision),
    index("review_log_card_idx").on(t.userId, t.cardId),
  ],
);

/**
 * Per-day counters.
 *
 * Derivable from `review_log` in principle, stored because it is not only a
 * statistic: `buildQueue` reads today's `new_cards` and `reviews` on every
 * queue build to apply the daily caps. Recomputing that with an aggregate on
 * each call would put a scan on the hottest path in the app.
 */
export const dailyStat = pgTable(
  "daily_stat",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Local calendar day, YYYY-MM-DD, as the client computed it. */
    day: date("day").notNull(),
    reviews: integer("reviews").notNull().default(0),
    newCards: integer("new_cards").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    revision: revision(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.day] }),
    index("daily_stat_sync_idx").on(t.userId, t.revision),
  ],
);

export const srsSetting = pgTable(
  "srs_setting",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    newPerDay: integer("new_per_day").notNull().default(10),
    maxReviewsPerDay: integer("max_reviews_per_day").notNull().default(120),
    /** Deck ids switched off, e.g. {kana-katakana}. */
    disabledDecks: text("disabled_decks").array().notNull().default(sql`'{}'`),
    /** JLPT levels allowed to introduce NEW cards. Never gates reviews. */
    levels: text("levels").array().notNull().default(sql`'{"N5"}'`),
    revision: revision(),
    updatedAt: updatedAt(),
  },
);

/**
 * One row per device, holding that device's pull cursor.
 *
 * The server keeps it rather than trusting the client's copy so that "pull
 * everything since forever" after a reinstall is a deliberate request
 * (cursor 0) rather than the accidental result of lost localStorage.
 */
export const syncDevice = pgTable(
  "sync_device",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    label: text("label"),
    userAgent: text("user_agent"),
    cursor: bigint("cursor", { mode: "number" }).notNull().default(0),
    lastPushAt: timestamp("last_push_at", { withTimezone: true }),
    lastPullAt: timestamp("last_pull_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.deviceId] })],
);
