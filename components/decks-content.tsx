"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Layers,
  LogIn,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useAuthPrompt } from "@/components/app-shell";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tone = "sakura" | "ai" | "matsuba" | "shu" | "fuji" | "kincha";

interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  tone: Tone;
  level: string | null;
  cards: number;
}

interface CustomCard {
  id: string;
  front: string;
  back: string;
  reading: string | null;
  notes: string | null;
  speak: string | null;
}

const TONES: { id: Tone; label: string; dot: string; badge: string }[] = [
  { id: "ai", label: "Indigo", dot: "bg-ai", badge: "bg-ai/12 text-ai" },
  { id: "matsuba", label: "Green", dot: "bg-matsuba", badge: "bg-matsuba/12 text-matsuba" },
  { id: "sakura", label: "Rose", dot: "bg-sakura", badge: "bg-sakura/12 text-sakura" },
  { id: "shu", label: "Coral", dot: "bg-shu", badge: "bg-shu/12 text-shu" },
  { id: "fuji", label: "Violet", dot: "bg-fuji", badge: "bg-fuji/12 text-fuji" },
  { id: "kincha", label: "Amber", dot: "bg-kincha", badge: "bg-kincha/12 text-kincha" },
];

const toneMeta = (t: Tone) => TONES.find((x) => x.id === t) ?? TONES[0];

export function DecksContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { openLogin, openRegister } = useAuthPrompt();

  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create deck form
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTone, setNewTone] = useState<Tone>("ai");
  const [submitting, setSubmitting] = useState(false);

  // Selected deck detail
  const [activeDeck, setActiveDeck] = useState<DeckSummary | null>(null);
  const [cards, setCards] = useState<CustomCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Add card form
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [reading, setReading] = useState("");
  const [notes, setNotes] = useState("");

  // Study mode
  const [studying, setStudying] = useState(false);
  const [studyOrder, setStudyOrder] = useState<CustomCard[]>([]);
  const [studyIdx, setStudyIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const loadDecks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/decks");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load decks.");
      setDecks(data.decks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load decks.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadDecks();
  }, [user, loadDecks]);

  const openDeck = async (deck: DeckSummary) => {
    setActiveDeck(deck);
    setStudying(false);
    setLoadingCards(true);
    try {
      const res = await fetch(`/api/decks/${deck.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load cards.");
      setCards(data.cards ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cards.");
    } finally {
      setLoadingCards(false);
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim() || null,
          tone: newTone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create deck.");
      setNewName("");
      setNewDesc("");
      setCreating(false);
      await loadDecks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create deck.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDeck = async (id: string) => {
    try {
      const res = await fetch(`/api/decks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete deck.");
      if (activeDeck?.id === id) setActiveDeck(null);
      setDecks((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete deck.");
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck || !front.trim() || !back.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/decks/${activeDeck.id}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: front.trim(),
          back: back.trim(),
          reading: reading.trim() || null,
          notes: notes.trim() || null,
          speak: front.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add card.");
      const added: CustomCard[] = data.cards ?? [];
      setCards((prev) => [...prev, ...added]);
      setDecks((prev) =>
        prev.map((d) =>
          d.id === activeDeck.id ? { ...d, cards: d.cards + added.length } : d,
        ),
      );
      setActiveDeck((d) => (d ? { ...d, cards: d.cards + added.length } : d));
      setFront("");
      setBack("");
      setReading("");
      setNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add card.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!activeDeck) return;
    try {
      const res = await fetch(`/api/decks/${activeDeck.id}/cards/${cardId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not delete card.");
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setDecks((prev) =>
        prev.map((d) =>
          d.id === activeDeck.id ? { ...d, cards: Math.max(0, d.cards - 1) } : d,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete card.");
    }
  };

  const startStudy = (shuffle = false) => {
    if (cards.length === 0) return;
    const list = [...cards];
    if (shuffle) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    setStudyOrder(list);
    setStudyIdx(0);
    setFlipped(false);
    setStudying(true);
  };

  if (authLoading) {
    return <div className="h-72 animate-pulse rounded-xl bg-muted" />;
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Custom Decks</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Build your own flashcard decks for class notes, travel words, or tricky phrases.
          </p>
        </header>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary-tint text-primary">
              <Layers className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Sign in to create custom decks</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Your personal decks and cards are saved to your account and synced across devices.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={openLogin}>
                <LogIn className="size-4" /> Log in
              </Button>
              <Button variant="outline" onClick={openRegister}>
                Sign up
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Study mode inside a deck ───────────────────────────────────────────────
  if (activeDeck && studying) {
    const card = studyOrder[studyIdx];
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStudying(false)}>
            <ArrowLeft className="size-4" /> Back to {activeDeck.name}
          </Button>
          <span data-numeric className="text-xs font-medium text-muted-foreground">
            {studyIdx + 1} / {studyOrder.length}
          </span>
        </div>

        {card && (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setFlipped((f) => !f)}
              className="w-full max-w-lg"
            >
              <Card className="min-h-60 justify-center transition-colors duration-(--dur-2) hover:border-primary">
                <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  {!flipped ? (
                    <>
                      <p
                        lang={language}
                        className={cn(
                          "text-3xl font-semibold text-foreground sm:text-4xl",
                          language === "ja" && "font-jp",
                        )}
                      >
                        {card.front}
                      </p>
                      <p className="text-xs text-muted-foreground">Tap to reveal</p>
                    </>
                  ) : (
                    <>
                      {card.reading && (
                        <p className="text-sm text-muted-foreground">{card.reading}</p>
                      )}
                      <p className="text-2xl font-semibold text-foreground">{card.back}</p>
                      {card.notes && (
                        <p className="max-w-sm text-xs text-muted-foreground">{card.notes}</p>
                      )}
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
                  setStudyIdx((i) => (i - 1 + studyOrder.length) % studyOrder.length);
                }}
                aria-label="Previous card"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <SpeakButton text={card.speak || card.front} />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFlipped((f) => !f)}
                aria-label="Flip card"
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setFlipped(false);
                  setStudyIdx((i) => (i + 1) % studyOrder.length);
                }}
                aria-label="Next card"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Deck detail view ───────────────────────────────────────────────────────
  if (activeDeck) {
    const t = toneMeta(activeDeck.tone);
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveDeck(null)}>
            <ArrowLeft className="size-4" /> All decks
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={cards.length === 0}
              onClick={() => startStudy(true)}
            >
              <Shuffle className="size-4" /> Shuffle
            </Button>
            <Button
              size="sm"
              disabled={cards.length === 0}
              onClick={() => startStudy(false)}
            >
              <Play className="size-4" /> Study ({cards.length})
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={cn("size-3 rounded-full", t.dot)} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{activeDeck.name}</h1>
            {activeDeck.description && (
              <p className="text-sm text-muted-foreground">{activeDeck.description}</p>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Add card form */}
        <Card>
          <CardContent className="py-5">
            <form onSubmit={handleAddCard} className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="card-front">Front (word or phrase)</Label>
                <Input
                  id="card-front"
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="e.g. Vorrei un caffè"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="card-back">Back (meaning)</Label>
                <Input
                  id="card-back"
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="e.g. I would like a coffee"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="card-reading">Pronunciation / Reading (optional)</Label>
                <Input
                  id="card-reading"
                  value={reading}
                  onChange={(e) => setReading(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="card-notes">Notes (optional)</Label>
                <Input
                  id="card-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Context or example"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={submitting}>
                  <Plus className="size-4" /> Add card
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {loadingCards ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : cards.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No cards in this deck yet. Add your first card above!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {cards.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {c.front}
                    {c.reading && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {c.reading}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{c.back}</p>
                </div>
                <SpeakButton text={c.speak || c.front} size="sm" />
                <button
                  onClick={() => handleDeleteCard(c.id)}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete card"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Decks list ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Custom Decks</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Create personal flashcard decks for your own vocabulary, phrases, and notes.
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus className="size-4" /> New deck
        </Button>
      </header>

      {error && (
        <p className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {creating && (
        <Card>
          <CardContent className="py-5">
            <form onSubmit={handleCreateDeck} className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="deck-name">Deck name</Label>
                  <Input
                    id="deck-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Rome Trip Essentials"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="deck-desc">Description (optional)</Label>
                  <Input
                    id="deck-desc"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="What's inside this deck"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Color:</span>
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewTone(t.id)}
                      aria-label={t.label}
                      className={cn(
                        "size-6 rounded-full transition-transform",
                        t.dot,
                        newTone === t.id && "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background",
                      )}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    Create deck
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Layers className="size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              You don&rsquo;t have any custom decks yet. Click &ldquo;New deck&rdquo; to create one!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {decks.map((d) => {
            const t = toneMeta(d.tone);
            return (
              <Card
                key={d.id}
                className="group transition-colors duration-(--dur-1) hover:border-primary"
              >
                <CardContent className="flex items-start justify-between gap-3 py-5">
                  <button
                    onClick={() => openDeck(d)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("size-2.5 rounded-full", t.dot)} />
                      <h2 className="truncate font-semibold text-foreground group-hover:text-primary">
                        {d.name}
                      </h2>
                    </div>
                    {d.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {d.description}
                      </p>
                    )}
                    <span
                      className={cn(
                        "mt-3 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium",
                        t.badge,
                      )}
                    >
                      {d.cards} {d.cards === 1 ? "card" : "cards"}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteDeck(d.id)}
                    aria-label={`Delete ${d.name}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
