"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Bot, Clock, Cpu, Database, FlaskConical, GitFork, Globe2, Play, Scale, ShieldCheck, Sparkles, Workflow as WorkflowIcon, Zap } from "lucide-react";
import { PaintingCanvas } from "@/components/bloom/art/painting-canvas";
import { ENGINES } from "@/components/bloom/command/engines";
import { audit, updateSettings } from "@/components/desk/settings";
import { LAND_DOTS, MAP_H, MAP_W, project } from "@/components/os/world";
import { MODELS } from "@/lib/engines/models";
import { obsidianToast } from "@/components/control-plane/obsidian-toast";
import { LiveDot, Sparkline } from "@/components/control-plane/ops-ui";
import { useOnboardingCopy } from "@/components/onboarding/copy";
import { BrandLogo } from "./brand-logo";
import { brandOf, money, rosterOf, SHOWCASE, toPipeline, withCo, type Company, type Workflow } from "./companies";
import { CompanyIntro } from "./company-intro";

const INTRO_KEY = "bloom-company-intro-seen";

/** A deterministic, gently rising series for a headline metric (illustrative, like the rest of the page). */
function seriesFor(seed: number, base: number) {
  return Array.from({ length: 24 }, (_, i) => Math.round(base * (0.72 + i * 0.012 + Math.sin(i * 0.9 + seed) * 0.05)));
}

function Section({ icon: Icon, title, sub, children }: { icon: typeof Sparkles; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-os-cyan">
        <Icon className="size-4" />
        <span className="bloom-glow">{title}</span>
      </h2>
      {sub && <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-white/50">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* --------------------------------------------------------------------------------------------- workflows */

function WorkflowCard({ company, wf }: { company: Company; wf: Workflow }) {
  const c = useOnboardingCopy().pulse.company;
  const router = useRouter();
  const brand = brandOf(company);

  const fork = (open: "builder" | "sandbox") => {
    const name = `${brand.name} · ${wf.name}`;
    const pipeline = toPipeline(`${company.id}-${wf.id}`, name, wf.steps.map((s) => s.engine));
    updateSettings((s) => ({ pipelines: [...s.pipelines, pipeline] }));
    audit("system", `Cloned the ${name} workflow blueprint into pipeline ${pipeline.id}`);
    obsidianToast(name);
    router.push(open === "builder" ? `/desk/builder?id=${pipeline.id}` : `/desk/sandbox?id=${pipeline.id}`);
  };

  return (
    <article className="bloom-glass bloom-noise group flex flex-col rounded-2xl p-5 transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-0.5 hover:border-os-cyan/35 hover:shadow-[0_0_50px_-26px_var(--tier-glow)]">
      <h3 className="text-[16px] font-semibold text-white">{wf.name}</h3>
      <dl className="mt-2 grid gap-1 text-[12px]">
        <div className="flex gap-2">
          <dt className="flex shrink-0 items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/40">
            <Zap className="size-3 text-os-cyan" /> {c.trigger}
          </dt>
          <dd className="text-white/70">{wf.trigger}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="flex shrink-0 items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/40">
            <Clock className="size-3 text-os-cyan" /> {c.cadence}
          </dt>
          <dd className="text-white/70">{wf.cadence}</dd>
        </div>
      </dl>

      {/* The chain of engines, as a vertical timeline */}
      <ol className="relative mt-4 flex-1 space-y-3 ps-6">
        <span aria-hidden className="absolute inset-y-1 start-[9px] w-px bg-gradient-to-b from-os-cyan/60 via-os-cyan/25 to-transparent" />
        {wf.steps.map((s, i) => (
          <li key={i} className="relative">
            <span className="absolute -start-6 top-0.5 flex size-[19px] items-center justify-center rounded-full border border-os-cyan/50 bg-[#07080c] font-mono text-[9px] text-os-cyan" style={{ boxShadow: "0 0 10px -2px var(--tier-glow)" }}>
              {i + 1}
            </span>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-os-cyan">{ENGINES[s.engine].name}</p>
            <p className="text-[12.5px] leading-snug text-white/75">{s.action}</p>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-300/30 bg-amber-300/[0.05] px-3 py-2">
          <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-200/80">
            <ShieldCheck className="size-3" /> {c.approval}
          </p>
          <p className="mt-0.5 text-[12px] text-white/75">{wf.approval}</p>
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-black/30 px-3 py-2">
          <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
            <Sparkles className="size-3 text-os-cyan" /> {c.output}
          </p>
          <p className="mt-0.5 text-[12px] text-white/75">{wf.output}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => fork("builder")} className="bloom-edge-glow flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-os-cyan transition-transform active:scale-[0.97]">
          <GitFork className="size-3.5" /> {c.fork}
        </button>
        <button type="button" onClick={() => fork("sandbox")} className="flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-os-cyan/40 hover:text-white active:scale-[0.97]">
          <FlaskConical className="size-3.5" /> {c.sandbox}
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------------------------------- global pulse */

type PulseEvent = { id: number; at: number; text: string; engine: string };

function CompanyPulse({ company }: { company: Company }) {
  const c = useOnboardingCopy().pulse.company;
  const sites = company.sites.map((s) => ({ ...s, ...project(s.lon, s.lat) }));
  const hq = sites[0];
  const [events, setEvents] = useState<PulseEvent[]>([]);

  useEffect(() => {
    let seq = 0;
    const make = (): PulseEvent => {
      const wf = company.workflows[Math.floor(Math.random() * company.workflows.length)];
      const tpl = wf.events[Math.floor(Math.random() * wf.events.length)];
      const site = company.sites[Math.floor(Math.random() * company.sites.length)].name;
      const n = 2 + Math.floor(Math.random() * 180);
      return { id: ++seq, at: Date.now(), engine: ENGINES[wf.steps[0].engine].name, text: tpl.replace("{site}", site).replace("{n}", String(n)) };
    };
    setEvents(Array.from({ length: 6 }, make));
    const id = setInterval(() => setEvents((e) => [make(), ...e].slice(0, 12)), 1500);
    return () => clearInterval(id);
  }, [company]);

  const perMin = events.filter((e) => Date.now() - e.at < 60_000).length * 3;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="bloom-glass bloom-noise overflow-hidden rounded-2xl p-3">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-auto w-full" style={{ direction: "ltr" }} role="img" aria-label={c.pulse}>
          {LAND_DOTS.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={1.3} fill="rgb(255 255 255 / 0.13)" />
          ))}
          {sites.slice(1).map((s, i) => {
            const mx = (hq.x + s.x) / 2;
            const my = Math.min(hq.y, s.y) - 60 - Math.abs(hq.x - s.x) * 0.12;
            const d = `M${hq.x},${hq.y} Q${mx},${my} ${s.x},${s.y}`;
            return (
              <g key={s.name}>
                <path d={d} fill="none" stroke="color-mix(in srgb, var(--tier-accent) 45%, transparent)" strokeWidth={1.4} style={{ filter: "drop-shadow(0 0 4px var(--tier-glow))" }} />
                {[0, 1].map((k) => (
                  <circle key={k} r={3.2} fill="var(--tier-accent)">
                    <animateMotion dur={`${2.2 + i * 0.3}s`} begin={`${k * 1.1 + i * 0.2}s`} repeatCount="indefinite" path={d} keyPoints={k ? "1;0" : "0;1"} keyTimes="0;1" calcMode="linear" />
                  </circle>
                ))}
              </g>
            );
          })}
          {sites.map((s, i) => (
            <g key={s.name}>
              <circle cx={s.x} cy={s.y} r={i === 0 ? 7 : 5} fill="none" stroke="var(--tier-accent)" strokeOpacity={0.5}>
                <animate attributeName="r" values={`${i === 0 ? 7 : 5};${i === 0 ? 22 : 16}`} dur="2.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.6;0" dur="2.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={s.x} cy={s.y} r={i === 0 ? 5 : 3.6} fill="var(--tier-accent)" style={{ filter: "drop-shadow(0 0 6px var(--tier-glow))" }} />
              <text x={s.x + 9} y={s.y - 8} fill="rgb(255 255 255 / 0.8)" fontSize={13} fontFamily="var(--font-mono)">
                {s.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="bloom-glass bloom-noise flex min-h-0 flex-col rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-os-cyan">
            <LiveDot /> {c.live}
          </span>
          <span className="font-mono text-[10.5px] text-white/50">
            {c.eventsMin} <span className="bloom-glow tabular-nums">{perMin}</span> · {c.sites} <span className="tabular-nums text-white/80">{company.sites.length}</span>
          </span>
        </div>
        <ol className="mt-3 flex-1 space-y-1.5 overflow-hidden">
          {events.map((e) => (
            <li key={e.id} className="rounded-lg border border-white/[0.05] bg-black/30 px-3 py-1.5" style={{ animation: "bloom-row-in 900ms ease-out" }}>
              <p className="flex items-center justify-between gap-2 font-mono text-[9.5px] uppercase tracking-[0.12em]">
                <span className="text-os-cyan">{e.engine}</span>
                <span className="tabular-nums text-white/30">{new Date(e.at).toLocaleTimeString()}</span>
              </p>
              <p className="text-[12px] leading-snug text-white/75">{e.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------- page */

/**
 * A company's own page in the architecture feed: its cinematic intro, then its painting-backed hero, headline
 * metrics, agent workflows (fork into the builder or open in the sandbox), how it runs AI, and its own Global
 * Pulse. Everything here is an illustrative blueprint and says so.
 */
export function CompanyPageView({ company }: { company: Company }) {
  const c = useOnboardingCopy().pulse.company;
  const p = useOnboardingCopy().pulse;
  const brand = brandOf(company);
  const [intro, setIntro] = useState(false);

  // The intro plays the first time each company is opened in a session; "Replay intro" brings it back.
  useEffect(() => {
    try {
      const seen = JSON.parse(sessionStorage.getItem(INTRO_KEY) ?? "[]") as string[];
      if (!seen.includes(company.id)) setIntro(true);
    } catch {
      setIntro(true);
    }
  }, [company.id]);
  const finishIntro = useCallback(() => {
    setIntro(false);
    try {
      const seen = JSON.parse(sessionStorage.getItem(INTRO_KEY) ?? "[]") as string[];
      sessionStorage.setItem(INTRO_KEY, JSON.stringify([...new Set([...seen, company.id])]));
    } catch {
      // Plays again next time; harmless.
    }
  }, [company.id]);

  const roster = useMemo(() => rosterOf(company), [company]);
  const metrics = [
    { label: c.metrics.hours, value: company.savedHrs.toLocaleString("en-US"), series: seriesFor(1, company.savedHrs) },
    { label: c.metrics.protected, value: money(company.preventedUsd), series: seriesFor(2, company.preventedUsd) },
    { label: c.metrics.agents, value: String(company.activeAgents), series: seriesFor(3, company.activeAgents) },
    { label: c.metrics.runs, value: company.runsPerDay.toLocaleString("en-US"), series: seriesFor(4, company.runsPerDay) },
  ];

  return (
    <>
      {intro && <CompanyIntro company={company} onDone={finishIntro} />}

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">
        {/* Hero: the company's painting, alive, fading into obsidian */}
        <section className="relative isolate min-h-[380px] overflow-hidden rounded-3xl border border-white/[0.08]">
          <PaintingCanvas painting={company.painting} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/70 to-[#07080c]/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,transparent,rgb(7_8_12/0.55))]" />
          <div className="relative flex min-h-[380px] flex-col justify-between p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href="/desk/feed" className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm transition-colors hover:text-white">
                <ArrowLeft className="size-3.5 rtl:-scale-x-100" /> {c.back}
              </Link>
              <button type="button" onClick={() => setIntro(true)} className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm transition-colors hover:text-white">
                <Play className="size-3.5" /> {c.replay}
              </button>
            </div>
            <div>
              <div className="flex items-center gap-4">
                <BrandLogo company={company} size={72} className="backdrop-blur-sm" />
                <div className="min-w-0">
                  <h1 className="flex items-center gap-2 text-[34px] font-semibold leading-tight tracking-[-0.02em] text-white drop-shadow-[0_4px_20px_rgb(0_0_0/0.8)] sm:text-[46px]">
                    {brand.name}
                    {SHOWCASE && <BadgeCheck className="size-7 shrink-0 text-os-cyan" aria-label={p.verified} />}
                  </h1>
                  <p className="mt-1 max-w-2xl text-[15px] text-white/75">{withCo(company.tagline, company)}</p>
                </div>
              </div>
              <p className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 backdrop-blur-sm">{p.industries[company.industry]}</span>
                <span className="rounded-full border border-amber-300/45 bg-black/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-200/90 backdrop-blur-sm">{c.illustrative}</span>
                {SHOWCASE && (
                  <span className="flex items-center gap-1 rounded-full border border-os-emerald/40 bg-black/40 px-2.5 py-0.5 font-mono text-[10px] text-os-emerald backdrop-blur-sm">
                    <ShieldCheck className="size-3" /> {p.zk}
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Headline metrics */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="bloom-glass bloom-noise rounded-2xl p-4">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/45">{m.label}</p>
              <p className="bloom-glow mt-1 font-mono text-[26px] leading-none tabular-nums">{m.value}</p>
              <Sparkline values={m.series} className="mt-2" />
            </div>
          ))}
        </div>

        <Section icon={WorkflowIcon} title={c.workflows} sub={c.workflowsSub}>
          <div className="grid gap-4 lg:grid-cols-3">
            {company.workflows.map((wf) => (
              <WorkflowCard key={wf.id} company={company} wf={wf} />
            ))}
          </div>
        </Section>

        <Section icon={Bot} title={c.ai} sub={c.aiSub}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="bloom-glass bloom-noise rounded-2xl p-4">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                <Cpu className="size-3.5 text-os-cyan" /> {c.roster}
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {roster.map((k) => {
                  const m = MODELS.find((x) => x.id === company.models[k]);
                  return (
                    <li key={k} className="rounded-xl border border-white/[0.07] bg-black/30 px-3 py-2.5 transition-colors hover:border-os-cyan/30">
                      <p className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-os-cyan">{ENGINES[k].name}</span>
                        {m && <span className="rounded-full border border-white/12 px-2 py-0.5 font-mono text-[9px] text-white/55">{m.label}</span>}
                      </p>
                      <p className="mt-1 text-[12.5px] text-white/75">{company.roles[k] ?? ENGINES[k].role}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="grid gap-4">
              <div className="bloom-glass bloom-noise rounded-2xl p-4">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                  <Scale className="size-3.5 text-amber-300" /> {c.governance}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {company.governance.map((g) => (
                    <li key={g} className="flex gap-2 text-[12.5px] text-white/75">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-amber-300/80" /> {g}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bloom-glass bloom-noise rounded-2xl p-4">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                  <Database className="size-3.5 text-os-cyan" /> {c.sources}
                </p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {company.sources.map((s) => (
                    <span key={s} className="rounded-full border border-white/12 bg-black/30 px-2.5 py-1 text-[11.5px] text-white/70">
                      {s}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={Globe2} title={c.pulse} sub={c.pulseSub}>
          <CompanyPulse company={company} />
        </Section>
      </main>
    </>
  );
}
