/**
 * The path through the material.
 *
 * Every record already carried an N5–N1 tag and nothing consumed it, so a
 * beginner and an N3 learner saw the same undifferentiated list. These
 * helpers turn the tag into an actual curriculum: what belongs to a level,
 * how far through it you are, and which level to start at.
 */

import type { DeckId, ReviewItem } from "./decks";
import type { SrsState } from "@/lib/store/features/srs-slice";

export const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_BLURB: Record<Level, string> = {
  N5: "The foundation: kana, ~100 kanji, everyday words and basic sentence patterns.",
  N4: "Everyday Japanese: ~300 kanji, plain forms, and connected sentences.",
  N3: "The bridge: abstract vocabulary and the grammar that links ideas.",
  N2: "Newspapers and workplace Japanese.",
  N1: "Academic and literary register.",
};

export interface LevelProgress {
  level: Level;
  total: number;
  started: number;
  known: number;
  /** 0–1, by cards that have reached the review phase. */
  ratio: number;
}

export function levelProgress(state: SrsState, all: ReviewItem[]): LevelProgress[] {
  const items = all.filter((i) => i.level);
  return LEVELS.map((level) => {
    const inLevel = items.filter((i) => i.level === level);
    let started = 0;
    let known = 0;
    for (const i of inLevel) {
      const c = state.cards[i.cardId];
      if (!c || c.phase === "new") continue;
      started++;
      if (c.phase === "review" && c.stability >= 21) known++;
    }
    return {
      level,
      total: inLevel.length,
      started,
      known,
      ratio: inLevel.length ? known / inLevel.length : 0,
    };
  });
}

/** Kana is its own prerequisite step, tracked separately from JLPT levels. */
export function kanaProgress(state: SrsState, all: ReviewItem[]) {
  const items = all.filter(
    (i) => i.deck === "kana-hiragana" || i.deck === "kana-katakana",
  );
  const done = items.filter((i) => {
    const c = state.cards[i.cardId];
    return c && c.phase === "review";
  }).length;
  return { total: items.length, done, ratio: items.length ? done / items.length : 0 };
}

/**
 * What the learner should do next. Kana first — everything downstream assumes
 * it — then the lowest level with material still unstarted.
 */
export function nextStep(state: SrsState, all: ReviewItem[]): {
  label: string;
  detail: string;
  href: string;
  deck?: DeckId;
} {
  const kana = kanaProgress(state, all);
  if (kana.ratio < 0.5) {
    return {
      label: kana.done === 0 ? "Start with hiragana" : "Keep going with kana",
      detail: `${kana.done} of ${kana.total} syllables learned. Everything else assumes these.`,
      href: "/kana",
      deck: "kana-hiragana",
    };
  }
  const prog = levelProgress(state, all);
  const current = prog.find((p) => p.total > 0 && p.ratio < 0.9) ?? prog[0];
  return {
    label: `Continue ${current.level}`,
    detail: `${current.known} of ${current.total} cards at ${current.level} are established.`,
    href: "/review",
  };
}
