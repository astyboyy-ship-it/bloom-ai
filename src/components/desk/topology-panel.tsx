"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { useI18n } from "@/components/bloom/i18n";
import { SNAP } from "@/components/bloom/motion";
import { SHIFTS, SHIFT_MODES, allocate, gridCells, type ShiftMode } from "@/components/bloom/shift-plan";
import type { RunMode, Usage } from "@/lib/engines/events";
import type { DESK_COPY } from "./copy";
import type { EngineRunStatus } from "./engine-status";
import { fmtInt, fmtMs } from "./format";

const ICONS: Record<ShiftMode, LucideIcon> = { prime: Sun, dark: Moon, surge: Zap };
/** The modes' product names, kept in every language; the full localized name is the tooltip. */
const MODE_NAME: Record<ShiftMode, string> = { prime: "Prime", dark: "Dark", surge: "Surge" };

type Props = {
  c: (typeof DESK_COPY)["en"];
  shift: ShiftMode;
  clock: ShiftMode | null;
  onShift: (m: ShiftMode) => void;
  statuses: Partial<Record<EngineKey, EngineRunStatus>>;
  running: boolean;
  stats: { ms: number | null; agents: number; tools: number; usage: Usage; mode: RunMode | null };
};

/** Right panel: the shift posture, the 128-cell compute grid lit by the engines in the current run, and run telemetry. */
export function TopologyPanel({ c, shift, clock, onShift, statuses, running, stats }: Props) {
  const { t } = useI18n();
  const base = useMemo(() => allocate(shift), [shift]);
  const cells = useMemo(() => gridCells(base), [base]);
  const total = SHIFTS[shift].nodes;

  return (
    <aside aria-label={c.shift} className="flex min-h-0 flex-col gap-5 overflow-y-auto border-white/10 p-4 lg:border-s">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#f0d59a]/80">{c.shift}</p>
        <div role="radiogroup" aria-label={c.shift} className="mt-3 grid grid-cols-3 gap-1.5">
          {SHIFT_MODES.map((m) => {
            const Icon = ICONS[m];
            const on = m === shift;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onShift(m)}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-[#f0d59a]",
                  on ? "border-[#f0d59a]/50 text-[#f3e2b8]" : "border-white/10 text-white/50 hover:text-white/80",
                )}
              >
                {on && <motion.span layoutId="desk-shift" transition={SNAP} className="absolute inset-0 rounded-xl bg-[#f0d59a]/[0.08]" />}
                <Icon className="relative size-4" />
                <span className="relative font-medium" title={t.shifts.modes[m].name}>
                  {MODE_NAME[m]}
                </span>
                {clock === m && <span className="relative font-mono text-[8.5px] uppercase tracking-[0.14em] text-emerald-300/80">{c.onClock}</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12.5px] leading-snug text-white/60">{t.shifts.modes[shift].body}</p>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">{c.grid}</p>
          <p className="font-mono text-[11px] tabular-nums text-white/60">
            <span className="text-[16px] text-[#f3e2b8]">{total}</span> / 128 {c.nodes}
          </p>
        </div>
        {/* One cell per node, colored by the engine it serves; cells of engines working right now pulse. Always left to right, like a rack. */}
        <div dir="ltr" className="mt-2.5 grid grid-cols-16 gap-[3px]" aria-hidden>
          {cells.map((k, i) => {
            const live = k && statuses[k] === "running";
            const dim = running && k && !statuses[k];
            return (
              <span
                key={i}
                className={cn("aspect-square rounded-[2px] transition-[background-color,box-shadow,opacity] duration-500", live && "animate-pulse")}
                style={
                  k
                    ? { backgroundColor: PALETTES[k].c1, boxShadow: live ? `0 0 8px ${PALETTES[k].c1}` : `0 0 4px ${PALETTES[k].c1}55`, opacity: dim ? 0.3 : 1, transitionDelay: `${(i % 16) * 10}ms` }
                    : { backgroundColor: "rgb(255 255 255 / 0.05)" }
                }
              />
            );
          })}
        </div>
        <ul className="mt-3 space-y-1.5">
          {ENGINE_ORDER.map((k) => (
            <li key={k} style={paletteVars(PALETTES[k])} className="grid grid-cols-[5.5rem_1fr_1.75rem] items-center gap-2 text-[11.5px]">
              <span className={cn("truncate", statuses[k] === "running" ? "text-white" : "text-white/60")}>{ENGINES[k].name}</span>
              <span className="relative h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.span className="absolute inset-y-0 start-0 rounded-full bg-linear-to-r from-c-1 to-c-2" animate={{ width: `${(base[k] / total) * 100}%` }} transition={SNAP} />
              </span>
              <span className="text-end font-mono tabular-nums text-white/50">{base[k]}</span>
            </li>
          ))}
        </ul>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {[
          [c.stats.duration, stats.ms === null ? "—" : fmtMs(stats.ms)],
          [c.stats.agents, String(stats.agents)],
          [c.stats.tools, String(stats.tools)],
          // Simulation estimates tokens from text length, so budgets behave as they would live.
          [stats.mode === "simulation" ? `${c.stats.tokens} (est.)` : c.stats.tokens, stats.usage.input || stats.usage.output ? `${fmtInt(stats.usage.input)} / ${fmtInt(stats.usage.output)}` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2">
            <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">{k}</dt>
            <dd className="mt-0.5 font-mono text-[14px] tabular-nums text-white/90">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto space-y-2 text-[11px] leading-snug text-white/40">
        {stats.mode === "simulation" && <p className="rounded-lg border border-[#f0d59a]/20 bg-[#f0d59a]/[0.05] p-2.5 text-[#f3e2b8]/80">{c.simNote}</p>}
        <p>{c.feedNote}</p>
      </div>
    </aside>
  );
}
