"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import {
  setUser,
  setLoading,
  updateUser as updateAuthUser,
  clearUser,
} from "./store/features/auth-slice";
import { User } from "./store/features/auth-slice";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (
    updates: Partial<Pick<User, "name" | "email" | "avatarUrl" | "role">>,
  ) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Demo-only role assignment.
 *
 * Both `login` and `register` previously hard-coded `role: "admin"`, so every
 * account in the app reached the admin console. Until there is a real backend
 * issuing roles, admin is limited to an explicit allow-list supplied at build
 * time — and is empty by default, so the safe case is the default case.
 */
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function roleFor(email: string): "user" | "admin" {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? "admin" : "user";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  const login = useCallback(
    async (email: string, _password: string) => {
      dispatch(setLoading(true));
      // Simulate a network round-trip
      await new Promise((r) => setTimeout(r, 800));

      // Case 1: Simple mock login (reusing email parts)
      const newUser: User = {
        name: email.split("@")[0],
        email,
        avatarInitials: email.split("@")[0].slice(0, 2).toUpperCase(),
        joinedAt: new Date().toISOString(),
        role: roleFor(email),
      };
      dispatch(setUser(newUser));
    },
    [dispatch],
  );

  const register = useCallback(
    async (name: string, email: string, _password: string) => {
      dispatch(setLoading(true));
      await new Promise((r) => setTimeout(r, 800));
      const newUser: User = {
        name,
        email,
        avatarInitials: name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        joinedAt: new Date().toISOString(),
        // New accounts are never privileged. This used to hand every
        // registration `role: "admin"`, which opened the admin console to
        // anyone who signed up.
        role: "user",
      };
      dispatch(setUser(newUser));
    },
    [dispatch],
  );

  const logout = useCallback(() => {
    dispatch(clearUser());
  }, [dispatch]);

  const updateUser = useCallback(
    (updates: Partial<Pick<User, "name" | "email" | "avatarUrl" | "role">>) => {
      dispatch(updateAuthUser(updates));
    },
    [dispatch],
  );

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
