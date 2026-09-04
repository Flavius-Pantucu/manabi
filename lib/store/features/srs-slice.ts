import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createCard,
  review as applyReview,
  type Grade,
  type ReviewLogEntry,
  type SrsCard,
} from "@/lib/srs/scheduler";

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

    /** Wholesale replace — used by Import. */
    replaceSrsState: (_state, action: PayloadAction<SrsState>) => action.payload,
  },
});

export const {
  gradeCard,
  toggleLevel,
  buryCard,
  resetCard,
  setSrsSettings,
  toggleDeck,
  replaceSrsState,
} = srsSlice.actions;
export default srsSlice.reducer;
