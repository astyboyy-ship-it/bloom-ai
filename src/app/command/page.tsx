import type { Metadata } from "next";
import { EnginePicker } from "@/components/bloom/command/engine-picker";

export const metadata: Metadata = {
  title: "Command — Bloom AI",
  description: "Four Bloom AI engines, each set up in three steps and run from one command view.",
};

export default function Page() {
  return <EnginePicker />;
}
