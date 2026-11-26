"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

/**
 * The Manabi mark — transparent PNG emblem from `public/icon.png` (cropped from
 * `public/logo.png`) so the sidebar logo and browser favicon are identical.
 *
 * Smoothly shifts hue from Cobalt Indigo (Japanese) to Crimson Red (Spanish)
 * when the active language changes.
 */
export function ManabiMark({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const { language } = useLanguage();

  return (
    <Image
      src="/icon.png?v=3"
      alt={label ?? ""}
      width={192}
      height={192}
      priority
      className={cn(
        "size-6 shrink-0 object-contain transition-[filter] duration-300 ease-(--ease-out-expo)",
        language === "es" && "hue-rotate-[138deg] saturate-[1.15]",
        className,
      )}
    />
  );
}

/**
 * The lockup used in the sidebar and navigation drawer.
 * Transparent background — sits cleanly on any light or dark surface.
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
        "flex size-9 shrink-0 items-center justify-center",
        className,
      )}
    >
      <ManabiMark className={cn("size-9", markClassName)} />
    </div>
  );
}
