import type { Metadata } from "next";
import { PipelinePage } from "@/components/bloom/studio/marketing/pipeline";

export const metadata: Metadata = {
  title: "Pipeline · Aware Marketing — Bloom AI",
  description: "Multi-stage negotiation tracker with counter-offer editing and clause logs.",
};

export default function Page() {
  return <PipelinePage />;
}