import type { Metadata } from "next";
import { ExploreArchitectures } from "@/components/os/explore";

export const metadata: Metadata = { title: "Explore architectures" };

export default function Page() {
  return <ExploreArchitectures />;
}
