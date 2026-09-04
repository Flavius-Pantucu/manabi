"use client";

import { useEffect, useState } from "react";
import type { Level } from "@/lib/content/types";

/**
 * Load one kind of content for one level.
 *
 * The study pages browse a single level at a time, independently of the SRS
 * scope, so they load directly rather than going through the provider — a
 * learner scoped to N5 can still look at N1 kanji without pulling every level
 * into their review queue.
 */
export function useLevelContent<T>(
  level: Level,
  loader: (l: Level) => Promise<T[]>,
): { data: T[]; loading: boolean; error: string | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loader(level)
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not load this level.");
        setLoading(false);
      });
    return () => { alive = false; };
    // loader identity is stable (module-level function)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  return { data, loading, error };
}
