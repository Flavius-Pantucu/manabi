import type { Metadata } from "next";
import { ReadingContent } from "@/components/reading-content";

export const metadata: Metadata = {
  title: "Reading Practice 読解 - Manabi",
  description:
    "Practice Japanese reading comprehension with graded passages, word tooltips, and comprehension quizzes.",
};

export default function ReadingPage() {
  return <ReadingContent />;
}
