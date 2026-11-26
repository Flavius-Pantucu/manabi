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
  ContentManifest, GrammarPoint, Kanji, Language, Level, LevelContent, ReadingPassage,
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

const file = (kind: Kind, level: Level, lang: Language = "ja") =>
  lang === "ja"
    ? `/data/${kind}/${level.toLowerCase()}.json`
    : `/data/${lang}/${kind}/${level.toLowerCase()}.json`;

export function loadManifest(lang: Language = "ja"): Promise<ContentManifest> {
  return fetchJson<ContentManifest>(
    lang === "ja" ? "/data/index.json" : `/data/${lang}/index.json`,
  );
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

const idPrefix = (lang: Language) => (lang === "ja" ? "" : `${lang}:`);

function expandVocab(rows: WireVocab[], level: Level, lang: Language = "ja"): Vocab[] {
  const pre = idPrefix(lang);
  return rows.map((v) => ({
    id: `${pre}vocab:${wordKey(v.w, v.r)}`,
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

function expandVerbs(rows: WireVerb[], level: Level, lang: Language = "ja"): Verb[] {
  const pre = idPrefix(lang);
  return rows.map((v) => ({
    id: `${pre}verb:${wordKey(v.d, v.r)}`,
    level,
    dictionary: v.d,
    reading: v.r,
    meaning: v.m,
    group: v.g,
    conjugations: v.c,
  }));
}

function expandGrammar(rows: WireGrammar[], level: Level, lang: Language = "ja"): GrammarPoint[] {
  const pre = idPrefix(lang);
  return rows.map(([pattern, meaning, formation, examples, comparison]) => ({
    id: `${pre}grammar:${key(pattern)}`,
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

function expandReading(rows: WireReading[], level: Level, lang: Language = "ja"): ReadingPassage[] {
  const pre = idPrefix(lang);
  return rows.map(([title, japanese, translation, words, questions], i) => ({
    id: `${pre}reading:${level}:${i}`,
    level,
    title,
    japanese,
    translation,
    words: words.map(([word, reading, meaning]) => ({ word, reading, meaning })),
    questions: questions.map(([question, options, answer]) => ({ question, options, answer })),
  }));
}

// ── public API ──────────────────────────────────────────────────────────────

export const loadVocab = (l: Level, lang: Language = "ja") =>
  fetchJson<WireVocab[]>(file("vocab", l, lang)).then((r) => expandVocab(r, l, lang));
export const loadKanji = (l: Level, lang: Language = "ja") =>
  lang !== "ja"
    ? Promise.resolve<Kanji[]>([])
    : fetchJson<WireKanji[]>(file("kanji", l, lang)).then((r) => expandKanji(r, l));
export const loadVerbs = (l: Level, lang: Language = "ja") =>
  fetchJson<WireVerb[]>(file("verbs", l, lang)).then((r) => expandVerbs(r, l, lang));
export const loadGrammar = (l: Level, lang: Language = "ja") =>
  fetchJson<WireGrammar[]>(file("grammar", l, lang)).then((r) => expandGrammar(r, l, lang));
export const loadReading = (l: Level, lang: Language = "ja") =>
  fetchJson<WireReading[]>(file("reading", l, lang)).then((r) => expandReading(r, l, lang));

/** Stroke paths for one level, keyed by character. */
export const loadStrokes = (l: Level) =>
  fetchJson<Record<string, string[]>>(file("strokes", l, "ja"));

export async function loadLevel(level: Level, lang: Language = "ja"): Promise<LevelContent> {
  const [vocab, kanji, verbs, grammar, reading] = await Promise.all([
    loadVocab(level, lang), loadKanji(level, lang), loadVerbs(level, lang),
    loadGrammar(level, lang), loadReading(level, lang),
  ]);
  return { level, vocab, kanji, verbs, grammar, reading };
}

export async function loadLevels(levels: Level[], lang: Language = "ja"): Promise<LevelContent[]> {
  return Promise.all(levels.map((l) => loadLevel(l, lang)));
}

/** Load one kind across several levels — what the study pages need. */
export async function loadAcross<T>(
  levels: Level[],
  loader: (l: Level) => Promise<T[]>,
): Promise<T[]> {
  const parts = await Promise.all(levels.map(loader));
  return parts.flat();
}
