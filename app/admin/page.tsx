"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Database,
  FileJson,
  BookText,
  PenLine,
  Languages,
  BookOpen,
  FileText,
  ExternalLink,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useContent } from "@/lib/content/provider";
import { LEVELS, type Level } from "@/lib/content/types";

/**
 * Content inventory.
 *
 * This page used to be a CRUD editor over bundled arrays: it let an admin
 * "edit" vocabulary in React state that was discarded on refresh and could
 * never reach a learner. Now that content is 4 MB of static JSON generated
 * from KANJIDIC2, JMdict and KanjiVG, a browser cannot write it at all — so
 * the page reports what is actually shipped and where it came from, instead of
 * pretending to be an editor.
 */

const KINDS = [
  {
    key: "vocab",
    label: "Vocabulary",
    jp: "語彙",
    icon: BookText,
    tone: "text-sakura",
  },
  {
    key: "kanji",
    label: "Kanji",
    jp: "漢字",
    icon: PenLine,
    tone: "text-fuji",
  },
  {
    key: "verbs",
    label: "Verbs",
    jp: "動詞",
    icon: Languages,
    tone: "text-matsuba",
  },
  {
    key: "grammar",
    label: "Grammar",
    jp: "文法",
    icon: BookOpen,
    tone: "text-ai",
  },
  {
    key: "reading",
    label: "Reading",
    jp: "読解",
    icon: FileText,
    tone: "text-shu",
  },
] as const;

const SOURCES = [
  {
    name: "KANJIDIC2",
    what: "Kanji readings, meanings, stroke counts, grade and frequency",
    licence:
      "CC BY-SA 4.0 — Electronic Dictionary Research and Development Group",
    href: "https://www.edrdg.org/wiki/index.php/KANJIDIC_Project",
  },
  {
    name: "JMdict",
    what: "Part of speech and additional glosses for vocabulary",
    licence:
      "CC BY-SA 4.0 — Electronic Dictionary Research and Development Group",
    href: "https://www.edrdg.org/jmdict/j_jmdict.html",
  },
  {
    name: "KanjiVG",
    what: "Stroke-order paths for all 2,211 kanji",
    licence: "CC BY-SA 3.0 — Ulrich Apel",
    href: "https://kanjivg.tagaini.net",
  },
  {
    name: "kanji-data",
    what: "Current N5–N1 level assignments and radical components",
    licence: "MIT — David Luz Gouveia",
    href: "https://github.com/davidluzgouveia/kanji-data",
  },
  {
    name: "open-anki-jlpt-decks",
    what: "JLPT-tagged vocabulary lists",
    licence: "MIT — Jam Sinclair",
    href: "https://github.com/jamsinclair/open-anki-jlpt-decks",
  },
  {
    name: "Authored for Manabi",
    what: "155 grammar points, 13 reading passages, kana mnemonics, verified pitch accent",
    licence: "Part of this project",
    href: null,
  },
];

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { manifest } = useContent();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) router.replace("/");
  }, [user, isLoading, router]);

  const totals = useMemo(() => {
    if (!manifest) return null;
    const t = { vocab: 0, kanji: 0, verbs: 0, grammar: 0, reading: 0 };
    for (const l of Object.values(manifest.levels)) {
      t.vocab += l.vocab;
      t.kanji += l.kanji;
      t.verbs += l.verbs;
      t.grammar += l.grammar;
      t.reading += l.reading;
    }
    return t;
  }, [manifest]);

  if (isLoading || !user || user.role !== "admin") return null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShieldCheck className="size-5 text-primary" />
          Content inventory
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          What ships in this build, per JLPT level, and where each dataset came
          from.
        </p>
      </header>

      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          Content is generated at build time into{" "}
          <code className="font-mono text-xs">public/data/</code> and served as
          static files, so it cannot be edited from the browser. Regenerate it
          from the build scripts to change what learners see.
        </span>
      </p>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {KINDS.map((k) => (
          <Card key={k.key}>
            <CardContent className="flex flex-col items-center gap-1 py-5 text-center">
              <k.icon className={cn("size-5", k.tone)} />
              <span
                data-numeric
                className="text-2xl font-semibold text-foreground"
              >
                {totals ? totals[k.key].toLocaleString() : "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {k.label}{" "}
                <span lang="ja" className="font-jp">
                  {k.jp}
                </span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4 text-muted-foreground" />
            By level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-strong">
                  <th className="py-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Level
                  </th>
                  {KINDS.map((k) => (
                    <th
                      key={k.key}
                      className="py-2 pl-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {k.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((lv: Level) => {
                  const row = manifest?.levels[lv];
                  return (
                    <tr
                      key={lv}
                      className="border-b border-border last:border-0"
                    >
                      <th
                        scope="row"
                        className="py-2 pr-4 text-left font-semibold text-foreground"
                      >
                        {lv}
                      </th>
                      {KINDS.map((k) => (
                        <td
                          key={k.key}
                          data-numeric
                          className="py-2 pl-4 text-right text-foreground"
                        >
                          {row ? row[k.key].toLocaleString() : "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t border-border-strong">
                  <th
                    scope="row"
                    className="py-2 pr-4 text-left font-semibold text-foreground"
                  >
                    Total
                  </th>
                  {KINDS.map((k) => (
                    <td
                      key={k.key}
                      data-numeric
                      className="py-2 pl-4 text-right font-semibold text-foreground"
                    >
                      {totals ? totals[k.key].toLocaleString() : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileJson className="size-4 text-muted-foreground" />
            Sources &amp; licences
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            The dictionary data is redistributed under Creative Commons
            Attribution-ShareAlike, which requires that this derived data carry
            the same terms. Attribution is shipped in{" "}
            <code className="font-mono text-xs">
              public/data/ATTRIBUTION.md
            </code>
            .
          </p>
          <ul className="flex flex-col gap-2">
            {SOURCES.map((s) => (
              <li
                key={s.name}
                className="rounded-lg border border-border px-3 py-2.5"
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {s.name}
                  {s.href && (
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="size-3.5" />
                      <span className="sr-only">Open {s.name}</span>
                    </a>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{s.what}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.licence}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Looking for your own study data?{" "}
        <Link
          href="/progress"
          className="text-primary underline underline-offset-2"
        >
          Progress &amp; settings
        </Link>{" "}
        has retention, the review forecast, and export.
      </p>
    </div>
  );
}
