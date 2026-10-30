import type { Metadata } from "next";
import { Assistant } from "@/components/os/assistant";

export const metadata: Metadata = { title: "Local Assistant" };

export default function Page() {
  return <Assistant />;
}
