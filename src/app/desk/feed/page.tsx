import type { Metadata } from "next";
import { FeedPage } from "@/components/pulse/feed-page";

export const metadata: Metadata = { title: "Architecture Feed" };

export default function Page() {
  return <FeedPage />;
}
