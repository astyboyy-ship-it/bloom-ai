import type { Metadata } from "next";
import { AwareMarketingApp } from "@/components/bloom/products/aware-marketing/app";

export const metadata: Metadata = {
  title: "Aware Marketing — Bloom AI",
  description: "Brand deals from six channels, negotiated overnight against your terms, unfair clauses fixed, signed in one click.",
};

/** A standalone product: its intro plays over the app on this URL, then lifts. */
export default function Page() {
  return <AwareMarketingApp />;
}
