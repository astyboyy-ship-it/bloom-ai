import type { Metadata } from "next";
import { IntentPulseApp } from "@/components/bloom/products/intentpulse/app";

export const metadata: Metadata = {
  title: "IntentPulse — Bloom AI",
  description: "Every buying signal from Reddit, X, Instagram, TikTok, LinkedIn and email in one live stream, with replies already written.",
};

/** A standalone product: its intro plays over the app on this URL, then lifts. */
export default function Page() {
  return <IntentPulseApp />;
}