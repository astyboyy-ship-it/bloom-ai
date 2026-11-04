"use client";

import { useMemo, useState } from "react";
import { localizeEngine, useCommandCopy } from "@/components/bloom/command/locale";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES } from "@/components/bloom/command/theme";
import type { EngineRunStatus } from "@/components/desk/engine-status";

type Node = { id: string; x: number; y: number; label: string; sub: string; kind: "input" | "engine" | "gate" | "output"; engine?: EngineKey };

const W = 1120;
const H = 340;


const COPY = {
  en: { input: "Input stream", gate: "Compliance gate", delivery: "Delivery", topology: "Architecture topology" },
  es: { input: "Flujo de entrada", gate: "Control de cumplimiento", delivery: "Entrega", topology: "Topología de la arquitectura" },
  he: { input: "זרם קלט", gate: "שער ציות", delivery: "מסירה", topology: "טופולוגיית הארכיטקטורה" },
} satisfies Record<"en" | "es" | "he", unknown>;

/**
 * An architecture's node topology: input streams → each engine (with its reflection loop) → the compliance
 * gate (human-in-the-loop) → output delivery. Data flows left to right; during a run, engines light as they
 * work and the gate lights while the brief is composed.
 */
export function TopologyCanvas({
  inputs,
  engines,
  outputs,
  statuses,
  composing,
  threshold,
  onPick,
}: {
  inputs: string[];
  engines: EngineKey[];
  outputs: string[];
  statuses: Partial<Record<EngineKey, EngineRunStatus>>;
  composing: boolean;
  threshold: string;
  onPick?: (n: { kind: Node["kind"]; label: string; engine?: EngineKey }) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const nodes = useMemo(() => {
    const col = (n: number, i: number, x: number, top = 40, bottom = H - 40) => ({ x, y: n === 1 ? H / 2 : top + (i * (bottom - top)) / (n - 1) });
    const out: Node[] = [];
    inputs.forEach((label, i) => out.push({ id: `in${i}`, kind: "input", label, sub: t.input, ...col(inputs.length, i, 70) }));
    // Engines snake through the middle band so long stacks stay readable.
    // Engines get the band between the inputs and the gate; the gate and outputs keep columns of their own.
    const left = 250;
    const span = W - 400 - left;
    engines.forEach((k, i) => {
      const x = left + (engines.length === 1 ? span / 2 : (i * span) / (engines.length - 1));
      const y = engines.length > 4 ? (i % 2 ? H / 2 + 60 : H / 2 - 60) : H / 2;
      out.push({ id: `e${i}`, kind: "engine", engine: k, label: ENGINES[k].name, sub: localizeEngine(ENGINES[k], lang).role, x, y });
    });
    out.push({ id: "gate", kind: "gate", label: t.gate, sub: `HITL · ${threshold}`, x: W - 250, y: H / 2 });
    outputs.forEach((label, i) => out.push({ id: `out${i}`, kind: "output", label, sub: t.delivery, ...col(outputs.length, i, W - 80) }));
    return out;
  }, [inputs, engines, outputs, threshold, t, lang]);

  const by = (id: string) => nodes.find((n) => n.id === id)!;
  const edges: [string, string][] = [
    ...inputs.map((_, i) => [`in${i}`, "e0"] as [string, string]),
    ...engines.slice(1).map((_, i) => [`e${i}`, `e${i + 1}`] as [string, string]),
    [`e${engines.length - 1}`, "gate"],
    ...outputs.map((_, i) => ["gate", `out${i}`] as [string, string]),
  ];
  const lit = (n: Node) => (n.kind === "engine" ? statuses[n.engine!] === "running" : n.kind === "gate" ? composing : false);
  const done = (n: Node) => n.kind === "engine" && statuses[n.engine!] === "done";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ direction: "ltr" }} role="group" aria-label={t.topology}>
      <defs>
        <linearGradient id="topo-edge" x1="0" x2="1">
          <stop offset="0" stopColor="#00f0ff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#34f5b5" stopOpacity="0.45" />
        </linearGradient>
        <filter id="topo-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {edges.map(([a, b]) => {
        const p = by(a);
        const q = by(b);
        const mx = (p.x + q.x) / 2;
        return (
          <g key={`${a}-${b}`}>
            <path d={`M${p.x} ${p.y} C${mx} ${p.y} ${mx} ${q.y} ${q.x} ${q.y}`} fill="none" stroke="url(#topo-edge)" strokeWidth={1.4} />
            <path d={`M${p.x} ${p.y} C${mx} ${p.y} ${mx} ${q.y} ${q.x} ${q.y}`} fill="none" stroke="#00f0ff" strokeOpacity={0.55} strokeWidth={1.4} strokeDasharray="4 10" className="animate-[net-flow_1.2s_linear_infinite]" />
          </g>
        );
      })}
      {nodes.map((n) => {
        const color = n.engine ? PALETTES[n.engine].c1 : n.kind === "gate" ? "#f0d59a" : n.kind === "input" ? "#00f0ff" : "#34f5b5";
        const r = n.kind === "engine" ? 22 : n.kind === "gate" ? 18 : 9;
        return (
          <g
            key={n.id}
            role="button"
            tabIndex={0}
            aria-label={`${n.label}: ${n.sub}`}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPick?.({ kind: n.kind, label: n.label, engine: n.engine })}
            onKeyDown={(e) => {
              if (e.key === "Enter") onPick?.({ kind: n.kind, label: n.label, engine: n.engine });
            }}
            className="cursor-pointer outline-none"
          >
            {lit(n) && <circle cx={n.x} cy={n.y} r={r + 10} fill={color} opacity={0.5} filter="url(#topo-glow)" className="animate-pulse" />}
            {n.kind === "engine" && (
              // The agent's reflection loop: it checks its own work before handing on.
              <path d={`M${n.x - 12} ${n.y - r} C${n.x - 26} ${n.y - r - 34} ${n.x + 26} ${n.y - r - 34} ${n.x + 12} ${n.y - r}`} fill="none" stroke={color} strokeOpacity={0.6} strokeDasharray="3 4" className="animate-[net-flow_1.6s_linear_infinite]" />
            )}
            {n.kind === "gate" ? (
              <rect x={n.x - r} y={n.y - r} width={r * 2} height={r * 2} rx={4} transform={`rotate(45 ${n.x} ${n.y})`} fill="#0c0e14" stroke={color} strokeWidth={lit(n) ? 2.4 : 1.4} />
            ) : (
              <circle cx={n.x} cy={n.y} r={r} fill="#0c0e14" stroke={color} strokeWidth={lit(n) || hover === n.id ? 2.4 : 1.4} />
            )}
            {n.engine && (
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontFamily="var(--font-geist-mono)" fill={color}>
                {ENGINES[n.engine].index}
              </text>
            )}
            {done(n) && <circle cx={n.x + r * 0.75} cy={n.y - r * 0.75} r={4} fill="#34f5b5" />}
            <text x={n.x} y={n.y + r + 15} textAnchor="middle" fontSize={11.5} fill="rgb(255 255 255 / 0.85)">
              {n.label}
            </text>
            <text x={n.x} y={n.y + r + 28} textAnchor="middle" fontSize={9} fontFamily="var(--font-geist-mono)" fill="rgb(255 255 255 / 0.4)">
              {n.sub.length > 28 ? `${n.sub.slice(0, 28)}…` : n.sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
