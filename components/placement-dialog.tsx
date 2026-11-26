"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight, Sparkles, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLanguage, type Language } from "@/lib/language-context";
import { useAppDispatch } from "@/lib/store/hooks";
import { setSrsSettings } from "@/lib/store/features/srs-slice";
import type { Level } from "@/lib/content/types";

interface PlacementQuestion {
  level: Level;
  prompt: string;
  options: string[];
  answer: number;
}

const QUESTIONS: Record<Language, PlacementQuestion[]> = {
  es: [
    {
      level: "N5",
      prompt: "What does «Tengo que trabajar hoy» mean?",
      options: ["I like working today", "I have to work today", "I worked yesterday", "I am going home"],
      answer: 1,
    },
    {
      level: "N4",
      prompt: "Choose the preterite (completed past) form: «Ayer ___ un billete de tren.»",
      options: ["compro", "compraba", "compré", "compraré"],
      answer: 2,
    },
    {
      level: "N3",
      prompt: "Complete with the present subjunctive: «Espero que ___ un buen viaje.»",
      options: ["tienes", "tengas", "tendrás", "tuviste"],
      answer: 1,
    },
    {
      level: "N2",
      prompt: "Which fits a counterfactual condition? «Si ___ más tiempo, aprendería otro idioma.»",
      options: ["tengo", "tendría", "tuviera", "tenía"],
      answer: 2,
    },
  ],
  fr: [
    {
      level: "N5",
      prompt: "What does «Je voudrais du pain et de l'eau» mean?",
      options: ["I have bread and water", "I would like some bread and water", "I don't drink water", "The bread is on the table"],
      answer: 1,
    },
    {
      level: "N4",
      prompt: "Choose the correct passé composé: «Hier, elle ___ tôt.»",
      options: ["a parti", "est partie", "partait", "partira"],
      answer: 1,
    },
    {
      level: "N3",
      prompt: "Complete with the subjunctive: «Il faut que tu ___ ce projet.»",
      options: ["finis", "finiras", "finisses", "finissais"],
      answer: 2,
    },
    {
      level: "N2",
      prompt: "Which completes the 2nd conditional? «Si j'___ plus de temps, j'apprendrais le japonais.»",
      options: ["ai", "aurais", "avais", "aurai"],
      answer: 2,
    },
  ],
  ja: [
    {
      level: "N5",
      prompt: "What does「私は学生です」mean?",
      options: ["I am a teacher", "I am a student", "This is a book", "I go to school"],
      answer: 1,
    },
    {
      level: "N4",
      prompt: "Which is the te-form of「書く」(to write)?",
      options: ["書いた", "書いて", "書かない", "書ける"],
      answer: 1,
    },
    {
      level: "N3",
      prompt: "What does「〜ようにする」express?",
      options: ["Must not do", "Make an effort to / try to", "Just finished doing", "Seems like"],
      answer: 1,
    },
    {
      level: "N2",
      prompt: "Which grammar pattern means 'despite / even though'?",
      options: ["〜にもかかわらず", "〜わけではない", "〜はずがない", "〜てばかりいる"],
      answer: 0,
    },
  ],
};

function levelsForScore(score: number): {
  levels: Level[];
  target: Level;
  summary: string;
} {
  if (score <= 1) {
    return {
      levels: ["N5"],
      target: "N5",
      summary: "We'll start you at the foundation level so nothing important gets skipped.",
    };
  }
  if (score === 2) {
    return {
      levels: ["N4", "N3"],
      target: "N4",
      summary: "You've got the basics down! We'll skip the intro tier and start you at Elementary.",
    };
  }
  if (score === 3) {
    return {
      levels: ["N3", "N2"],
      target: "N3",
      summary: "Strong intermediate grasp! We'll skip the beginner tiers and unlock Intermediate.",
    };
  }
  return {
    levels: ["N2", "N1"],
    target: "N2",
    summary: "Impressive! We'll skip straight to Upper-Intermediate & Advanced material.",
  };
}

export function PlacementDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete: (placedLevel: Level) => void;
}) {
  const { language, formatLevel } = useLanguage();
  const dispatch = useAppDispatch();
  const qs = QUESTIONS[language];

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const finished = step >= qs.length;
  const score = answers.reduce(
    (acc, a, i) => (a === qs[i]?.answer ? acc + 1 : acc),
    0,
  );
  const result = levelsForScore(score);

  const reset = () => {
    setStep(0);
    setAnswers([]);
    setSelected(null);
  };

  const handleNext = () => {
    if (selected === null) return;
    setAnswers((prev) => [...prev, selected]);
    setSelected(null);
    setStep((s) => s + 1);
  };

  const handleApply = () => {
    dispatch(setSrsSettings({ levels: result.levels }));
    try {
      localStorage.setItem(`manabi.placement.${language}`, result.target);
    } catch {
      /* ignore */
    }
    onComplete(result.target);
    onOpenChange(false);
    reset();
  };

  const langName =
    language === "es" ? "Spanish" : language === "fr" ? "French" : "Japanese";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {langName} Placement Check
          </DialogTitle>
          <DialogDescription>
            Answer 4 quick questions to skip beginner material you already know.
          </DialogDescription>
        </DialogHeader>

        {!finished ? (
          <div className="mt-2 flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Question {step + 1} of {qs.length}
              </span>
              <span className="font-medium text-primary">
                Tier {formatLevel(qs[step].level)}
              </span>
            </div>
            <Progress value={((step + 1) / qs.length) * 100} className="h-1.5" />

            <p className="text-sm font-medium leading-relaxed text-foreground">
              {qs[step].prompt}
            </p>

            <div className="flex flex-col gap-2">
              {qs[step].options.map((opt, idx) => {
                const isSel = selected === idx;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelected(idx)}
                    className={cn(
                      "flex min-h-11 items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                      isSel
                        ? "border-primary bg-primary-tint font-medium text-foreground"
                        : "border-border bg-card hover:bg-accent/60 text-foreground",
                    )}
                  >
                    <span>{opt}</span>
                    {isSel && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={selected === null}
              >
                {step === qs.length - 1 ? "See Result" : "Next"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-4">
            <div className="rounded-xl border border-primary/30 bg-primary-tint p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Recommended Starting Tier
              </p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {formatLevel(result.target)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Score: {score} / {qs.length}
              </p>
              <p className="mt-2 text-sm text-foreground">{result.summary}</p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" onClick={reset}>
                <RotateCcw className="size-4" />
                Retake
              </Button>
              <Button type="button" onClick={handleApply}>
                Apply & Skip Ahead
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
