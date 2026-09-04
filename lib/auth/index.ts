/**
 * The auth server.
 *
 * Better Auth owns the four tables in `lib/db/schema/auth.ts` and the whole
 * `/api/auth/*` surface: sign-up, sign-in, sign-out, session lookup, forgot
 * password and reset. What is configured here is only the policy around it.
 *
 * Two decisions worth knowing:
 *
 *  - `role` is declared with `input: false`. Better Auth will not accept it
 *    from a request body, so a crafted sign-up cannot mint an admin. The
 *    client-side mock this replaces gave `role: "admin"` to every account.
 *  - A learner's profile and SRS settings rows are created in the same
 *    transaction as the account, so no other code has to cope with a user who
 *    exists but has no settings.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/lib/db";
import { resetPasswordEmail, sendEmail } from "./email";

const DAY = 60 * 60 * 24;

export const auth = betterAuth({
  appName: "Manabi",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    /**
     * Eight, and no composition rules. Length is the only requirement that
     * reliably buys entropy; forcing a symbol mostly buys `Password1!`.
     */
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    /**
     * Off for now: an unverifiable inbox would lock a learner out of an app
     * whose data is entirely their own. Flip to `true` once a real sending
     * domain is configured, and `sendVerificationEmail` below starts firing.
     */
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    /**
     * Sign every other device out when a password is reset.
     *
     * Off by default, which is the wrong default here: the common reason to
     * reset a password is that the old one leaked, and leaving the sessions it
     * opened alive defeats the exercise. The reset page tells the learner this
     * happens, so it had better.
     */
    revokeSessionsOnPasswordReset: true,

    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ ...resetPasswordEmail(user.name, url), to: user.email });
    },

    onPasswordReset: async ({ user }) => {
      console.info(`password reset completed for ${user.id}`);
    },
  },

  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Confirm your Manabi address",
        text: `Hi ${user.name},\n\nConfirm your email address to finish setting up Manabi:\n\n${url}\n`,
      });
    },
  },

  verification: {
    /**
     * Store a SHA-256 of the token identifier rather than the token.
     *
     * Better Auth defaults to plain, which puts a live password-reset token in
     * `verification.identifier` — anyone who can read the table, or a backup of
     * it, can take over an account for the hour the token lives. Hashing costs
     * nothing: lookups hash the incoming token the same way, and consume falls
     * back to the plain identifier, so tokens already in flight still work.
     */
    storeIdentifier: "hashed",
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        // The whole point. Without this, `role` is just another field a
        // sign-up request may set.
        input: false,
      },
    },
    changeEmail: { enabled: true },
    deleteUser: {
      // Every table cascades from `user`, so this really does remove
      // everything — cards, review history, quiz attempts, custom decks.
      enabled: true,
    },
  },

  session: {
    expiresIn: 30 * DAY,
    /** Sliding window: a session in daily use never expires under the learner. */
    updateAge: DAY,
    /**
     * Deliberately off.
     *
     * The cookie cache serialises the whole user row into `session_data` —
     * `image` included. Avatars are stored as data URLs, so an 85 KB photo
     * became 156 KB of `Set-Cookie` split across 40 chunks, and the browser
     * handed all of it back on the next request. Node caps request headers at
     * 16 KB, so every request after sign-in died with 431 before Next saw it:
     * sign-in wrote its session row, and the app could never read it.
     *
     * Shrinking the avatar only moves the cliff. At the 64 KB ceiling in
     * `lib/image.ts` the cookie is still ~117 KB, and even a well-compressed
     * 25 KB avatar clears 47 KB — all of it past the limit. Any cache that
     * carries `user` in a cookie is one upload away from locking the learner
     * out, so the session comes from the `session` row instead. That is one
     * indexed SELECT, which is the cost this cache was avoiding.
     *
     * Re-enable only once `user.image` holds a URL rather than image bytes.
     */
    cookieCache: { enabled: false },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      // Sign-in and reset are the endpoints worth guessing at.
      "/sign-in/email": { window: 60, max: 8 },
      "/forget-password": { window: 60 * 15, max: 5 },
      "/reset-password": { window: 60 * 15, max: 5 },
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (created) => {
          // A learner always has settings. Doing this here means no queue
          // build, progress page or sync pull ever has to handle their absence.
          await db
            .insert(schema.learningProfile)
            .values({ userId: created.id })
            .onConflictDoNothing();
          await db
            .insert(schema.srsSetting)
            .values({ userId: created.id })
            .onConflictDoNothing();
        },
      },
    },
  },

  advanced: {
    cookiePrefix: "manabi",
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  // Must stay last: it is what lets Better Auth set cookies from within
  // Next server actions and route handlers.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];
