"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PaintingCanvas } from "../../art/painting-canvas";
import { paintings } from "../../art/paintings";
import { CinematicIntro, INTRO_HOLD_MS } from "../../command-center/cinematic-intro";
import { paletteVars, type Palette } from "../theme";
import { useIntro } from "../use-intro";

// Lorrain, Landscape with the Adoration of the Golden Calf: sunlit gold over the river, ivory haze.
const PALETTE: Palette = {
  accent: "#e2c07e",
  accentHi: "#f8e7bf",
  accentInk: "#17110a",
  second: "#f6ead2",
  // Translucent liquid gold rather than neutral obsidian.
  glass: "34 26 12",
  edge: "246 230 196",
  glow: "255 214 140",
  text: "251 243 227",
  rim: "243 212 143",
};
const SUNLIGHT = "radial-gradient(40% 46% at 68% 56%, rgb(255 214 140 / 0.26), transparent 68%), linear-gradient(180deg, rgb(246 234 210 / 0.07), transparent 35%)";
// Pastoral green shade pooling at the foot of the valley.
const PASTURE = "radial-gradient(70% 35% at 30% 100%, rgb(40 56 22 / 0.45), transparent 70%)";

/**
 * IntentPulse's original opening, untouched: Vernet's storm under the 3D WebGL rose cascade, with
 * lightning. It lifts on its own timing; a click or skip key fades it out in 0.3s instead.
 */
function OriginalIntro() {
  const intro = useIntro(INTRO_HOLD_MS);
  if (!intro.show) return null;
  return (
    <motion.div initial={false} animate={{ opacity: intro.fast ? 0 : 1 }} transition={{ duration: 0.3 }} onAnimationComplete={() => intro.fast && intro.exited()}>
      <CinematicIntro leaving={intro.leaving && !intro.fast} onSkip={intro.skip} onExited={intro.exited} />
    </motion.div>
  );
}

/** IntentPulse's room: Lorrain's golden river valley, with its original 3D intro playing over it on arrival. */
export function IntentPulseShell({ title, subtitle, status, children }: { title: string; subtitle: React.ReactNode; status?: React.ReactNode; children: React.ReactNode }) {
  const art = paintings.goldenLandscape;
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-black font-sans text-p-text" style={paletteVars(PALETTE)}>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-65">
          <PaintingCanvas painting="goldenLandscape" priority />
        </div>
        <div className="absolute inset-0 bg-linear-to-b from-amber-900/30 via-yellow-900/10 to-black" />
        <div className="absolute inset-0" style={{ background: PASTURE }} />
        <div className="animate-golden-breath absolute inset-0 mix-blend-screen" style={{ background: SUNLIGHT }} />
      </div>

      <header className="sticky top-0 z-20 border-b border-p-second/15 bg-p-glass/45 shadow-[0_1px_0_rgb(var(--p-glow)/0.15)] backdrop-blur-3xl backdrop-saturate-150">
        <div className="flex min-h-16 items-center gap-4 px-6 lg:px-10">
          <Link href="/intentpulse?intro=0" className="flex items-baseline gap-3">
            <span className="font-display text-[24px] font-medium leading-none text-p-text">IntentPulse</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-p-accent max-sm:hidden">Omnichannel Lead Radar</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-[12.5px] text-p-text/60">{status}</div>
        </div>
      </header>

      <main className="px-6 pb-40 pt-8 lg:px-10">
        <h1 className="prod-title font-display text-[40px] font-light leading-[1.05] sm:text-[52px]">{title}</h1>
        <div className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-p-text/65">{subtitle}</div>
        <div className="prod-hairline mt-7 opacity-60" />
        <div className="mt-8">{children}</div>
        <p className="mt-14 text-[11.5px] text-p-text/35">
          IntentPulse · Atmosphere: {art.artist}, <em>{art.title}</em>, {art.year}, public domain
        </p>
      </main>

      <OriginalIntro />
    </div>
  );
}
