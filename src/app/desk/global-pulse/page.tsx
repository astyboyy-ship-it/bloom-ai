import type { Metadata } from "next";
import { GlobalPulse } from "@/components/os/global-pulse";

export const metadata: Metadata = { title: "Global Pulse" };

export default function Page() {
  return <GlobalPulse />;
}
