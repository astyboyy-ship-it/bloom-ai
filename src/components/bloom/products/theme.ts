import type { CSSProperties } from "react";

/**
 * A product's colours, taken from its painting. Hex for accents; RGB triplets ("r g b") for
 * anything the CSS applies alpha to. Read by the prod-* utilities and the p-* colours in globals.css.
 */
export type Palette = {
  accent: string;
  accentHi: string;
  accentInk: string;
  second: string;
  glass: string;
  edge: string;
  glow: string;
  text: string;
  rim: string;
};

export function paletteVars(p: Palette): CSSProperties {
  return {
    "--p-accent": p.accent,
    "--p-accent-hi": p.accentHi,
    "--p-accent-ink": p.accentInk,
    "--p-second": p.second,
    "--p-glass": p.glass,
    "--p-edge": p.edge,
    "--p-glow": p.glow,
    "--p-text": p.text,
    "--p-rim": p.rim,
  } as CSSProperties;
}
