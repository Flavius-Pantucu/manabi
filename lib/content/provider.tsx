"use client";

import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { loadLevels, loadManifest } from "./loader";
import type { ContentManifest, Level, LevelContent } from "./types";
import { LEVELS } from "./types";
import {
  buildItems, indexItems, kanaDeckItems, type ReviewItem,
} from "@/lib/srs/decks";

/**
 * Loads the JLPT levels the learner has switched on, and exposes the cards
 * built from them.
 *
 * Content is fetched, not bundled, so `items` starts as kana only — 104 cards
 * that are always available — and grows as levels arrive. Consumers get a
 * `ready` flag rather than a suspended tree, because a beginner should be able
 * to start hiragana immediately without waiting on N1 vocabulary.
 *
 * Levels already in progress are always loaded, even if the learner has since
 * narrowed their scope: otherwise their scheduled cards would vanish from the
 * queue and the review history would point at items that no longer resolve.
 */

interface ContentValue {
  items: ReviewItem[];
  byId: Map<string, ReviewItem>;
  levels: LevelContent[];
  manifest: ContentManifest | null;
  ready: boolean;
  loading: boolean;
  error: string | null;
  /** Force-load levels beyond the current scope (used by the study pages). */
  request: (levels: Level[]) => void;
}

const Ctx = createContext<ContentValue | null>(null);

const KANA_ONLY = kanaDeckItems();

export function ContentProvider({ children }: { children: ReactNode }) {
  const settingsLevels = useAppSelector((s) => s.srs?.settings?.levels);
  const cards = useAppSelector((s) => s.srs?.cards);

  const [loaded, setLoaded] = useState<LevelContent[]>([]);
  const [manifest, setManifest] = useState<ContentManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extra, setExtra] = useState<Level[]>([]);

  // Which levels must be present: the chosen scope, plus any level the learner
  // already has cards in, plus anything a page explicitly asked for.
  const wanted = useMemo(() => {
    const set = new Set<Level>((settingsLevels as Level[]) ?? ["N5"]);
    for (const l of extra) set.add(l);
    for (const id of Object.keys(cards ?? {})) {
      // card ids don't carry a level, so fall back to loading everything the
      // learner could plausibly have started once they have any non-kana card
      if (!id.startsWith("kana:")) { LEVELS.forEach((l) => set.add(l)); break; }
    }
    return LEVELS.filter((l) => set.has(l));
  }, [settingsLevels, extra, cards]);

  const key = wanted.join(",");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([loadLevels(wanted), loadManifest().catch(() => null)])
      .then(([levels, m]) => {
        if (!alive) return;
        setLoaded(levels);
        if (m) setManifest(m);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not load study content.");
        setLoading(false);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const value = useMemo<ContentValue>(() => {
    const items = loaded.length ? buildItems(loaded) : KANA_ONLY;
    return {
      items,
      byId: indexItems(items),
      levels: loaded,
      manifest,
      ready: loaded.length > 0,
      loading,
      error,
      request: (ls: Level[]) =>
        setExtra((prev) => {
          const next = [...new Set([...prev, ...ls])];
          return next.length === prev.length ? prev : next;
        }),
    };
  }, [loaded, manifest, loading, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContent(): ContentValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useContent must be used inside <ContentProvider>");
  return v;
}

/** Ensure specific levels are loaded — for pages that browse beyond scope. */
export function useRequestLevels(levels: Level[]) {
  const { request } = useContent();
  const key = levels.join(",");
  useEffect(() => {
    if (levels.length) request(levels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
