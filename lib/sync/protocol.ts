/**
 * The sync wire format, validated with the same schemas on both ends.
 *
 * ## The shape of the protocol
 *
 * The client is the writer. Review happens offline — that is the whole point
 * of the service worker — so the server cannot be asked to arbitrate a grade
 * that was given on a train. Each device therefore keeps its own full state in
 * redux/localStorage exactly as before, and sync is a background reconciliation:
 *
 *     push  everything I changed  →  server merges  →  server returns
 *                                    everything anyone else changed
 *
 * One round trip, because a PWA on a flaky connection should not need two.
 *
 * ## Timestamps are epoch milliseconds
 *
 * Not ISO strings. `SrsCard.due`, `lastReview` and `ReviewLogEntry.at` are
 * already numbers throughout the app, and every conversion is a chance to
 * shift a due date by a timezone. The server converts once, at the boundary.
 *
 * ## Conflicts
 *
 * Resolved by the rules `lib/srs/backup.ts` already uses for file imports,
 * because they are the right ones and having two answers would be worse:
 *
 *   cards     the version reviewed most recently wins outright
 *   reviews   append-only, de-duplicated on (card, timestamp)
 *   daily     per-field maximum
 *   settings  most recently edited wins
 *
 * Cards never merge field-by-field. A card is one coherent scheduling state —
 * taking `stability` from one device and `due` from another produces a card
 * that no sequence of reviews could have created.
 */

import { z } from "zod";

/** Guard rails on a single request, not a product limit. */
export const LIMITS = {
  cards: 5_000,
  reviews: 2_000,
  daily: 400,
  statuses: 2_000,
  bookmarks: 2_000,
  activity: 200,
} as const;

const epochMs = z.number().int().nonnegative().max(4_102_444_800_000); // < year 2100
const cardId = z.string().min(1).max(200);
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const phaseSchema = z.enum(["new", "learning", "review", "relearning"]);
export const gradeSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
]);

export const wireCardSchema = z.object({
  id: cardId,
  phase: phaseSchema,
  stability: z.number().finite().min(0).max(100_000),
  difficulty: z.number().finite().min(0).max(10),
  due: epochMs,
  lastReview: epochMs.nullable(),
  reps: z.number().int().min(0).max(100_000),
  lapses: z.number().int().min(0).max(100_000),
  step: z.number().int().min(0).max(50),
  /** Denormalised for server-side aggregation; derived from the card id. */
  deck: z.string().max(64).optional(),
  level: z.string().max(8).optional(),
});

export const wireReviewSchema = z.object({
  id: cardId,
  grade: gradeSchema,
  at: epochMs,
  elapsed: z.number().finite().min(0),
  scheduled: z.number().finite().min(0),
  phase: phaseSchema,
  durationMs: z.number().int().min(0).max(3_600_000).optional(),
});

export const wireDailySchema = z.object({
  day: dayKey,
  reviews: z.number().int().min(0),
  newCards: z.number().int().min(0),
  correct: z.number().int().min(0),
});

export const wireSettingsSchema = z.object({
  newPerDay: z.number().int().min(0).max(200),
  maxReviewsPerDay: z.number().int().min(10).max(2_000),
  disabledDecks: z.array(z.string().max(64)).max(50),
  levels: z.array(z.string().max(8)).max(10),
  /** When the learner last changed these, so the newer edit wins. */
  updatedAt: epochMs,
});

export const wireLearningSchema = z.object({
  streak: z.number().int().min(0).max(100_000),
  wordsLearned: z.number().int().min(0),
  verbsMastered: z.number().int().min(0),
  lessonsCompleted: z.number().int().min(0),
  learnedToday: z.number().int().min(0),
  lastActivityDate: dayKey.nullable(),
  dailyGoal: z.number().int().min(1).max(500),
  showFurigana: z.boolean(),
  autoPlayAudio: z.boolean(),
  voiceUri: z.string().max(300).nullable().optional(),
  voiceRate: z.number().min(0.1).max(3).optional(),
  updatedAt: epochMs,
});

export const wireStatusSchema = z.object({
  kind: z.enum(["vocab", "kanji"]),
  refId: z.string().min(1).max(200),
  status: z.string().min(1).max(32),
  deleted: z.boolean().optional(),
  updatedAt: epochMs,
});

export const wireBookmarkSchema = z.object({
  kind: z.string().min(1).max(32),
  refId: z.string().min(1).max(200),
  deleted: z.boolean().optional(),
  updatedAt: epochMs,
});

export const wireActivitySchema = z.object({
  /** The client's own id for the entry — the de-duplication key on re-push. */
  clientId: z.string().min(1).max(64),
  action: z.string().min(1).max(300),
  category: z.enum([
    "Vocabulary", "Grammar", "Kanji", "Verbs", "Quiz", "Reading", "General",
  ]),
  at: epochMs,
});

export const pushSchema = z.object({
  /** Stable per browser profile; minted once and kept in localStorage. */
  deviceId: z.string().min(8).max(64),
  /** Highest revision this device has already seen. 0 means "send me all". */
  cursor: z.number().int().min(0).default(0),
  cards: z.array(wireCardSchema).max(LIMITS.cards).default([]),
  reviews: z.array(wireReviewSchema).max(LIMITS.reviews).default([]),
  daily: z.array(wireDailySchema).max(LIMITS.daily).default([]),
  settings: wireSettingsSchema.optional(),
  learning: wireLearningSchema.optional(),
  statuses: z.array(wireStatusSchema).max(LIMITS.statuses).default([]),
  bookmarks: z.array(wireBookmarkSchema).max(LIMITS.bookmarks).default([]),
  activity: z.array(wireActivitySchema).max(LIMITS.activity).default([]),
});

export const pullQuerySchema = z.object({
  deviceId: z.string().min(8).max(64),
  cursor: z.coerce.number().int().min(0).default(0),
});

export type WireCard = z.infer<typeof wireCardSchema>;
export type WireReview = z.infer<typeof wireReviewSchema>;
export type WireDaily = z.infer<typeof wireDailySchema>;
export type WireSettings = z.infer<typeof wireSettingsSchema>;
export type WireLearning = z.infer<typeof wireLearningSchema>;
export type WireStatus = z.infer<typeof wireStatusSchema>;
export type WireBookmark = z.infer<typeof wireBookmarkSchema>;
export type WireActivity = z.infer<typeof wireActivitySchema>;
export type PushBody = z.infer<typeof pushSchema>;

/** What comes back from either endpoint. */
export interface SyncChanges {
  cards: WireCard[];
  reviews: WireReview[];
  daily: WireDaily[];
  settings: WireSettings | null;
  learning: WireLearning | null;
  statuses: WireStatus[];
  bookmarks: WireBookmark[];
}

/** What the server actually wrote, per table. */
export interface AppliedCounts {
  cards: number;
  reviews: number;
  daily: number;
  statuses: number;
  bookmarks: number;
  activity: number;
  settings: number;
  learning: number;
}

export interface SyncResponse {
  /** Feed back as `cursor` on the next call. */
  cursor: number;
  /** Counts of what the server actually wrote, for the client's own log. */
  applied?: AppliedCounts;
  changes: SyncChanges;
  /** True when the server sent everything it has rather than a delta. */
  full: boolean;
}
