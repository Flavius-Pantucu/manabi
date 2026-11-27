"use client";

import { useMemo, useState } from "react";
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
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  Layers,
  Target,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { downscaleImage } from "@/lib/image";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { resetSrsState } from "@/lib/store/features/srs-slice";
import { resetLearningState } from "@/lib/store/features/learning-slice";
import { clearSyncState } from "@/lib/sync/client";
import { useLearning } from "@/lib/learning-context";
import { type Language } from "@/lib/language-context";
import { AvatarBadge, useAuthPrompt } from "@/components/app-shell";
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

// ─── Edit Profile Sheet ───────────────────────────────────────────────────────

function EditProfileInline({ onDone }: { onDone: () => void }) {
  const { user, updateUser, changeEmail } = useAuth();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const defaultAvatars = [
    { id: "shiba", url: "/avatars/shiba.png", label: "Shiba" },
    { id: "sakura", url: "/avatars/sakura.png", label: "Sakura" },
    { id: "daruma", url: "/avatars/daruma.png", label: "Daruma" },
    { id: "cat", url: "/avatars/cat.png", label: "Lucky Cat" },
  ];

  /**
   * Name and email are two different operations now.
   *
   * A name is just a column. An email address is an identity — changing it
   * has to go through Better Auth so the account's credentials move with it,
   * which is why it is not part of `updateUser`.
   */
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const nextName = name.trim() || user!.name;
      if (nextName !== user!.name) await updateUser({ name: nextName });

      const nextEmail = email.trim().toLowerCase();
      if (nextEmail && nextEmail !== user!.email.toLowerCase()) {
        await changeEmail(nextEmail);
      }
      onDone();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Couldn't save those changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (url: string) => {
    void updateUser({ avatarUrl: url }).catch((err) =>
      setSaveError(err instanceof Error ? err.message : "Couldn't set that avatar."),
    );
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaveError(null);
    setUploading(true);
    try {
      // Resized here rather than rejected. The avatar rides in every session
      // payload as a data URL, so it has to be small — but "pick a photo under
      // 96 KB" is not something anyone can act on.
      const { dataUrl } = await downscaleImage(file);
      await updateUser({ avatarUrl: dataUrl });
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Couldn't use that image.",
      );
    } finally {
      setUploading(false);
      // Clear the input, so picking the same file again still fires onChange.
      e.target.value = "";
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
                {uploading ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Edit2 className="size-4" />
                )}
                <span>{uploading ? "Saving…" : "Upload"}</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {saveError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {saveError}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          aria-busy={saving}
          className="gap-2 px-6"
        >
          <Check className="size-4" />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Level Badge ──────────────────────────────────────────────────────────────

function LevelBadge({ totalMastered }: { totalMastered: number }) {
  const levels = [
    {
      min: 0,
      label: "Explorer",
      color: "bg-panel-foreground/12 text-panel-foreground",
    },
    {
      min: 25,
      label: "Apprentice",
      color: "bg-ai/20 text-ai dark:text-ai",
    },
    {
      min: 100,
      label: "Practitioner",
      color: "bg-fuji/20 text-fuji",
    },
    {
      min: 250,
      label: "Polyglot",
      color: "bg-kincha/20 text-kincha",
    },
  ];

  const level =
    [...levels].reverse().find((l) => totalMastered >= l.min) ?? levels[0];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        level.color,
      )}
    >
      <GraduationCap className="size-3.5" />
      {level.label}
    </span>
  );
}

// ─── Reset progress ───────────────────────────────────────────────────────────

/**
 * Erasing study history, as distinct from deleting the account.
 *
 * Gated behind typing the account's own email. The numbers this clears are the
 * one thing in the product that cannot be recreated — a year of review history
 * is a year — so it should not be one stray click away, and a "type this to
 * confirm" is the cheapest gate that actually makes someone read the sentence.
 */
function ResetProgressPanel() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirm.trim().toLowerCase() === (user?.email ?? "").toLowerCase();

  const handleReset = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me/progress", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Couldn't reset your progress.");
      }

      // Clear this device too, and drop the sync cursor — otherwise the next
      // push would hand the server back everything it was just asked to erase.
      dispatch(resetSrsState());
      dispatch(resetLearningState());
      clearSyncState();

      setOpen(false);
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reset your progress.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <AlertCircle className="size-5 text-destructive" />
        Reset progress
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Erases every card, review, streak and quiz result on this account, on
        all your devices. Your account, settings and any decks you wrote
        yourself are kept. This cannot be undone.
      </p>

      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Reset my progress…
        </Button>
      ) : (
        <div className="space-y-3">
          <Label htmlFor="reset-confirm" className="text-sm font-medium">
            Type <span className="font-mono">{user?.email}</span> to confirm
          </Label>
          <Input
            id="reset-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            className="bg-background/60"
          />
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={!matches || busy}
              aria-busy={busy}
              onClick={handleReset}
            >
              {busy ? "Erasing…" : "Erase everything"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setConfirm("");
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type StatsFilter = "all" | Language;

function cardLanguage(cardId: string): Language {
  if (cardId.startsWith("es:")) return "es";
  if (cardId.startsWith("fr:")) return "fr";
  if (cardId.startsWith("it:")) return "it";
  return "ja";
}

function cardDeck(cardId: string): "vocab" | "verbs" | "grammar" | "kanji" | "kana" {
  const clean = cardId.replace(/^(es|fr|it):/, "");
  if (clean.startsWith("vocab:")) return "vocab";
  if (clean.startsWith("verb:")) return "verbs";
  if (clean.startsWith("grammar:")) return "grammar";
  if (clean.startsWith("kanji:")) return "kanji";
  return "kana";
}

const LANG_META: Record<Language, { label: string; flag: string; dot: string }> = {
  es: { label: "Spanish", flag: "🇪🇸", dot: "bg-red-500" },
  fr: { label: "French", flag: "🇫🇷", dot: "bg-blue-500" },
  it: { label: "Italian", flag: "🇮🇹", dot: "bg-emerald-500" },
  ja: { label: "Japanese", flag: "🇯🇵", dot: "bg-pink-500" },
};

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const { streak, quizScores } = useLearning();
  const srsCards = useAppSelector((s) => s.srs?.cards);
  const srsLog = useAppSelector((s) => s.srs?.log);
  const srsDaily = useAppSelector((s) => s.srs?.daily);
  const router = useRouter();
  const { openLogin } = useAuthPrompt();
  const [editing, setEditing] = useState(false);
  const [statsFilter, setStatsFilter] = useState<StatsFilter>("all");

  const stats = useMemo(() => {
    const entries = Object.entries(srsCards ?? {});
    const filtered =
      statsFilter === "all"
        ? entries
        : entries.filter(([id]) => cardLanguage(id) === statsFilter);

    let totalCards = 0;
    let mastered = 0;
    let learning = 0;
    const byDeck = { vocab: 0, verbs: 0, grammar: 0, kanji: 0, kana: 0 };

    for (const [id, c] of filtered) {
      if (!c || c.phase === "new") continue;
      totalCards++;
      const deck = cardDeck(id);
      byDeck[deck]++;
      if (c.phase === "review" && c.stability >= 21) mastered++;
      else learning++;
    }

    const perLanguage = (["es", "fr", "it", "ja"] as Language[]).map((lang) => {
      const langEntries = entries.filter(([id]) => cardLanguage(id) === lang);
      let started = 0;
      let langMastered = 0;
      let vocab = 0;
      let verbs = 0;
      let grammar = 0;
      for (const [id, c] of langEntries) {
        if (!c || c.phase === "new") continue;
        started++;
        if (c.phase === "review" && c.stability >= 21) langMastered++;
        const d = cardDeck(id);
        if (d === "vocab") vocab++;
        else if (d === "verbs") verbs++;
        else if (d === "grammar") grammar++;
      }
      return { lang, started, mastered: langMastered, vocab, verbs, grammar };
    });

    const filteredLogs = (srsLog ?? []).filter((l) =>
      statsFilter === "all" ? true : cardLanguage(l.id) === statsFilter,
    );
    const totalReviews = filteredLogs.length;
    const correctReviews = filteredLogs.filter((l) => l.grade > 1).length;
    const retention =
      totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;

    // Last 7 days review volume
    const days: { day: string; reviews: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      days.push({ day: label, reviews: srsDaily?.[key]?.reviews ?? 0 });
    }

    const totalMasteredAll = perLanguage.reduce((a, l) => a + l.mastered, 0);

    return {
      totalCards,
      mastered,
      learning,
      byDeck,
      perLanguage,
      totalReviews,
      retention,
      days,
      totalMasteredAll,
    };
  }, [srsCards, srsLog, srsDaily, statsFilter]);

  if (isLoading) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-muted">
          <LogOut className="size-6 text-muted-foreground" />
        </span>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          You&rsquo;re signed out
        </h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          Sign in to see your profile, your streak and your review history.
          Anything you have studied on this device is still here.
        </p>
        <div className="flex gap-3">
          <Button size="lg" onClick={openLogin}>
            Sign in
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/")}>
            Back to dashboard
          </Button>
        </div>
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
      {/* ── Hero (Initial Card — clean, language-agnostic) ── */}
      <div className="relative overflow-hidden rounded-2xl bg-panel p-6 text-panel-foreground">
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
                <LevelBadge totalMastered={stats.totalMasteredAll} />
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
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
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
          </Link>
        </div>
      )}

      {/* ── Edit inline form ── */}
      {editing && <EditProfileInline onDone={() => setEditing(false)} />}

      {/* ── Language Filter Bar for Stats ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Learning Statistics
          </h2>
          <p className="text-xs text-muted-foreground">
            Inspect your progress across all languages or focus on one.
          </p>
        </div>
        <div
          role="group"
          aria-label="Filter statistics by language"
          className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1"
        >
          {(
            [
              { id: "all", label: "All", flag: "🌐" },
              { id: "es", label: "Spanish", flag: "🇪🇸" },
              { id: "fr", label: "French", flag: "🇫🇷" },
              { id: "it", label: "Italian", flag: "🇮🇹" },
              { id: "ja", label: "Japanese", flag: "🇯🇵" },
            ] as const
          ).map((opt) => {
            const active = statsFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatsFilter(opt.id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-e1"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span aria-hidden="true">{opt.flag}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Core Metrics ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={streak}
          sublabel="days in a row"
          accent="bg-shu"
        />
        <StatCard
          icon={Layers}
          label="Cards Studied"
          value={stats.totalCards}
          sublabel={`${stats.learning} learning`}
          accent="bg-primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="Mastered"
          value={stats.mastered}
          sublabel="mature SRS cards"
          accent="bg-matsuba"
        />
        <StatCard
          icon={Target}
          label="Retention"
          value={stats.totalReviews > 0 ? `${stats.retention}%` : "—"}
          sublabel={`${stats.totalReviews} reviews`}
          accent="bg-ai"
        />
      </div>

      {/* ── Per-Language Breakdown ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.perLanguage
          .filter((l) => statsFilter === "all" || statsFilter === l.lang)
          .map((l) => {
            const meta = LANG_META[l.lang];
            return (
              <div
                key={l.lang}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden="true">
                      {meta.flag}
                    </span>
                    <h3 className="font-semibold text-foreground">
                      {meta.label}
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {l.mastered} mastered
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-card-muted/60 p-2">
                    <p data-numeric className="text-base font-semibold text-foreground">
                      {l.vocab}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Vocab</p>
                  </div>
                  <div className="rounded-lg bg-card-muted/60 p-2">
                    <p data-numeric className="text-base font-semibold text-foreground">
                      {l.verbs}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Verbs</p>
                  </div>
                  <div className="rounded-lg bg-card-muted/60 p-2">
                    <p data-numeric className="text-base font-semibold text-foreground">
                      {l.grammar}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Grammar</p>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* ── 7-Day Review Activity + Study Breakdown ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              7-Day Review Activity
            </h3>
            <span className="ml-auto text-xs text-muted-foreground">
              All languages
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={stats.days}
              margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
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
              />
              <Bar
                dataKey="reviews"
                fill="var(--color-primary)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              Deck & Quiz Summary
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Vocabulary Cards", count: stats.byDeck.vocab, icon: BookOpen },
              { label: "Verb Conjugations", count: stats.byDeck.verbs, icon: Languages },
              { label: "Grammar Patterns", count: stats.byDeck.grammar, icon: GraduationCap },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-xl border border-border/70 bg-card-muted/40 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <row.icon className="size-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {row.label}
                  </span>
                </div>
                <span data-numeric className="text-sm font-semibold text-foreground">
                  {row.count}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card-muted/40 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="size-4 text-ai" />
                <span className="text-sm font-medium text-foreground">
                  Quiz Average ({quizScores.length} taken)
                </span>
              </div>
              <span data-numeric className="text-sm font-semibold text-foreground">
                {quizScores.length > 0 ? `${avgScore}%` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ResetProgressPanel />
    </div>
  );
}
