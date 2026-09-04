"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, KeyRound, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

/** Matches the server floor in lib/auth/index.ts. */
const MIN_PASSWORD = 8;

const schema = z
  .object({
    password: z.string().min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters`),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "This doesn't match the password above",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [done, setDone] = useState(false);

  const token = params.get("token");
  // Better Auth appends this when the token has already been used or has
  // expired, rather than sending the learner to a form that cannot work.
  const linkError = params.get("error");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Values) => {
    if (!token) return;
    try {
      await resetPassword(token, data.password);
      setDone(true);
      // Straight to sign-in rather than signing them in silently: someone who
      // just changed a password expects to use it.
      setTimeout(() => router.push("/"), 2500);
    } catch (err) {
      setError("root", {
        message:
          err instanceof Error && err.message
            ? err.message
            : "That link didn't work. Request a new one and try again.",
      });
    }
  };

  if (!token || linkError) {
    return (
      <Card
        icon={<TriangleAlert className="size-6 text-destructive" />}
        title="This link has expired"
      >
        <p className="text-muted-foreground">
          Reset links last an hour and can only be used once. Ask for a fresh
          one from the sign-in dialog and it will arrive in a moment.
        </p>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/">Back to Manabi</Link>
        </Button>
      </Card>
    );
  }

  if (done) {
    return (
      <Card
        icon={<CheckCircle2 className="size-6 text-primary" />}
        title="Password changed"
      >
        <p className="text-muted-foreground">
          You can sign in with your new password now. Every other device signed
          in to this account has been signed out.
        </p>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/">Continue</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card
      icon={<KeyRound className="size-6 text-primary" />}
      title="Choose a new password"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            aria-invalid={!!errors.password}
            aria-describedby="new-password-hint"
            {...register("password")}
          />
          <p id="new-password-hint" className="text-xs text-muted-foreground">
            At least {MIN_PASSWORD} characters.
          </p>
          {errors.password && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register("confirm")}
          />
          {errors.confirm && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errors.confirm.message}
            </p>
          )}
        </div>

        {errors.root && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          >
            {errors.root.message}
          </p>
        )}

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
              Saving…
            </>
          ) : (
            "Set new password"
          )}
        </Button>
      </form>
    </Card>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-inset w-full max-w-sm rounded-2xl border p-6 shadow-e2">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </span>
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {children}
    </div>
  );
}
