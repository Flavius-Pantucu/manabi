"use client";

import { useEffect, useState } from "react";
import type { Language, Level } from "@/lib/content/types";
import { useLanguage } from "@/lib/language-context";

/**
 * Load one kind of content for one level in the active language.
 */
export function useLevelContent<T>(
  level: Level,
  loader: (l: Level, lang?: Language) => Promise<T[]>,
): { data: T[]; loading: boolean; error: string | null } {
  const { language } = useLanguage();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loader(level, language)
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not load this level.");
        setLoading(false);
      });
    return () => { alive = false; };
    // loader identity is stable (module-level function)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, language]);

  return { data, loading, error };
}
