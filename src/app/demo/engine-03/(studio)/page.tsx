import type { Metadata } from "next";
import { TargetsPage } from "@/components/bloom/studio/foundry/targets";

export const metadata: Metadata = {
  title: "Aware Shadow Workforce · Solution Foundry — Bloom AI",
  description: "Crawl a target's funnel, find the bottlenecks, pre-build the working fix, and hand it over with a secure link instead of a cold pitch.",
};

export default function Page() {
  return <TargetsPage />;
}