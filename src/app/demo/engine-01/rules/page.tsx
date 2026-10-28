import type { Metadata } from "next";
import { RulesPage } from "@/components/bloom/studio/marketing/rules";

export const metadata: Metadata = {
  title: "Rules · Aware Marketing — Bloom AI",
  description: "Brand criteria: fee floors, usage rights, exclusivity and banned categories.",
};

export default function Page() {
  return <RulesPage />;
}