import type { Metadata } from "next";
import { InfrastructureArchitectApp } from "@/components/bloom/products/infrastructure-architect/app";

export const metadata: Metadata = {
  title: "Infrastructure Architect — Bloom AI",
  description: "Clock off and let the night shift run, on an exact-AI bill cut from $48.50 to $14.73 a day.",
};

/** A standalone product: its intro plays over the app on this URL, then lifts. */
export default function Page() {
  return <InfrastructureArchitectApp />;
}
