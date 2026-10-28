"use client";

import { useState } from "react";
import Link from "next/link";
import { PaintingCanvas } from "../../art/painting-canvas";
import { paintings } from "../../art/paintings";
import { paletteVars, type Palette } from "../theme";
import { ACTION_TARGETS, ProductContext } from "../ui";
import { ClassicIntro, INFRA_INTRO } from "../classic-intro";

// Peter von Hess, The Entry of King Otto of Greece in Athens: royal Mediterranean sky, marble white,
// regal gold, and stone grey under the Acropolis, over cool alpine slate frost. Figures glow azure.
const PALETTE: Palette = {
  accent: "#9cc2ef",
  accentHi: "#e6f0fc",
  accentInk: "#0a1424",
  second: "#d8b25a",
  glass: "18 25 38",
  edge: "226 232 242",
  glow: "110 176 255",
  text: "246 245 240",
  rim: "216 178 90",
};
const ATTIC_SKY =
  "radial-gradient(50% 45% at 75% 18%, rgb(255 236 190 / 0.2), transparent 70%), radial-gradient(70% 40% at 30% 0%, rgb(120 170 235 / 0.18), transparent 70%), radial-gradient(60% 40% at 50% 0%, rgb(40 92 178 / 0.26), transparent 70%)";
// Alpine slate frost settling over the lower half of the room.
const FROST = "linear-gradient(0deg, rgb(70 84 104 / 0.35), transparent 45%), linear-gradient(180deg, rgb(214 226 240 / 0.06), transparent 40%)";
// Brushed metal: silver catching gold at the centre.
const BRUSHED = "linear-gradient(90deg, transparent, rgb(214 222 232 / 0.5) 20%, rgb(216 178 90 / 0.75) 50%, rgb(214 222 232 / 0.5) 80%, transparent)";

/** Infrastructure Architect's world: Athens under a royal-blue sky, opened by its original 3D rose intro. */
export function InfrastructureArchitectShell({ title, subtitle, status, children }: { title: string; subtitle: React.ReactNode; status?: React.ReactNode; children: React.ReactNode }) {
  const art = paintings.athens;
  const [pulse, setPulse] = useState(0);
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-black font-sans text-p-text" style={paletteVars(PALETTE)} onClickCapture={(e) => (e.target as HTMLElement).closest(ACTION_TARGETS) && setPulse((p) => p + 1)}>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-60">
          <PaintingCanvas painting="athens" priority />
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-[rgb(16_32_64/0.5)] via-[rgb(60_64_72/0.18)] to-black/90" />
        <div className="absolute inset-0" style={{ background: FROST }} />
        <div className="animate-prod-light absolute inset-0 mix-blend-screen" style={{ background: ATTIC_SKY }} />
      </div>
      <ProductContext.Provider value={{ species: "laurel", pulse }}>
        <header className="sticky top-0 z-20 bg-p-glass/45 backdrop-blur-3xl backdrop-saturate-150">
          <div className="flex min-h-16 items-center gap-4 px-6 lg:px-10">
            <Link href="/engine-02?intro=0" className="flex items-baseline gap-3">
              <span className="font-display text-[25px] font-medium leading-none text-p-text">Infrastructure Architect</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-p-second max-sm:hidden">Shift Operator</span>
            </Link>
            <div className="ml-auto flex items-center gap-3 text-[12.5px] text-p-text/65">{status}</div>
          </div>
          <div className="h-px" style={{ background: BRUSHED }} />
        </header>

        <main className="px-6 pb-40 pt-8 lg:px-10">
          <h1 className="prod-title font-display text-[40px] font-light leading-[1.05] sm:text-[52px]">{title}</h1>
          <div className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-p-text/70">{subtitle}</div>
          <div className="mt-7 h-px opacity-70" style={{ background: BRUSHED }} />
          <div className="mt-8">{children}</div>
          <p className="mt-14 text-[11.5px] text-p-text/40">
            Infrastructure Architect · Atmosphere: {art.artist}, <em>{art.title}</em>, {art.year}, public domain
          </p>
        </main>
      </ProductContext.Provider>

      <ClassicIntro meta={INFRA_INTRO} />
    </div>
  );
}
