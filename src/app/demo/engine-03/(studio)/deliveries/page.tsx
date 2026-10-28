import type { Metadata } from "next";
import { DeliveriesPage } from "@/components/bloom/studio/foundry/deliveries";

export const metadata: Metadata = {
  title: "Deliveries · Shadow Workforce — Bloom AI",
  description: "Self-contained delivery links and handover notes.",
};

export default function Page() {
  return <DeliveriesPage />;
}