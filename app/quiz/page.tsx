import type { Metadata } from "next";
import { QuizContent } from "@/components/quiz-content";

export const metadata: Metadata = {
  title: "Quiz クイズ - Manabi",
  description:
    "Test your Japanese knowledge with interactive quizzes covering vocabulary, grammar, and kanji.",
};

export default function QuizPage() {
  return <QuizContent />;
}
