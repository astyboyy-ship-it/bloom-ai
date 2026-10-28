import type { Metadata } from "next";
import { ProposalsPage } from "@/components/bloom/studio/marketing/proposals";

export const metadata: Metadata = {
  title: "Proposals · Aware Marketing — Bloom AI",
  description: "Overnight brand proposals with negotiated fees, match scores and campaign hooks.",
};

export default function Page() {
  return <ProposalsPage />;
}