import type { Metadata } from "next";
import { RulesPage } from "@/components/bloom/command-center/pages";

export const metadata: Metadata = {
  title: "Rules · IntentPulse — Bloom AI",
  description: "Keyword triggers, auto-responder and automation schedule.",
};

export default function Page() {
  return <RulesPage />;
}