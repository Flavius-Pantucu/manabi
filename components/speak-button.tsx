"use client";

import { cn } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { useVoiceStatus } from "@/hooks/use-voice-status";
import { speak, VOICE_HELP } from "@/lib/speech";
import { useLanguage } from "@/lib/language-context";

/**
 * One audio control for the whole app.
 */
export function SpeakButton({
  text,
  size = "md",
  className,
  label,
}: {
  text: string;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  const { language } = useLanguage();
  const status = useVoiceStatus();
  const unavailable = language === "ja" && (status === "none" || status === "unsupported");
  const box = size === "sm" ? "size-8" : "size-9";
  const icon = size === "sm" ? "size-3.5" : "size-4";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!unavailable) speak(text, { lang: language });
      }}
      disabled={unavailable}
      title={unavailable ? VOICE_HELP[status] : undefined}
      aria-disabled={unavailable}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md transition-colors duration-(--dur-1)",
        box,
        unavailable
          ? "cursor-not-allowed text-muted-foreground/50"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {unavailable ? <VolumeX className={icon} /> : <Volume2 className={icon} />}
      <span className="sr-only">
        {unavailable
          ? "Pronunciation unavailable — no Japanese voice installed"
          : label ?? `Play ${text}`}
      </span>
    </button>
  );
}
