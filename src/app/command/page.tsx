import type { Metadata } from "next";
import { OperatingDesk } from "@/components/desk/operating-desk";

export const metadata: Metadata = {
  title: "Sovereign Operating Desk — Bloom AI",
  description: "Command all eight Bloom AI engines from one desk and watch the multi-agent runtime execute live.",
};

export default function Page() {
  return <OperatingDesk />;
}
