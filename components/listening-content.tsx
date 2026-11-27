"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Volume2,
  Turtle,
  Play,
  RotateCcw,
  Check,
  X,
  Trophy,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { LevelFilter } from "@/components/level-filter";
import { useLevelContent } from "@/hooks/use-level-content";
import { useContent } from "@/lib/content/provider";
import { useLanguage } from "@/lib/language-context";
import { loadVocab } from "@/lib/content/loader";
import { speak } from "@/lib/speech";
import { answerMatches } from "@/lib/srs/romaji";
import { triggerSakura } from "@/lib/confetti";
import type { Level, Vocab } from "@/lib/content/types";

type ListeningMode = "choice" | "dictation";

interface ListeningItem {
  vocab: Vocab;
  options: string[];
  answerIdx: number;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function ListeningContent() {
  const { language, formatLevel } = useLanguage();
  const { manifest } = useContent();
  const [level, setLevel] = useState<Level>("N5");
  const [mode, setMode] = useState<ListeningMode>("choice");
  const [length, setLength] = useState(10);

  const { data: vocab, loading, error } = useLevelContent(level, loadVocab);

  const [session, setSession] = useState<ListeningItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);

  const counts = useMemo(() => {
    if (!manifest) return undefined;
    return Object.fromEntries(
      Object.entries(manifest.levels).map(([k, v]) => [k, v.vocab]),
    ) as Partial<Record<Level, number>>;
  }, [manifest]);

  const startSession = useCallback(() => {
    if (vocab.length < 4) return;
    const pool = shuffle(vocab).slice(0, Math.min(length, vocab.length));
    const items: ListeningItem[] = pool.map((v) => {
      const distractors = shuffle(
        vocab.filter((x) => x.meaning !== v.meaning),
      )
        .slice(0, 3)
        .map((x) => x.meaning);
      const options = shuffle([v.meaning, ...distractors]);
      return {
        vocab: v,
        options,
        answerIdx: options.indexOf(v.meaning),
      };
    });
    setSession(items);
    setIdx(0);
    setPicked(null);
    setTyped("");
    setChecked(false);
    setIsCorrect(false);
    setScore(0);
  }, [vocab, length]);

  useEffect(() => {
    setSession(null);
  }, [level, language]);

  const current = session?.[idx];
  const done = session !== null && idx >= session.length;

  useEffect(() => {
    if (current && !done) {
      speak(current.vocab.word, { lang: language });
    }
  }, [current, done, language]);

  useEffect(() => {
    if (done && session && session.length > 0) {
      if (score / session.length >= 0.8) triggerSakura();
    }
  }, [done, session, score]);

  const playAudio = (rate = 1) => {
    if (!current) return;
    speak(current.vocab.word, { lang: language, rate });
  };

  const handlePick = (optionIdx: number) => {
    if (!current || checked) return;
    setPicked(optionIdx);
    const ok = optionIdx === current.answerIdx;
    setIsCorrect(ok);
    setChecked(true);
    if (ok) setScore((s) => s + 1);
  };

  const handleDictationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || checked || !typed.trim()) return;
    const accepts =
      language === "ja"
        ? [current.vocab.word, current.vocab.reading].filter(Boolean)
        : [current.vocab.word];
    const ok = answerMatches(typed, accepts, language === "ja");
    setIsCorrect(ok);
    setChecked(true);
    if (ok) setScore((s) => s + 1);
  };

  const next = () => {
    setIdx((i) => i + 1);
    setPicked(null);
    setTyped("");
    setChecked(false);
    setIsCorrect(false);
  };

  if (session === null) {
    return (
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Listening{" "}
            <span
              lang={language}
              className={cn(
                "text-base font-normal text-muted-foreground",
                language === "ja" && "font-jp",
              )}
            >
              {language === "es"
                ? "Escucha"
                : language === "fr"
                  ? "Écoute"
                  : language === "it"
                    ? "Ascolto"
                    : "聴解"}
            </span>
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Train your ear at normal or slow speed. Pick the meaning you hear or
            switch to dictation to type the exact word.
          </p>
        </header>

        <Card>
          <CardContent className="flex flex-col gap-5 py-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Level</p>
              <LevelFilter value={level} onChange={setLevel} counts={counts} />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Practice mode</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMode("choice")}
                  aria-pressed={mode === "choice"}
                  className={cn(
                    "min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors",
                    mode === "choice"
                      ? "border-primary bg-primary-tint text-secondary-foreground"
                      : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  Multiple choice (meaning)
                </button>
                <button
                  onClick={() => setMode("dictation")}
                  aria-pressed={mode === "dictation"}
                  className={cn(
                    "min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors",
                    mode === "dictation"
                      ? "border-primary bg-primary-tint text-secondary-foreground"
                      : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  Dictation (type what you hear)
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Length</p>
              <div className="flex gap-2">
                {[10, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => setLength(n)}
                    aria-pressed={length === n}
                    className={cn(
                      "min-h-9 rounded-lg border px-4 text-sm font-medium transition-colors",
                      length === n
                        ? "border-primary bg-primary-tint text-secondary-foreground"
                        : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {n} words
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <Button
                size="lg"
                onClick={startSession}
                disabled={loading || vocab.length < 4}
              >
                <Play className="size-4" />
                {loading
                  ? "Loading audio pool…"
                  : `Start ${formatLevel(level)} listening`}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / session.length) * 100);
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 py-14 text-center">
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-full",
              pct >= 80
                ? "bg-matsuba/12 text-matsuba"
                : "bg-primary-tint text-primary",
            )}
          >
            {pct >= 80 ? (
              <Trophy className="size-7" />
            ) : (
              <Headphones className="size-7" />
            )}
          </span>
          <div>
            <p data-numeric className="text-4xl font-semibold text-foreground">
              {pct}%
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {score} of {session.length} correct · {formatLevel(level)}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={startSession}>
              <RotateCcw className="size-4" /> Practice again
            </Button>
            <Button variant="outline" onClick={() => setSession(null)}>
              Change settings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!current) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Progress value={(idx / session.length) * 100} className="h-2 flex-1" />
        <span data-numeric className="text-xs font-medium text-muted-foreground">
          {idx + 1} / {session.length}
        </span>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-6 px-5 py-8 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {mode === "choice"
              ? "Listen and choose the meaning"
              : "Listen and type what you hear"}
          </p>

          <div className="flex items-center gap-3">
            <Button
              size="lg"
              className="h-14 gap-2 rounded-full px-7 text-base"
              onClick={() => playAudio(1)}
            >
              <Volume2 className="size-5" /> Play
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-14 gap-2 rounded-full px-5"
              onClick={() => playAudio(0.7)}
            >
              <Turtle className="size-4" /> Slow
            </Button>
          </div>

          {mode === "choice" ? (
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {current.options.map((opt, oi) => {
                const isAnswer = oi === current.answerIdx;
                const isPicked = picked === oi;
                return (
                  <button
                    key={opt}
                    disabled={checked}
                    onClick={() => handlePick(oi)}
                    className={cn(
                      "min-h-12 rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                      !checked &&
                        "border-input hover:bg-accent hover:text-accent-foreground",
                      checked &&
                        isAnswer &&
                        "border-matsuba bg-matsuba/12 text-matsuba",
                      checked &&
                        isPicked &&
                        !isAnswer &&
                        "border-destructive bg-destructive/10 text-destructive",
                      checked &&
                        !isAnswer &&
                        !isPicked &&
                        "border-border text-muted-foreground",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <form
              onSubmit={handleDictationSubmit}
              className="flex w-full max-w-md flex-col gap-3"
            >
              <Input
                value={typed}
                disabled={checked}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={
                  language === "ja"
                    ? "Type in romaji or kana…"
                    : "Type what you heard…"
                }
                className="h-12 text-center text-lg"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {!checked && (
                <Button type="submit" disabled={!typed.trim()}>
                  Check
                </Button>
              )}
            </form>
          )}

          {checked && (
            <div
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-center",
                isCorrect
                  ? "border-matsuba/40 bg-matsuba/10"
                  : "border-destructive/35 bg-destructive/10",
              )}
            >
              <p className="flex items-center justify-center gap-2 text-sm font-semibold">
                {isCorrect ? (
                  <>
                    <Check className="size-4 text-matsuba" />
                    <span className="text-matsuba">Correct</span>
                  </>
                ) : (
                  <>
                    <X className="size-4 text-destructive" />
                    <span className="text-destructive">Not quite</span>
                  </>
                )}
              </p>
              <p
                lang={language}
                className={cn(
                  "mt-1 text-xl font-semibold text-foreground",
                  language === "ja" && "font-jp",
                )}
              >
                {current.vocab.word}
              </p>
              {current.vocab.reading &&
                current.vocab.reading !== current.vocab.word && (
                  <p className="text-xs text-muted-foreground">
                    {current.vocab.reading}
                  </p>
                )}
              <p className="mt-0.5 text-sm text-muted-foreground">
                {current.vocab.meaning}
              </p>
              <Button className="mt-3" onClick={next}>
                {idx + 1 >= session.length ? "Finish" : "Next word"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
