"use client";

import { createContext, useContext, useCallback, useEffect, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import * as actions from "./store/features/learning-slice";
import type { ActivityEntry } from "./store/features/learning-slice";
import { triggerSuccess, triggerSakura } from "./confetti";

export interface QuizAttempt {
  quizId: string;
  quizTitle: string;
  score: number;
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
  lastActivityDate: string | null;
}

interface LearningContextValue extends LearningState {
  incrementStreak: () => void;
  markWordLearned: () => void;
  markVerbMastered: () => void;
  completeLesson: () => void;
  toggleBookmark: (grammarId: number) => void;
  setVocabStatus: (
    wordId: number,
    status: "learned" | "review" | "difficult",
  ) => void;
  setKanjiStatus: (
    kanjiId: number,
    status: "studied" | "mastered",
  ) => void;
  addQuizScore: (quizId: string, quizTitle: string, score: number) => void;
  toggleFurigana: () => void;
  toggleAutoPlay: () => void;
  setDailyGoal: (goal: number) => void;
}

const LearningContext = createContext<LearningContextValue | null>(null);

export function LearningProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const rawState = useAppSelector((state) => state.learning);

  // Guarantee non-null / non-undefined defaults even across storage migrations
  const state: LearningState = {
    streak: rawState?.streak ?? 0,
    wordsLearned: rawState?.wordsLearned ?? 0,
    verbsMastered: rawState?.verbsMastered ?? 0,
    lessonsCompleted: rawState?.lessonsCompleted ?? 0,
    bookmarkedGrammar: Array.isArray(rawState?.bookmarkedGrammar) ? rawState.bookmarkedGrammar : [],
    vocabStatus: rawState?.vocabStatus && typeof rawState.vocabStatus === "object" ? rawState.vocabStatus : {},
    kanjiStatus: rawState?.kanjiStatus && typeof rawState.kanjiStatus === "object" ? rawState.kanjiStatus : {},
    quizScores: Array.isArray(rawState?.quizScores) ? rawState.quizScores : [],
    activityLog: Array.isArray(rawState?.activityLog) ? rawState.activityLog : [],
    showFurigana: rawState?.showFurigana ?? true,
    autoPlayAudio: rawState?.autoPlayAudio ?? false,
    dailyGoal: rawState?.dailyGoal ?? 5,
    learnedToday: rawState?.learnedToday ?? 0,
    lastActivityDate: rawState?.lastActivityDate ?? null,
  };

  // Check and update streak on mount (handles day transitions)
  useEffect(() => {
    dispatch(actions.checkAndUpdateStreak());
  }, [dispatch]);

  const incrementStreak = useCallback(
    () => dispatch(actions.incrementStreak()),
    [dispatch],
  );
  const markWordLearned = useCallback(() => {
    dispatch(actions.markWordLearned());
    dispatch(actions.updateDailyProgress());
    dispatch(actions.addActivity({ action: "Learned a new word", category: "Vocabulary" }));
    triggerSuccess();

    // Check for goal completion
    if (state.learnedToday + 1 === state.dailyGoal) {
      setTimeout(triggerSakura, 500);
    }
  }, [dispatch, state.learnedToday, state.dailyGoal]);
  const markVerbMastered = useCallback(
    () => {
      dispatch(actions.markVerbMastered());
      dispatch(actions.addActivity({ action: "Mastered a verb conjugation", category: "Verbs" }));
    },
    [dispatch],
  );
  const nextLesson = useCallback(
    () => {
      dispatch(actions.completeLesson());
      dispatch(actions.addActivity({ action: "Completed a lesson", category: "Grammar" }));
    },
    [dispatch],
  );
  const toggleBookmark = useCallback(
    (id: number) => dispatch(actions.toggleBookmark(id)),
    [dispatch],
  );
  const setVocabStatus = useCallback(
    (wordId: number, status: "learned" | "review" | "difficult") => {
      const isNewLearned =
        status === "learned" && state.vocabStatus[wordId] !== "learned";
      dispatch(actions.setVocabStatus({ wordId, status }));
      dispatch(actions.addActivity({
        action: `Marked word as ${status}`,
        category: "Vocabulary",
      }));

      if (isNewLearned) {
        dispatch(actions.updateDailyProgress());
        triggerSuccess();
        if (state.learnedToday + 1 === state.dailyGoal) {
          setTimeout(triggerSakura, 500);
        }
      }
    },
    [dispatch, state.vocabStatus, state.learnedToday, state.dailyGoal],
  );
  const setKanjiStatus = useCallback(
    (kanjiId: number, status: "studied" | "mastered") => {
      dispatch(actions.setKanjiStatus({ kanjiId, status }));
      dispatch(actions.addActivity({
        action: `Marked kanji as ${status}`,
        category: "Kanji",
      }));
      if (status === "mastered") {
        triggerSuccess();
      }
    },
    [dispatch],
  );
  const addQuizScore = useCallback(
    (quizId: string, quizTitle: string, score: number) => {
      dispatch(actions.addQuizScore({ quizId, quizTitle, score }));
      dispatch(actions.addActivity({
        action: `Scored ${score}% on ${quizTitle}`,
        category: "Quiz",
      }));
    },
    [dispatch],
  );
  const toggleFurigana = useCallback(
    () => dispatch(actions.toggleFurigana()),
    [dispatch],
  );
  const toggleAutoPlay = useCallback(
    () => dispatch(actions.toggleAutoPlay()),
    [dispatch],
  );
  const setDailyGoal = useCallback(
    (goal: number) => dispatch(actions.setDailyGoal(goal)),
    [dispatch],
  );

  return (
    <LearningContext.Provider
      value={{
        ...state,
        incrementStreak,
        markWordLearned,
        markVerbMastered,
        completeLesson: nextLesson,
        toggleBookmark,
        setVocabStatus,
        setKanjiStatus,
        addQuizScore,
        toggleFurigana,
        toggleAutoPlay,
        setDailyGoal,
      }}
    >
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context)
    throw new Error("useLearning must be used within LearningProvider");
  return context;
}
