"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Level } from "@/lib/content/types";

export type Language = "es" | "fr" | "it" | "ja";

const STORAGE_KEY = "manabi.language";

const CEFR_LABELS: Record<Level, string> = {
  N5: "A1",
  N4: "A2",
  N3: "B1",
  N2: "B2",
  N1: "C1",
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  isJapanese: boolean;
  isSpanish: boolean;
  isFrench: boolean;
  isItalian: boolean;
  formatLevel: (level: Level) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "es" || saved === "fr" || saved === "it" || saved === "ja") {
        setLanguageState(saved);
        document.documentElement.dataset.lang = saved;
        return;
      }
    } catch {
      /* ignore storage errors */
    }
    document.documentElement.dataset.lang = "es";
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    document.documentElement.dataset.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const formatLevel = useCallback(
    (level: Level) => (language === "ja" ? level : CEFR_LABELS[level]),
    [language],
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        isJapanese: language === "ja",
        isSpanish: language === "es",
        isFrench: language === "fr",
        isItalian: language === "it",
        formatLevel,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}
