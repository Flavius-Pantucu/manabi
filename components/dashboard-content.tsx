"use client";

import { useLearning } from "@/lib/learning-context";
import { useAppSelector } from "@/lib/store/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  BookOpen,
  Languages,
  GraduationCap,
  TrendingUp,
  Target,
  Clock,
  Star,
  ArrowRight,
  Sparkles,
  FileText,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { SrsPanel } from "@/components/srs-panel";
import { useContent } from "@/lib/content/provider";
import { useLanguage } from "@/lib/language-context";

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

export function DashboardContent() {
  const { language } = useLanguage();
  const { manifest } = useContent();
  const cards = useAppSelector((st) => st.srs?.cards);
  const {
    streak,
    wordsLearned,
    learnedToday,
    dailyGoal,
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

  const [greeting, setGreeting] = useState(japaneseGreetings[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const pool = language === "es" ? spanishGreetings : japaneseGreetings;
    setGreeting(pool[Math.floor(Math.random() * pool.length)]);
  }, [language]);

  // Totals come from the content manifest rather than a bundled array, so the
  // dashboard reports the real corpus size without downloading it.
  const categories = useMemo(() => {
    const t = manifest?.levels;
    const sum = (k: "vocab" | "kanji" | "verbs" | "grammar") =>
      t ? Object.values(t).reduce((a, l) => a + l[k], 0) : 0;
    const pre = language === "es" ? "es:" : "";
    const done = (prefix: string) =>
      Object.entries(cards ?? {}).filter(
        ([id, c]) => id.startsWith(`${pre}${prefix}`) && c.phase === "review",
      ).length;

    const all = [
      { label: "Vocabulary", labelJp: language === "es" ? "Vocabulario" : "語彙", progress: done("vocab:"), total: sum("vocab") * 2, href: "/vocabulary", icon: BookOpen },
      ...(language === "ja" ? [{ label: "Kanji", labelJp: "漢字", progress: done("kanji:"), total: sum("kanji") * 2, href: "/kanji", icon: Star }] : []),
      { label: "Verbs", labelJp: language === "es" ? "Verbos" : "動詞", progress: done("verb:"), total: sum("verbs") * 7, href: "/verbs", icon: Languages },
      { label: "Grammar", labelJp: language === "es" ? "Gramática" : "文法", progress: done("grammar:"), total: sum("grammar"), href: "/grammar", icon: Sparkles },
    ];
    return all;
  }, [manifest, cards, language]);

  const recentActivities = Array.isArray(activityLog)
    ? activityLog.slice(0, 4)
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Welcome & Daily Goal Header ───────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-e1 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            <span lang="ja" className="font-jp text-foreground">
              {greeting.jp}
            </span>
            <span className="mx-1.5 opacity-50">·</span>
            <span>{greeting.en}</span>
          </p>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Your learning journey continues today.
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Daily goal ring */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card-muted/60 px-3.5 py-2.5">
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
              <p className="text-[11px] text-muted-foreground">
                {learnedToday >= dailyGoal
                  ? "Goal reached"
                  : `${dailyGoal - learnedToday} to go`}
              </p>
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

      {/* Primary Daily Action */}
      <SrsPanel />

      {/* Main Workspace Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Quick Study + Curriculum Progress */}
        <div className="flex flex-col gap-6 lg:col-span-8">
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
          {/* Compact Stats Summary */}
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

          {/* Recent Activity */}
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
    </div>
  );
}
