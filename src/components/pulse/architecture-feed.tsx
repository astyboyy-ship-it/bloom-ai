"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, GitFork, ShieldCheck, Timer, TrendingDown } from "lucide-react";
import { ENGINES } from "@/components/bloom/command/engines";
import { audit, updateSettings } from "@/components/desk/settings";
import { obsidianToast } from "@/components/control-plane/obsidian-toast";
import { useOnboardingCopy } from "@/components/onboarding/copy";
import { BrandLogo } from "./brand-logo";
import { brandOf, COMPANIES, money, SHOWCASE, toPipeline, type Company } from "./companies";

/**
 * Global Pulse architecture feed: a vertical, snap-scrolling feed of agent architectures, one card per company,
 * each with a live agent graph, metrics, Fork / Clone into the builder, and a doorway into the company's own page
 * (its workflows, how it runs AI, and its own Global Pulse). Company data and the private-showcase rules live in
 * ./companies.ts.
 */

/** The agents on a circle, edges between them, and messages travelling along the edges. */
export function AgentGraph({ company }: { company: Company }) {
  const n = company.agents.length;
  const pos = company.agents.map((_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: 200 + Math.cos(a) * 120, y: 130 + Math.sin(a) * 92 };
  });
  return (
    <svg viewBox="0 0 400 260" className="h-auto w-full" role="img" aria-label={company.agents.map((k) => ENGINES[k].name).join(", ")}>
      {company.edges.map(([a, b], i) => {
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
      {company.agents.map((k, i) => (
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

function FeedCard({ company }: { company: Company }) {
  const p = useOnboardingCopy().pulse;
  const brand = brandOf(company);
  const href = `/desk/feed/${company.id}`;
  const [hrs, setHrs] = useState(company.savedHrs);
  const [usd, setUsd] = useState(company.preventedUsd);
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
    const pipeline = toPipeline(company.id, p.blueprint(brand.name), company.agents);
    updateSettings((s) => ({ pipelines: [...s.pipelines, pipeline] }));
    audit("system", `Cloned the ${brand.name} architecture blueprint into pipeline ${pipeline.id}`);
    obsidianToast(p.forked(pipeline.name));
    setForked(pipeline.id);
  };

  return (
    <article className="bloom-glass bloom-noise group flex min-h-[78vh] snap-start flex-col rounded-3xl p-5 transition-[border-color,box-shadow] duration-500 hover:border-os-cyan/35 hover:shadow-[0_0_60px_-28px_var(--tier-glow)] sm:p-6">
      {/* The header and the graph open the company's own page. */}
      <Link href={href} className="flex items-center gap-3 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-os-cyan">
        <BrandLogo company={company} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 truncate text-[18px] font-semibold text-white">
            {brand.name}
            {SHOWCASE && <BadgeCheck className="size-5 shrink-0 text-os-cyan" aria-label={p.verified} />}
          </h3>
          <p className="mt-0.5 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/12 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/60">{p.industries[company.industry]}</span>
            <span className="rounded-full border border-white/12 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/45">{p.agents(company.agents.length)}</span>
            {!SHOWCASE && <span className="rounded-full border border-amber-300/40 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-amber-200/80">{p.example}</span>}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-os-cyan/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-os-cyan transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
          {p.company.explore} <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
        </span>
      </Link>

      <Link href={href} tabIndex={-1} aria-hidden className="my-3 flex flex-1 items-center">
        <AgentGraph company={company} />
      </Link>

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
  return (
    <div>
      {!SHOWCASE && <p className="mb-3 text-[11.5px] text-white/40">{p.showcaseOff}</p>}
      <div className="mx-auto grid h-[82vh] max-w-xl snap-y snap-mandatory gap-4 overflow-y-auto overscroll-contain pe-1">
        {COMPANIES.map((c) => (
          <FeedCard key={c.id} company={c} />
        ))}
      </div>
    </div>
  );
}
