"use client";

import { useEffect, useState } from "react";
import { onVoicesReady, voiceStatus, type VoiceStatus } from "@/lib/speech";

/** Tracks whether a Japanese voice is actually available on this device. */
export function useVoiceStatus(): VoiceStatus {
  const [status, setStatus] = useState<VoiceStatus>("pending");

  useEffect(() => {
    setStatus(voiceStatus());
    return onVoicesReady(() => setStatus(voiceStatus()));
  }, []);

  return status;
}
