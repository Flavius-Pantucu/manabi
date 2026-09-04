"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  BookOpen,
  Languages,
  GraduationCap,
  LogOut,
  CalendarDays,
  Edit2,
  Check,
  X,
  TrendingUp,
  Star,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { useLearning } from "@/lib/learning-context";
import { AvatarBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sublabel?: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div
        className={cn(
          "absolute -right-3 -top-3 size-20 rounded-full opacity-10",
          accent,
        )}
      />
      <div
        className={cn(
          "mb-3 flex size-10 items-center justify-center rounded-xl",
          accent,
          "bg-opacity-15",
        )}
      >
        <Icon className={cn("size-5", accent.replace("bg-", "text-"))} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground/80">{label}</p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}

// ─── Quiz Score Chart ─────────────────────────────────────────────────────────

function QuizChart({ scores }: { scores: number[] }) {
  const data = scores.map((score, i) => ({
    quiz: `Quiz ${i + 1}`,
    score,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="size-5 text-primary" />
        <h3 className="font-semibold text-foreground">Quiz Performance</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {scores.length} quizzes taken
        </span>
      </div>
      {scores.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          No quiz scores yet. Take a quiz to see your progress!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="quiz"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(v: number) => [`${v}%`, "Score"]}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#scoreGrad)"
              dot={{ fill: "var(--color-primary)", r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Vocab Breakdown ──────────────────────────────────────────────────────────

function VocabBreakdown({
  vocabStatus,
}: {
  vocabStatus: Record<number, "learned" | "review" | "difficult">;
}) {
  const counts = { learned: 0, review: 0, difficult: 0 };
  const safeVocab = vocabStatus && typeof vocabStatus === "object" ? vocabStatus : {};
  Object.values(safeVocab).forEach((s) => counts[s]++);
  const total = counts.learned + counts.review + counts.difficult;

  const pieData = [
    { name: "Learned", value: counts.learned, color: "var(--color-chart-3)" },
    { name: "Review", value: counts.review, color: "var(--color-chart-2)" },
    {
      name: "Difficult",
      value: counts.difficult,
      color: "var(--color-chart-5)",
    },
  ].filter((d) => d.value > 0);

  const bars = [
    {
      label: "Learned",
      count: counts.learned,
      icon: Star,
      colorClass: "bg-success",
    },
    {
      label: "Review",
      count: counts.review,
      icon: RotateCcw,
      colorClass: "bg-warning",
    },
    {
      label: "Difficult",
      count: counts.difficult,
      icon: AlertCircle,
      colorClass: "bg-destructive",
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center gap-2">
        <BookOpen className="size-5 text-primary" />
        <h3 className="font-semibold text-foreground">Vocabulary Status</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {total} words tracked
        </span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Mark vocabulary words to see your breakdown here.
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          {/* Mini pie */}
          {pieData.length > 0 && (
            <div className="shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={52}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="var(--color-card)"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Progress bars */}
          <div className="flex flex-1 flex-col gap-2.5">
            {bars.map(({ label, count, icon: Icon, colorClass }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="w-16 text-xs text-muted-foreground">
                    {label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        colorClass,
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-medium text-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit Profile Sheet ───────────────────────────────────────────────────────

function EditProfileInline({ onDone }: { onDone: () => void }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const defaultAvatars = [
    { id: "shiba", url: "/avatars/shiba.png", label: "Shiba" },
    { id: "sakura", url: "/avatars/sakura.png", label: "Sakura" },
    { id: "daruma", url: "/avatars/daruma.png", label: "Daruma" },
    { id: "cat", url: "/avatars/cat.png", label: "Lucky Cat" },
  ];

  const handleSave = () => {
    updateUser({
      name: name.trim() || user!.name,
      email: email.trim() || user!.email,
    });
    onDone();
  };

  const handleAvatarSelect = (url: string) => {
    updateUser({ avatarUrl: url });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateUser({ avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Edit Profile</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDone}
          className="size-8 p-0"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-sm font-medium">
              Display Name
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/50"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-sm font-medium">Choose an Avatar</Label>
          <div className="flex flex-wrap gap-3">
            {defaultAvatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleAvatarSelect(avatar.url)}
                className={cn(
                  "relative size-14 rounded-xl overflow-hidden border-2 transition-all p-0.5",
                  user?.avatarUrl === avatar.url
                    ? "border-primary bg-primary/20 scale-105 shadow-lg"
                    : "border-transparent hover:border-primary/40 hover:scale-105",
                )}
              >
                <img
                  src={avatar.url}
                  alt={avatar.label}
                  className="h-full w-full object-cover rounded-lg"
                />
              </button>
            ))}
            <label className="relative size-14 rounded-xl overflow-hidden border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
              <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
                <Edit2 className="size-4" />
                <span>Upload</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={handleSave} className="gap-2 px-6">
          <Check className="size-4" /> Save Changes
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Level Badge ──────────────────────────────────────────────────────────────

function LevelBadge({ lessonsCompleted }: { lessonsCompleted: number }) {
  const levels = [
    {
      min: 0,
      label: "Beginner",
      jp: "初心者",
      color: "bg-panel-foreground/12 text-panel-foreground",
    },
    {
      min: 10,
      label: "Elementary",
      jp: "初級",
      color: "bg-ai/20 text-ai dark:text-ai",
    },
    {
      min: 25,
      label: "Intermediate",
      jp: "中級",
      color: "bg-fuji/20 text-fuji",
    },
    {
      min: 50,
      label: "Advanced",
      jp: "上級",
      color: "bg-kincha/20 text-kincha",
    },
  ];

  const level =
    [...levels].reverse().find((l) => lessonsCompleted >= l.min) ?? levels[0];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        level.color,
      )}
    >
      <GraduationCap className="size-3.5" />
      {level.label}{" "}
      <span lang="ja" className="font-jp opacity-80">
        · {level.jp}
      </span>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const {
    streak,
    wordsLearned,
    verbsMastered,
    lessonsCompleted,
    vocabStatus,
    quizScores,
  } = useLearning();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  // Redirect if not logged in (once loading resolves)
  useEffect(() => {
    if (!isLoading && !user) router.replace("/");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const avgScore =
    quizScores.length > 0
      ? Math.round(
          quizScores.reduce((a, b) => a + b.score, 0) / quizScores.length,
        )
      : 0;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="space-y-6 pb-4">
      {/* ── Hero ── */}
      {/* The same fixed brand panel the auth dialog uses, so the two brand
          moments in the app read as one surface. It replaces a
          `from-primary … to-primary/60` gradient whose tail measured 2.69:1
          against its own white text in light mode. */}
      <div className="relative overflow-hidden rounded-2xl bg-panel p-6 text-panel-foreground">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-16 select-none font-jp text-[10rem] font-bold leading-none text-panel-foreground/[0.06]"
        >
          学
        </span>

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <AvatarBadge
              initials={user.avatarInitials}
              avatarUrl={user.avatarUrl}
              size="lg"
            />
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight">
                {user.name}
              </h1>
              <p className="text-sm text-panel-muted">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <LevelBadge lessonsCompleted={lessonsCompleted} />
                <span className="inline-flex items-center gap-1 rounded-full bg-panel-foreground/12 px-2.5 py-1 text-xs font-medium text-panel-foreground">
                  <CalendarDays className="size-3.5" />
                  Joined {formatDate(user.joinedAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 border-0 bg-panel-foreground/12 text-panel-foreground hover:bg-panel-foreground/20"
              onClick={() => setEditing((v) => !v)}
            >
              <Edit2 className="size-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 border-0 bg-panel-foreground/12 text-panel-foreground hover:bg-panel-foreground/20"
              onClick={handleLogout}
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Admin Section - Only for admins */}
      {user?.role === "admin" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Administrative Actions
          </h2>
          <Link
            href="/admin"
            className="group relative flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors duration-(--dur-1) hover:border-primary hover:bg-accent"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg transition-transform group-hover:scale-110">
              <LayoutDashboard className="size-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">
                Application Management
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage users, edit lessons, and monitor application data.
              </p>
            </div>
            <div className="text-primary opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      )}

      {/* ── Edit inline form ── */}
      {editing && <EditProfileInline onDone={() => setEditing(false)} />}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={streak}
          sublabel="days in a row"
          accent="bg-shu"
        />
        <StatCard
          icon={BookOpen}
          label="Words Learned"
          value={wordsLearned}
          sublabel="vocabulary items"
          accent="bg-primary"
        />
        <StatCard
          icon={Languages}
          label="Verbs Mastered"
          value={verbsMastered}
          sublabel="verb forms"
          accent="bg-matsuba"
        />
        <StatCard
          icon={GraduationCap}
          label="Avg. Quiz Score"
          value={quizScores.length > 0 ? `${avgScore}%` : "—"}
          sublabel={`${quizScores.length} quizzes`}
          accent="bg-ai"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <QuizChart scores={quizScores.map((q) => q.score)} />
        <VocabBreakdown vocabStatus={vocabStatus} />
      </div>

      {/* ── Lessons progress ── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <GraduationCap className="size-5 text-primary" />
          <h3 className="font-semibold text-foreground">Lesson Progress</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {lessonsCompleted} lessons completed
          </span>
        </div>
        {/* Simple milestone track */}
        <div className="relative">
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-primary/70 transition-all duration-700"
              style={{
                width: `${Math.min((lessonsCompleted / 50) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>0</span>
            <span>Beginner · 10</span>
            <span>Elementary · 25</span>
            <span>50+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
