import type { Metadata } from "next";
import { JobsPage } from "@/components/bloom/studio/infra/jobs";

export const metadata: Metadata = {
  title: "Jobs · Infrastructure Architect — Bloom AI",
  description: "Overnight job scheduler with cron schedules and background agents.",
};

export default function Page() {
  return <JobsPage />;
}