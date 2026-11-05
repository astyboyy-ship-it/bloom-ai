"use client";

import { useLayoutEffect } from "react";
import { useLicense } from "@/lib/license-context";
import { sanitizeTheme } from "@/lib/licensing/codec";
import { BLOOM_OBSIDIAN } from "@/lib/licensing/types";

const BLUR: Record<string, string> = { high_density: "14px", executive: "24px", minimal: "10px" };

const hexRgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/**
 * BLOOM obsidian glass theme engine. Writes the access key's themeConfig onto <html> as CSS variables
 * (--bloom-accent, --bloom-obsidian-bg, --bloom-glass, --bloom-glass-blur) plus data-bloom-density and
 * data-bloom-role, so the whole desk morphs: every `os-cyan` surface follows --bloom-accent (see globals.css).
 * The theme is re-checked against the BLOOM palette here too, so a hand-edited settings blob can't take the
 * desk off-palette, and the base is always obsidian #07080C whatever the key says.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, role } = useLicense();
  const { accentColor, glassOpacity, density } = sanitizeTheme(theme);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const vars: Record<string, string> = {
      "--bloom-accent": accentColor,
      "--bloom-accent-rgb": hexRgb(accentColor),
      "--bloom-obsidian-bg": BLOOM_OBSIDIAN,
      "--bloom-glass": glassOpacity,
      "--bloom-glass-blur": BLUR[density] ?? "20px",
    };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.dataset.bloomDensity = density;
    if (role) root.dataset.bloomRole = role;
    else delete root.dataset.bloomRole;
  }, [accentColor, glassOpacity, density, role]);

  return children;
}
