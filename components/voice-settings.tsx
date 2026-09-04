"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Volume2, TriangleAlert, Check, Wifi, HardDrive, RefreshCw, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  listJapaneseVoices, allVoices, getPreferredVoiceURI, setPreferredVoiceURI,
  getRate, setRate, onVoicesReady, voiceStatus, onlyNetworkVoices,
  speak, VOICE_HELP, type VoiceStatus,
} from "@/lib/speech";

/** A short, familiar line to judge a voice by. */
const SAMPLE = "こんにちは。日本語を勉強しています。";

const INSTALL_HELP = [
  { os: "macOS", steps: "System Settings → Accessibility → Spoken Content → System Voice → Manage Voices → Japanese (Kyoko)" },
  { os: "Windows", steps: "Settings → Time & language → Language & region → Add Japanese, then install its Speech pack" },
  { os: "Linux", steps: "Install a ja-JP voice for espeak-ng, or a Japanese speech-dispatcher backend" },
  { os: "iOS / iPadOS", steps: "Settings → Accessibility → Spoken Content → Voices → Japanese" },
  { os: "Android", steps: "Settings → Accessibility → Text-to-speech → install the Japanese language data" },
];

export function VoiceSettings() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [every, setEvery] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<VoiceStatus>("pending");
  const [pref, setPref] = useState<string | null>(null);
  const [rate, setRateState] = useState(0.9);
  const [networkOnly, setNetworkOnly] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const sync = useCallback(() => {
    setVoices(listJapaneseVoices());
    setEvery(allVoices());
    setStatus(voiceStatus());
    setPref(getPreferredVoiceURI());
    setNetworkOnly(onlyNetworkVoices());
  }, []);

  useEffect(() => {
    sync();
    setRateState(getRate());
    return onVoicesReady(sync);
  }, [sync]);

  const test = (uri?: string) => {
    setFailed(false);
    if (uri !== undefined) { setPreferredVoiceURI(uri); setPref(uri); }
    speak(SAMPLE, { rate, onUnavailable: () => setFailed(true) });
  };

  const noneAtAll = every.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Volume2 className="size-4 text-muted-foreground" />
          Pronunciation voice
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Always visible, so an empty list is never a blank card. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-muted px-3 py-2.5">
          <span className="text-sm">
            <span className="text-muted-foreground">Voices detected: </span>
            <span data-numeric className="font-semibold text-foreground">{every.length}</span>
          </span>
          <span className="text-sm">
            <span className="text-muted-foreground">Japanese: </span>
            <span
              data-numeric
              className={cn(
                "font-semibold",
                voices.length ? "text-matsuba" : "text-shu",
              )}
            >
              {voices.length}
            </span>
          </span>
          <button
            onClick={sync}
            className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            <RefreshCw className="size-3" /> Rescan
          </button>
        </div>

        {status === "unsupported" ? (
          <p className="flex items-start gap-2 rounded-lg border border-kincha/40 bg-kincha/10 px-3 py-2.5 text-sm text-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-kincha" />
            <span>{VOICE_HELP.unsupported}</span>
          </p>
        ) : noneAtAll ? (
          <p className="flex items-start gap-2 rounded-lg border border-kincha/40 bg-kincha/10 px-3 py-2.5 text-sm text-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-kincha" />
            <span>
              The browser is reporting no speech voices at all. Some browsers
              populate the list only after a first interaction — press
              <strong> Rescan</strong>. If it stays at zero, no text-to-speech
              voices are installed on this device.
            </span>
          </p>
        ) : voices.length === 0 ? (
          <p className="flex items-start gap-2 rounded-lg border border-kincha/40 bg-kincha/10 px-3 py-2.5 text-sm text-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-kincha" />
            <span>
              This device has {every.length} voices, but none of them speak
              Japanese — so pronunciation is switched off. Manabi will not read
              Japanese with an English voice, because the pronunciation it
              produces is wrong in a way that is expensive to unlearn.
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Quality varies a lot between voices. Tap one to hear the sample and
            make it your default.
          </p>
        )}

        {networkOnly && (
          <p className="flex items-start gap-2 rounded-lg border border-kincha/40 bg-kincha/10 px-3 py-2.5 text-sm text-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-kincha" />
            <span>
              Every Japanese voice here is synthesised over the network. Those
              cut out when offline, and some browsers quietly substitute the
              default English voice when the request fails. A local voice fixes
              that for good.
            </span>
          </p>
        )}

        {voices.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Japanese voices</p>
            <ul className="flex flex-col gap-1.5">
              {voices.map((v) => {
                const active = pref === v.voiceURI;
                return (
                  <li key={v.voiceURI}>
                    <button
                      onClick={() => test(v.voiceURI)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-(--dur-1)",
                        active
                          ? "border-primary bg-primary-tint"
                          : "border-border hover:border-primary hover:bg-accent",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-md",
                          v.localService
                            ? "bg-matsuba/12 text-matsuba"
                            : "bg-kincha/12 text-kincha",
                        )}
                        title={v.localService ? "Installed on this device" : "Synthesised over the network"}
                      >
                        {v.localService ? <HardDrive className="size-4" /> : <Wifi className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {v.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {v.lang} · {v.localService ? "on this device" : "network"}
                        </span>
                      </span>
                      {active && <Check className="size-4 shrink-0 text-primary" />}
                      <Volume2 className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {pref && (
              <button
                onClick={() => { setPreferredVoiceURI(null); setPref(null); }}
                className="self-start text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Use the automatic choice instead
              </button>
            )}
          </div>
        )}

        {/* Install instructions, shown when they are the thing that helps. */}
        {voices.length === 0 && !noneAtAll && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-foreground">
              Installing a Japanese voice
            </p>
            <ul className="flex flex-col gap-1">
              {INSTALL_HELP.map((h) => (
                <li key={h.os} className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{h.os}</span> — {h.steps}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Restart the browser afterwards, then press Rescan.
            </p>
          </div>
        )}

        {/* Full voice list — the diagnostic that says what the browser actually sees. */}
        {every.length > 0 && (
          <div>
            <button
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              <ChevronDown className={cn("size-3 transition-transform duration-(--dur-1)", showAll && "rotate-180")} />
              {showAll ? "Hide" : "Show"} all {every.length} voices on this device
            </button>
            {showAll && (
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card-muted">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">Name</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Lang</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Where</th>
                    </tr>
                  </thead>
                  <tbody>
                    {every.map((v) => (
                      <tr
                        key={v.voiceURI}
                        className={cn(
                          "border-t border-border",
                          /^ja(-|_|$)/i.test(v.lang) && "bg-matsuba/8 font-medium",
                        )}
                      >
                        <td className="px-3 py-1.5 text-foreground">{v.name}</td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">{v.lang}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {v.localService ? "device" : "network"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="voice-rate" className="text-sm font-medium">
              Speaking speed
            </Label>
            <span data-numeric className="text-sm font-semibold text-foreground">
              {rate.toFixed(2)}×
            </span>
          </div>
          <Slider
            id="voice-rate"
            min={0.5}
            max={1.2}
            step={0.05}
            value={[rate]}
            onValueChange={([v]) => { setRateState(v); setRate(v); }}
          />
          <p className="text-xs text-muted-foreground">
            Slower than natural helps while you are still hearing where one mora
            ends and the next begins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => test()} disabled={voices.length === 0}>
            <Volume2 className="size-4" /> Test
          </Button>
          <span lang="ja" className="font-jp text-sm text-muted-foreground">
            {SAMPLE}
          </span>
        </div>

        {failed && (
          <p role="status" className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            That voice failed to speak. If it is a network voice, check your
            connection — or pick one marked &ldquo;on this device&rdquo;.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
