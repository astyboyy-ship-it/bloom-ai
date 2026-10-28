"use client";

import { useState } from "react";
import Link from "next/link";
import { PaintingCanvas } from "../../art/painting-canvas";
import { paintings } from "../../art/paintings";
import { paletteVars, type Palette } from "../theme";
import { ACTION_TARGETS, ProductContext } from "../ui";
import { ClassicIntro, FOUNDRY_INTRO } from "../classic-intro";

// Heilmayer, Venice, the Grand Canal in the Moonlight: nocturnal navy, silver moonlight on the water,
// deep emerald lagoon flowing underneath.
const PALETTE: Palette = {
  accent: "#c9d6ec",
  accentHi: "#f4f7fd",
  accentInk: "#0a1428",
  second: "#3fae8f",
  glass: "8 14 30",
  edge: "201 214 236",
  glow: "180 204 245",
  text: "238 243 252",
  rim: "220 230 255",
};
const MOONLIGHT =
  "radial-gradient(30% 30% at 42% 18%, rgb(220 230 255 / 0.24), transparent 70%), linear-gradient(180deg, transparent 55%, rgb(220 230 255 / 0.06) 68%, transparent 74%, rgb(220 230 255 / 0.04) 80%, transparent 86%)";
// The lagoon's emerald welling up from below, under a midnight-navy sky.
const LAGOON = "linear-gradient(0deg, rgb(24 110 90 / 0.32), transparent 38%), radial-gradient(70% 30% at 50% 100%, rgb(31 120 98 / 0.3), transparent 70%), linear-gradient(180deg, rgb(8 16 44 / 0.4), transparent 40%)";

/** Shadow Workforce's world: the Grand Canal under the moon, opened by its original 3D rose intro. */
export function ShadowWorkforceShell({ title, subtitle, status, children }: { title: string; subtitle: React.ReactNode; status?: React.ReactNode; children: React.ReactNode }) {
  const art = paintings.venice;
  const [pulse, setPulse] = useState(0);
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-black font-sans text-p-text" style={paletteVars(PALETTE)} onClickCapture={(e) => (e.target as HTMLElement).closest(ACTION_TARGETS) && setPulse((p) => p + 1)}>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-70">
          <PaintingCanvas painting="venice" priority />
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-[rgb(8_16_40/0.45)] via-[rgb(10_40_44/0.15)] to-black/90" />
        <div className="absolute inset-0" style={{ background: LAGOON }} />
        <div className="animate-prod-light absolute inset-0 mix-blend-screen" style={{ background: MOONLIGHT }} />
      </div>
      <ProductContext.Provider value={{ species: "lotus", pulse }}>
        {/* Silver-to-lagoon edge light under a midnight bar */}
        <header className="sticky top-0 z-20 bg-p-glass/45 backdrop-blur-3xl backdrop-saturate-150">
          <div className="flex min-h-16 items-center gap-4 px-6 lg:px-10">
            <Link href="/engine-03?intro=0" className="flex items-baseline gap-3">
              <span className="font-display text-[25px] font-medium leading-none text-p-text">Shadow Workforce</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-p-accent max-sm:hidden">Solution Foundry</span>
            </Link>
            <div className="ml-auto flex items-center gap-3 text-[12.5px] text-p-text/65">{status}</div>
          </div>
          <div className="h-px bg-linear-to-r from-transparent via-p-accent/45 to-p-second/45" />
        </header>

        <main className="px-6 pb-40 pt-8 lg:px-10">
          <h1 className="prod-title font-display text-[40px] font-light leading-[1.05] sm:text-[52px]">{title}</h1>
          <div className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-p-text/70">{subtitle}</div>
          <div className="prod-hairline mt-7 opacity-60" />
          <div className="mt-8">{children}</div>
          <p className="mt-14 text-[11.5px] text-p-text/40">
            Shadow Workforce · Atmosphere: {art.artist}, <em>{art.title}</em>, {art.year}, public domain
          </p>
        </main>
      </ProductContext.Provider>

      <ClassicIntro meta={FOUNDRY_INTRO} />
    </div>
  );
}
