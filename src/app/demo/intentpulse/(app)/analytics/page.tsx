import type { Metadata } from "next";
import { AnalyticsPage } from "@/components/bloom/command-center/pages";

export const metadata: Metadata = {
  title: "Analytics · IntentPulse — Bloom AI",
  description: "Channel funnels, engagement attribution and closed deals.",
};

export default function Page() {
  return <AnalyticsPage />;
}