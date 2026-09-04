"use client";

/**
 * The app's view of who is signed in.
 *
 * The shape of this context is unchanged from the mock it replaces — `user`,
 * `isLoading`, `login`, `register`, `logout`, `updateUser` — so the profile
 * page, app shell, admin console and auth dialog carry on calling `useAuth()`
 * as before. What changed is everything underneath: the session now comes from
 * a signed cookie backed by a `session` row, not from a `setTimeout` and a
 * guess at the user's name from the local part of their email address.
 *
 * Two things the mock got wrong and are now structurally impossible:
 *
 *  - the password is checked. It was previously ignored outright, so any
 *    password signed you in as anyone.
 *  - `role` comes from the database and cannot be set at sign-up. It used to
 *    be read from a build-time email allow-list on the client, where a
 *    determined learner could simply edit it.
 */

import {
  createContext, useCallback, useContext, useMemo, type ReactNode,
} from "react";
import { authClient } from "./auth/client";
import { clearSyncState } from "./sync/client";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  avatarUrl?: string;
  joinedAt: string;
  role: "user" | "admin";
  emailVerified: boolean;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (
    updates: Partial<Pick<User, "name" | "avatarUrl">>,
  ) => Promise<void>;
  /** Changing an address re-verifies it, so this is not part of updateUser. */
  changeEmail: (email: string) => Promise<void>;
  /** Send the reset link. Resolves the same way whether the address exists. */
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

/**
 * Better Auth reports failures in the result rather than by throwing. The
 * forms are written against exceptions, so failures are re-thrown here — in
 * one place, with the server's message intact.
 */
function unwrap<T>(res: { data?: T | null; error?: { message?: string } | null }): T {
  if (res.error) throw new Error(res.error.message ?? "Something went wrong.");
  return res.data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, refetch } = authClient.useSession();

  const user = useMemo<User | null>(() => {
    const u = session?.user;
    if (!u) return null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatarInitials: initials(u.name),
      avatarUrl: u.image ?? undefined,
      joinedAt: new Date(u.createdAt).toISOString(),
      role: (u as { role?: string }).role === "admin" ? "admin" : "user",
      emailVerified: u.emailVerified,
    };
  }, [session]);

  const login = useCallback(
    async (email: string, password: string) => {
      unwrap(await authClient.signIn.email({ email, password }));
      refetch();
    },
    [refetch],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      unwrap(await authClient.signUp.email({ name, email, password }));
      refetch();
    },
    [refetch],
  );

  const logout = useCallback(async () => {
    await authClient.signOut();
    // Drop the sync cursor as well. Leaving it behind would make the next
    // account to sign in on this browser ask the server for "changes since
    // revision 400" — a revision belonging to somebody else's history.
    clearSyncState();
    refetch();
  }, [refetch]);

  const updateUser = useCallback(
    async (updates: Partial<Pick<User, "name" | "avatarUrl">>) => {
      unwrap(
        await authClient.updateUser({
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.avatarUrl !== undefined ? { image: updates.avatarUrl } : {}),
        }),
      );
      refetch();
    },
    [refetch],
  );

  const changeEmail = useCallback(
    async (newEmail: string) => {
      unwrap(await authClient.changeEmail({ newEmail }));
      refetch();
    },
    [refetch],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    // Never surfaces whether the address is registered: the response is
    // identical either way, which is the only way this form does not double
    // as an account-enumeration oracle.
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    unwrap(await authClient.resetPassword({ token, newPassword: password }));
  }, []);

  const changePassword = useCallback(async (current: string, next: string) => {
    unwrap(
      await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        // Sign other devices out. If the password is being changed because it
        // leaked, leaving those sessions alive defeats the exercise.
        revokeOtherSessions: true,
      }),
    );
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: isPending,
      login,
      register,
      logout,
      updateUser,
      changeEmail,
      requestPasswordReset,
      resetPassword,
      changePassword,
      refresh: refetch,
    }),
    [
      user, isPending, login, register, logout, updateUser, changeEmail,
      requestPasswordReset, resetPassword, changePassword, refetch,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
