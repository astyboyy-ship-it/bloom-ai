import type { Metadata } from "next";
import { AwareMarketingDemo } from "@/components/bloom/demo/aware-marketing-demo";

export const metadata: Metadata = {
  title: "Live Demo · The Aware Marketing Engine — Bloom AI",
  description: "Your autonomous creator agent: a strategy roadmap from one message, and a sponsor inbox that triages, counters and closes deals in real time.",
};

export default function AwareMarketingDemoPage() {
  return (
    // `isolate` gives the page its own stacking context so the fixed painting layers paint above its background.
    <div className="bloom relative isolate min-h-dvh overflow-x-clip">
      <div className="bg-noise pointer-events-none fixed inset-0 z-[60]" />
      <main>
        <AwareMarketingDemo />
      </main>
    </div>
  );
}
