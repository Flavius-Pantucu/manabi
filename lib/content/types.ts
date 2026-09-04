/**
 * Wire format for the on-demand content files in `public/data/`.
 *
 * Field names are single letters because these files are fetched over the
 * network, not read by hand: across 8,034 vocabulary entries the short keys
 * save roughly a third of the payload. The `Vocab`/`Kanji`/... types below are
 * the expanded shapes the app actually works with.
 */

export type Level = "N5" | "N4" | "N3" | "N2" | "N1";
export const LEVELS: Level[] = ["N5", "N4", "N3", "N2", "N1"];

// ── on the wire ─────────────────────────────────────────────────────────────

export interface WireVocab {
  w: string;            // written form
  r: string;            // reading (kana)
  m: string;            // primary meaning
  p: string;            // part of speech
  g?: string;           // verb group, when it is a verb
  suru?: boolean;       // noun that takes する
  alt?: string[];       // additional glosses
}

export interface WireKanji {
  c: string;            // character
  m: string[];          // meanings
  on: string[];         // on'yomi
  kun: string[];        // kun'yomi
  s: number;            // stroke count (from KanjiVG)
  grade?: number | null;
  freq?: number | null;
  rad?: string[];       // radical names
  ex: { w: string; r: string; m: string }[];
}

export interface WireVerb {
  d: string;            // dictionary form
  r: string;            // reading
  m: string;            // meaning
  g: string;            // group
  c: Record<string, string>; // conjugations
}

export type WireGrammar = [
  pattern: string,
  meaning: string,
  formation: string,
  examples: [ja: string, romaji: string, en: string][],
  comparison: [pattern: string, explanation: string] | null,
];

export type WireReading = [
  title: string,
  japanese: string,
  translation: string,
  words: [word: string, reading: string, meaning: string][],
  questions: [question: string, options: string[], answer: number][],
];

// ── expanded ────────────────────────────────────────────────────────────────

export interface Vocab {
  id: string;
  level: Level;
  word: string;
  reading: string;
  meaning: string;
  partOfSpeech: string;
  verbGroup?: string;
  takesSuru?: boolean;
  altMeanings?: string[];
}

export interface Kanji {
  id: string;
  level: Level;
  character: string;
  meanings: string[];
  onyomi: string[];
  kunyomi: string[];
  strokes: number;
  grade?: number | null;
  frequency?: number | null;
  radicals: string[];
  examples: { word: string; reading: string; meaning: string }[];
}

export interface Verb {
  id: string;
  level: Level;
  dictionary: string;
  reading: string;
  meaning: string;
  group: string;
  conjugations: Record<string, string>;
}

export interface GrammarPoint {
  id: string;
  level: Level;
  pattern: string;
  meaning: string;
  formation: string;
  examples: { japanese: string; romaji: string; english: string }[];
  comparison?: { pattern: string; explanation: string };
}

export interface ReadingPassage {
  id: string;
  level: Level;
  title: string;
  japanese: string;
  translation: string;
  words: { word: string; reading: string; meaning: string }[];
  questions: { question: string; options: string[]; answer: number }[];
}

export interface LevelContent {
  level: Level;
  vocab: Vocab[];
  kanji: Kanji[];
  verbs: Verb[];
  grammar: GrammarPoint[];
  reading: ReadingPassage[];
}

export interface ContentManifest {
  generated: string;
  levels: Record<Level, {
    vocab: number; kanji: number; verbs: number; grammar: number; reading: number;
  }>;
}
