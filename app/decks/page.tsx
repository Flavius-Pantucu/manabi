import type { Metadata } from "next";
import { DecksContent } from "@/components/decks-content";

export const metadata: Metadata = {
  title: "Custom Decks - Manabi",
  description: "Create, organize, and study your own custom flashcard decks.",
};

export default function DecksPage() {
  return <DecksContent />;
}
