import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ENGINE_ORDER, ENGINES, isEngineKey } from "@/components/bloom/command/engines";
import { EngineWorkspace } from "@/components/os/engine-workspace";

export function generateStaticParams() {
  return ENGINE_ORDER.map((engine) => ({ engine }));
}

export async function generateMetadata({ params }: { params: Promise<{ engine: string }> }): Promise<Metadata> {
  const { engine } = await params;
  return isEngineKey(engine) ? { title: `${ENGINES[engine].name} · Engine Nº ${ENGINES[engine].index}` } : {};
}

export default async function Page({ params }: { params: Promise<{ engine: string }> }) {
  const { engine } = await params;
  if (!isEngineKey(engine)) notFound();
  return <EngineWorkspace key={engine} engine={engine} />;
}
