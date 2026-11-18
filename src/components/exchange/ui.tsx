"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const PARLIAMENT_NODES = [
  { engine: "shield", label: "Shield" },
  { engine: "cortex", label: "Cortex" },
  { engine: "aether", label: "Aether" },
  { engine: "sovereign", label: "Sovereign" },
  { engine: "apex", label: "Apex" },
] as const;

export const ENGINE_TONE: Record<string, string> = {
  shield: "text-amber-200",
  cortex: "text-violet-300",
  aether: "text-sky-300",
  sovereign: "text-os-emerald",
  apex: "text-os-cyan",
};

export const usd = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`);
export const short = (h: string, n = 10) => `${h.slice(0, n)}…`;

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("bloom-glass bloom-noise min-w-0 rounded-2xl p-4 sm:p-5", className)}>{children}</section>;
}

export function PanelHeader({ icon: Icon, title, sub, right }: { icon: LucideIcon; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[14.5px] font-medium tracking-[-0.01em] text-white">
          <Icon className="size-4 shrink-0 text-os-cyan" /> {title}
        </h2>
        {sub && <p className="bloom-detail mt-1 max-w-2xl text-[12px] leading-relaxed text-white/45">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export type Tone = "emerald" | "amber" | "cyan" | "red" | "muted";
const TONES: Record<Tone, string> = {
  emerald: "border-os-emerald/40 bg-os-emerald/[0.06] text-os-emerald",
  amber: "border-amber-300/40 bg-amber-300/[0.06] text-amber-200",
  cyan: "border-os-cyan/40 bg-os-cyan/[0.06] text-os-cyan",
  red: "border-red-300/40 bg-red-400/[0.06] text-red-200",
  muted: "border-white/12 text-white/55",
};

export function Badge({ tone = "muted", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]", TONES[tone], className)}>{children}</span>;
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
      <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className={cn("mt-0.5 truncate font-mono text-[14px] tabular-nums text-white/90", tone)}>{value}</p>
    </div>
  );
}
