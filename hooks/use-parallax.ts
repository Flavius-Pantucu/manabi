"use client";

import { useEffect, useRef } from "react";

/**
 * Drives a parallax layer without re-rendering React.
 *
 * The previous version held scrollY in state, so every animation frame of every
 * scroll re-rendered AppShell and, with it, the sidebar, the nav and the whole
 * page subtree — to move one background image. This writes the transform
 * straight to the node instead, so scrolling costs a single style mutation.
 *
 * Honors `prefers-reduced-motion`: parallax is vestibular-triggering motion
 * with no informational value, so it is simply not applied.
 */
export function useParallax(factor = 0.03, scale = 1.06) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      el.style.transform = `translate3d(0, ${window.scrollY * factor}px, 0) scale(${scale})`;
    };
    const rest = () => {
      el.style.transform = `scale(${scale})`;
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        apply();
        ticking = false;
      });
    };

    const sync = () => {
      if (reduced.matches) {
        window.removeEventListener("scroll", onScroll);
        rest();
      } else {
        window.addEventListener("scroll", onScroll, { passive: true });
        apply();
      }
    };

    sync();
    reduced.addEventListener("change", sync);

    return () => {
      window.removeEventListener("scroll", onScroll);
      reduced.removeEventListener("change", sync);
    };
  }, [factor, scale]);

  return ref;
}
