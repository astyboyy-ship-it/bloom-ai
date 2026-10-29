"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Cpu, Layers, Rocket, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, type EngineKey } from "./command/engines";
import { PALETTES, paletteVars } from "./command/theme";
import { useI18n, type Lang } from "./i18n";
import { Accent, SectionHeading } from "./section-heading";

const EASE = [0.16, 1, 0.3, 1] as const;

/** A pre-packaged architecture: engines in the order data flows through them, with its deployment fee and retainer (USD). */
type Product = { id: string; name: string; engines: EngineKey[]; setup: number; retainer: number };

const PRODUCTS: Product[] = [
  { id: "inbound", name: "Inbound Signal Collector", engines: ["intentpulse", "sovereign"], setup: 25000, retainer: 4500 },
  { id: "outbound", name: "Autonomous Outbound Engine", engines: ["intentpulse", "vanguard", "apex"], setup: 35000, retainer: 7500 },
  { id: "fullfunnel", name: "Full-Funnel Closing Suite", engines: ["vanguard", "cortex", "aether"], setup: 45000, retainer: 12000 },
  { id: "retention", name: "Retention & Churn Shield", engines: ["shield", "aether", "sovereign"], setup: 30000, retainer: 6800 },
  { id: "executive", name: "Executive Authority Engine", engines: ["coreops", "shield", "sovereign"], setup: 25000, retainer: 5200 },
  { id: "pipeline", name: "Pipeline Acceleration Stack", engines: ["intentpulse", "vanguard", "cortex"], setup: 40000, retainer: 9500 },
  { id: "monetization", name: "Monetization Yield Optimizer", engines: ["cortex", "aether", "coreops"], setup: 35000, retainer: 8500 },
  { id: "postsale", name: "Post-Sale Expansion Suite", engines: ["shield", "aether", "cortex"], setup: 40000, retainer: 11000 },
  { id: "lifecycle", name: "Lifecycle Orchestration Stack", engines: ["intentpulse", "apex", "shield"], setup: 50000, retainer: 14500 },
  { id: "os", name: "The Sovereign Revenue OS", engines: ["intentpulse", "vanguard", "apex", "cortex", "aether", "coreops", "shield", "sovereign"], setup: 85000, retainer: 35000 },
];

const FLAGSHIP = "os";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const en = {
  kicker: "Architecture Nº",
  flagship: "Flagship · all 8 engines",
  enginesCount: (n: number) => `${n} engines`,
  setup: "One-time deployment",
  retainer: "Platform compute",
  perMonth: "/mo",
  inspect: "Inspect Architecture",
  close: "Close",
  dataFlow: "Data flow",
  passes: "Passes on",
  reports: "Reports to you",
  scope: "Setup scope",
  deploy: "Deploy Selected Architecture",
  note: "Prices in USD, excluding taxes. Final scope is confirmed on a discovery call before deployment.",
  scopeRows: (n: number, retainer: number): [string, string][] => [
    ["Vector DB seeding", `Your docs, CRM history and call records embedded for ${n} engines`],
    ["CRM webhook wiring", `${n * 3} webhooks wired into your CRM, billing and inbox`],
    ["Engine calibration", `${n} engines calibrated to your rules, limits and voice`],
    ["SLA guarantee", retainer >= 15000 ? "99.99% uptime · 1-hour response · named engineer" : retainer >= 7000 ? "99.95% uptime · 4-hour response" : "99.9% uptime · 8-hour response"],
    ["Go-live", n <= 2 ? "2 weeks" : n === 3 ? "3 to 4 weeks" : "6 to 8 weeks"],
  ],
  taglines: {
    inbound: "IntentPulse catches buyers describing your problem; Sovereign routes budget and approvals to the hottest ones.",
    outbound: "Buying signals feed Vanguard's outreach, and Apex works every reply until it's signed.",
    fullfunnel: "Vanguard opens the deals, Cortex closes them, and Aether makes sure each one is priced to win.",
    retention: "Shield spots churn early, Aether prices the save, and Sovereign signs off within your limits.",
    executive: "Back office, retention and governance run themselves, with every decision on the record.",
    pipeline: "From the first buying signal to a briefed closer in hours instead of weeks.",
    monetization: "Objection data reshapes your pricing, and CoreOps bills the new model the same day.",
    postsale: "Find the expansion, price it right and close it, inside your existing customer base.",
    lifecycle: "Catch the buyer, close the deal, keep the customer: one loop from signal to renewal.",
    os: "Every Bloom engine wired into one autonomous revenue operating system, governed by Sovereign.",
  } as Record<string, string>,
  handoff: {
    sovereign: "approved budgets, limits and final sign-off",
    apex: "won deals and signed terms",
    coreops: "onboarded accounts and synced billing data",
    intentpulse: "scored buying signals with deal value",
    vanguard: "booked meetings with full account research",
    cortex: "objection maps and closing briefs",
    shield: "account health scores and expansion openings",
    aether: "price sheets, packaging and discount rules",
  } as Record<EngineKey, string>,
};

type Copy = typeof en;

const es: Copy = {
  kicker: "Arquitectura Nº",
  flagship: "Insignia · los 8 motores",
  enginesCount: (n) => `${n} motores`,
  setup: "Despliegue único",
  retainer: "Cómputo de plataforma",
  perMonth: "/mes",
  inspect: "Inspeccionar la arquitectura",
  close: "Cerrar",
  dataFlow: "Flujo de datos",
  passes: "Entrega",
  reports: "Te informa a ti",
  scope: "Alcance de la puesta en marcha",
  deploy: "Desplegar esta arquitectura",
  note: "Precios en USD, sin impuestos. El alcance final se confirma en una llamada de descubrimiento antes del despliegue.",
  scopeRows: (n, retainer) => [
    ["Carga de la base vectorial", `Tus documentos, historial de CRM y llamadas indexados para ${n} motores`],
    ["Conexión de webhooks al CRM", `${n * 3} webhooks conectados a tu CRM, facturación y bandeja de entrada`],
    ["Calibración de motores", `${n} motores calibrados según tus reglas, límites y voz`],
    ["Garantía de SLA", retainer >= 15000 ? "99,99% de disponibilidad · respuesta en 1 hora · ingeniero asignado" : retainer >= 7000 ? "99,95% de disponibilidad · respuesta en 4 horas" : "99,9% de disponibilidad · respuesta en 8 horas"],
    ["Puesta en marcha", n <= 2 ? "2 semanas" : n === 3 ? "3 a 4 semanas" : "6 a 8 semanas"],
  ],
  taglines: {
    inbound: "IntentPulse detecta a compradores que describen tu problema; Sovereign dirige presupuesto y aprobaciones a los más calientes.",
    outbound: "Las señales de compra alimentan el outreach de Vanguard, y Apex trabaja cada respuesta hasta la firma.",
    fullfunnel: "Vanguard abre los acuerdos, Cortex los cierra y Aether se asegura de que cada uno tenga el precio para ganar.",
    retention: "Shield detecta el abandono a tiempo, Aether pone precio al rescate y Sovereign lo aprueba dentro de tus límites.",
    executive: "El back office, la retención y el gobierno funcionan solos, con cada decisión registrada.",
    pipeline: "De la primera señal de compra a un closer preparado, en horas en lugar de semanas.",
    monetization: "Los datos de objeciones rediseñan tus precios, y CoreOps factura el nuevo modelo ese mismo día.",
    postsale: "Encuentra la expansión, ponle el precio justo y ciérrala, dentro de tu base de clientes actual.",
    lifecycle: "Atrapa al comprador, cierra el acuerdo, conserva al cliente: un solo ciclo de la señal a la renovación.",
    os: "Todos los motores de Bloom conectados en un sistema operativo de ingresos autónomo, gobernado por Sovereign.",
  },
  handoff: {
    sovereign: "presupuestos aprobados, límites y visto bueno final",
    apex: "acuerdos ganados y condiciones firmadas",
    coreops: "cuentas incorporadas y datos de facturación sincronizados",
    intentpulse: "señales de compra puntuadas con su valor",
    vanguard: "reuniones agendadas con la investigación completa de la cuenta",
    cortex: "mapas de objeciones y briefs de cierre",
    shield: "salud de las cuentas y oportunidades de expansión",
    aether: "listas de precios, empaquetado y reglas de descuento",
  },
};

const he: Copy = {
  kicker: "ארכיטקטורה מס׳",
  flagship: "דגל · כל 8 המנועים",
  enginesCount: (n) => `${n} מנועים`,
  setup: "פריסה חד־פעמית",
  retainer: "כוח מחשוב לפלטפורמה",
  perMonth: "/חודש",
  inspect: "בחינת הארכיטקטורה",
  close: "סגירה",
  dataFlow: "זרימת הנתונים",
  passes: "מעביר הלאה",
  reports: "מדווח לכם",
  scope: "היקף ההקמה",
  deploy: "פרסו את הארכיטקטורה הזו",
  note: "המחירים בדולרים, לא כולל מיסים. ההיקף הסופי מאושר בשיחת היכרות לפני הפריסה.",
  scopeRows: (n, retainer) => [
    ["טעינת מסד הנתונים הווקטורי", `המסמכים, היסטוריית ה־CRM והשיחות שלכם מוטמעים עבור ${n} מנועים`],
    ["חיבור Webhooks ל־CRM", `${n * 3} Webhooks מחוברים ל־CRM, לחיוב ולתיבת הדואר שלכם`],
    ["כיול המנועים", `${n} מנועים מכוילים לחוקים, לגבולות ולקול שלכם`],
    ["התחייבות SLA", retainer >= 15000 ? "‏99.99% זמינות · מענה תוך שעה · מהנדס ייעודי" : retainer >= 7000 ? "‏99.95% זמינות · מענה תוך 4 שעות" : "‏99.9% זמינות · מענה תוך 8 שעות"],
    ["עלייה לאוויר", n <= 2 ? "שבועיים" : n === 3 ? "3 עד 4 שבועות" : "6 עד 8 שבועות"],
  ],
  taglines: {
    inbound: "IntentPulse תופס קונים שמתארים את הבעיה שלכם; Sovereign מנתב תקציב ואישורים לחמים ביותר.",
    outbound: "אותות קנייה מזינים את הפניות של Vanguard, ו־Apex עובד כל תגובה עד החתימה.",
    fullfunnel: "Vanguard פותח את העסקאות, Cortex סוגר אותן, ו־Aether דואג שכל אחת מתומחרת לניצחון.",
    retention: "Shield מזהה נטישה מוקדם, Aether מתמחר את ההצלה, ו־Sovereign מאשר בתוך הגבולות שלכם.",
    executive: "הבק־אופיס, השימור והמשילות מנהלים את עצמם, וכל החלטה מתועדת.",
    pipeline: "מאות הקנייה הראשון ועד סוגר מתודרך, בתוך שעות במקום שבועות.",
    monetization: "נתוני ההתנגדויות מעצבים מחדש את התמחור, ו־CoreOps מחייב לפי המודל החדש באותו יום.",
    postsale: "מצאו את ההרחבה, תמחרו אותה נכון וסגרו אותה, בתוך בסיס הלקוחות הקיים שלכם.",
    lifecycle: "לתפוס את הקונה, לסגור את העסקה, לשמור על הלקוח: לולאה אחת מהאות ועד החידוש.",
    os: "כל מנועי Bloom מחוברים למערכת הפעלה אוטונומית אחת להכנסות, בניהולו של Sovereign.",
  },
  handoff: {
    sovereign: "תקציבים מאושרים, גבולות ואישור סופי",
    apex: "עסקאות שנסגרו ותנאים חתומים",
    coreops: "חשבונות שנקלטו ונתוני חיוב מסונכרנים",
    intentpulse: "אותות קנייה מדורגים עם שווי העסקה",
    vanguard: "פגישות שנקבעו עם מחקר מלא על החשבון",
    cortex: "מפות התנגדויות ותדריכי סגירה",
    shield: "ציוני בריאות חשבונות והזדמנויות הרחבה",
    aether: "מחירונים, אריזה וחוקי הנחות",
  },
};

const COPY: Record<Lang, Copy> = { en, es, he };

/** The ten pre-packaged Bloom architectures, each a glass card with its live pipeline and pricing, and a drawer to inspect it. */
export function ProductTopologyGallery() {
  const { t, lang } = useI18n();
  const c = COPY[lang];
  const [open, setOpen] = useState<Product | null>(null);

  return (
    <section id="architectures" className="relative scroll-mt-16 px-4 py-32 sm:px-8 sm:py-44">
      <SectionHeading
        kanji="構築"
        eyebrow={t.architectures.eyebrow}
        title={
          <>
            {t.architectures.titlePre}
            <Accent>{t.architectures.titleAccent}</Accent>
          </>
        }
        description={t.architectures.description}
      />

      <ul className="mx-auto mt-20 grid max-w-6xl gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PRODUCTS.map((p, i) => (
          <motion.li
            key={p.id}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: (i % 3) * 0.1, ease: EASE }}
            className={cn(p.id === FLAGSHIP && "md:col-span-2 xl:col-span-3")}
          >
            <ProductCard product={p} n={i + 1} c={c} onInspect={() => setOpen(p)} />
          </motion.li>
        ))}
      </ul>
      <p className="mx-auto mt-6 max-w-6xl text-center text-[12px] text-white/40">{c.note}</p>

      <ArchitectureDrawer product={open} n={open ? PRODUCTS.indexOf(open) + 1 : 0} c={c} onClose={() => setOpen(null)} />
    </section>
  );
}

function EngineChip({ k }: { k: EngineKey }) {
  const e = ENGINES[k];
  return (
    <span style={paletteVars(PALETTES[k])} className="inline-flex items-center gap-1.5 rounded-full border border-c-2/35 bg-c-1/12 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-c-2">
      <span className="size-1.5 rounded-full bg-c-1 shadow-[0_0_8px_var(--c-glow)]" />
      {e.index} · {e.name}
    </span>
  );
}

function ProductCard({ product: p, n, c, onInspect }: { product: Product; n: number; c: Copy; onInspect: () => void }) {
  const flagship = p.id === FLAGSHIP;
  return (
    <article
      style={paletteVars(PALETTES[p.engines[0]])}
      className={cn(
        "glass group relative flex h-full flex-col overflow-hidden rounded-[28px] p-6 transition-shadow duration-700 sm:p-7",
        flagship
          ? "border-[#f0d59a]/30 shadow-[0_0_90px_-40px_rgb(243_212_143/0.8)] hover:shadow-[0_0_110px_-30px_rgb(243_212_143/0.9)]"
          : "shadow-[0_0_70px_-45px_var(--c-glow)] hover:shadow-[0_0_80px_-25px_var(--c-glow)]",
      )}
    >
      <div className={cn("pointer-events-none absolute -end-20 -top-24 size-64 rounded-full blur-3xl", flagship ? "bg-[#f0d59a]/10" : "bg-c-1/10")} />

      <div className="relative flex items-start justify-between gap-3">
        <p className={cn("font-mono text-[10px] uppercase tracking-[0.28em]", flagship ? "text-[#f0d59a]/85" : "text-c-2/85")}>
          {c.kicker} {String(n).padStart(2, "0")}
        </p>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{flagship ? c.flagship : c.enginesCount(p.engines.length)}</span>
      </div>
      <h3 className={cn("relative mt-3 font-display text-[28px] font-light leading-[1.05]", flagship ? "text-gold-metal sm:text-4xl" : "text-white")}>{p.name}</h3>
      <p className="relative mt-2 text-[13.5px] leading-relaxed text-white/60">{c.taglines[p.id]}</p>

      <div className="relative mt-5 flex flex-wrap gap-1.5">
        {p.engines.map((k) => (
          <EngineChip key={k} k={k} />
        ))}
      </div>

      <Pipeline engines={p.engines} className="relative mt-5" />

      {/* Pricing sits at the foot of the card, so cards in a row line up whatever their tagline length. */}
      <div className="relative mt-auto pt-5">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07]">
          <div className="bg-ink/70 p-4">
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">{c.setup}</dt>
            <dd className="mt-1.5 font-mono text-[19px] tabular-nums text-white">+{usd(p.setup)}</dd>
          </div>
          <div className="bg-ink/70 p-4">
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">{c.retainer}</dt>
            <dd className={cn("mt-1.5 font-mono text-[19px] tabular-nums", flagship ? "text-[#f3e2b8]" : "text-c-2")}>
              {usd(p.retainer)}
              <span className="text-[12px] text-white/45">{c.perMonth}</span>
            </dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={onInspect}
        className={cn(
          "relative mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl border font-mono text-[11px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          flagship ? "border-[#f0d59a]/40 bg-[#f0d59a]/10 text-[#f3e2b8] hover:bg-[#f0d59a]/20 focus-visible:outline-[#f0d59a]" : "border-c-1/45 bg-c-1/10 text-white/90 hover:bg-c-1/20 focus-visible:outline-c-2",
        )}
      >
        <Layers className="size-3.5" /> {c.inspect}
      </button>
    </article>
  );
}

/**
 * The engines as nodes on a glowing line, data packets travelling along it in pipeline order. Always drawn
 * left to right, like the flow it shows, whatever the page direction.
 */
function Pipeline({ engines, className }: { engines: EngineKey[]; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const W = 320;
  const pad = 18;
  const step = (W - pad * 2) / Math.max(1, engines.length - 1);
  const xs = engines.map((_, i) => pad + i * step);
  const path = `M${xs[0]} 22 L${xs[xs.length - 1]} 22`;
  const dur = 1.2 + engines.length * 0.35;

  return (
    <div dir="ltr" className={cn("rounded-2xl border border-white/[0.06] bg-black/30 px-2 py-3", className)}>
      <svg viewBox={`0 0 ${W} 44`} className="h-11 w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-line`} x1="0" x2="1" y1="0" y2="0">
            {engines.map((k, i) => (
              <stop key={k} offset={engines.length === 1 ? 0 : i / (engines.length - 1)} stopColor={PALETTES[k].c1} />
            ))}
          </linearGradient>
        </defs>
        <path d={path} stroke={`url(#${uid}-line)`} strokeOpacity={0.35} strokeWidth={2} fill="none" />
        <path d={path} stroke={`url(#${uid}-line)`} strokeWidth={1.5} strokeDasharray="3 7" fill="none">
          {!reduce && <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.9s" repeatCount="indefinite" />}
        </path>
        {!reduce &&
          [0, 1, 2].map((j) => (
            <circle key={j} r={2.6} fill="#fff" opacity={0.9}>
              <animateMotion dur={`${dur}s`} begin={`${(j * dur) / 3}s`} repeatCount="indefinite" path={path} />
              <animate attributeName="opacity" values="0;1;1;0" dur={`${dur}s`} begin={`${(j * dur) / 3}s`} repeatCount="indefinite" />
            </circle>
          ))}
        {engines.map((k, i) => {
          const pal = PALETTES[k];
          return (
            <g key={k} transform={`translate(${xs[i]} 22)`}>
              <circle r={11} fill={pal.c1} opacity={0.16} />
              <circle r={6.5} fill={pal.deep} stroke={pal.c1} strokeWidth={1.6} />
              <circle r={2.4} fill={pal.c2} />
              <text y={21} textAnchor="middle" className="fill-white/50 font-mono text-[8.5px]">
                {ENGINES[k].index}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** A full-height panel: the architecture's data flow node by node, its setup scope, pricing and the deploy CTA. */
function ArchitectureDrawer({ product: p, n, c, onClose }: { product: Product | null; n: number; c: Copy; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!p) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, onClose]);

  if (!mounted) return null;
  const flagship = p?.id === FLAGSHIP;

  // Portalled to the body so no transformed ancestor can trap the fixed panel.
  return createPortal(
    <AnimatePresence>
      {p && (
        <motion.div key="arch" className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="arch-title"
            style={paletteVars(PALETTES[p.engines[0]])}
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute bottom-0 right-0 top-0 flex h-dvh w-full flex-col overflow-hidden border-l border-white/10 bg-ink/90 text-white shadow-[0_0_120px_-30px_rgb(0_0_0/0.95)] outline-none backdrop-blur-xl sm:w-[520px]"
          >
            <header className="flex shrink-0 items-start gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className={cn("font-mono text-[10px] uppercase tracking-[0.26em]", flagship ? "text-[#f0d59a]/85" : "text-c-2/85")}>
                  {c.kicker} {String(n).padStart(2, "0")} · {flagship ? c.flagship : c.enginesCount(p.engines.length)}
                </p>
                <h2 id="arch-title" className={cn("mt-1.5 font-display text-[30px] font-light leading-tight", flagship ? "text-gold-metal" : "text-white")}>
                  {p.name}
                </h2>
              </div>
              <button type="button" onClick={onClose} aria-label={c.close} className="ms-auto rounded-md p-1.5 text-white/50 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-c-2">
                <X className="size-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <p className="text-[14px] leading-relaxed text-white/70">{c.taglines[p.id]}</p>
              <Pipeline engines={p.engines} />

              <section>
                <h3 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
                  <Cpu className="size-3.5" /> {c.dataFlow}
                </h3>
                <ol className="mt-3 space-y-2">
                  {p.engines.map((k, i) => {
                    const e = ENGINES[k];
                    const next = p.engines[i + 1];
                    return (
                      <motion.li
                        key={k}
                        style={paletteVars(PALETTES[k])}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease: EASE }}
                        className="flex gap-3 rounded-xl border border-c-edge/50 bg-black/40 p-3"
                      >
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-c-1/60 bg-c-deep font-mono text-[10px] text-c-2">{e.index}</span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium text-white">
                            {e.name} <span className="font-normal text-white/45">· {e.role}</span>
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-white/65">
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-c-2/90">{next ? `${c.passes} → ${ENGINES[next].name}` : c.reports}:</span> {c.handoff[k]}
                          </span>
                        </span>
                      </motion.li>
                    );
                  })}
                </ol>
              </section>

              <section>
                <h3 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
                  <Layers className="size-3.5" /> {c.scope}
                </h3>
                <dl className="mt-3 divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02]">
                  {c.scopeRows(p.engines.length, p.retainer).map(([k, v]) => (
                    <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{k}</dt>
                      <dd className="text-[13px] text-white/85">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07]">
                <div className="bg-ink p-4">
                  <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">{c.setup}</dt>
                  <dd className="mt-1.5 font-mono text-[22px] tabular-nums text-white">+{usd(p.setup)}</dd>
                </div>
                <div className="bg-ink p-4">
                  <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">{c.retainer}</dt>
                  <dd className={cn("mt-1.5 font-mono text-[22px] tabular-nums", flagship ? "text-[#f3e2b8]" : "text-c-2")}>
                    {usd(p.retainer)}
                    <span className="text-[12px] text-white/45">{c.perMonth}</span>
                  </dd>
                </div>
              </dl>
              <p className="text-[11.5px] text-white/40">{c.note}</p>
            </div>

            <footer className="shrink-0 border-t border-white/10 p-4 sm:px-6">
              {/* The waitlist picks up any "#waitlist" link and focuses its email field. */}
              <a
                href="#waitlist"
                data-intent="access"
                data-architecture={p.id}
                onClick={onClose}
                className={cn(
                  "group relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-semibold transition-shadow",
                  flagship ? "bg-[#f3e2b8] text-[#1a0f05] shadow-[0_0_50px_-12px_rgb(243_212_143/0.85)]" : "border border-c-1/60 bg-c-deep text-white shadow-[0_0_50px_-14px_var(--c-glow)] hover:shadow-[0_0_60px_-8px_var(--c-glow)]",
                )}
              >
                <Rocket className="size-4" /> {c.deploy}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
              </a>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
