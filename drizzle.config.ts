import { config } from "dotenv";

// Next loads `.env.local` on its own; drizzle-kit runs outside Next and does
// not, so the CLI would otherwise see no DATABASE_URL and diff against nothing.
config({ path: ".env.local" });
config({ path: ".env" });
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Drizzle otherwise proposes dropping anything it did not create. Better
  // Auth's tables are declared in lib/db/schema/auth.ts precisely so that they
  // are in scope here and this stays a true diff of the whole database.
  verbose: true,
  strict: true,
});
