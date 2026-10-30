"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import { CircleDashed, Clock, Loader2, Pause, Play, SlidersHorizontal, Terminal, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { localizeEngine } from "@/components/bloom/command/locale";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import type { Lang } from "@/components/bloom/i18n";
import { readCalibration } from "@/lib/engines/calibration";
import { modelInfo } from "@/lib/engines/models";
import { useDeskSettings } from "./settings";
import { useEngineTelemetry, type MemoryNode } from "./use-engine-telemetry";

type Props = { engine: EngineKey | null; lang: Lang; onClose: () => void; onCommand: (k: EngineKey) => void; onCalibrate: (k: EngineKey) => void };

/** The deep view of one unlocked architecture: live agent topology, memory graph, execution queue and throughput. */
export function EngineDrawer({ engine, lang, onClose, onCommand, onCalibrate }: Props) {
  useEffect(() => {
    if (!engine) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, onClose]);

  return (
    <AnimatePresence>
      {engine && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${ENGINES[engine].name} architecture`}
            style={paletteVars(PALETTES[engine])}
            className="fixed inset-y-0 end-0 z-50 flex w-full max-w-3xl flex-col border-s border-c-edge/50 bg-ink/95 shadow-[0_0_80px_-20px_var(--c-glow)] backdrop-blur-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
          >
            <DrawerBody engine={engine} lang={lang} onClose={onClose} onCommand={onCommand} onCalibrate={onCalibrate} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerBody({ engine, lang, onClose, onCommand, onCalibrate }: Omit<Props, "engine"> & { engine: EngineKey }) {
  const { settings } = useDeskSettings();
  const cal = readCalibration(settings.calibrations[engine]);
  const [paused, setPaused] = useState(false);
  const t = useEngineTelemetry(engine, cal.memory, paused);
  const e = localizeEngine(ENGINES[engine], lang);
  const agents = e.cards.reduce((s, c) => s + c.agents, 0);
  const running = t.jobs.filter((j) => j.status === "running").length;

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-c-2/90">
            Architecture · Engine Nº {e.index} · {modelInfo(cal.model).label}
          </p>
          <h2 className="mt-1 font-logo text-[34px] font-medium leading-none tracking-[-0.04em]">{e.name}</h2>
          <p className="mt-1 text-[13px] text-white/55">{e.role}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white">
          <X className="size-5" />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="grid grid-cols-3 gap-2">
          <Gauge label="$ generated" value={t.gauges.generated} kind="usd" />
          <Gauge label="Hours saved" value={t.gauges.hours} kind="hours" />
          <Gauge label="Active pipeline" value={t.gauges.pipeline} kind="usd" />
        </div>

        <section className="rounded-2xl border border-white/[0.08] bg-black/30 p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/50">Live topology · {agents} agent nodes</h3>
            <span className="font-mono text-[10.5px] text-white/40">{running} jobs executing</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {e.cards.map((c) => (
              <div key={c.id} className="rounded-xl border border-c-edge/30 bg-c-deep/30 p-3">
                <p className="text-[12px] leading-snug text-white/75">{c.title(c.agents, c.count)}</p>
                <div className="mt-2 flex flex-wrap gap-1" aria-hidden>
                  {Array.from({ length: c.agents }, (_, i) => (
                    <span
                      key={i}
                      className={cn("size-3 rounded-full border border-c-edge/60 transition-colors duration-500", i < (t.busy[c.id] ?? 0) ? "bg-c-1 shadow-[0_0_8px_var(--c-glow)]" : "bg-c-deep")}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-black/30 p-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/50">Active agent memory</h3>
          <MemoryGraph nodes={t.graph.nodes} edges={t.graph.edges} />
          {!cal.memory.length && <p className="mt-1 text-[11.5px] text-white/40">No retained results yet. Each completed run adds one (retention: {cal.memoryRuns}).</p>}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-black/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/50">Execution queue</h3>
            <button type="button" onClick={() => setPaused((p) => !p)} className="flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11.5px] text-white/70 hover:text-white">
              {paused ? <Play className="size-3" /> : <Pause className="size-3" />} {paused ? "Resume queue" : "Pause queue"}
            </button>
          </div>
          <ol className="mt-3 max-h-72 space-y-1 overflow-y-auto font-mono text-[11.5px]">
            {[...t.jobs].reverse().map((j) => (
              <li key={j.id} className="flex items-start gap-2 rounded-md px-2 py-1 hover:bg-white/[0.03]">
                {j.status === "done" ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                ) : j.status === "running" ? (
                  <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-c-1" />
                ) : (
                  <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-white/30" />
                )}
                <span className={cn("flex-1 font-sans text-[12px]", j.status === "queued" ? "text-white/40" : "text-white/75")}>{j.text}</span>
                <span className="flex shrink-0 items-center gap-1 text-[10px] text-white/35">
                  <Clock className="size-3" /> {j.status === "done" ? `${(j.ms / 1000).toFixed(1)}s` : j.status}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[10.5px] text-white/30">Live simulated workforce telemetry for this architecture.</p>
        </section>
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-white/10 p-4">
        <button type="button" onClick={() => onCommand(engine)} className="flex items-center gap-2 rounded-full bg-linear-to-r from-c-1 to-c-2 px-5 py-2 text-[13px] font-semibold text-black">
          <Terminal className="size-4" /> Command {e.name}
        </button>
        <button type="button" onClick={() => onCalibrate(engine)} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/80 hover:text-white">
          <SlidersHorizontal className="size-4" /> Calibrate
        </button>
      </footer>
    </>
  );
}

function Gauge({ label, value, kind }: { label: string; value: number; kind: "usd" | "hours" }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const c = animate(v, value, { duration: 0.8, onUpdate: setV });
    return () => c.stop();
    // Animates from the shown value to the new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const pct = Math.min(100, (value % 100_000) / 1000);
  return (
    <div className="rounded-xl border border-c-edge/40 bg-black/30 p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 font-mono text-[18px] tabular-nums text-c-2">{kind === "usd" ? `$${Math.round(v).toLocaleString("en-US")}` : `${v.toFixed(1)}h`}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-linear-to-r from-c-1 to-c-2 transition-[width] duration-700" style={{ width: `${Math.max(6, pct)}%` }} />
      </div>
    </div>
  );
}

/** A radial memory graph: engine at the center, memories on the inner ring, accounts and tasks outside. */
function MemoryGraph({ nodes, edges }: { nodes: MemoryNode[]; edges: [string, string][] }) {
  const pos = useMemo(() => {
    const W = 520;
    const H = 240;
    const out: Record<string, { x: number; y: number }> = { core: { x: W / 2, y: H / 2 } };
    const rings: [MemoryNode["kind"][], number, number][] = [
      [["memory"], 120, 70],
      [["account", "task"], 230, 105],
    ];
    for (const [kinds, rx, ry] of rings) {
      const ring = nodes.filter((n) => kinds.includes(n.kind));
      const inner = kinds.includes("memory");
      ring.forEach((n, i) => {
        // Memories fan across the upper arc, so their labels never land on the outer ring's.
        const a = inner ? (-5 * Math.PI) / 6 + ((i + 0.5) / ring.length) * ((2 * Math.PI) / 3) : -Math.PI / 2 + ((i + 0.5) / ring.length) * Math.PI * 2 + Math.PI / ring.length;
        out[n.id] = { x: W / 2 + Math.cos(a) * rx, y: H / 2 + Math.sin(a) * ry };
      });
    }
    return out;
  }, [nodes]);
  const color = { engine: "var(--c-2)", memory: "var(--c-1)", account: "#c4beb2", task: "var(--c-3)" };
  return (
    <svg viewBox="0 0 520 240" className="mt-2 h-auto w-full" style={{ direction: "ltr" }} role="img" aria-label="Agent memory graph">
      {edges.map(([a, b]) => pos[a] && pos[b] && <line key={`${a}-${b}`} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} stroke="rgb(255 255 255 / 0.12)" strokeDasharray="3 4" className="animate-[net-flow_1.6s_linear_infinite]" />)}
      {nodes.map((n) => {
        const p = pos[n.id];
        if (!p) return null;
        const r = n.kind === "engine" ? 16 : n.kind === "memory" ? 7 : 5;
        return (
          <g key={n.id}>
            <circle cx={p.x} cy={p.y} r={r} fill={color[n.kind]} opacity={n.kind === "engine" ? 0.9 : 0.75} />
            <text x={p.x} y={p.y + r + 11} textAnchor="middle" fontSize={9.5} fill="rgb(255 255 255 / 0.6)">
              {n.label.length > 30 ? `${n.label.slice(0, 30)}…` : n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
