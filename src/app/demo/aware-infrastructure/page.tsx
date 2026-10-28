import type { Metadata } from "next";
import { AwareInfrastructureDemo } from "@/components/bloom/demo/aware-infrastructure-demo";

export const metadata: Metadata = {
  title: "Aware Infrastructure Live Demo — Bloom AI",
  description: "Watch the Aware Infrastructure Architect absorb a 500k req/s spike: auto-scaling, rerouting and self-healing across 54 edge nodes.",
};

export default function AwareInfrastructureDemoPage() {
  return (
    <div className="bloom relative isolate min-h-dvh overflow-x-clip">
      <main>
        <AwareInfrastructureDemo />
      </main>
    </div>
  );
}
