import type { Metadata } from "next";
import { ShadowWorkforceApp } from "@/components/bloom/products/shadow-workforce/app";

export const metadata: Metadata = {
  title: "Shadow Workforce — Bloom AI",
  description: "Paste a company's site; five agents build the fix in their brand colours and hand you an encrypted link to send.",
};

/** A standalone product: its intro plays over the app on this URL, then lifts. */
export default function Page() {
  return <ShadowWorkforceApp />;
}
