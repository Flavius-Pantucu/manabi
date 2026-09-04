import type { Metadata } from "next";
import { KanjiContent } from "@/components/kanji-content";

export const metadata: Metadata = {
  title: "Kanji Study 漢字 - Manabi",
  description:
    "Browse, study, and quiz yourself on Japanese kanji characters organized by JLPT level with readings and example words.",
};

export default function KanjiPage() {
  return <KanjiContent />;
}
