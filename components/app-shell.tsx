"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Languages,
  BookText,
  PenLine,
  FileText,
  HelpCircle,
  Sun,
  Moon,
  LogIn,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Volume2,
  Type,
  UserRound,
  Repeat,
  Shapes,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLearning } from "@/lib/learning-context";
import { AuthDialog, useAuthDialog } from "@/components/auth-dialog";
import { createContext, useContext } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useParallax } from "@/hooks/use-parallax";
import Image from "next/image";
import { CommandMenu } from "@/components/command-menu";
import { ManabiLogo } from "@/components/manabi-mark";

interface NavItem {
  href: string;
  label: string;
  labelJp: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    labelJp: "ダッシュボード",
    icon: LayoutDashboard,
  },
  { href: "/review", label: "Review", labelJp: "復習", icon: Repeat },
  { href: "/kana", label: "Kana", labelJp: "かな", icon: Shapes },
  { href: "/verbs", label: "Verbs", labelJp: "動詞", icon: Languages },
  { href: "/grammar", label: "Grammar", labelJp: "文法", icon: BookOpen },
  { href: "/vocabulary", label: "Vocab", labelJp: "語彙", icon: BookText },
  { href: "/kanji", label: "Kanji", labelJp: "漢字", icon: PenLine },
  { href: "/reading", label: "Reading", labelJp: "読解", icon: FileText },
  { href: "/quiz", label: "Quiz", labelJp: "クイズ", icon: HelpCircle },
  { href: "/progress", label: "Progress", labelJp: "統計", icon: TrendingUp },
  {
    href: "/admin",
    label: "Admin",
    labelJp: "管理",
    icon: ShieldCheck,
    adminOnly: true,
  },
];

interface MobileNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const mobileNavItems: MobileNavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/review", label: "Review", icon: Repeat },
  { href: "/kana", label: "Kana", icon: Shapes },
  { href: "/vocabulary", label: "Vocab", icon: BookText },
  { href: "/quiz", label: "Quiz", icon: HelpCircle },
  { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];

// Sidebar auth section — logged out
function SidebarAuthButtons({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Account
      </h2>
      <div className="flex gap-2">
        <button
          onClick={onLogin}
          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
        >
          <LogIn className="size-4" />
          Log in
        </button>
        <button
          onClick={onRegister}
          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-e1 transition-colors duration-(--dur-1) hover:bg-primary-hover"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}

// Sidebar auth section — logged in
function SidebarUserCard() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="glass-inset relative rounded-xl border p-3">
      <Link href="/profile" className="flex items-center gap-3 pr-8">
        <AvatarBadge
          initials={user.avatarInitials}
          avatarUrl={user.avatarUrl}
          size="md"
          showUserIconOnHover
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {user.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </span>
      </Link>
      <button
        onClick={logout}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
      >
        <LogOut className="size-4" />
        <span className="sr-only">Sign out</span>
      </button>
    </div>
  );
}

// Shared avatar component
export function AvatarBadge({
  initials,
  avatarUrl,
  size = "md",
  showUserIconOnHover = false,
  className,
}: {
  initials: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  showUserIconOnHover?: boolean;
  className?: string;
}) {
  const sz =
    size === "sm"
      ? "size-7 text-[10px]"
      : size === "lg"
        ? "size-14 text-xl"
        : "size-9 text-sm";

  return (
    <div
      className={cn(
        "group relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground",
        sz,
        className,
      )}
    >
      {avatarUrl ? (
        <div className="size-full bg-card">
          <img src={avatarUrl} alt="" className="size-full object-cover p-1" />
        </div>
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}

      {/* Edit affordance on hover. Scrim is heavy enough for the glyph to
          hold at 4.5:1 over any avatar art beneath it. */}
      {showUserIconOnHover && (
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/65 opacity-0 transition-opacity duration-(--dur-1) group-hover:opacity-100">
          <UserRound
            className="size-3.5 text-background sm:size-4"
            strokeWidth={2.5}
          />
        </span>
      )}
    </div>
  );
}

/**
 * Lets a page open the sign-in dialog the shell owns.
 *
 * Pages that need an account previously had no way to ask for one, so the
 * profile page dealt with a signed-out visitor by silently redirecting them
 * home — which reads as the page being broken rather than as "sign in first".
 */
interface AuthPromptValue {
  openLogin: () => void;
  openRegister: () => void;
}

const AuthPromptContext = createContext<AuthPromptValue | null>(null);

export function useAuthPrompt(): AuthPromptValue {
  return (
    useContext(AuthPromptContext) ?? { openLogin: () => {}, openRegister: () => {} }
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, isLoading } = useAuth();
  const { showFurigana, autoPlayAudio, toggleFurigana, toggleAutoPlay } =
    useLearning();
  const { open, defaultTab, openLogin, openRegister, setOpen } =
    useAuthDialog();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const parallaxRef = useParallax();

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Keyboard users land here first and can jump the whole sidebar. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-9999 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-e3"
      >
        Skip to content
      </a>
      {/* ── Ambient ground ───────────────────────────────────────────────────
          The photograph is the background of the whole app: painted at the
          back, drifting against the scroll, then softened until it carries
          light rather than detail. Order matters — blur and desaturate first,
          brand wash second, graded scrim last. Everything above this stack is
          glass, so the image reads through the UI instead of only around it.

          The earlier version ran the photo at effectively 6% under a
          near-solid scrim, which is a background nobody can see. The contrast
          guarantee is now carried by the blur + scrim + per-surface backdrop
          blur together, not by hiding the picture. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          ref={parallaxRef}
          className="absolute inset-[-10%] scale-[1.14] will-change-transform"
          style={{
            opacity: "var(--ambient-photo)",
            filter:
              "blur(var(--ambient-blur)) saturate(var(--ambient-saturate))",
          }}
        >
          <Image
            src="/images/hero-japan-4k.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[50%_38%]"
            priority
          />
        </div>

        {/* A single slow wash of brand light, low in the frame. */}
        <div className="animate-drift absolute -bottom-[25%] -left-[10%] h-[70%] w-[70%] rounded-full bg-primary/20 blur-[150px]" />

        {/* The scrim — graded, heavier at the edges where the header and the
            floating nav sit. Everything above this line has predictable
            contrast. */}
        <div
          className="absolute inset-0"
          style={{ background: "var(--ambient-scrim)" }}
        />
      </div>

      {/* Paper grain, behind every surface — a property of the ground, not a
          film over the UI. (It previously rendered at z-index 9998, i.e. on
          top of open dialogs.) */}
      <div aria-hidden="true" className="grain -z-10" />

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r glass-panel text-sidebar-foreground shadow-e2 md:flex",
          "transition-[width,transform,opacity] duration-(--dur-4) ease-(--ease-out-expo)",
          isSidebarCollapsed
            ? "w-0 -translate-x-full opacity-0"
            : "w-64 translate-x-0 opacity-100",
        )}
        inert={isSidebarCollapsed || undefined}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg"
            aria-label="Manabi home"
          >
            <ManabiLogo />
            <span>
              <span className="block text-base font-semibold leading-tight text-foreground">
                Manabi
              </span>
              <span className="block text-xs text-muted-foreground">学び</span>
            </span>
          </Link>
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-5" />
          </button>
        </div>
        <nav aria-label="Study areas" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              if (item.adminOnly && user?.role !== "admin") return null;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      "transition-colors duration-(--dur-1)",
                      isActive
                        ? "bg-primary-tint text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 h-5 w-[3px] rounded-r-full bg-primary"
                      />
                    )}
                    <item.icon
                      className={cn(
                        "size-5 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span>{item.label}</span>
                    {/* Japanese label is a lexical aid, not decoration — it
                        gets a real language tag so screen readers switch
                        voice instead of spelling it out in English. */}
                    <span
                      lang="ja"
                      className={cn(
                        "ml-auto font-jp text-xs",
                        isActive
                          ? "text-secondary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.labelJp}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
          {!isLoading &&
            (user ? (
              <SidebarUserCard />
            ) : (
              <SidebarAuthButtons
                onLogin={openLogin}
                onRegister={openRegister}
              />
            ))}

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )
            ) : (
              <span className="size-5" />
            )}
            {/* Rendered before hydration as an empty string would collapse the
                row; reserve the label's line instead. */}
            <span>
              {mounted
                ? theme === "dark"
                  ? "Light mode"
                  : "Dark mode"
                : " "}
            </span>
          </button>

          <div className="mt-1 flex flex-col gap-3 border-t border-border px-3 pt-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Study preferences
            </h2>
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="furigana-toggle"
                className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground"
              >
                <Type className="size-4 text-muted-foreground" />
                Furigana
              </Label>
              <Switch
                id="furigana-toggle"
                checked={mounted ? showFurigana : true}
                onCheckedChange={toggleFurigana}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="autoplay-toggle"
                className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground"
              >
                <Volume2 className="size-4 text-muted-foreground" />
                Auto-play audio
              </Label>
              <Switch
                id="autoplay-toggle"
                checked={mounted ? autoPlayAudio : false}
                onCheckedChange={toggleAutoPlay}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        id="main"
        className={cn(
          "relative z-10 flex-1 pb-28 md:pb-0",
          "transition-[padding] duration-(--dur-4) ease-(--ease-out-expo)",
          isSidebarCollapsed ? "md:pl-0" : "md:pl-64",
        )}
      >
        <div
          className={cn(
            "mx-auto px-4 py-6 md:px-8 md:py-8 transition-all duration-500 ease-in-out",
            isSidebarCollapsed ? "max-w-7xl" : "max-w-5xl",
          )}
        >
          <AuthPromptContext.Provider value={{ openLogin, openRegister }}>
            {children}
          </AuthPromptContext.Provider>
        </div>
      </main>

      {/* Auth Dialog */}
      <AuthDialog open={open} onOpenChange={setOpen} defaultTab={defaultTab} />

      {/* Global Command Menu (⌘K) */}
      <CommandMenu />

      {/* Floating nav bar — primary navigation on mobile, and the way back to
          an expanded sidebar on desktop. */}
      <nav
        aria-label="Primary"
        className={cn(
          "safe-bottom fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
          "transition-[opacity,transform] duration-(--dur-3) ease-(--ease-out-expo)",
          "translate-y-0 scale-100 opacity-100 md:pointer-events-none md:translate-y-6 md:scale-95 md:opacity-0",
          isSidebarCollapsed &&
            "md:pointer-events-auto md:translate-y-0 md:scale-100 md:opacity-100",
        )}
      >
        <div className="glass-strong flex min-h-14 items-center gap-1 rounded-2xl border p-1.5">
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="hidden rounded-xl p-2.5 text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground md:flex"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-5" />
          </button>

          <div
            aria-hidden="true"
            className="mx-1 hidden h-6 w-px bg-border md:block"
          />

          {mobileNavItems.map((item) => {
            if (item.adminOnly && user?.role !== "admin") return null;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group/item relative flex size-11 items-center justify-center rounded-xl",
                  "transition-colors duration-(--dur-1)",
                  isActive
                    ? "bg-primary-tint text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="size-5" />
                {/* The label is the accessible name and the tooltip both —
                    the icon alone named nothing before. */}
                <span className="sr-only">{item.label}</span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 transition-opacity duration-(--dur-1) group-hover/item:opacity-100"
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          <div aria-hidden="true" className="mx-1 h-6 w-px bg-border" />

          {user ? (
            <Link
              href="/profile"
              className="flex size-11 items-center justify-center rounded-xl transition-colors duration-(--dur-1) hover:bg-accent"
            >
              <AvatarBadge
                initials={user.avatarInitials}
                avatarUrl={user.avatarUrl}
                size="sm"
                showUserIconOnHover
                className="size-8 rounded-lg"
              />
              <span className="sr-only">Your profile</span>
            </Link>
          ) : (
            <button
              onClick={openLogin}
              className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
            >
              <LogIn className="size-5" />
              <span className="sr-only">Sign in</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

export { ManabiLogo, ManabiMark } from "@/components/manabi-mark";
