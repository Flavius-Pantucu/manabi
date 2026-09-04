/**
 * The database handle.
 *
 * A `pg` Pool over a plain `DATABASE_URL`, which is the one connection story
 * every Postgres host understands — local, Neon, Supabase, RDS. Swapping to a
 * host's own serverless driver later is a change to this file alone.
 *
 * The pool is cached on `globalThis` because Next's dev server re-evaluates
 * modules on every edit; without it a morning's work leaks a few hundred
 * connections and Postgres starts refusing them.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var __manabiPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString,
    // Hosted Postgres almost always terminates TLS with a certificate the
    // Node default store won't chain to. `sslmode=require` in the URL turns
    // this on; local development leaves it off entirely.
    ssl: connectionString?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export const pool = globalThis.__manabiPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__manabiPool = pool;

export const db = drizzle(pool, { schema });

export type Db = typeof db;
export { schema };
