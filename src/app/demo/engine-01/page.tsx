import type { Metadata } from "next";
import { ProposalsPage } from "@/components/bloom/studio/marketing/proposals";

export const metadata: Metadata = {
  title: "Aware Marketing · Deal Synthesizer — Bloom AI",
  description: "A morning review room for brand deals: proposals swept and negotiated overnight against your rate card, scored against your criteria, signed in one click.",
};

export default function Page() {
  return <ProposalsPage />;
}