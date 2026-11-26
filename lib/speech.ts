"use client";

/**
 * Japanese speech, and an honest answer when it isn't available.
 *
 * Two things go wrong with `speechSynthesis` and Japanese, and both produce the
 * same symptom — text read aloud in an English voice:
 *
 *  1. **No voice assigned.** If `utterance.voice` is left unset the browser
 *     picks the system default, which reads Japanese with English phonetics.
 *     Setting `utterance.lang = "ja-JP"` alone does NOT prevent this.
 *  2. **A network voice that fails.** Voices with `localService === false`
 *     (notably "Google 日本語" in Chrome) are synthesised server-side. If that
 *     request is blocked, offline, or slow, Chrome falls back to the local
 *     default voice — again, English — without raising an error.
 *
 * So: we never speak without an explicit Japanese voice, we prefer local
 * voices over network ones, and the voice object is resolved fresh on every
 * call because stale `SpeechSynthesisVoice` references are also discarded by
 * Chrome in favour of the default.
 */

export type VoiceStatus = "unsupported" | "pending" | "available" | "none";

const PREF_KEY = "manabi.voiceURI";
const RATE_KEY = "manabi.voiceRate";

let cached: SpeechSynthesisVoice[] = [];
let listeners: (() => void)[] = [];
let bound = false;
let polling = false;

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function refresh(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  const v = s.getVoices();
  if (v.length) cached = v;
  return cached;
}

function notify() {
  listeners.forEach((f) => f());
}

/**
 * `voiceschanged` is not dependable.
 *
 * Chrome populates the voice list asynchronously and fires the event once — if
 * a listener attaches after that, it never fires again and `getVoices()` may
 * still have returned `[]` on the first read. Safari sometimes never fires it
 * at all. So we poll alongside the event and stop as soon as voices appear.
 */
function startPolling() {
  const s = synth();
  if (polling || !s) return;
  polling = true;
  let tries = 0;
  const tick = () => {
    const before = cached.length;
    refresh();
    if (cached.length !== before) notify();
    // ~5s of attempts, backing off. Voice lists that are going to arrive have
    // always arrived well inside that.
    if (cached.length === 0 && ++tries < 25) {
      setTimeout(tick, tries < 10 ? 100 : 300);
    } else {
      polling = false;
    }
  };
  tick();
}

function bind() {
  const s = synth();
  if (bound || !s) return;
  bound = true;
  s.addEventListener("voiceschanged", () => {
    refresh();
    notify();
  });
  refresh();
  if (cached.length === 0) startPolling();
}

export function onVoicesReady(fn: () => void): () => void {
  bind();
  if (cached.length === 0) startPolling();
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((f) => f !== fn);
  };
}

/** Every voice the browser reports — for diagnostics when none are Japanese. */
export function allVoices(): SpeechSynthesisVoice[] {
  bind();
  return [...refresh()].sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
}

/** Matches ja, ja-JP, ja_JP and regional extensions; never en-*. */
const IS_JA = /^ja(-|_|$)/i;
/** Matches es, es-ES, es-MX, es-419, etc. */
const IS_ES = /^es(-|_|$)/i;

export function listVoicesForLanguage(lang: "ja" | "es" = "ja"): SpeechSynthesisVoice[] {
  const re = lang === "es" ? IS_ES : IS_JA;
  return refresh()
    .filter((v) => re.test(v.lang))
    .sort((a, b) =>
      a.localService === b.localService
        ? a.name.localeCompare(b.name)
        : a.localService ? -1 : 1,
    );
}

export function listJapaneseVoices(): SpeechSynthesisVoice[] {
  return listVoicesForLanguage("ja");
}

export function voiceStatus(): VoiceStatus {
  if (!synth()) return "unsupported";
  bind();
  const all = refresh();
  if (all.length === 0) return "pending";
  return listJapaneseVoices().length > 0 ? "available" : "none";
}

// ── preference ──────────────────────────────────────────────────────────────

export function getPreferredVoiceURI(): string | null {
  try {
    return localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

export function setPreferredVoiceURI(uri: string | null) {
  try {
    if (uri) localStorage.setItem(PREF_KEY, uri);
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* private mode — the session default still applies */
  }
  listeners.forEach((f) => f());
}

export function getRate(): number {
  try {
    const v = Number(localStorage.getItem(RATE_KEY));
    return Number.isFinite(v) && v >= 0.5 && v <= 1.2 ? v : 0.9;
  } catch {
    return 0.9;
  }
}

export function setRate(r: number) {
  try {
    localStorage.setItem(RATE_KEY, String(r));
  } catch {
    /* ignore */
  }
}

/**
 * Resolve the voice to use, fresh, on every call.
 *
 * Order: the learner's explicit choice, then a local ja-JP voice, then any
 * local Japanese voice, then a network one as a last resort.
 */
export function resolveVoice(lang: "ja" | "es" = "ja"): SpeechSynthesisVoice | undefined {
  const list = listVoicesForLanguage(lang);
  if (!list.length) return undefined;

  if (lang === "ja") {
    const pref = getPreferredVoiceURI();
    if (pref) {
      const match = list.find((v) => v.voiceURI === pref);
      if (match) return match;
    }
  }
  const preferredRe = lang === "es" ? /^es(-|_)(ES|MX|US|419)$/i : /^ja(-|_)JP$/i;
  return (
    list.find((v) => v.localService && preferredRe.test(v.lang)) ??
    list.find((v) => v.localService) ??
    list[0]
  );
}

/** True when the only Japanese voices available are synthesised over the network. */
export function onlyNetworkVoices(): boolean {
  const ja = listJapaneseVoices();
  return ja.length > 0 && ja.every((v) => !v.localService);
}

// ── speaking ────────────────────────────────────────────────────────────────

export interface SpeakOptions {
  rate?: number;
  lang?: "ja" | "es";
  onEnd?: () => void;
  onUnavailable?: () => void;
}

/**
 * Speak text in the selected language. Synchronous by design — going through `await`
 * first breaks the user-gesture context Safari and Chrome require.
 */
export function speak(text: string, opts: SpeakOptions = {}): boolean {
  const s = synth();
  if (!s) {
    opts.onUnavailable?.();
    return false;
  }
  bind();

  const lang = opts.lang ?? "ja";
  const voice = resolveVoice(lang);
  if (!voice) {
    if (lang === "es") {
      // Fallback for Spanish using explicit lang tag if no specific voice is listed yet
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-ES";
      u.rate = opts.rate ?? getRate();
      u.pitch = 1;
      u.onend = () => opts.onEnd?.();
      s.speak(u);
      return true;
    }
    opts.onUnavailable?.();
    return false;
  }

  s.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang || (lang === "es" ? "es-ES" : "ja-JP");
  u.rate = opts.rate ?? getRate();
  u.pitch = 1;
  u.onend = () => opts.onEnd?.();
  u.onerror = (e) => {
    if (e.error === "canceled" || e.error === "interrupted") return;
    opts.onUnavailable?.();
  };

  s.speak(u);
  return true;
}

export function stopSpeaking() {
  synth()?.cancel();
}

/** Human-readable reason, for the tooltip on a disabled audio control. */
export const VOICE_HELP: Record<VoiceStatus, string> = {
  unsupported: "This browser has no speech synthesis.",
  pending: "Loading voices…",
  available: "Play pronunciation",
  none:
    "No Japanese voice is installed on this device, so pronunciation is off. " +
    "macOS: System Settings → Accessibility → Spoken Content → System Voice → " +
    "Manage Voices, and add a Japanese voice. Windows: Settings → Time & " +
    "language → Language → add Japanese with its speech pack. Linux: install a " +
    "ja-JP voice for espeak-ng or your speech-dispatcher backend.",
};
