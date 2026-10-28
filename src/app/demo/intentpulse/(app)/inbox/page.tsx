import type { Metadata } from "next";
import { InboxPage } from "@/components/bloom/command-center/pages";

export const metadata: Metadata = {
  title: "Inbox · IntentPulse — Bloom AI",
  description: "DM interceptor with live conversations and editable drafts.",
};

export default function Page() {
  return <InboxPage />;
}