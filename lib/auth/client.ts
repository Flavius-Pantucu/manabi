"use client";

/**
 * The browser half of auth.
 *
 * `inferAdditionalFields` carries the `role` column declared on the server
 * through to the client's types, so `session.user.role` is `string` rather
 * than an error — without it the admin guard has nothing to check.
 */

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./index";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  updateUser,
  changePassword,
} = authClient;
