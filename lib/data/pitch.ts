/**
 * Verified pitch accent.
 *
 * The value is the mora AFTER which the pitch drops: 0 = heiban (no drop, and
 * a following particle stays high), 1 = atamadaka, n = drops after mora n.
 *
 * Keyed by reading then written form, because pitch distinguishes homophones —
 * あめ is 雨 [1] (rain) or 飴 [0] (sweet), and はし is 箸 [1], 橋 [2] or 端 [0].
 *
 * This covers only entries checked against a source. The bulk vocabulary set
 * carries no accent data, and the UI renders no contour where none exists: a
 * wrong pattern is worse than none, because it is expensive to unlearn.
 *
 * Populating the remaining ~8,000 entries needs a citable source such as OJAD
 * or the NHK accent dictionary.
 */

export const PITCH: Record<string, Record<string, number>> = {
  "あさごはん": {
    "朝ごはん": 3
  },
  "あした": {
    "明日": 3
  },
  "あたらしい": {
    "新しい": 4
  },
  "あつい": {
    "暑い": 2
  },
  "あめ": {
    "雨": 1,
    "飴": 0
  },
  "いえ": {
    "家": 2
  },
  "いそがしい": {
    "忙しい": 4
  },
  "いぬ": {
    "犬": 2
  },
  "うみ": {
    "海": 1
  },
  "うれしい": {
    "嬉しい": 3
  },
  "えき": {
    "駅": 1
  },
  "おおきい": {
    "大きい": 3
  },
  "おちゃ": {
    "お茶": 0
  },
  "おもしろい": {
    "面白い": 4
  },
  "おんがく": {
    "音楽": 1
  },
  "かいぎ": {
    "会議": 1
  },
  "かいしゃ": {
    "会社": 0
  },
  "かき": {
    "柿": 0
  },
  "かぜ": {
    "風": 0
  },
  "かみ": {
    "神": 1,
    "紙": 2
  },
  "かわ": {
    "川": 2
  },
  "がくせい": {
    "学生": 0
  },
  "がっこう": {
    "学校": 0
  },
  "き": {
    "木": 1
  },
  "きっぷ": {
    "切符": 0
  },
  "きのう": {
    "昨日": 2
  },
  "きょう": {
    "今日": 1
  },
  "きょうしつ": {
    "教室": 0
  },
  "きれい": {
    "綺麗": 1
  },
  "くうこう": {
    "空港": 0
  },
  "くだもの": {
    "果物": 2
  },
  "くるま": {
    "車": 0
  },
  "げんき": {
    "元気": 1
  },
  "さかな": {
    "魚": 0
  },
  "さむい": {
    "寒い": 2
  },
  "しけん": {
    "試験": 2
  },
  "しごと": {
    "仕事": 0
  },
  "しつもん": {
    "質問": 0
  },
  "しゅくだい": {
    "宿題": 0
  },
  "じかん": {
    "時間": 0
  },
  "じしょ": {
    "辞書": 1
  },
  "すし": {
    "寿司": 2
  },
  "せんせい": {
    "先生": 3
  },
  "そら": {
    "空": 1
  },
  "たかい": {
    "高い": 2
  },
  "たべもの": {
    "食べ物": 2
  },
  "たまご": {
    "卵": 2
  },
  "ちいさい": {
    "小さい": 3
  },
  "ちず": {
    "地図": 1
  },
  "てがみ": {
    "手紙": 0
  },
  "てんき": {
    "天気": 1
  },
  "でんしゃ": {
    "電車": 0
  },
  "でんわ": {
    "電話": 0
  },
  "ともだち": {
    "友達": 0
  },
  "とり": {
    "鳥": 0
  },
  "なまえ": {
    "名前": 0
  },
  "にく": {
    "肉": 2
  },
  "ねこ": {
    "猫": 1
  },
  "のみもの": {
    "飲み物": 3
  },
  "はし": {
    "橋": 2,
    "箸": 1
  },
  "はな": {
    "花": 2
  },
  "ばんごはん": {
    "晩ごはん": 3
  },
  "ひるごはん": {
    "昼ごはん": 3
  },
  "ふるい": {
    "古い": 2
  },
  "へや": {
    "部屋": 2
  },
  "ほてる": {
    "ホテル": 1
  },
  "ほん": {
    "本": 1
  },
  "みず": {
    "水": 0
  },
  "みち": {
    "道": 0
  },
  "むずかしい": {
    "難しい": 4
  },
  "やさい": {
    "野菜": 0
  },
  "やさしい": {
    "易しい": 0
  },
  "やすい": {
    "安い": 2
  },
  "やま": {
    "山": 2
  },
  "ゆき": {
    "雪": 2
  },
  "りょこう": {
    "旅行": 0
  }
};

export const PITCH_NOTES: Record<string, Record<string, string>> = {
  "あめ": {
    "雨": "Minimal pair with 飴 (あめ, sweet) which is heiban [0].",
    "飴": "Minimal pair with 雨 (あめ, rain) which is [1]."
  },
  "かき": {
    "柿": "Minimal pair with 牡蠣 (かき, oyster) which is [1]."
  },
  "かみ": {
    "神": "Minimal pair with 紙 (かみ, paper) which is [2].",
    "紙": "Minimal pair with 神 (かみ, god) which is [1]."
  },
  "はし": {
    "橋": "Three-way pair: 箸 [1], 橋 [2], 端 [0].",
    "箸": "Three-way pair: 箸 [1], 橋 [2], 端 [0]."
  },
  "はな": {
    "花": "Compare 鼻 (はな, nose) which is heiban [0]."
  }
};
