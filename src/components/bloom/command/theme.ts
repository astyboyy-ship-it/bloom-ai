import type { CSSProperties } from "react";
import type { GardenPaletteName } from "../art/rose-vines-3d";
import type { EngineKey } from "./engines";

/**
 * Each engine's palette, drawn from its intro painting. Shadows and stone tones come from the canvas
 * itself (sampled dominant colors); accents are those tones lifted to stay legible on dark glass.
 *  c1 primary light · c2 bright highlight (gems, kickers) · c3 counter-accent · edge borders · deep fills
 */
export type Palette = { c1: string; c2: string; c3: string; edge: string; deep: string; rose: GardenPaletteName; tint: string; name: string };

export const PALETTES: Record<EngineKey, Palette> = {
  // Cole, Destruction: burning city in umber smoke; marble ruins, gilt statuary.
  sovereign: { name: "Imperial crimson · marble · antique gold", c1: "#d6404f", c2: "#d4b06a", c3: "#c4beb2", edge: "#8f2433", deep: "#2a0d10", rose: "imperial", tint: "60 8 14" },
  // Altdorfer, Issus: golden-hour sky over bronze armies, the purple of the imperial banners.
  apex: { name: "Golden-hour bronze · tactical gold · imperial purple", c1: "#d99a52", c2: "#f0c870", c3: "#b48cf0", edge: "#8a5a26", deep: "#1f1226", rose: "bronze", tint: "40 22 44" },
  // Velázquez, Forge of Vulcan: amber forge light, molten iron, soot-black walls.
  coreops: { name: "Forge amber · molten ember · obsidian", c1: "#f0a03a", c2: "#ff7a3a", c3: "#a8a196", edge: "#8a4410", deep: "#170c05", rose: "ember", tint: "40 16 4" },
  // Vernet, Shipwreck: storm-dark sea, electric sky, foam on the rocks.
  intentpulse: { name: "Oceanic teal · storm blue · radar seafoam", c1: "#2ec4b6", c2: "#8ff5c8", c3: "#5b9bff", edge: "#1a6a72", deep: "#05181e", rose: "tide", tint: "4 30 38" },
};

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** CSS variables behind the c-* Tailwind colors, plus ready-made glows for arbitrary shadows. */
export function paletteVars(p: Palette): CSSProperties {
  return {
    "--c-1": p.c1,
    "--c-2": p.c2,
    "--c-3": p.c3,
    "--c-edge": p.edge,
    "--c-deep": p.deep,
    "--c-glow": `rgb(${rgb(p.c1)} / 0.55)`,
    "--c-glow-soft": `rgb(${rgb(p.c1)} / 0.28)`,
    "--c-3-glow": `rgb(${rgb(p.c3)} / 0.22)`,
    "--c-tint": `rgb(${p.tint} / 0.4)`,
  } as CSSProperties;
}
