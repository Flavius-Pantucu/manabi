"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, ArrowRight, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useSrs } from "@/hooks/use-srs";
import { nextStep, kanaProgress } from "@/lib/srs/curriculum";

/**
 * The daily call to action.
 *
 * A dashboard full of counters does not tell a learner what to do next. This
 * answers exactly one question — study what, right now — and routes a complete
 * beginner to kana rather than dropping them into N5 kanji.
 */
export function SrsPanel() {
  const { state, items, contentLoading, stats } = useSrs();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || contentLoading) {
    return <div className="h-28 animate-pulse rounded-xl bg-muted" />;
  }

  const s = stats();
  const step = nextStep(state, items);
  const kana = kanaProgress(state, items);
  const due = s.dueLearning + s.dueReview;
  const nothingStarted = Object.keys(state.cards).length === 0;

  // First run: name the first move rather than showing four zeroes.
  if (nothingStarted) {
    return (
      <Card className="border-primary/30 bg-primary-tint">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">
                Start with hiragana
              </p>
              <p className="mt-0.5 max-w-md text-sm text-secondary-foreground">
                Japanese is written in 104 syllables. Learn those first and
                everything after it becomes readable.
              </p>
            </div>
          </div>
          <Link
            href="/kana"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-e1 transition-colors duration-(--dur-1) hover:bg-primary-hover"
          >
            Begin <ArrowRight className="size-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  const allClear = s.total === 0;

  return (
    <Card className={cn(!allClear && "border-primary/30")}>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg",
              allClear ? "bg-matsuba/12 text-matsuba" : "bg-primary text-primary-foreground",
            )}
          >
            {allClear ? <Check className="size-5" /> : <Zap className="size-5" />}
          </span>

          <div className="min-w-0">
            {allClear ? (
              <>
                <p className="text-base font-semibold text-foreground">
                  All caught up
                </p>
                <p className="text-sm text-muted-foreground">
                  {step.detail}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-foreground">
                  <span data-numeric>{s.total}</span> card
                  {s.total === 1 ? "" : "s"} ready
                </p>
                <p className="text-sm text-muted-foreground">
                  <span data-numeric>{due}</span> due
                  {s.newRemaining > 0 && (
                    <> · <span data-numeric>{s.newRemaining}</span> new</>
                  )}
                  {kana.ratio < 0.5 && <> · kana still in progress</>}
                </p>
              </>
            )}
          </div>
        </div>

        <Link
          href={allClear ? step.href : "/review"}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors duration-(--dur-1)",
            allClear
              ? "border border-input text-foreground hover:bg-accent hover:text-accent-foreground"
              : "bg-primary text-primary-foreground shadow-e1 hover:bg-primary-hover",
          )}
        >
          {allClear ? step.label : "Start review"}
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
