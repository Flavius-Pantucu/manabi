import type { Metadata } from "next";
import { VocabularyContent } from "@/components/vocabulary-content";

export const metadata: Metadata = {
  title: "Vocabulary 語彙 - Manabi",
  description:
    "Browse and study Japanese vocabulary organized by topic and JLPT level. Practice with flashcards and track your progress.",
};

export default function VocabularyPage() {
  return <VocabularyContent />;
}
