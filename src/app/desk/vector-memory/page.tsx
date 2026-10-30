import type { Metadata } from "next";
import { VectorMemory } from "@/components/os/vector-memory";

export const metadata: Metadata = { title: "Vector Memory" };

export default function Page() {
  return <VectorMemory />;
}
