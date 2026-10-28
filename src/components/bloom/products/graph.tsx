"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The spatial agent graph each product is built around: nodes joined by glowing tendrils. A tendril's
 * `flow` (0–1) sets how bright it burns and how fast execution trails run along it, so the graph shows
 * real load. A `burst` sends a bead of light through a chain of nodes when something happens.
 * Coordinates are in a 1000×460 space that scales with the container.
 */

export type GraphNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Live telemetry printed under the label. */
  metric?: string;
  sub?: string;
  state?: "idle" | "active" | "done" | "warn";
  r?: number;
};

export type GraphEdge = { from: string; to: string; flow: number; curve?: number };

export type Burst = { key: number; path: string[] };

const W = 1000;
const H = 460;

const edgeId = (uid: string, a: string, b: string) => `${uid}-${a}--${b}`;

function edgePath(a: GraphNode, b: GraphNode, curve = 0.18) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Bow the tendril sideways, proportional to its length.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const cx = mx - dy * curve;
  const cy = my + dx * curve;
  return `M${a.x} ${a.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
}

/** A bead of light travelling node to node along the drawn tendrils, sampled from the real SVG paths. */
function BurstBead({ uid, path }: { uid: string; path: string[] }) {
  const ref = useRef<SVGCircleElement>(null);
  const trail = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const segs = path
      .slice(1)
      .map((to, i) => document.getElementById(edgeId(uid, path[i], to)) as SVGPathElement | null)
      .filter((p): p is SVGPathElement => !!p);
    if (!segs.length) return;
    const per = 420;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = (now - start) / per;
      const i = Math.floor(t);
      const el = ref.current;
      if (!el || i >= segs.length) {
        if (el) el.style.opacity = "0";
        if (trail.current) trail.current.style.opacity = "0";
        return;
      }
      const seg = segs[i];
      const len = seg.getTotalLength();
      const p = seg.getPointAtLength(len * (t - i));
      const q = seg.getPointAtLength(Math.max(0, len * (t - i) - 18));
      el.setAttribute("cx", String(p.x));
      el.setAttribute("cy", String(p.y));
      trail.current?.setAttribute("cx", String(q.x));
      trail.current?.setAttribute("cy", String(q.y));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [uid, path]);
  return (
    <g style={{ filter: "drop-shadow(0 0 8px rgb(var(--p-glow))) drop-shadow(0 0 16px rgb(var(--p-glow)))" }}>
      <circle ref={trail} r={4} fill="rgb(var(--p-glow))" opacity={0.5} />
      <circle ref={ref} r={5.5} fill="#fff" />
    </g>
  );
}

export function SpatialGraph({ nodes, edges, burst, selected, onNode, height = 480, className, children }: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  burst?: Burst | null;
  selected?: string | null;
  onNode?: (id: string) => void;
  height?: number;
  className?: string;
  /** HUD overlays positioned over the graph. */
  children?: React.ReactNode;
}) {
  const uid = useId().replace(/:/g, "");
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <div className={cn("relative w-full overflow-hidden", className)} style={{ height }}>
      {/* Spatial grid fading out from the centre of the field */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)]"
        style={{ backgroundImage: "radial-gradient(circle, rgb(var(--p-edge) / 0.14) 1px, transparent 1.4px)", backgroundSize: "26px 26px" }}
      />
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full" role="img" aria-label="Agent graph">
        <defs>
          <radialGradient id={`${uid}-node`}>
            <stop offset="0" stopColor="rgb(var(--p-glow))" stopOpacity="0.55" />
            <stop offset="1" stopColor="rgb(var(--p-glow))" stopOpacity="0" />
          </radialGradient>
          <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {edges.map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const d = edgePath(a, b, e.curve);
          const f = Math.max(0, Math.min(1, e.flow));
          return (
            <g key={`${e.from}-${e.to}`}>
              <path id={edgeId(uid, e.from, e.to)} d={d} fill="none" stroke="rgb(var(--p-glow))" strokeOpacity={0.1 + f * 0.35} strokeWidth={1 + f * 3.5} filter={`url(#${uid}-glow)`} />
              {f > 0.01 && (
                <path
                  d={d}
                  fill="none"
                  stroke="var(--p-accent-hi)"
                  strokeWidth={1.2 + f * 1.6}
                  strokeLinecap="round"
                  strokeDasharray="10 110"
                  className="animate-laser"
                  style={{ "--laser-speed": `${(2.8 - f * 2.2).toFixed(2)}s`, opacity: 0.35 + f * 0.65 } as React.CSSProperties}
                />
              )}
            </g>
          );
        })}

        {burst && burst.path.length > 1 && <BurstBead key={burst.key} uid={uid} path={burst.path} />}

        {nodes.map((n) => {
          const r = n.r ?? 22;
          const hot = n.state === "active" || n.id === selected;
          const warn = n.state === "warn";
          return (
            <g
              key={n.id}
              transform={`translate(${n.x} ${n.y})`}
              onClick={onNode ? () => onNode(n.id) : undefined}
              onKeyDown={onNode ? (ev) => (ev.key === "Enter" || ev.key === " ") && onNode(n.id) : undefined}
              role={onNode ? "button" : undefined}
              tabIndex={onNode ? 0 : undefined}
              aria-label={onNode ? `${n.label}${n.metric ? `, ${n.metric}` : ""}` : undefined}
              className={cn(onNode && "cursor-pointer outline-none")}
            >
              <circle r={r * 2.4} fill={`url(#${uid}-node)`} opacity={hot ? 1 : n.state === "done" ? 0.7 : 0.4} />
              {hot && <circle r={r} fill="none" stroke="rgb(var(--p-glow))" strokeWidth={1.5} className="animate-node-ping" />}
              <circle
                r={r}
                fill="rgb(var(--p-glass) / 0.85)"
                stroke={warn ? "#ff8a70" : n.id === selected ? "#fff" : "var(--p-accent)"}
                strokeWidth={n.id === selected ? 2.5 : 1.5}
                style={{ filter: `drop-shadow(0 0 ${hot ? 14 : 6}px rgb(var(--p-glow) / ${hot ? 0.9 : 0.5}))` }}
              />
              <circle r={r * 0.32} fill={n.state === "done" ? "var(--p-accent)" : warn ? "#ff8a70" : "var(--p-accent-hi)"} opacity={n.state === "idle" ? 0.45 : 1} />
              <text y={r + 20} textAnchor="middle" className="fill-[rgb(var(--p-text))] text-[13px] font-medium" style={{ paintOrder: "stroke", stroke: "rgb(0 0 0 / 0.55)", strokeWidth: 3 }}>
                {n.label}
              </text>
              {n.metric && (
                <text y={r + 38} textAnchor="middle" className="prod-hud text-[12.5px]" fill="var(--p-accent-hi)" style={{ paintOrder: "stroke", stroke: "rgb(0 0 0 / 0.5)", strokeWidth: 3 }}>
                  {n.metric}
                </text>
              )}
              {n.sub && (
                <text y={r + 54} textAnchor="middle" className="text-[10.5px]" fill="rgb(var(--p-text) / 0.5)">
                  {n.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {children}
    </div>
  );
}

/** A corner readout of live figures over the graph. */
export function Hud({ items, className }: { items: { label: string; value: string }[]; className?: string }) {
  return (
    <dl className={cn("pointer-events-none absolute space-y-1.5", className)}>
      {items.map((i) => (
        <div key={i.label}>
          <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-p-text/45">{i.label}</dt>
          <dd className="prod-hud text-[20px] leading-tight">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
