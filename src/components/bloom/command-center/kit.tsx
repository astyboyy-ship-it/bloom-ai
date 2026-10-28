"use client";

import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DispatchResult } from "@/lib/intentpulse/outreach";
import { PLATFORM_KEYS, PLATFORMS, routeOf, type Platform, type PulseSignal } from "@/lib/intentpulse/signal";
import type { IntentTier } from "@/lib/intentpulse/types";
import type { LogEntry } from "../demo/shared/ui";
import { compact, fmt, PLATFORM_ICON } from "./platform";
import type { Sales } from "./use-pulse-engine";

/** A flat application surface: solid obsidian, hairline border, no glow. */
export function Surface({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("surface min-w-0 rounded-lg", className)} {...rest}>
      {children}
    </section>
  );
}

export function SurfaceHeader({ title, meta, right, className }: { title: React.ReactNode; meta?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("flex min-h-12 items-center justify-between gap-3 border-b border-white/[0.07] px-4", className)}>
      <div className="flex min-w-0 items-baseline gap-2.5">
        <h2 className="truncate text-[13px] font-semibold text-white/90">{title}</h2>
        {meta && <span className="truncate text-[12px] text-white/40">{meta}</span>}
      </div>
      {right}
    </header>
  );
}

// Deterministic, muted avatar colours from the handle.
const AVATAR_TONES = ["#5b4a7a", "#7a4a4a", "#4a6a7a", "#6a7a4a", "#7a6a4a", "#4a7a62", "#7a4a6c", "#4a557a"];
export function Avatar({ name, handle, size = 32 }: { name: string; handle: string; size?: number }) {
  let h = 0;
  for (const c of handle || name) h = (h * 31 + c.charCodeAt(0)) | 0;
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-medium text-white/90"
      style={{ width: size, height: size, fontSize: size * 0.36, background: AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length] }}
    >
      {initials || "?"}
    </span>
  );
}

export function Name({ s, className }: { s: PulseSignal; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1", className)}>
      <span className="truncate font-medium text-white/90">{s.author.name}</span>
      {s.author.verified && <BadgeCheck className="size-3.5 shrink-0 text-[#7cc4ff]" aria-label="Verified" />}
    </span>
  );
}

const TIER_STYLE: Record<IntentTier | "QUARANTINE", string> = {
  VIP: "bg-[#e9cf98]/15 text-[#f0d9a8]",
  QUALIFIED: "bg-[#ffb36b]/12 text-[#ffc48c]",
  NURTURE: "bg-white/[0.07] text-white/55",
  QUARANTINE: "bg-[#ff7b6b]/12 text-[#ff9d90]",
};

export function tierOf(s: PulseSignal, outcome?: DispatchResult): IntentTier | "QUARANTINE" {
  return routeOf(s) === "quarantine" || outcome?.action === "quarantine" ? "QUARANTINE" : s.result.tier;
}

export function TierBadge({ s, outcome, withScore = true }: { s: PulseSignal; outcome?: DispatchResult; withScore?: boolean }) {
  const t = tierOf(s, outcome);
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums", TIER_STYLE[t])}>
      {withScore && <span>{s.result.score}</span>}
      <span className="uppercase tracking-wide opacity-80">{t === "QUALIFIED" ? "Qualified" : t === "QUARANTINE" ? "Quarantine" : t === "NURTURE" ? "Nurture" : "VIP"}</span>
    </span>
  );
}

/** Plain 0–100 ring: no glow, just the number and the arc. */
export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? "#e9cf98" : score >= 60 ? "#ffb36b" : "#8a8494";
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 52 52" className="size-full -rotate-90" aria-label={`Score ${score}`}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-semibold tabular-nums text-white">{score}</span>
    </span>
  );
}

export function Bar({ value, className, color = "#e9cf98" }: { value: number; className?: string; color?: string }) {
  return (
    <span className={cn("block h-1 overflow-hidden rounded-full bg-white/[0.07]", className)}>
      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </span>
  );
}

export function Button({ variant = "secondary", size = "md", className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-45",
        size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[12.5px]",
        variant === "primary" && "bg-[#e9cf98] text-[#17110a] hover:bg-[#f3dfb4]",
        variant === "secondary" && "border border-white/10 bg-white/[0.04] text-white/85 hover:border-white/20 hover:bg-white/[0.07]",
        variant === "ghost" && "text-white/60 hover:bg-white/[0.06] hover:text-white",
        variant === "danger" && "border border-[#ff7b6b]/25 text-[#ff9d90] hover:bg-[#ff7b6b]/10",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export const money = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 10_000 ? `$${(n / 1000).toFixed(1)}k` : `$${fmt(n)}`);
export const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(a / b < 0.01 ? 2 : 1)}%` : "—");

/** A row of plain metric cells divided by hairlines. */
export function StatStrip({ items, className }: { items: { label: string; value: React.ReactNode; sub?: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn("surface grid divide-white/[0.07] overflow-hidden rounded-lg max-md:divide-y md:divide-x", className)} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))` }}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0 px-4 py-3">
          <p className="truncate text-[11.5px] text-white/45">{it.label}</p>
          <p className="mt-1 truncate text-[22px] font-semibold tabular-nums tracking-tight text-white">{it.value}</p>
          {it.sub && <p className="mt-0.5 truncate text-[11.5px] text-white/40">{it.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/** Revenue, deals and conversion per channel. Attribution is simulated. */
export function ChannelSalesTable({ sales, perPlatform, only }: { sales: Record<Platform, Sales>; perPlatform: Record<Platform, number>; only?: Platform }) {
  const rows = only ? [only] : PLATFORM_KEYS;
  const total = PLATFORM_KEYS.reduce((s, k) => s + sales[k].revenue, 0);
  return (
    <table className="w-full text-left text-[12.5px]">
      <thead>
        <tr className="border-b border-white/[0.07] text-[11px] text-white/40">
          <th className="px-4 py-2 font-normal">Channel</th>
          <th className="px-2 py-2 text-right font-normal">Signals</th>
          <th className="px-2 py-2 text-right font-normal">Engaged</th>
          <th className="px-2 py-2 text-right font-normal">Conversations</th>
          <th className="px-2 py-2 text-right font-normal">Deals</th>
          <th className="px-2 py-2 text-right font-normal">Conv. %</th>
          <th className="px-4 py-2 text-right font-normal">Revenue</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((k) => {
          const Icon = PLATFORM_ICON[k];
          const s = sales[k];
          return (
            <tr key={k} className="border-b border-white/[0.05] last:border-0">
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2 text-white/85">
                  <Icon className="size-3.5" style={{ color: PLATFORMS[k].color }} />
                  {PLATFORMS[k].label}
                </span>
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-white/60">{compact(perPlatform[k])}</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-white/60">{fmt(s.engaged)}</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-white/60">{fmt(s.conversations)}</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-white/85">{fmt(s.deals)}</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-white/60">{pct(s.deals, s.engaged)}</td>
              <td className="px-4 py-2.5 text-right">
                <span className="tabular-nums font-medium text-white">{money(s.revenue)}</span>
                {!only && <Bar value={total ? (s.revenue / total) * 100 : 0} className="ml-auto mt-1 w-20" color={PLATFORMS[k].color} />}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const LOG_DOT = { gold: "bg-[#e9cf98]", cyan: "bg-[#7cc4ff]", ember: "bg-[#ff7b6b]", muted: "bg-white/25" };

/** Newest-first activity feed: time, a tone dot, and the line. Rows rise in with CSS, no JS animation. */
export function ActivityList({ entries, className }: { entries: LogEntry[]; className?: string }) {
  return (
    <ol className={cn("divide-y divide-white/[0.04]", className)}>
      {entries.map((en) => (
        <li key={en.id} className="animate-row-in flex gap-3 px-4 py-2 text-[12px]">
          <span className="w-14 shrink-0 tabular-nums text-white/35">{en.time}</span>
          <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", LOG_DOT[en.tone ?? "muted"])} />
          <span className="min-w-0 text-white/70 [overflow-wrap:anywhere]">{en.text}</span>
        </li>
      ))}
    </ol>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-[12.5px] text-white/40">{children}</p>;
}
