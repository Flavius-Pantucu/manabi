"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The Manabi mark — a five-petal sakura drawn as one petal rotated 5× about
 * the center, with the flower's eye knocked out through a mask.
 *
 * Replaces the previous logo.png (a pale pink flower on transparency), which
 * disappeared against light and pink surfaces, could not invert for dark mode,
 * and cost 229 KB. This inherits `currentColor`, so it is legible on any
 * surface the caller has already made accessible, and it holds its shape at
 * favicon size because it is a solid silhouette rather than an outline.
 */

const PETAL =
  "M12 12C11.4 10.6 9.8 9.2 8.85 6.9 8.4 5 9.35 3.1 10.8 2.9 " +
  "11.4 2.82 11.82 3.35 12 4.05 12.18 3.35 12.6 2.82 13.2 2.9 " +
  "14.65 3.1 15.6 5 15.15 6.9 14.2 9.2 12.6 10.6 12 12Z";

export function ManabiMark({ className }: { className?: string }) {
  const id = useId();
  const maskId = `sakura-${id}`;
  const petalId = `petal-${id}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-6", className)}
      role="img"
      aria-label="Manabi"
    >
      <defs>
        <path id={petalId} d={PETAL} />
        <mask id={maskId}>
          <rect width="24" height="24" fill="black" />
          <g fill="white">
            {[0, 72, 144, 216, 288].map((deg) => (
              <use
                key={deg}
                href={`#${petalId}`}
                transform={`rotate(${deg} 12 12)`}
              />
            ))}
          </g>
          {/* The eye. Knocked out rather than painted, so it reads as the
              surface behind the mark on every background. */}
          <circle cx="12" cy="12" r="1.15" fill="black" />
        </mask>
      </defs>
      <rect width="24" height="24" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

/**
 * The mark set in its chip — the lockup used in the sidebar and the auth
 * dialog. The chip is opaque on purpose: a translucent chip was what made the
 * old logo illegible over the dialog's pattern.
 */
export function ManabiLogo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-e1",
        className,
      )}
    >
      <ManabiMark className={cn("size-6", markClassName)} />
    </div>
  );
}
