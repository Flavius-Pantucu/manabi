import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import learningReducer from "./features/learning-slice";
import srsReducer from "./features/srs-slice";

// SSR-safe storage adapter for Next.js
const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};

const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();

/**
 * Bumping this runs `migrate` below against anything already in localStorage.
 *
 * Version 1 exists because a prototype build of this app shipped a fabricated
 * history in its initial state — a streak, 42 words learned, a handful of quiz
 * scores — so the dashboard showed progress nobody had made. The seed data was
 * removed from the code, but every browser that ran that build had already
 * written it to localStorage, where it rehydrated on every load afterwards and
 * was indistinguishable from real progress.
 */
const PERSIST_VERSION = 1;

/**
 * Drop the fabricated counters once, keeping everything genuine.
 *
 * Deliberately surgical. `srs` — the cards and the review log — was never
 * seeded and is the record of actual study, so it survives untouched. Within
 * `learning`, the preferences are the learner's real choices and also survive;
 * only the tallies and histories that the prototype invented are cleared.
 */
async function migrate(state: unknown): Promise<any> {
  const s = state as any;
  if (!s?.learning) return s;

  return {
    ...s,
    learning: {
      ...s.learning,
      streak: 0,
      wordsLearned: 0,
      verbsMastered: 0,
      lessonsCompleted: 0,
      learnedToday: 0,
      lastActivityDate: null,
      quizScores: [],
      activityLog: [],
      vocabStatus: {},
      kanjiStatus: {},
      // showFurigana, autoPlayAudio, dailyGoal and bookmarks are the learner's
      // own settings, not invented numbers — left alone.
    },
  };
}

const persistConfig = {
  key: "manabi",
  storage,
  version: PERSIST_VERSION,
  migrate,
  // `auth` is deliberately absent. The signed-in user now comes from a
  // session cookie via Better Auth, and a second copy in localStorage would
  // be a copy that can disagree — showing a signed-in shell to someone whose
  // session expired hours ago.
  whitelist: ["learning", "srs"],
};

const rootReducer = combineReducers({
  learning: learningReducer,
  srs: srsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
