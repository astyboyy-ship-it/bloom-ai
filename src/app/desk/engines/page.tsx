import type { Metadata } from "next";
import { EngineNetwork } from "@/components/os/engine-network";

export const metadata: Metadata = { title: "Engine Network" };

export default function Page() {
  return <EngineNetwork />;
}
