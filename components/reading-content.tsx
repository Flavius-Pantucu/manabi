"use client";

import { useState, useMemo, useEffect } from "react";
import { Check, X, Volume2, Eye, EyeOff, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LevelFilter } from "@/components/level-filter";
import { useLevelContent } from "@/hooks/use-level-content";
import { useContent } from "@/lib/content/provider";
import { loadReading } from "@/lib/content/loader";
import { speak, stopSpeaking } from "@/lib/speech";
import type { Level, ReadingPassage } from "@/lib/content/types";

function Passage({ p }: { p: ReadingPassage }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setShowTranslation(false); setAnswers({}); setChecked(false);
    return () => stopSpeaking();
  }, [p.id]);

  const score = useMemo(
    () => p.questions.filter((q, i) => answers[i] === q.answer).length,
    [answers, p.questions],
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 py-6">
          <div className="flex items-start justify-between gap-3">
            <h2 lang="ja" className="font-jp text-xl font-semibold text-foreground">
              {p.title}
            </h2>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => {
                  if (speaking) { stopSpeaking(); setSpeaking(false); return; }
                  setSpeaking(true);
                  speak(p.japanese, { rate: 0.9, onEnd: () => setSpeaking(false), onUnavailable: () => setSpeaking(false) });
                }}
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
              >
                <Volume2 className={cn("size-4", speaking && "text-primary")} />
                <span className="sr-only">{speaking ? "Stop" : "Read aloud"}</span>
              </button>
              <button
                onClick={() => setShowTranslation((v) => !v)}
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
              >
                {showTranslation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">
                  {showTranslation ? "Hide translation" : "Show translation"}
                </span>
              </button>
            </div>
          </div>

          <p lang="ja" className="font-jp text-lg leading-loose text-foreground">
            {p.japanese}
          </p>

          {showTranslation && (
            <p className="rounded-lg bg-muted px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
              {p.translation}
            </p>
          )}
        </CardContent>
      </Card>

      {p.words.length > 0 && (
        <Card>
          <CardContent className="py-5">
            <p className="mb-3 text-sm font-semibold text-foreground">Vocabulary</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {p.words.map((w) => (
                <div key={w.word} className="flex items-baseline gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                  <span lang="ja" className="font-jp text-sm font-medium text-foreground">
                    {w.word}
                  </span>
                  <span lang="ja" className="font-jp text-xs text-muted-foreground">
                    {w.reading}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">— {w.meaning}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {p.questions.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <p className="text-sm font-semibold text-foreground">Comprehension</p>
            {p.questions.map((q, qi) => (
              <div key={qi} className="flex flex-col gap-2">
                <p lang="ja" className="font-jp text-sm text-foreground">{q.question}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {q.options.map((opt, oi) => {
                    const picked = answers[qi] === oi;
                    const right = q.answer === oi;
                    return (
                      <button
                        key={oi}
                        disabled={checked}
                        onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                        className={cn(
                          "min-h-10 rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-(--dur-1)",
                          !checked && picked && "border-primary bg-primary-tint text-secondary-foreground",
                          !checked && !picked && "border-input hover:bg-accent hover:text-accent-foreground",
                          checked && right && "border-matsuba bg-matsuba/12 text-matsuba",
                          checked && picked && !right && "border-destructive bg-destructive/10 text-destructive",
                          checked && !right && !picked && "border-border text-muted-foreground",
                        )}
                      >
                        <span lang="ja" className="font-jp">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {!checked ? (
              <Button
                onClick={() => setChecked(true)}
                disabled={Object.keys(answers).length < p.questions.length}
              >
                Check answers
              </Button>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {score === p.questions.length ? (
                    <><Check className="size-4 text-matsuba" /> <span className="text-matsuba">All correct</span></>
                  ) : (
                    <><X className="size-4 text-shu" /> <span className="text-foreground">
                      <span data-numeric>{score}</span> of {p.questions.length} correct
                    </span></>
                  )}
                </p>
                <Button variant="outline" size="sm" onClick={() => { setAnswers({}); setChecked(false); }}>
                  Try again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ReadingContent() {
  const [level, setLevel] = useState<Level>("N5");
  const [idx, setIdx] = useState(0);
  const { manifest } = useContent();
  const { data, loading, error } = useLevelContent(level, loadReading);

  useEffect(() => setIdx(0), [level]);

  const counts = useMemo(() => {
    if (!manifest) return undefined;
    return Object.fromEntries(
      Object.entries(manifest.levels).map(([k, v]) => [k, v.reading]),
    ) as Partial<Record<Level, number>>;
  }, [manifest]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reading{" "}
          <span lang="ja" className="font-jp text-base font-normal text-muted-foreground">
            読解
          </span>
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Graded passages with glossed vocabulary, a hideable translation, and
          comprehension questions. Read first, check second.
        </p>
      </header>

      <LevelFilter value={level} onChange={setLevel} counts={counts} />

      {error ? (
        <p className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : loading ? (
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <BookOpen className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No passages for {level} yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {data.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setIdx(i)}
                className={cn(
                  "min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors duration-(--dur-1)",
                  i === idx
                    ? "border-primary bg-primary-tint text-secondary-foreground"
                    : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span lang="ja" className="font-jp">{p.title}</span>
              </button>
            ))}
          </div>
          {data[idx] && <Passage p={data[idx]} />}
        </>
      )}
    </div>
  );
}
