"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  BookOpen,
  Languages,
  BookText,
  PenLine,
  FileText,
  HelpCircle,
  Search,
  User,
  Repeat,
  Shapes,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContent } from "@/lib/content/provider";

const pages = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, section: "Pages" },
  { label: "Review — everything due today", href: "/review", icon: Repeat, section: "Pages" },
  { label: "Kana — hiragana & katakana", href: "/kana", icon: Shapes, section: "Pages" },
  { label: "Vocabulary", href: "/vocabulary", icon: BookText, section: "Pages" },
  { label: "Grammar", href: "/grammar", icon: BookOpen, section: "Pages" },
  { label: "Kanji", href: "/kanji", icon: PenLine, section: "Pages" },
  { label: "Verbs", href: "/verbs", icon: Languages, section: "Pages" },
  { label: "Reading", href: "/reading", icon: FileText, section: "Pages" },
  { label: "Quiz", href: "/quiz", icon: HelpCircle, section: "Pages" },
  { label: "Progress & settings", href: "/progress", icon: TrendingUp, section: "Pages" },
  { label: "Profile", href: "/profile", icon: User, section: "Pages" },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Toggle ⌘K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router],
  );

  // Search runs over whatever the content provider has loaded — the levels
  // the learner is actually studying. It never pulls the whole corpus into
  // memory just to power a search box.
  const { levels } = useContent();

  const vocabItems = useMemo(
    () =>
      levels.flatMap((l) => l.vocab).slice(0, 400).map((w) => ({
        id: w.id,
        label: w.word === w.reading ? w.word : `${w.word} (${w.reading})`,
        detail: w.meaning,
        href: "/vocabulary",
      })),
    [levels],
  );

  const kanjiItems = useMemo(
    () =>
      levels.flatMap((l) => l.kanji).slice(0, 400).map((k) => ({
        id: k.id,
        label: k.character,
        detail: k.meanings.slice(0, 3).join(", "),
        href: "/kanji",
      })),
    [levels],
  );

  const grammarItems = useMemo(
    () =>
      levels.flatMap((l) => l.grammar).map((g) => ({
        id: g.id,
        label: g.pattern,
        detail: g.meaning,
        href: "/grammar",
      })),
    [levels],
  );

  const verbItems = useMemo(
    () =>
      levels.flatMap((l) => l.verbs).slice(0, 400).map((v) => ({
        id: v.id,
        label: `${v.dictionary} (${v.reading})`,
        detail: v.meaning,
        href: "/verbs",
      })),
    [levels],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/55 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />

      {/* Command palette */}
      <div className="absolute left-1/2 top-[15%] -translate-x-1/2 w-full max-w-lg px-4">
        <Command
          className="overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
          loop
        >
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Search vocabulary, kanji, grammar, verbs..."
              className="flex h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Pages */}
            <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {pages.map((page) => (
                <Command.Item
                  key={page.href}
                  value={page.label}
                  onSelect={() => navigate(page.href)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <page.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{page.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Vocabulary */}
            <Command.Group heading="Vocabulary" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {vocabItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.detail}`}
                  onSelect={() => navigate(item.href)}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {item.detail}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Kanji */}
            <Command.Group heading="Kanji" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {kanjiItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.detail}`}
                  onSelect={() => navigate(item.href)}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <span className="text-lg font-bold">{item.label}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {item.detail}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Grammar */}
            <Command.Group heading="Grammar" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {grammarItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.detail}`}
                  onSelect={() => navigate(item.href)}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {item.detail}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Verbs */}
            <Command.Group heading="Verbs" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {verbItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.detail}`}
                  onSelect={() => navigate(item.href)}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {item.detail}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Navigate with ↑↓ · Enter to select</span>
            <span className="hidden sm:inline">
              ⌘K to toggle
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
