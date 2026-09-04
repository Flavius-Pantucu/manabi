/**
 * Everything in `lib/store/features/learning-slice.ts`, plus the two voice
 * preferences that were living loose in localStorage under `manabi.voiceURI`
 * and `manabi.voiceRate` (see lib/speech.ts) — they are per-learner settings
 * and belong with the rest.
 *
 * The slice's `bookmarkedGrammar`, `vocabStatus` and `kanjiStatus` are maps
 * keyed by content id. They become rows rather than JSON columns so a single
 * bookmark is one insert instead of a read-modify-write of the whole map —
 * which two devices doing it at once would otherwise resolve by one silently
 * discarding the other's.
 */

import {
  boolean, date, index, integer, pgTable, primaryKey, real, text, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { createdAt, revision, updatedAt } from "./_shared";
import { user } from "./auth";

export const learningProfile = pgTable("learning_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),

  streak: integer("streak").notNull().default(0),
  wordsLearned: integer("words_learned").notNull().default(0),
  verbsMastered: integer("verbs_mastered").notNull().default(0),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  learnedToday: integer("learned_today").notNull().default(0),
  lastActivityDate: date("last_activity_date"),

  dailyGoal: integer("daily_goal").notNull().default(10),
  showFurigana: boolean("show_furigana").notNull().default(true),
  autoPlayAudio: boolean("auto_play_audio").notNull().default(false),

  /**
   * Voice is a per-device capability, not a per-account one — the URI that
   * names a Japanese voice on a Mac names nothing on an Android phone. Synced
   * anyway as a hint, and `lib/speech.ts` already falls back when the named
   * voice is absent, so a bad hint costs nothing.
   */
  voiceUri: text("voice_uri"),
  voiceRate: real("voice_rate").notNull().default(1),

  revision: revision(),
  updatedAt: updatedAt(),
});

/** "grammar" today; the column is text so vocab or kanji bookmarks are free. */
export const bookmark = pgTable(
  "bookmark",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /**
     * Text, not integer. The slice types grammar bookmarks as `number[]` but
     * `lib/content/types.ts` gives every grammar point a string id — storing
     * text accepts both and stops the mismatch becoming a migration later.
     */
    refId: text("ref_id").notNull(),
    /**
     * Tombstone. Un-bookmarking has to reach the other device, and a deleted
     * row cannot: a pull asks "what changed after cursor N" and absence is not
     * a change. So removals are an update, and the row stays.
     */
    deleted: boolean("deleted").notNull().default(false),
    revision: revision(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.kind, t.refId] }),
    index("bookmark_sync_idx").on(t.userId, t.revision),
  ],
);

/**
 * The learner's own label on an item — "learned"/"review"/"difficult" for
 * vocabulary, "studied"/"mastered" for kanji. Distinct from scheduling state:
 * this is what they *say* about an item, `srs_card` is what their answers show.
 */
export const contentStatus = pgTable(
  "content_status",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    refId: text("ref_id").notNull(),
    status: text("status").notNull(),
    /** Tombstone, for the same reason as on `bookmark`. */
    deleted: boolean("deleted").notNull().default(false),
    revision: revision(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.kind, t.refId] }),
    index("content_status_sync_idx").on(t.userId, t.revision),
  ],
);

/**
 * The activity feed. The client keeps the last 50; the server keeps the lot,
 * which is what makes a real heatmap and "you studied 14 days running"
 * possible rather than a number the client has to be trusted about.
 */
export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    /** Vocabulary | Grammar | Kanji | Verbs | Quiz | Reading | General */
    category: text("category").notNull().default("General"),
    /** Client-minted id, so a re-push of the same batch does not duplicate. */
    clientId: text("client_id"),
    revision: revision(),
    createdAt: createdAt(),
  },
  (t) => [
    index("activity_user_time_idx").on(t.userId, t.createdAt),
    index("activity_sync_idx").on(t.userId, t.revision),
    // Null client ids are distinct in Postgres, so server-minted rows are
    // unconstrained while client-minted ones de-duplicate on re-push.
    uniqueIndex("activity_client_uq").on(t.userId, t.clientId),
  ],
);
