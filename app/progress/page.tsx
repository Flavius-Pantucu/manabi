import type { Metadata } from "next";
import { ProgressContent } from "@/components/progress-content";

export const metadata: Metadata = {
  title: "Progress · Manabi",
  description:
    "Retention, upcoming reviews, and what you're about to forget — plus study settings and backup.",
};

export default function ProgressPage() {
  return <ProgressContent />;
}
