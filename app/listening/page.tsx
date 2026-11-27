import type { Metadata } from "next";
import { ListeningContent } from "@/components/listening-content";

export const metadata: Metadata = {
  title: "Listening Practice - Manabi",
  description:
    "Train listening comprehension and dictation at normal or slow playback speed.",
};

export default function ListeningPage() {
  return <ListeningContent />;
}
