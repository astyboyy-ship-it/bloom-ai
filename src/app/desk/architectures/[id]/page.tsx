import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARCHITECTURES, architectureBySlug } from "@/lib/architectures";
import { ArchitectureWorkspace } from "@/components/os/architecture-workspace";

export function generateStaticParams() {
  return ARCHITECTURES.map((a) => ({ id: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const a = architectureBySlug((await params).id);
  return a ? { title: a.name, description: a.tagline } : {};
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const a = architectureBySlug((await params).id);
  if (!a) notFound();
  return <ArchitectureWorkspace a={a} />;
}
