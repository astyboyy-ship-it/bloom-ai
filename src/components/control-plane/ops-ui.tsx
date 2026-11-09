"use client";

import { useId } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Where a number comes from. Every operations-room figure carries one, so measured and simulated never blur. */
export type Source = "measured" | "simulated" | "sample" | "illustrative";

export function SourceTag({ source, label, className }: { source: Source; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-px font-mono text-[8.5px] uppercase tracking-[0.14em]",
        source === "measured" ? "border-os-emerald/35 text-os-emerald/90" : "border-amber-300/40 text-amber-200/90",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** A small breathing dot: live streams, active nodes. */
export function LiveDot({ on = true, className }: { on?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2", className)} aria-hidden>
      {on && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-os-cyan opacity-60" />}
      <span className={cn("relative inline-flex size-2 rounded-full", on ? "bg-os-cyan" : "bg-white/25")} style={on ? { boxShadow: "0 0 8px var(--tier-glow)" } : undefined} />
    </span>
  );
}

/** An area sparkline in the tier accent, scaled to its own range. Needs at least two points. */
export function Sparkline({ values, className, height = 36 }: { values: number[]; className?: string; height?: number }) {
  const id = useId().replace(/:/g, "");
  if (values.length < 2) return <div className={cn("w-full", className)} style={{ height }} />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, height - 2 - ((v - lo) / span) * (height - 4)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className={cn("w-full overflow-visible", className)} style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--tier-accent)" stopOpacity={0.28} />
          <stop offset="100%" stopColor="var(--tier-accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${line} 100,${height}`} fill={`url(#g${id})`} />
      <polyline points={line} fill="none" stroke="var(--tier-accent)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={1.8} fill="var(--tier-accent)" vectorEffect="non-scaling-stroke" style={{ filter: "drop-shadow(0 0 3px var(--tier-glow))" }} />
    </svg>
  );
}

/** Direction and size of the change between the first and last half of a series. `goodWhen` sets the colour. */
export function Trend({ values, goodWhen = "up", format = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(0)}%` }: { values: number[]; goodWhen?: "up" | "down"; format?: (pct: number) => string }) {
  if (values.length < 4) return null;
  const half = Math.floor(values.length / 2);
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
  const a = avg(values.slice(0, half));
  const b = avg(values.slice(half));
  const pct = a === 0 ? (b === 0 ? 0 : 100) : ((b - a) / Math.abs(a)) * 100;
  const flat = Math.abs(pct) < 2;
  const good = flat ? null : (pct > 0) === (goodWhen === "up");
  const Icon = flat ? ArrowRight : pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums", good === null ? "text-white/45" : good ? "text-os-emerald" : "text-amber-300")}>
      <Icon className="size-3" />
      {format(pct)}
    </span>
  );
}
