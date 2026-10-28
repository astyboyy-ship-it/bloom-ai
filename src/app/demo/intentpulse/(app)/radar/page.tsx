import type { Metadata } from "next";
import { RadarPage } from "@/components/bloom/command-center/pages";

export const metadata: Metadata = {
  title: "Radar · IntentPulse — Bloom AI",
  description: "Real-time lead radar across Instagram, Reddit, X and TikTok.",
};

export default function Page() {
  return <RadarPage />;
}