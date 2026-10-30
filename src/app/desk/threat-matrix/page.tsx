import type { Metadata } from "next";
import { ThreatMatrix } from "@/components/os/threat-matrix";

export const metadata: Metadata = { title: "Threat Matrix" };

export default function Page() {
  return <ThreatMatrix />;
}
