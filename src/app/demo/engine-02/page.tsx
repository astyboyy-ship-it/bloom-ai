import type { Metadata } from "next";
import { ShiftPage } from "@/components/bloom/studio/infra/shift";

export const metadata: Metadata = {
  title: "Aware Infrastructure Architect · Shift Operator — Bloom AI",
  description: "Clock in and off, map exact AI workflows and strip waste, and schedule the overnight cleanups, syncs and optimizations.",
};

export default function Page() {
  return <ShiftPage />;
}