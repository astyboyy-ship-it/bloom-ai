import type { Metadata } from "next";
import { OsSettings } from "@/components/os/os-settings";

export const metadata: Metadata = { title: "App Settings" };

export default function Page() {
  return <OsSettings />;
}
