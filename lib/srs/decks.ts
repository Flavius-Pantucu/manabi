/**
 * The deck registry — the bridge between content and the scheduler.
 *
 * Every reviewable thing resolves to a `ReviewItem` with the same shape, so one
 * review screen can drill kana, vocabulary, kanji, verb conjugation and grammar
 * without knowing anything about those types.
 *
 * Card ids are derived from content, never from array position: a numeric row
 * id changes the moment a dataset is reordered, which would silently reassign a
 * learner's scheduling state to the wrong word. Keying on the word itself
 * survives edits, reordering, and export/import.
 *
 * Kana is the one deck still bundled — it is 104 entries, it is the entry point
 * for a beginner, and it must be there before any network request resolves.
 */

import { kana, glyph, CONFUSABLE, type Kana } from "@/lib/data/kana";
import type {
  GrammarPoint, Kanji, Level, LevelContent, Verb, Vocab,
} from "@/lib/content/types";

export type DeckId =
  | "kana-hiragana" | "kana-katakana"
  | "vocab" | "kanji" | "verbs" | "grammar";

export type ReviewMode = "choice" | "recall" | "reading" | "meaning";

export interface ReviewItem {
  cardId: string;
  deck: DeckId;
  mode: ReviewMode;
  level?: Level;
  prompt: string;
  promptLang: "ja" | "en";
  instruction: string;
  answer: string;
  answerReading?: string;
  notes?: string;
  accepts: string[];
  choices?: string[];
  speak?: string;
  href: string;
}

export interface DeckMeta {
  id: DeckId;
  label: string;
  labelJp: string;
  tone: "sakura" | "ai" | "matsuba" | "shu" | "fuji" | "kincha";
  href: string;
}

export const DECKS: DeckMeta[] = [
  { id: "kana-hiragana", label: "Hiragana", labelJp: "ひらがな", tone: "shu", href: "/kana" },
  { id: "kana-katakana", label: "Katakana", labelJp: "カタカナ", tone: "kincha", href: "/kana" },
  { id: "vocab", label: "Vocabulary", labelJp: "語彙", tone: "sakura", href: "/vocabulary" },
  { id: "kanji", label: "Kanji", labelJp: "漢字", tone: "fuji", href: "/kanji" },
  { id: "verbs", label: "Verbs", labelJp: "動詞", tone: "matsuba", href: "/verbs" },
  { id: "grammar", label: "Grammar", labelJp: "文法", tone: "ai", href: "/grammar" },
];

// ── distractors ─────────────────────────────────────────────────────────────

/**
 * Deterministic per-card, so options don't churn between renders, but spread
 * across the pool so a card doesn't always draw the same three neighbours.
 */
function pickDistractors(pool: string[], exclude: string, seed: string, n: number): string[] {
  if (pool.length <= 1) return [];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const out: string[] = [];
  const seen = new Set([exclude]);
  for (let i = 0; out.length < n && i < pool.length * 3; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const c = pool[h % pool.length];
    if (c && !seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
}

// ── Kana (bundled) ──────────────────────────────────────────────────────────

function kanaItems(script: "hiragana" | "katakana"): ReviewItem[] {
  const deck: DeckId = script === "hiragana" ? "kana-hiragana" : "kana-katakana";
  const prefix = script === "hiragana" ? "hi" : "ka";

  return kana.map((k: Kana) => {
    const ch = glyph(k, script);
    // Distractors are the confusable look-alikes where one exists: drilling
    // し against つ is the point; drilling it against ぽ teaches nothing.
    const confusables = (CONFUSABLE[k.id] ?? [])
      .map((id) => kana.find((x) => x.id === id)?.romaji)
      .filter((r): r is string => !!r);
    const filler = pickDistractors(
      kana.filter((x) => x.group === k.group).map((x) => x.romaji),
      k.romaji, k.id, 3,
    );
    const choices = [k.romaji, ...confusables, ...filler]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 4);

    return {
      cardId: `kana:${prefix}:${k.id}`,
      deck,
      mode: "choice" as ReviewMode,
      prompt: ch,
      promptLang: "ja" as const,
      instruction: script === "hiragana" ? "Hiragana — read it" : "Katakana — read it",
      answer: k.romaji,
      notes: k.mnemonic,
      accepts: [k.romaji, ch],
      choices,
      speak: ch,
      href: "/kana",
    };
  });
}

let _kanaItems: ReviewItem[] | null = null;
export function kanaDeckItems(): ReviewItem[] {
  if (!_kanaItems) _kanaItems = [...kanaItems("hiragana"), ...kanaItems("katakana")];
  return _kanaItems;
}

// ── Loaded content → cards ──────────────────────────────────────────────────

function vocabItems(rows: Vocab[], meanings: string[]): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (const w of rows) {
    // Recognition: see the word, know what it means.
    out.push({
      cardId: `${w.id}:meaning`,
      deck: "vocab", mode: "choice", level: w.level,
      prompt: w.word, promptLang: "ja",
      instruction: "What does this mean?",
      answer: w.meaning, answerReading: w.reading,
      notes: w.altMeanings?.length ? `also: ${w.altMeanings.join(", ")}` : undefined,
      accepts: [w.meaning, ...(w.altMeanings ?? [])],
      choices: [w.meaning, ...pickDistractors(meanings, w.meaning, w.id, 3)],
      speak: w.word, href: "/vocabulary",
    });
    // Recall: see the meaning, produce the word. The direction that matters
    // for speaking, and the one recognition-only study never trains.
    out.push({
      cardId: `${w.id}:recall`,
      deck: "vocab", mode: "recall", level: w.level,
      prompt: w.meaning, promptLang: "en",
      instruction: "Type it in Japanese",
      answer: w.word, answerReading: w.reading,
      accepts: [w.reading, w.word].filter(Boolean),
      speak: w.word, href: "/vocabulary",
    });
  }
  return out;
}

function kanjiItems(rows: Kanji[], meanings: string[]): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (const k of rows) {
    const primary = k.meanings[0] ?? k.character;
    out.push({
      cardId: `${k.id}:meaning`,
      deck: "kanji", mode: "choice", level: k.level,
      prompt: k.character, promptLang: "ja",
      instruction: "What does this kanji mean?",
      answer: primary,
      notes: [k.onyomi.length ? `音 ${k.onyomi.join("・")}` : "",
              k.kunyomi.length ? `訓 ${k.kunyomi.join("・")}` : ""].filter(Boolean).join(" · "),
      accepts: k.meanings,
      choices: [primary, ...pickDistractors(meanings, primary, k.id, 3)],
      href: "/kanji",
    });
    // Readings are drilled through a real word, because that is how a reading
    // is actually selected — 生 has a dozen and none are learnable alone.
    const ex = k.examples[0];
    if (ex) {
      out.push({
        cardId: `${k.id}:reading`,
        deck: "kanji", mode: "reading", level: k.level,
        prompt: ex.word, promptLang: "ja",
        instruction: "Type the reading in kana",
        answer: ex.reading, answerReading: ex.reading,
        notes: ex.meaning,
        accepts: [ex.reading],
        speak: ex.word, href: "/kanji",
      });
    }
  }
  return out;
}

/** Forms worth drilling as production, with how to name each. */
export const VERB_FORMS = [
  { key: "masu", label: "ます-form (polite)" },
  { key: "te", label: "て-form" },
  { key: "ta", label: "た-form (past plain)" },
  { key: "nai", label: "ない-form (negative plain)" },
  { key: "potential", label: "potential (can do)" },
  { key: "volitional", label: "volitional (let's)" },
  { key: "conditional_ba", label: "ば-conditional" },
] as const;

function verbItems(rows: Verb[], meanings: string[]): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (const v of rows) {
    out.push({
      cardId: `${v.id}:meaning`,
      deck: "verbs", mode: "choice", level: v.level,
      prompt: v.dictionary, promptLang: "ja",
      instruction: "What does this verb mean?",
      answer: v.meaning, answerReading: v.reading, notes: v.group,
      accepts: [v.meaning],
      choices: [v.meaning, ...pickDistractors(meanings, v.meaning, v.id, 3)],
      speak: v.dictionary, href: "/verbs",
    });
    for (const f of VERB_FORMS) {
      const target = v.conjugations[f.key];
      if (!target) continue;
      out.push({
        cardId: `${v.id}:${f.key}`,
        deck: "verbs", mode: "recall", level: v.level,
        prompt: v.dictionary, promptLang: "ja",
        instruction: `Conjugate to the ${f.label}`,
        answer: target, notes: `${v.meaning} · ${v.group}`,
        accepts: [target], speak: target, href: "/verbs",
      });
    }
  }
  return out;
}

function grammarItems(rows: GrammarPoint[], meanings: string[]): ReviewItem[] {
  return rows.map((g) => ({
    cardId: `${g.id}:meaning`,
    deck: "grammar" as DeckId, mode: "choice" as ReviewMode, level: g.level,
    prompt: g.pattern, promptLang: "ja" as const,
    instruction: "What does this pattern do?",
    answer: g.meaning, notes: g.formation,
    accepts: [g.meaning],
    choices: [g.meaning, ...pickDistractors(meanings, g.meaning, g.id, 3)],
    href: "/grammar",
  }));
}

/**
 * Build every card for the loaded levels. Distractor pools are drawn from the
 * whole loaded set so options stay plausible rather than absurd.
 */
export function buildItems(levels: LevelContent[]): ReviewItem[] {
  const vocab = levels.flatMap((l) => l.vocab);
  const kanji = levels.flatMap((l) => l.kanji);
  const verbs = levels.flatMap((l) => l.verbs);
  const grammar = levels.flatMap((l) => l.grammar);

  return [
    ...kanaDeckItems(),
    ...vocabItems(vocab, vocab.map((v) => v.meaning)),
    ...kanjiItems(kanji, kanji.map((k) => k.meanings[0] ?? k.character)),
    ...verbItems(verbs, verbs.map((v) => v.meaning)),
    ...grammarItems(grammar, grammar.map((g) => g.meaning)),
  ];
}

export function indexItems(items: ReviewItem[]): Map<string, ReviewItem> {
  return new Map(items.map((i) => [i.cardId, i]));
}
