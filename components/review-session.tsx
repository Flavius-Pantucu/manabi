"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Check, X, RotateCcw, ArrowRight, Volume2, Sparkles, Keyboard, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSrs } from "@/hooks/use-srs";
import { useLearning } from "@/lib/learning-context";
import { previewIntervals, GRADE, type Grade } from "@/lib/srs/scheduler";
import { toKana, answerMatches, isNearMiss } from "@/lib/srs/romaji";
import type { DeckId, ReviewItem } from "@/lib/srs/decks";
import type { QueueEntry } from "@/lib/srs/queue";
import { speak } from "@/lib/speech";

const TONE: Record<string, string> = {
  sakura: "text-sakura", ai: "text-ai", matsuba: "text-matsuba",
  shu: "text-shu", fuji: "text-fuji", kincha: "text-kincha",
};

/** Stable shuffle so options don't reorder while the learner is reading them. */
function shuffled<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Props {
  deck?: DeckId;
  limit?: number;
  title?: string;
}

export function ReviewSession({ deck, limit, title = "Review" }: Props) {
  const { buildQueue, grade } = useSrs();
  const { autoPlayAudio } = useLearning();

  // The queue is snapshotted once. Rebuilding it after every grade would make
  // cards jump around underneath the learner as their due times change.
  const [queue, setQueue] = useState<QueueEntry[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"correct" | "wrong" | "near" | null>(null);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [again, setAgain] = useState<QueueEntry[]>([]);
  const shownAt = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQueue(buildQueue({ deck, limit }));
    // Built once on mount by design — see note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entry = queue?.[index];
  const item = entry?.item;
  const finished = queue !== null && index >= queue.length;

  const intervals = useMemo(
    () => (entry ? previewIntervals(entry.card) : null),
    [entry],
  );

  useEffect(() => {
    shownAt.current = Date.now();
    setRevealed(false);
    setTyped("");
    setChoice(null);
    setOutcome(null);
    if (item && item.mode !== "choice") {
      // Focus the field so a keyboard user can just start typing.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    if (item?.speak && autoPlayAudio) speak(item.speak);
  }, [index, item, autoPlayAudio]);

  const options = useMemo(
    () => (item?.choices ? shuffled(item.choices, item.cardId) : []),
    [item],
  );

  const commit = useCallback(
    (g: Grade) => {
      if (!entry) return;
      grade(entry.item.cardId, g, Date.now() - shownAt.current);
      if (g === GRADE.AGAIN) {
        // Failed cards come back at the end of this session, not tomorrow.
        setAgain((a) => [...a, entry]);
      }
      setIndex((i) => i + 1);
    },
    [entry, grade],
  );

  // When the main queue runs out, fold the failed cards back in once.
  useEffect(() => {
    if (queue && index >= queue.length && again.length > 0) {
      setQueue((q) => (q ? [...q, ...again] : q));
      setAgain([]);
    }
  }, [index, queue, again]);

  const check = useCallback(() => {
    if (!item || revealed) return;
    const value = item.mode === "choice" ? (choice ?? "") : typed;
    if (!value.trim()) return;

    const ok = item.mode === "choice"
      ? value === item.answer
      : answerMatches(value, item.accepts);
    const near = !ok && item.mode !== "choice" && isNearMiss(value, item.accepts);

    setOutcome(ok ? "correct" : near ? "near" : "wrong");
    setRevealed(true);
    setTally((t) => ({
      correct: t.correct + (ok ? 1 : 0),
      wrong: t.wrong + (ok ? 0 : 1),
    }));
  }, [item, revealed, choice, typed]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || !item) return;
      if (!revealed) {
        if (e.key === "Enter") { e.preventDefault(); check(); }
        return;
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        commit(Number(e.key) as Grade);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        // Space takes the obvious grade: Good if you got it, Again if not.
        commit(outcome === "correct" ? GRADE.GOOD : GRADE.AGAIN);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, finished, item, check, commit, outcome]);

  // ── States ────────────────────────────────────────────────────────────────

  if (queue === null) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-tint">
            <Check className="size-7 text-primary" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Nothing due right now</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Everything scheduled for today is done. Come back when the next
              batch is due, or add new material from any study area.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild><Link href="/vocabulary">Study vocabulary</Link></Button>
            <Button asChild variant="outline"><Link href="/progress">See your progress</Link></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (finished) {
    const total = tally.correct + tally.wrong;
    const pct = total ? Math.round((tally.correct / total) * 100) : 0;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-tint">
            <Sparkles className="size-7 text-primary" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Session complete</h2>
            <p lang="ja" className="mt-1 font-jp text-sm text-muted-foreground">
              お疲れさま
            </p>
          </div>
          <div className="flex gap-8">
            <div>
              <p data-numeric className="text-3xl font-semibold text-matsuba">{tally.correct}</p>
              <p className="text-xs text-muted-foreground">correct</p>
            </div>
            <div>
              <p data-numeric className="text-3xl font-semibold text-shu">{tally.wrong}</p>
              <p className="text-xs text-muted-foreground">missed</p>
            </div>
            <div>
              <p data-numeric className="text-3xl font-semibold text-foreground">{pct}%</p>
              <p className="text-xs text-muted-foreground">accuracy</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => { setQueue(buildQueue({ deck, limit })); setIndex(0); setTally({ correct: 0, wrong: 0 }); }}>
              <RotateCcw className="size-4" /> Another round
            </Button>
            <Button asChild variant="outline"><Link href="/">Back to dashboard</Link></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!item || !entry) return null;

  const progress = (index / queue.length) * 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="h-2 flex-1" />
        <span data-numeric className="text-xs font-medium text-muted-foreground">
          {index + 1} / {queue.length}
        </span>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-6 px-5 py-8 sm:px-8">
          {/* Meta */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {item.instruction}
            </span>
            <span className="flex items-center gap-2">
              {entry.isNew && (
                <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                  New
                </span>
              )}
              {item.speak && (
                <button
                  onClick={() => speak(item.speak!)}
                  className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
                >
                  <Volume2 className="size-4" />
                  <span className="sr-only">Play pronunciation</span>
                </button>
              )}
            </span>
          </div>

          {/* Prompt */}
          <p
            lang={item.promptLang === "ja" ? "ja" : undefined}
            className={cn(
              "text-center font-semibold leading-tight text-foreground",
              item.promptLang === "ja"
                ? "font-jp text-5xl sm:text-6xl"
                : "text-2xl sm:text-3xl",
            )}
          >
            {item.prompt}
          </p>

          {/* Answer area */}
          {item.mode === "choice" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((opt) => {
                const isAnswer = opt === item.answer;
                const picked = choice === opt;
                return (
                  <button
                    key={opt}
                    disabled={revealed}
                    onClick={() => { setChoice(opt); }}
                    className={cn(
                      "min-h-12 rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors duration-(--dur-1)",
                      !revealed && picked && "border-primary bg-primary-tint text-secondary-foreground",
                      !revealed && !picked && "border-input hover:bg-accent hover:text-accent-foreground",
                      revealed && isAnswer && "border-matsuba bg-matsuba/12 text-matsuba",
                      revealed && picked && !isAnswer && "border-destructive bg-destructive/10 text-destructive",
                      revealed && !isAnswer && !picked && "border-border text-muted-foreground",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                ref={inputRef}
                value={typed}
                disabled={revealed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={item.mode === "reading" ? "type the reading — romaji becomes kana" : "type in romaji or kana"}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="h-14 w-full rounded-lg border border-input bg-card px-4 text-center text-2xl font-medium text-foreground outline-none transition-colors duration-(--dur-1) focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-70"
              />
              {/* Live kana preview: the learner sees what they are actually
                  submitting, which is the whole point of the romaji bridge. */}
              <p
                lang="ja"
                className="min-h-6 text-center font-jp text-lg text-muted-foreground"
                aria-live="polite"
              >
                {typed && !revealed ? toKana(typed) : ""}
              </p>
            </div>
          )}

          {/* Reveal */}
          {revealed && (
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-center",
                outcome === "correct" && "border-matsuba/40 bg-matsuba/10",
                outcome === "near" && "border-kincha/40 bg-kincha/10",
                outcome === "wrong" && "border-destructive/35 bg-destructive/10",
              )}
              role="status"
            >
              <p className="flex items-center justify-center gap-2 text-sm font-semibold">
                {outcome === "correct" ? (
                  <><Check className="size-4 text-matsuba" /> <span className="text-matsuba">Correct</span></>
                ) : outcome === "near" ? (
                  <><ArrowRight className="size-4 text-kincha" /> <span className="text-kincha">One character off</span></>
                ) : (
                  <><X className="size-4 text-destructive" /> <span className="text-destructive">Not quite</span></>
                )}
              </p>
              <p lang="ja" className="mt-1.5 font-jp text-2xl font-semibold text-foreground">
                {item.answer}
              </p>
              {item.answerReading && item.answerReading !== item.answer && (
                <p lang="ja" className="font-jp text-sm text-muted-foreground">
                  {item.answerReading}
                </p>
              )}
              {item.notes && (
                <p className="mt-1.5 text-xs text-muted-foreground">{item.notes}</p>
              )}
            </div>
          )}

          {/* Actions */}
          {!revealed ? (
            <div className="flex gap-2">
              <Button
                size="lg"
                className="flex-1"
                onClick={check}
                disabled={item.mode === "choice" ? !choice : !typed.trim()}
              >
                Check
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => { setRevealed(true); setOutcome("wrong"); setTally((t) => ({ ...t, wrong: t.wrong + 1 })); }}
              >
                <EyeOff className="size-4" /> Skip
              </Button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { g: GRADE.AGAIN, label: "Again", tone: "text-destructive border-destructive/40 hover:bg-destructive/10" },
                  { g: GRADE.HARD, label: "Hard", tone: "text-kincha border-kincha/40 hover:bg-kincha/10" },
                  { g: GRADE.GOOD, label: "Good", tone: "text-matsuba border-matsuba/40 hover:bg-matsuba/10" },
                  { g: GRADE.EASY, label: "Easy", tone: "text-ai border-ai/40 hover:bg-ai/10" },
                ] as const).map(({ g, label, tone }) => (
                  <button
                    key={g}
                    onClick={() => commit(g)}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg border bg-card text-sm font-semibold transition-colors duration-(--dur-1)",
                      tone,
                    )}
                  >
                    {label}
                    {/* Showing the resulting interval is how a learner
                        calibrates their own grading. */}
                    <span data-numeric className="text-[11px] font-normal text-muted-foreground">
                      {intervals?.[g]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Keyboard className="size-3" />
                1–4 to grade · Space for {outcome === "correct" ? "Good" : "Again"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session tally */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Check className="size-3.5 text-matsuba" />
          <span data-numeric>{tally.correct}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <X className="size-3.5 text-shu" />
          <span data-numeric>{tally.wrong}</span>
        </span>
        <Link href={item.href} className="hover:text-foreground hover:underline">
          Study this properly
        </Link>
      </div>
    </div>
  );
}
