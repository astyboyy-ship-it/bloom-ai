"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOmniCopy } from "./omni-copy";
import { Badge, Panel, PanelHeader, SPRING } from "./ui";

/**
 * "Fragmented chaos vs. universal clearing", side by side on the main surface. An illustration (and labelled as one):
 * packets ride SVG <animateMotion> paths, which the browser animates natively without React re-rendering, so the deck
 * stays at 60fps on mobile. Reduced motion shows the static topology.
 */
const SOURCES = ["Email", "Slack", "WhatsApp", "Salesforce", "SAP", "Wallet", "AWS", "MCP"];
const sy = (i: number) => 38 + i * 35;
const EMERALD = "#34f5b5";
const ROSE = "#fb7185";
const AMBER = "#f5b544";

function Sources() {
  return (
    <>
      {SOURCES.map((s, i) => (
        <g key={s}>
          <rect x={18} y={sy(i) - 11} width={92} height={22} rx={5} fill="#111114" stroke="rgba(255,255,255,0.12)" />
          <text x={64} y={sy(i) + 3.5} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={10} className="font-mono">
            {s}
          </text>
        </g>
      ))}
    </>
  );
}

const AGENTS = [
  { x: 420, y: 70 },
  { x: 560, y: 120 },
  { x: 470, y: 215 },
  { x: 650, y: 60 },
  { x: 690, y: 240 },
];
// Each source wanders to an agent along a kinked path, and some never arrive.
const CHAOS = SOURCES.map((_, i) => {
  const a = AGENTS[(i * 3) % AGENTS.length];
  const midX = 230 + ((i * 47) % 120);
  const midY = sy((i + 3) % SOURCES.length);
  return { d: `M110 ${sy(i)} L${midX} ${midY} L${(midX + a.x) / 2} ${(midY + a.y) / 2 + (i % 2 ? 30 : -30)} L${a.x} ${a.y}`, crash: i % 3 === 1, end: a, tone: i % 4 === 0 ? AMBER : ROSE };
});
const FAILS = [
  { x: 330, y: 52, label: "format ≠ schema" },
  { x: 600, y: 178, label: "prompt injection" },
  { x: 735, y: 120, label: "margin leaked" },
  { x: 380, y: 285, label: "no receipt" },
];

function ChaosScene() {
  return (
    <svg viewBox="0 0 800 320" className="block h-auto w-full" role="img" aria-label="Siloed chaos">
      <Sources />
      {CHAOS.map((c, i) => (
        <path key={i} d={c.d} fill="none" stroke={c.tone} strokeOpacity={0.22} strokeDasharray="3 5" />
      ))}
      {AGENTS.map((a, i) => (
        <g key={i}>
          <circle cx={a.x} cy={a.y} r={13} fill="#111114" stroke="rgba(255,255,255,0.18)" />
          <text x={a.x} y={a.y + 3.5} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.6)" className="font-mono">
            A{i + 1}
          </text>
        </g>
      ))}
      {CHAOS.map((c, i) => (
        <circle key={`p${i}`} r={3.2} fill={c.tone}>
          <animateMotion dur={`${2.2 + (i % 3) * 0.45}s`} begin={`${i * 0.27}s`} repeatCount="indefinite" path={c.d} keyPoints={c.crash ? "0;0.62;0.62" : "0;1;1"} keyTimes="0;0.8;1" calcMode="linear" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.75;1" dur={`${2.2 + (i % 3) * 0.45}s`} begin={`${i * 0.27}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {FAILS.map((f, i) => (
        <g key={f.label}>
          <text x={f.x} y={f.y} textAnchor="middle" fontSize={15} fill={ROSE}>
            ×
            <animate attributeName="opacity" values="0;1;0.2;1;0" dur="2.4s" begin={`${0.6 + i * 0.55}s`} repeatCount="indefinite" />
          </text>
          <text x={f.x} y={f.y + 14} textAnchor="middle" fontSize={8.5} fill="rgba(251,113,133,0.75)" className="font-mono">
            {f.label}
            <animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin={`${0.6 + i * 0.55}s`} repeatCount="indefinite" />
          </text>
        </g>
      ))}
    </svg>
  );
}

const STAGES = [
  { key: "bridge", x: 268 },
  { key: "shield", x: 395 },
  { key: "vault", x: 515 },
  { key: "sovereign", x: 635 },
] as const;
const lane = (i: number) => `M110 ${sy(i)} C190 ${sy(i)} 205 160 268 160 L752 160`;
const blocked = (i: number) => `M110 ${sy(i)} C190 ${sy(i)} 205 160 268 160 L395 160`;

function BloomScene({ labels }: { labels: Record<(typeof STAGES)[number]["key"] | "receipt", string> }) {
  return (
    <svg viewBox="0 0 800 320" className="block h-auto w-full" role="img" aria-label="Bloom Exchange">
      <Sources />
      {SOURCES.map((_, i) => (
        <path key={i} d={`M110 ${sy(i)} C190 ${sy(i)} 205 160 268 160`} fill="none" stroke={EMERALD} strokeOpacity={0.18} />
      ))}
      <line x1={268} y1={160} x2={752} y2={160} stroke={EMERALD} strokeOpacity={0.25} />
      {STAGES.map((s) => (
        <g key={s.key}>
          <rect x={s.x - 40} y={140} width={80} height={40} rx={7} fill="#0c0c0f" stroke={s.key === "shield" ? "rgba(251,113,133,0.45)" : "rgba(52,245,181,0.4)"} />
          <text x={s.x} y={164} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.85)" className="font-mono">
            {labels[s.key]}
          </text>
        </g>
      ))}
      <g>
        <rect x={712} y={137} width={80} height={46} rx={7} fill="rgba(52,245,181,0.08)" stroke={EMERALD} />
        <text x={752} y={157} textAnchor="middle" fontSize={9.5} fill={EMERALD} className="font-mono">
          {labels.receipt}
        </text>
        <text x={752} y={171} textAnchor="middle" fontSize={8} fill="rgba(52,245,181,0.7)" className="font-mono">
          Ed25519 ✓
        </text>
      </g>
      <circle cx={395} cy={160} r={22} fill="none" stroke={ROSE} strokeOpacity={0}>
        <animate attributeName="r" values="20;34" dur="1.6s" begin="0.9s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.7;0" dur="1.6s" begin="0.9s" repeatCount="indefinite" />
      </circle>
      {SOURCES.map((_, i) => {
        const hostile = i === 2 || i === 5;
        const dur = hostile ? 1.5 : 2.6;
        return (
          <circle key={`p${i}`} r={3.2} fill={hostile ? ROSE : EMERALD}>
            <animateMotion dur={`${dur}s`} begin={`${i * 0.32}s`} repeatCount="indefinite" path={hostile ? blocked(i) : lane(i)} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.9;1" dur={`${dur}s`} begin={`${i * 0.32}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
    </svg>
  );
}

export function DemoDeck({ className }: { className?: string }) {
  const t = useOmniCopy().deck;
  const [mode, setMode] = useState<"chaos" | "bloom">("bloom");
  // Reduced motion: freeze the scene mid-flow (SMIL keeps running unless the SVG itself is paused).
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => stage.current?.querySelectorAll("svg").forEach((s) => (s.setCurrentTime(1.4), s.pauseAnimations())), 40);
    return () => clearTimeout(id);
  }, [mode]);
  const pane = (m: "chaos" | "bloom") => {
    const notes = m === "chaos" ? t.chaosNotes : t.bloomNotes;
    const tone = m === "chaos" ? "rose" : "emerald";
    return (
      <div key={m} className={cn("min-w-0", mode !== m && "hidden lg:block")}>
        <p className={cn("mb-2 hidden font-mono text-[10px] uppercase tracking-[0.18em] lg:block", m === "chaos" ? "text-[var(--xch-rose)]" : "text-[var(--xch-emerald)]")}>{m === "chaos" ? t.chaos : t.bloom}</p>
        <div className={cn("overflow-hidden rounded-[10px] border bg-black/30", m === "chaos" ? "border-[color-mix(in_srgb,var(--xch-rose)_18%,transparent)]" : "border-[color-mix(in_srgb,var(--xch-emerald)_22%,transparent)]")} dir="ltr">
          {m === "chaos" ? <ChaosScene /> : <BloomScene labels={t.labels} />}
        </div>
        <ol className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {notes.map((n, i) => (
            <li key={n} className={cn("xch-row-in flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11.5px] leading-snug", tone === "rose" ? "border-[color-mix(in_srgb,var(--xch-rose)_20%,transparent)] text-white/65" : "border-[color-mix(in_srgb,var(--xch-emerald)_20%,transparent)] text-white/75")} style={{ animationDelay: `${i * 60}ms` }}>
              <span className={cn("tnum font-mono text-[10px]", tone === "rose" ? "text-[var(--xch-rose)]" : "text-[var(--xch-emerald)]")}>{String(i + 1).padStart(2, "0")}</span>
              {n}
            </li>
          ))}
        </ol>
      </div>
    );
  };

  return (
    <Panel className={className}>
      <PanelHeader
        icon={GitCompareArrows}
        title={t.title}
        sub={t.sub}
        right={
          <div className="flex items-center gap-2">
            <Badge>{t.illustrative}</Badge>
            {/* Side by side from lg up; below that the two architectures share one stage behind a toggle. */}
            <div role="tablist" className="relative inline-flex rounded-lg border border-[var(--xch-line)] bg-black/30 p-0.5 lg:hidden">
              {(["chaos", "bloom"] as const).map((m) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn("relative rounded-md px-3 py-1 text-[12px] transition-colors duration-150", mode === m ? (m === "chaos" ? "text-[var(--xch-rose)]" : "text-[var(--xch-emerald)]") : "text-white/45 hover:text-white/80")}>
                  {mode === m && <motion.span layoutId="xch-deck" className="absolute inset-0 rounded-md bg-white/[0.07]" transition={SPRING} />}
                  <span className="relative">{m === "chaos" ? t.chaos : t.bloom}</span>
                </button>
              ))}
            </div>
          </div>
        }
      />
      <div ref={stage} className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {pane("chaos")}
        {pane("bloom")}
      </div>
    </Panel>
  );
}