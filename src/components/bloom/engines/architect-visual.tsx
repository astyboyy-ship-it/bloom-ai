"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useCardActive } from "./active-context";

const nodes = [
  { id: "trigger", x: 50, y: 120, label: "New order", kind: "trigger" },
  { id: "agent", x: 160, y: 120, label: "Ops agent", kind: "agent" },
  { id: "billing", x: 275, y: 55, label: "Invoice", kind: "step" },
  { id: "crm", x: 275, y: 120, label: "CRM sync", kind: "step" },
  { id: "fulfil", x: 275, y: 185, label: "Fulfilment", kind: "step" },
  { id: "report", x: 365, y: 120, label: "Report", kind: "step" },
] as const;

const edges: [string, string][] = [
  ["trigger", "agent"],
  ["agent", "billing"],
  ["agent", "crm"],
  ["agent", "fulfil"],
  ["billing", "report"],
  ["crm", "report"],
  ["fulfil", "report"],
];

const at = (id: string) => nodes.find((n) => n.id === id)!;

/** Points along the same S-curve the edge is drawn with, so packets follow the line. */
function samples(p: { x: number; y: number }, q: { x: number; y: number }, n = 8) {
  const mx = (p.x + q.x) / 2;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    const u = 1 - t;
    xs.push(u * u * u * p.x + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * q.x);
    ys.push(u * u * u * p.y + 3 * u * u * t * p.y + 3 * u * t * t * q.y + t * t * t * q.y);
  }
  return { xs, ys };
}

const runs = [
  "order #4821: invoiced, synced, shipped",
  "refund #1193: approved within policy",
  "lead #772: enriched, routed to sales",
  "order #4822: invoiced, synced, shipped",
  "weekly report: sent to leadership",
];

export function ArchitectVisual() {
  const active = useCardActive();
  const [log, setLog] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLog((l) => l + 1), active ? 900 : 1800);
    return () => clearInterval(id);
  }, [active]);

  const speed = active ? 0.5 : 1;

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35 sm:px-6">
        <span>Workflow · order-to-cash</span>
        <span className="tabular-nums text-ember/90">avg exec · 70ms</span>
      </div>

      <svg viewBox="0 0 415 240" className="h-[62%] w-full" preserveAspectRatio="xMidYMid meet">
        {edges.map(([a, b]) => {
          const p = at(a);
          const q = at(b);
          const mx = (p.x + q.x) / 2;
          return (
            <path
              key={`${a}-${b}`}
              d={`M${p.x} ${p.y} C${mx} ${p.y} ${mx} ${q.y} ${q.x} ${q.y}`}
              fill="none"
              stroke="rgb(255 255 255 / 0.1)"
              strokeWidth={1.2}
            />
          );
        })}

        {/* Data packets flowing through the graph */}
        {edges.map(([a, b], i) => {
          const { xs, ys } = samples(at(a), at(b));
          return (
            <motion.circle
              key={`pkt-${a}-${b}`}
              r={2.6}
              fill={i % 2 ? "#ffbd6e" : "#ff7b4a"}
              style={{ filter: "drop-shadow(0 0 4px #ff7b4a)" }}
              initial={{ cx: xs[0], cy: ys[0], opacity: 0 }}
              animate={{ cx: xs, cy: ys, opacity: [0, 1, 1, 1, 1, 1, 1, 0] }}
              transition={{ duration: 1.4 * speed, repeat: Infinity, delay: (i < 1 ? 0 : i < 4 ? 0.6 : 1.2) * speed, ease: "linear" }}
            />
          );
        })}

        {nodes.map((n) => (
          <g key={n.id}>
            {n.kind === "agent" && (
              <motion.circle
                cx={n.x}
                cy={n.y}
                fill="none"
                stroke="#ff7b4a"
                animate={{ r: [16, 26], opacity: [0.6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            )}
            <rect
              x={n.x - (n.kind === "agent" ? 18 : 15)}
              y={n.y - (n.kind === "agent" ? 18 : 15)}
              width={n.kind === "agent" ? 36 : 30}
              height={n.kind === "agent" ? 36 : 30}
              rx={9}
              fill={n.kind === "agent" ? "rgb(255 123 74 / 0.18)" : "#120a1c"}
              stroke={n.kind === "trigger" ? "#ffbd6e" : n.kind === "agent" ? "#ff7b4a" : "rgb(255 255 255 / 0.2)"}
            />
            <text x={n.x} y={n.y + 31} textAnchor="middle" className="fill-white/45 font-mono text-[8px] uppercase">
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mx-5 mb-5 flex-1 overflow-hidden rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2 font-mono text-[9.5px] sm:mx-6">
        <AnimatePresence initial={false} mode="popLayout">
          {[0, 1, 2].map((o) => {
            const i = log - o;
            if (i < 0) return null;
            return (
              <motion.p
                key={i}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1 - o * 0.3, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 truncate leading-relaxed text-white/70"
              >
                <Check className="size-3 shrink-0 text-ember" /> {runs[i % runs.length]}
                <span className="ml-1 text-white/30">{40 + ((i * 17) % 50)}ms</span>
              </motion.p>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
