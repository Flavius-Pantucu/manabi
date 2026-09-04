"use client";

import { useState, useCallback, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { ManabiMark } from "@/components/manabi-mark";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const MIN_PASSWORD = 6;

const loginSchema = z.object({
  email: z.string().min(1, "Enter your email address").email("That doesn't look like an email address"),
  password: z.string().min(1, "Enter your password"),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter at least 2 characters"),
    email: z.string().min(1, "Enter your email address").email("That doesn't look like an email address"),
    password: z
      .string()
      .min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters`),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "This doesn't match the password above",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

// ─── Field ───────────────────────────────────────────────────────────────────

/**
 * Wires the label, the control, its hint and its error into one accessible
 * unit. The control gets `aria-invalid` and an `aria-describedby` that points
 * at whichever of hint/error is currently rendered, so assistive tech reads
 * the requirement before submission and the problem after it.
 */
function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (a: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}) {
  const uid = useId();
  const id = `f-${uid}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>

      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ─── Password input ──────────────────────────────────────────────────────────

function PasswordInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        // 44px hit area inside a 36px field, without changing the layout.
        className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--dur-1) hover:text-foreground"
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        <span className="sr-only">
          {show ? "Hide password" : "Show password"}
        </span>
      </button>
    </div>
  );
}

// ─── Form-level error ────────────────────────────────────────────────────────

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
    >
      {message}
    </p>
  );
}

// ─── Login ───────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginValues) => {
    try {
      await login(data.email, data.password);
      onSuccess();
    } catch {
      setError("root", {
        message: "That email and password don't match. Check both and try again.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Email" error={errors.email?.message}>
        {(a) => (
          <Input
            {...a}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            {...register("email")}
          />
        )}
      </Field>

      <Field label="Password" error={errors.password?.message}>
        {(a) => (
          <PasswordInput
            {...a}
            autoComplete="current-password"
            {...register("password")}
          />
        )}
      </Field>

      <FormError message={errors.root?.message} />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Demo build — any email works with a password of {MIN_PASSWORD}+
        characters.
      </p>
    </form>
  );
}

// ─── Register ────────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { register: registerUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterValues) => {
    try {
      await registerUser(data.name, data.email, data.password);
      onSuccess();
    } catch {
      setError("root", {
        message: "We couldn't create your account just now. Try again.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Name" error={errors.name?.message}>
        {(a) => (
          <Input
            {...a}
            type="text"
            placeholder="Sakura Tanaka"
            autoComplete="name"
            autoFocus
            {...register("name")}
          />
        )}
      </Field>

      <Field label="Email" error={errors.email?.message}>
        {(a) => (
          <Input
            {...a}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register("email")}
          />
        )}
      </Field>

      <Field
        label="Password"
        // The requirement is stated before submission, not revealed by
        // failing. Nobody should have to guess a rule and be told off.
        hint={`At least ${MIN_PASSWORD} characters.`}
        error={errors.password?.message}
      >
        {(a) => (
          <PasswordInput
            {...a}
            autoComplete="new-password"
            {...register("password")}
          />
        )}
      </Field>

      <Field label="Confirm password" error={errors.confirmPassword?.message}>
        {(a) => (
          <PasswordInput
            {...a}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        )}
      </Field>

      <FormError message={errors.root?.message} />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Creating your account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}

// ─── Brand panel ─────────────────────────────────────────────────────────────

/**
 * The dialog's masthead.
 *
 * What was here before: the full-colour koi-and-blossom tile at 100%, three
 * bouncing petals, and the pale logo.png inside a `bg-white/30` chip under a
 * `background/5` scrim. The mark measured under 1.5:1 against the pattern
 * behind it and the badge text was pink-on-illustration.
 *
 * The panel is one flat brand surface, identical in light and dark, so it
 * reads as a stamp rather than a window. Everything on it is a verified pair.
 */
function AuthPanel({ mode }: { mode: AuthTab }) {
  return (
    <div className="-mx-6 -mt-6 mb-5 bg-panel px-6 pb-6 pt-7 text-center">
      <ManabiMark className="mx-auto size-9 text-panel-mark" />

      <p className="mt-3 text-2xl font-semibold tracking-tight text-panel-foreground">
        Manabi
      </p>
      <p lang="ja" className="mt-0.5 font-jp text-sm text-panel-muted">
        学び
      </p>

      <p className="mx-auto mt-2.5 max-w-[30ch] text-sm leading-relaxed text-panel-muted">
        {mode === "login"
          ? "Pick up your streak where you left it."
          : "Your streak, your reviews, and your progress — kept across devices."}
      </p>
    </div>
  );
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

export type AuthTab = "login" | "register";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTab?: AuthTab;
}

export function AuthDialog({
  open,
  onOpenChange,
  defaultTab = "login",
}: AuthDialogProps) {
  const [tab, setTab] = useState<AuthTab>(defaultTab);

  // `useState(defaultTab)` only reads the prop once, so the dialog used to
  // reopen on whichever tab it was last left on — "Sign up" in the sidebar
  // would land the user on the sign-in form. Re-sync on each open.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTab(defaultTab);
  }

  const handleSuccess = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-6 sm:max-w-[420px]">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {tab === "login" ? "Sign in to Manabi" : "Create a Manabi account"}
          </DialogTitle>
          <DialogDescription>
            Sign in or create an account to save your progress.
          </DialogDescription>
        </DialogHeader>

        <AuthPanel mode={tab} />

        <Tabs value={tab} onValueChange={(v) => setTab(v as AuthTab)}>
          <TabsList className="mb-6 h-10 w-full">
            <TabsTrigger value="login" className="flex-1">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1">
              Create account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            <LoginForm onSuccess={handleSuccess} />
          </TabsContent>

          <TabsContent value="register" className="mt-0">
            <RegisterForm onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuthDialog() {
  const [open, setOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<AuthTab>("login");

  const openLogin = useCallback(() => {
    setDefaultTab("login");
    setOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setDefaultTab("register");
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return { open, defaultTab, openLogin, openRegister, close, setOpen };
}
