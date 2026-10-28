import type { Metadata } from "next";
import { DeliveryView } from "@/components/bloom/studio/delivery-view";

export const metadata: Metadata = {
  title: "Prototype delivery — Bloom AI",
  description: "A working prototype built with the Bloom AI Solution Foundry.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DeliveryView />;
}
