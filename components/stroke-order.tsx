"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stroke-order player.
 *
 * Kanji records used to carry a stroke *count* and nothing else, which is
 * trivia — stroke order is how the character is actually written, how it is
 * looked up in a paper dictionary, and what makes handwriting legible.
 *
 * Each stroke is drawn by animating `stroke-dashoffset` from the path's own
 * length to zero, which traces the stroke in its true direction. Strokes
 * already drawn stay on screen in a lighter tone so the build-up is visible.
 *
 * Data is fetched on demand rather than bundled: 102 characters of path data
 * is 55 KB, which has no business in the JS payload of every page.
 */

/**
 * Stroke paths are split per JLPT level (N1 alone is 1.1 MB), so the player
 * looks through the levels until it finds the character. Each file is fetched
 * at most once and shared across every player on the page.
 */
const LEVELS = ["n5", "n4", "n3", "n2", "n1"] as const;
const files = new Map<string, Promise<Record<string, string[]>>>();

function levelFile(lv: string): Promise<Record<string, string[]>> {
  let p = files.get(lv);
  if (!p) {
    p = fetch(`/data/strokes/${lv}.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    files.set(lv, p);
  }
  return p;
}

async function strokesFor(character: string): Promise<string[] | null> {
  for (const lv of LEVELS) {
    const d = await levelFile(lv);
    if (d[character]) return d[character];
  }
  return null;
}

const MS_PER_STROKE = 620;

export function StrokeOrder({
  character,
  size = 200,
  className,
}: {
  character: string;
  size?: number;
  className?: string;
}) {
  const [paths, setPaths] = useState<string[] | null>(null);
  const [error, setError] = useState(false);
  const [drawn, setDrawn] = useState(0);      // strokes fully drawn
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const activeRef = useRef<SVGPathElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setReduced(
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    let alive = true;
    setPaths(null);
    setError(false);
    strokesFor(character)
      .then((p) => {
        if (!alive) return;
        if (p) { setPaths(p); setDrawn(p.length); } else setError(true);
      })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [character]);

  const stop = useCallback(() => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (!paths) return;
    stop();
    setDrawn(0);
    setPlaying(true);
    let i = 0;
    const step = () => {
      if (i >= paths.length) { setPlaying(false); return; }
      i += 1;
      setDrawn(i);
      timer.current = window.setTimeout(step, reduced ? 260 : MS_PER_STROKE);
    };
    // Reduced motion still shows the order, just without the tracing tween.
    timer.current = window.setTimeout(step, 120);
  }, [paths, reduced, stop]);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  // Trace the stroke that is currently being drawn.
  useEffect(() => {
    const el = activeRef.current;
    if (!el || reduced || !playing) return;
    const len = el.getTotalLength();
    el.style.transition = "none";
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    // Force layout so the transition starts from the offset state.
    void el.getBoundingClientRect();
    el.style.transition = `stroke-dashoffset ${MS_PER_STROKE - 90}ms linear`;
    el.style.strokeDashoffset = "0";
  }, [drawn, playing, reduced]);

  if (error) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-xl border border-border bg-card-muted", className)}
        style={{ width: size, height: size }}
      >
        <span lang="ja" className="font-jp text-6xl text-foreground">{character}</span>
      </div>
    );
  }

  if (!paths) {
    return (
      <div
        className={cn("animate-pulse rounded-xl bg-muted", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const activeIndex = playing ? drawn - 1 : -1;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className="relative rounded-xl border border-border bg-card"
        style={{ width: size, height: size }}
      >
        {/* Writing guides — the quadrants a character is balanced against. */}
        <svg viewBox="0 0 109 109" className="absolute inset-0 size-full" aria-hidden="true">
          <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="var(--grid)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="var(--grid)" strokeWidth="1" strokeDasharray="4 4" />
        </svg>

        <svg
          viewBox="0 0 109 109"
          className="absolute inset-0 size-full"
          role="img"
          aria-label={`${character}, stroke ${drawn} of ${paths.length}`}
        >
          {paths.map((d, i) => {
            if (i >= drawn) return null;
            const isActive = i === activeIndex;
            return (
              <path
                key={i}
                ref={isActive ? activeRef : undefined}
                d={d}
                fill="none"
                stroke={isActive ? "var(--primary)" : "var(--foreground)"}
                strokeWidth={isActive ? 4 : 3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => { stop(); setDrawn((d) => Math.max(0, d - 1)); }}
          disabled={drawn === 0}
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Previous stroke</span>
        </button>

        <button
          onClick={() => (playing ? stop() : play())}
          className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors duration-(--dur-1) hover:bg-primary-hover"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "Pause" : "Play"}
        </button>

        <button
          onClick={() => { stop(); setDrawn((d) => Math.min(paths.length, d + 1)); }}
          disabled={drawn >= paths.length}
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Next stroke</span>
        </button>

        <button
          onClick={() => { stop(); setDrawn(paths.length); }}
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--dur-1) hover:bg-accent hover:text-accent-foreground"
        >
          <RotateCcw className="size-4" />
          <span className="sr-only">Show all strokes</span>
        </button>

        <span data-numeric className="ml-1 text-xs tabular-nums text-muted-foreground">
          {drawn}/{paths.length}
        </span>
      </div>
    </div>
  );
}
