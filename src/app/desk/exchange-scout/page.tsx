import type { Metadata } from "next";
import { ScoutDesk } from "@/components/scout/scout-desk";

export const metadata: Metadata = { title: "Exchange Scout" };

export default function Page() {
  return <ScoutDesk />;
}
