import type { Metadata } from "next";
import { OverviewPage } from "@/components/bloom/command-center/pages";

export const metadata: Metadata = {
  title: "IntentPulse Command Center — Bloom AI",
  description: "Omnichannel radar that intercepts, scores and routes buyer intent across Instagram, X, TikTok, Reddit and webhooks.",
};

export default function Page() {
  return <OverviewPage />;
}