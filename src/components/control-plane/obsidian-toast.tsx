"use client";

import { KeyRound } from "lucide-react";
import { toast } from "sonner";

/** A toast in the BLOOM obsidian glass style: dark glass, key-accent edge and glow, mono type. */
export function obsidianToast(message: string) {
  toast(message, {
    icon: <KeyRound className="size-4" style={{ color: "var(--tier-accent)" }} />,
    style: {
      background: "var(--bloom-glass, rgba(7, 8, 12, 0.85))",
      backdropFilter: "blur(var(--bloom-glass-blur, 20px)) saturate(140%)",
      WebkitBackdropFilter: "blur(var(--bloom-glass-blur, 20px)) saturate(140%)",
      border: "1px solid color-mix(in srgb, var(--tier-accent) 45%, transparent)",
      boxShadow: "0 0 24px -8px var(--tier-glow), 0 24px 60px -24px rgb(0 0 0 / 0.9)",
      color: "rgb(255 255 255 / 0.9)",
      fontFamily: "var(--font-mono)",
      fontSize: "12px",
      letterSpacing: "0.02em",
    },
  });
}
