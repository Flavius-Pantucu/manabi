# ⛩️ Manabi — Learn Japanese

A spaced-repetition platform for Japanese: kana, kanji with stroke order,
vocabulary with pitch accent, verb conjugation drilling, grammar, reading and
quizzes — scheduled by how close you are to forgetting each item.

## ✨ What it does

**Spaced repetition at the centre.** An FSRS-style scheduler models each card's
*stability* (how long the memory lasts) and *difficulty*, and shows it when
recall is predicted to have decayed to 90%. Reviewing a card just as it starts
to slip is what makes it stick; a fixed daily list is not.

- **Kana first** — all 104 syllables (gojūon, dakuten, yōon) with shape
  mnemonics and drills that use *confusable* look-alikes as distractors, so
  し/つ and ソ/ン are practised against each other rather than against random kana.
- **Stroke order** — animated, traced in the true drawing direction, from
  KanjiVG data. All 2,211 JLPT kanji.
- **Pitch accent** — contour diagrams with the following particle shown, so
  heiban and odaka are distinguishable. Includes minimal pairs (雨/飴, 箸/橋).
- **Production, not just recognition** — type answers in romaji and they become
  kana as you go; verbs are drilled across seven conjugated forms rather than
  displayed in a table.
- **One review queue** across every deck, ordered learning → most-overdue → new,
  with new cards capped per day and woven through the session.
- **Progress that means something** — true retention, a 30-day forecast,
  maturity breakdown, and a leech list of cards that keep lapsing.
- **Works offline** — a service worker caches the shell and data; progress is
  local, so a full review session needs no network.
- **Export / import** — progress is a JSON file you own. Import merges rather
  than overwrites.

## 🛠️ Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4, `shadcn/ui`
- **State:** Redux Toolkit + `redux-persist`
- **Icons:** Lucide

## 🚀 Getting started

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

### Admin access

Auth is a local demo — there is no backend. Admin is gated on an explicit
allow-list rather than granted to everyone:

```bash
# .env.local
NEXT_PUBLIC_ADMIN_EMAILS=you@example.com
```

With the variable unset, no account is an administrator.

## 📚 Content

Every JLPT level, N5 through N1.

| Level | Vocabulary | Kanji | Verbs | Grammar | Reading |
|---|---:|---:|---:|---:|---:|
| N5 | 713 | 79 | 108 | 32 | 4 |
| N4 | 663 | 166 | 156 | 30 | 3 |
| N3 | 2,136 | 367 | 384 | 32 | 2 |
| N2 | 1,788 | 367 | 242 | 30 | 2 |
| N1 | 2,696 | 1,232 | 327 | 31 | 2 |
| **Total** | **7,996** | **2,211** | **1,217** | **155** | **13** |

Plus 104 kana. That is **30,052 review cards** — every id unique and derived
from the content itself, so scheduling survives dataset edits.

### How it is built and served

Content is generated at build time into `public/data/` and fetched **per level,
per kind, on demand**. The full corpus is ~3.9 MB; a learner starting at N5
downloads about 190 KB. Nothing is bundled into the JS except the 104 kana,
which have to be there before any network request resolves.

- **Kanji** — readings, meanings, stroke counts, grade and frequency from
  KANJIDIC2; N5–N1 assignment and radical components from `kanji-data`; stroke
  paths from KanjiVG. Stroke counts are taken from the KanjiVG paths themselves,
  so the number on screen always matches the strokes the animation draws.
- **Vocabulary** — JLPT-tagged lists enriched with JMdict part of speech and
  glosses. Source decks pack alternatives into single fields (`いい; よい`,
  `結婚 けっこん (する)`); those are split during the build, because a recall
  drill cannot ask you to type a semicolon.
- **Verbs** — conjugations are *generated* from the dictionary form and verb
  group by the godan/ichidan rules, including て-form sound changes and the 行く
  irregularity. The generator was validated against hand-written reference
  entries before being applied to the full set. Nine rare *zuru* verbs are
  skipped rather than mis-conjugated.
- **Grammar and reading** — authored for this project; there is no open dataset
  worth using.
- **Quizzes** — generated from the loaded level, with distractors drawn from the
  same category, so no two quizzes are alike and elimination doesn't work.

Pitch accent is populated only where verified against a source. Entries without
it render no contour rather than guessing: a wrong pattern is worse than none,
because it is expensive to unlearn.

## 🎨 Design

Palette is a 桜 sakura ramp on a 和紙 washi ground, with five traditional
pigments (藍 ai, 松葉 matsuba, 朱 shu, 藤 fuji, 金茶 kincha) that hold their hue
across light and dark and only move in lightness. Every foreground/background
pair in `app/globals.css` is verified against WCAG 2.1 AA — text ≥ 4.5:1, UI
boundaries and focus rings ≥ 3:1 — and the ratios are noted inline beside the
tokens.

## 🔮 Roadmap

- Backend accounts so progress syncs across devices.
- Recorded native audio; speech synthesis is a fallback and is absent on some
  platforms (the UI says so rather than failing silently).
- Pitch accent for the full vocabulary set from a citable source (OJAD / NHK).
- Handwriting input graded against stroke order.
- More reading passages and sentence-level mining.

## 📄 Licence & attribution

Stroke-order data is derived from [KanjiVG](https://kanjivg.tagaini.net)
© Ulrich Apel, CC BY-SA 3.0 — see `public/data/KANJIVG-LICENSE`. That data is
redistributed here under the same Attribution-ShareAlike terms.

The application itself is open source.
