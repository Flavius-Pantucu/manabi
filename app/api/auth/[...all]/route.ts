/**
 * Everything under /api/auth — sign-up, sign-in, sign-out, session, forgot
 * password, reset password, change password, delete account.
 *
 * Better Auth routes them internally; there is deliberately nothing to add
 * here. Policy lives in `lib/auth/index.ts`.
 */

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// `pg` opens TCP sockets, so these handlers cannot run on the edge runtime.
export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth.handler);
