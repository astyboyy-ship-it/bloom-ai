"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutGroup, motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BrainCircuit,
  Eye,
  FlaskConical,
  KeyRound,
  Radar,
  Rocket,
  TrendingDown,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { FloraField } from "../art/flora";
import { PaintingCanvas, PaintingCaption } from "../art/painting-canvas";
import { paintings } from "../art/paintings";
import { localizeSiteEngine, useSiteCopy } from "../site-copy";
import { StatusLed } from "../status-led";
import { ActiveContext } from "./active-context";
import { ArchitectVisual } from "./architect-visual";
import { engines, getEngine, type Engine, type EngineSlug } from "./data";
import { DealmakerVisual } from "./dealmaker-visual";
import { GatekeeperVisual } from "./gatekeeper-visual";
import { HunterVisual } from "./hunter-visual";

const widgets: Record<EngineSlug, React.ComponentType> = {
  marketing: DealmakerVisual,
  infrastructure: ArchitectVisual,
  workforce: HunterVisual,
  intentpulse: GatekeeperVisual,
};

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
};

/** A dedicated, full-screen page for one engine, set inside its own living painting. */
export function EngineView({ slug }: { slug: EngineSlug }) {
  const { lang, dir, s } = useSiteCopy();
  const v = s.engineView;
  const engine = localizeSiteEngine(getEngine(slug) as Engine, lang);
  const Widget = widgets[engine.slug];
  const next = engines[(engines.findIndex((e) => e.slug === engine.slug) + 1) % engines.length];
  const [widgetActive, setWidgetActive] = useState(false);

  // The painting stays fixed behind the page and darkens as you read down.
  const { scrollY } = useScroll();
  const veil = useTransform(scrollY, [0, 700], [0.25, 0.82]);

  const steps: { icon: LucideIcon; title: string; kicker: string; body: string }[] = [
    { icon: Eye, ...v.steps[0], body: engine.aware.perceive },
    { icon: BrainCircuit, ...v.steps[1], body: engine.aware.reason },
    { icon: Rocket, ...v.steps[2], body: engine.aware.execute },
  ];

  return (
    <div lang={lang} dir={dir}>
      {/* Living painting backdrop */}
      <div className="fixed inset-0 -z-10">
        <PaintingCanvas painting={engine.painting} priority />
        <motion.div className="absolute inset-0 bg-ink" style={{ opacity: veil }} />
      </div>

      {/* Opening view */}
      <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden px-4 pb-16 pt-32 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(11_6_18/0.25)_0%,transparent_30%,rgb(11_6_18/0.85)_100%)]" />
        <FloraField blooms={engine.blooms} className="-z-10" />

        <div className="mx-auto w-full max-w-6xl">
          <Link
            href="/#engines"
            className="mb-10 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5 rtl:-scale-x-100" /> {v.allEngines}
          </Link>

          <motion.div {...reveal} className="max-w-4xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#f0d59a]/80">
              {v.engineNo} {engine.index} <span className="mx-2 text-white/30">—</span> {v.lab}
            </p>
            <h1 className="text-gold-metal mt-5 font-display text-5xl font-light leading-[0.95] tracking-[0.005em] sm:text-7xl lg:text-[6.5rem]">
              {engine.name}
            </h1>
            <p className="mt-5 font-display text-xl italic text-white/80 sm:text-2xl">{engine.subtitle}</p>

            <div className="mt-7 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ffb347]/30 bg-ink/60 py-1 pl-2 pr-3 backdrop-blur-md">
                <StatusLed />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#ffc777]">{v.inDev}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5ee7ff]/25 bg-ink/60 py-1 pl-2 pr-3 backdrop-blur-md">
                <StatusLed tone="cyan" className="size-3" />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8ff0ff]">{v.dynamicAwareness}</span>
              </span>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#waitlist"
                data-engine={engine.slug}
                data-intent="access"
                className="group relative inline-flex h-13 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#f3e2b8] px-7 text-sm font-semibold text-[#1a0f05] shadow-[0_0_60px_-12px_rgb(243_212_143/0.8)]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#fff4d6] via-[#e8c27a] to-[#c99446] transition-transform duration-700 group-hover:translate-x-0" />
                <span className="relative">{engine.cta}</span>
                <ArrowRight className="relative size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
              </a>
              <a
                href="#demo"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/20 bg-ink/40 px-7 text-sm font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
              >
                {v.seeItWork}
              </a>
              <Link
                href={`/command/${engine.command}`}
                className="group inline-flex h-13 items-center justify-center gap-2 rounded-full border border-[#f0d59a]/45 bg-ink/50 px-7 text-sm font-semibold text-[#f3e2b8] shadow-[0_0_40px_-14px_rgb(243_212_143/0.7)] backdrop-blur-md transition-colors hover:border-[#f0d59a] hover:text-white"
              >
                {v.enterCommand}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
              </Link>
            </div>
          </motion.div>

          <PaintingCaption painting={engine.painting} className="mt-14 text-end" />
        </div>
      </section>

      {/* Aware architecture deep dive */}
      <section className="relative px-4 py-24 sm:px-8 sm:py-32">
        <motion.div {...reveal} className="glass mx-auto grid max-w-6xl gap-10 rounded-[32px] p-8 sm:p-12 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8ff0ff]">{v.awareArch}</p>
            <h2 className="mt-4 font-display text-4xl font-light leading-tight text-white sm:text-5xl">
              {v.perceive} <em className="text-gold-metal">{v.reason}</em> {v.decide}
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-white/75">{engine.description}</p>
            <p className="mt-5 text-sm text-white/55">
              <span className="text-white/85">{v.noTemplatesLead}</span>
              {v.noTemplates}
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">{v.awareOf}</p>
              <ul className="flex flex-wrap gap-2">
                {engine.aware.senses.map((s) => (
                  <li key={s} className="rounded-full border border-[#5ee7ff]/20 bg-[#5ee7ff]/[0.06] px-3 py-1.5 text-[12px] text-white/85">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <AutonomyRadar value={engine.autonomy} label={engine.name} />
            <dl className="space-y-2.5 rounded-2xl border border-[#ffb347]/15 bg-[#ffb347]/[0.04] p-4 text-[13px]">
              <Row icon={Zap} label={v.status} value={v.statusValue(engine.build)} />
              <Row icon={FlaskConical} label={v.privateTesting} value={engine.testing} />
              <Row icon={KeyRound} label={v.targetAccess} value={engine.access} />
              <Row icon={TrendingDown} label={v.humanDependency} value={v.humanDependencyValue} />
            </dl>
          </div>
        </motion.div>
      </section>

      {/* The 3-step process */}
      <section className="relative px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div {...reveal} className="mb-14 max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#f0d59a]/80">{v.process}</p>
            <h2 className="mt-4 font-display text-4xl font-light text-white sm:text-6xl">
              {v.processPre}<em className="text-gold-metal">{v.processAccent}</em>
            </h2>
          </motion.div>
          <ol className="grid gap-px overflow-hidden rounded-[32px] border border-white/10 bg-white/10 lg:grid-cols-3">
            {steps.map((s, i) => (
              <motion.li
                key={s.title}
                {...reveal}
                transition={{ ...reveal.transition, delay: i * 0.15 }}
                className="relative flex flex-col bg-ink/80 p-8 backdrop-blur-xl sm:p-10"
              >
                <span className="text-gold-metal font-display text-7xl font-light leading-none">0{i + 1}</span>
                <span className="mt-8 flex size-11 items-center justify-center rounded-2xl border border-[#5ee7ff]/25 bg-[#5ee7ff]/10 text-[#8ff0ff]">
                  <s.icon className="size-5" />
                </span>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">{v.step} 0{i + 1} · {s.kicker}</p>
                <h3 className="mt-2 font-display text-3xl text-white">{s.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/70">{s.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* Dedicated interactive demo */}
      <section id="demo" className="relative scroll-mt-20 px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
          <motion.div {...reveal}>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8ff0ff]">{v.liveDemo}</p>
            <h2 className="mt-4 font-display text-4xl font-light text-white sm:text-5xl">
              {v.watchPre}<em className="text-gold-metal">{v.watchAccent}</em>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/70">
              {v.demoBody(engine.name)}
            </p>
            <p className="mt-3 text-xs text-white/40">{v.demoNote}</p>
            {engine.demoHref && (
              <Link
                href={engine.demoHref}
                className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-[#f3e2b8] px-6 text-sm font-semibold text-[#1a0f05] shadow-[0_0_50px_-12px_rgb(243_212_143/0.85)]"
              >
                {v.classicDemo}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
              </Link>
            )}
          </motion.div>
          <motion.div {...reveal} className="glass overflow-hidden rounded-[28px]">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              {["#ff6b6b", "#ffbd6e", "#5ee7ff"].map((c) => (
                <span key={c} className="size-2.5 rounded-full" style={{ background: c, opacity: 0.7 }} />
              ))}
              <span className="ms-3 font-mono text-[11px] text-white/45">{engine.widgetLabel}</span>
            </div>
            <ActiveContext.Provider value={widgetActive}>
              <LayoutGroup id={`demo-${engine.slug}`}>
                <div
                  onPointerEnter={() => setWidgetActive(true)}
                  onPointerLeave={() => setWidgetActive(false)}
                  className="relative isolate h-80 overflow-hidden bg-ink/70 [contain:layout_paint] sm:h-96"
                >
                  <Widget />
                </div>
              </LayoutGroup>
            </ActiveContext.Provider>
          </motion.div>
        </div>
      </section>

      {/* Onboarding + services */}
      <section className="relative px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <motion.div {...reveal}>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#f0d59a]/80">{v.onboarding}</p>
            <h2 className="mt-4 font-display text-4xl font-light text-white">{v.choosePathway}</h2>
            <ul className="mt-8 space-y-3">
              {engine.pathways.map((p) => (
                <li key={p.label}>
                  <a
                    href="#waitlist"
                    data-engine={engine.slug}
                    data-intent="access"
                    className="glass group flex items-center justify-between gap-4 rounded-2xl px-6 py-5 transition-colors hover:border-white/25"
                  >
                    <span>
                      <span className="block font-display text-xl text-white">{p.label}</span>
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">{p.audience}</span>
                    </span>
                    <ArrowUpRight className="size-5 shrink-0 text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div {...reveal}>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8ff0ff]">{v.standalone}</p>
            <h2 className="mt-4 font-display text-4xl font-light text-white">{v.whatItRuns}</h2>
            <ul className="mt-8 grid list-none gap-2 p-0">
              {engine.services.map(({ label, icon: Icon }) => (
                <li key={label} className="glass flex min-w-0 items-center gap-4 rounded-2xl px-5 py-4">
                  <Icon aria-hidden className="size-9 shrink-0 rounded-xl border border-[#e3b25a]/30 bg-[#e3b25a]/10 p-2 text-[#f0c879]" />
                  <span className="truncate text-[15px] text-white/90" title={label}>
                    {label}
                  </span>
                </li>
              ))}
            </ul>
            <a
              href="#waitlist"
              data-engine={engine.slug}
              data-intent="updates"
              className="mt-6 inline-flex items-center gap-2 text-sm text-white/65 transition-colors hover:text-white"
            >
              <BellRing className="size-4 text-[#5ee7ff]" /> {v.trackUpdates}
            </a>
          </motion.div>
        </div>
      </section>

      {/* Next engine */}
      <section className="relative px-4 pb-8 pt-12 sm:px-8">
        <Link href={`/engines/${next.slug}`} className="group relative mx-auto block max-w-6xl overflow-hidden rounded-[32px] border border-white/10">
          <Image
            src={paintings[next.painting].src}
            alt=""
            fill
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-105"
            style={{ objectPosition: paintings[next.painting].focus }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent rtl:bg-gradient-to-l" />
          <div className="relative flex items-center justify-between gap-6 p-8 sm:p-12">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/50">{v.next} · {v.engineNo} {next.index}</p>
              <p className="text-gold-metal mt-3 font-display text-3xl font-light sm:text-5xl">{next.name}</p>
            </div>
            <ArrowRight className="size-8 shrink-0 text-white/70 transition-transform group-hover:translate-x-2 rtl:-scale-x-100" />
          </div>
        </Link>
      </section>
    </div>
  );
}

function AutonomyRadar({ value, label }: { value: number; label: string }) {
  const { s } = useSiteCopy();
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 font-mono uppercase tracking-[0.18em] text-white/45">
          <Radar className="size-3.5 text-[#5ee7ff]" /> {s.engineView.autonomyRadar}
        </span>
        <span className="flex items-center gap-1 font-mono tabular-nums text-white/80">
          {value}% <ArrowRight className="size-3 text-white/35" /> <span className="text-white/35">{s.engineView.humanFree}</span>
        </span>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={s.engineView.autonomyAria(label)}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#c99446] via-[#f3d48f] to-[#5ee7ff]"
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="flex w-32 shrink-0 items-center gap-1.5 text-white/40">
        <Icon aria-hidden className="size-3.5 shrink-0" />
        {label}
      </dt>
      <dd className="text-white/80">{value}</dd>
    </div>
  );
}
