import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createCard,
  review as applyReview,
  type Grade,
  type ReviewLogEntry,
  type SrsCard,
} from "@/lib/srs/scheduler";
import type { SyncChanges } from "@/lib/sync/protocol";

export interface SrsState {
  /** Every card the learner has ever seen, keyed by CardId. */
  cards: Record<string, SrsCard>;
  /** Append-only review history. Powers retention stats and forecasting. */
  log: ReviewLogEntry[];
  /** Per-day counters, keyed by YYYY-MM-DD. */
  daily: Record<string, { reviews: number; newCards: number; correct: number }>;
  settings: {
    newPerDay: number;
    maxReviewsPerDay: number;
    /** Deck ids the learner has switched off. */
    disabledDecks: string[];
    /**
     * JLPT levels allowed to introduce NEW cards. Existing cards keep being
     * reviewed whatever this says — narrowing the scope must never strand
     * material the learner has already started.
     */
    levels: string[];
  };
}

const MAX_LOG = 5000;

const initialState: SrsState = {
  cards: {},
  log: [],
  daily: {},
  settings: {
    newPerDay: 10,
    maxReviewsPerDay: 120,
    disabledDecks: [],
    levels: ["N5"],
  },
};

const today = () => new Date().toISOString().slice(0, 10);

function bumpDaily(
  state: SrsState,
  key: "reviews" | "newCards" | "correct",
  n = 1,
) {
  const d = today();
  state.daily[d] ??= { reviews: 0, newCards: 0, correct: 0 };
  state.daily[d][key] += n;
}

const srsSlice = createSlice({
  name: "srs",
  initialState,
  reducers: {
    /** Grade a card. Creates it on first sight. */
    gradeCard: (
      state,
      action: PayloadAction<{ id: string; grade: Grade; durationMs?: number }>,
    ) => {
      const { id, grade, durationMs } = action.payload;
      const now = Date.now();
      const existing = state.cards[id];
      const wasNew = !existing || existing.phase === "new";

      const { card, log } = applyReview(
        existing ?? createCard(id, now),
        grade,
        now,
        durationMs,
      );

      state.cards[id] = card;
      state.log.push(log);
      if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);

      bumpDaily(state, "reviews");
      if (wasNew) bumpDaily(state, "newCards");
      if (grade > 1) bumpDaily(state, "correct");
    },

    /** Put a card back at the end of today's queue without rescheduling. */
    buryCard: (state, action: PayloadAction<string>) => {
      const c = state.cards[action.payload];
      if (c) c.due = Date.now() + 4 * 3600_000;
    },

    /** Drop a card back to new — the "I want to relearn this" escape hatch. */
    resetCard: (state, action: PayloadAction<string>) => {
      state.cards[action.payload] = createCard(action.payload);
    },

    setSrsSettings: (
      state,
      action: PayloadAction<Partial<SrsState["settings"]>>,
    ) => {
      state.settings = { ...state.settings, ...action.payload };
    },

    toggleLevel: (state, action: PayloadAction<string>) => {
      const lv = action.payload;
      const i = state.settings.levels.indexOf(lv);
      if (i >= 0) state.settings.levels.splice(i, 1);
      else state.settings.levels.push(lv);
      // Never leave the learner with nothing to study.
      if (state.settings.levels.length === 0) state.settings.levels.push(lv);
    },

    toggleDeck: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const i = state.settings.disabledDecks.indexOf(id);
      if (i >= 0) state.settings.disabledDecks.splice(i, 1);
      else state.settings.disabledDecks.push(id);
    },

    /** Back to a blank slate — used when a different account signs in here. */
    resetSrsState: () => initialState,

    /** Wholesale replace — used by Import. */
    replaceSrsState: (_state, action: PayloadAction<SrsState>) => action.payload,

    /**
     * Fold in what the server sent.
     *
     * The rules match `mergeBackup` in lib/srs/backup.ts and the SQL in
     * lib/sync/server.ts, with one deliberate difference: cards apply on
     * *strictly* newer `lastReview`, where the server uses `>=`.
     *
     * The asymmetry is the point. This device may hold edits it has not
     * managed to push yet — a card buried thirty seconds ago on a train — and
     * a tie should not let the server's older copy overwrite them. The server
     * has no such worry: by the time it compares, it has both versions.
     */
    mergeRemote: (state, action: PayloadAction<SyncChanges>) => {
      const { cards, reviews, daily, settings } = action.payload;

      for (const c of cards) {
        const cur = state.cards[c.id];
        if (cur && (c.lastReview ?? 0) <= (cur.lastReview ?? 0)) continue;
        state.cards[c.id] = {
          id: c.id,
          phase: c.phase,
          stability: c.stability,
          difficulty: c.difficulty,
          due: c.due,
          lastReview: c.lastReview,
          reps: c.reps,
          lapses: c.lapses,
          step: c.step,
        };
      }

      if (reviews.length) {
        const seen = new Set(state.log.map((l) => `${l.id}@${l.at}`));
        for (const r of reviews) {
          const k = `${r.id}@${r.at}`;
          if (seen.has(k)) continue;
          seen.add(k);
          state.log.push(r as ReviewLogEntry);
        }
        state.log.sort((a, b) => a.at - b.at);
        if (state.log.length > MAX_LOG) {
          state.log.splice(0, state.log.length - MAX_LOG);
        }
      }

      // Per-field maximum: these are the daily caps the queue reads, and
      // under-counting would let a learner exceed them by switching device.
      for (const d of daily) {
        const cur = state.daily[d.day];
        state.daily[d.day] = cur
          ? {
              reviews: Math.max(cur.reviews, d.reviews),
              newCards: Math.max(cur.newCards, d.newCards),
              correct: Math.max(cur.correct, d.correct),
            }
          : { reviews: d.reviews, newCards: d.newCards, correct: d.correct };
      }

      if (settings) {
        state.settings = {
          newPerDay: settings.newPerDay,
          maxReviewsPerDay: settings.maxReviewsPerDay,
          disabledDecks: settings.disabledDecks,
          levels: settings.levels.length ? settings.levels : state.settings.levels,
        };
      }
    },
  },
});

export const {
  gradeCard,
  mergeRemote,
  resetSrsState,
  toggleLevel,
  buryCard,
  resetCard,
  setSrsSettings,
  toggleDeck,
  replaceSrsState,
} = srsSlice.actions;
export default srsSlice.reducer;
