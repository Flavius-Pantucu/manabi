/**
 * Romaji → kana conversion, so a learner on a laptop without a Japanese IME
 * can still be asked to *produce* Japanese rather than only recognise it.
 *
 * Typing "nihon" gives にほん as you type. This is what makes recall drills
 * possible at all on a stock keyboard, and recall is where the learning
 * happens — the app previously only ever asked for recognition.
 *
 * Deliberately Hepburn-tolerant: "shi"/"si", "tsu"/"tu", "ja"/"jya"/"zya" all
 * land on the same kana, because a learner should be graded on knowing the
 * word, not on guessing which romanisation the app prefers.
 */

// Longest-first matching matters: "kya" must beat "ka", "sha" must beat "sa".
const MAP: Record<string, string> = {
  // yōon
  kya:"きゃ",kyu:"きゅ",kyo:"きょ", gya:"ぎゃ",gyu:"ぎゅ",gyo:"ぎょ",
  sha:"しゃ",shu:"しゅ",sho:"しょ", sya:"しゃ",syu:"しゅ",syo:"しょ",
  ja:"じゃ",ju:"じゅ",jo:"じょ", jya:"じゃ",jyu:"じゅ",jyo:"じょ",
  zya:"じゃ",zyu:"じゅ",zyo:"じょ",
  cha:"ちゃ",chu:"ちゅ",cho:"ちょ", tya:"ちゃ",tyu:"ちゅ",tyo:"ちょ",
  nya:"にゃ",nyu:"にゅ",nyo:"にょ", hya:"ひゃ",hyu:"ひゅ",hyo:"ひょ",
  bya:"びゃ",byu:"びゅ",byo:"びょ", pya:"ぴゃ",pyu:"ぴゅ",pyo:"ぴょ",
  mya:"みゃ",myu:"みゅ",myo:"みょ", rya:"りゃ",ryu:"りゅ",ryo:"りょ",
  // digraph consonants
  shi:"し",si:"し", chi:"ち",ti:"ち", tsu:"つ",tu:"つ", fu:"ふ",hu:"ふ",
  ji:"じ",zi:"じ", di:"ぢ", du:"づ", dzu:"づ",
  // gojūon
  ka:"か",ki:"き",ku:"く",ke:"け",ko:"こ",
  sa:"さ",su:"す",se:"せ",so:"そ",
  ta:"た",te:"て",to:"と",
  na:"な",ni:"に",nu:"ぬ",ne:"ね",no:"の",
  ha:"は",hi:"ひ",he:"へ",ho:"ほ",
  ma:"ま",mi:"み",mu:"む",me:"め",mo:"も",
  ya:"や",yu:"ゆ",yo:"よ",
  ra:"ら",ri:"り",ru:"る",re:"れ",ro:"ろ",
  wa:"わ",wo:"を",wi:"ゐ",we:"ゑ",
  ga:"が",gi:"ぎ",gu:"ぐ",ge:"げ",go:"ご",
  za:"ざ",zu:"ず",ze:"ぜ",zo:"ぞ",
  da:"だ",de:"で",do:"ど",
  ba:"ば",bi:"び",bu:"ぶ",be:"べ",bo:"ぼ",
  pa:"ぱ",pi:"ぴ",pu:"ぷ",pe:"ぺ",po:"ぽ",
  a:"あ",i:"い",u:"う",e:"え",o:"お",
  "n'":"ん",
  "-":"ー",
};

const KEYS = Object.keys(MAP).sort((a, b) => b.length - a.length);
const VOWELS = "aiueo";

/**
 * Convert as much of the input as possible. Trailing characters that could
 * still become a valid syllable ("ky", "n") are left as romaji so the field
 * updates cleanly while the learner is still typing.
 */
export function toKana(input: string): string {
  const src = input.toLowerCase();
  let out = "";
  let i = 0;

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    // Sokuon: a doubled consonant becomes っ ("kitte" → きって).
    if (ch === next && ch && !VOWELS.includes(ch) && ch !== "n" && /[a-z]/.test(ch)) {
      out += "っ";
      i += 1;
      continue;
    }

    // ん. The awkward case is "nn": in "konnichiwa" the first n is ん and the
    // second starts に, but a bare "nn" with no following vowel is just ん.
    if (ch === "n") {
      if (!next) {
        out += "ん";
        i += 1;
        continue;
      }
      if (next === "n") {
        const after = src[i + 2];
        out += "ん";
        i += after && (VOWELS.includes(after) || after === "y") ? 1 : 2;
        continue;
      }
      if (!VOWELS.includes(next) && next !== "y") {
        out += "ん";
        i += 1;
        continue;
      }
    }

    let matched = false;
    for (const k of KEYS) {
      if (src.startsWith(k, i)) {
        out += MAP[k];
        i += k.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    out += ch;
    i += 1;
  }
  return out;
}

const HIRA_START = 0x3041;
const HIRA_END = 0x3096;
const KATA_OFFSET = 0x60;

export function hiraganaToKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + KATA_OFFSET),
  );
}

export function katakanaToHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - KATA_OFFSET),
  );
}

export function isKana(s: string): boolean {
  return /^[ぁ-ゖァ-ヶー\s]+$/.test(s);
}

/**
 * Normalise an answer for comparison. Grading should forgive script, spacing,
 * case, and punctuation — none of which is the thing being tested.
 */
export function normalizeAnswer(s: string): string {
  return katakanaToHiragana(
    s
      .trim()
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[\s.,!?。、！？「」『』()（）]/g, "")
      .replace(/[~〜ー]/g, ""),
  );
}

/**
 * Compare a typed answer against the accepted set. Romaji input is converted
 * first, so "tabemono" matches たべもの.
 */
export function answerMatches(typed: string, accepts: string[]): boolean {
  const raw = normalizeAnswer(typed);
  const asKana = normalizeAnswer(toKana(typed));
  return accepts.some((a) => {
    const n = normalizeAnswer(a);
    return n === raw || n === asKana;
  });
}

/** Levenshtein distance, for "so close" feedback on a near-miss. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  const cur = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = [...cur];
  }
  return prev[n];
}

/** True when the answer is one edit away — worth a "nearly" nudge. */
export function isNearMiss(typed: string, accepts: string[]): boolean {
  const asKana = normalizeAnswer(toKana(typed));
  const raw = normalizeAnswer(typed);
  return accepts.some((a) => {
    const n = normalizeAnswer(a);
    if (!n) return false;
    return (
      (editDistance(asKana, n) === 1 && asKana.length > 1) ||
      (editDistance(raw, n) === 1 && raw.length > 1)
    );
  });
}
