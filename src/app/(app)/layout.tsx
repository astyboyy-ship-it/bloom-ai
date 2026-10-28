import type { Metadata } from "next";
import Link from "next/link";
import { Boxes } from "lucide-react";

export const metadata: Metadata = {
  title: "Workflow Architect",
  description: "Describe your workflow; get a tailored, routed, multi-agent AI environment.",
};

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/workspaces" className="flex items-center gap-2 font-semibold">
            <Boxes className="size-5" /> Workflow Architect
          </Link>
          <Link href="/onboarding" className="text-sm text-muted-foreground hover:text-foreground">
            New workspace
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </>
  );
}
