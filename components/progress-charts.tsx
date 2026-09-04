"use client";

import { useState, useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Charts for the progress page.
 *
 * Forms follow the data's job rather than habit: retention is a single number
 * so it is a stat tile, not a one-bar chart; forecast is magnitude over time
 * so it is single-hue columns; maturity is an ordered progression (new →
 * learning → young → mature) so it takes a sequential ramp rather than four
 * unrelated hues. Every chart is directly labelled and backed by a table, so
 * identity never rests on colour alone.
 */

// ── Forecast ────────────────────────────────────────────────────────────────

export function ForecastChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(1, ...data.map((d) => d.count));
  const H = 132;
  const total = data.reduce((a, b) => a + b.count, 0);

  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nothing scheduled yet. Reviews appear here once you start studying.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        {/* Columns. A 2px gap between bars is a surface gap, not a border. */}
        <div
          className="flex h-33 items-end gap-[2px]"
          style={{ height: H }}
          onMouseLeave={() => setHover(null)}
        >
          {data.map((d, i) => {
            const h = d.count === 0 ? 2 : Math.max(3, (d.count / max) * H);
            const active = hover === i;
            return (
              <button
                key={d.date}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="group relative flex-1 rounded-t-[4px] transition-opacity duration-(--dur-1)"
                style={{
                  height: h,
                  background: d.count === 0 ? "var(--grid)" : "var(--series)",
                  opacity: hover === null || active ? 1 : 0.45,
                }}
                aria-label={`${fmt(d.date)}: ${d.count} due`}
              />
            );
          })}
        </div>

        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-e2"
            style={{
              left: `${((hover + 0.5) / data.length) * 100}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <span className="block font-semibold text-foreground">
              {data[hover].count} due
            </span>
            <span className="block text-muted-foreground">
              {fmt(data[hover].date)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{fmt(data[0].date)}</span>
        <span data-numeric>{total} reviews over {data.length} days</span>
        <span>{fmt(data[data.length - 1].date)}</span>
      </div>

      <button
        onClick={() => setShowTable((v) => !v)}
        className="self-start text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {showTable ? "Hide" : "Show"} as table
      </button>

      {showTable && (
        <div className="max-h-56 overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card-muted">
              <tr>
                <th className="px-3 py-1.5 text-left font-semibold">Date</th>
                <th className="px-3 py-1.5 text-right font-semibold">Due</th>
              </tr>
            </thead>
            <tbody>
              {data.filter((d) => d.count > 0).map((d) => (
                <tr key={d.date} className="border-t border-border">
                  <td className="px-3 py-1.5">{fmt(d.date)}</td>
                  <td data-numeric className="px-3 py-1.5 text-right">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Maturity ────────────────────────────────────────────────────────────────

const MATURITY_STEPS = [
  { key: "new", label: "New", token: "var(--seq-1)", help: "Not studied yet" },
  { key: "learning", label: "Learning", token: "var(--seq-2)", help: "In the first few steps" },
  { key: "young", label: "Young", token: "var(--seq-3)", help: "Interval under 21 days" },
  { key: "mature", label: "Mature", token: "var(--seq-4)", help: "Interval 21 days or more" },
] as const;

export function MaturityBar({
  counts,
}: {
  counts: { new: number; learning: number; young: number; mature: number; total: number };
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = counts.total || 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Segments separated by a surface gap, never a border. */}
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {MATURITY_STEPS.map((s) => {
          const v = counts[s.key];
          if (v === 0) return null;
          return (
            <div
              key={s.key}
              className="h-full transition-opacity duration-(--dur-1) first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(v / total) * 100}%`,
                background: s.token,
                opacity: hover === null || hover === s.key ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>

      {/* Legend doubles as the direct labels and the table. */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {MATURITY_STEPS.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: s.token }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-foreground">
                {s.label}
              </span>
              <span className="block text-[11px] text-muted-foreground" title={s.help}>
                <span data-numeric>{counts[s.key]}</span>
                {" · "}
                <span data-numeric>{Math.round((counts[s.key] / total) * 100)}%</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Activity ────────────────────────────────────────────────────────────────

export function ActivityChart({
  data,
}: {
  data: { date: string; reviews: number; correct: number }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.reviews));
  const H = 96;

  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

  if (data.every((d) => d.reviews === 0)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No reviews logged yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex items-end gap-[2px]" style={{ height: H }}
           onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <button
            key={d.date}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="relative flex-1 rounded-t-[4px] transition-opacity duration-(--dur-1)"
            style={{
              height: d.reviews === 0 ? 2 : Math.max(3, (d.reviews / max) * H),
              background: d.reviews === 0 ? "var(--grid)" : "var(--seq-3)",
              opacity: hover === null || hover === i ? 1 : 0.45,
            }}
            aria-label={`${fmt(d.date)}: ${d.reviews} reviews`}
          />
        ))}
        {hover !== null && data[hover].reviews > 0 && (
          <div
            className="pointer-events-none absolute -top-1 z-10 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-e2"
            style={{ left: `${((hover + 0.5) / data.length) * 100}%`, transform: "translate(-50%, -100%)" }}
          >
            <span className="block font-semibold text-foreground">
              {data[hover].reviews} reviews
            </span>
            <span className="block text-muted-foreground">
              {Math.round((data[hover].correct / data[hover].reviews) * 100)}% correct · {fmt(data[hover].date)}
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{fmt(data[0].date)}</span>
        <span>today</span>
      </div>
    </div>
  );
}
