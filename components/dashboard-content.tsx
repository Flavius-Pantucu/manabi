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
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { SrsPanel } from "@/components/srs-panel";
import { useContent } from "@/lib/content/provider";

const quickStudy = [
  {
    label: "Flashcards",
    labelJp: "フラッシュカード",
    desc: "Review vocabulary with flip cards",
    href: "/vocabulary",
    tile: "bg-primary-tint text-primary",
  },
  {
    label: "Grammar",
    labelJp: "文法",
    desc: "Study sentence patterns",
    href: "/grammar",
    tile: "bg-ai/12 text-ai",
  },
  {
    label: "Reading",
    labelJp: "読解",
    desc: "Practice with graded passages",
    href: "/reading",
    tile: "bg-matsuba/12 text-matsuba",
  },
  {
    label: "Quiz",
    labelJp: "クイズ",
    desc: "Test your knowledge",
    href: "/quiz",
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

export function DashboardContent() {
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
    kanjiStatus,
    bookmarkedGrammar,
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
    setGreeting(
      japaneseGreetings[Math.floor(Math.random() * japaneseGreetings.length)],
    );
  }, []);

  // Totals come from the content manifest rather than a bundled array, so the
  // dashboard reports the real corpus size without downloading it.
  const categories = useMemo(() => {
    const t = manifest?.levels;
    const sum = (k: "vocab" | "kanji" | "verbs" | "grammar") =>
      t ? Object.values(t).reduce((a, l) => a + l[k], 0) : 0;
    const done = (prefix: string) =>
      Object.entries(cards ?? {}).filter(
        ([id, c]) => id.startsWith(prefix) && c.phase === "review",
      ).length;

    return [
      { label: "Vocabulary", labelJp: "語彙", progress: done("vocab:"), total: sum("vocab") * 2, href: "/vocabulary", icon: BookOpen },
      { label: "Kanji", labelJp: "漢字", progress: done("kanji:"), total: sum("kanji") * 2, href: "/kanji", icon: Star },
      { label: "Verbs", labelJp: "動詞", progress: done("verb:"), total: sum("verbs") * 8, href: "/verbs", icon: Languages },
      { label: "Grammar", labelJp: "文法", progress: done("grammar:"), total: sum("grammar"), href: "/grammar", icon: Sparkles },
    ];
  }, [manifest, cards]);

  const safeVocab = vocabStatus && typeof vocabStatus === "object" ? vocabStatus : {};
  const reviewWordsCount = Object.values(safeVocab).filter(
    (s) => s === "review" || s === "difficult"
  ).length;
  const recentActivities = Array.isArray(activityLog) ? activityLog.slice(0, 4) : [];

  return (
    <div className="flex flex-col gap-6 -mt-6 md:-mt-8">
      {/* ── Hero ────────────────────────────────────────────────────────────
          The photograph is editorial here, so it keeps its full strength in
          the upper band and is scrimmed to near-solid where the type sits.
          Previously the headline, the greeting and the "N more to go" line all
          rendered directly over cherry blossom at 60% — muted-foreground on
          those pale pink pixels measured under 2:1. */}
      <div className="relative -mx-4 overflow-hidden md:-mx-8 md:rounded-2xl">
        <div className="relative h-56 md:h-72">
          <Image
            src="/images/hero-japan.jpg"
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 64rem"
            className="object-cover object-[50%_35%]"
            priority
          />

          {/* Scrim. Solid under the type, clearing upward so the image reads. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-background from-42% via-background/88 via-62% to-background/25"
          />

          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  <span lang="ja" className="font-jp">
                    {greeting.jp}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {greeting.en}
                  </span>
                </p>
                <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
                  Your Japanese journey
                  <br />
                  continues today.
                </h1>

                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="relative flex size-12 shrink-0 items-center justify-center"
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
                        className="text-border-strong"
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
                  <p className="text-sm text-muted-foreground">
                    <span
                      data-numeric
                      className="font-semibold text-foreground"
                    >
                      {learnedToday}/{dailyGoal}
                    </span>{" "}
                    today
                    {learnedToday >= dailyGoal
                      ? " — goal reached."
                      : ` — ${dailyGoal - learnedToday} to go.`}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl border border-border bg-card px-4 py-3 shadow-e1">
                <Flame className="size-5 text-shu" aria-hidden="true" />
                <span
                  data-numeric
                  className="text-2xl font-semibold leading-none text-foreground"
                >
                  {streak}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  day streak
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The daily loop. Everything else on this page is context; this is the
          thing the learner actually came to do. */}
      <SrsPanel />

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-3 md:gap-4">
        <Link href="/vocabulary" className="group">
          <Card className="relative overflow-hidden gap-0 py-4 transition-[transform,box-shadow,border-color] duration-(--dur-2) ease-(--ease-out-expo) group-hover:-translate-y-0.5 group-hover:border-primary group-hover:shadow-e3">
            <CardContent className="flex flex-col items-center gap-1.5 px-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                <BookOpen className="size-5 text-primary" />
              </div>
              <p data-numeric className="text-2xl font-semibold text-foreground transition-colors group-hover:text-primary">
                {mounted ? Object.keys(vocabStatus).length : wordsLearned}
              </p>
              <div className="flex items-center gap-1 group-hover:text-primary transition-colors">
                <p className="text-xs text-muted-foreground group-hover:text-primary">
                  Words
                </p>
                <ArrowRight className="size-3 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/verbs" className="group">
          <Card className="relative overflow-hidden gap-0 py-4 transition-[transform,box-shadow,border-color] duration-(--dur-2) ease-(--ease-out-expo) group-hover:-translate-y-0.5 group-hover:border-matsuba group-hover:shadow-e3">
            <CardContent className="flex flex-col items-center gap-1.5 px-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-matsuba/12 transition-transform duration-300 group-hover:scale-110">
                <Languages className="size-5 text-matsuba" />
              </div>
              <p data-numeric className="text-2xl font-semibold text-foreground transition-colors group-hover:text-matsuba">
                {verbsMastered}
              </p>
              <div className="flex items-center gap-1 group-hover:text-matsuba transition-colors">
                <p className="text-xs text-muted-foreground group-hover:text-matsuba/80">
                  Verbs
                </p>
                <ArrowRight className="size-3 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/grammar" className="group">
          <Card className="relative overflow-hidden gap-0 py-4 transition-[transform,box-shadow,border-color] duration-(--dur-2) ease-(--ease-out-expo) group-hover:-translate-y-0.5 group-hover:border-shu group-hover:shadow-e3">
            <CardContent className="flex flex-col items-center gap-1.5 px-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-shu/12 transition-transform duration-300 group-hover:scale-110">
                <GraduationCap className="size-5 text-shu" />
              </div>
              <p data-numeric className="text-2xl font-semibold text-foreground transition-colors group-hover:text-shu">
                {lessonsCompleted}
              </p>
              <div className="flex items-center gap-1 group-hover:text-shu transition-colors">
                <p className="text-xs text-muted-foreground group-hover:text-shu/80">
                  Lessons
                </p>
                <ArrowRight className="size-3 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Study Cards */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-3">
          {"Quick Study"}{" "}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            {"クイックスタディ"}
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickStudy.map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 gap-0 py-4">
                <CardContent className="flex flex-col gap-2 px-4">
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${item.tile}`}
                  >
                    <span className="text-lg font-bold">
                      {item.labelJp.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Progress & Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Category Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" />
              {"Progress"}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {"進捗"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {categories.map((cat) => {
              const pct = Math.round((cat.progress / cat.total) * 100);
              return (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="group flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <cat.icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {cat.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {cat.labelJp}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-primary" />
              {"Activity"}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {"活動"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity yet. Start learning!
              </p>
            ) : (
              recentActivities.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Star className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.action}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
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

      {/* Bottom CTA Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quiz Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              {"Quiz Score"}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {"テスト"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-secondary"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeDasharray={`${(avgScore / 100) * 213.6} 213.6`}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-700"
                  />
                </svg>
                <span className="absolute text-xl font-bold text-primary">
                  {avgScore}%
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">
                  Average Score
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on {quizScores.length} quizzes
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

        {/* Daily Review */}
        <Card className="relative overflow-hidden border-primary/20">
          <div className="absolute top-0 right-0 opacity-5" aria-hidden="true">
            <svg viewBox="0 0 120 120" className="size-32">
              <text
                x="50%"
                y="55%"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="72"
                fill="currentColor"
                className="text-primary"
              >
                {"復"}
              </text>
            </svg>
          </div>
          <CardHeader>
            <CardTitle className="text-base text-foreground">
              {"Daily Review"}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {"復習"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {reviewWordsCount > 0
                ? `${reviewWordsCount} word${reviewWordsCount !== 1 ? "s" : ""} ${reviewWordsCount !== 1 ? "are" : "is"} marked for review. Keep your streak alive!`
                : "You're all caught up! Start learning new words or take a quiz."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/vocabulary"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors min-h-[44px]"
              >
                Review Words
              </Link>
              <Link
                href="/grammar"
                className="inline-flex h-10 items-center rounded-lg bg-secondary px-5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors min-h-[44px]"
              >
                Review Grammar
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
