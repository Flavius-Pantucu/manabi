/**
 * Better Auth's tables.
 *
 * The column names here are not free choices — Better Auth's Drizzle adapter
 * looks these tables up by name and maps its own field names onto them. The
 * only addition is `user.role`, declared to Better Auth as an extra field in
 * `lib/auth/index.ts` with `input: false` so a sign-up request cannot set it.
 * That matters: the mock auth this replaces handed `role: "admin"` to every
 * account that registered.
 *
 * `user` is a reserved word in Postgres. Drizzle quotes identifiers, so the
 * table is created as "user" and every generated query quotes it too.
 */

import {
  boolean, index, pgTable, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./_shared";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** "user" | "admin". Never settable from a client request. */
  role: text("role").notNull().default("user"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

/**
 * One row per credential. For email/password sign-up that is a single row with
 * `providerId: "credential"` and the hash in `password` — Better Auth uses
 * scrypt by default. Adding Google or GitHub later writes rows here too,
 * which is why the OAuth token columns exist unused for now.
 */
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    /**
     * Who vouched for this identity. Better Auth 1.7 scopes an account by
     * (issuer, accountId) rather than by accountId alone, so that the same
     * subject id handed out by two different providers cannot collide. For
     * email/password it is the app's own base URL.
     */
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("account_user_idx").on(t.userId),
    uniqueIndex("account_issuer_account_uq").on(t.issuer, t.accountId),
  ],
);

/**
 * Short-lived tokens: password-reset links and email verification.
 *
 * Better Auth stores a hash here, not the token itself, and deletes the row on
 * use — so a leaked database dump cannot be replayed into an account takeover,
 * and a reset link works exactly once.
 */
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
