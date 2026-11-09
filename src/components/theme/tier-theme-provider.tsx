"use client";

import { useLayoutEffect } from "react";
import { useLicense } from "@/lib/license-context";
import { sanitizeTheme } from "@/lib/licensing/codec";
import { BLOOM_OBSIDIAN } from "@/lib/licensing/types";
import { resolveExperience } from "@/components/experience/experiences";

const BLUR: Record<string, string> = { high_density: "14px", executive: "24px", minimal: "10px" };

const hexRgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

/**
 * Tier theme engine. Binds the active key's themeConfig onto <html>:
 *  - --tier-accent / --tier-glow: registered <color> properties (globals.css), so a key change animates every
 *    surface built on them: os-cyan text and fills, os-line borders, glass panes, edge glows, header badges and
 *    the ambient backdrop light cone.
 *  - --bloom-glass, --bloom-glass-blur, --bloom-obsidian-bg, data-bloom-density: the glass and density.
 *  - data-bloom-role and data-tier-experience: hooks for experience-specific styling.
 * The theme is re-checked against the BLOOM palette here as well, so a hand-edited settings blob can't take the
 * desk off-palette; the base is always obsidian #07080C. No key: the cyan defaults.
 */
export function TierThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, role, access } = useLicense();
  const { accentColor, glassOpacity, density } = sanitizeTheme(theme);
  const experience = resolveExperience(access);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const [r, g, b] = hexRgb(accentColor);
    const vars: Record<string, string> = {
      "--tier-accent": accentColor,
      "--tier-glow": `rgb(${r} ${g} ${b} / 0.45)`,
      "--bloom-accent-rgb": `${r} ${g} ${b}`,
      "--bloom-obsidian-bg": BLOOM_OBSIDIAN,
      "--bloom-glass": glassOpacity,
      "--bloom-glass-blur": BLUR[density] ?? "20px",
    };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.dataset.bloomDensity = density;
    root.dataset.tierExperience = experience;
    if (role) root.dataset.bloomRole = role;
    else delete root.dataset.bloomRole;
  }, [accentColor, glassOpacity, density, role, experience]);

  return children;
}
