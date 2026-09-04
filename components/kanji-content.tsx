"use client";

import { useState, useMemo, useDeferredValue, useEffect } from "react";
import { Search, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeakButton } from "@/components/speak-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LevelFilter } from "@/components/level-filter";
import { StrokeOrder } from "@/components/stroke-order";
import { ReviewSession } from "@/components/review-session";
import { useLevelContent } from "@/hooks/use-level-content";
import { useContent } from "@/lib/content/provider";
import { loadKanji } from "@/lib/content/loader";
import type { Kanji, Level } from "@/lib/content/types";

function Detail({ k }: { k: Kanji }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 py-7">
        {/* Stroke order, not a static glyph: the order is how the character is
            written and how it is looked up. */}
        <StrokeOrder character={k.character} size={200} />

        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            {k.meanings.slice(0, 3).join(", ")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span data-numeric>{k.strokes}</span> strokes · {k.level}
            {k.grade ? <> · grade {k.grade}</> : null}
            {k.frequency ? <> · #{k.frequency} by frequency</> : null}
          </p>
        </div>

        <div className="grid w-full max-w-sm grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              On&rsquo;yomi
            </p>
            <p lang="ja" className="font-jp text-sm font-semibold text-foreground">
              {k.onyomi.length ? k.onyomi.join("・") : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Kun&rsquo;yomi
            </p>
            <p lang="ja" className="font-jp text-sm font-semibold text-foreground">
              {k.kunyomi.length ? k.kunyomi.join("・") : "—"}
            </p>
          </div>
        </div>

        {k.radicals.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Built from
            </p>
            <div className="flex flex-wrap gap-1.5">
              {k.radicals.map((r) => (
                <span key={r} className="rounded-md bg-fuji/12 px-2 py-1 text-xs font-medium text-fuji">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {k.examples.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Example words
            </p>
            <div className="flex flex-col gap-1.5">
              {k.examples.map((ex) => (
                <div
                  key={ex.word}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span lang="ja" className="block font-jp text-base font-medium text-foreground">
                      {ex.word}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {ex.reading}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {ex.meaning}
                    </span>
                  </span>
                  <SpeakButton text={ex.word} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const PAGE = 120;

export function KanjiContent() {
  const [level, setLevel] = useState<Level>("N5");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Kanji | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [drilling, setDrilling] = useState(false);
  const { manifest } = useContent();
  const { data, loading, error } = useLevelContent(level, loadKanji);
  const deferred = useDeferredValue(q);

  useEffect(() => { setSelected(null); setShown(PAGE); }, [level, deferred]);

  const filtered = useMemo(() => {
    const s = deferred.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (k) =>
        k.character === s ||
        k.meanings.some((m) => m.toLowerCase().includes(s)) ||
        k.onyomi.some((r) => r.includes(s)) ||
        k.kunyomi.some((r) => r.includes(s)),
    );
  }, [data, deferred]);

  const counts = useMemo(() => {
    if (!manifest) return undefined;
    return Object.fromEntries(
      Object.entries(manifest.levels).map(([k, v]) => [k, v.kanji]),
    ) as Partial<Record<Level, number>>;
  }, [manifest]);

  if (drilling) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Kanji drill</h1>
          <Button variant="ghost" size="sm" onClick={() => setDrilling(false)}>
            Back to list
          </Button>
        </div>
        <ReviewSession deck="kanji" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Kanji{" "}
          <span lang="ja" className="font-jp text-base font-normal text-muted-foreground">
            漢字
          </span>
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          All 2,211 JLPT kanji with animated stroke order, readings, the
          components they are built from, and example words.
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
              placeholder="Search character, meaning or reading…"
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
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-9">
              {filtered.slice(0, shown).map((k) => (
                <button
                  key={k.character}
                  onClick={() => setSelected(k)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg border transition-colors duration-(--dur-1)",
                    selected?.character === k.character
                      ? "border-primary bg-primary-tint"
                      : "border-border bg-card hover:border-primary hover:bg-accent",
                  )}
                  title={k.meanings.slice(0, 2).join(", ")}
                >
                  <span lang="ja" className="font-jp text-2xl text-foreground">
                    {k.character}
                  </span>
                </button>
              ))}
            </div>
            {shown < filtered.length && (
              <Button variant="outline" onClick={() => setShown((s) => s + PAGE * 2)} className="mt-3">
                Show more ({filtered.length - shown} left)
              </Button>
            )}
            {filtered.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No kanji match that search.
              </p>
            )}
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            {selected ? (
              <Detail k={selected} />
            ) : (
              <Card>
                <CardContent className="py-14 text-center text-sm text-muted-foreground">
                  Select a kanji to see its stroke order and readings.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
