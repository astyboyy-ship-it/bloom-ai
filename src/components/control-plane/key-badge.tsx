"use client";

import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyRole } from "@/lib/licensing/types";
import { useLicensingCopy } from "./copy";

/**
 * The access key's role, rendered the same way everywhere (header badge, Settings license panel): the shared
 * "Tier N // Name" label in mono type on key-tinted glowing obsidian glass. `sm` for the header, `lg` for panels.
 */
export function KeyRoleBadge({ role, size = "sm", className }: { role: KeyRole; size?: "sm" | "lg"; className?: string }) {
  const label = useLicensingCopy().roleLabel[role];
  return (
    <span
      className={cn(
        "bloom-edge-glow inline-flex items-center gap-1.5 rounded-full border bg-[var(--bloom-glass)] font-mono text-os-cyan",
        size === "sm" ? "px-2.5 py-1 text-[10px] tracking-[0.12em]" : "px-3.5 py-1.5 text-[13px] tracking-[0.08em]",
        className,
      )}
    >
      <KeyRound className={size === "sm" ? "size-3" : "size-4"} />
      <span className="bloom-glow">{label}</span>
    </span>
  );
}
