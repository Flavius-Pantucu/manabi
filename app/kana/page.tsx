import type { Metadata } from "next";
import { KanaContent } from "@/components/kana-content";

export const metadata: Metadata = {
  title: "Kana · Manabi",
  description:
    "Hiragana and katakana — the 104 syllables Japanese is written in, with mnemonics and drills.",
};

export default function KanaPage() {
  return <KanaContent />;
}
