import type { Metadata } from "next";
import { OsShell } from "@/components/os/os-shell";

export const metadata: Metadata = {
  title: { default: "BLOOM AI // OPERATING DESK", template: "%s · BLOOM AI // OPERATING DESK" },
  description: "The Bloom AI Operating Desk: command, govern and audit eight autonomous engines and ten architecture products.",
};

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return <OsShell>{children}</OsShell>;
}
