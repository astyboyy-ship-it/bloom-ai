import type { Metadata } from "next";
import { OptimizerPage } from "@/components/bloom/studio/infra/optimizer";

export const metadata: Metadata = {
  title: "Optimizer · Infrastructure Architect — Bloom AI",
  description: "Exact-AI prompt router and token cost optimizer: right-sizing, prompt trimming, caching, batching.",
};

export default function Page() {
  return <OptimizerPage />;
}