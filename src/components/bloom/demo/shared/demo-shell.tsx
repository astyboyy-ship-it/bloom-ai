"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloraField } from "../../art/flora";
import { PaintingCanvas, PaintingCaption } from "../../art/painting-canvas";
import { engines, getEngine, type Engine, type EngineSlug } from "../../engines/data";

/**
 * The frame every engine demo lives in: the engine's own living painting and flora, fixed behind
 * the page so the scroll through console → process → shifts → logs never leaves the painting.
 */
export function DemoShell({
  slug,
  title,
  kicker,
  chips,
  actions,
  pulse = false,
  children,
}: {
  slug: EngineSlug;
  title: React.ReactNode;
  kicker: string;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
  /** Makes the flora glow, e.g. while the engine is perceiving. */
  pulse?: boolean;
  children: React.ReactNode;
}) {
  const engine = getEngine(slug) as Engine;
  const demos = engines.filter((e) => e.demoHref);

  return (
    <>
      <div className="fixed inset-0 -z-10">
        <PaintingCanvas painting={engine.painting} priority />
        <div className="absolute inset-0 bg-ink/50" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_6_18/0.6)_0%,transparent_30%,rgb(11_6_18/0.8)_100%)]" />
      </div>
      <div className={cn("pointer-events-none fixed inset-0 -z-10", pulse && "animate-dahlia-pulse")}>
        <FloraField blooms={engine.blooms} />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px] px-4 pb-40 pt-6 sm:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/engines/${engine.slug}`}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" /> Engine Nº {engine.index}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-ink/50 p-1 backdrop-blur-md md:flex">
              {demos.map((d) => (
                <Link
                  key={d.slug}
                  href={d.demoHref!}
                  aria-current={d.slug === slug ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
                    d.slug === slug ? "bg-[#f3e2b8] text-[#1a0f05]" : "text-white/55 hover:text-white",
                  )}
                >
                  Nº {d.index}
                </Link>
              ))}
            </div>
            {actions}
          </div>
        </nav>

        <header className="mt-8 max-w-5xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#f0d59a]/80">
            Engine Nº {engine.index} <span className="mx-2 text-white/30">—</span> {kicker}
          </p>
          <h1 className="text-gold-metal mt-4 font-display text-5xl font-light leading-[0.95] sm:text-7xl">{title}</h1>
          <p className="mt-4 font-display text-xl italic text-white/80 sm:text-2xl">{engine.subtitle}</p>
          {chips && <div className="mt-6 flex flex-wrap gap-2">{chips}</div>}
        </header>

        {children}

        <PaintingCaption painting={engine.painting} className="mt-20 text-right" />
      </div>
    </>
  );
}
