import type { Metadata } from "next";
import { GrammarContent } from "@/components/grammar-content";

export const metadata: Metadata = {
  title: "Grammar Points 文法 - Manabi",
  description:
    "Explore Japanese grammar patterns organized by JLPT level with formations, examples, and comparisons.",
};

export default function GrammarPage() {
  return <GrammarContent />;
}
