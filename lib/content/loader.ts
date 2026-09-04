/**
 * On-demand content loading.
 *
 * The full dataset is ~4 MB across five JLPT levels — 8,034 words, 2,211 kanji
 * with stroke paths, 1,218 conjugated verbs. Bundling that would put the whole
 * corpus in the JS payload of every page, so it lives in `public/data/` and is
 * fetched per level, per kind, only when something actually needs it.
 *
 * A learner starting at N5 downloads about 190 KB rather than 4 MB.
 */

import type {
  ContentManifest, GrammarPoint, Kanji, Level, LevelContent, ReadingPassage,
  Verb, Vocab, WireGrammar, WireKanji, WireReading, WireVerb, WireVocab,
} from "./types";

type Kind = "vocab" | "kanji" | "verbs" | "grammar" | "reading" | "strokes";

const cache = new Map<string, Promise<unknown>>();

/** One in-flight request per file; repeat callers share the same promise. */
function fetchJson<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit) return hit as Promise<T>;
  const p = fetch(path)
    .then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json() as Promise<T>;
    })
    .catch((e) => {
      // Don't cache a failure — a flaky network shouldn't permanently break
      // a level for the rest of the session.
      cache.delete(path);
      throw e;
    });
  cache.set(path, p);
  return p;
}

const file = (kind: Kind, level: Level) =>
  `/data/${kind}/${level.toLowerCase()}.json`;

export function loadManifest(): Promise<ContentManifest> {
  return fetchJson<ContentManifest>("/data/index.json");
}

// ── expanders ───────────────────────────────────────────────────────────────

const key = (s: string) => s.replace(/[\s:]/g, "");

/**
 * Card identity must include the reading.
 *
 * The same written form can carry different readings — 九 is both きゅう and
 * く, 一日 is both いちにち and ついたち — and they are genuinely different
 * things to learn. Keying on the written form alone collapsed 398 such pairs
 * onto one card, so one reading's schedule silently overwrote the other's.
 */
const wordKey = (word: string, reading: string) =>
  reading && reading !== word ? `${key(word)}@${key(reading)}` : key(word);

function expandVocab(rows: WireVocab[], level: Level): Vocab[] {
  return rows.map((v) => ({
    id: `vocab:${wordKey(v.w, v.r)}`,
    level,
    word: v.w,
    reading: v.r,
    meaning: v.m,
    partOfSpeech: v.p,
    verbGroup: v.g,
    takesSuru: v.suru,
    altMeanings: v.alt,
  }));
}

function expandKanji(rows: WireKanji[], level: Level): Kanji[] {
  return rows.map((k) => ({
    id: `kanji:${k.c}`,
    level,
    character: k.c,
    meanings: k.m,
    onyomi: k.on,
    kunyomi: k.kun,
    strokes: k.s,
    grade: k.grade,
    frequency: k.freq,
    radicals: k.rad ?? [],
    examples: k.ex.map((e) => ({ word: e.w, reading: e.r, meaning: e.m })),
  }));
}

function expandVerbs(rows: WireVerb[], level: Level): Verb[] {
  return rows.map((v) => ({
    id: `verb:${wordKey(v.d, v.r)}`,
    level,
    dictionary: v.d,
    reading: v.r,
    meaning: v.m,
    group: v.g,
    conjugations: v.c,
  }));
}

function expandGrammar(rows: WireGrammar[], level: Level): GrammarPoint[] {
  return rows.map(([pattern, meaning, formation, examples, comparison]) => ({
    id: `grammar:${key(pattern)}`,
    level,
    pattern,
    meaning,
    formation,
    examples: examples.map(([japanese, romaji, english]) => ({ japanese, romaji, english })),
    comparison: comparison
      ? { pattern: comparison[0], explanation: comparison[1] }
      : undefined,
  }));
}

function expandReading(rows: WireReading[], level: Level): ReadingPassage[] {
  return rows.map(([title, japanese, translation, words, questions], i) => ({
    id: `reading:${level}:${i}`,
    level,
    title,
    japanese,
    translation,
    words: words.map(([word, reading, meaning]) => ({ word, reading, meaning })),
    questions: questions.map(([question, options, answer]) => ({ question, options, answer })),
  }));
}

// ── public API ──────────────────────────────────────────────────────────────

export const loadVocab = (l: Level) =>
  fetchJson<WireVocab[]>(file("vocab", l)).then((r) => expandVocab(r, l));
export const loadKanji = (l: Level) =>
  fetchJson<WireKanji[]>(file("kanji", l)).then((r) => expandKanji(r, l));
export const loadVerbs = (l: Level) =>
  fetchJson<WireVerb[]>(file("verbs", l)).then((r) => expandVerbs(r, l));
export const loadGrammar = (l: Level) =>
  fetchJson<WireGrammar[]>(file("grammar", l)).then((r) => expandGrammar(r, l));
export const loadReading = (l: Level) =>
  fetchJson<WireReading[]>(file("reading", l)).then((r) => expandReading(r, l));

/** Stroke paths for one level, keyed by character. */
export const loadStrokes = (l: Level) =>
  fetchJson<Record<string, string[]>>(file("strokes", l));

export async function loadLevel(level: Level): Promise<LevelContent> {
  const [vocab, kanji, verbs, grammar, reading] = await Promise.all([
    loadVocab(level), loadKanji(level), loadVerbs(level),
    loadGrammar(level), loadReading(level),
  ]);
  return { level, vocab, kanji, verbs, grammar, reading };
}

export async function loadLevels(levels: Level[]): Promise<LevelContent[]> {
  return Promise.all(levels.map(loadLevel));
}

/** Load one kind across several levels — what the study pages need. */
export async function loadAcross<T>(
  levels: Level[],
  loader: (l: Level) => Promise<T[]>,
): Promise<T[]> {
  const parts = await Promise.all(levels.map(loader));
  return parts.flat();
}
