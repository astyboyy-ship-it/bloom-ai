import type { Metadata } from "next";
import { TargetsPage } from "@/components/bloom/studio/foundry/targets";

export const metadata: Metadata = {
  title: "Targets · Shadow Workforce — Bloom AI",
  description: "Target intelligence vault: URLs, social handles and bottleneck specifications.",
};

export default function Page() {
  return <TargetsPage />;
}