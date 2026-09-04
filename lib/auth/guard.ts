/**
 * Session plumbing for route handlers.
 *
 * `requireUser` throws rather than returning a union, so a handler reads as
 * the happy path and the error shape is decided in one place
 * (`lib/api/respond.ts`) instead of at forty call sites.
 */

import { headers } from "next/headers";
import { auth } from "./index";
import { ApiError } from "@/lib/api/respond";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getUser() {
  return (await getSession())?.user ?? null;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) throw new ApiError(401, "unauthorized", "Sign in to continue.");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    // 404, not 403: an admin console should not confirm its own existence to
    // an account that cannot use it.
    throw new ApiError(404, "not_found", "Not found.");
  }
  return user;
}
