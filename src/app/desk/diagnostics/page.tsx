import type { Metadata } from "next";
import { Diagnostics } from "@/components/os/audit-bay";

export const metadata: Metadata = { title: "Diagnostics" };

export default function Page() {
  return <Diagnostics />;
}
