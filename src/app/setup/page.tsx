import type { Metadata } from "next";
import { SetupWizard } from "@/components/desk/setup-wizard";

export const metadata: Metadata = {
  title: "Guided Setup — Bloom AI",
  description: "Set up your Bloom AI workspace: license, model providers, branding and a full diagnostics check.",
};

export default function Page() {
  return <SetupWizard />;
}
