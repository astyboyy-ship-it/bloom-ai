"use client";

import Link from "next/link";
import { Activity, Gauge, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { BloomWordmark } from "@/components/bloom/logo";
import { LanguageSwitcher } from "@/components/bloom/language-switcher";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import type { RunMode } from "@/lib/engines/events";
import type { DESK_COPY } from "./copy";
import { HUBS, type Hub } from "./hub-copy";
import { STATUS_DOT, type EngineRunStatus } from "./engine-status";
import { fmtMs } from "./format";
import type { Sla } from "./use-telemetry";

type Props = {
  c: (typeof DESK_COPY)["en"];
  statuses: Partial<Record<EngineKey, EngineRunStatus>>;
  selected: EngineKey;
  onSelect: (k: EngineKey) => void;
  mode: RunMode | null;
  model: string | null;
  sla: Sla;
  uptime: number | null;
  latency: number | null;
  firstEvent: number | null;
  hub: Hub;
  hubLabels: Record<Hub, string>;
  onHub: (h: Hub) => void;
};

const SLA_TONE: Record<Sla, string> = { nominal: "bg-emerald-400", degraded: "bg-amber-400", offline: "bg-red-500" };

export function TopBar({ c, statuses, selected, onSelect, mode, model, sla, uptime, latency, firstEvent, hub, hubLabels, onHub }: Props) {
  return (
    <header className="relative z-20 flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-black/45 px-4 py-2 backdrop-blur-xl">
      <Link href="/" className="shrink-0 rounded focus-visible:outline-2 focus-visible:outline-[#f0d59a]">
        <BloomWordmark className="text-[20px]" />
      </Link>
      <span className="hidden font-display text-[19px] italic leading-none text-[#f3e2b8]/85 xl:block">{c.title}</span>

      {/* The three hubs of the desktop workspace. */}
      <div role="tablist" aria-label={c.title} className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
        {HUBS.map((h, i) => (
          <button
            key={h}
            type="button"
            role="tab"
            aria-selected={hub === h}
            onClick={() => onHub(h)}
            className={cn(
              "shrink-0 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors focus-visible:outline-2 focus-visible:outline-[#f0d59a]",
              hub === h ? "border-[#f0d59a]/45 bg-[#f0d59a]/[0.08] text-[#f3e2b8]" : "border-transparent text-white/50 hover:text-white/85",
            )}
          >
            <span className="text-white/35">[</span> {String(i + 1).padStart(2, "0")} {hubLabels[h]} <span className="text-white/35">]</span>
          </button>
        ))}
      </div>

      {/* Engine status pills: one per engine, lit by the current run. */}
      <nav aria-label={c.engines} className="hidden items-center gap-1 2xl:flex">
        {ENGINE_ORDER.map((k) => {
          const s = statuses[k] ?? "idle";
          return (
            <button
              key={k}
              type="button"
              onClick={() => onSelect(k)}
              style={paletteVars(PALETTES[k])}
              title={`${ENGINES[k].name} · ${c.status[s]}`}
              aria-pressed={selected === k}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[10px] tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-c-2",
                selected === k ? "border-c-1/70 bg-c-1/15 text-white" : "border-white/10 text-white/55 hover:border-c-edge hover:text-white/85",
              )}
            >
              <span className={cn("size-1.5 rounded-full", STATUS_DOT[s])} />
              {ENGINES[k].index}
            </button>
          );
        })}
      </nav>

      <div className="ms-auto flex flex-wrap items-center gap-2">
        {mode && (
          <span
            title={model ?? undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]",
              mode === "live" ? "border-emerald-400/40 text-emerald-200" : "border-[#f0d59a]/40 text-[#f3e2b8]",
            )}
          >
            <Activity className="size-3" />
            {c.mode[mode]}
            {model && mode === "live" && <span className="hidden normal-case tracking-normal text-white/50 sm:inline">· {model}</span>}
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
          <ShieldCheck className="size-3" />
          {c.sla}
          <span className={cn("size-1.5 rounded-full", SLA_TONE[sla])} />
          <span className="text-white/90">{c.slaState[sla]}</span>
          {uptime !== null && <span className="tabular-nums text-white/45">{(uptime * 100).toFixed(1)}%</span>}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
          <Gauge className="size-3" />
          <span className="hidden sm:inline">{c.latency}</span>
          <span className="tabular-nums text-white/90">{latency === null ? "—" : fmtMs(latency)}</span>
          {firstEvent !== null && (
            <span className="hidden tabular-nums text-white/45 md:inline">
              · {c.firstEvent} {fmtMs(firstEvent)}
            </span>
          )}
        </span>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
