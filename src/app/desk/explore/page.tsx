import type { Metadata } from "next";
import { ExploreHome } from "@/components/os/explore";

export const metadata: Metadata = { title: "Explore" };

export default function Page() {
  return <ExploreHome />;
}
