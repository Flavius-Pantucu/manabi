import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { SyncChanges } from "@/lib/sync/protocol";

export interface QuizAttempt {
  quizId: string;
  quizTitle: string;
  score: number;
  timestamp: number;
}

export interface ActivityEntry {
  id: string;
  action: string;
  category: "Vocabulary" | "Grammar" | "Kanji" | "Verbs" | "Quiz" | "Reading" | "General";
  timestamp: number;
}

export interface LearningState {
  streak: number;
  wordsLearned: number;
  verbsMastered: number;
  lessonsCompleted: number;
  bookmarkedGrammar: number[];
  vocabStatus: Record<number, "learned" | "review" | "difficult">;
  kanjiStatus: Record<number, "studied" | "mastered">;
  quizScores: QuizAttempt[];
  activityLog: ActivityEntry[];
  showFurigana: boolean;
  autoPlayAudio: boolean;
  dailyGoal: number;
  learnedToday: number;
  lastActivityDate: string | null; // ISO date string (YYYY-MM-DD)
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Whole days between two YYYY-MM-DD keys.
 *
 * Both parse as UTC midnight, so the subtraction is exact and immune to the
 * daylight-saving hour that makes local-midnight arithmetic drift.
 */
function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * A new learner starts at zero.
 *
 * This used to ship a fabricated history — a 7-day streak, 42 words learned,
 * three quiz scores and four activity entries — so the dashboard showed
 * progress nobody had made. Harmless as a screenshot, dishonest as a product,
 * and now actively wrong: it would sit next to real SRS counts and contradict
 * them.
 */
const initialState: LearningState = {
  streak: 0,
  wordsLearned: 0,
  verbsMastered: 0,
  lessonsCompleted: 0,
  bookmarkedGrammar: [],
  vocabStatus: {},
  kanjiStatus: {},
  quizScores: [],
  activityLog: [],
  showFurigana: true,
  autoPlayAudio: false,
  dailyGoal: 10,
  learnedToday: 0,
  lastActivityDate: null,
};

const learningSlice = createSlice({
  name: "learning",
  initialState,
  reducers: {
    incrementStreak: (state) => {
      state.streak += 1;
    },
    /**
     * Runs on mount. It may only ever BREAK a streak, never start or extend
     * one.
     *
     * It used to do both, and got a streak wrong in three separate ways: a
     * first-time user was handed "1 day in a row" for opening the app, opening
     * it on two consecutive days incremented the count without a single card
     * reviewed, and missing a week reset the streak to 1 rather than 0 —
     * crediting a day that had not happened. A streak that counts app launches
     * is not a study streak, and it is the one number on the profile a learner
     * is most likely to trust.
     *
     * Extension lives in `updateDailyProgress`, which fires on real activity.
     */
    checkAndUpdateStreak: (state) => {
      if (!state.lastActivityDate) return; // Nothing studied yet — stay at 0.

      const gap = daysBetween(state.lastActivityDate, getTodayDate());

      // Today or yesterday: the streak is still live. Yesterday stays intact
      // because studying later today should continue it, not restart it.
      if (gap <= 1) return;

      state.streak = 0;
      state.learnedToday = 0;
    },

    markWordLearned: (state) => {
      state.wordsLearned += 1;
    },
    markVerbMastered: (state) => {
      state.verbsMastered += 1;
    },
    completeLesson: (state) => {
      state.lessonsCompleted += 1;
    },
    toggleBookmark: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      if (state.bookmarkedGrammar.includes(id)) {
        state.bookmarkedGrammar = state.bookmarkedGrammar.filter(
          (i) => i !== id,
        );
      } else {
        state.bookmarkedGrammar.push(id);
      }
    },
    setVocabStatus: (
      state,
      action: PayloadAction<{
        wordId: number;
        status: "learned" | "review" | "difficult";
      }>,
    ) => {
      const { wordId, status } = action.payload;
      state.vocabStatus[wordId] = status;
    },
    setKanjiStatus: (
      state,
      action: PayloadAction<{
        kanjiId: number;
        status: "studied" | "mastered";
      }>,
    ) => {
      const { kanjiId, status } = action.payload;
      state.kanjiStatus[kanjiId] = status;
    },
    addQuizScore: (
      state,
      action: PayloadAction<{
        quizId: string;
        quizTitle: string;
        score: number;
      }>,
    ) => {
      const { quizId, quizTitle, score } = action.payload;
      state.quizScores.push({
        quizId,
        quizTitle,
        score,
        timestamp: Date.now(),
      });
    },
    addActivity: (
      state,
      action: PayloadAction<{
        action: string;
        category: ActivityEntry["category"];
      }>,
    ) => {
      state.activityLog.unshift({
        id: generateId(),
        action: action.payload.action,
        category: action.payload.category,
        timestamp: Date.now(),
      });
      // Keep only last 50 entries
      if (state.activityLog.length > 50) {
        state.activityLog = state.activityLog.slice(0, 50);
      }
    },
    toggleFurigana: (state) => {
      state.showFurigana = !state.showFurigana;
    },
    toggleAutoPlay: (state) => {
      state.autoPlayAudio = !state.autoPlayAudio;
    },
    /**
     * Records one unit of real study. The only thing that can raise a streak.
     */
    updateDailyProgress: (state) => {
      const today = getTodayDate();

      if (state.lastActivityDate === today) {
        state.learnedToday += 1;
        return;
      }

      const continues =
        state.lastActivityDate !== null &&
        daysBetween(state.lastActivityDate, today) === 1;

      state.streak = continues ? state.streak + 1 : 1;
      state.learnedToday = 1;
      state.lastActivityDate = today;
    },

    setDailyGoal: (state, action: PayloadAction<number>) => {
      state.dailyGoal = action.payload;
    },

    /**
     * Fold in what the server sent.
     *
     * Lifetime counters take the maximum rather than the incoming value: they
     * only ever go up, and a device that has been offline a fortnight would
     * otherwise roll the learner's totals backwards on its first sync. The
     * preferences below them are settings, not tallies, so the most recent
     * edit simply wins.
     */
    /** Back to a blank slate — used when a different account signs in here. */
    resetLearningState: () => initialState,

    mergeRemoteLearning: (state, action: PayloadAction<SyncChanges>) => {
      const { learning, statuses, bookmarks } = action.payload;

      if (learning) {
        state.streak = Math.max(state.streak, learning.streak);
        state.wordsLearned = Math.max(state.wordsLearned, learning.wordsLearned);
        state.verbsMastered = Math.max(state.verbsMastered, learning.verbsMastered);
        state.lessonsCompleted = Math.max(
          state.lessonsCompleted,
          learning.lessonsCompleted,
        );
        state.dailyGoal = learning.dailyGoal;
        state.showFurigana = learning.showFurigana;
        state.autoPlayAudio = learning.autoPlayAudio;

        // Only adopt the remote day counter when the remote day is at least as
        // recent. Taking a stale device's "3 learned" would otherwise reset
        // today's progress on the device actually being used.
        const remoteDay = learning.lastActivityDate ?? "";
        const localDay = state.lastActivityDate ?? "";
        if (remoteDay > localDay) {
          state.lastActivityDate = learning.lastActivityDate;
          state.learnedToday = learning.learnedToday;
        } else if (remoteDay === localDay) {
          state.learnedToday = Math.max(state.learnedToday, learning.learnedToday);
        }
      }

      for (const s of statuses) {
        const key = Number(s.refId);
        const id = Number.isFinite(key) ? key : (s.refId as unknown as number);
        const map = s.kind === "vocab" ? state.vocabStatus : state.kanjiStatus;
        if (s.deleted) delete map[id];
        else map[id] = s.status as never;
      }

      const grammar = new Set(state.bookmarkedGrammar);
      for (const b of bookmarks) {
        if (b.kind !== "grammar") continue;
        const id = Number(b.refId);
        if (!Number.isFinite(id)) continue;
        if (b.deleted) grammar.delete(id);
        else grammar.add(id);
      }
      state.bookmarkedGrammar = [...grammar];
    },
  },
});

export const {
  incrementStreak,
  mergeRemoteLearning,
  resetLearningState,
  checkAndUpdateStreak,
  markWordLearned,
  markVerbMastered,
  completeLesson,
  toggleBookmark,
  setVocabStatus,
  setKanjiStatus,
  addQuizScore,
  addActivity,
  toggleFurigana,
  toggleAutoPlay,
  updateDailyProgress,
  setDailyGoal,
} = learningSlice.actions;
export default learningSlice.reducer;
