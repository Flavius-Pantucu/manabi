"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Manabi mark — the sakura artwork from `public/logo.png`.
 *
 * It points at `/icon.png`, NOT at `logo.png` itself. `next.config.mjs` sets
 * `images.unoptimized`, so next/image serves whatever file it is handed at
 * full size — and logo.png is a 465px, 229 KB source rendered here between 24
 * and 44 CSS px. `/icon.png` is that same artwork resampled to 192px (48 KB),
 * which still covers the largest use on a 3× display, and it is the file the
 * favicon and the manifest already reference, so it is one cache entry rather
 * than two. If image optimization is ever turned on, point this back at
 * `/logo.png` and let Next build the srcset.
 *
 * Decorative by default. Both current call sites set the word "Manabi" in
 * text right beside the mark, so an alt string here would make a screen
 * reader say the name twice; pass `label` only when the mark stands alone.
 */
export function ManabiMark({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Image
      src="/icon.png"
      alt={label ?? ""}
      width={192}
      height={192}
      priority
      className={cn("size-6 object-contain", className)}
    />
  );
}

/**
 * The lockup used in the sidebar and the auth dialog.
 *
 * No chip behind it. The artwork carries its own darker outline, so it holds
 * its edge on the washi ground and on the dark panel without one, and a
 * `bg-primary` chip put a pale pink flower on deep pink — the mark went muddy
 * at the exact size it is read at.
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
        "flex size-10 shrink-0 items-center justify-center",
        className,
      )}
    >
      <ManabiMark className={cn("size-10", markClassName)} />
    </div>
  );
}
