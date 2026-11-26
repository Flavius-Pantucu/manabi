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
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Volume2,
  Type,
  UserRound,
  X,
  Repeat,
  Shapes,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLearning } from "@/lib/learning-context";
import { useLanguage } from "@/lib/language-context";
import { AuthDialog, useAuthDialog } from "@/components/auth-dialog";
import { createContext, useContext } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { CommandMenu } from "@/components/command-menu";
import { ManabiLogo } from "@/components/manabi-mark";

interface NavItem {
  href: string;
  label: string;
  labelJp: string;
  labelEs: string;
  labelFr: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  jaOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    labelJp: "ダッシュボード",
    labelEs: "Tablero",
    labelFr: "Tableau",
    icon: LayoutDashboard,
  },
  { href: "/review", label: "Review", labelJp: "復習", labelEs: "Repaso", labelFr: "Révision", icon: Repeat },
  { href: "/kana", label: "Kana", labelJp: "かな", labelEs: "Kana", labelFr: "Kana", icon: Shapes, jaOnly: true },
  { href: "/verbs", label: "Verbs", labelJp: "動詞", labelEs: "Verbos", labelFr: "Verbes", icon: Languages },
  { href: "/grammar", label: "Grammar", labelJp: "文法", labelEs: "Gramática", labelFr: "Grammaire", icon: BookOpen },
  { href: "/vocabulary", label: "Vocab", labelJp: "語彙", labelEs: "Vocabulario", labelFr: "Vocabulaire", icon: BookText },
  { href: "/kanji", label: "Kanji", labelJp: "漢字", labelEs: "Kanji", labelFr: "Kanji", icon: PenLine, jaOnly: true },
  { href: "/reading", label: "Reading", labelJp: "読解", labelEs: "Lectura", labelFr: "Lecture", icon: FileText },
  { href: "/quiz", label: "Quiz", labelJp: "クイズ", labelEs: "Examen", labelFr: "Examen", icon: HelpCircle },
  { href: "/progress", label: "Progress", labelJp: "統計", labelEs: "Progreso", labelFr: "Progrès", icon: TrendingUp },
  {
    href: "/admin",
    label: "Admin",
    labelJp: "管理",
    labelEs: "Admin",
    labelFr: "Admin",
    icon: ShieldCheck,
    adminOnly: true,
  },
];

interface QuickNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  jaOnly?: boolean;
}

const quickNavItems: QuickNavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/review", label: "Review", icon: Repeat },
  { href: "/kana", label: "Kana", icon: Shapes, jaOnly: true },
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
function SidebarUserCard({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="glass-inset relative rounded-xl border p-3">
      <Link
        href="/profile"
        onClick={onNavigate}
        className="flex items-center gap-3 pr-8"
      >
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
        // `p-1` insets the photo to leave a card-coloured ring, which put the
        // image's square corners *inside* the parent's circular clip — so the
        // clip never touched them and the avatar rendered square. Both layers
        // inherit the badge's radius instead, which keeps the ring circular
        // here and squircular where a caller overrides the shape.
        <div className="size-full rounded-[inherit] bg-card p-1">
          <img
            src={avatarUrl}
            alt=""
            className="size-full rounded-[inherit] object-cover"
          />
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

/**
 * Everything below the sidebar's header: the study links, the account card,
 * the theme switch and the study preferences.
 *
 * Rendered twice — once in the desktop rail, once in the mobile drawer — so
 * the two cannot drift apart. Only one is ever in the accessibility tree,
 * since whichever does not apply to the viewport is `display: none`.
 *
 * `onNavigate` exists for the drawer. Route changes close it on their own, but
 * tapping the link for the page you are already on does not change the route,
 * and a drawer that ignores a tap reads as broken.
 */
function SidebarBody({
  onNavigate,
  onLogin,
  onRegister,
}: {
  onNavigate?: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, isLoading } = useAuth();
  const { language } = useLanguage();
  const { showFurigana, autoPlayAudio, toggleFurigana, toggleAutoPlay } =
    useLearning();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <nav aria-label="Study areas" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== "admin") return null;
            if (item.jaOnly && language !== "ja") return null;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
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
                  <span
                    lang={language}
                    className={cn(
                      "ml-auto text-xs",
                      language === "ja" && "font-jp",
                      isActive
                        ? "text-secondary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {language === "es"
                      ? item.labelEs
                      : language === "fr"
                        ? item.labelFr
                        : item.labelJp}
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
            <SidebarUserCard onNavigate={onNavigate} />
          ) : (
            <SidebarAuthButtons onLogin={onLogin} onRegister={onRegister} />
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
            {mounted ? (theme === "dark" ? "Light mode" : "Dark mode") : " "}
          </span>
        </button>

        <div className="mt-1 flex flex-col gap-3 border-t border-border px-3 pt-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Study preferences
          </h2>
          {language === "ja" && (
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor={`furigana-toggle-${onNavigate ? "drawer" : "rail"}`}
                className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground"
              >
                <Type className="size-4 text-muted-foreground" />
                Furigana
              </Label>
              <Switch
                id={`furigana-toggle-${onNavigate ? "drawer" : "rail"}`}
                checked={mounted ? showFurigana : true}
                onCheckedChange={toggleFurigana}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor={`autoplay-toggle-${onNavigate ? "drawer" : "rail"}`}
              className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground"
            >
              <Volume2 className="size-4 text-muted-foreground" />
              Auto-play audio
            </Label>
            <Switch
              id={`autoplay-toggle-${onNavigate ? "drawer" : "rail"}`}
              checked={mounted ? autoPlayAudio : false}
              onCheckedChange={toggleAutoPlay}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { open, defaultTab, openLogin, openRegister, setOpen } =
    useAuthDialog();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isMobile = useIsMobile();

  // Navigating is the drawer's whole purpose, so arriving somewhere closes it.
  useEffect(() => setIsDrawerOpen(false), [pathname]);

  // A drawer left open across a resize would sit over the desktop rail it
  // duplicates. Rotating a tablet is enough to hit this.
  useEffect(() => {
    if (!isMobile) setIsDrawerOpen(false);
  }, [isMobile]);

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
          Clean studio canvas with subtle radial atmospheric light. Keeps every
          surface crisp and legible across both light and dark modes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-[20%] left-1/2 h-[55%] w-[80%] -translate-x-1/2 rounded-full bg-primary/6 blur-[120px]" />
        <div className="animate-drift absolute -bottom-[20%] -left-[10%] h-[50%] w-[55%] rounded-full bg-ai/6 blur-[140px]" />
      </div>

      {/* Paper grain, behind every surface — a property of the ground, not a
          film over the UI. (It previously rendered at z-index 9998, i.e. on
          top of open dialogs.) */}
      <div aria-hidden="true" className="grain -z-10" />

      {/* ── Mobile chrome ────────────────────────────────────────────────────
          A bar that stays put and a drawer holding the same navigation the
          desktop rail does, in place of the floating pill that used to carry
          a five-item subset of it.

          Built on the Sheet primitive rather than a hand-rolled panel: it is
          Radix Dialog underneath, so focus moves into the drawer and returns
          to this button on close, Escape works, the page behind cannot be
          tabbed into, and background scroll is locked. Those are the parts of
          a drawer that are easy to leave out and obvious when missing. */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <header className="safe-top [--safe-top-pad:0.5rem] sticky top-0 z-30 flex items-center gap-2 border-b glass-panel px-3 pb-2 md:hidden">
          <SheetTrigger asChild>
            <button
              className="flex size-10 items-center justify-center rounded-xl text-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
          </SheetTrigger>

          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-1"
            aria-label="Manabi home"
          >
            <ManabiLogo className="size-8" markClassName="size-8" />
            {/* Shippori's ascent/descent (1.16/0.288 em) are lopsided, so
                `leading-none` centres the text box while the glyphs themselves
                sit ~0.08em low next to the geometrically centred mark. */}
            <span className="font-brand -translate-y-[0.08em] text-lg font-medium leading-none text-foreground">
              Manabi
            </span>
          </Link>

          {/* The account lives here rather than in the drawer alone, so
              signing in never costs two taps. */}
          <div className="ml-auto">
            {!isLoading &&
              (user ? (
                <Link
                  href="/profile"
                  className="flex size-11 items-center justify-center rounded-full transition-colors duration-(--dur-1) hover:bg-accent"
                >
                  <AvatarBadge
                    initials={user.avatarInitials}
                    avatarUrl={user.avatarUrl}
                    size="sm"
                    className="size-8 rounded-full"
                  />
                  <span className="sr-only">Your profile</span>
                </Link>
              ) : (
                <button
                  onClick={openLogin}
                  aria-label="Log in"
                  className="flex size-10 items-center justify-center rounded-xl text-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
                >
                  <LogIn className="size-5" />
                  <span className="sr-only">Log in</span>
                </button>
              ))}
          </div>
        </header>

        <SheetContent
          side="left"
          // `aria-describedby={undefined}`: Radix warns when a dialog has no
          // description, and a navigation drawer has nothing to say that its
          // own links do not.
          aria-describedby={undefined}
          // `safe-bottom` so the last preference toggle clears the home
          // indicator — the drawer runs the full height of a viewport the
          // layout opts into with `viewportFit: "cover"`.
          //
          // The last-child rule hides Sheet's own close button. It is a 16px
          // icon pinned to the corner, which is under half the 44px a thumb
          // needs; the one in the header below replaces it and, being in
          // flow, sits under the notch rather than behind it.
          className="safe-bottom glass-panel flex w-[min(20rem,86vw)] flex-col gap-0 border-r p-0 text-sidebar-foreground sm:max-w-none [&>button:last-child]:hidden"
        >
          <div className="safe-top [--safe-top-pad:1rem] flex items-center gap-3 border-b border-border px-5 pb-4">
            <SheetTitle asChild>
              <Link
                href="/"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 rounded-lg"
              >
                <ManabiLogo />
                <span className="font-brand text-lg font-medium leading-tight text-foreground">
                  Manabi
                </span>
              </Link>
            </SheetTitle>

            <SheetClose asChild>
              <button
                className="-mr-2 ml-auto flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </SheetClose>
          </div>

          <SidebarBody
            onNavigate={() => setIsDrawerOpen(false)}
            onLogin={openLogin}
            onRegister={openRegister}
          />
        </SheetContent>
      </Sheet>

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
            <span className="font-brand text-lg font-medium leading-tight text-foreground">
              Manabi
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
        <SidebarBody onLogin={openLogin} onRegister={openRegister} />
      </aside>

      {/* Main Content */}
      <main
        id="main"
        className={cn(
          "safe-bottom relative z-10 flex-1",
          "transition-[padding] duration-(--dur-4) ease-(--ease-out-expo)",
          isSidebarCollapsed ? "md:pl-0" : "md:pl-64",
        )}
      >
        {/* Top Navbar — Flag Switcher + Centered Logo when sidebar is collapsed */}
        <div className="border-b border-border/80 bg-background/85 backdrop-blur-md md:sticky md:top-0 md:z-20">
          <div
            className={cn(
              "relative mx-auto flex items-center justify-between gap-3 px-4 py-2 md:px-8 transition-all duration-500 ease-in-out",
              isSidebarCollapsed ? "max-w-7xl" : "max-w-5xl",
            )}
          >
            <div
              role="group"
              aria-label="Select learning language"
              className="relative inline-grid w-36 grid-cols-3 items-center rounded-full border border-border bg-card p-1 shadow-e1"
            >
              {/* Smooth sliding active pill */}
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-y-1 left-1 w-[calc(33.333%-0.18rem)] rounded-full bg-primary/15 ring-1 ring-primary/40 transition-[transform,background-color,box-shadow] duration-300 ease-(--ease-out-expo)",
                  language === "es"
                    ? "translate-x-0"
                    : language === "fr"
                      ? "translate-x-full"
                      : "translate-x-[200%]",
                )}
              />
              <button
                type="button"
                onClick={() => setLanguage("es")}
                aria-pressed={language === "es"}
                aria-label="Spanish"
                title="Spanish"
                className={cn(
                  "relative z-10 flex h-8 items-center justify-center rounded-full text-base transition-transform duration-300 ease-(--ease-out-expo)",
                  language === "es"
                    ? "scale-110"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                <span aria-hidden="true">🇪🇸</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage("fr")}
                aria-pressed={language === "fr"}
                aria-label="French"
                title="French"
                className={cn(
                  "relative z-10 flex h-8 items-center justify-center rounded-full text-base transition-transform duration-300 ease-(--ease-out-expo)",
                  language === "fr"
                    ? "scale-110"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                <span aria-hidden="true">🇫🇷</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage("ja")}
                aria-pressed={language === "ja"}
                aria-label="Japanese"
                title="Japanese"
                className={cn(
                  "relative z-10 flex h-8 items-center justify-center rounded-full text-base transition-transform duration-300 ease-(--ease-out-expo)",
                  language === "ja"
                    ? "scale-110"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                <span aria-hidden="true">🇯🇵</span>
              </button>
            </div>

            {/* Centered logo when desktop sidebar is collapsed */}
            <Link
              href="/"
              aria-label="Manabi home"
              tabIndex={isSidebarCollapsed ? undefined : -1}
              className={cn(
                "absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-lg px-2 py-1 transition-[opacity,transform] duration-300 ease-(--ease-out-expo) md:flex",
                isSidebarCollapsed
                  ? "pointer-events-auto scale-100 opacity-100"
                  : "pointer-events-none scale-95 opacity-0",
              )}
            >
              <ManabiLogo className="size-7" markClassName="size-7" />
              <span className="font-brand text-base font-medium leading-none text-foreground">
                Manabi
              </span>
            </Link>

            <span className="text-xs font-medium text-muted-foreground transition-colors duration-300">
              {language === "ja" ? "JLPT N5–N1" : "CEFR A1–C1"}
            </span>
          </div>
        </div>

        <div
          key={language}
          className={cn(
            "animate-lang-swap mx-auto px-4 pb-24 pt-6 md:px-8 md:py-8 transition-all duration-500 ease-in-out",
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

      {/* Bottom navigation dock — iPhone-style rounded pill hugging the bottom edge on mobile, and on desktop when sidebar is collapsed */}
      <nav
        aria-label="Primary"
        className={cn(
          "fixed bottom-1 left-1/2 z-50 w-[92vw] -translate-x-1/2 md:bottom-6 md:w-max md:max-w-[calc(100vw-2rem)]",
          "transition-[opacity,transform] duration-(--dur-3) ease-(--ease-out-expo)",
          isSidebarCollapsed
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-auto translate-y-0 scale-100 opacity-100 md:pointer-events-none md:translate-y-6 md:scale-95 md:opacity-0",
        )}
      >
        <div className="glass-strong flex w-full items-center justify-around gap-0.5 rounded-[28px] border p-1.5 md:w-auto md:justify-center md:gap-1 md:rounded-2xl">
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="hidden min-w-13 flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground md:flex"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" />
            <span className="text-[10px] font-medium leading-none">Menu</span>
          </button>

          <div
            aria-hidden="true"
            className="mx-1 hidden h-7 w-px bg-border md:block"
          />

          {quickNavItems.map((item) => {
            if (item.adminOnly && user?.role !== "admin") return null;
            if (item.jaOnly && language !== "ja") return null;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-12 flex-col items-center justify-center gap-1 rounded-[20px] px-2.5 py-1.5 sm:min-w-13 md:rounded-xl",
                  "transition-colors duration-(--dur-1)",
                  isActive
                    ? "bg-primary-tint text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <div aria-hidden="true" className="mx-0.5 hidden h-7 w-px bg-border sm:mx-1 md:block" />

          {user ? (
            <Link
              href="/profile"
              className="hidden min-w-13 flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 transition-colors duration-(--dur-1) hover:bg-accent md:flex"
            >
              <AvatarBadge
                initials={user.avatarInitials}
                avatarUrl={user.avatarUrl}
                size="sm"
                showUserIconOnHover
                className="size-5 rounded-md text-[9px]"
              />
              <span className="text-[10px] font-medium leading-none text-muted-foreground">
                Profile
              </span>
            </Link>
          ) : (
            <button
              onClick={openLogin}
              className="hidden min-w-13 flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground md:flex"
            >
              <LogIn className="size-4" />
              <span className="text-[10px] font-medium leading-none">
                Log in
              </span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

export { ManabiLogo, ManabiMark } from "@/components/manabi-mark";
