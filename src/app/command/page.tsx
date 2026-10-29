import type { Metadata } from "next";
import { EngineGrid } from "@/components/bloom/command/engine-grid";

export const metadata: Metadata = {
  title: "Command Center — Bloom AI",
  description: "All eight Bloom AI engines in one command center. Enter any engine's desk to command it live.",
};

export default function Page() {
  return <EngineGrid />;
}
