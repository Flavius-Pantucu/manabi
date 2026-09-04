/**
 * Quiz generation.
 *
 * The old quiz was a hand-written file of 15 fixed questions — you could
 * memorise the answer positions in a week. These are generated from the loaded
 * content, so a quiz is different every time and scales with the corpus.
 *
 * Distractors are drawn from the same category and level as the answer, which
 * is what makes a question worth answering: picking "to eat" out of {to eat,
 * bridge, Tuesday, expensive} tests nothing.
 */

import type { GrammarPoint, Kanji, Level, Verb, Vocab } from "@/lib/content/types";

export type QuizKind =
  | "vocab-meaning"
  | "vocab-reading"
  | "kanji-meaning"
  | "kanji-reading"
  | "verb-form"
  | "grammar-meaning";

export interface QuizQuestion {
  id: string;
  kind: QuizKind;
  level: Level;
  prompt: string;
  promptLang: "ja" | "en";
  instruction: string;
  options: string[];
  answer: number;
  explanation?: string;
  speak?: string;
}

export interface QuizSource {
  vocab: Vocab[];
  kanji: Kanji[];
  verbs: Verb[];
  grammar: GrammarPoint[];
}

/** Mulberry32 — small, seeded, and good enough for shuffling a quiz. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample<T>(
  arr: T[],
  n: number,
  rand: () => number,
  exclude?: (t: T) => boolean,
): T[] {
  const pool = exclude ? arr.filter((x) => !exclude(x)) : [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
}

function shuffleWithAnswer(
  correct: string,
  distractors: string[],
  rand: () => number,
) {
  const opts = [correct, ...distractors];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { options: opts, answer: opts.indexOf(correct) };
}

const VERB_FORM_LABELS: Record<string, string> = {
  masu: "ます-form (polite)",
  te: "て-form",
  ta: "た-form (plain past)",
  nai: "ない-form (plain negative)",
  potential: "potential form",
  volitional: "volitional form",
  conditional_ba: "ば-conditional",
};

export function generateQuiz(
  src: QuizSource,
  {
    count = 12,
    kinds,
    seed = Date.now(),
  }: { count?: number; kinds?: QuizKind[]; seed?: number } = {},
): QuizQuestion[] {
  const rand = rng(seed);
  const available: QuizKind[] = [];
  if (src.vocab.length >= 4) available.push("vocab-meaning", "vocab-reading");
  if (src.kanji.length >= 4) available.push("kanji-meaning", "kanji-reading");
  if (src.verbs.length >= 4) available.push("verb-form");
  if (src.grammar.length >= 4) available.push("grammar-meaning");

  const pool = kinds?.length
    ? kinds.filter((k) => available.includes(k))
    : available;
  if (!pool.length) return [];

  const out: QuizQuestion[] = [];
  const used = new Set<string>();
  let guard = 0;

  while (out.length < count && guard++ < count * 25) {
    const kind = pool[Math.floor(rand() * pool.length)];
    const q = makeOne(kind, src, rand);
    if (!q || used.has(q.id)) continue;
    used.add(q.id);
    out.push(q);
  }
  return out;
}

function makeOne(
  kind: QuizKind,
  src: QuizSource,
  rand: () => number,
): QuizQuestion | null {
  switch (kind) {
    case "vocab-meaning": {
      const [w] = sample(src.vocab, 1, rand);
      if (!w) return null;
      const d = sample(src.vocab, 3, rand, (x) => x.meaning === w.meaning).map(
        (x) => x.meaning,
      );
      if (d.length < 3) return null;
      const { options, answer } = shuffleWithAnswer(w.meaning, d, rand);
      return {
        id: `q:${w.id}:meaning`,
        kind,
        level: w.level,
        prompt: w.word,
        promptLang: "ja",
        instruction: "What does this word mean?",
        options,
        answer,
        explanation: `${w.word}（${w.reading}）— ${w.meaning}`,
        speak: w.word,
      };
    }
    case "vocab-reading": {
      // Only worth asking when the written form actually contains kanji.
      const cands = src.vocab.filter(
        (v) => v.word !== v.reading && /[一-鿿]/.test(v.word),
      );
      const [w] = sample(cands, 1, rand);
      if (!w) return null;
      const d = sample(cands, 3, rand, (x) => x.reading === w.reading).map(
        (x) => x.reading,
      );
      if (d.length < 3) return null;
      const { options, answer } = shuffleWithAnswer(w.reading, d, rand);
      return {
        id: `q:${w.id}:reading`,
        kind,
        level: w.level,
        prompt: w.word,
        promptLang: "ja",
        instruction: "How is this read?",
        options,
        answer,
        explanation: `${w.word} is read ${w.reading} — ${w.meaning}`,
        speak: w.word,
      };
    }
    case "kanji-meaning": {
      const [k] = sample(src.kanji, 1, rand);
      if (!k?.meanings.length) return null;
      const correct = k.meanings[0];
      const d = sample(src.kanji, 3, rand, (x) => x.meanings[0] === correct)
        .map((x) => x.meanings[0])
        .filter(Boolean);
      if (d.length < 3) return null;
      const { options, answer } = shuffleWithAnswer(correct, d, rand);
      return {
        id: `q:${k.id}:meaning`,
        kind,
        level: k.level,
        prompt: k.character,
        promptLang: "ja",
        instruction: "What does this kanji mean?",
        options,
        answer,
        explanation: `${k.character} — ${k.meanings.slice(0, 3).join(", ")}`,
      };
    }
    case "kanji-reading": {
      const cands = src.kanji.filter((k) => k.examples.length > 0);
      const [k] = sample(cands, 1, rand);
      if (!k) return null;
      const ex = k.examples[0];
      const d = sample(
        cands,
        3,
        rand,
        (x) => x.examples[0]?.reading === ex.reading,
      ).map((x) => x.examples[0].reading);
      if (d.length < 3) return null;
      const { options, answer } = shuffleWithAnswer(ex.reading, d, rand);
      return {
        id: `q:${k.id}:reading`,
        kind,
        level: k.level,
        prompt: ex.word,
        promptLang: "ja",
        instruction: "How is this word read?",
        options,
        answer,
        explanation: `${ex.word}（${ex.reading}）— ${ex.meaning}`,
        speak: ex.word,
      };
    }
    case "verb-form": {
      const [v] = sample(src.verbs, 1, rand);
      if (!v) return null;
      const forms = Object.keys(VERB_FORM_LABELS).filter(
        (f) => v.conjugations[f],
      );
      if (!forms.length) return null;
      const form = forms[Math.floor(rand() * forms.length)];
      const correct = v.conjugations[form];
      // Distractors are the SAME form of other verbs, so the question tests the
      // conjugation rule rather than which verb is which.
      const d = sample(src.verbs, 3, rand, (x) => x.conjugations[form] === correct)
        .map((x) => x.conjugations[form])
        .filter(Boolean);
      if (d.length < 3) return null;
      const { options, answer } = shuffleWithAnswer(correct, d, rand);
      return {
        id: `q:${v.id}:${form}`,
        kind,
        level: v.level,
        prompt: v.dictionary,
        promptLang: "ja",
        instruction: `Which is the ${VERB_FORM_LABELS[form]}?`,
        options,
        answer,
        explanation: `${v.dictionary} (${v.group}, ${v.meaning}) → ${correct}`,
        speak: correct,
      };
    }
    case "grammar-meaning": {
      const [g] = sample(src.grammar, 1, rand);
      if (!g) return null;
      const d = sample(src.grammar, 3, rand, (x) => x.meaning === g.meaning).map(
        (x) => x.meaning,
      );
      if (d.length < 3) return null;
      const { options, answer } = shuffleWithAnswer(g.meaning, d, rand);
      return {
        id: `q:${g.id}:meaning`,
        kind,
        level: g.level,
        prompt: g.pattern,
        promptLang: "ja",
        instruction: "What does this pattern mean?",
        options,
        answer,
        explanation: `${g.formation}${g.examples[0] ? ` — e.g. ${g.examples[0].japanese}` : ""}`,
      };
    }
  }
}

export const KIND_LABELS: Record<QuizKind, string> = {
  "vocab-meaning": "Word meanings",
  "vocab-reading": "Word readings",
  "kanji-meaning": "Kanji meanings",
  "kanji-reading": "Kanji readings",
  "verb-form": "Verb conjugation",
  "grammar-meaning": "Grammar",
};
