"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Settings2 } from "lucide-react";
import { fmtUsdCompact } from "@/components/desk/format";
import { useMetricFeed } from "@/components/desk/metrics";
import type { Lang } from "../i18n";
import { LanguageSwitcher } from "../language-switcher";
import { paintings } from "../art/paintings";
import { BloomWordmark } from "../logo";
import { EngineStatus } from "./engine-status";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "./engines";
import { localizeEngine, useCommandCopy } from "./locale";
import { PALETTES, paletteVars } from "./theme";
import { EngineBadge } from "./tutorial";

/** What each engine does for an enterprise, in one sentence per language. */
const UTILITY: Record<Lang, Record<EngineKey, string>> = {
  en: {
    sovereign: "Governs budgets, approvals and access for every engine, and routes each command to the engines that own it.",
    apex: "Moves live deals to signature: scores deal velocity, sets the negotiation envelope and writes tiered proposals.",
    coreops: "Keeps CRM, billing and project tools in sync and strips manual steps out of back-office workflows.",
    intentpulse: "Finds buyers describing your exact problem in public, scores their intent and routes the hottest in seconds.",
    vanguard: "Opens outbound pipeline: ranks in-market accounts by live triggers and runs multi-channel sequences.",
    cortex: "Finds where deals stall and arms closers with objection answers, battlecards and risk reads.",
    shield: "Spots accounts about to churn weeks early, runs the rescue play and flags the healthiest for expansion.",
    aether: "Finds what customers will really pay, polices discounts and prices the expansion that grows contract value.",
  },
  es: {
    sovereign: "Gobierna presupuestos, aprobaciones y accesos de todos los motores, y dirige cada orden al motor que la posee.",
    apex: "Lleva los acuerdos a la firma: mide su velocidad, fija el margen de negociación y redacta propuestas por niveles.",
    coreops: "Mantiene sincronizados CRM, facturación y herramientas de proyecto, y elimina pasos manuales del back-office.",
    intentpulse: "Encuentra compradores que describen tu problema en público, puntúa su intención y deriva a los más calientes en segundos.",
    vanguard: "Abre pipeline outbound: prioriza cuentas en mercado por disparadores reales y ejecuta secuencias multicanal.",
    cortex: "Detecta dónde se estancan los acuerdos y arma a los cerradores con respuestas, battlecards y lecturas de riesgo.",
    shield: "Detecta con semanas de antelación las cuentas a punto de irse, ejecuta el rescate y señala las más sanas para crecer.",
    aether: "Descubre cuánto pagarían de verdad tus clientes, controla los descuentos y pone precio a la expansión.",
  },
  he: {
    sovereign: "שולט בתקציבים, באישורים ובהרשאות של כל המנועים, ומנתב כל פקודה למנוע שאחראי עליה.",
    apex: "מוביל עסקאות חיות לחתימה: מודד את קצב העסקה, קובע את מעטפת המשא ומתן וכותב הצעות בשלוש רמות.",
    coreops: "שומר על סנכרון בין ה-CRM, החיוב וכלי ניהול הפרויקטים, ומסיר צעדים ידניים מתהליכי הבק-אופיס.",
    intentpulse: "מוצא קונים שמתארים בפומבי בדיוק את הבעיה שאתם פותרים, מדרג את כוונת הרכישה ומעביר את החמים ביותר תוך שניות.",
    vanguard: "פותח פייפליין יוצא: מדרג חשבונות לפי טריגרים חיים ומריץ רצפי פנייה בכמה ערוצים.",
    cortex: "מזהה איפה עסקאות נתקעות ומצייד את הסוגרים בתשובות להתנגדויות, כרטיסי קרב וקריאת סיכון.",
    shield: "מזהה שבועות מראש חשבונות שעומדים לעזוב, מריץ את תוכנית ההצלה ומסמן את הבריאים ביותר להרחבה.",
    aether: "מגלה כמה הלקוחות באמת מוכנים לשלם, אוכף את מדיניות ההנחות ומתמחר את ההרחבה שמגדילה את ערך החוזה.",
  },
};

const COPY: Record<Lang, { title: string; sub: string; enter: string; guided: string; metricNote: string; desk: string }> = {
  en: {
    title: "Command Center",
    sub: "Eight engines, one operating system. Enter any engine's desk to command it live, or run its guided setup.",
    enter: "Enter Engine Desk",
    guided: "Guided setup",
    metricNote: "Metric previews are sample data.",
    desk: "Open the full desk",
  },
  es: {
    title: "Centro de Mando",
    sub: "Ocho motores, un sistema operativo. Entra en la mesa de cualquier motor para darle órdenes en vivo, o usa su configuración guiada.",
    enter: "Entrar a la mesa del motor",
    guided: "Configuración guiada",
    metricNote: "Las métricas mostradas son datos de muestra.",
    desk: "Abrir la mesa completa",
  },
  he: {
    title: "מרכז הפיקוד",
    sub: "שמונה מנועים, מערכת הפעלה אחת. היכנסו לשולחן של כל מנוע כדי לפקד עליו בזמן אמת, או הריצו את ההגדרה המודרכת שלו.",
    enter: "כניסה לשולחן המנוע",
    guided: "הגדרה מודרכת",
    metricNote: "המדדים המוצגים הם נתוני דוגמה.",
    desk: "פתיחת השולחן המלא",
  },
};

/** The classic Command Center: all eight engines as painted cards, each opening its own desk. */
export function EngineGrid() {
  const { lang, dir, c } = useCommandCopy();
  const g = COPY[lang];
  const metrics = useMetricFeed();
  return (
    <div lang={lang} dir={dir} className="relative isolate min-h-dvh bg-ink px-4 py-10 font-sans text-white sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgb(255_189_110/0.09),transparent_55%)]" />
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="rounded focus-visible:outline-2 focus-visible:outline-[#f0d59a]">
            <BloomWordmark className="text-[26px]" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/desk"
              className="hidden items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-[12.5px] text-white/75 transition-colors hover:border-[#f0d59a]/50 hover:text-white sm:inline-flex"
            >
              {g.desk} <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.32em] text-[#f0d59a]/80">{c.pickerTitle}</p>
        <h1 className="mt-2 font-display text-[44px] font-light leading-tight sm:text-[60px]">{g.title}</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-white/55">{g.sub}</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {ENGINE_ORDER.map((k) => {
            const e = localizeEngine(ENGINES[k], lang);
            const p = paintings[e.painting];
            return (
              <article key={k} style={paletteVars(PALETTES[k])} className="group relative flex min-h-[27rem] flex-col overflow-hidden rounded-2xl border border-c-edge/60 shadow-[0_0_60px_-30px_var(--c-glow)]">
                <Image src={p.src} alt={`${p.title} by ${p.artist}, ${p.year}`} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-105" style={{ objectPosition: p.focus }} />
                <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/45 to-black/10" />
                <div className="relative flex items-start justify-between gap-2 p-4">
                  <p className="rounded-full border border-c-edge/60 bg-black/60 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.24em] text-c-2 backdrop-blur-md" dir="ltr">
                    {e.index} {e.name}
                  </p>
                  <EngineStatus engine={k} />
                </div>
                <div className="relative mt-auto p-3">
                  <div className="rounded-xl border border-c-edge/50 bg-black/60 p-4 backdrop-blur-md">
                    <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-c-2/90">
                      {c.engineNo} {e.index}
                      {e.badge && <EngineBadge>{e.badge}</EngineBadge>}
                    </p>
                    <h2 className="mt-1 font-logo text-[26px] font-medium leading-none tracking-[-0.03em]">{e.name}</h2>
                    <p className="mt-1 text-[13px] text-white/65">{e.role}</p>
                    <p className="mt-2 text-[12.5px] leading-snug text-white/50">{UTILITY[lang][k]}</p>
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.08] pt-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/45">{e.metric}</p>
                        <p className="font-mono text-[18px] tabular-nums text-c-2">{fmtUsdCompact(metrics[k])}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/command/${k}`}
                          aria-label={`${g.guided}: ${e.name}`}
                          title={g.guided}
                          className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white/65 transition-colors hover:border-c-edge hover:text-white focus-visible:outline-2 focus-visible:outline-c-2"
                        >
                          <Settings2 className="size-4" />
                        </Link>
                        <Link
                          href={`/desk?engine=${k}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-c-1 to-c-2 px-4 py-2 text-[12.5px] font-semibold text-black shadow-[0_0_30px_-8px_var(--c-glow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-2"
                        >
                          {g.enter} <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-center text-[11.5px] text-white/35">{g.metricNote}</p>
      </div>
    </div>
  );
}
