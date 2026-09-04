/**
 * Apply pending migrations.
 *
 * Uses drizzle's migrator rather than `drizzle-kit migrate` because the CLI
 * prompts on stdin, which makes it useless in CI and in any non-interactive
 * shell. This exits non-zero on failure and says nothing on success beyond
 * what ran.
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

migrate(drizzle(pool), { migrationsFolder: "./drizzle" })
  .then(() => console.log("migrations applied"))
  .catch((err) => {
    console.error("migration failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
