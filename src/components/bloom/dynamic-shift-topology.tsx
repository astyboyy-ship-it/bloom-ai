"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Activity, Moon, Sun, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, ENGINE_ORDER, type EngineKey } from "./command/engines";
import { PALETTES, paletteVars } from "./command/theme";
import { useI18n } from "./i18n";
import { SNAP } from "./motion";
import { Accent, SectionHeading } from "./section-heading";

type Mode = "prime" | "dark" | "surge";

/**
 * How each shift spreads its compute across the engines (shares sum to 100), and how many nodes it runs.
 * Prime leans on closing, Dark on ingestion and hygiene, Surge doubles capacity toward signals and closers.
 */
const SHIFTS: Record<Mode, { icon: LucideIcon; nodes: number; share: Record<EngineKey, number> }> = {
  prime: { icon: Sun, nodes: 64, share: { intentpulse: 10, vanguard: 12, apex: 22, cortex: 20, aether: 8, coreops: 10, shield: 8, sovereign: 10 } },
  dark: { icon: Moon, nodes: 48, share: { intentpulse: 22, vanguard: 18, apex: 4, cortex: 8, aether: 10, coreops: 16, shield: 14, sovereign: 8 } },
  surge: { icon: Zap, nodes: 128, share: { intentpulse: 24, vanguard: 6, apex: 26, cortex: 18, aether: 8, coreops: 6, shield: 4, sovereign: 8 } },
};
const MODES: Mode[] = ["prime", "dark", "surge"];
const GRID = 128;

/** Whole-node counts per engine that add up to the shift's total (largest remainders get the leftovers). */
function allocate(mode: Mode): Record<EngineKey, number> {
  const { nodes, share } = SHIFTS[mode];
  const raw = ENGINE_ORDER.map((k) => ({ k, v: (share[k] / 100) * nodes }));
  const out = Object.fromEntries(raw.map(({ k, v }) => [k, Math.floor(v)])) as Record<EngineKey, number>;
  let left = nodes - raw.reduce((s, { v }) => s + Math.floor(v), 0);
  for (const { k } of [...raw].sort((a, b) => (b.v % 1) - (a.v % 1))) if (left-- > 0) out[k]++;
  return out;
}

/** The engine operating system's shift planner: three modes, a live compute grid and per-engine node allocation. */
export function DynamicShiftTopology() {
  const { t } = useI18n();
  const c = t.shifts;
  const [mode, setMode] = useState<Mode>("prime");
  // The shift that would be running for this visitor right now; Surge is event-driven, never on the clock.
  const [liveMode, setLiveMode] = useState<Mode | null>(null);
  useEffect(() => {
    const h = new Date().getHours();
    const m: Mode = h >= 8 && h < 19 ? "prime" : "dark";
    setLiveMode(m);
    setMode(m);
  }, []);

  const section = useRef<HTMLElement>(null);
  const base = useMemo(() => allocate(mode), [mode]);
  const live = useLiveCounts(base, section);
  const total = ENGINE_ORDER.reduce((s, k) => s + live[k], 0);

  // The grid lists engines' nodes in order; cells past the shift's total stay dark.
  const cells = useMemo(() => {
    const out: (EngineKey | null)[] = [];
    for (const k of ENGINE_ORDER) for (let i = 0; i < base[k]; i++) out.push(k);
    while (out.length < GRID) out.push(null);
    return out.slice(0, GRID);
  }, [base]);

  const shift = c.modes[mode];
  const Icon = SHIFTS[mode].icon;

  return (
    <section ref={section} id="shifts" className="relative scroll-mt-16 px-4 py-32 sm:px-8 sm:py-44">
      <SectionHeading
        kanji="循環"
        eyebrow={c.eyebrow}
        title={
          <>
            {c.titlePre}
            <Accent>{c.titleAccent}</Accent>
          </>
        }
        description={c.description}
      />

      <div className="mx-auto mt-16 max-w-6xl">
        <div role="tablist" aria-label={c.eyebrow} className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => {
            const M = SHIFTS[m].icon;
            const on = m === mode;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="shift-panel"
                onClick={() => setMode(m)}
                className={cn(
                  "glass relative flex items-start gap-3 rounded-2xl p-4 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d59a]",
                  on ? "border-[#f0d59a]/40" : "opacity-75 hover:opacity-100",
                )}
              >
                {on && <motion.span layoutId="shift-tab" transition={SNAP} className="absolute inset-0 rounded-2xl bg-[#f0d59a]/[0.07] ring-1 ring-[#f0d59a]/40" />}
                <span className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-xl border", on ? "border-[#f0d59a]/50 bg-[#f0d59a]/10 text-[#f3e2b8]" : "border-white/10 text-white/50")}>
                  <M className="size-4.5" />
                </span>
                <span className="relative min-w-0">
                  <span className="block text-[15px] font-medium text-white">{c.modes[m].name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/45">
                    {m === "surge" ? c.eventDriven : liveMode === m ? (
                      <>
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> {c.liveNow}
                      </>
                    ) : (
                      `${SHIFTS[m].nodes} ${c.nodes}`
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[12px] text-white/40">{c.preview}</p>

        <div id="shift-panel" role="tabpanel" className="glass mt-6 grid gap-8 rounded-[32px] p-6 sm:p-9 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#f0d59a]/85">
              <Icon className="size-3.5" /> {shift.name}
            </p>
            <p className="mt-3 font-display text-[28px] font-light leading-tight text-white sm:text-[34px]">{shift.body}</p>
            <p className="mt-4 text-[13px] text-white/55">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{c.trigger}:</span> {shift.trigger}
            </p>

            <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">{c.running}</p>
            <ul className="mt-3 space-y-2">
              {shift.ops.map((op, i) => (
                <motion.li key={`${mode}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SNAP, delay: i * 0.05 }} className="flex items-center gap-2.5 text-[14px] text-white/80">
                  <Activity className="size-3.5 shrink-0 text-[#f0d59a]/70" />
                  {op}
                </motion.li>
              ))}
            </ul>

            {/* The compute grid: one cell per node, colored by the engine it serves. Always left to right, like a rack. */}
            <div dir="ltr" className="mt-8 grid grid-cols-16 gap-1" aria-hidden>
              {cells.map((k, i) => (
                <span
                  key={i}
                  className="aspect-square rounded-[3px] transition-[background-color,box-shadow] duration-500"
                  style={k ? { backgroundColor: PALETTES[k].c1, boxShadow: `0 0 6px ${PALETTES[k].c1}66`, transitionDelay: `${(i % 16) * 12}ms` } : { backgroundColor: "rgb(255 255 255 / 0.05)" }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">{c.allocation}</p>
              <p className="font-mono text-[13px] tabular-nums text-white">
                <span className="text-[22px] text-[#f3e2b8]">{total}</span> <span className="text-white/45">{c.nodes}</span>
              </p>
            </div>
            <ul className="mt-4 space-y-2.5">
              {ENGINE_ORDER.map((k) => {
                const e = ENGINES[k];
                const pct = (live[k] / Math.max(1, total)) * 100;
                return (
                  <li key={k} style={paletteVars(PALETTES[k])} className="grid grid-cols-[minmax(0,9.5rem)_1fr_2.5rem] items-center gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-[13px] text-white/85">
                      <span className="font-mono text-[10px] text-c-2/80">{e.index}</span>
                      <span className="truncate">{e.name}</span>
                    </span>
                    <span className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.span className="absolute inset-y-0 start-0 rounded-full bg-linear-to-r from-c-1 to-c-2 shadow-[0_0_10px_var(--c-glow)]" animate={{ width: `${pct}%` }} transition={SNAP} />
                    </span>
                    <span className="text-end font-mono text-[12px] tabular-nums text-white/70">{live[k]}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Node counts that breathe: every couple of seconds one node moves between two engines, so the allocation
 * reads as live while the shift's total holds. Paused off-screen and for reduced motion.
 */
function useLiveCounts(base: Record<EngineKey, number>, section: React.RefObject<HTMLElement | null>) {
  const [counts, setCounts] = useState(base);
  const ref = useRef(base);
  const reduce = useReducedMotion();
  const visible = useInView(section, { margin: "100px" });

  useEffect(() => {
    ref.current = base;
    setCounts(base);
  }, [base]);

  useEffect(() => {
    if (reduce || !visible) return;
    const t = setInterval(() => {
      setCounts((prev) => {
        const from = ENGINE_ORDER[Math.floor(Math.random() * ENGINE_ORDER.length)];
        const to = ENGINE_ORDER[Math.floor(Math.random() * ENGINE_ORDER.length)];
        // Stay within two nodes of the shift's plan, and never take an engine to zero.
        if (from === to || prev[from] <= 1 || prev[from] <= ref.current[from] - 2 || prev[to] >= ref.current[to] + 2) return prev;
        return { ...prev, [from]: prev[from] - 1, [to]: prev[to] + 1 };
      });
    }, 1400);
    return () => clearInterval(t);
  }, [reduce, visible]);

  return counts;
}
