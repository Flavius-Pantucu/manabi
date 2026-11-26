"use client";

import { useLearning } from "@/lib/learning-context";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { gradeCard } from "@/lib/store/features/srs-slice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame,
  BookOpen,
  Languages,
  TrendingUp,
  Target,
  Clock,
  Star,
  ArrowRight,
  Sparkles,
  FileText,
  HelpCircle,
  Eye,
  EyeOff,
  Shuffle,
  Check,
  BookmarkPlus,
  Minus,
  Plus,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { SrsPanel } from "@/components/srs-panel";
import { useContent } from "@/lib/content/provider";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useAuthPrompt } from "@/components/app-shell";
import { PlacementDialog } from "@/components/placement-dialog";
import { SpeakButton } from "@/components/speak-button";
import type { Level } from "@/lib/content/types";

const quickStudy = [
  {
    label: "Flashcards",
    desc: "Review vocabulary with flip cards",
    href: "/vocabulary",
    icon: BookOpen,
    tile: "bg-primary-tint text-primary",
  },
  {
    label: "Grammar",
    desc: "Study sentence patterns",
    href: "/grammar",
    icon: Sparkles,
    tile: "bg-ai/12 text-ai",
  },
  {
    label: "Reading",
    desc: "Practice with graded passages",
    href: "/reading",
    icon: FileText,
    tile: "bg-matsuba/12 text-matsuba",
  },
  {
    label: "Quiz",
    desc: "Test your knowledge",
    href: "/quiz",
    icon: HelpCircle,
    tile: "bg-fuji/12 text-fuji",
  },
];

function formatActivityTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const japaneseGreetings = [
  { jp: "おかえり", en: "Welcome back" },
  { jp: "がんばって", en: "Do your best" },
  { jp: "すごい", en: "Amazing" },
  { jp: "よくできました", en: "Well done" },
];

const spanishGreetings = [
  { jp: "¡Bienvenido!", en: "Welcome back" },
  { jp: "¡Ánimo!", en: "Keep it up" },
  { jp: "¡Excelente!", en: "Amazing" },
  { jp: "¡Muy bien!", en: "Well done" },
];

const frenchGreetings = [
  { jp: "Bonjour !", en: "Welcome back" },
  { jp: "Bon courage !", en: "Keep it up" },
  { jp: "Magnifique !", en: "Amazing" },
  { jp: "Très bien !", en: "Well done" },
];

export function DashboardContent() {
  const { language, formatLevel } = useLanguage();
  const { user } = useAuth();
  const { openLogin } = useAuthPrompt();
  const { manifest, levels } = useContent();
  const dispatch = useAppDispatch();
  const cards = useAppSelector((st) => st.srs?.cards);
  const activeLevels = useAppSelector((st) => st.srs?.settings?.levels) as
    | Level[]
    | undefined;
  const {
    streak,
    wordsLearned,
    learnedToday,
    dailyGoal,
    setDailyGoal,
    verbsMastered,
    lessonsCompleted,
    quizScores,
    vocabStatus,
    activityLog,
  } = useLearning();
  const avgScore =
    quizScores.length > 0
      ? Math.round(
          quizScores.reduce((a, b) => a + b.score, 0) / quizScores.length,
        )
      : 0;

  const [greeting, setGreeting] = useState(spanishGreetings[0]);
  const [mounted, setMounted] = useState(false);
  const [placementOpen, setPlacementOpen] = useState(false);
  const [placedLevel, setPlacedLevel] = useState<Level | null>(null);

  // Interactive spotlight flashcard state
  const [wordIdx, setWordIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [gradedFeedback, setGradedFeedback] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const pool =
      language === "es"
        ? spanishGreetings
        : language === "fr"
          ? frenchGreetings
          : japaneseGreetings;
    setGreeting(pool[Math.floor(Math.random() * pool.length)]);
    setWordIdx(0);
    setRevealed(false);
    setGradedFeedback(null);
    try {
      const saved = localStorage.getItem(`manabi.placement.${language}`) as Level | null;
      setPlacedLevel(saved);
    } catch {
      setPlacedLevel(null);
    }
  }, [language]);

  const spotlightPool = useMemo(
    () => levels.flatMap((l) => l.vocab),
    [levels],
  );
  const spotlightWord = spotlightPool.length
    ? spotlightPool[wordIdx % spotlightPool.length]
    : null;

  const handleNextWord = () => {
    if (!spotlightPool.length) return;
    setWordIdx((i) => (i + 1) % spotlightPool.length);
    setRevealed(false);
    setGradedFeedback(null);
  };

  const handleQuickGrade = (grade: 2 | 4) => {
    if (!spotlightWord) return;
    dispatch(gradeCard({ id: `${spotlightWord.id}:meaning`, grade }));
    setGradedFeedback(grade === 4 ? "Marked known" : "Added to review");
    window.setTimeout(() => {
      handleNextWord();
    }, 550);
  };

  const categories = useMemo(() => {
    const t = manifest?.levels;
    const sum = (k: "vocab" | "kanji" | "verbs" | "grammar") =>
      t ? Object.values(t).reduce((a, l) => a + l[k], 0) : 0;
    const pre = language === "ja" ? "" : `${language}:`;
    const done = (prefix: string) =>
      Object.entries(cards ?? {}).filter(
        ([id, c]) => id.startsWith(`${pre}${prefix}`) && c.phase === "review",
      ).length;

    return [
      {
        label: "Vocabulary",
        labelJp:
          language === "es"
            ? "Vocabulario"
            : language === "fr"
              ? "Vocabulaire"
              : "語彙",
        progress: done("vocab:"),
        total: sum("vocab") * 2,
        href: "/vocabulary",
        icon: BookOpen,
      },
      ...(language === "ja"
        ? [
            {
              label: "Kanji",
              labelJp: "漢字",
              progress: done("kanji:"),
              total: sum("kanji") * 2,
              href: "/kanji",
              icon: Star,
            },
          ]
        : []),
      {
        label: "Verbs",
        labelJp:
          language === "es" ? "Verbos" : language === "fr" ? "Verbes" : "動詞",
        progress: done("verb:"),
        total: sum("verbs") * 7,
        href: "/verbs",
        icon: Languages,
      },
      {
        label: "Grammar",
        labelJp:
          language === "es"
            ? "Gramática"
            : language === "fr"
              ? "Grammaire"
              : "文法",
        progress: done("grammar:"),
        total: sum("grammar"),
        href: "/grammar",
        icon: Sparkles,
      },
    ];
  }, [manifest, cards, language]);

  const recentActivities = Array.isArray(activityLog)
    ? activityLog.slice(0, 4)
    : [];

  const langLabel =
    language === "es" ? "Spanish" : language === "fr" ? "French" : "Japanese";

  return (
    <div className="flex flex-col gap-6">
      {/* ── Welcome & Interactive Daily Goal Header ───────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-e1 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            <span lang={language} className={language === "ja" ? "font-jp text-foreground" : "text-foreground"}>
              {greeting.jp}
            </span>
            <span className="opacity-50">·</span>
            <span>{greeting.en}</span>
            {activeLevels?.length ? (
              <Badge variant="secondary" className="ml-1 px-2 py-0 text-[10px]">
                Scope: {activeLevels.map(formatLevel).join(", ")}
              </Badge>
            ) : null}
          </div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Your {langLabel} workspace.
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Interactive Daily goal ring */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card-muted/60 px-3.5 py-2">
            <div
              className="relative flex size-10 shrink-0 items-center justify-center"
              role="img"
              aria-label={`Daily goal: ${learnedToday} of ${dailyGoal} items reviewed`}
            >
              <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9"
                  className="text-border"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9"
                  strokeDasharray={`${Math.min(learnedToday / dailyGoal, 1) * 213.6} 213.6`}
                  strokeLinecap="round"
                  className="text-primary transition-[stroke-dasharray] duration-(--dur-4) ease-(--ease-out-expo)"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground" data-numeric>
                {learnedToday}/{dailyGoal}
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDailyGoal(Math.max(5, dailyGoal - 5))}
                  aria-label="Decrease daily goal"
                  className="flex size-5 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:text-foreground"
                >
                  <Minus className="size-3" />
                </button>
                <span className="text-[10px] text-muted-foreground">goal</span>
                <button
                  type="button"
                  onClick={() => setDailyGoal(Math.min(50, dailyGoal + 5))}
                  aria-label="Increase daily goal"
                  className="flex size-5 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card-muted/60 px-4 py-2">
            <div className="flex items-center gap-1">
              <Flame className="size-4 text-shu" aria-hidden="true" />
              <span
                data-numeric
                className="text-lg font-semibold leading-none text-foreground"
              >
                {streak}
              </span>
            </div>
            <span className="mt-1 text-[11px] font-medium text-muted-foreground">
              day streak
            </span>
          </div>
        </div>
      </div>

      {/* Placement / Skip Ahead Card (for logged-in learners, or sign-in prompt) */}
      <Card className="border-primary/25 bg-primary-tint/50">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Compass className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {user
                  ? placedLevel
                    ? `${langLabel} Placement: ${formatLevel(placedLevel)}`
                    : `Already know some ${langLabel}?`
                  : `Personalize your ${langLabel} path`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {user
                  ? placedLevel
                    ? "Your review deck is tuned to your placement. Retake anytime to adjust."
                    : "Answer 4 quick questions to unlock higher tiers and skip material you already know."
                  : "Sign in to take a quick placement check, skip beginner tiers, and sync progress."}
              </p>
            </div>
          </div>
          {user ? (
            <Button
              type="button"
              size="sm"
              variant={placedLevel ? "outline" : "default"}
              onClick={() => setPlacementOpen(true)}
              className="shrink-0"
            >
              {placedLevel ? "Retake Check" : "Take Placement Check"}
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={openLogin}
              className="shrink-0"
            >
              Log in to Start
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Active SRS Queue (only shown once cards are started) */}
      <SrsPanel />

      {/* Main Workspace Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Interactive Word Spotlight + Quick Study + Curriculum Progress */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Interactive Quick Flashcard Widget */}
          {spotlightWord && (
            <Card className="border-border/90">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-primary" />
                  Quick Practice · {formatLevel(spotlightWord.level)}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <SpeakButton text={spotlightWord.word} size="sm" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleNextWord}
                    className="h-8 px-2 text-xs"
                  >
                    <Shuffle className="size-3.5" />
                    Next
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border bg-card-muted/50 p-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        lang={language}
                        className={
                          language === "ja"
                            ? "font-jp text-2xl font-semibold text-foreground"
                            : "text-2xl font-semibold text-foreground"
                        }
                      >
                        {spotlightWord.word}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {spotlightWord.partOfSpeech}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {spotlightWord.reading}
                    </p>
                    {revealed ? (
                      <p className="mt-2 text-sm font-medium text-primary">
                        {spotlightWord.meaning}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRevealed((r) => !r)}
                    className="shrink-0"
                  >
                    {revealed ? (
                      <>
                        <EyeOff className="size-3.5" /> Hide meaning
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5" /> Reveal meaning
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {gradedFeedback ?? "Rate this word to update your review deck"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickGrade(2)}
                    >
                      <BookmarkPlus className="size-3.5" />
                      Study later
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleQuickGrade(4)}
                    >
                      <Check className="size-3.5" />I know this
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Quick Study
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickStudy.map((item) => (
                <Link key={item.href} href={item.href} className="group">
                  <Card className="h-full gap-0 py-4 transition-[transform,box-shadow,border-color] duration-(--dur-2) ease-(--ease-out-expo) group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-e2">
                    <CardContent className="flex flex-col gap-2.5 px-4">
                      <div
                        className={`inline-flex size-9 items-center justify-center rounded-lg ${item.tile}`}
                      >
                        <item.icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                          {item.label}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {item.desc}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-primary" />
                Curriculum Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {categories.map((cat) => {
                const pct =
                  cat.total > 0
                    ? Math.round((cat.progress / cat.total) * 100)
                    : 0;
                return (
                  <Link
                    key={cat.label}
                    href={cat.href}
                    className="group flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <cat.icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                        <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                          {cat.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {cat.labelJp}
                        </span>
                      </div>
                      <span
                        data-numeric
                        className="text-xs font-medium text-muted-foreground"
                      >
                        {pct}%
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Stats + Quiz Score + Activity */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-primary" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/vocabulary"
                  className="group rounded-lg border border-border bg-card-muted/50 p-2.5 text-center transition-colors hover:border-primary/40"
                >
                  <p
                    data-numeric
                    className="text-lg font-semibold text-foreground group-hover:text-primary"
                  >
                    {mounted ? Object.keys(vocabStatus).length : wordsLearned}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Words</p>
                </Link>
                <Link
                  href="/verbs"
                  className="group rounded-lg border border-border bg-card-muted/50 p-2.5 text-center transition-colors hover:border-matsuba/50"
                >
                  <p
                    data-numeric
                    className="text-lg font-semibold text-foreground group-hover:text-matsuba"
                  >
                    {verbsMastered}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Verbs</p>
                </Link>
                <Link
                  href="/grammar"
                  className="group rounded-lg border border-border bg-card-muted/50 p-2.5 text-center transition-colors hover:border-shu/50"
                >
                  <p
                    data-numeric
                    className="text-lg font-semibold text-foreground group-hover:text-shu"
                  >
                    {lessonsCompleted}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Lessons</p>
                </Link>
              </div>

              <div className="flex items-center gap-4 border-t border-border pt-4">
                <div className="relative flex size-14 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="7"
                      className="text-secondary"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="7"
                      strokeDasharray={`${(avgScore / 100) * 213.6} 213.6`}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-700"
                    />
                  </svg>
                  <span
                    data-numeric
                    className="absolute text-sm font-bold text-primary"
                  >
                    {avgScore}%
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Quiz Average
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {quizScores.length} quiz{quizScores.length === 1 ? "" : "zes"} completed
                  </p>
                  <Link
                    href="/quiz"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Take a quiz
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {recentActivities.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No activity yet. Start learning!
                </p>
              ) : (
                recentActivities.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
                  >
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Star className="size-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.action}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {item.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatActivityTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PlacementDialog
        open={placementOpen}
        onOpenChange={setPlacementOpen}
        onComplete={(lv) => setPlacedLevel(lv)}
      />
    </div>
  );
}
