import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
    checkAndUpdateStreak: (state) => {
      const today = getTodayDate();
      if (!state.lastActivityDate) {
        // First time user
        state.streak = 1;
        state.learnedToday = 0;
        state.lastActivityDate = today;
        return;
      }

      const lastDate = new Date(state.lastActivityDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        // Same day, no streak change
        return;
      } else if (diffDays === 1) {
        // Consecutive day — increment streak
        state.streak += 1;
        state.learnedToday = 0;
        state.lastActivityDate = today;
      } else {
        // Missed one or more days — reset streak
        state.streak = 1;
        state.learnedToday = 0;
        state.lastActivityDate = today;
      }
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
    updateDailyProgress: (state) => {
      const today = getTodayDate();
      if (state.lastActivityDate !== today) {
        state.learnedToday = 1;
        state.lastActivityDate = today;
      } else {
        state.learnedToday += 1;
      }
    },
    setDailyGoal: (state, action: PayloadAction<number>) => {
      state.dailyGoal = action.payload;
    },
  },
});

export const {
  incrementStreak,
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
