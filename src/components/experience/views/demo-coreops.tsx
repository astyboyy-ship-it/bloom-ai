"use client";

import { useEffect, useState } from "react";
import { Workflow } from "lucide-react";
import { createDemoGenerator, type DemoFrame } from "@/lib/demo/demoGenerator";
import { useLicensingCopy } from "@/components/control-plane/copy";
import { Widget } from "@/components/control-plane/widget";
import { useExperienceCopy } from "../copy";

type Node = { id: string; x: number; y: number };
const NODES: Node[] = [
  { id: "trigger", x: 70, y: 130 },
  { id: "classify", x: 230, y: 130 },
  { id: "route", x: 390, y: 130 },
  { id: "invoices", x: 560, y: 50 },
  { id: "reconcile", x: 560, y: 130 },
  { id: "notify", x: 560, y: 210 },
  { id: "audit", x: 730, y: 130 },
];
const EDGES: [string, string][] = [
  ["trigger", "classify"],
  ["classify", "route"],
  ["route", "invoices"],
  ["route", "reconcile"],
  ["route", "notify"],
  ["invoices", "audit"],
  ["reconcile", "audit"],
  ["notify", "audit"],
];
const at = (id: string) => NODES.find((n) => n.id === id)!;
const path = (a: string, b: string) => {
  const p = at(a);
  const q = at(b);
  const mx = (p.x + q.x) / 2;
  return `M${p.x + 52},${p.y} C${mx},${p.y} ${mx},${q.y} ${q.x - 52},${q.y}`;
};

/**
 * Enterprise Automation Canvas for the CoreOps demo key: a workflow graph (inbound events → classify → route →
 * three automated queues → audit seal) with work tokens flowing along each edge at a speed set by the live
 * throughput, and per-node rates and queue depths from the CoreOps telemetry stream. Synthetic data only.
 */
export function AutomationCanvas() {
  const c = useExperienceCopy().coreops;
  const q = useLicensingCopy().demo.words.queue;
  const [frame, setFrame] = useState<DemoFrame | null>(null);

  useEffect(() => {
    const g = createDemoGenerator("coreops");
    for (let i = 0; i < 10; i++) g.next();
    setFrame(g.next());
    const id = setInterval(() => setFrame(g.next()), 1200);
    return () => clearInterval(id);
  }, []);

  const throughput = frame?.metrics.find((m) => m.key === "throughput")?.value ?? 1000;
  const depth = (name: string) => frame?.queues?.find((x) => x.name === name)?.depth ?? 0;
  const rate: Record<string, number> = {
    trigger: throughput * 1.04,
    classify: throughput * 1.01,
    route: throughput,
    invoices: throughput * 0.38,
    reconcile: throughput * 0.34,
    notify: throughput * 0.28,
    audit: throughput * 0.995,
  };
  const label: Record<string, string> = { trigger: c.trigger, classify: c.classify, route: c.route, invoices: q.invoices ?? "invoices", reconcile: q.reconcile ?? "reconcile", notify: q.notify ?? "notify", audit: c.audit };
  // Faster flow, shorter trip: 1.2s at 2,000/min, 4s at 300/min.
  const dur = Math.max(1.2, Math.min(4, 2400 / Math.max(1, throughput)));

  return (
    <Widget icon={Workflow} title={c.title} sub={c.sub}>
      <svg viewBox="0 0 800 260" className="h-auto w-full" role="img" aria-label={c.title}>
        {EDGES.map(([a, b], i) => {
          const d = path(a, b);
          return (
            <g key={`${a}-${b}`}>
              <path d={d} fill="none" stroke="color-mix(in srgb, var(--tier-accent) 30%, transparent)" strokeWidth={1.5} />
              {[0, 1, 2].map((k) => (
                <circle key={k} r={3} fill="var(--tier-accent)" style={{ filter: "drop-shadow(0 0 4px var(--tier-glow))" }}>
                  <animateMotion dur={`${(dur * (b === "audit" ? 1.1 : 1)).toFixed(2)}s`} begin={`${((k * dur) / 3 + i * 0.13).toFixed(2)}s`} repeatCount="indefinite" path={d} />
                </circle>
              ))}
            </g>
          );
        })}
        {NODES.map((n) => {
          const isQueue = n.id === "invoices" || n.id === "reconcile" || n.id === "notify";
          return (
            <g key={n.id}>
              <rect x={n.x - 52} y={n.y - 24} width={104} height={48} rx={10} fill="rgba(7, 8, 12, 0.9)" stroke="color-mix(in srgb, var(--tier-accent) 45%, transparent)" />
              <text x={n.x} y={n.y - 5} textAnchor="middle" fill="rgb(255 255 255 / 0.85)" fontSize={11.5}>
                {label[n.id]}
              </text>
              <text x={n.x} y={n.y + 12} textAnchor="middle" fill="var(--tier-accent)" fontSize={10.5} fontFamily="var(--font-mono)">
                {Math.round(rate[n.id]).toLocaleString("en-US")}
                {c.perMin}
                {isQueue ? ` · ${depth(n.id)}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </Widget>
  );
}
