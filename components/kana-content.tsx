"use client";

import { useState, useEffect, useMemo } from "react";
import { Volume2, Zap, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReviewSession } from "@/components/review-session";
import { useSrs } from "@/hooks/use-srs";
import { useVoiceStatus } from "@/hooks/use-voice-status";
import { speak, VOICE_HELP } from "@/lib/speech";
import {
  kana, KANA_ROWS, DAKUTEN_ROWS, YOON_ROWS, VOWEL_ORDER,
  type Kana, type KanaScript, type KanaGroup,
} from "@/lib/data/kana";

/** The gojūon grid is read consonant-row × vowel-column — build that shape. */
function grid(rows: readonly string[], group: KanaGroup) {
  return rows.map((row) => {
    const inRow = kana.filter((k) => k.row === row && k.group === group);
    if (group === "yoon") return { row, cells: inRow };
    // Order by vowel so columns line up, leaving gaps where kana don't exist
    // (や row has no yi/ye, わ row has no wi/wu/we).
    const cells = VOWEL_ORDER.map(
      (v) =>
        inRow.find((k) => k.romaji.endsWith(v) || k.romaji === v) ??
        (row === "n-final" && v === "a" ? inRow[0] : null),
    );
    return { row, cells };
  });
}

function KanaCell({
  k, script, learned, onPlay,
}: { k: Kana | null; script: KanaScript; learned: boolean; onPlay: (k: Kana) => void }) {
  const [open, setOpen] = useState(false);
  if (!k) return <div aria-hidden="true" />;
  const ch = script === "hiragana" ? k.hiragana : k.katakana;

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); onPlay(k); }}
        aria-expanded={open}
        className={cn(
          "flex aspect-square w-full flex-col items-center justify-center rounded-lg border transition-colors duration-(--dur-1)",
          learned
            ? "border-matsuba/40 bg-matsuba/8"
            : "border-border bg-card hover:border-primary hover:bg-accent",
        )}
      >
        <span lang="ja" className="font-jp text-2xl font-medium leading-none text-foreground sm:text-3xl">
          {ch}
        </span>
        <span className="mt-1 text-[10px] font-medium text-muted-foreground">
          {k.romaji}
        </span>
        {learned && (
          <Check className="absolute right-1 top-1 size-3 text-matsuba" aria-hidden="true" />
        )}
      </button>

      {open && k.mnemonic && (
        <div className="absolute left-1/2 top-full z-20 mt-1.5 w-52 -translate-x-1/2 rounded-lg border border-border bg-popover p-3 text-xs shadow-e3">
          <p className="font-semibold text-foreground">
            {k.hiragana} / {k.katakana} — {k.romaji}
          </p>
          <p className="mt-1 text-muted-foreground">{k.mnemonic}</p>
          {k.strokes && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {k.strokes} stroke{k.strokes === 1 ? "" : "s"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Chart({ script }: { script: KanaScript }) {
  const { state } = useSrs();
  const voice = useVoiceStatus();
  const prefix = script === "hiragana" ? "hi" : "ka";

  const isLearned = (k: Kana) => {
    const c = state.cards[`kana:${prefix}:${k.id}`];
    return !!c && c.phase === "review";
  };

  const sections: { title: string; jp: string; rows: readonly string[]; group: KanaGroup }[] = [
    { title: "Base syllables", jp: "五十音", rows: KANA_ROWS, group: "gojuon" },
    { title: "Voiced", jp: "濁音・半濁音", rows: DAKUTEN_ROWS, group: "dakuten" },
    { title: "Combinations", jp: "拗音", rows: YOON_ROWS, group: "yoon" },
  ];

  return (
    <div className="flex flex-col gap-7">
      {voice === "none" && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {VOICE_HELP.none}
        </p>
      )}

      {sections.map((s) => (
        <section key={s.title}>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {s.title}{" "}
            <span lang="ja" className="font-jp font-normal text-muted-foreground">
              {s.jp}
            </span>
          </h2>
          <div className="flex flex-col gap-1.5">
            {grid(s.rows, s.group).map(({ row, cells }) => (
              <div
                key={row}
                className={cn(
                  "grid gap-1.5",
                  s.group === "yoon" ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-5",
                )}
              >
                {cells.map((k, i) => (
                  <KanaCell
                    key={k?.id ?? `${row}-${i}`}
                    k={k}
                    script={script}
                    learned={k ? isLearned(k) : false}
                    onPlay={(kk) => speak(script === "hiragana" ? kk.hiragana : kk.katakana)}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function KanaContent() {
  const { stats } = useSrs();
  const [drilling, setDrilling] = useState<"kana-hiragana" | "kana-katakana" | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (drilling) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {drilling === "kana-hiragana" ? "Hiragana drill" : "Katakana drill"}
          </h1>
          <Button variant="ghost" size="sm" onClick={() => setDrilling(null)}>
            Back to chart
          </Button>
        </div>
        <ReviewSession deck={drilling} />
      </div>
    );
  }

  const hi = mounted ? stats("kana-hiragana") : null;
  const ka = mounted ? stats("kana-katakana") : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Kana{" "}
          <span lang="ja" className="font-jp text-base font-normal text-muted-foreground">
            かな
          </span>
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Everything in Japanese is built from these 104 syllables. Learn
          hiragana first — it writes native words and grammar. Katakana comes
          next, for loanwords and emphasis. Tap any character for its
          mnemonic and sound.
        </p>
      </header>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Button size="lg" onClick={() => setDrilling("kana-hiragana")} className="h-auto justify-start gap-3 py-3">
          <Zap className="size-4" />
          <span className="text-left">
            <span className="block">Drill hiragana</span>
            <span className="block text-xs font-normal opacity-85">
              {hi ? `${hi.total} ready` : "—"}
            </span>
          </span>
        </Button>
        <Button size="lg" variant="outline" onClick={() => setDrilling("kana-katakana")} className="h-auto justify-start gap-3 py-3">
          <Zap className="size-4" />
          <span className="text-left">
            <span className="block">Drill katakana</span>
            <span className="block text-xs font-normal text-muted-foreground">
              {ka ? `${ka.total} ready` : "—"}
            </span>
          </span>
        </Button>
      </div>

      <Tabs defaultValue="hiragana">
        <TabsList className="w-full">
          <TabsTrigger value="hiragana" className="flex-1">
            Hiragana <span lang="ja" className="ml-1.5 font-jp opacity-70">ひらがな</span>
          </TabsTrigger>
          <TabsTrigger value="katakana" className="flex-1">
            Katakana <span lang="ja" className="ml-1.5 font-jp opacity-70">カタカナ</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="hiragana" className="mt-5">
          <Chart script="hiragana" />
        </TabsContent>
        <TabsContent value="katakana" className="mt-5">
          <Chart script="katakana" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
