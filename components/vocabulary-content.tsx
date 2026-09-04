"use client";

import { useState, useMemo, useDeferredValue } from "react";
import Link from "next/link";
import { Search, Volume2, Zap, RotateCcw, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeakButton } from "@/components/speak-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LevelFilter } from "@/components/level-filter";
import { ReviewSession } from "@/components/review-session";
import { PitchAccent } from "@/components/pitch-accent";
import { useLevelContent } from "@/hooks/use-level-content";
import { useContent } from "@/lib/content/provider";
import { loadVocab } from "@/lib/content/loader";
import { speak } from "@/lib/speech";
import { PITCH } from "@/lib/data/pitch";
import type { Level, Vocab } from "@/lib/content/types";

const POS_TONE: Record<string, string> = {
  noun: "bg-ai/12 text-ai",
  verb: "bg-matsuba/12 text-matsuba",
  "i-adjective": "bg-shu/12 text-shu",
  "na-adjective": "bg-shu/12 text-shu",
  adjective: "bg-shu/12 text-shu",
  adverb: "bg-fuji/12 text-fuji",
  expression: "bg-kincha/12 text-kincha",
};
const tone = (p: string) => POS_TONE[p] ?? "bg-muted text-muted-foreground";

// ── Flashcards ──────────────────────────────────────────────────────────────

function Flashcards({ words }: { words: Vocab[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const w = words[i];
  if (!w) return null;

  const go = (d: number) => {
    setFlipped(false);
    setI((v) => (v + d + words.length) % words.length);
  };
  const pitch = PITCH[w.reading]?.[w.word];

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => setFlipped((v) => !v)}
        className="w-full max-w-lg"
        aria-label={flipped ? "Show the word" : "Show the meaning"}
      >
        <Card className="min-h-56 justify-center transition-colors duration-(--dur-2) hover:border-primary">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            {!flipped ? (
              <>
                <p lang="ja" className="font-jp text-5xl font-semibold text-foreground">
                  {w.word}
                </p>
                <p className="text-sm text-muted-foreground">Tap to flip</p>
              </>
            ) : (
              <>
                <p lang="ja" className="font-jp text-2xl text-muted-foreground">
                  {w.reading}
                </p>
                <p className="text-xl font-semibold text-foreground">{w.meaning}</p>
                {w.altMeanings?.length ? (
                  <p className="text-sm text-muted-foreground">
                    {w.altMeanings.join(" · ")}
                  </p>
                ) : null}
                {pitch !== undefined && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <PitchAccent kana={w.reading} drop={pitch} showLabel={false} />
                  </span>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </button>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Previous">
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => speak(w.word)} aria-label="Play pronunciation">
          <Volume2 className="size-4" />
        </Button>
        <span data-numeric className="min-w-20 text-center text-sm text-muted-foreground">
          {i + 1} / {words.length}
        </span>
        <Button variant="outline" size="icon" onClick={() => setFlipped((v) => !v)} aria-label="Flip">
          <RotateCcw className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Next">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Browser ─────────────────────────────────────────────────────────────────

const PAGE = 60;

function WordList({ words }: { words: Vocab[] }) {
  const [shown, setShown] = useState(PAGE);
  const slice = words.slice(0, shown);

  if (words.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No words match that search.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {slice.map((w) => {
        const pitch = PITCH[w.reading]?.[w.word];
        return (
          <div
            key={w.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p lang="ja" className="font-jp text-lg font-medium text-foreground">
                {w.word}
                {w.reading !== w.word && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {w.reading}
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-muted-foreground">{w.meaning}</p>
            </div>
            {pitch !== undefined && (
              <span className="hidden shrink-0 sm:block">
                <PitchAccent kana={w.reading} drop={pitch} showLabel={false} />
              </span>
            )}
            <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium", tone(w.partOfSpeech))}>
              {w.partOfSpeech}
            </span>
            <SpeakButton text={w.word} />
          </div>
        );
      })}

      {shown < words.length && (
        <Button variant="outline" onClick={() => setShown((s) => s + PAGE * 2)} className="mt-2">
          Show more ({words.length - shown} left)
        </Button>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function VocabularyContent() {
  const [level, setLevel] = useState<Level>("N5");
  const [q, setQ] = useState("");
  const [drilling, setDrilling] = useState(false);
  const { manifest } = useContent();
  const { data, loading, error } = useLevelContent(level, loadVocab);
  const deferred = useDeferredValue(q);

  const filtered = useMemo(() => {
    const s = deferred.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (w) =>
        w.word.includes(s) ||
        w.reading.includes(s) ||
        w.meaning.toLowerCase().includes(s) ||
        w.altMeanings?.some((m) => m.toLowerCase().includes(s)),
    );
  }, [data, deferred]);

  const counts = useMemo(() => {
    if (!manifest) return undefined;
    return Object.fromEntries(
      Object.entries(manifest.levels).map(([k, v]) => [k, v.vocab]),
    ) as Partial<Record<Level, number>>;
  }, [manifest]);

  if (drilling) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Vocabulary drill</h1>
          <Button variant="ghost" size="sm" onClick={() => setDrilling(false)}>
            Back to list
          </Button>
        </div>
        <ReviewSession deck="vocab" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Vocabulary{" "}
          <span lang="ja" className="font-jp text-base font-normal text-muted-foreground">
            語彙
          </span>
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Every JLPT level, with readings, part of speech and pitch accent where
          it has been verified.
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
              placeholder="Search kanji, kana or meaning…"
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
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="list">
          <TabsList className="w-full">
            <TabsTrigger value="list" className="flex-1">
              Browse <span data-numeric className="ml-1.5 opacity-70">{filtered.length}</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex-1">Flashcards</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4">
            <WordList words={filtered} />
          </TabsContent>
          <TabsContent value="cards" className="mt-4">
            {filtered.length ? (
              <Flashcards words={filtered} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nothing to review with this filter.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
