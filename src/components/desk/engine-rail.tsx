"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { localizeEngine } from "@/components/bloom/command/locale";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import type { Lang } from "@/components/bloom/i18n";
import type { DESK_COPY } from "./copy";
import { STATUS_DOT, type EngineRunStatus } from "./engine-status";
import { fmtUsdCompact } from "./format";

/** Starting points for each engine's headline metric feed (sample data, labeled as such on the desk). */
const BASE: Record<EngineKey, number> = {
  sovereign: 1_840_000,
  apex: 642_000,
  coreops: 118_000,
  intentpulse: 386_000,
  vanguard: 512_000,
  cortex: 274_000,
  shield: 931_000,
  aether: 208_000,
};

/** Each feed drifts upward in small steps, faster for engines working in the current run. */
function useMetricFeed(active: Partial<Record<EngineKey, EngineRunStatus>>) {
  const [values, setValues] = useState(BASE);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      setValues((v) => {
        const out = { ...v };
        for (const k of ENGINE_ORDER) out[k] = v[k] * (1 + (Math.random() - 0.3) * (active[k] === "running" ? 0.012 : 0.0025));
        return out;
      });
    }, 2400);
    return () => clearInterval(t);
  }, [reduce, active]);
  return values;
}

type Props = {
  c: (typeof DESK_COPY)["en"];
  lang: Lang;
  selected: EngineKey;
  onSelect: (k: EngineKey) => void;
  statuses: Partial<Record<EngineKey, EngineRunStatus>>;
};

export function EngineRail({ c, lang, selected, onSelect, statuses }: Props) {
  const values = useMetricFeed(statuses);
  return (
    <aside aria-label={c.engines} className="flex min-h-0 flex-col border-white/10 lg:border-e">
      <p className="px-4 pt-4 font-mono text-[10px] uppercase tracking-[0.26em] text-white/40">{c.engines}</p>
      <ul className="flex gap-2 overflow-x-auto p-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible">
        {ENGINE_ORDER.map((k) => {
          const e = localizeEngine(ENGINES[k], lang);
          const s = statuses[k] ?? "idle";
          const on = k === selected;
          return (
            <li key={k} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => onSelect(k)}
                aria-current={on ? "true" : undefined}
                style={paletteVars(PALETTES[k])}
                className={cn(
                  "group relative w-56 overflow-hidden rounded-xl border p-3 text-start transition-[border-color,background-color] focus-visible:outline-2 focus-visible:outline-c-2 lg:w-full",
                  on ? "border-c-1/60 bg-c-deep/80 shadow-[0_0_40px_-18px_var(--c-glow)]" : "border-white/[0.07] bg-white/[0.02] hover:border-c-edge/70 hover:bg-c-deep/40",
                )}
              >
                {on && <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-c-1" />}
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-c-2/85">
                    {e.index}
                    {e.badge && <span className="rounded-full border border-c-edge/70 px-1.5 py-px text-[8.5px] tracking-[0.16em] text-c-2/80">{e.badge}</span>}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
                    <span className={cn("size-1.5 rounded-full", STATUS_DOT[s])} />
                    {c.status[s]}
                  </span>
                </span>
                <span className="mt-1.5 block font-logo text-[19px] font-medium leading-none tracking-[-0.03em] text-white">{e.name}</span>
                <span className="mt-1 block truncate text-[11.5px] text-white/50">{e.role}</span>
                <span className="mt-2.5 flex items-baseline justify-between gap-2 border-t border-white/[0.06] pt-2">
                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-white/40">{e.metric}</span>
                  <span className="shrink-0 font-mono text-[13px] tabular-nums text-c-2">{fmtUsdCompact(values[k])}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
