import type { Metadata } from "next";
import { ShiftPage } from "@/components/bloom/studio/infra/shift";

export const metadata: Metadata = {
  title: "Shift · Infrastructure Architect — Bloom AI",
  description: "Clock-in / clock-off operator console and daily focus map.",
};

export default function Page() {
  return <ShiftPage />;
}