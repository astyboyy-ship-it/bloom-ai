import type { Metadata } from "next";
import { ExploreEngines } from "@/components/os/explore";

export const metadata: Metadata = { title: "Explore engines" };

export default function Page() {
  return <ExploreEngines />;
}
