import type { Metadata } from "next";
import { AuditPage } from "@/components/bloom/studio/infra/audit";

export const metadata: Metadata = {
  title: "Audit · Infrastructure Architect — Bloom AI",
  description: "Shift run history, token burn and the change trail.",
};

export default function Page() {
  return <AuditPage />;
}