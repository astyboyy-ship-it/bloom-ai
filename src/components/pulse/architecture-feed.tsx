"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, GitFork, ShieldCheck, Timer, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { audit, updateSettings, type Pipeline, type PipelineNode } from "@/components/desk/settings";
import { obsidianToast } from "@/components/control-plane/obsidian-toast";
import { useOnboardingCopy } from "@/components/onboarding/copy";
import { BRAND_MARKS, type BrandMark } from "./brand-marks";

/**
 * Global Pulse architecture feed: a vertical, snap-scrolling feed of enterprise agent architectures, one card per
 * company, each with a live agent graph, metrics, and a Fork / Clone button that imports the anonymized blueprint
 * (its engine chain) into this workspace as a pipeline.
 *
 * PRIVATE SHOWCASE: real company names, logos, the Verified badge and the ZK shield are shown only when
 * NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE=true (set locally in .env.local). These cards do not describe real
 * customers or real results, so every other build (including the public Vercel site) shows fictional companies
 * tagged "Example architecture" instead.
 */
const SHOWCASE = process.env.NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE === "true";

type Brand = { name: string; monogram?: string; mark?: BrandMark; color: string };
type CardId = "auto" | "streaming" | "analytics" | "commerce" | "building" | "games";

/**
 * Real brands, behind a build-time constant: without the flag this folds to null and the bundler drops the names
 * and logo paths, so a public build never even ships them in its JavaScript.
 */
const REAL: Record<CardId, Brand> | null = SHOWCASE
  ? {
      auto: { name: "Tesla", mark: BRAND_MARKS.tesla, color: "#CC0000" },
      streaming: { name: "Spotify", mark: BRAND_MARKS.spotify, color: "#1ED760" },
      analytics: { name: "Palantir", mark: BRAND_MARKS.palantir, color: "#E6E8EA" },
      commerce: { name: "Shopify", mark: BRAND_MARKS.shopify, color: "#7AB55C" },
      building: { name: "Builders FirstSource", monogram: "BFS", color: "#F2A900" },
      games: { name: "Epic Games", mark: BRAND_MARKS.epicgames, color: "#E6E8EA" },
    }
  : null;

type Card = {
  id: CardId;
  fictional: Brand;
  industry: "auto" | "streaming" | "analytics" | "commerce" | "building" | "games";
  /** The agent chain, in blueprint order; edges add the cross-talk drawn in the graph. */
  agents: EngineKey[];
  edges: [number, number][];
  savedHrs: number;
  preventedUsd: number;
};

const CARDS: Card[] = [
  { id: "auto", fictional: { name: "Voltara Motors", monogram: "VM", color: "#CC0000" }, industry: "auto", agents: ["aether", "coreops", "cortex", "shield", "sovereign"], edges: [[0, 1], [1, 2], [2, 4], [3, 4], [1, 3], [0, 2]], savedHrs: 340, preventedUsd: 120_000 },
  { id: "streaming", fictional: { name: "Cadence Stream", monogram: "CS", color: "#1ED760" }, industry: "streaming", agents: ["intentpulse", "cortex", "vanguard", "apex"], edges: [[0, 1], [1, 2], [2, 3], [0, 3], [1, 3]], savedHrs: 512, preventedUsd: 86_000 },
  { id: "analytics", fictional: { name: "Lattice Analytics", monogram: "LA", color: "#E6E8EA" }, industry: "analytics", agents: ["cortex", "shield", "sovereign", "aether"], edges: [[0, 1], [1, 2], [0, 3], [3, 2], [0, 2]], savedHrs: 288, preventedUsd: 240_000 },
  { id: "commerce", fictional: { name: "Marketline Commerce", monogram: "MC", color: "#7AB55C" }, industry: "commerce", agents: ["intentpulse", "apex", "coreops", "shield"], edges: [[0, 1], [1, 2], [2, 3], [0, 2], [3, 1]], savedHrs: 610, preventedUsd: 310_000 },
  { id: "building", fictional: { name: "Keystone Building Supply", monogram: "KB", color: "#F2A900" }, industry: "building", agents: ["coreops", "aether", "apex", "sovereign"], edges: [[0, 1], [1, 2], [2, 3], [0, 3], [1, 3]], savedHrs: 455, preventedUsd: 1_200_000 },
  { id: "games", fictional: { name: "Starforge Interactive", monogram: "SI", color: "#E6E8EA" }, industry: "games", agents: ["vanguard", "cortex", "shield", "coreops"], edges: [[0, 1], [1, 2], [1, 3], [3, 2], [0, 3]], savedHrs: 390, preventedUsd: 175_000 },
];

const money = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);

const brandOf = (card: Card): Brand => REAL?.[card.id] ?? card.fictional;

function Logo({ card }: { card: Card }) {
  const brand = brandOf(card);
  const mark = brand.mark ?? null;
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50" style={{ boxShadow: `0 0 24px -10px ${brand.color}` }}>
      {mark ? (
        <svg viewBox="0 0 24 24" className="size-7" role="img" aria-label={mark.title}>
          <path d={mark.path} fill={mark.hex} />
        </svg>
      ) : (
        <span className="font-mono text-[13px] font-semibold tracking-tight" style={{ color: brand.color }}>
          {brand.monogram ?? brand.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/** The agents on a circle, edges between them, and messages travelling along the edges. */
function AgentGraph({ card }: { card: Card }) {
  const n = card.agents.length;
  const pos = card.agents.map((_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: 200 + Math.cos(a) * 120, y: 130 + Math.sin(a) * 92 };
  });
  return (
    <svg viewBox="0 0 400 260" className="h-auto w-full" role="img" aria-label={card.agents.map((k) => ENGINES[k].name).join(", ")}>
      {card.edges.map(([a, b], i) => {
        const d = `M${pos[a].x},${pos[a].y} L${pos[b].x},${pos[b].y}`;
        return (
          <g key={i}>
            <path d={d} stroke="color-mix(in srgb, var(--tier-accent) 28%, transparent)" strokeWidth={1.2} fill="none" />
            <circle r={3.2} fill="var(--tier-accent)" style={{ filter: "drop-shadow(0 0 5px var(--tier-glow))" }}>
              <animateMotion dur={`${1.6 + (i % 3) * 0.5}s`} begin={`${(i * 0.37).toFixed(2)}s`} repeatCount="indefinite" path={d} keyPoints={i % 2 ? "1;0" : "0;1"} keyTimes="0;1" calcMode="linear" />
            </circle>
          </g>
        );
      })}
      {card.agents.map((k, i) => (
        <g key={k}>
          <circle cx={pos[i].x} cy={pos[i].y} r={24} fill="rgba(7, 8, 12, 0.92)" stroke="color-mix(in srgb, var(--tier-accent) 55%, transparent)" strokeWidth={1.4} />
          <circle cx={pos[i].x} cy={pos[i].y} r={24} fill="none" stroke="var(--tier-accent)" strokeOpacity={0.5}>
            <animate attributeName="r" values="24;34" dur="2.4s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.5;0" dur="2.4s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
          </circle>
          <text x={pos[i].x} y={pos[i].y + 4} textAnchor="middle" fill="rgb(255 255 255 / 0.9)" fontSize={10.5} fontFamily="var(--font-mono)">
            {ENGINES[k].name}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Builds a linear builder pipeline (input → each agent once → output) from a card's blueprint. */
function toPipeline(card: Card, name: string): Pipeline {
  const engines = [...new Set(card.agents)];
  const nodes: PipelineNode[] = [
    { id: "in", kind: "input", x: 40, y: 160 },
    ...engines.map((engine, i): PipelineNode => ({ id: `n${i}`, kind: "engine", engine, x: 220 + i * 190, y: 120 + (i % 2) * 90 })),
    { id: "out", kind: "output", x: 220 + engines.length * 190, y: 160 },
  ];
  const chain = nodes.map((x) => x.id);
  return { id: `pl-${card.id}-${Date.now().toString(36)}`, name, nodes, edges: chain.slice(1).map((id, i) => [chain[i], id] as [string, string]), updatedAt: Date.now() };
}

function FeedCard({ card }: { card: Card }) {
  const p = useOnboardingCopy().pulse;
  const brand = brandOf(card);
  const [hrs, setHrs] = useState(card.savedHrs);
  const [usd, setUsd] = useState(card.preventedUsd);
  const [forked, setForked] = useState<string | null>(null);

  // The metrics bar ticks: hours and dollars accrue while the card is on screen.
  useEffect(() => {
    const id = setInterval(() => {
      setHrs((h) => h + (Math.random() < 0.3 ? 1 : 0));
      setUsd((u) => u + Math.round(Math.random() * 400));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const fork = () => {
    const pipeline = toPipeline(card, p.blueprint(brand.name));
    updateSettings((s) => ({ pipelines: [...s.pipelines, pipeline] }));
    audit("system", `Cloned the ${brand.name} architecture blueprint into pipeline ${pipeline.id}`);
    obsidianToast(p.forked(pipeline.name));
    setForked(pipeline.id);
  };

  return (
    <article className="bloom-glass flex min-h-[78vh] snap-start flex-col rounded-3xl p-5 sm:p-6">
      <header className="flex items-center gap-3">
        <Logo card={card} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 truncate text-[18px] font-semibold text-white">
            {brand.name}
            {SHOWCASE && <BadgeCheck className="size-5 shrink-0 text-os-cyan" aria-label={p.verified} />}
          </h3>
          <p className="mt-0.5 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/12 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/60">{p.industries[card.industry]}</span>
            <span className="rounded-full border border-white/12 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/45">{p.agents(card.agents.length)}</span>
            {!SHOWCASE && <span className="rounded-full border border-amber-300/40 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-amber-200/80">{p.example}</span>}
          </p>
        </div>
      </header>

      <div className="my-3 flex flex-1 items-center">
        <AgentGraph card={card} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
            <Timer className="size-3.5 text-os-cyan" /> {p.saved(hrs)}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
            <TrendingDown className="size-3.5 text-os-cyan" /> {p.prevented(money(usd))}
          </p>
        </div>
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-2">
        {SHOWCASE && (
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-os-emerald">
            <ShieldCheck className="size-3.5" /> {p.zk}
          </span>
        )}
        {forked && (
          <Link href={`/desk/builder?id=${forked}`} className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-os-cyan hover:underline">
            {p.open} →
          </Link>
        )}
        <button type="button" onClick={fork} className="bloom-edge-glow ms-auto flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-os-cyan">
          <GitFork className="size-3.5" /> {p.fork}
        </button>
      </footer>
    </article>
  );
}

export function ArchitectureFeed() {
  const p = useOnboardingCopy().pulse;
  const cards = useMemo(() => CARDS, []);
  return (
    <div>
      {!SHOWCASE && <p className="mb-3 text-[11.5px] text-white/40">{p.showcaseOff}</p>}
      <div className={cn("mx-auto grid h-[82vh] max-w-xl snap-y snap-mandatory gap-4 overflow-y-auto overscroll-contain pe-1")}>
        {cards.map((c) => (
          <FeedCard key={c.id} card={c} />
        ))}
      </div>
    </div>
  );
}
