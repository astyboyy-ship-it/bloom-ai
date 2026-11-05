"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, GitBranch, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { allocate, clockShift, SHIFTS } from "@/components/bloom/shift-plan";
import { useDeskSettings } from "@/components/desk/settings";
import { useLicense } from "@/lib/license-context";
import { useOsTelemetry } from "@/components/os/telemetry-context";
import { useLicensingCopy } from "./copy";
import { Widget } from "./widget";

type Live = { load: number; threads: number };

/**
 * Multi-Engine State Matrix: one row per engine. Latency and run counts are measured from this desk's run ledger
 * (or the live probe before an engine has run); compute load and thread count are modeled from the engine's
 * agent clusters and the current shift's node allocation, drifting like a live gauge; the vector branch is the
 * engine's current memory HEAD from the temporal vector tree.
 */
export function EngineMatrix() {
  const c = useLicensingCopy().cp.matrix;
  const { settings } = useDeskSettings();
  const { isUnlocked } = useLicense();
  const { latency } = useOsTelemetry();

  const shift = clockShift(new Date().getHours());
  const nodes = useMemo(() => allocate(shift), [shift]);
  const agents = useMemo(() => Object.fromEntries(ENGINE_ORDER.map((k) => [k, ENGINES[k].cards.reduce((n, card) => n + card.agents, 0)])) as Record<EngineKey, number>, []);

  // Measured: per-engine run count, mean latency over the last ten runs, and whether one ran in the last five minutes.
  const ledger = useMemo(() => {
    const now = Date.now();
    return Object.fromEntries(
      ENGINE_ORDER.map((k) => {
        const runs = settings.runs.filter((r) => r.target === k || (r.kind !== "engine" && r.label.toLowerCase().includes(k)));
        const recent = runs.slice(-10);
        const ms = recent.length ? Math.round(recent.reduce((s, r) => s + r.ms, 0) / recent.length) : null;
        return [k, { count: runs.length, ms, hot: runs.some((r) => now - r.at < 300_000) }];
      }),
    ) as Record<EngineKey, { count: number; ms: number | null; hot: boolean }>;
  }, [settings.runs]);

  const base = (k: EngineKey) => Math.min(96, SHIFTS[shift].share[k] * 2.6 + (ledger[k].hot ? 22 : 0));
  const [live, setLive] = useState<Record<EngineKey, Live>>(() => Object.fromEntries(ENGINE_ORDER.map((k) => [k, { load: base(k), threads: nodes[k] * 4 + agents[k] }])) as Record<EngineKey, Live>);
  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    const id = setInterval(() => {
      setLive((prev) =>
        Object.fromEntries(
          ENGINE_ORDER.map((k) => {
            const target = baseRef.current(k);
            const load = Math.max(2, Math.min(99, prev[k].load + (target - prev[k].load) * 0.25 + (Math.random() - 0.5) * 7));
            const threads = Math.max(1, Math.round(nodes[k] * 4 + agents[k] * (0.6 + load / 100) + (Math.random() - 0.5) * 6));
            return [k, { load, threads }];
          }),
        ) as Record<EngineKey, Live>,
      );
    }, 1400);
    return () => clearInterval(id);
  }, [nodes, agents]);

  const heads = settings.memoryHeads;
  const snaps = settings.memorySnapshots;
  const totals = ENGINE_ORDER.reduce((t, k) => ({ load: t.load + live[k].load / ENGINE_ORDER.length, threads: t.threads + live[k].threads, runs: t.runs + ledger[k].count }), { load: 0, threads: 0, runs: 0 });

  return (
    <Widget icon={Cpu} title={c.title} sub={c.sub} className="xl:col-span-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-1 font-mono text-[11.5px]">
          <thead>
            <tr className="text-start text-[9.5px] uppercase tracking-[0.18em] text-white/40">
              <th className="px-2 py-1 text-start font-normal">{c.engine}</th>
              <th className="px-2 py-1 text-start font-normal">{c.load}</th>
              <th className="px-2 py-1 text-end font-normal">{c.threads}</th>
              <th className="px-2 py-1 text-end font-normal">{c.latency}</th>
              <th className="px-2 py-1 text-start font-normal">{c.branch}</th>
              <th className="bloom-detail px-2 py-1 text-end font-normal">{c.runs}</th>
            </tr>
          </thead>
          <tbody>
            {ENGINE_ORDER.map((k) => {
              const on = isUnlocked(k);
              const l = live[k];
              const head = snaps.find((s) => s.id === heads[k]);
              const ms = ledger[k].ms ?? latency;
              const tone = l.load > 85 ? "bg-red-400" : l.load > 65 ? "bg-amber-300" : "bg-os-cyan";
              return (
                <tr key={k} className={cn("bg-white/[0.02] transition-opacity", !on && "opacity-40")}>
                  <td className="rounded-s-md px-2 py-2">
                    <span className="flex items-center gap-2">
                      <span className={cn("size-1.5 rounded-full", on ? "bg-os-emerald shadow-[0_0_8px_#34f5b5]" : "bg-white/30")} />
                      <span className="text-white/85">{ENGINES[k].name}</span>
                      {!on && (
                        <span className="flex items-center gap-1 text-[9.5px] uppercase tracking-[0.14em] text-white/40">
                          <Lock className="size-3" /> {c.locked}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.06]">
                        <span className={cn("block h-full rounded-full transition-[width] duration-700", tone)} style={{ width: `${on ? l.load : 0}%` }} />
                      </span>
                      <span className="w-9 tabular-nums text-white/75">{on ? `${Math.round(l.load)}%` : "—"}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-end tabular-nums text-white/75">{on ? l.threads.toLocaleString("en-US") : "—"}</td>
                  <td className="px-2 py-2 text-end tabular-nums">
                    <span className="text-os-cyan">{ms === null ? "—" : `${ms.toLocaleString("en-US")}ms`}</span>
                    <span className="bloom-detail ms-1.5 text-[9px] uppercase tracking-[0.12em] text-white/35">{ledger[k].ms !== null ? c.measured : c.probe}</span>
                  </td>
                  <td className="px-2 py-2">
                    {head ? (
                      <span className="flex items-center gap-1.5" title={head.hash}>
                        <GitBranch className="size-3 text-os-emerald" />
                        <span className="text-white/70">{head.branch}</span>
                        <span className="text-white/35">@</span>
                        <span className="text-os-emerald">{head.hash.slice(0, 10)}</span>
                      </span>
                    ) : (
                      <span className="text-white/30">{c.noBranch}</span>
                    )}
                  </td>
                  <td className="bloom-detail rounded-e-md px-2 py-2 text-end tabular-nums text-white/60">{ledger[k].count}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-[10.5px] text-white/50">
              <td className="px-2 pt-2 uppercase tracking-[0.16em]">{c.total}</td>
              <td className="px-2 pt-2 tabular-nums">{Math.round(totals.load)}%</td>
              <td className="px-2 pt-2 text-end tabular-nums">{totals.threads.toLocaleString("en-US")}</td>
              <td className="px-2 pt-2 text-end tabular-nums">{latency === null ? "—" : `${latency}ms`}</td>
              <td />
              <td className="bloom-detail px-2 pt-2 text-end tabular-nums">{totals.runs}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Widget>
  );
}
