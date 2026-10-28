"use client";

import { useState } from "react";
import Link from "next/link";
import { PaintingCanvas } from "../../art/painting-canvas";
import { paintings } from "../../art/paintings";
import { paletteVars, type Palette } from "../theme";
import { ACTION_TARGETS, ProductContext } from "../ui";
import { ClassicIntro, MARKETING_INTRO } from "../classic-intro";

// Fragonard, The Grand Staircase of the Villa d'Este at Tivoli: sun-warmed terracotta, cypress green,
// ivory marble, and golden-hour light pouring over the garden stairs. Keys are amber-lit, cards liquid gold.
const PALETTE: Palette = {
  accent: "#eb9a45",
  accentHi: "#ffd38c",
  accentInk: "#2a1206",
  second: "#7fa274",
  glass: "42 29 14",
  edge: "246 236 218",
  glow: "242 184 102",
  text: "251 246 236",
  rim: "247 201 120",
};
const GOLDEN_HOUR =
  "radial-gradient(55% 55% at 30% 30%, rgb(255 196 120 / 0.3), transparent 70%), radial-gradient(40% 35% at 85% 90%, rgb(235 154 69 / 0.18), transparent 70%)";
// The cypresses' shade pooling in from the lower left and the far right.
const CYPRESS_SHADE = "radial-gradient(55% 45% at 6% 100%, rgb(18 40 24 / 0.6), transparent 70%), radial-gradient(35% 45% at 100% 55%, rgb(18 40 24 / 0.32), transparent 70%)";

/** Aware Marketing's world: the Villa d'Este garden at golden hour, opened by its original 3D rose intro. */
export function AwareMarketingShell({ title, subtitle, status, children }: { title: string; subtitle: React.ReactNode; status?: React.ReactNode; children: React.ReactNode }) {
  const art = paintings.villaDeste;
  const [pulse, setPulse] = useState(0);
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-black font-sans text-p-text" style={paletteVars(PALETTE)} onClickCapture={(e) => (e.target as HTMLElement).closest(ACTION_TARGETS) && setPulse((p) => p + 1)}>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-65">
          <PaintingCanvas painting="villaDeste" priority />
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-[rgb(96_44_20/0.38)] via-[rgb(38_46_28/0.2)] to-black/90" />
        <div className="absolute inset-0" style={{ background: CYPRESS_SHADE }} />
        <div className="animate-prod-light absolute inset-0 mix-blend-screen" style={{ background: GOLDEN_HOUR }} />
      </div>
      <ProductContext.Provider value={{ species: "jasmine", pulse }}>

      <header className="sticky top-0 z-20 border-b border-p-edge/12 bg-p-glass/40 shadow-[0_1px_0_rgb(var(--p-glow)/0.12)] backdrop-blur-3xl backdrop-saturate-150">
        <div className="flex min-h-16 items-center gap-4 px-6 lg:px-10">
          <Link href="/engine-01?intro=0" className="flex items-baseline gap-3">
            <span className="font-display text-[25px] font-medium leading-none text-p-text">Aware Marketing</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-p-hi max-sm:hidden">Deal Synthesizer</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-[12.5px] text-p-text/65">{status}</div>
        </div>
      </header>

      <main className="px-6 pb-40 pt-8 lg:px-10">
        <h1 className="prod-title font-display text-[40px] font-light leading-[1.05] sm:text-[52px]">{title}</h1>
        <div className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-p-text/70">{subtitle}</div>
        <div className="prod-hairline mt-7 opacity-60" />
        <div className="mt-8">{children}</div>
        <p className="mt-14 text-[11.5px] text-p-text/40">
          Aware Marketing · Atmosphere: {art.artist}, <em>{art.title}</em>, {art.year}, public domain
        </p>
      </main>
      </ProductContext.Provider>

      <ClassicIntro meta={MARKETING_INTRO} />
    </div>
  );
}
