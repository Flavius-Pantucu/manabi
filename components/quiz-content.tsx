"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Check, X, RotateCcw, Volume2, Trophy, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LevelFilter } from "@/components/level-filter";
import { useLevelContent } from "@/hooks/use-level-content";
import { useLearning } from "@/lib/learning-context";
import { loadVocab, loadKanji, loadVerbs, loadGrammar } from "@/lib/content/loader";
import { generateQuiz, KIND_LABELS, type QuizKind, type QuizQuestion } from "@/lib/quiz/generate";
import { speak } from "@/lib/speech";
import { triggerSakura } from "@/lib/confetti";
import type { Level } from "@/lib/content/types";

const ALL_KINDS = Object.keys(KIND_LABELS) as QuizKind[];
const LENGTHS = [10, 20, 30];

export function QuizContent() {
  const [level, setLevel] = useState<Level>("N5");
  const [kinds, setKinds] = useState<QuizKind[]>(ALL_KINDS);
  const [length, setLength] = useState(10);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const { addQuizScore } = useLearning();

  const vocab = useLevelContent(level, loadVocab);
  const kanji = useLevelContent(level, loadKanji);
  const verbs = useLevelContent(level, loadVerbs);
  const grammar = useLevelContent(level, loadGrammar);
  const loading = vocab.loading || kanji.loading || verbs.loading || grammar.loading;

  const src = useMemo(
    () => ({ vocab: vocab.data, kanji: kanji.data, verbs: verbs.data, grammar: grammar.data }),
    [vocab.data, kanji.data, verbs.data, grammar.data],
  );

  const start = useCallback(() => {
    const qs = generateQuiz(src, { count: length, kinds, seed: Date.now() });
    setQuestions(qs); setI(0); setPicked(null); setScore(0);
  }, [src, length, kinds]);

  useEffect(() => { setQuestions(null); }, [level]);

  const q = questions?.[i];
  const done = questions !== null && i >= questions.length;

  useEffect(() => {
    if (!done || !questions?.length) return;
    const pct = Math.round((score / questions.length) * 100);
    addQuizScore(`gen-${level}-${Date.now()}`, `${level} quiz`, pct);
    if (pct >= 80) triggerSakura();
    // record once per completed quiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // ── setup ────────────────────────────────────────────────────────────────
  if (questions === null) {
    const total = src.vocab.length + src.kanji.length + src.verbs.length + src.grammar.length;
    return (
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Quiz{" "}
            <span lang="ja" className="font-jp text-base font-normal text-muted-foreground">
              クイズ
            </span>
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Questions are generated from the whole level, with distractors drawn
            from the same category — so the answer is never obvious by
            elimination, and no two quizzes are the same.
          </p>
        </header>

        <Card>
          <CardContent className="flex flex-col gap-5 py-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Level</p>
              <LevelFilter value={level} onChange={setLevel} />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Question types</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_KINDS.map((k) => {
                  const on = kinds.includes(k);
                  return (
                    <button
                      key={k}
                      aria-pressed={on}
                      onClick={() =>
                        setKinds((prev) =>
                          prev.includes(k)
                            ? prev.length > 1 ? prev.filter((x) => x !== k) : prev
                            : [...prev, k],
                        )
                      }
                      className={cn(
                        "min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors duration-(--dur-1)",
                        on
                          ? "border-primary bg-primary-tint text-secondary-foreground"
                          : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {KIND_LABELS[k]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Length</p>
              <div className="flex gap-1.5">
                {LENGTHS.map((n) => (
                  <button
                    key={n}
                    aria-pressed={length === n}
                    onClick={() => setLength(n)}
                    className={cn(
                      "min-h-9 rounded-lg border px-4 text-sm font-medium transition-colors duration-(--dur-1)",
                      length === n
                        ? "border-primary bg-primary-tint text-secondary-foreground"
                        : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <Button size="lg" onClick={start} disabled={loading || total < 8}>
              <Play className="size-4" />
              {loading ? "Loading content…" : `Start ${length}-question quiz`}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── results ──────────────────────────────────────────────────────────────
  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 py-14 text-center">
          <span className={cn(
            "flex size-14 items-center justify-center rounded-full",
            pct >= 80 ? "bg-matsuba/12 text-matsuba" : "bg-primary-tint text-primary",
          )}>
            {pct >= 80 ? <Trophy className="size-7" /> : <Sparkles className="size-7" />}
          </span>
          <div>
            <p data-numeric className="text-4xl font-semibold text-foreground">{pct}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              <span data-numeric>{score}</span> of {questions.length} correct · {level}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={start}><RotateCcw className="size-4" /> New quiz</Button>
            <Button variant="outline" onClick={() => setQuestions(null)}>Change settings</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!q) return null;
  const answered = picked !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Progress value={(i / questions.length) * 100} className="h-2 flex-1" />
        <span data-numeric className="text-xs font-medium text-muted-foreground">
          {i + 1} / {questions.length}
        </span>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6 px-5 py-8 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">{q.instruction}</span>
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {q.level}
              </span>
              {q.speak && (
                <button
                  onClick={() => speak(q.speak!)}
                  className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
                >
                  <Volume2 className="size-4" />
                  <span className="sr-only">Play pronunciation</span>
                </button>
              )}
            </span>
          </div>

          <p
            lang={q.promptLang === "ja" ? "ja" : undefined}
            className={cn(
              "text-center font-semibold leading-tight text-foreground",
              q.promptLang === "ja" ? "font-jp text-5xl sm:text-6xl" : "text-2xl",
            )}
          >
            {q.prompt}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((opt, oi) => {
              const right = oi === q.answer;
              const chosen = picked === oi;
              return (
                <button
                  key={oi}
                  disabled={answered}
                  onClick={() => {
                    setPicked(oi);
                    if (right) setScore((s) => s + 1);
                  }}
                  className={cn(
                    "min-h-12 rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors duration-(--dur-1)",
                    !answered && "border-input hover:bg-accent hover:text-accent-foreground",
                    answered && right && "border-matsuba bg-matsuba/12 text-matsuba",
                    answered && chosen && !right && "border-destructive bg-destructive/10 text-destructive",
                    answered && !right && !chosen && "border-border text-muted-foreground",
                  )}
                >
                  <span lang={/[぀-ヿ一-鿿]/.test(opt) ? "ja" : undefined}
                        className={/[぀-ヿ一-鿿]/.test(opt) ? "font-jp" : undefined}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {answered && (
            <div
              role="status"
              className={cn(
                "rounded-lg border px-4 py-3 text-center",
                picked === q.answer
                  ? "border-matsuba/40 bg-matsuba/10"
                  : "border-destructive/35 bg-destructive/10",
              )}
            >
              <p className="flex items-center justify-center gap-2 text-sm font-semibold">
                {picked === q.answer ? (
                  <><Check className="size-4 text-matsuba" /><span className="text-matsuba">Correct</span></>
                ) : (
                  <><X className="size-4 text-destructive" /><span className="text-destructive">Not quite</span></>
                )}
              </p>
              {q.explanation && (
                <p lang="ja" className="mt-1.5 font-jp text-sm text-foreground">{q.explanation}</p>
              )}
            </div>
          )}

          <Button
            size="lg"
            disabled={!answered}
            onClick={() => { setI((v) => v + 1); setPicked(null); }}
          >
            {i + 1 >= questions.length ? "See results" : "Next question"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
