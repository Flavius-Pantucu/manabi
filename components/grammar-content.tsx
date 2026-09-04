"use client";

import { useState, useMemo, useDeferredValue, useEffect } from "react";
import { Search, Zap, X, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeakButton } from "@/components/speak-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LevelFilter } from "@/components/level-filter";
import { ReviewSession } from "@/components/review-session";
import { useLevelContent } from "@/hooks/use-level-content";
import { useContent } from "@/lib/content/provider";
import { loadGrammar } from "@/lib/content/loader";
import type { GrammarPoint, Level } from "@/lib/content/types";

function Point({ g }: { g: GrammarPoint }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div>
          <h3 lang="ja" className="font-jp text-xl font-semibold text-foreground">
            {g.pattern}
          </h3>
          <p className="mt-0.5 text-sm text-foreground">{g.meaning}</p>
        </div>

        <div className="rounded-lg bg-muted px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Formation
          </p>
          <p lang="ja" className="mt-0.5 font-jp text-sm text-foreground">{g.formation}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {g.examples.map((ex, i) => (
            <div key={i} className="border-l border-border pl-3">
              <p className="flex items-start gap-2">
                <span lang="ja" className="font-jp text-base text-foreground">{ex.japanese}</span>
                <SpeakButton text={ex.japanese} size="sm" className="mt-0.5" label="Play example" />
              </p>
              <p className="text-xs italic text-muted-foreground">{ex.romaji}</p>
              <p className="text-sm text-muted-foreground">{ex.english}</p>
            </div>
          ))}
        </div>

        {g.comparison && (
          <div className="rounded-lg border border-ai/30 bg-ai/8 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ai">
              <ArrowRightLeft className="size-3.5" />
              <span lang="ja" className="font-jp">{g.comparison.pattern}</span>
            </p>
            <p className="mt-1 text-sm text-foreground">{g.comparison.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GrammarContent() {
  const [level, setLevel] = useState<Level>("N5");
  const [q, setQ] = useState("");
  const [drilling, setDrilling] = useState(false);
  const { manifest } = useContent();
  const { data, loading, error } = useLevelContent(level, loadGrammar);
  const deferred = useDeferredValue(q);

  const filtered = useMemo(() => {
    const s = deferred.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (g) =>
        g.pattern.includes(s) ||
        g.meaning.toLowerCase().includes(s) ||
        g.formation.toLowerCase().includes(s),
    );
  }, [data, deferred]);

  const counts = useMemo(() => {
    if (!manifest) return undefined;
    return Object.fromEntries(
      Object.entries(manifest.levels).map(([k, v]) => [k, v.grammar]),
    ) as Partial<Record<Level, number>>;
  }, [manifest]);

  if (drilling) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Grammar drill</h1>
          <Button variant="ghost" size="sm" onClick={() => setDrilling(false)}>
            Back to list
          </Button>
        </div>
        <ReviewSession deck="grammar" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Grammar{" "}
          <span lang="ja" className="font-jp text-base font-normal text-muted-foreground">
            文法
          </span>
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          155 patterns from N5 to N1, each with how it is formed, worked
          examples, and — where it matters — what it is easily confused with.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <LevelFilter value={level} onChange={setLevel} counts={counts} />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pattern or meaning…"
              className="pl-9 pr-9"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
          <Button onClick={() => setDrilling(true)}>
            <Zap className="size-4" /> Drill
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No patterns match that search.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((g) => <Point key={g.id} g={g} />)}
        </div>
      )}
    </div>
  );
}
