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
import { useLanguage, type Language } from "@/lib/language-context";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { CommandMenu } from "@/components/command-menu";
import { ManabiLogo } from "@/components/manabi-mark";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  jaOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/review", label: "Review", icon: Repeat },
      { href: "/progress", label: "Progress", icon: TrendingUp },
    ],
  },
  {
    title: "Study",
    items: [
      { href: "/vocabulary", label: "Vocabulary", icon: BookText },
      { href: "/grammar", label: "Grammar", icon: BookOpen },
      { href: "/verbs", label: "Verbs", icon: Languages },
      { href: "/reading", label: "Reading", icon: FileText },
      { href: "/kana", label: "Kana", icon: Shapes, jaOnly: true },
      { href: "/kanji", label: "Kanji", icon: PenLine, jaOnly: true },
    ],
  },
  {
    title: "Practice",
    items: [
      { href: "/quiz", label: "Quiz", icon: HelpCircle },
      { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
    ],
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
    <div className="flex gap-2">
      <button
        onClick={onLogin}
        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium text-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
      >
        <LogIn className="size-3.5" />
        Log in
      </button>
      <button
        onClick={onRegister}
        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-e1 transition-colors duration-(--dur-1) hover:bg-primary-hover"
      >
        Sign up
      </button>
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
  const { language, setLanguage } = useLanguage();
  const { showFurigana, autoPlayAudio, toggleFurigana, toggleAutoPlay } =
    useLearning();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <nav aria-label="Study areas" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
              Language
            </p>
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as Language)}
            >
              <SelectTrigger
                aria-label="Select learning language"
                className="w-full justify-between rounded-lg border border-border bg-card/60 px-2.5 text-sm font-medium text-foreground shadow-none hover:bg-accent data-[size=default]:h-9.5 dark:bg-card/60 dark:hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">
                    {language === "es"
                      ? "🇪🇸"
                      : language === "fr"
                        ? "🇫🇷"
                        : language === "it"
                          ? "🇮🇹"
                          : "🇯🇵"}
                  </span>
                  <span>
                    {language === "es"
                      ? "Spanish"
                      : language === "fr"
                        ? "French"
                        : language === "it"
                          ? "Italian"
                          : "Japanese"}
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="es">
                  <span aria-hidden="true">🇪🇸</span>
                  Spanish
                </SelectItem>
                <SelectItem value="fr">
                  <span aria-hidden="true">🇫🇷</span>
                  French
                </SelectItem>
                <SelectItem value="it">
                  <span aria-hidden="true">🇮🇹</span>
                  Italian
                </SelectItem>
                <SelectItem value="ja">
                  <span aria-hidden="true">🇯🇵</span>
                  Japanese
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.adminOnly && user?.role !== "admin") return false;
              if (item.jaOnly && language !== "ja") return false;
              return true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="flex flex-col gap-1">
                <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
                  {group.title}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "group relative flex min-h-9.5 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium",
                            "transition-colors duration-(--dur-1)",
                            isActive
                              ? "bg-primary-tint text-secondary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                        >
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 h-4.5 w-[3px] rounded-r-full bg-primary"
                            />
                          )}
                          <item.icon
                            className={cn(
                              "size-4 shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                            )}
                          />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom section: Preferences + Account */}
      <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
        <div className="flex flex-col gap-2 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
            Preferences
          </p>
          {language === "ja" && (
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor={`furigana-toggle-${onNavigate ? "drawer" : "rail"}`}
                className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground"
              >
                <Type className="size-3.5 text-muted-foreground" />
                Furigana
              </Label>
              <Switch
                id={`furigana-toggle-${onNavigate ? "drawer" : "rail"}`}
                checked={mounted ? showFurigana : true}
                onCheckedChange={toggleFurigana}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor={`autoplay-toggle-${onNavigate ? "drawer" : "rail"}`}
              className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground"
            >
              <Volume2 className="size-3.5 text-muted-foreground" />
              Auto-play audio
            </Label>
            <Switch
              id={`autoplay-toggle-${onNavigate ? "drawer" : "rail"}`}
              checked={mounted ? autoPlayAudio : false}
              onCheckedChange={toggleAutoPlay}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor={`theme-toggle-${onNavigate ? "drawer" : "rail"}`}
              className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground"
            >
              {mounted && theme === "dark" ? (
                <Moon className="size-3.5 text-muted-foreground" />
              ) : (
                <Sun className="size-3.5 text-muted-foreground" />
              )}
              Dark mode
            </Label>
            <Switch
              id={`theme-toggle-${onNavigate ? "drawer" : "rail"}`}
              checked={mounted ? theme === "dark" : false}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </div>

        <div className="border-t border-border pt-3">
          {!isLoading &&
            (user ? (
              <SidebarUserCard onNavigate={onNavigate} />
            ) : (
              <SidebarAuthButtons onLogin={onLogin} onRegister={onRegister} />
            ))}
        </div>
      </div>
    </>
  );
}

function LanguageSelect({ align = "end" }: { align?: "start" | "end" }) {
  const { language, setLanguage } = useLanguage();
  return (
    <Select
      value={language}
      onValueChange={(v) => setLanguage(v as Language)}
    >
      <SelectTrigger
        aria-label="Select learning language"
        className="w-auto gap-1 border-0 bg-transparent px-2 py-0 shadow-none ring-0 hover:bg-accent focus-visible:ring-0 data-[size=default]:h-10 dark:bg-transparent dark:hover:bg-accent"
      >
        <span className="text-lg leading-none" aria-hidden="true">
          {language === "es"
            ? "🇪🇸"
            : language === "fr"
              ? "🇫🇷"
              : language === "it"
                ? "🇮🇹"
                : "🇯🇵"}
        </span>
      </SelectTrigger>
      <SelectContent align={align}>
        <SelectItem value="es">
          <span aria-hidden="true">🇪🇸</span>
          Spanish
        </SelectItem>
        <SelectItem value="fr">
          <span aria-hidden="true">🇫🇷</span>
          French
        </SelectItem>
        <SelectItem value="it">
          <span aria-hidden="true">🇮🇹</span>
          Italian
        </SelectItem>
        <SelectItem value="ja">
          <span aria-hidden="true">🇯🇵</span>
          Japanese
        </SelectItem>
      </SelectContent>
    </Select>
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
        {/* Top Navbar Header — always on mobile, and on desktop when sidebar is collapsed */}
        <header
          className={cn(
            "safe-top [--safe-top-pad:0.5rem] sticky top-0 z-30 flex items-center justify-between border-b glass-panel px-3 pb-2 md:px-6 md:py-2",
            !isSidebarCollapsed && "md:hidden",
          )}
        >
          <div className="flex items-center gap-1">
            <SheetTrigger asChild>
              <button
                className="flex size-10 items-center justify-center rounded-xl text-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground md:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>

            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="hidden size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground md:flex"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="size-5" />
              </button>
            )}
          </div>

          <Link
            href="/"
            aria-label="Manabi home"
            tabIndex={isSidebarCollapsed ? undefined : -1}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-lg p-1",
              !isSidebarCollapsed && "md:hidden",
            )}
          >
            <ManabiLogo className="size-8" markClassName="size-8" />
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <LanguageSelect align="end" />

            {!isLoading &&
              (user ? (
                <Link
                  href="/profile"
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full transition-colors duration-(--dur-1) hover:bg-accent",
                    !isSidebarCollapsed && "md:hidden",
                  )}
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
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl text-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground",
                    !isSidebarCollapsed && "md:hidden",
                  )}
                >
                  <UserRound className="size-5" />
                  <span className="sr-only">Log in</span>
                </button>
              ))}
          </div>
        </header>

        <div
          key={language}
          className={cn(
            "animate-lang-swap mx-auto px-4 pb-8 pt-6 md:px-8 md:py-8 transition-all duration-500 ease-in-out",
            isSidebarCollapsed ? "max-w-7xl" : "max-w-5xl",
          )}
        >
          <AuthPromptContext.Provider value={{ openLogin, openRegister }}>
            {children}
          </AuthPromptContext.Provider>
        </div>
      </main>
      </Sheet>

      {/* Auth Dialog */}
      <AuthDialog open={open} onOpenChange={setOpen} defaultTab={defaultTab} />

      {/* Global Command Menu (⌘K) */}
      <CommandMenu />

      {/* Desktop-only floating pill when sidebar is collapsed */}
      <nav
        aria-label="Primary"
        className={cn(
          "hidden md:block fixed bottom-6 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2",
          "transition-[opacity,transform] duration-(--dur-3) ease-(--ease-out-expo)",
          isSidebarCollapsed
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-6 scale-95 opacity-0",
        )}
      >
        <div className="glass-strong flex w-full items-center justify-around gap-0.5 rounded-none border-0 px-2 pb-6 pt-1.5 md:w-auto md:justify-center md:gap-1 md:rounded-2xl md:border md:p-1.5">
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
              <UserRound className="size-4" />
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
