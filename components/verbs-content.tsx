"use client";

import { useState, useMemo, useDeferredValue, useEffect } from "react";
import { Search, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeakButton } from "@/components/speak-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LevelFilter } from "@/components/level-filter";
import { ReviewSession } from "@/components/review-session";
import { useLevelContent } from "@/hooks/use-level-content";
import { useContent } from "@/lib/content/provider";
import { loadVerbs } from "@/lib/content/loader";
import type { Level, Verb } from "@/lib/content/types";

const GROUP_TONE: Record<string, string> = {
  "Group 1": "bg-ai/12 text-ai",
  "Group 2": "bg-matsuba/12 text-matsuba",
  "Group 3": "bg-shu/12 text-shu",
};

const FORMS: { key: string; label: string; jp: string }[] = [
  { key: "masu", label: "Polite", jp: "ます形" },
  { key: "te", label: "Te-form", jp: "て形" },
  { key: "ta", label: "Past plain", jp: "た形" },
  { key: "nai", label: "Negative", jp: "ない形" },
  { key: "nakatta", label: "Past negative", jp: "なかった" },
  { key: "potential", label: "Potential", jp: "可能" },
  { key: "volitional", label: "Volitional", jp: "意向" },
  { key: "passive", label: "Passive", jp: "受身" },
  { key: "causative", label: "Causative", jp: "使役" },
  { key: "conditional_ba", label: "Conditional ば", jp: "仮定" },
  { key: "conditional_tara", label: "Conditional たら", jp: "たら" },
  { key: "imperative", label: "Imperative", jp: "命令" },
];

function Conjugations({ v }: { v: Verb }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p lang="ja" className="font-jp text-3xl font-semibold text-foreground">
              {v.dictionary}
            </p>
            <p lang="ja" className="font-jp text-sm text-muted-foreground">{v.reading}</p>
            <p className="mt-1 text-sm text-foreground">{v.meaning}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn("rounded-md px-2 py-1 text-xs font-medium", GROUP_TONE[v.group])}>
              {v.group}
            </span>
            <SpeakButton text={v.dictionary} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {FORMS.map((f) => {
                const val = v.conjugations[f.key];
                if (!val) return null;
                return (
                  <tr key={f.key} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-muted-foreground">
                      {f.label}{" "}
                      <span lang="ja" className="font-jp text-xs opacity-70">{f.jp}</span>
                    </th>
                    <td lang="ja" className="py-2 font-jp text-base font-medium text-foreground">
                      {val}
                    </td>
                    <td className="w-9 py-2">
                      <SpeakButton text={val} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

const PAGE = 60;

export function VerbsContent() {
  const [level, setLevel] = useState<Level>("N5");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Verb | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [drilling, setDrilling] = useState(false);
  const { manifest } = useContent();
  const { data, loading, error } = useLevelContent(level, loadVerbs);
  const deferred = useDeferredValue(q);

  useEffect(() => { setSelected(null); setShown(PAGE); }, [level, deferred]);
  useEffect(() => { if (!selected && data.length) setSelected(data[0]); }, [data, selected]);

  const filtered = useMemo(() => {
    const s = deferred.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (v) => v.dictionary.includes(s) || v.reading.includes(s) || v.meaning.toLowerCase().includes(s),
    );
  }, [data, deferred]);

  const counts = useMemo(() => {
    if (!manifest) return undefined;
    return Object.fromEntries(
      Object.entries(manifest.levels).map(([k, v]) => [k, v.verbs]),
    ) as Partial<Record<Level, number>>;
  }, [manifest]);

  if (drilling) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Conjugation drill</h1>
          <Button variant="ghost" size="sm" onClick={() => setDrilling(false)}>
            Back to list
          </Button>
        </div>
        <ReviewSession deck="verbs" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Verbs{" "}
          <span lang="ja" className="font-jp text-base font-normal text-muted-foreground">
            動詞
          </span>
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          1,218 verbs in twelve forms each. Conjugations are generated from the
          godan and ichidan rules, so they are consistent — the drill asks you
          to produce them, not just recognise them.
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
              placeholder="Search verb or meaning…"
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
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <div className="flex flex-col gap-1.5">
            {filtered.slice(0, shown).map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors duration-(--dur-1)",
                  selected?.id === v.id
                    ? "border-primary bg-primary-tint"
                    : "border-border bg-card hover:border-primary hover:bg-accent",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span lang="ja" className="block font-jp text-base font-medium text-foreground">
                    {v.dictionary}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{v.meaning}</span>
                </span>
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", GROUP_TONE[v.group])}>
                  {v.group.replace("Group ", "G")}
                </span>
              </button>
            ))}
            {shown < filtered.length && (
              <Button variant="outline" onClick={() => setShown((s) => s + PAGE * 2)} className="mt-2">
                Show more ({filtered.length - shown} left)
              </Button>
            )}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No verbs match.</p>
            )}
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            {selected ? (
              <Conjugations v={selected} />
            ) : (
              <Card>
                <CardContent className="py-14 text-center text-sm text-muted-foreground">
                  Select a verb to see every form.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
