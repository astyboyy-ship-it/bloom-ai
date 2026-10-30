import type { Metadata } from "next";
import { Sandbox } from "@/components/os/builder";

export const metadata: Metadata = { title: "Sandbox" };

export default function Page() {
  return <Sandbox />;
}
