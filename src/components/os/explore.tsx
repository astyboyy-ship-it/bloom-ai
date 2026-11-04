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
import type { Lang } from "@/components/bloom/i18n";
import { architecturesIn } from "@/lib/architecture-text";
import { ARCHITECTURES, type Architecture } from "@/lib/architectures";
import { engineDemos } from "./explore-data-text";
import { OsPage } from "./os-shell";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const COPY = {
  en: {
    enginesTitle: "Explore the engines",
    enginesBody: "All eight engines in plain English, each with a 30-second walkthrough from input to agent reasoning to output, and its typical efficiency impact.",
    archTitle: "Explore the architectures",
    archBody: "The ten multi-agent products, with before-and-after comparisons and an ROI calculator for your own team.",
    start: "Start",
    demo: "30-second demo",
    disclaimer: "Impact figures are typical outcomes from an illustrative operating model, not guarantees.",
    steps: ["Input", "Agent thought", "Output"],
    walkthrough: (n: string) => `${n} walkthrough`,
    demoOf: (n: string) => `30-second demo · ${n}`,
    close: "Close",
    next: "Next",
    replay: "Replay",
    runReal: "Run it for real",
    arch: (n: string) => `ARCH Nº ${n}`,
    archDisclaimer: "All figures come from an illustrative operating model for a typical mid-market team. They are estimates, not guarantees.",
    compare: "Before and after comparison",
    roi: "ROI & savings calculator",
    seats: "People working this function",
    hourly: "Loaded cost per hour",
    revenue: "Monthly revenue this function influences",
    hoursSaved: "Hours saved / month",
    labor: "Labor value / month",
    lift: (pct: number) => `Revenue lift (${pct}%)`,
    net: "Net value / month",
    payback: "Payback",
    notAtSize: "Not at this size",
    underMonth: "Under a month",
    months: (n: string) => `${n} months`,
    firstYear: "First-year ROI",
    after: (setup: string, retainer: string) => `After ${setup} setup and ${retainer}/mo platform compute.`,
    open: "Open the product workspace",
    withA: (n: string) => `With ${n}`,
    before: "Before: the manual way",
  },
  es: {
    enginesTitle: "Explora los motores",
    enginesBody: "Los ocho motores en lenguaje claro, cada uno con un recorrido de 30 segundos de la entrada al razonamiento de los agentes y al resultado, y su impacto típico en eficiencia.",
    archTitle: "Explora las arquitecturas",
    archBody: "Los diez productos multiagente, con comparativas de antes y después y una calculadora de ROI para tu propio equipo.",
    start: "Empezar",
    demo: "Demo de 30 segundos",
    disclaimer: "Las cifras de impacto son resultados típicos de un modelo operativo ilustrativo, no garantías.",
    steps: ["Entrada", "Razonamiento del agente", "Resultado"],
    walkthrough: (n: string) => `Recorrido de ${n}`,
    demoOf: (n: string) => `Demo de 30 segundos · ${n}`,
    close: "Cerrar",
    next: "Siguiente",
    replay: "Repetir",
    runReal: "Ejecutarlo de verdad",
    arch: (n: string) => `ARQ. Nº ${n}`,
    archDisclaimer: "Todas las cifras proceden de un modelo operativo ilustrativo para un equipo mid-market típico. Son estimaciones, no garantías.",
    compare: "Comparativa de antes y después",
    roi: "Calculadora de ROI y ahorro",
    seats: "Personas que trabajan en esta función",
    hourly: "Coste por hora con cargas",
    revenue: "Ingresos mensuales en los que influye esta función",
    hoursSaved: "Horas ahorradas / mes",
    labor: "Valor del trabajo / mes",
    lift: (pct: number) => `Aumento de ingresos (${pct}%)`,
    net: "Valor neto / mes",
    payback: "Recuperación",
    notAtSize: "No con este tamaño",
    underMonth: "Menos de un mes",
    months: (n: string) => `${n} meses`,
    firstYear: "ROI del primer año",
    after: (setup: string, retainer: string) => `Tras ${setup} de implantación y ${retainer}/mes de cómputo de la plataforma.`,
    open: "Abrir el espacio del producto",
    withA: (n: string) => `Con ${n}`,
    before: "Antes: a mano",
  },
  he: {
    enginesTitle: "הכירו את המנועים",
    enginesBody: "כל שמונת המנועים בשפה פשוטה, כל אחד עם הדגמה של 30 שניות מהקלט, דרך החשיבה של הסוכנים ועד התוצאה, וההשפעה הטיפוסית שלו על היעילות.",
    archTitle: "הכירו את הארכיטקטורות",
    archBody: "עשרת המוצרים מרובי הסוכנים, עם השוואות לפני ואחרי ומחשבון ROI לצוות שלכם.",
    start: "התחלה",
    demo: "הדגמה של 30 שניות",
    disclaimer: "נתוני ההשפעה הם תוצאות טיפוסיות ממודל תפעולי להמחשה, לא התחייבות.",
    steps: ["קלט", "חשיבת הסוכן", "תוצאה"],
    walkthrough: (n: string) => `הדגמה של ${n}`,
    demoOf: (n: string) => `הדגמה של 30 שניות · ${n}`,
    close: "סגירה",
    next: "הבא",
    replay: "שוב",
    runReal: "להריץ באמת",
    arch: (n: string) => `ארכ׳ מס׳ ${n}`,
    archDisclaimer: "כל הנתונים מגיעים ממודל תפעולי להמחשה עבור צוות טיפוסי בשוק הבינוני. אלה הערכות, לא התחייבויות.",
    compare: "השוואת לפני ואחרי",
    roi: "מחשבון ROI וחיסכון",
    seats: "אנשים שעובדים בתחום הזה",
    hourly: "עלות מלאה לשעה",
    revenue: "הכנסה חודשית שהתחום הזה משפיע עליה",
    hoursSaved: "שעות שנחסכו / חודש",
    labor: "ערך העבודה / חודש",
    lift: (pct: number) => `תוספת הכנסה (${pct}%)`,
    net: "ערך נטו / חודש",
    payback: "החזר השקעה",
    notAtSize: "לא בגודל הזה",
    underMonth: "פחות מחודש",
    months: (n: string) => `${n} חודשים`,
    firstYear: "ROI בשנה הראשונה",
    after: (setup: string, retainer: string) => `אחרי הקמה של ${setup} ו־${retainer} לחודש על מחשוב הפלטפורמה.`,
    open: "פתיחת סביבת המוצר",
    withA: (n: string) => `עם ${n}`,
    before: "לפני: בדרך הידנית",
  },
} satisfies Record<Lang, unknown>;

/** /desk/explore: the educational hub's front door. */
export function ExploreHome() {
  const t = COPY[useCommandCopy().lang];
  const cards = [
    { href: "/desk/explore/engines", icon: Cpu, title: t.enginesTitle, body: t.enginesBody, painting: paintings[ENGINES.cortex.painting] },
    { href: "/desk/explore/architectures", icon: Boxes, title: t.archTitle, body: t.archBody, painting: paintings[ENGINES.apex.painting] },
  ];
  return (
    <OsPage route="/desk/explore">
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group relative isolate flex min-h-72 flex-col justify-end overflow-hidden rounded-2xl border border-os-line p-6 transition-[border-color,box-shadow] hover:border-os-cyan/40 hover:shadow-[0_0_60px_-24px_rgb(0_240_255/0.6)]">
            <Image src={c.painting.src} alt="" fill sizes="50vw" className="-z-10 object-cover opacity-40 transition-transform duration-1000 group-hover:scale-105" style={{ objectPosition: c.painting.focus }} />
            <div className="absolute inset-0 -z-10 bg-linear-to-t from-os-bg via-os-bg/70 to-transparent" />
            <c.icon className="size-6 text-os-cyan" />
            <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.02em] text-white">{c.title}</h2>
            <p className="mt-1.5 max-w-lg text-[14px] text-white/60">{c.body}</p>
            <span className="mt-4 flex items-center gap-1.5 text-[13px] text-os-cyan">
              {t.start} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
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
  const t = COPY[lang];
  const [open, setOpen] = useState<EngineKey | null>(null);
  return (
    <OsPage route="/desk/explore/engines">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ENGINE_ORDER.map((k) => {
          const e = localizeEngine(ENGINES[k], lang);
          const d = engineDemos(lang)[k];
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
                <Play className="size-3.5 rtl:-scale-x-100" /> {t.demo}
              </button>
            </article>
          );
        })}
      </div>
      <p className="mt-4 text-[11.5px] text-white/35">{t.disclaimer}</p>
      <AnimatePresence>{open && <EngineDemo key={open} engine={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </OsPage>
  );
}

const STEP_ICONS = [Keyboard, Brain, FileOutput] as const;

function EngineDemo({ engine, onClose }: { engine: EngineKey; onClose: () => void }) {
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const d = engineDemos(lang)[engine];
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  // In the thinking step, reasoning lines appear one by one, like a live agent.
  useEffect(() => {
    if (step !== 1) return;
    setShown(0);
    const iv = setInterval(() => setShown((n) => (n >= d.thoughts.length ? n : n + 1)), 900);
    return () => clearInterval(iv);
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
        aria-label={t.walkthrough(ENGINES[engine].name)}
        style={paletteVars(PALETTES[engine])}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 20, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.97 }}
        className="os-panel w-full max-w-2xl rounded-2xl p-6"
      >
        <p className="os-label text-c-2">{t.demoOf(ENGINES[engine].name)}</p>
        <ol className="mt-4 grid grid-cols-3 gap-2">
          {STEP_ICONS.map((Icon, i) => (
            <li key={i}>
              <button type="button" onClick={() => setStep(i)} className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-[12px]", i === step ? "border-c-1/60 bg-c-deep/70 text-white" : i < step ? "border-os-emerald/30 text-white/70" : "border-os-line text-white/40")}>
                <Icon className="size-3.5" /> {t.steps[i]}
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
              {d.thoughts.slice(0, shown).map((line) => (
                <motion.li key={line} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 text-[13px] text-white/75">
                  <Brain className="mt-0.5 size-3.5 shrink-0 text-c-2" />
                  <span className="font-mono text-[12.5px]">{line}</span>
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
            {t.close}
          </button>
          {step < 2 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="flex items-center gap-1.5 rounded-full bg-linear-to-r from-c-1 to-c-2 px-5 py-2 text-[13px] font-semibold text-black">
              {t.next} <ArrowRight className="size-4 rtl:-scale-x-100" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(0)} className="flex items-center gap-1.5 rounded-full border border-os-line px-4 py-2 text-[12.5px] text-white/70">
                <RotateCcw className="size-3.5" /> {t.replay}
              </button>
              <Link href={`/desk/engines/${engine}`} className="flex items-center gap-1.5 rounded-full bg-linear-to-r from-c-1 to-c-2 px-5 py-2 text-[13px] font-semibold text-black">
                {t.runReal} <ArrowUpRight className="size-4 rtl:-scale-x-100" />
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
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const archs = architecturesIn(lang);
  const [id, setId] = useState(ARCHITECTURES[1].id);
  const a = archs.find((x) => x.id === id)!;
  return (
    <OsPage route="/desk/explore/architectures">
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {archs.map((x, i) => (
          <button key={x.id} type="button" onClick={() => setId(x.id)} className={cn("shrink-0 rounded-lg border px-3 py-2 text-start", x.id === id ? "border-os-cyan/45 bg-os-cyan/[0.07]" : "border-os-line hover:border-os-cyan/25")}>
            <span className="block font-mono text-[9.5px] text-os-cyan/70">{t.arch(String(i + 1).padStart(2, "0"))}</span>
            <span className="block text-[12.5px] text-white">{x.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <BeforeAfter key={a.id} a={a} t={t} />
        <RoiCalculator key={`roi-${a.id}`} a={a} t={t} />
      </div>
      <p className="mt-4 text-[11.5px] text-white/35">{t.archDisclaimer}</p>
    </OsPage>
  );
}

type T = (typeof COPY)[Lang];

function BeforeAfter({ a, t }: { a: Architecture; t: T }) {
  const [split, setSplit] = useState(50);
  return (
    <section className="os-panel relative overflow-hidden rounded-2xl">
      <div className="relative h-[24rem] select-none" style={{ direction: "ltr" }}>
        <Side a={a} after={false} t={t} />
        {/* The "after" layer is revealed from the handle to the right edge. */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
          <Side a={a} after t={t} />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-os-cyan shadow-[0_0_14px_#00f0ff]" style={{ left: `${split}%` }}>
          <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-os-cyan bg-os-bg font-mono text-[10px] text-os-cyan">⇆</span>
        </div>
        <input type="range" min={5} max={95} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label={t.compare} className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
      </div>
    </section>
  );
}

function RoiCalculator({ a, t }: { a: Architecture; t: T }) {
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
        <Calculator className="size-3.5" /> {t.roi}
      </h2>
      <div className="mt-4 space-y-4">
        <Field label={t.seats} value={seats} min={1} max={60} step={1} fmt={(v) => String(v)} set={setSeats} />
        <Field label={t.hourly} value={hourly} min={20} max={250} step={5} fmt={(v) => `$${v}`} set={setHourly} />
        <Field label={t.revenue} value={revenue} min={20_000} max={5_000_000} step={20_000} fmt={usd} set={setRevenue} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-2">
        {[
          [t.hoursSaved, Math.round(hours).toLocaleString("en-US")],
          [t.labor, usd(labor)],
          [t.lift(a.impact.revenueLiftPct), usd(lift)],
          [t.net, usd(net)],
          [t.payback, payback === null ? t.notAtSize : payback < 1 ? t.underMonth : t.months(payback.toFixed(1))],
          [t.firstYear, `${Math.round(annualRoi)}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-os-line bg-black/25 px-3 py-2">
            <dt className="text-[10.5px] text-white/45">{k}</dt>
            <dd className="font-mono text-[16px] tabular-nums text-white">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11.5px] text-white/40">
        {t.after(usd(a.setup), usd(a.retainer))}{" "}
        <Link href={`/desk/architectures/${a.slug}`} className="text-os-cyan/80 hover:text-os-cyan">
          {t.open}
        </Link>
      </p>
    </section>
  );
}

/** One side of the before/after comparison. Module-level so the slider's re-renders don't remount it. */
function Side({ a, after, t }: { a: Architecture; after: boolean; t: T }) {
  return (
    // "After" anchors to the right edge, so dragging the handle left uncovers it.
    <div className={cn("absolute inset-0 flex flex-col justify-center gap-4 p-6", after ? "items-end bg-[radial-gradient(ellipse_at_70%_40%,rgb(52_245_181/0.12),transparent_70%)] bg-os-panel text-end" : "bg-[#120c0c]")}>
      <p className={cn("os-label", after ? "text-os-emerald" : "text-red-300/70")}>{after ? t.withA(a.name) : t.before}</p>
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
