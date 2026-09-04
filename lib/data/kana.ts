/**
 * Kana — the 104 syllables Japanese is actually written in.
 *
 * Manabi previously opened on kanji and N5 vocabulary, which silently assumed
 * a learner who could already read かな. This is the missing first module.
 *
 * Structure follows the gojūon ("fifty sounds") table as it is actually
 * taught: the 46 base syllables first, then the voiced dakuten/handakuten
 * forms which are the base shapes plus a diacritic, then the yōon digraphs
 * which are a consonant kana plus a small ya/yu/yo. Only the base 46 carry
 * mnemonics — the rest are derived shapes and are learned as combinations,
 * not memorised individually.
 */

export type KanaScript = "hiragana" | "katakana";
export type KanaGroup = "gojuon" | "dakuten" | "yoon";

export interface Kana {
  /** Stable id, used to build SRS card ids. */
  id: string;
  hiragana: string;
  katakana: string;
  romaji: string;
  /** Consonant row: "k", "s", "ky", … "vowel" and "n-final" for the edges. */
  row: string;
  group: KanaGroup;
  /** Stroke count, base syllables only. */
  strokes?: number;
  /** Shape mnemonic, base syllables only. */
  mnemonic?: string;
}

export const kana: Kana[] = [
  { id: "a", hiragana: "あ", katakana: "ア", romaji: "a", row: "vowel", group: "gojuon", strokes: 3, mnemonic: "An apple with a leaf on top." },
  { id: "i", hiragana: "い", katakana: "イ", romaji: "i", row: "vowel", group: "gojuon", strokes: 2, mnemonic: "Two ears, listening." },
  { id: "u", hiragana: "う", katakana: "ウ", romaji: "u", row: "vowel", group: "gojuon", strokes: 2, mnemonic: "A beak opening to say ooh." },
  { id: "e", hiragana: "え", katakana: "エ", romaji: "e", row: "vowel", group: "gojuon", strokes: 2, mnemonic: "An energetic ninja mid-kick." },
  { id: "o", hiragana: "お", katakana: "オ", romaji: "o", row: "vowel", group: "gojuon", strokes: 3, mnemonic: "A golf ball dropping into the hole." },
  { id: "ka", hiragana: "か", katakana: "カ", romaji: "ka", row: "k", group: "gojuon", strokes: 3, mnemonic: "A kayak with its paddle." },
  { id: "ki", hiragana: "き", katakana: "キ", romaji: "ki", row: "k", group: "gojuon", strokes: 4, mnemonic: "A key on a ring." },
  { id: "ku", hiragana: "く", katakana: "ク", romaji: "ku", row: "k", group: "gojuon", strokes: 1, mnemonic: "A cuckoo's open beak." },
  { id: "ke", hiragana: "け", katakana: "ケ", romaji: "ke", row: "k", group: "gojuon", strokes: 3, mnemonic: "A keg lying on its side." },
  { id: "ko", hiragana: "こ", katakana: "コ", romaji: "ko", row: "k", group: "gojuon", strokes: 2, mnemonic: "Two coils of rope." },
  { id: "sa", hiragana: "さ", katakana: "サ", romaji: "sa", row: "s", group: "gojuon", strokes: 3, mnemonic: "A salmon swimming upstream." },
  { id: "shi", hiragana: "し", katakana: "シ", romaji: "shi", row: "s", group: "gojuon", strokes: 1, mnemonic: "A fishing hook — she caught one." },
  { id: "su", hiragana: "す", katakana: "ス", romaji: "su", row: "s", group: "gojuon", strokes: 2, mnemonic: "A swing hanging from a rope." },
  { id: "se", hiragana: "せ", katakana: "セ", romaji: "se", row: "s", group: "gojuon", strokes: 3, mnemonic: "A mouth saying seh." },
  { id: "so", hiragana: "そ", katakana: "ソ", romaji: "so", row: "s", group: "gojuon", strokes: 1, mnemonic: "A zig-zag sewing stitch." },
  { id: "ta", hiragana: "た", katakana: "タ", romaji: "ta", row: "t", group: "gojuon", strokes: 4, mnemonic: "A tall ladder." },
  { id: "chi", hiragana: "ち", katakana: "チ", romaji: "chi", row: "t", group: "gojuon", strokes: 2, mnemonic: "A cheerleader bending backwards." },
  { id: "tsu", hiragana: "つ", katakana: "ツ", romaji: "tsu", row: "t", group: "gojuon", strokes: 1, mnemonic: "A tsunami wave curling over." },
  { id: "te", hiragana: "て", katakana: "テ", romaji: "te", row: "t", group: "gojuon", strokes: 1, mnemonic: "A telephone pole." },
  { id: "to", hiragana: "と", katakana: "ト", romaji: "to", row: "t", group: "gojuon", strokes: 2, mnemonic: "A toe with a splinter in it." },
  { id: "na", hiragana: "な", katakana: "ナ", romaji: "na", row: "n", group: "gojuon", strokes: 4, mnemonic: "A nun kneeling to pray." },
  { id: "ni", hiragana: "に", katakana: "ニ", romaji: "ni", row: "n", group: "gojuon", strokes: 3, mnemonic: "A knee bent on a bench." },
  { id: "nu", hiragana: "ぬ", katakana: "ヌ", romaji: "nu", row: "n", group: "gojuon", strokes: 2, mnemonic: "Noodles twirled on a fork." },
  { id: "ne", hiragana: "ね", katakana: "ネ", romaji: "ne", row: "n", group: "gojuon", strokes: 2, mnemonic: "A nest with a curled tail." },
  { id: "no", hiragana: "の", katakana: "ノ", romaji: "no", row: "n", group: "gojuon", strokes: 1, mnemonic: "A no-entry sign, drawn in one stroke." },
  { id: "ha", hiragana: "は", katakana: "ハ", romaji: "ha", row: "h", group: "gojuon", strokes: 3, mnemonic: "A person wearing a hat." },
  { id: "hi", hiragana: "ひ", katakana: "ヒ", romaji: "hi", row: "h", group: "gojuon", strokes: 1, mnemonic: "A wide smiling mouth — hee hee." },
  { id: "fu", hiragana: "ふ", katakana: "フ", romaji: "fu", row: "h", group: "gojuon", strokes: 4, mnemonic: "Mount Fuji seen from the side." },
  { id: "he", hiragana: "へ", katakana: "ヘ", romaji: "he", row: "h", group: "gojuon", strokes: 1, mnemonic: "A headland on the horizon." },
  { id: "ho", hiragana: "ほ", katakana: "ホ", romaji: "ho", row: "h", group: "gojuon", strokes: 4, mnemonic: "A home with a chimney." },
  { id: "ma", hiragana: "ま", katakana: "マ", romaji: "ma", row: "m", group: "gojuon", strokes: 3, mnemonic: "Mama tying up her hair." },
  { id: "mi", hiragana: "み", katakana: "ミ", romaji: "mi", row: "m", group: "gojuon", strokes: 2, mnemonic: "The number 21 — meet me at 21." },
  { id: "mu", hiragana: "む", katakana: "ム", romaji: "mu", row: "m", group: "gojuon", strokes: 3, mnemonic: "A cow's face going moo." },
  { id: "me", hiragana: "め", katakana: "メ", romaji: "me", row: "m", group: "gojuon", strokes: 2, mnemonic: "An eye — me is the Japanese word for eye." },
  { id: "mo", hiragana: "も", katakana: "モ", romaji: "mo", row: "m", group: "gojuon", strokes: 3, mnemonic: "A fishing hook baited for more." },
  { id: "ya", hiragana: "や", katakana: "ヤ", romaji: "ya", row: "y", group: "gojuon", strokes: 3, mnemonic: "A yak with horns." },
  { id: "yu", hiragana: "ゆ", katakana: "ユ", romaji: "yu", row: "y", group: "gojuon", strokes: 2, mnemonic: "A U-turn arrow — you turn." },
  { id: "yo", hiragana: "よ", katakana: "ヨ", romaji: "yo", row: "y", group: "gojuon", strokes: 2, mnemonic: "A yo-yo on its string." },
  { id: "ra", hiragana: "ら", katakana: "ラ", romaji: "ra", row: "r", group: "gojuon", strokes: 2, mnemonic: "A rabbit sitting upright." },
  { id: "ri", hiragana: "り", katakana: "リ", romaji: "ri", row: "r", group: "gojuon", strokes: 2, mnemonic: "A river between two banks." },
  { id: "ru", hiragana: "る", katakana: "ル", romaji: "ru", row: "r", group: "gojuon", strokes: 1, mnemonic: "A route that loops back." },
  { id: "re", hiragana: "れ", katakana: "レ", romaji: "re", row: "r", group: "gojuon", strokes: 2, mnemonic: "A ray of light bending." },
  { id: "ro", hiragana: "ろ", katakana: "ロ", romaji: "ro", row: "r", group: "gojuon", strokes: 1, mnemonic: "A road that turns back on itself." },
  { id: "wa", hiragana: "わ", katakana: "ワ", romaji: "wa", row: "w", group: "gojuon", strokes: 2, mnemonic: "A wasp with a curled sting." },
  { id: "wo", hiragana: "を", katakana: "ヲ", romaji: "wo", row: "w", group: "gojuon", strokes: 3, mnemonic: "Someone throwing a boomerang — whoa." },
  { id: "n", hiragana: "ん", katakana: "ン", romaji: "n", row: "n-final", group: "gojuon", strokes: 1, mnemonic: "A single n, like a lowercase n leaning over." },
  { id: "g-が", hiragana: "が", katakana: "ガ", romaji: "ga", row: "g", group: "dakuten" },
  { id: "g-ぎ", hiragana: "ぎ", katakana: "ギ", romaji: "gi", row: "g", group: "dakuten" },
  { id: "g-ぐ", hiragana: "ぐ", katakana: "グ", romaji: "gu", row: "g", group: "dakuten" },
  { id: "g-げ", hiragana: "げ", katakana: "ゲ", romaji: "ge", row: "g", group: "dakuten" },
  { id: "g-ご", hiragana: "ご", katakana: "ゴ", romaji: "go", row: "g", group: "dakuten" },
  { id: "z-ざ", hiragana: "ざ", katakana: "ザ", romaji: "za", row: "z", group: "dakuten" },
  { id: "z-じ", hiragana: "じ", katakana: "ジ", romaji: "ji", row: "z", group: "dakuten" },
  { id: "z-ず", hiragana: "ず", katakana: "ズ", romaji: "zu", row: "z", group: "dakuten" },
  { id: "z-ぜ", hiragana: "ぜ", katakana: "ゼ", romaji: "ze", row: "z", group: "dakuten" },
  { id: "z-ぞ", hiragana: "ぞ", katakana: "ゾ", romaji: "zo", row: "z", group: "dakuten" },
  { id: "d-だ", hiragana: "だ", katakana: "ダ", romaji: "da", row: "d", group: "dakuten" },
  { id: "d-ぢ", hiragana: "ぢ", katakana: "ヂ", romaji: "ji", row: "d", group: "dakuten" },
  { id: "d-づ", hiragana: "づ", katakana: "ヅ", romaji: "zu", row: "d", group: "dakuten" },
  { id: "d-で", hiragana: "で", katakana: "デ", romaji: "de", row: "d", group: "dakuten" },
  { id: "d-ど", hiragana: "ど", katakana: "ド", romaji: "do", row: "d", group: "dakuten" },
  { id: "b-ば", hiragana: "ば", katakana: "バ", romaji: "ba", row: "b", group: "dakuten" },
  { id: "b-び", hiragana: "び", katakana: "ビ", romaji: "bi", row: "b", group: "dakuten" },
  { id: "b-ぶ", hiragana: "ぶ", katakana: "ブ", romaji: "bu", row: "b", group: "dakuten" },
  { id: "b-べ", hiragana: "べ", katakana: "ベ", romaji: "be", row: "b", group: "dakuten" },
  { id: "b-ぼ", hiragana: "ぼ", katakana: "ボ", romaji: "bo", row: "b", group: "dakuten" },
  { id: "p-ぱ", hiragana: "ぱ", katakana: "パ", romaji: "pa", row: "p", group: "dakuten" },
  { id: "p-ぴ", hiragana: "ぴ", katakana: "ピ", romaji: "pi", row: "p", group: "dakuten" },
  { id: "p-ぷ", hiragana: "ぷ", katakana: "プ", romaji: "pu", row: "p", group: "dakuten" },
  { id: "p-ぺ", hiragana: "ぺ", katakana: "ペ", romaji: "pe", row: "p", group: "dakuten" },
  { id: "p-ぽ", hiragana: "ぽ", katakana: "ポ", romaji: "po", row: "p", group: "dakuten" },
  { id: "ky-きゃ", hiragana: "きゃ", katakana: "キャ", romaji: "kya", row: "ky", group: "yoon" },
  { id: "ky-きゅ", hiragana: "きゅ", katakana: "キュ", romaji: "kyu", row: "ky", group: "yoon" },
  { id: "ky-きょ", hiragana: "きょ", katakana: "キョ", romaji: "kyo", row: "ky", group: "yoon" },
  { id: "sh-しゃ", hiragana: "しゃ", katakana: "シャ", romaji: "sha", row: "sh", group: "yoon" },
  { id: "sh-しゅ", hiragana: "しゅ", katakana: "シュ", romaji: "shu", row: "sh", group: "yoon" },
  { id: "sh-しょ", hiragana: "しょ", katakana: "ショ", romaji: "sho", row: "sh", group: "yoon" },
  { id: "ch-ちゃ", hiragana: "ちゃ", katakana: "チャ", romaji: "cha", row: "ch", group: "yoon" },
  { id: "ch-ちゅ", hiragana: "ちゅ", katakana: "チュ", romaji: "chu", row: "ch", group: "yoon" },
  { id: "ch-ちょ", hiragana: "ちょ", katakana: "チョ", romaji: "cho", row: "ch", group: "yoon" },
  { id: "ny-にゃ", hiragana: "にゃ", katakana: "ニャ", romaji: "nya", row: "ny", group: "yoon" },
  { id: "ny-にゅ", hiragana: "にゅ", katakana: "ニュ", romaji: "nyu", row: "ny", group: "yoon" },
  { id: "ny-にょ", hiragana: "にょ", katakana: "ニョ", romaji: "nyo", row: "ny", group: "yoon" },
  { id: "hy-ひゃ", hiragana: "ひゃ", katakana: "ヒャ", romaji: "hya", row: "hy", group: "yoon" },
  { id: "hy-ひゅ", hiragana: "ひゅ", katakana: "ヒュ", romaji: "hyu", row: "hy", group: "yoon" },
  { id: "hy-ひょ", hiragana: "ひょ", katakana: "ヒョ", romaji: "hyo", row: "hy", group: "yoon" },
  { id: "my-みゃ", hiragana: "みゃ", katakana: "ミャ", romaji: "mya", row: "my", group: "yoon" },
  { id: "my-みゅ", hiragana: "みゅ", katakana: "ミュ", romaji: "myu", row: "my", group: "yoon" },
  { id: "my-みょ", hiragana: "みょ", katakana: "ミョ", romaji: "myo", row: "my", group: "yoon" },
  { id: "ry-りゃ", hiragana: "りゃ", katakana: "リャ", romaji: "rya", row: "ry", group: "yoon" },
  { id: "ry-りゅ", hiragana: "りゅ", katakana: "リュ", romaji: "ryu", row: "ry", group: "yoon" },
  { id: "ry-りょ", hiragana: "りょ", katakana: "リョ", romaji: "ryo", row: "ry", group: "yoon" },
  { id: "gy-ぎゃ", hiragana: "ぎゃ", katakana: "ギャ", romaji: "gya", row: "gy", group: "yoon" },
  { id: "gy-ぎゅ", hiragana: "ぎゅ", katakana: "ギュ", romaji: "gyu", row: "gy", group: "yoon" },
  { id: "gy-ぎょ", hiragana: "ぎょ", katakana: "ギョ", romaji: "gyo", row: "gy", group: "yoon" },
  { id: "j-じゃ", hiragana: "じゃ", katakana: "ジャ", romaji: "ja", row: "j", group: "yoon" },
  { id: "j-じゅ", hiragana: "じゅ", katakana: "ジュ", romaji: "ju", row: "j", group: "yoon" },
  { id: "j-じょ", hiragana: "じょ", katakana: "ジョ", romaji: "jo", row: "j", group: "yoon" },
  { id: "by-びゃ", hiragana: "びゃ", katakana: "ビャ", romaji: "bya", row: "by", group: "yoon" },
  { id: "by-びゅ", hiragana: "びゅ", katakana: "ビュ", romaji: "byu", row: "by", group: "yoon" },
  { id: "by-びょ", hiragana: "びょ", katakana: "ビョ", romaji: "byo", row: "by", group: "yoon" },
  { id: "py-ぴゃ", hiragana: "ぴゃ", katakana: "ピャ", romaji: "pya", row: "py", group: "yoon" },
  { id: "py-ぴゅ", hiragana: "ぴゅ", katakana: "ピュ", romaji: "pyu", row: "py", group: "yoon" },
  { id: "py-ぴょ", hiragana: "ぴょ", katakana: "ピョ", romaji: "pyo", row: "py", group: "yoon" },
];

/** Row order for rendering the gojūon grid, and for ordered introduction. */
export const KANA_ROWS = [
  "vowel", "k", "s", "t", "n", "h", "m", "y", "r", "w", "n-final",
] as const;

export const DAKUTEN_ROWS = ["g", "z", "d", "b", "p"] as const;

export const YOON_ROWS = [
  "ky", "sh", "ch", "ny", "hy", "my", "ry", "gy", "j", "by", "py",
] as const;

/** The five vowel columns, in gojūon order. */
export const VOWEL_ORDER = ["a", "i", "u", "e", "o"] as const;

export const kanaById = new Map(kana.map((k) => [k.id, k]));

export function kanaByGroup(group: KanaGroup): Kana[] {
  return kana.filter((k) => k.group === group);
}

export function kanaInRow(row: string): Kana[] {
  return kana.filter((k) => k.row === row);
}

/** Character for a kana in the requested script. */
export function glyph(k: Kana, script: KanaScript): string {
  return script === "hiragana" ? k.hiragana : k.katakana;
}

/**
 * Rows are introduced in gojūon order — this is how kana is taught and it
 * keeps confusable shapes (さ/ち, シ/ツ, ソ/ン) apart in time.
 */
export function orderedForLearning(group: KanaGroup = "gojuon"): Kana[] {
  const order =
    group === "gojuon" ? KANA_ROWS : group === "dakuten" ? DAKUTEN_ROWS : YOON_ROWS;
  return [...kana]
    .filter((k) => k.group === group)
    .sort((a, b) => order.indexOf(a.row as never) - order.indexOf(b.row as never));
}

/**
 * Look-alikes worth drilling against each other. These pairs are the single
 * biggest source of early reading errors, so the quiz deliberately offers the
 * confusable partner as a distractor rather than a random kana.
 */
export const CONFUSABLE: Record<string, string[]> = {
  a: ["o", "nu", "me"],
  o: ["a", "nu"],
  nu: ["me", "a", "ne"],
  me: ["nu", "a"],
  ne: ["re", "wa", "nu"],
  re: ["ne", "wa"],
  wa: ["ne", "re"],
  ru: ["ro", "ri"],
  ro: ["ru"],
  sa: ["chi", "ki"],
  chi: ["sa", "te"],
  ki: ["sa"],
  shi: ["tsu", "n", "so"],
  tsu: ["shi", "n", "so"],
  so: ["n", "shi", "tsu"],
  n: ["so", "shi", "tsu"],
  ha: ["ho", "ke"],
  ho: ["ha", "ma"],
  ma: ["ho"],
  ku: ["ke", "ta"],
  ke: ["ku", "ha"],
  fu: ["wa"],
  u: ["tsu", "ra"],
  ra: ["u", "chi"],
};
