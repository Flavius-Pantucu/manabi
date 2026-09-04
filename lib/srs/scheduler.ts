/**
 * FSRS-lite — the scheduler behind every review in Manabi.
 *
 * This is a two-component memory model in the spirit of FSRS (Free Spaced
 * Repetition Scheduler), reduced to the parts that matter without the full
 * 17-parameter optimiser:
 *
 *   stability  (S) — days until recall probability decays to `RETENTION`.
 *   difficulty (D) — 1..10, how fast this item loses stability for you.
 *
 * Recall probability decays with the FSRS forgetting curve
 *
 *     R(t) = (1 + FACTOR · t/S) ^ DECAY
 *
 * and an interval is chosen by inverting it for the target retention. The
 * curve matters: SM-2's fixed exponential over-schedules easy material and
 * under-schedules leeches, which is exactly the failure a learner feels as
 * "why does it keep asking me this".
 *
 * Everything here is pure and deterministic given (state, grade, now), so it
 * is unit-testable and safe to replay over a review log.
 */

export type Grade = 1 | 2 | 3 | 4; // Again · Hard · Good · Easy

export const GRADE = {
  AGAIN: 1 as Grade,
  HARD: 2 as Grade,
  GOOD: 3 as Grade,
  EASY: 4 as Grade,
};

export type CardPhase = "new" | "learning" | "review" | "relearning";

export interface SrsCard {
  /** Stable cross-deck identity, e.g. "vocab:12" or "kana:hi-shi". */
  id: string;
  phase: CardPhase;
  /** Days. 0 while the card is still in the learning steps. */
  stability: number;
  /** 1..10. */
  difficulty: number;
  /** Epoch ms. */
  due: number;
  lastReview: number | null;
  reps: number;
  lapses: number;
  /** Index into LEARNING_STEPS / RELEARNING_STEPS while in those phases. */
  step: number;
}

export interface ReviewLogEntry {
  id: string;
  grade: Grade;
  /** Epoch ms of the review. */
  at: number;
  /** Days since the previous review; 0 for a first exposure. */
  elapsed: number;
  /** Interval handed out by this review, in days. */
  scheduled: number;
  phase: CardPhase;
  /** Milliseconds the learner spent before answering. */
  durationMs?: number;
}

// ── Model constants ─────────────────────────────────────────────────────────

/** Target recall probability at the moment a card comes due. */
export const RETENTION = 0.9;

/** FSRS-6 curve constants. */
const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // ≈ 0.2345

/** Minutes. Sub-day steps for material that was just introduced or lapsed. */
const LEARNING_STEPS = [1, 10];
const RELEARNING_STEPS = [10];

/** Initial stability in days, indexed by first grade (1-based). */
const INITIAL_STABILITY: Record<Grade, number> = { 1: 0.4, 2: 1.2, 3: 3.1, 4: 8.2 };
const INITIAL_DIFFICULTY_BASE = 5.6;

const MIN_STABILITY = 0.05;
const MAX_INTERVAL_DAYS = 365 * 4;
const DAY_MS = 86_400_000;
const MIN_MS = 60_000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ── Card lifecycle ──────────────────────────────────────────────────────────

export function createCard(id: string, now = Date.now()): SrsCard {
  return {
    id,
    phase: "new",
    stability: 0,
    difficulty: 0,
    due: now,
    lastReview: null,
    reps: 0,
    lapses: 0,
    step: 0,
  };
}

/** Probability the learner still recalls this card at time `now`. */
export function retrievability(card: SrsCard, now = Date.now()): number {
  if (card.phase === "new" || !card.lastReview || card.stability <= 0) return 0;
  const elapsedDays = Math.max(0, (now - card.lastReview) / DAY_MS);
  return Math.pow(1 + (FACTOR * elapsedDays) / card.stability, DECAY);
}

/** Days until recall decays to `retention`. Inverse of the curve above. */
function intervalFor(stability: number, retention = RETENTION): number {
  const days = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return clamp(Math.round(days), 1, MAX_INTERVAL_DAYS);
}

function initialDifficulty(grade: Grade): number {
  return clamp(INITIAL_DIFFICULTY_BASE - (grade - 3) * 1.35, 1, 10);
}

function nextDifficulty(d: number, grade: Grade): number {
  // Drift toward the easy end on success, sharply toward hard on a lapse,
  // with mean reversion so a single bad day cannot brand a card forever.
  const delta = -1.05 * (grade - 3);
  const damped = d + delta * (10 - d) / 9;
  return clamp(damped + (INITIAL_DIFFICULTY_BASE - damped) * 0.07, 1, 10);
}

function nextStabilityOnSuccess(
  card: SrsCard,
  grade: Grade,
  r: number,
): number {
  const { stability: s, difficulty: d } = card;
  // Low retrievability at review time means the memory was nearly lost and
  // recovering it is worth more — this is FSRS's core insight over SM-2.
  const gain =
    1 +
    Math.exp(2.15) *
      (11 - d) *
      Math.pow(s, -0.42) *
      (Math.exp((1 - r) * 1.12) - 1) *
      (grade === GRADE.HARD ? 0.62 : 1) *
      (grade === GRADE.EASY ? 1.48 : 1);
  return Math.max(MIN_STABILITY, s * gain);
}

function nextStabilityOnLapse(card: SrsCard, r: number): number {
  const { stability: s, difficulty: d } = card;
  const next =
    2.18 * Math.pow(d, -0.31) * (Math.pow(s + 1, 0.32) - 1) * Math.exp((1 - r) * 0.85);
  return clamp(next, MIN_STABILITY, s);
}

/**
 * Apply a grade and return the updated card plus its log entry.
 * Pure: same inputs always yield the same outputs.
 */
export function review(
  card: SrsCard,
  grade: Grade,
  now = Date.now(),
  durationMs?: number,
): { card: SrsCard; log: ReviewLogEntry } {
  const elapsed = card.lastReview ? (now - card.lastReview) / DAY_MS : 0;
  const r = retrievability(card, now);
  const next: SrsCard = { ...card, reps: card.reps + 1, lastReview: now };

  if (card.phase === "new") {
    next.difficulty = initialDifficulty(grade);
    next.stability = INITIAL_STABILITY[grade];

    if (grade === GRADE.EASY) {
      // Graduate immediately — the learner already knows it.
      next.phase = "review";
      next.step = 0;
      next.due = now + intervalFor(next.stability) * DAY_MS;
    } else {
      next.phase = "learning";
      next.step = grade === GRADE.AGAIN ? 0 : 1;
      next.due = now + LEARNING_STEPS[Math.min(next.step, LEARNING_STEPS.length - 1)] * MIN_MS;
    }
  } else if (card.phase === "learning" || card.phase === "relearning") {
    const steps = card.phase === "learning" ? LEARNING_STEPS : RELEARNING_STEPS;
    next.difficulty = nextDifficulty(card.difficulty || INITIAL_DIFFICULTY_BASE, grade);

    if (grade === GRADE.AGAIN) {
      next.step = 0;
      next.due = now + steps[0] * MIN_MS;
    } else if (grade === GRADE.EASY || card.step >= steps.length - 1) {
      next.phase = "review";
      next.step = 0;
      next.stability = Math.max(next.stability || INITIAL_STABILITY[grade], INITIAL_STABILITY[grade]);
      next.due = now + intervalFor(next.stability) * DAY_MS;
    } else {
      next.step = card.step + 1;
      next.due = now + steps[next.step] * MIN_MS;
    }
  } else {
    // review phase
    next.difficulty = nextDifficulty(card.difficulty, grade);

    if (grade === GRADE.AGAIN) {
      next.lapses = card.lapses + 1;
      next.stability = nextStabilityOnLapse(card, r);
      next.phase = "relearning";
      next.step = 0;
      next.due = now + RELEARNING_STEPS[0] * MIN_MS;
    } else {
      next.stability = nextStabilityOnSuccess(card, grade, r);
      next.phase = "review";
      next.due = now + intervalFor(next.stability) * DAY_MS;
    }
  }

  const scheduledDays = (next.due - now) / DAY_MS;

  return {
    card: next,
    log: {
      id: card.id,
      grade,
      at: now,
      elapsed: Number(elapsed.toFixed(4)),
      scheduled: Number(scheduledDays.toFixed(4)),
      phase: card.phase,
      durationMs,
    },
  };
}

/**
 * The interval each grade would produce, for the "1d / 3d / 10d / 1mo" hints
 * under the answer buttons. Learners calibrate their own grading against
 * these, so they are worth showing.
 */
export function previewIntervals(
  card: SrsCard,
  now = Date.now(),
): Record<Grade, string> {
  const out = {} as Record<Grade, string>;
  for (const g of [1, 2, 3, 4] as Grade[]) {
    out[g] = formatInterval(review(card, g, now).card.due - now);
  }
  return out;
}

export function formatInterval(ms: number): string {
  const min = ms / MIN_MS;
  if (min < 60) return `${Math.max(1, Math.round(min))}m`;
  const hours = min / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 60) return `${Math.round(days)}d`;
  const months = days / 30.42;
  // One decimal below a year: at high stability the three passing grades sit
  // close together, and rounding to whole months made them render identically.
  if (months < 12) return `${months.toFixed(1)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}
