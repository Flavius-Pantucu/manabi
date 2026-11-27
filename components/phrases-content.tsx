"use client";

import { useMemo, useState } from "react";
import { Search, X, ChevronLeft, ChevronRight, RotateCcw, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { PHRASES, SCENARIOS, type PhraseScenario } from "@/lib/data/phrases";
import { SpeakButton } from "@/components/speak-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PhrasesContent() {
  const { language } = useLanguage();
  const [scenario, setScenario] = useState<PhraseScenario | "all">("all");
  const [q, setQ] = useState("");
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const list = PHRASES[language] ?? [];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter((p) => {
      if (scenario !== "all" && p.scenario !== scenario) return false;
      if (!s) return true;
      return (
        p.phrase.toLowerCase().includes(s) ||
        p.reading.toLowerCase().includes(s) ||
        p.meaning.toLowerCase().includes(s)
      );
    });
  }, [list, scenario, q]);

  const currentCard = filtered.length > 0 ? filtered[cardIdx % filtered.length] : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Phrasebook{" "}
          <span
            lang={language}
            className={cn(
              "text-base font-normal text-muted-foreground",
              language === "ja" && "font-jp",
            )}
          >
            {language === "es"
              ? "Frases"
              : language === "fr"
                ? "Expressions"
                : language === "it"
                  ? "Frasi"
                  : "会話表現"}
          </span>
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Practical real-world expressions grouped by situation — dining,
          transit, hotels, shopping, and emergencies.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setScenario("all"); setCardIdx(0); setFlipped(false); }}
          aria-pressed={scenario === "all"}
          className={cn(
            "min-h-8 rounded-full border px-3 text-xs font-medium transition-colors",
            scenario === "all"
              ? "border-primary bg-primary-tint text-secondary-foreground"
              : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          All ({list.length})
        </button>
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => { setScenario(sc.id); setCardIdx(0); setFlipped(false); }}
            aria-pressed={scenario === sc.id}
            className={cn(
              "min-h-8 rounded-full border px-3 text-xs font-medium transition-colors",
              scenario === sc.id
                ? "border-primary bg-primary-tint text-secondary-foreground"
                : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {sc.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); setCardIdx(0); }}
          placeholder="Search phrase or meaning…"
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

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List ({filtered.length})</TabsTrigger>
          <TabsTrigger value="cards">Flashcards</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <MessageSquareQuote className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No phrases match that filter.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      lang={language}
                      className={cn(
                        "text-base font-medium text-foreground",
                        language === "ja" && "font-jp",
                      )}
                    >
                      {p.phrase}
                    </p>
                    {p.reading && p.reading !== p.phrase && (
                      <p className="text-xs italic text-muted-foreground">{p.reading}</p>
                    )}
                    <p className="mt-0.5 text-sm text-muted-foreground">{p.meaning}</p>
                  </div>
                  <SpeakButton text={p.phrase} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          {!currentCard ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No phrases to practice.</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setFlipped((f) => !f)}
                className="w-full max-w-lg"
              >
                <Card className="min-h-56 justify-center transition-colors hover:border-primary">
                  <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                    {!flipped ? (
                      <>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {SCENARIOS.find((s) => s.id === currentCard.scenario)?.label}
                        </p>
                        <p
                          lang={language}
                          className={cn(
                            "text-2xl font-semibold text-foreground sm:text-3xl",
                            language === "ja" && "font-jp",
                          )}
                        >
                          {currentCard.phrase}
                        </p>
                        <p className="text-xs text-muted-foreground">Tap to flip</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm italic text-muted-foreground">{currentCard.reading}</p>
                        <p className="text-xl font-semibold text-foreground">{currentCard.meaning}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setFlipped(false);
                    setCardIdx((i) => (i - 1 + filtered.length) % filtered.length);
                  }}
                  aria-label="Previous"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <SpeakButton text={currentCard.phrase} />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFlipped((f) => !f)}
                  aria-label="Flip"
                >
                  <RotateCcw className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setFlipped(false);
                    setCardIdx((i) => (i + 1) % filtered.length);
                  }}
                  aria-label="Next"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <p data-numeric className="text-xs text-muted-foreground">
                {(cardIdx % filtered.length) + 1} / {filtered.length}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
