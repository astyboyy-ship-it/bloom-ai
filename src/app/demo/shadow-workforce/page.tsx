import type { Metadata } from "next";
import { ShadowWorkforceDemo } from "@/components/bloom/demo/shadow-workforce-demo";

export const metadata: Metadata = {
  title: "Shadow Workforce Live Demo — Bloom AI",
  description: "Five AI agents work through the night in parallel, then hand you a morning brief of everything they shipped.",
};

export default function ShadowWorkforceDemoPage() {
  return (
    <div className="bloom relative isolate min-h-dvh overflow-x-clip">
      <main>
        <ShadowWorkforceDemo />
      </main>
    </div>
  );
}
