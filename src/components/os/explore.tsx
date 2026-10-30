"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Boxes, Brain, Calculator, Cpu, FileOutput, Keyboard, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { paintings } from "@/components/bloom/art/paintings";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { localizeEngine, useCommandCopy } from "@/components/bloom/command/locale";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { UTILITY } from "@/components/bloom/command/utility";
import { ARCHITECTURES, type Architecture } from "@/lib/architectures";
import { ENGINE_DEMOS } from "./explore-data";
import { OsPage } from "./os-shell";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** /desk/explore: the educational hub's front door. */
export function ExploreHome() {
  const cards = [
    { href: "/desk/explore/engines", icon: Cpu, title: "Explore the engines", body: "All eight engines in plain English, each with a 30-second walkthrough from input to agent reasoning to output, and its typical efficiency impact.", painting: paintings[ENGINES.cortex.painting] },
    { href: "/desk/explore/architectures", icon: Boxes, title: "Explore the architectures", body: "The ten multi-agent products, with before-and-after comparisons and an ROI calculator for your own team.", painting: paintings[ENGINES.apex.painting] },
  ];
  return (
    <OsPage kicker="Explore · discovery hub" title="Learn what the workforce does" lede="No setup, no license needed: see how each engine thinks and what each architecture is worth to a team like yours.">
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group relative isolate flex min-h-72 flex-col justify-end overflow-hidden rounded-2xl border border-os-line p-6 transition-[border-color,box-shadow] hover:border-os-cyan/40 hover:shadow-[0_0_60px_-24px_rgb(0_240_255/0.6)]">
            <Image src={c.painting.src} alt="" fill sizes="50vw" className="-z-10 object-cover opacity-40 transition-transform duration-1000 group-hover:scale-105" style={{ objectPosition: c.painting.focus }} />
            <div className="absolute inset-0 -z-10 bg-linear-to-t from-os-bg via-os-bg/70 to-transparent" />
            <c.icon className="size-6 text-os-cyan" />
            <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.02em] text-white">{c.title}</h2>
            <p className="mt-1.5 max-w-lg text-[14px] text-white/60">{c.body}</p>
            <span className="mt-4 flex items-center gap-1.5 text-[13px] text-os-cyan">
              Start <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
            </span>
          </Link>
        ))}
      </div>
    </OsPage>
  );
}

/** /desk/explore/engines: plain-English cards with click-through demos. */
export function ExploreEngines() {
  const { lang } = useCommandCopy();
  const [open, setOpen] = useState<EngineKey | null>(null);
  return (
    <OsPage kicker="Explore · engines" title="Eight engines, in plain English" lede="Pick any engine and click through what it does with a real request: the input, how its agents think, and what you get back.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ENGINE_ORDER.map((k) => {
          const e = localizeEngine(ENGINES[k], lang);
          const d = ENGINE_DEMOS[k];
          return (
            <article key={k} style={paletteVars(PALETTES[k])} className="os-panel flex flex-col rounded-2xl p-5">
              <p className="font-mono text-[10.5px] tracking-[0.2em] text-c-2">
                {e.index} · {e.badge}
              </p>
              <h2 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] text-white">{e.name}</h2>
              <p className="text-[12.5px] text-white/50">{e.role}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-white/75">{UTILITY[lang][k]}</p>
              <dl className="mt-4 space-y-1.5">
                {d.impact.map((m) => (
                  <div key={m.label} className="flex items-baseline justify-between gap-2 border-b border-os-line/60 pb-1.5">
                    <dt className="text-[11.5px] text-white/50">{m.label}</dt>
                    <dd className="font-mono text-[12.5px] text-c-2">{m.value}</dd>
                  </div>
                ))}
              </dl>
              <button type="button" onClick={() => setOpen(k)} className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-c-1/50 bg-c-deep/60 py-2 text-[12.5px] text-white hover:bg-c-deep">
                <Play className="size-3.5" /> 30-second demo
              </button>
            </article>
          );
        })}
      </div>
      <p className="mt-4 text-[11.5px] text-white/35">Impact figures are typical outcomes from an illustrative operating model, not guarantees.</p>
      <AnimatePresence>{open && <EngineDemo key={open} engine={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </OsPage>
  );
}

const STEPS = [
  { title: "Input", icon: Keyboard },
  { title: "Agent thought", icon: Brain },
  { title: "Output", icon: FileOutput },
] as const;

function EngineDemo({ engine, onClose }: { engine: EngineKey; onClose: () => void }) {
  const d = ENGINE_DEMOS[engine];
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  // In the thinking step, reasoning lines appear one by one, like a live agent.
  useEffect(() => {
    if (step !== 1) return;
    setShown(0);
    const t = setInterval(() => setShown((n) => (n >= d.thoughts.length ? n : n + 1)), 900);
    return () => clearInterval(t);
  }, [step, d.thoughts.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${ENGINES[engine].name} walkthrough`}
        style={paletteVars(PALETTES[engine])}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 20, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.97 }}
        className="os-panel w-full max-w-2xl rounded-2xl p-6"
      >
        <p className="os-label text-c-2">30-second demo · {ENGINES[engine].name}</p>
        <ol className="mt-4 grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button type="button" onClick={() => setStep(i)} className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-[12px]", i === step ? "border-c-1/60 bg-c-deep/70 text-white" : i < step ? "border-os-emerald/30 text-white/70" : "border-os-line text-white/40")}>
                <s.icon className="size-3.5" /> {s.title}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-5 min-h-44">
          {step === 0 && (
            <motion.p key="in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-os-line bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-white/85">
              <span className="text-os-cyan">&gt;</span> {d.input}
            </motion.p>
          )}
          {step === 1 && (
            <ul className="space-y-2">
              {d.thoughts.slice(0, shown).map((t) => (
                <motion.li key={t} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 text-[13px] text-white/75">
                  <Brain className="mt-0.5 size-3.5 shrink-0 text-c-2" />
                  <span className="font-mono text-[12.5px]">{t}</span>
                </motion.li>
              ))}
              {shown < d.thoughts.length && <li className="h-4 w-2 animate-pulse bg-c-1" aria-hidden />}
            </ul>
          )}
          {step === 2 && (
            <motion.div key="out" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="rounded-xl border border-c-edge/50 bg-c-deep/40 p-4 text-[14px] leading-relaxed text-white">{d.output}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                {d.impact.map((m) => (
                  <div key={m.label} className="rounded-lg border border-os-line p-2.5">
                    <dt className="text-[10.5px] text-white/45">{m.label}</dt>
                    <dd className="font-mono text-[14px] text-c-2">{m.value}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          )}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={onClose} className="text-[12.5px] text-white/50 hover:text-white">
            Close
          </button>
          {step < 2 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="flex items-center gap-1.5 rounded-full bg-linear-to-r from-c-1 to-c-2 px-5 py-2 text-[13px] font-semibold text-black">
              Next <ArrowRight className="size-4 rtl:-scale-x-100" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(0)} className="flex items-center gap-1.5 rounded-full border border-os-line px-4 py-2 text-[12.5px] text-white/70">
                <RotateCcw className="size-3.5" /> Replay
              </button>
              <Link href={`/desk/engines/${engine}`} className="flex items-center gap-1.5 rounded-full bg-linear-to-r from-c-1 to-c-2 px-5 py-2 text-[13px] font-semibold text-black">
                Run it for real <ArrowUpRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** /desk/explore/architectures: before/after sliders and an ROI calculator for each product. */
export function ExploreArchitectures() {
  const [id, setId] = useState(ARCHITECTURES[1].id);
  const a = ARCHITECTURES.find((x) => x.id === id)!;
  return (
    <OsPage kicker="Explore · architectures" title="What each architecture is worth" lede="Drag the comparison to see a team before and after the stack, then put in your own numbers for an ROI estimate.">
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {ARCHITECTURES.map((x, i) => (
          <button key={x.id} type="button" onClick={() => setId(x.id)} className={cn("shrink-0 rounded-lg border px-3 py-2 text-start", x.id === id ? "border-os-cyan/45 bg-os-cyan/[0.07]" : "border-os-line hover:border-os-cyan/25")}>
            <span className="block font-mono text-[9.5px] text-os-cyan/70">ARCH Nº {String(i + 1).padStart(2, "0")}</span>
            <span className="block text-[12.5px] text-white">{x.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <BeforeAfter key={a.id} a={a} />
        <RoiCalculator key={`roi-${a.id}`} a={a} />
      </div>
      <p className="mt-4 text-[11.5px] text-white/35">All figures come from an illustrative operating model for a typical mid-market team. They are estimates, not guarantees.</p>
    </OsPage>
  );
}

function BeforeAfter({ a }: { a: Architecture }) {
  const [split, setSplit] = useState(50);
  return (
    <section className="os-panel relative overflow-hidden rounded-2xl">
      <div className="relative h-[24rem] select-none" style={{ direction: "ltr" }}>
        <Side a={a} after={false} />
        {/* The "after" layer is revealed from the handle to the right edge. */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
          <Side a={a} after />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-os-cyan shadow-[0_0_14px_#00f0ff]" style={{ left: `${split}%` }}>
          <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-os-cyan bg-os-bg font-mono text-[10px] text-os-cyan">⇆</span>
        </div>
        <input type="range" min={5} max={95} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Before and after comparison" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
      </div>
    </section>
  );
}

function RoiCalculator({ a }: { a: Architecture }) {
  const [seats, setSeats] = useState(8);
  const [hourly, setHourly] = useState(65);
  const [revenue, setRevenue] = useState(400_000);
  const hours = seats * a.impact.hoursPerSeatWeek * 4.33;
  const labor = hours * hourly;
  const lift = revenue * (a.impact.revenueLiftPct / 100);
  const gross = labor + lift;
  const net = gross - a.retainer;
  const payback = net > 0 ? a.setup / net : null;
  const annualRoi = ((net * 12 - a.setup) / (a.setup + a.retainer * 12)) * 100;
  return (
    <section className="os-panel rounded-2xl p-5">
      <h2 className="flex items-center gap-2 os-label text-os-cyan/80">
        <Calculator className="size-3.5" /> ROI & savings calculator
      </h2>
      <div className="mt-4 space-y-4">
        <Field label="People working this function" value={seats} min={1} max={60} step={1} fmt={(v) => String(v)} set={setSeats} />
        <Field label="Loaded cost per hour" value={hourly} min={20} max={250} step={5} fmt={(v) => `$${v}`} set={setHourly} />
        <Field label="Monthly revenue this function influences" value={revenue} min={20_000} max={5_000_000} step={20_000} fmt={usd} set={setRevenue} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-2">
        {[
          ["Hours saved / month", `${Math.round(hours).toLocaleString("en-US")}h`],
          ["Labor value / month", usd(labor)],
          [`Revenue lift (${a.impact.revenueLiftPct}%)`, usd(lift)],
          ["Net value / month", usd(net)],
          ["Payback", payback === null ? "Not at this size" : payback < 1 ? "Under a month" : `${payback.toFixed(1)} months`],
          ["First-year ROI", `${Math.round(annualRoi)}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-os-line bg-black/25 px-3 py-2">
            <dt className="text-[10.5px] text-white/45">{k}</dt>
            <dd className="font-mono text-[16px] tabular-nums text-white">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11.5px] text-white/40">
        After {usd(a.setup)} setup and {usd(a.retainer)}/mo platform compute.{" "}
        <Link href={`/desk/architectures/${a.slug}`} className="text-os-cyan/80 hover:text-os-cyan">
          Open the product workspace
        </Link>
      </p>
    </section>
  );
}

/** One side of the before/after comparison. Module-level so the slider's re-renders don't remount it. */
function Side({ a, after }: { a: Architecture; after: boolean }) {
  return (
    // "After" anchors to the right edge, so dragging the handle left uncovers it.
    <div className={cn("absolute inset-0 flex flex-col justify-center gap-4 p-6", after ? "items-end bg-[radial-gradient(ellipse_at_70%_40%,rgb(52_245_181/0.12),transparent_70%)] bg-os-panel text-end" : "bg-[#120c0c]")}>
      <p className={cn("os-label", after ? "text-os-emerald" : "text-red-300/70")}>{after ? `With ${a.name}` : "Before: the manual way"}</p>
      {a.impact.compare.map((m) => (
        <div key={m.label}>
          <p className="text-[12px] text-white/55">{m.label}</p>
          <p className={cn("font-mono text-[30px] tabular-nums", after ? "text-os-emerald" : "text-white/60")}>
            {after ? m.after : m.before} <span className="text-[13px] text-white/40">{m.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

/** A labeled slider. Module-level, so dragging doesn't remount the input on every change. */
function Field({ label, value, min, max, step, fmt, set }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; set: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[12.5px] text-white/65">
        {label}
        <span className="font-mono text-os-cyan">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="mt-1.5 w-full accent-[#00f0ff]" />
    </label>
  );
}
