import type { Metadata } from "next";
import { FoundryPage } from "@/components/bloom/studio/foundry/foundry";

export const metadata: Metadata = {
  title: "Foundry · Shadow Workforce — Bloom AI",
  description: "Five agents crawl, detect bottlenecks and build the working fix.",
};

export default function Page() {
  return <FoundryPage />;
}