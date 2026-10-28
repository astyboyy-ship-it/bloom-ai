import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { engines, getEngine, type EngineSlug } from "@/components/bloom/engines/data";
import { EngineView } from "@/components/bloom/engines/engine-view";
import { Footer } from "@/components/bloom/footer";
import { LanguageProvider } from "@/components/bloom/i18n";
import { Navbar } from "@/components/bloom/navbar";
import { Waitlist } from "@/components/bloom/waitlist";

export function generateStaticParams() {
  return engines.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const engine = getEngine((await params).slug);
  if (!engine) return {};
  return { title: `${engine.name} — Bloom AI`, description: engine.teaser };
}

export default async function EnginePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getEngine(slug)) notFound();

  return (
    <LanguageProvider>
      <div className="bloom relative isolate min-h-dvh overflow-x-clip">
        <Navbar />
        <main>
          <EngineView slug={slug as EngineSlug} />
          <Waitlist defaultEngine={slug as EngineSlug} />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
