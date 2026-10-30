import type { Metadata } from "next";
import { PipelineBuilder } from "@/components/os/builder";

export const metadata: Metadata = { title: "Pipeline Builder" };

export default function Page() {
  return <PipelineBuilder />;
}
