import type { Metadata } from "next";
import { PhrasesContent } from "@/components/phrases-content";

export const metadata: Metadata = {
  title: "Phrasebook - Manabi",
  description:
    "Practical travel and everyday expressions grouped by situation with audio playback.",
};

export default function PhrasesPage() {
  return <PhrasesContent />;
}
