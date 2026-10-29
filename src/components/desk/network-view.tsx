"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES } from "@/components/bloom/command/theme";
import type { ManifestEngine } from "@/lib/engines/events";
import type { EngineRunStatus } from "./engine-status";
import type { AgentState } from "./use-run";

/** Sovereign at the center, the other seven on a ring, in engine order clockwise from the top. */
const W = 420;
const H = 230;
const CX = W / 2;
const CY = H / 2 + 4;
const POS: Record<EngineKey, { x: number; y: number }> = (() => {
  const ring = ENGINE_ORDER.filter((k) => k !== "sovereign");
  const out = { sovereign: { x: CX, y: CY } } as Record<EngineKey, { x: number; y: number }>;
  ring.forEach((k, i) => {
    const a = -Math.PI / 2 + (i / ring.length) * Math.PI * 2;
    out[k] = { x: CX + Math.cos(a) * 170, y: CY + Math.sin(a) * 86 };
  });
  return out;
})();

type Props = {
  label: string;
  hint: string;
  engines: ManifestEngine[] | undefined;
  agents: Record<string, AgentState>;
  statuses: Partial<Record<EngineKey, EngineRunStatus>>;
  selected: EngineKey;
  onSelect: (k: EngineKey) => void;
};

/** The 8-engine topological network: permitted hand-offs as faint links, this run's hand-offs lit and flowing. */
export function NetworkView({ label, hint, engines, agents, statuses, selected, onSelect }: Props) {
  // Each permitted link once, whichever side declares it.
  const links = useMemo(() => {
    const seen = new Set<string>();
    const out: [EngineKey, EngineKey][] = [];
    for (const e of engines ?? [])
      for (const d of e.delegates) {
        const id = [e.key, d].sort().join("-");
        if (seen.has(id)) continue;
        seen.add(id);
        out.push([e.key, d]);
      }
    return out;
  }, [engines]);

  const active = useMemo(() => {
    const out: { from: EngineKey; to: EngineKey; running: boolean }[] = [];
    for (const a of Object.values(agents)) {
      const parent = a.parentId ? agents[a.parentId] : undefined;
      if (parent) out.push({ from: parent.engine, to: a.engine, running: a.status === "running" });
    }
    return out;
  }, [agents]);

  return (
    <figure className="rounded-2xl border border-white/[0.08] bg-black/35 p-3 backdrop-blur-md">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">{label}</span>
        <span className="text-[11px] text-white/35">{hint}</span>
      </figcaption>
      <svg style={{ direction: "ltr" }} viewBox={`0 0 ${W} ${H}`} className="mt-1 h-[clamp(9rem,24vh,14rem)] w-full" role="group" aria-label={label}>
        <defs>
          <filter id="net-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        {links.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={POS[a].x} y1={POS[a].y} x2={POS[b].x} y2={POS[b].y} stroke="rgb(255 255 255 / 0.07)" strokeWidth={1} />
        ))}
        {active.map((l, i) => (
          <line
            key={i}
            x1={POS[l.from].x}
            y1={POS[l.from].y}
            x2={POS[l.to].x}
            y2={POS[l.to].y}
            stroke={PALETTES[l.to].c1}
            strokeWidth={1.8}
            strokeDasharray={l.running ? "5 5" : undefined}
            className={cn(l.running && "animate-[net-flow_0.8s_linear_infinite]")}
            opacity={l.running ? 1 : 0.55}
          />
        ))}
        {ENGINE_ORDER.map((k) => {
          const p = POS[k];
          const s = statuses[k];
          const on = k === selected;
          const r = k === "sovereign" ? 19 : 15;
          return (
            <g
              key={k}
              role="button"
              tabIndex={0}
              aria-label={`${ENGINES[k].index} ${ENGINES[k].name}`}
              aria-pressed={on}
              onClick={() => onSelect(k)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                onSelect(k);
              }}
              className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-white"
            >
              {s === "running" && <circle cx={p.x} cy={p.y} r={r + 6} fill={PALETTES[k].c1} opacity={0.45} filter="url(#net-glow)" className="animate-pulse" />}
              <circle cx={p.x} cy={p.y} r={r} fill={PALETTES[k].deep} stroke={on ? PALETTES[k].c2 : PALETTES[k].c1} strokeWidth={on ? 2.2 : 1.2} opacity={s || on ? 1 : 0.8} />
              <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={10} fontFamily="var(--font-geist-mono)" fill={PALETTES[k].c2}>
                {ENGINES[k].index}
              </text>
              <text x={p.x} y={p.y + r + 12} textAnchor="middle" fontSize={10} fill={on ? "#fff" : "rgb(255 255 255 / 0.6)"}>
                {ENGINES[k].name}
              </text>
              {s === "done" && <circle cx={p.x + r * 0.72} cy={p.y - r * 0.72} r={3} fill="#34d399" />}
              {s === "failed" && <circle cx={p.x + r * 0.72} cy={p.y - r * 0.72} r={3} fill="#ef4444" />}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
