"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Download, Upload, TriangleAlert, RotateCcw, Check, Settings2, Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ForecastChart, MaturityBar, ActivityChart } from "@/components/progress-charts";
import { VoiceSettings } from "@/components/voice-settings";
import { useSrs } from "@/hooks/use-srs";
import { useLearning } from "@/lib/learning-context";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { replaceSrsState } from "@/lib/store/features/srs-slice";
import { DECKS } from "@/lib/srs/decks";
import {
  buildBackup, downloadBackup, parseBackup, mergeBackup,
} from "@/lib/srs/backup";
import { LEVELS, LEVEL_BLURB, levelProgress, kanaProgress } from "@/lib/srs/curriculum";

function Stat({
  value, label, sub, tone = "text-foreground",
}: { value: string; label: string; sub?: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span data-numeric className={cn("text-3xl font-semibold leading-none tracking-tight", tone)}>
        {value}
      </span>
      <span className="text-xs font-medium text-foreground">{label}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function ProgressContent() {
  const dispatch = useAppDispatch();
  const srsState = useAppSelector((s) => s.srs);
  const { state, items, contentLoading, stats, forecast, maturity, retention, leeches, reset, updateSettings, toggleDeckEnabled, toggleLevelEnabled } = useSrs();
  const learning = useLearning();
  const learningState = useAppSelector((s) => s.learning);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const data = useMemo(() => {
    if (!mounted) return null;
    const ret = retention(30);
    const activity = (() => {
      const out: { date: string; reviews: number; correct: number }[] = [];
      const start = new Date(); start.setHours(0, 0, 0, 0);
      for (let i = 29; i >= 0; i--) {
        const d = new Date(start.getTime() - i * 86400000).toISOString().slice(0, 10);
        const rec = state.daily[d];
        out.push({ date: d, reviews: rec?.reviews ?? 0, correct: rec?.correct ?? 0 });
      }
      return out;
    })();
    return { ret, activity, fc: forecast(30), mat: maturity(), lee: leeches(4), all: stats(), levels: levelProgress(state, items), kana: kanaProgress(state, items) };
  }, [mounted, state, items, retention, forecast, maturity, leeches, stats]);

  function handleExport() {
    downloadBackup(buildBackup(state, learningState));
  }

  async function handleImport(file: File) {
    const text = await file.text();
    const res = parseBackup(text);
    if (!res.ok || !res.backup) {
      setImportMsg({ ok: false, text: res.error ?? "Couldn't read that file." });
      return;
    }
    const merged = mergeBackup(state, res.backup.srs);
    dispatch(replaceSrsState(merged));
    setImportMsg({
      ok: true,
      text: `Merged ${res.summary!.cards} cards and ${res.summary!.reviews} reviews from ${res.summary!.exportedAt.slice(0, 10)}.`,
    });
  }

  if (!mounted || !data || contentLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
  }

  const { ret, activity, fc, mat, lee, all, levels, kana } = data;
  const known = mat.young + mat.mature;
  const tomorrow = fc[1]?.count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Progress{" "}
          <span lang="ja" className="font-jp text-base font-normal text-muted-foreground">
            統計
          </span>
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          How much you&rsquo;re actually retaining, what&rsquo;s coming, and
          which cards keep slipping.
        </p>
      </header>

      {/* Headline figures. Retention is one number, so it is a figure, not a chart. */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-6 py-6 sm:grid-cols-4">
          <Stat
            value={ret.sample > 0 ? `${Math.round(ret.rate * 100)}%` : "—"}
            label="True retention"
            sub={ret.sample > 0 ? `${ret.sample} reviews, 30 days` : "no mature reviews yet"}
            tone={ret.sample === 0 ? "text-muted-foreground" : ret.rate >= 0.85 ? "text-matsuba" : ret.rate >= 0.75 ? "text-kincha" : "text-shu"}
          />
          <Stat value={String(known)} label="Cards known" sub={`of ${mat.total}`} />
          <Stat value={String(all.dueLearning + all.dueReview)} label="Due now" sub={`${tomorrow} tomorrow`} />
          <Stat value={String(learning.streak)} label="Day streak" sub="keep it alive" tone="text-shu" />
        </CardContent>
      </Card>

      {ret.sample > 0 && ret.rate < 0.8 && (
        <p className="flex items-start gap-2 rounded-lg border border-kincha/40 bg-kincha/10 px-3 py-2.5 text-sm text-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-kincha" />
          <span>
            Retention is under 80%. That usually means new cards are coming in
            faster than they&rsquo;re being consolidated — try lowering the
            daily new-card limit below for a couple of weeks.
          </span>
        </p>
      )}

      {/* Maturity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Collection{" "}
            <span lang="ja" className="font-jp text-xs font-normal text-muted-foreground">
              習熟度
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MaturityBar counts={mat} />
        </CardContent>
      </Card>

      {/* Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming up</CardTitle>
        </CardHeader>
        <CardContent>
          <ForecastChart data={fc} />
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityChart data={activity} />
        </CardContent>
      </Card>

      {/* Leeches */}
      {lee.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="size-4 text-shu" />
              Keeps slipping
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              These have lapsed four times or more. A card that keeps failing is
              usually a card that needs rewriting, not more repetitions.
            </p>
            <ul className="flex flex-col gap-1.5">
              {lee.slice(0, 8).map(({ item, card }) => (
                <li key={card.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <span lang="ja" className="font-jp text-lg font-medium text-foreground">
                    {item.prompt}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {item.answer}
                  </span>
                  <span data-numeric className="text-xs font-semibold text-shu">
                    {card.lapses}×
                  </span>
                  <button
                    onClick={() => reset(card.id)}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
                  >
                    Reset
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Path */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Your path{" "}
            <span lang="ja" className="font-jp text-xs font-normal text-muted-foreground">
              学習の道
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-foreground">
                Kana{" "}
                <span lang="ja" className="font-jp text-xs text-muted-foreground">
                  かな
                </span>
              </span>
              <span data-numeric className="text-xs text-muted-foreground">
                {kana.done}/{kana.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-seq-4 transition-[width] duration-(--dur-4) ease-(--ease-out-expo)"
                style={{ width: `${Math.round(kana.ratio * 100)}%` }}
              />
            </div>
          </div>

          {levels.filter((l) => l.total > 0).map((l) => (
            <div key={l.level} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-foreground">{l.level}</span>
                <span data-numeric className="text-xs text-muted-foreground">
                  {l.known}/{l.total} established
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-seq-3 transition-[width] duration-(--dur-4) ease-(--ease-out-expo)"
                  style={{ width: `${Math.round(l.ratio * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="size-4 text-muted-foreground" />
            Study settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="new-per-day" className="text-sm font-medium">
                New cards per day
              </Label>
              <span data-numeric className="text-sm font-semibold text-foreground">
                {state.settings.newPerDay}
              </span>
            </div>
            <Slider
              id="new-per-day"
              min={0} max={50} step={1}
              value={[state.settings.newPerDay]}
              onValueChange={([v]) => updateSettings({ newPerDay: v })}
            />
            <p className="text-xs text-muted-foreground">
              Each new card costs about eight reviews over the next month. Ten a
              day settles into roughly {state.settings.newPerDay * 8} reviews
              per day once the backlog matures.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="max-reviews" className="text-sm font-medium">
                Review limit per day
              </Label>
              <span data-numeric className="text-sm font-semibold text-foreground">
                {state.settings.maxReviewsPerDay}
              </span>
            </div>
            <Slider
              id="max-reviews"
              min={20} max={500} step={10}
              value={[state.settings.maxReviewsPerDay]}
              onValueChange={([v]) => updateSettings({ maxReviewsPerDay: v })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Levels to study</p>
            <p className="text-xs text-muted-foreground">
              Controls which levels can introduce <em>new</em> cards. Anything
              you have already started keeps coming up for review regardless.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {LEVELS.map((lv) => {
                const on = state.settings.levels.includes(lv);
                return (
                  <button
                    key={lv}
                    onClick={() => toggleLevelEnabled(lv)}
                    aria-pressed={on}
                    title={LEVEL_BLURB[lv]}
                    className={cn(
                      "min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors duration-(--dur-1)",
                      on
                        ? "border-primary bg-primary-tint text-secondary-foreground"
                        : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {lv}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Active decks</p>
            {DECKS.map((d) => {
              const on = !state.settings.disabledDecks.includes(d.id);
              return (
                <div key={d.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`deck-${d.id}`} className="cursor-pointer text-sm font-normal">
                    {d.label}{" "}
                    <span lang="ja" className="font-jp text-xs text-muted-foreground">
                      {d.labelJp}
                    </span>
                  </Label>
                  <Switch
                    id={`deck-${d.id}`}
                    checked={on}
                    onCheckedChange={() => toggleDeckEnabled(d.id)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <VoiceSettings />

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Progress is stored in this browser only. Clearing site data ends
            your streak permanently and a second device starts from zero —
            export a file to keep it, or to move to another machine.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport}>
              <Download className="size-4" /> Export progress
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
          </div>
          {importMsg && (
            <p
              role="status"
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                importMsg.ok
                  ? "border-matsuba/40 bg-matsuba/10 text-foreground"
                  : "border-destructive/35 bg-destructive/10 text-destructive",
              )}
            >
              {importMsg.ok ? <Check className="mt-0.5 size-4 shrink-0 text-matsuba" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
              {importMsg.text}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Importing merges rather than replaces — whichever version of each
            card was reviewed more recently wins, so you can&rsquo;t lose work
            done on this device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
