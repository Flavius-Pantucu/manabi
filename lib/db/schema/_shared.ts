/**
 * Pieces every synced table needs.
 *
 * ## Why rows carry a `revision`
 *
 * A pull asks one question: "what of mine changed after cursor N". That needs
 * a total order on writes, and the two obvious candidates both fail:
 *
 *   - A timestamp ties. Rows written in one transaction share `now()`, so
 *     `updated_at > cursor` drops a row that tied with the cursor and
 *     `>=` resends the same rows forever.
 *   - A global sequence leaves gaps under concurrency. Transaction A takes
 *     100, B takes 101 and commits first; a reader takes 101 as its cursor
 *     while A is still uncommitted, and row 100 is never seen again.
 *
 * So the counter is per user and lives in a row, not a sequence.
 * `allocateRevision` bumps it inside the writing transaction, which takes a
 * row lock — a single learner's pushes serialise against each other and gaps
 * cannot open, while different learners never contend. Every row written by
 * one push shares that push's revision, which is exactly the granularity a
 * cursor needs.
 */

import { bigint, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const userRevision = pgTable("user_revision", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Monotonic, gapless, and scoped to this learner. */
  value: bigint("value", { mode: "number" }).notNull().default(0),
});

/**
 * Set explicitly on every UPDATE of a synced row. The zero default covers the
 * rows created alongside an account, which no device has yet seen — a column
 * default alone would not be enough, since defaults fire on INSERT only and an
 * UPDATE would keep the old revision, leaving the change invisible to every
 * pull that follows.
 */
export const revision = () =>
  bigint("revision", { mode: "number" }).notNull().default(0);

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
