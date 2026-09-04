/**
 * Mora segmentation.
 *
 * Japanese pitch accent is counted in morae, not characters. A small ゃゅょ
 * binds to the kana before it (きょ = one mora), while ん, っ and ー each count
 * as a mora of their own. Splitting by character would put the accent in the
 * wrong place on exactly the words learners find hardest.
 */

const SMALL = "ゃゅょャュョぁぃぅぇぉァィゥェォ";

export function toMorae(kana: string): string[] {
  const out: string[] = [];
  for (const ch of kana) {
    if (SMALL.includes(ch) && out.length > 0) {
      out[out.length - 1] += ch;
    } else {
      out.push(ch);
    }
  }
  return out;
}

export type PitchPattern = "heiban" | "atamadaka" | "nakadaka" | "odaka";

export function pitchPattern(morae: number, drop: number): PitchPattern {
  if (drop === 0) return "heiban";
  if (drop === 1) return "atamadaka";
  if (drop >= morae) return "odaka";
  return "nakadaka";
}

export const PATTERN_LABEL: Record<PitchPattern, { jp: string; en: string; help: string }> = {
  heiban: {
    jp: "平板",
    en: "Heiban",
    help: "Low then high, and it stays high — a following particle keeps the high pitch.",
  },
  atamadaka: {
    jp: "頭高",
    en: "Atamadaka",
    help: "High on the first mora, then drops immediately.",
  },
  nakadaka: {
    jp: "中高",
    en: "Nakadaka",
    help: "Rises, then falls before the end of the word.",
  },
  odaka: {
    jp: "尾高",
    en: "Odaka",
    help: "Stays high to the last mora, then a following particle drops.",
  },
};

/**
 * High/low for each mora, plus the particle that follows the word — the
 * particle is what distinguishes heiban from odaka, so it has to be shown.
 */
export function pitchContour(kana: string, drop: number): { mora: string; high: boolean }[] {
  const morae = toMorae(kana);
  return morae.map((m, i) => {
    const n = i + 1;
    let high: boolean;
    if (drop === 0) high = n !== 1;              // heiban: low then high
    else if (drop === 1) high = n === 1;          // atamadaka
    else high = n > 1 && n <= drop;               // rises, drops after `drop`
    return { mora: m, high };
  });
}

/** Is the particle after this word high? Only for heiban. */
export function particleHigh(drop: number): boolean {
  return drop === 0;
}
