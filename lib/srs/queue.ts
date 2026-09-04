/**
 * Building today's queue.
 *
 * The rules here are the difference between a study app and a list of words.
 * In order:
 *
 *   1. Cards in learning/relearning that are due come first — they are the
 *      ones actively being cemented and delay hurts them most.
 *   2. Then review cards that are due, most-overdue first.
 *   3. Then new cards, capped per day, in curriculum order.
 *
 * New cards are capped because the cost of a new card is not today, it is the
 * eight reviews it generates over the next month. An uncapped queue is how
 * people end up with 400 reviews and quit.
 */

import { createCard, retrievability, type SrsCard } from "./scheduler";
import type { DeckId, ReviewItem } from "./decks";
import type { SrsState } from "@/lib/store/features/srs-slice";

export interface QueueEntry {
  item: ReviewItem;
  card: SrsCard;
  isNew: boolean;
}

export interface QueueStats {
  dueLearning: number;
  dueReview: number;
  newAvailable: number;
  /** New cards still allowed today after the daily cap. */
  newRemaining: number;
  total: number;
}

/**
 * The day key for a given instant.
 *
 * Takes `now` rather than reading the wall clock: `buildQueue` and
 * `queueStats` already accept a `now`, and deriving the daily cap from a
 * different clock than the scheduling comparisons made the two disagree —
 * the caps silently stopped applying whenever `now` was supplied.
 */
const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10);

export function cardFor(state: SrsState, cardId: string): SrsCard {
  return state.cards[cardId] ?? createCard(cardId, 0);
}

function isDue(card: SrsCard, now: number): boolean {
  return card.phase !== "new" && card.due <= now;
}

function eligible(item: ReviewItem, disabled: string[]): boolean {
  return !disabled.includes(item.deck);
}

/**
 * Level scope gates which cards may be INTRODUCED, never which may be
 * reviewed. Tightening the scope after starting N4 material would otherwise
 * strand those cards permanently in the learner's collection.
 */
function inScope(item: ReviewItem, levels: string[]): boolean {
  if (!item.level) return true; // kana and conjugation drills are unlevelled
  return levels.length === 0 || levels.includes(item.level);
}

export function queueStats(
  state: SrsState,
  all: ReviewItem[],
  now = Date.now(),
  deck?: DeckId,
): QueueStats {
  const disabled = state.settings.disabledDecks;
  const items = all.filter(
    (i) => eligible(i, disabled) && (!deck || i.deck === deck),
  );

  let dueLearning = 0;
  let dueReview = 0;
  let newAvailable = 0;

  for (const item of items) {
    const card = state.cards[item.cardId];
    if (!card || card.phase === "new") {
      if (inScope(item, state.settings.levels ?? [])) newAvailable++;
    } else if (card.due <= now) {
      if (card.phase === "learning" || card.phase === "relearning") dueLearning++;
      else dueReview++;
    }
  }

  const introducedToday = state.daily[dayKey(now)]?.newCards ?? 0;
  const newRemaining = Math.max(0, state.settings.newPerDay - introducedToday);

  return {
    dueLearning,
    dueReview,
    newAvailable,
    newRemaining: Math.min(newRemaining, newAvailable),
    total: dueLearning + dueReview + Math.min(newRemaining, newAvailable),
  };
}

/**
 * Build the ordered queue. `limit` caps total length so a session is finite
 * and the progress bar means something.
 */
export function buildQueue(
  state: SrsState,
  all: ReviewItem[],
  {
    now = Date.now(),
    deck,
    limit,
    includeNew = true,
  }: { now?: number; deck?: DeckId; limit?: number; includeNew?: boolean } = {},
): QueueEntry[] {
  const disabled = state.settings.disabledDecks;
  const items = all.filter(
    (i) => eligible(i, disabled) && (!deck || i.deck === deck),
  );

  const learning: QueueEntry[] = [];
  const review: QueueEntry[] = [];
  const fresh: QueueEntry[] = [];

  for (const item of items) {
    const existing = state.cards[item.cardId];
    if (!existing || existing.phase === "new") {
      if (inScope(item, state.settings.levels ?? [])) {
        fresh.push({ item, card: existing ?? createCard(item.cardId, now), isNew: true });
      }
    } else if (isDue(existing, now)) {
      const entry = { item, card: existing, isNew: false };
      if (existing.phase === "learning" || existing.phase === "relearning") {
        learning.push(entry);
      } else {
        review.push(entry);
      }
    }
  }

  // Most overdue first — those are closest to being forgotten outright.
  learning.sort((a, b) => a.card.due - b.card.due);
  review.sort(
    (a, b) => retrievability(a.card, now) - retrievability(b.card, now),
  );

  const introducedToday = state.daily[dayKey(now)]?.newCards ?? 0;
  const newBudget = includeNew
    ? Math.max(0, state.settings.newPerDay - introducedToday)
    : 0;

  const maxReviews = state.settings.maxReviewsPerDay;
  const reviewed = state.daily[dayKey(now)]?.reviews ?? 0;
  const reviewBudget = Math.max(0, maxReviews - reviewed);

  const due = [...learning, ...review].slice(0, reviewBudget);
  const newCards = fresh.slice(0, newBudget);

  // New cards are woven in rather than front- or back-loaded: a wall of new
  // material at the start is discouraging, and at the end it gets skipped.
  const out: QueueEntry[] = [];
  const gap = newCards.length > 0 ? Math.max(1, Math.floor(due.length / newCards.length)) : 0;
  let ni = 0;
  for (let i = 0; i < due.length; i++) {
    out.push(due[i]);
    if (ni < newCards.length && gap > 0 && (i + 1) % gap === 0) {
      out.push(newCards[ni++]);
    }
  }
  while (ni < newCards.length) out.push(newCards[ni++]);

  return limit ? out.slice(0, limit) : out;
}

/** Due counts for the next `days` days — the forecast chart. */
export function forecast(
  state: SrsState,
  days = 30,
  now = Date.now(),
): { date: string; count: number }[] {
  const DAY = 86_400_000;
  const buckets = new Array(days).fill(0);
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);

  for (const card of Object.values(state.cards)) {
    if (card.phase === "new") continue;
    const idx = Math.floor((card.due - startOfToday) / DAY);
    if (idx >= 0 && idx < days) buckets[idx]++;
    else if (idx < 0) buckets[0]++; // already overdue
  }

  return buckets.map((count, i) => ({
    date: new Date(startOfToday + i * DAY).toISOString().slice(0, 10),
    count,
  }));
}

/** Cards grouped by how well established they are — the maturity breakdown. */
export function maturityBreakdown(state: SrsState, all: ReviewItem[]) {
  let neu = 0, learning = 0, young = 0, mature = 0;
  const total = all.length;

  for (const item of all) {
    const c = state.cards[item.cardId];
    if (!c || c.phase === "new") { neu++; continue; }
    if (c.phase === "learning" || c.phase === "relearning") { learning++; continue; }
    if (c.stability >= 21) mature++;
    else young++;
  }
  return { new: neu, learning, young, mature, total };
}

/**
 * True retention: of reviews on cards that were already in the review phase,
 * how many were recalled. Learning-phase reps are excluded because they
 * measure the session, not memory.
 */
export function trueRetention(
  state: SrsState,
  sinceDays = 30,
  now = Date.now(),
): { rate: number; sample: number } {
  const cutoff = now - sinceDays * 86_400_000;
  const rel = state.log.filter((l) => l.at >= cutoff && l.phase === "review");
  if (rel.length === 0) return { rate: 0, sample: 0 };
  const ok = rel.filter((l) => l.grade > 1).length;
  return { rate: ok / rel.length, sample: rel.length };
}

/** Cards that keep lapsing — worth surfacing so they can be reformulated. */
export function leeches(
  state: SrsState,
  byId: Map<string, ReviewItem>,
  threshold = 4,
): QueueEntry[] {
  return Object.values(state.cards)
    .filter((c) => c.lapses >= threshold)
    .sort((a, b) => b.lapses - a.lapses)
    .map((card) => {
      const item = byId.get(card.id);
      return item ? { item, card, isNew: false } : null;
    })
    .filter((x): x is QueueEntry => x !== null);
}
