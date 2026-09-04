/**
 * Export and import.
 *
 * All progress lives in localStorage under one key, so clearing site data ends
 * a streak permanently and a second device starts from zero. Until there is a
 * backend, a file the learner owns is the honest answer — and it is also the
 * only way to move between devices at all.
 *
 * The format is versioned and plain JSON so it stays readable and can be
 * migrated rather than discarded.
 */

import type { SrsState } from "@/lib/store/features/srs-slice";
import type { LearningState } from "@/lib/store/features/learning-slice";
import type { SrsCard, ReviewLogEntry } from "./scheduler";

export const BACKUP_VERSION = 1;

export interface ManabiBackup {
  format: "manabi-progress";
  version: number;
  exportedAt: string;
  srs: SrsState;
  learning: Partial<LearningState>;
}

const DEFAULT_SETTINGS: SrsState["settings"] = {
  newPerDay: 10,
  maxReviewsPerDay: 120,
  disabledDecks: [],
  levels: ["N5"],
};

/** Take only the fields we recognise, clamped to sane bounds. */
function readSettings(raw: unknown): SrsState["settings"] {
  const s = (raw ?? {}) as Partial<SrsState["settings"]>;
  const num = (v: unknown, fallback: number, lo: number, hi: number) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.min(hi, Math.max(lo, Math.round(v)))
      : fallback;
  return {
    newPerDay: num(s.newPerDay, DEFAULT_SETTINGS.newPerDay, 0, 200),
    maxReviewsPerDay: num(s.maxReviewsPerDay, DEFAULT_SETTINGS.maxReviewsPerDay, 10, 2000),
    disabledDecks: Array.isArray(s.disabledDecks)
      ? s.disabledDecks.filter((d): d is string => typeof d === "string")
      : [],
    levels: Array.isArray(s.levels) && s.levels.length
      ? s.levels.filter((d): d is string => typeof d === "string")
      : DEFAULT_SETTINGS.levels,
  };
}

export function buildBackup(srs: SrsState, learning: LearningState): ManabiBackup {
  return {
    format: "manabi-progress",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    srs,
    learning,
  };
}

export function serializeBackup(b: ManabiBackup): string {
  return JSON.stringify(b, null, 2);
}

export interface ParseResult {
  ok: boolean;
  error?: string;
  backup?: ManabiBackup;
  summary?: { cards: number; reviews: number; exportedAt: string };
}

/**
 * Validate an uploaded file. Deliberately strict about shape and forgiving
 * about extra fields, so a newer export can still be read by an older build.
 */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (typeof data !== "object" || data === null) {
    return { ok: false, error: "That file doesn't contain a backup." };
  }
  const b = data as Partial<ManabiBackup>;

  if (b.format !== "manabi-progress") {
    return { ok: false, error: "That's not a Manabi progress file." };
  }
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `This file was made by a newer version of Manabi (v${b.version}). Update, then import again.`,
    };
  }
  if (!b.srs || typeof b.srs !== "object" || typeof b.srs.cards !== "object") {
    return { ok: false, error: "The progress data in this file is incomplete." };
  }

  const cards = b.srs.cards as Record<string, SrsCard>;
  const log = Array.isArray(b.srs.log) ? (b.srs.log as ReviewLogEntry[]) : [];

  // Drop anything structurally wrong rather than importing a corrupt card that
  // would break the scheduler on the learner's next review.
  const clean: Record<string, SrsCard> = {};
  for (const [id, c] of Object.entries(cards)) {
    if (
      c && typeof c === "object" &&
      typeof c.due === "number" && Number.isFinite(c.due) &&
      typeof c.stability === "number" && Number.isFinite(c.stability) &&
      typeof c.difficulty === "number" && Number.isFinite(c.difficulty) &&
      typeof c.phase === "string"
    ) {
      clean[id] = { ...c, id };
    }
  }

  const backup: ManabiBackup = {
    format: "manabi-progress",
    version: b.version,
    exportedAt: typeof b.exportedAt === "string" ? b.exportedAt : "unknown",
    srs: {
      cards: clean,
      log,
      daily: (b.srs.daily as SrsState["daily"]) ?? {},
      settings: readSettings(b.srs.settings),
    },
    learning: (b.learning as Partial<LearningState>) ?? {},
  };

  return {
    ok: true,
    backup,
    summary: {
      cards: Object.keys(clean).length,
      reviews: log.length,
      exportedAt: backup.exportedAt,
    },
  };
}

/**
 * Merge an import into existing progress, keeping whichever version of each
 * card was reviewed more recently. Replacing outright would silently destroy
 * work done on this device since the export.
 */
export function mergeBackup(current: SrsState, incoming: SrsState): SrsState {
  const cards = { ...current.cards };
  for (const [id, inc] of Object.entries(incoming.cards)) {
    const cur = cards[id];
    if (!cur || (inc.lastReview ?? 0) > (cur.lastReview ?? 0)) cards[id] = inc;
  }

  // De-duplicate the log on (card, timestamp) so repeated imports don't
  // inflate the review history the retention stats are computed from.
  const seen = new Set(current.log.map((l) => `${l.id}@${l.at}`));
  const log = [...current.log];
  for (const l of incoming.log) {
    const k = `${l.id}@${l.at}`;
    if (!seen.has(k)) { seen.add(k); log.push(l); }
  }
  log.sort((a, b) => a.at - b.at);

  const daily = { ...current.daily };
  for (const [d, v] of Object.entries(incoming.daily)) {
    const cur = daily[d];
    daily[d] = cur
      ? {
          reviews: Math.max(cur.reviews, v.reviews),
          newCards: Math.max(cur.newCards, v.newCards),
          correct: Math.max(cur.correct, v.correct),
        }
      : v;
  }

  return { cards, log, daily, settings: current.settings };
}

/** Trigger a download. Kept here so the page component stays declarative. */
export function downloadBackup(b: ManabiBackup) {
  const blob = new Blob([serializeBackup(b)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `manabi-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
