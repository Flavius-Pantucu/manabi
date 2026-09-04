import type { Metadata } from "next";
import { VerbsContent } from "@/components/verbs-content";

export const metadata: Metadata = {
  title: "Verb Conjugation 動詞 - Manabi",
  description:
    "Search and explore Japanese verb conjugations across all forms including te-form, potential, passive, and more.",
};

export default function VerbsPage() {
  return <VerbsContent />;
}
