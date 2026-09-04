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

/**
 * Matches `emailAndPassword.minPasswordLength` in lib/auth/index.ts. A lower
 * value here would let the form accept a password the server then rejects,
 * with an error this dialog has no field to attach to.
 */
const MIN_PASSWORD = 8;

const loginSchema = z.object({
  email: z.email("That doesn't look like an email address"),
  password: z.string().min(1, "Enter your password"),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter at least 2 characters"),
    email: z.email("That doesn't look like an email address"),
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

function LoginForm({
  onSuccess,
  onForgot,
}: {
  onSuccess: () => void;
  onForgot: () => void;
}) {
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
    } catch (err) {
      // Deliberately the same message for a wrong password and an unknown
      // address. Distinguishing them turns this form into a way to find out
      // who has an account here.
      const message =
        err instanceof Error && /network|fetch|offline/i.test(err.message)
          ? "Couldn't reach the server. Check your connection and try again."
          : "That email and password don't match. Check both and try again.";
      setError("root", { message });
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

      <button
        type="button"
        onClick={onForgot}
        className="mx-auto block rounded-sm text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Forgot your password?
      </button>
    </form>
  );
}

// ─── Forgot password ─────────────────────────────────────────────────────────

const forgotSchema = z.object({
  email: z.email("That doesn't look like an email address"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

/**
 * Always reports success.
 *
 * Whether or not the address has an account, the panel says the same thing and
 * the request takes about the same time. A form that says "no account with
 * that address" is a way to test which addresses are registered here, one
 * request at a time.
 */
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { requestPasswordReset } = useAuth();
  const [sent, setSent] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (data: ForgotValues) => {
    try {
      await requestPasswordReset(data.email);
    } catch {
      // Swallowed on purpose — see the note above.
    }
    setSent(data.email);
  };

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5">
          <p className="text-sm font-medium">Check your inbox</p>
          <p className="mt-1 text-sm text-muted-foreground">
            If an account exists for <span className="font-medium">{sent}</span>,
            a link to choose a new password is on its way. It expires in an hour.
          </p>
        </div>
        <Button variant="outline" size="lg" className="w-full" onClick={onBack}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-sm text-muted-foreground">
        Enter the address you signed up with and we&rsquo;ll send you a link to
        set a new password.
      </p>

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
            Sending…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="mx-auto block rounded-sm text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Back to sign in
      </button>
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      // "Already registered" is the one failure the learner can act on, and it
      // belongs on the field it is about rather than in a banner at the bottom.
      if (/already|exists|taken/i.test(message)) {
        setError("email", {
          message: "There's already an account with this address. Sign in instead.",
        });
      } else {
        setError("root", {
          message:
            /network|fetch|offline/i.test(message)
              ? "Couldn't reach the server. Check your connection and try again."
              : "We couldn't create your account just now. Try again.",
        });
      }
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
 * The dialog's masthead — the mark, the name, nothing else.
 *
 * It carried four stacked things before: the mark, "Manabi", 学び, and a
 * mode-dependent line of prose. Four pieces of centred type is a lot of
 * masthead to read past on the way to two input fields, and none of it told
 * anyone anything the form does not. The dialog's accessible name and
 * description still live in the sr-only DialogHeader, so nothing was lost to
 * a screen reader when the visible copy went.
 *
 * The ground follows the same SHAPE as the app's ambient background — artwork,
 * then a graded scrim, then gloss — so the header reads as a window onto the
 * page behind the dialog rather than as a separate brand stamp. The gloss is
 * what makes it a pane: a light sweep off the top edge plus the
 * `--glass-highlight` hairline.
 *
 * It does NOT reuse the ambient numbers. Pointing `--ambient-blur` and
 * `--ambient-scrim` at this tile made it invisible: those values are built to
 * flatten a photograph, and this is pastel linework whose whole signal is
 * thin strokes at low contrast against their own cream ground. The pattern
 * has its own `--pattern-*` set instead — see globals.css for the numbers and
 * the measurements behind them.
 */
function AuthPanel() {
  return (
    <div className="relative -mx-6 -mt-6 mb-5 overflow-hidden border-b border-border px-6 pb-7 pt-8 text-center">
      <div aria-hidden="true" className="absolute inset-0">
        {/* Overscanned so that `--pattern-blur` can be raised without the
            layer's own edges fading in from the panel border. It is 0 by
            default — blur is what killed the linework the first time. */}
        <div
          className="absolute inset-[-8%]"
          style={{
            backgroundImage: "url('/images/cute-pattern.png')",
            backgroundSize: "280px",
            opacity: "var(--pattern-photo)",
            filter: "blur(var(--pattern-blur))",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--pattern-scrim)" }}
        />
        {/* Gloss. Theme-aware through the token: a white sweep on light, a
            barely-there lift on dark. */}
        <div
          className="absolute inset-x-0 top-0 h-2/3"
          style={{
            background:
              "linear-gradient(180deg, var(--glass-highlight) 0%, transparent 100%)",
            opacity: 0.5,
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "var(--glass-highlight)" }}
        />
      </div>

      <div className="relative">
        <ManabiMark className="mx-auto size-12" />
        <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Manabi
        </p>
      </div>
    </div>
  );
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

export type AuthTab = "login" | "register";

/**
 * Forgetting a password is a detour off the sign-in tab, not a third thing you
 * might have come here to do — so it replaces the tabs rather than joining
 * them.
 */
type Mode = AuthTab | "forgot";

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
  const [tab, setTab] = useState<Mode>(defaultTab);

  // `useState(defaultTab)` only reads the prop once, so the dialog used to
  // reopen on whichever tab it was last left on — "Sign up" in the sidebar
  // would land the user on the sign-in form. Re-sync on each open.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    // Also drops "forgot" — reopening the dialog should not resume a detour
    // the learner abandoned.
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
            {tab === "forgot"
              ? "Reset your Manabi password"
              : tab === "login"
                ? "Sign in to Manabi"
                : "Create a Manabi account"}
          </DialogTitle>
          <DialogDescription>
            Sign in or create an account to save your progress across devices.
          </DialogDescription>
        </DialogHeader>

        <AuthPanel />

        {tab === "forgot" ? (
          <ForgotPasswordForm onBack={() => setTab("login")} />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as Mode)}>
            <TabsList className="mb-6 h-10 w-full">
              <TabsTrigger value="login" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1">
                Create account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <LoginForm
                onSuccess={handleSuccess}
                onForgot={() => setTab("forgot")}
              />
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <RegisterForm onSuccess={handleSuccess} />
            </TabsContent>
          </Tabs>
        )}
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
