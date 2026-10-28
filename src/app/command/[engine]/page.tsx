import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EngineCommand } from "@/components/bloom/command/engine-command";
import { ENGINE_ORDER, ENGINES, isEngineKey } from "@/components/bloom/command/engines";

export function generateStaticParams() {
  return ENGINE_ORDER.map((engine) => ({ engine }));
}

export async function generateMetadata({ params }: { params: Promise<{ engine: string }> }): Promise<Metadata> {
  const { engine } = await params;
  if (!isEngineKey(engine)) return {};
  const e = ENGINES[engine];
  return { title: `Engine Nº ${e.index} — ${e.name} · Bloom AI`, description: `${e.name}: ${e.role}.` };
}

export default async function Page({ params }: { params: Promise<{ engine: string }> }) {
  const { engine } = await params;
  if (!isEngineKey(engine)) notFound();
  // Keyed so moving between engines (hand-off badges, engine switcher) starts each one fresh from its own saved state.
  return <EngineCommand key={engine} engineKey={engine} />;
}
