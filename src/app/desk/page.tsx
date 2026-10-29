import type { Metadata } from "next";
import { OperatingDesk } from "@/components/desk/operating-desk";

export const metadata: Metadata = {
  title: "Bloom AI Desktop — Operating Desk",
  description: "The Bloom AI desktop workspace: command all eight engines, tune them, and manage your keys and shifts.",
};

export default function Page() {
  return <OperatingDesk />;
}
