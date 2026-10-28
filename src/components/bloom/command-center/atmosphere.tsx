"use client";

import { memo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { FloraField, type Bloom } from "../art/flora";
import { PaintingCanvas } from "../art/painting-canvas";
import { paintings } from "../art/paintings";

const glow = paintings.goldenLandscape.effects.glow;

/** Lorrain's Golden Calf as a quiet atmospheric layer under an obsidian application canvas. */
export const Atmosphere = memo(function Atmosphere() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#0b0a0d]">
      <div className="absolute inset-0 opacity-[0.34]">
        <PaintingCanvas painting="goldenLandscape" priority />
      </div>
      <div
        aria-hidden
        className="animate-golden-breath pointer-events-none absolute inset-0 mix-blend-screen"
        style={{ background: `radial-gradient(40% 46% at ${glow.x} ${glow.y}, rgb(${glow.color} / 0.12), transparent 65%)` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_10_13/0.55),rgb(11_10_13/0.2)_40%,rgb(11_10_13/0.7))]" />
    </div>
  );
});

// Corner clusters: a full solar dahlia anchored in the corner, a smaller one along the stem, a bud at its tip.
// The left one crowns the sidebar; the right one sits in the space the app bar leaves free.
const LEFT: Bloom[] = [
  { kind: "obsidianDahlia", x: "9%", y: "26%", size: 76, delay: 0.2, rotate: 12 },
  { kind: "goldDahlia", x: "52%", y: "40%", size: 40, delay: 0.9, rotate: -20 },
  { kind: "obsidianDahlia", x: "92%", y: "16%", size: 22, delay: 1.4, rotate: 30 },
];
const RIGHT: Bloom[] = [
  { kind: "goldDahlia", x: "9%", y: "26%", size: 72, delay: 0.4, rotate: -10 },
  { kind: "obsidianDahlia", x: "40%", y: "12%", size: 26, delay: 1.1, rotate: 24 },
];

const STEM = "M18 22 C 90 6, 150 30, 230 22 S 330 6, 400 10";

function Corner({ side, blooms, flare, glowing }: { side: "left" | "right"; blooms: Bloom[]; flare: number; glowing: boolean }) {
  return (
    <div className={cn("pointer-events-none fixed top-0 z-30 h-[69px] w-[300px] max-lg:hidden", side === "left" ? "left-0" : "right-0 w-[200px] -scale-x-100")}>
      <svg viewBox="0 0 400 92" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`cc-stem-${side}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a2a12" />
            <stop offset="0.5" stopColor="#8a6a2e" />
            <stop offset="1" stopColor="#3a2a12" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path d={STEM} pathLength={1} fill="none" stroke={`url(#cc-stem-${side})`} strokeWidth={2} strokeLinecap="round" className="animate-vine-draw" style={{ "--draw": "2.2s", "--delay": side === "left" ? "0.1s" : "0.3s" } as CSSProperties} />
        <path d="M150 30 c-8 -14 6 -22 12 -12 c4 7 -4 11 -7 6" pathLength={1} fill="none" stroke="#7a5c26" strokeWidth={1} className="animate-vine-draw" style={{ "--draw": "1s", "--delay": "1.2s" } as CSSProperties} />
        {/* Light running along the stem, replayed on every flare */}
        {flare > 0 && (
          <path key={flare} d={STEM} pathLength={1} fill="none" stroke="#ffe7a8" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="0.14 1.2" className="animate-light-run" style={{ filter: "drop-shadow(0 0 4px rgb(255 214 140 / 0.9))" }} />
        )}
      </svg>
      <div className={cn("absolute inset-0 transition-[filter] duration-700", glowing ? "animate-dahlia-pulse" : "animate-dahlia-live")}>
        <FloraField blooms={blooms} flare={flare} />
      </div>
    </div>
  );
}

/** Solar dahlias anchored to the app's top corners. They bloom with light on VIP intercepts and sweeps. */
export const DahliaGarland = memo(function DahliaGarland({ flare, glowing }: { flare: number; glowing: boolean }) {
  return (
    <>
      <Corner side="left" blooms={LEFT} flare={flare} glowing={glowing} />
      <Corner side="right" blooms={RIGHT} flare={flare} glowing={glowing} />
    </>
  );
});
