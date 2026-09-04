import type { Metadata } from "next";
import { ReviewContent } from "@/components/review-content";

export const metadata: Metadata = {
  title: "Review · Manabi",
  description: "Everything due today, scheduled by spaced repetition.",
};

export default function ReviewPage() {
  return <ReviewContent />;
}
