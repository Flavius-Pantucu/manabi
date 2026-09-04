"use client";

import { cn } from "@/lib/utils";
import { LEVELS, type Level } from "@/lib/content/types";

/**
 * Level selector for the study pages.
 *
 * With five levels and 8,034 words, browsing "everything" is not a useful
 * default — the list has to be scoped before it means anything. Counts come
 * from the manifest so the numbers are right before the level has loaded.
 */
export function LevelFilter({
  value,
  onChange,
  counts,
  className,
}: {
  value: Level;
  onChange: (l: Level) => void;
  counts?: Partial<Record<Level, number>>;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="JLPT level"
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {LEVELS.map((lv) => {
        const on = value === lv;
        return (
          <button
            key={lv}
            onClick={() => onChange(lv)}
            aria-pressed={on}
            className={cn(
              "min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors duration-(--dur-1)",
              on
                ? "border-primary bg-primary-tint text-secondary-foreground"
                : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {lv}
            {counts?.[lv] !== undefined && (
              <span
                data-numeric
                className={cn(
                  "ml-1.5 text-xs",
                  on ? "text-secondary-foreground/75" : "text-muted-foreground/75",
                )}
              >
                {counts[lv]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
