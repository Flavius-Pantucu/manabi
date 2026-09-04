"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Layers, Zap, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewSession } from "@/components/review-session";
import { useSrs } from "@/hooks/use-srs";
import { DECKS, type DeckId } from "@/lib/srs/decks";

const TONE_BG: Record<string, string> = {
  sakura: "bg-sakura/12 text-sakura", ai: "bg-ai/12 text-ai",
  matsuba: "bg-matsuba/12 text-matsuba", shu: "bg-shu/12 text-shu",
  fuji: "bg-fuji/12 text-fuji", kincha: "bg-kincha/12 text-kincha",
};

export function ReviewContent() {
  const { stats } = useSrs();
  const [started, setStarted] = useState(false);
  const [deck, setDeck] = useState<DeckId | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (started) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {deck ? DECKS.find((d) => d.id === deck)?.label : "All decks"}
          </h1>
          <Button variant="ghost" size="sm" onClick={() => setStarted(false)}>
            End session
          </Button>
        </div>
        <ReviewSession deck={deck} />
      </div>
    );
  }

  const all = mounted ? stats() : { dueLearning: 0, dueReview: 0, newRemaining: 0, newAvailable: 0, total: 0 };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Review{" "}
          <span lang="ja" className="font-jp text-base font-normal text-muted-foreground">
            復習
          </span>
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Cards are scheduled by how close you are to forgetting them, not by
          how recently you added them. Reviewing when a card is nearly lost is
          what makes it stick.
        </p>
      </header>

      {/* Today */}
      <Card>
        <CardContent className="flex flex-col gap-5 py-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <Clock className="size-4 text-kincha" />
              <span data-numeric className="text-2xl font-semibold text-foreground">
                {all.dueLearning}
              </span>
              <span className="text-xs text-muted-foreground">learning</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <Layers className="size-4 text-ai" />
              <span data-numeric className="text-2xl font-semibold text-foreground">
                {all.dueReview}
              </span>
              <span className="text-xs text-muted-foreground">due</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <Plus className="size-4 text-matsuba" />
              <span data-numeric className="text-2xl font-semibold text-foreground">
                {all.newRemaining}
              </span>
              <span className="text-xs text-muted-foreground">new today</span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={all.total === 0}
            onClick={() => { setDeck(undefined); setStarted(true); }}
          >
            <Zap className="size-4" />
            {all.total > 0 ? `Study ${all.total} card${all.total === 1 ? "" : "s"}` : "Nothing due"}
          </Button>

          {all.total === 0 && all.newAvailable > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              You&rsquo;ve hit today&rsquo;s new-card limit. Raise it in{" "}
              <Link href="/progress" className="underline">study settings</Link>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Per deck */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">By deck</h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {DECKS.map((d) => {
            const s = mounted ? stats(d.id) : { total: 0, dueLearning: 0, dueReview: 0, newRemaining: 0, newAvailable: 0 };
            return (
              <button
                key={d.id}
                onClick={() => { setDeck(d.id); setStarted(true); }}
                disabled={s.total === 0}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors duration-(--dur-1)",
                  s.total > 0 ? "hover:border-primary hover:bg-accent" : "opacity-55",
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg font-jp text-sm font-bold", TONE_BG[d.tone])}>
                  {d.labelJp.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{d.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.total > 0
                      ? `${s.dueLearning + s.dueReview} due · ${s.newRemaining} new`
                      : s.newAvailable > 0 ? "Daily limit reached" : "All caught up"}
                  </span>
                </span>
                <span data-numeric className="text-lg font-semibold text-foreground">
                  {s.total || ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
