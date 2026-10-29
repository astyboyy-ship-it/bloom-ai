"use client";

import Image from "next/image";
import Link from "next/link";
import { paintings } from "../art/paintings";
import { BloomWordmark } from "../logo";
import { EngineStatus } from "./engine-status";
import { ENGINE_ORDER, ENGINES } from "./engines";
import { localizeEngine, useCommandCopy } from "./locale";
import { PALETTES, paletteVars } from "./theme";
import { EngineBadge } from "./tutorial";

/** Every engine, 01 through 08, each tile a window onto its painting, in the same frosted glass as the engines. */
export function EnginePicker() {
  const { lang, dir, c } = useCommandCopy();
  return (
    <div lang={lang} dir={dir} className="relative isolate min-h-dvh bg-ink px-4 py-10 font-sans text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <BloomWordmark className="text-[26px]" />
        <h1 className="mt-6 font-display text-[40px] font-medium leading-tight sm:text-[52px]">{c.pickerTitle}</h1>
        <p className="mt-2 text-[15px] text-white/55">{c.pickerSub}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ENGINE_ORDER.map((k) => {
            const e = localizeEngine(ENGINES[k], lang);
            const p = paintings[e.painting];
            return (
              <Link key={k} href={`/command/${k}`} style={paletteVars(PALETTES[k])} className="group relative block aspect-[16/10] overflow-hidden rounded-2xl border border-c-edge/60 shadow-[0_0_60px_-30px_var(--c-glow)] focus-visible:outline-2 focus-visible:outline-c-2">
                <Image src={p.src} alt={`${p.title} by ${p.artist}, ${p.year}`} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-105" style={{ objectPosition: p.focus }} />
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute end-3 top-3">
                  <EngineStatus engine={k} />
                </div>
                <div className="absolute inset-x-3 bottom-3 rounded-xl border border-c-edge/50 bg-black/55 p-4 backdrop-blur-md">
                  <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-c-2/90">
                    {c.engineNo} {e.index}
                    {e.badge && <EngineBadge>{e.badge}</EngineBadge>}
                  </p>
                  <p className="mt-1 font-logo text-[24px] font-medium leading-none tracking-[-0.03em]">{e.name}</p>
                  <p className="mt-1.5 text-[13px] text-white/60">{e.role}</p>
                  {e.metric && <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-c-2/70">{e.metric}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
