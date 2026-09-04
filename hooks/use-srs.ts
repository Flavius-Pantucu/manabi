"use client";

import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  gradeCard,
  buryCard,
  resetCard,
  setSrsSettings,
  toggleDeck,
  toggleLevel,
  type SrsState,
} from "@/lib/store/features/srs-slice";
import {
  buildQueue,
  queueStats,
  forecast,
  maturityBreakdown,
  trueRetention,
  leeches,
  cardFor,
} from "@/lib/srs/queue";
import type { DeckId } from "@/lib/srs/decks";
import { useContent } from "@/lib/content/provider";
import type { Grade } from "@/lib/srs/scheduler";

const EMPTY: SrsState = {
  cards: {},
  log: [],
  daily: {},
  settings: { newPerDay: 10, maxReviewsPerDay: 120, disabledDecks: [], levels: ["N5"] },
};

export function useSrs() {
  const dispatch = useAppDispatch();
  const raw = useAppSelector((s) => s.srs);
  // Cards come from the content provider, which loads only the levels in
  // scope. Everything below is a pure function of (state, items).
  const { items, byId, ready, loading } = useContent();

  // redux-persist rehydrates asynchronously, so the first render can see a
  // partial slice. Normalising here keeps every consumer from having to guard.
  const state: SrsState = useMemo(
    () => ({
      cards: raw?.cards ?? EMPTY.cards,
      log: raw?.log ?? EMPTY.log,
      daily: raw?.daily ?? EMPTY.daily,
      settings: { ...EMPTY.settings, ...(raw?.settings ?? {}) },
    }),
    [raw],
  );

  const grade = useCallback(
    (id: string, g: Grade, durationMs?: number) =>
      dispatch(gradeCard({ id, grade: g, durationMs })),
    [dispatch],
  );

  return {
    state,
    items,
    byId,
    contentReady: ready,
    contentLoading: loading,
    grade,
    bury: useCallback((id: string) => dispatch(buryCard(id)), [dispatch]),
    reset: useCallback((id: string) => dispatch(resetCard(id)), [dispatch]),
    updateSettings: useCallback(
      (s: Partial<SrsState["settings"]>) => dispatch(setSrsSettings(s)),
      [dispatch],
    ),
    toggleDeckEnabled: useCallback(
      (d: DeckId) => dispatch(toggleDeck(d)),
      [dispatch],
    ),
    toggleLevelEnabled: useCallback(
      (lv: string) => dispatch(toggleLevel(lv)),
      [dispatch],
    ),
    cardFor: useCallback((id: string) => cardFor(state, id), [state]),
    buildQueue: useCallback(
      (opts?: Parameters<typeof buildQueue>[2]) => buildQueue(state, items, opts),
      [state, items],
    ),
    stats: useCallback(
      (deck?: DeckId) => queueStats(state, items, Date.now(), deck),
      [state, items],
    ),
    forecast: useCallback((days?: number) => forecast(state, days), [state]),
    maturity: useCallback(() => maturityBreakdown(state, items), [state, items]),
    retention: useCallback((days?: number) => trueRetention(state, days), [state]),
    leeches: useCallback((n?: number) => leeches(state, byId, n), [state, byId]),
  };
}
