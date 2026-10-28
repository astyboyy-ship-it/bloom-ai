import type { Metadata } from "next";
import { SandboxPage } from "@/components/bloom/studio/foundry/sandbox";

export const metadata: Metadata = {
  title: "Sandbox · Shadow Workforce — Bloom AI",
  description: "Edit the generated prototype with a live preview.",
};

export default function Page() {
  return <SandboxPage />;
}