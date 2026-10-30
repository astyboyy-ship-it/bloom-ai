import type { Metadata } from "next";
import { AuditBay } from "@/components/os/audit-bay";

export const metadata: Metadata = { title: "Audit & Compliance" };

export default function Page() {
  return <AuditBay />;
}
