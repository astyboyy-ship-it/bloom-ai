import type { Metadata } from "next";
import { ArchitectureGallery } from "@/components/os/architecture-gallery";

export const metadata: Metadata = { title: "Architectures" };

export default function Page() {
  return <ArchitectureGallery />;
}
