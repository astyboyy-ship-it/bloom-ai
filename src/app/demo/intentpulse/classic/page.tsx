import type { Metadata } from "next";
import { IntentPulseDemo } from "@/components/bloom/demo/intentpulse-demo";

export const metadata: Metadata = {
  title: "IntentPulse Live Demo — Bloom AI",
  description: "Score a real inbound lead with the Aware IntentPulse Lead Engine: perceive, reason, decide, and route in seconds.",
};

export default function IntentPulseClassicDemoPage() {
  return (
    <div className="bloom relative isolate min-h-dvh overflow-x-clip">
      <main>
        <IntentPulseDemo />
      </main>
    </div>
  );
}
