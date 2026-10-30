import type { Metadata } from "next";
import { Suspense } from "react";
import { ShadowBoard } from "@/components/os/shadow-board";

export const metadata: Metadata = { title: "Shadow Board" };

export default function Page() {
  return (
    <Suspense>
      <ShadowBoard />
    </Suspense>
  );
}
