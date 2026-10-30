import type { Metadata } from "next";
import { DemoDeck } from "@/components/os/demo-deck";

export const metadata: Metadata = { title: "Demo Mode" };

export default function Page() {
  return <DemoDeck />;
}
