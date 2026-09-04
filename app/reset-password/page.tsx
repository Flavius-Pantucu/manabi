import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-form";

export const metadata = { title: "Choose a new password · Manabi" };

/**
 * Where the emailed reset link lands.
 *
 * Better Auth verifies the token at `/api/auth/reset-password/:token` and
 * redirects here with it in the query string, so this page's only job is to
 * take the new password and hand both back.
 */
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
