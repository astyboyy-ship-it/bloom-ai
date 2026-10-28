import type { Metadata } from "next";
import { AgreementsPage } from "@/components/bloom/studio/marketing/agreements";

export const metadata: Metadata = {
  title: "Agreements · Aware Marketing — Bloom AI",
  description: "Signature vault with fingerprinted agreements and downloads.",
};

export default function Page() {
  return <AgreementsPage />;
}