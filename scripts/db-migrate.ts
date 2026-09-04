/**
 * Apply pending migrations.
 *
 * Uses drizzle's migrator rather than `drizzle-kit migrate` because the CLI
 * prompts on stdin, which makes it useless in CI and in any non-interactive
 * shell. This exits non-zero on failure and says nothing on success beyond
 * what ran.
 *
 * Runs as `vercel-build`'s first step, so a schema this code cannot work with
 * fails the build rather than the deploy.
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Absent on Vercel, where the platform injects real environment variables;
// dotenv treats a missing file as a no-op, so this is safe either way.
config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Migrations want a direct connection, not a pooled one.
 *
 * A transaction pooler (Neon's `-pooler` host, PgBouncer, Supabase's 6543
 * port) can hand consecutive statements to different backends. Two things
 * here depend on staying on one: the migrator wraps every pending migration
 * in a single transaction, and the advisory lock below is session-scoped and
 * would be released the moment the connection was swapped out from under it.
 *
 * So point `MIGRATE_DATABASE_URL` at the direct endpoint — the same URL with
 * `-pooler` dropped from the host — and leave `DATABASE_URL` pooled for the
 * app, which wants the opposite trade.
 */
// `||`, not `??`: an env var set to empty is the normal result of adding it in
// a dashboard and leaving the value blank, and it should fall through to
// DATABASE_URL rather than fail claiming neither is set.
const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error(
    "Neither MIGRATE_DATABASE_URL nor DATABASE_URL is set. Copy .env.example to .env.local.",
  );
  process.exit(1);
}

if (url.includes("-pooler.") || url.includes(":6543/")) {
  // Not fatal: it usually works, right up until it doesn't, and the failure
  // then looks like a corrupt migration rather than a pooling artefact.
  console.warn(
    "warning: migrating over a pooled connection. Set MIGRATE_DATABASE_URL to the direct endpoint.",
  );
}

/**
 * Guards against two deploys migrating at once.
 *
 * Drizzle's migrator reads only the most recent row of
 * `drizzle.__drizzle_migrations` and applies everything newer. It takes no
 * lock of its own, so two builds racing — a quick second push, or a preview
 * and production sharing a database — both read the same watermark, both
 * decide the same migration is pending, and the loser dies partway through on
 * `relation already exists`. Whoever arrives second here instead waits, then
 * finds the watermark moved and applies nothing.
 *
 * The number is arbitrary; it only has to be the same in every process.
 */
const LOCK_ID = 4021755318;

const pool = new Pool({
  connectionString: url,
  ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    // Without this the lock waits forever, and a build that hangs is worse
    // than one that fails: it burns the job's whole timeout saying nothing.
    await client.query("set lock_timeout = '60s'");
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);

    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("migrations applied");
  } finally {
    // Belt and braces: the lock dies with the session regardless.
    await client
      .query("select pg_advisory_unlock($1)", [LOCK_ID])
      .catch(() => {});
    client.release();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(
    "migration failed:",
    err instanceof Error ? err.message : String(err),
  );
  process.exitCode = 1;
});
