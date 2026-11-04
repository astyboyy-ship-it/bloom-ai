"use client";

import { Fragment, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download, FlaskConical, History, Lock, Network, Scale, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { paintings } from "@/components/bloom/art/paintings";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { localizeEngine, useCommandCopy } from "@/components/bloom/command/locale";
import type { Lang } from "@/components/bloom/i18n";
import { localizeArchitecture } from "@/lib/architecture-text";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { DESK_COPY } from "@/components/desk/copy";
import { engineStatuses } from "@/components/desk/engine-status";
import { fmtMs } from "@/components/desk/format";
import { can } from "@/components/desk/rbac";
import { activeMember, audit, updateSettings, useDeskSettings, type ArchitectureRules } from "@/components/desk/settings";
import { useRun } from "@/components/desk/use-run";
import type { Architecture } from "@/lib/architectures";
import { MODELS, modelInfo, type ModelId } from "@/lib/engines/models";
import { useLicense } from "@/lib/license-context";
import { TIER_ENGINES, tierInfo, type Tier } from "@/lib/license/tiers";
import { DEFAULT_RULES, rulesFor } from "./architecture-rules";
import { Testbed } from "./testbed";
import { TopologyCanvas } from "./topology-canvas";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const COPY = {
  en: {
    all: "All architectures",
    kicker: (n: number, tier: string) => `Architecture product · ${n} engines · ${tier}`,
    pricing: (setup: string, retainer: string) => `${setup} setup · ${retainer}/mo`,
    requires: (name: string, tier: string) => `${name} requires ${tier}`,
    missing: (tier: string, names: string) => `Your ${tier} license doesn't include ${names}. Upgrade to deploy this product with its full topology, testbed and governance.`,
    upgrade: "Upgrade Architecture License",
    exploreRoi: "Explore its ROI",
    panels: { topology: "Node topology", testbed: "Simulation testbed", governance: "Rules & governance", history: "Audit history" } as Record<"topology" | "testbed" | "governance" | "history", string>,
    workspace: (n: string) => `${n} workspace`,
    running: "● Run in progress",
    every: "every action",
    engineNote: (role: string, model: string, tokens: string) => `${role}. Runs on ${model} with ${tokens} tokens of the stack budget; checks its own work before handing on.`,
    gateNote: (amt: string, always: boolean) => `Every action at or over ${amt}, or done by a person, waits for approval before delivery.${always ? " This product requires approval for every action." : ""}`,
    inputNote: "An input stream feeding the first engine.",
    outputNote: "Where the stack delivers its result.",
    close: "Close",
    typical: "Typical before → after (illustrative model)",
    runTestbed: "Run this architecture in the testbed",
    viewOnly: "Your role can view these rules but not change them.",
    rate: "Rate limits & budget caps",
    runsPerHour: "Runs per hour",
    budget: "Token budget per run (whole stack)",
    tokens: (n: string) => `${n} tokens`,
    split: (each: string, n: number) => `Split evenly: about ${each} output tokens for each of the ${n} engines (max 64,000 each).`,
    fallback: "Fallback LLM routing",
    primary: "Primary model",
    fallbackModel: "Fallback when the primary is overloaded",
    fallbackNote: "On OpenRouter the fallback joins the routing chain; on the Anthropic API a stage switches to it if the primary returns an overload or server error.",
    hitl: "Human-in-the-loop triggers",
    threshold: "Approval threshold",
    always: "Require approval for every action",
    memory: "Memory retention policy",
    remembers: "Recent results each engine remembers",
    off: "off",
    reset: (h: number, t: string) => `Reset this product to default governance (${h}/h, ${t} tokens)`,
    searchPh: "Search commands, summaries, run IDs, environments",
    searchLabel: "Search runs",
    cols: ["Time", "Run", "Environment", "Status", "Duration", "Tokens", "Command"],
    noMatch: "No runs match.",
    noRuns: "No runs yet. Run the testbed to start the history.",
    ok: "ok",
    failed: "failed",
    noSummary: "No summary recorded.",
  },
  es: {
    all: "Todas las arquitecturas",
    kicker: (n: number, tier: string) => `Producto de arquitectura · ${n} motores · ${tier}`,
    pricing: (setup: string, retainer: string) => `${setup} de implantación · ${retainer}/mes`,
    requires: (name: string, tier: string) => `${name} requiere ${tier}`,
    missing: (tier: string, names: string) => `Tu licencia ${tier} no incluye ${names}. Mejórala para desplegar este producto con su topología, banco de pruebas y gobierno completos.`,
    upgrade: "Mejorar la licencia de arquitectura",
    exploreRoi: "Ver su ROI",
    panels: { topology: "Topología de nodos", testbed: "Banco de pruebas", governance: "Reglas y gobierno", history: "Historial de auditoría" },
    workspace: (n: string) => `Espacio de ${n}`,
    running: "● Ejecución en curso",
    every: "toda acción",
    engineNote: (role: string, model: string, tokens: string) => `${role}. Funciona con ${model} y ${tokens} tokens del presupuesto del stack; revisa su propio trabajo antes de pasarlo.`,
    gateNote: (amt: string, always: boolean) => `Toda acción de ${amt} o más, o que deba hacer una persona, espera aprobación antes de entregarse.${always ? " Este producto exige aprobación para cada acción." : ""}`,
    inputNote: "Un flujo de entrada que alimenta al primer motor.",
    outputNote: "Donde el stack entrega su resultado.",
    close: "Cerrar",
    typical: "Antes → después típico (modelo ilustrativo)",
    runTestbed: "Ejecutar esta arquitectura en el banco de pruebas",
    viewOnly: "Tu rol puede ver estas reglas, pero no cambiarlas.",
    rate: "Límites de frecuencia y de presupuesto",
    runsPerHour: "Ejecuciones por hora",
    budget: "Presupuesto de tokens por ejecución (todo el stack)",
    tokens: (n: string) => `${n} tokens`,
    split: (each: string, n: number) => `Reparto equitativo: unos ${each} tokens de salida para cada uno de los ${n} motores (máximo 64.000 cada uno).`,
    fallback: "Enrutamiento de LLM de respaldo",
    primary: "Modelo principal",
    fallbackModel: "Respaldo cuando el principal está saturado",
    fallbackNote: "En OpenRouter el respaldo se suma a la cadena de enrutamiento; en la API de Anthropic una etapa cambia a él si el principal devuelve saturación o un error del servidor.",
    hitl: "Activadores de intervención humana",
    threshold: "Umbral de aprobación",
    always: "Exigir aprobación para cada acción",
    memory: "Política de retención de memoria",
    remembers: "Resultados recientes que recuerda cada motor",
    off: "desactivado",
    reset: (h: number, t: string) => `Restablecer el gobierno predeterminado de este producto (${h}/h, ${t} tokens)`,
    searchPh: "Busca órdenes, resúmenes, IDs de ejecución, entornos",
    searchLabel: "Buscar ejecuciones",
    cols: ["Hora", "Ejecución", "Entorno", "Estado", "Duración", "Tokens", "Orden"],
    noMatch: "Ninguna ejecución coincide.",
    noRuns: "Aún no hay ejecuciones. Usa el banco de pruebas para empezar el historial.",
    ok: "correcta",
    failed: "fallida",
    noSummary: "No hay resumen registrado.",
  },
  he: {
    all: "כל הארכיטקטורות",
    kicker: (n: number, tier: string) => `מוצר ארכיטקטורה · ${n} מנועים · ${tier}`,
    pricing: (setup: string, retainer: string) => `הקמה ${setup} · ${retainer} לחודש`,
    requires: (name: string, tier: string) => `${name} דורש ${tier}`,
    missing: (tier: string, names: string) => `הרישיון שלכם (${tier}) לא כולל את ${names}. שדרגו כדי לפרוס את המוצר עם הטופולוגיה, סביבת הבדיקה והמשילות המלאות.`,
    upgrade: "שדרוג רישיון הארכיטקטורה",
    exploreRoi: "בדיקת ה־ROI שלו",
    panels: { topology: "טופולוגיית צמתים", testbed: "סביבת בדיקה", governance: "כללים ומשילות", history: "היסטוריית ביקורת" },
    workspace: (n: string) => `סביבת העבודה של ${n}`,
    running: "● הרצה בתהליך",
    every: "כל פעולה",
    engineNote: (role: string, model: string, tokens: string) => `${role}. רץ על ${model} עם ${tokens} טוקנים מתקציב הסטאק; בודק את העבודה שלו לפני שהוא מעביר הלאה.`,
    gateNote: (amt: string, always: boolean) => `כל פעולה בסכום ${amt} ומעלה, או כזו שאדם צריך לבצע, ממתינה לאישור לפני המסירה.${always ? " המוצר הזה דורש אישור לכל פעולה." : ""}`,
    inputNote: "זרם קלט שמזין את המנוע הראשון.",
    outputNote: "המקום שבו הסטאק מוסר את התוצאה.",
    close: "סגירה",
    typical: "לפני ← אחרי טיפוסי (מודל להמחשה)",
    runTestbed: "הרצת הארכיטקטורה בסביבת הבדיקה",
    viewOnly: "התפקיד שלכם יכול לצפות בכללים אבל לא לשנות אותם.",
    rate: "מגבלות קצב ותקרות תקציב",
    runsPerHour: "הרצות לשעה",
    budget: "תקציב טוקנים להרצה (כל הסטאק)",
    tokens: (n: string) => `${n} טוקנים`,
    split: (each: string, n: number) => `חלוקה שווה: כ־${each} טוקני פלט לכל אחד מ־${n} המנועים (עד 64,000 לכל אחד).`,
    fallback: "ניתוב מודל חלופי",
    primary: "מודל ראשי",
    fallbackModel: "חלופה כשהמודל הראשי עמוס",
    fallbackNote: "ב־OpenRouter החלופה מצטרפת לשרשרת הניתוב; ב־API של Anthropic שלב עובר אליה אם הראשי מחזיר עומס או שגיאת שרת.",
    hitl: "טריגרים למעורבות אנושית",
    threshold: "סף אישור",
    always: "לדרוש אישור לכל פעולה",
    memory: "מדיניות שמירת זיכרון",
    remembers: "תוצאות אחרונות שכל מנוע זוכר",
    off: "כבוי",
    reset: (h: number, t: string) => `איפוס המוצר למשילות ברירת המחדל (${h} לשעה, ${t} טוקנים)`,
    searchPh: "חיפוש בפקודות, בסיכומים, במזהי הרצות ובסביבות",
    searchLabel: "חיפוש הרצות",
    cols: ["שעה", "הרצה", "סביבה", "סטטוס", "משך", "טוקנים", "פקודה"],
    noMatch: "אין הרצות תואמות.",
    noRuns: "עדיין אין הרצות. הריצו את סביבת הבדיקה כדי להתחיל את ההיסטוריה.",
    ok: "הצליחה",
    failed: "נכשלה",
    noSummary: "לא נרשם סיכום.",
  },
} satisfies Record<Lang, unknown>;
type WT = (typeof COPY)[Lang];

/** The lowest tier that unlocks every engine in a stack. */
export const tierFor = (engines: EngineKey[]): Tier => (["tier1", "tier2", "tier3"] as Tier[]).find((t) => engines.every((k) => TIER_ENGINES[t].includes(k))) ?? "tier3";

/** One architecture as a standalone product: topology, simulation testbed, governance and audit history. */
export function ArchitectureWorkspace({ a: base }: { a: Architecture }) {
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const a = localizeArchitecture(base, lang);
  const { engines: licensed, tier } = useLicense();
  const missing = a.engines.filter((k) => !licensed.includes(k));
  const lead = a.engines.at(-1)!;
  const p = paintings[ENGINES[lead].painting];

  return (
    <div style={paletteVars(PALETTES[lead])} className="flex-1">
      <section className="relative isolate overflow-hidden border-b border-os-line">
        <Image src={p.src} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-30" style={{ objectPosition: p.focus }} />
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-os-bg via-os-bg/85 to-os-bg/40" />
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
          <Link href="/desk/architectures" className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/50 hover:text-white">
            <ArrowLeft className="size-3.5 rtl:-scale-x-100" /> {t.all}
          </Link>
          <p className="os-label mt-4 text-os-cyan/80">{t.kicker(a.engines.length, tierInfo(lang)[tierFor(a.engines)].label)}</p>
          <h1 className="mt-1 text-[34px] font-semibold tracking-[-0.02em] text-white sm:text-[42px]">{a.name}</h1>
          <p className="mt-1.5 max-w-3xl text-[14.5px] text-white/65">{a.tagline}</p>
          <p className="mt-3 flex flex-wrap items-center gap-1.5">
            {a.engines.map((k, i) => (
              <span key={k} className="flex items-center gap-1.5">
                <span style={paletteVars(PALETTES[k])} className="rounded-full border border-c-edge/70 bg-c-deep/70 px-2.5 py-0.5 font-mono text-[10.5px] text-c-2">
                  {ENGINES[k].index} {ENGINES[k].name}
                </span>
                {i < a.engines.length - 1 && <span className="text-white/30">{lang === "he" ? "←" : "→"}</span>}
              </span>
            ))}
            <span className="ms-2 font-mono text-[11px] text-white/45">
              {t.pricing(usd(a.setup), usd(a.retainer))}
            </span>
          </p>
        </div>
      </section>

      {missing.length ? <ArchitectureLock a={a} missing={missing} tier={tier} t={t} lang={lang} /> : <Workspace a={a} t={t} />}
    </div>
  );
}

function ArchitectureLock({ a, missing, tier, t, lang }: { a: Architecture; missing: EngineKey[]; tier: Tier; t: WT; lang: Lang }) {
  const tiers = tierInfo(lang);
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="os-panel rounded-2xl p-6 text-center">
        <Lock className="mx-auto size-6 text-os-gold" />
        <h2 className="mt-3 text-[22px] font-semibold text-white">{t.requires(a.name, tiers[tierFor(a.engines)].label)}</h2>
        <p className="mt-2 text-[13.5px] text-white/55">{t.missing(tiers[tier].label, missing.map((k) => ENGINES[k].name).join(", "))}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/desk/settings#license" className="rounded-full bg-os-gold px-5 py-2 text-[13px] font-semibold text-black">
            {t.upgrade}
          </Link>
          <Link href="/desk/explore/architectures" className="rounded-full border border-os-line px-5 py-2 text-[13px] text-white/75 hover:text-white">
            {t.exploreRoi}
          </Link>
        </div>
      </div>
    </div>
  );
}

type Panel = "topology" | "testbed" | "governance" | "history";
const PANELS: { id: Panel; icon: typeof Network }[] = [
  { id: "topology", icon: Network },
  { id: "testbed", icon: FlaskConical },
  { id: "governance", icon: Scale },
  { id: "history", icon: History },
];

function Workspace({ a, t }: { a: Architecture; t: WT }) {
  const { lang } = useCommandCopy();
  const c = DESK_COPY[lang];
  const { settings } = useDeskSettings();
  const rules = rulesFor(settings.architectureRules, a.id);
  const r = useRun(c.networkError, c.aborted);
  const [panel, setPanel] = useState<Panel>("topology");
  const [picked, setPicked] = useState<{ kind: string; label: string; engine?: EngineKey } | null>(null);
  const statuses = useMemo(() => engineStatuses(r.state.agents), [r.state.agents]);
  const composing = r.state.phases.compose.status === "active";
  const spec = useMemo(() => ({ id: a.id, label: a.name, engines: a.engines }), [a]);

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
      <div role="tablist" aria-label={t.workspace(a.name)} className="flex flex-wrap gap-1.5">
        {PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={panel === p.id}
            onClick={() => setPanel(p.id)}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em]", panel === p.id ? "border-os-cyan/40 bg-os-cyan/[0.08] text-os-cyan" : "border-os-line text-white/55 hover:text-white")}
          >
            <p.icon className="size-3.5" /> {t.panels[p.id]}
          </button>
        ))}
        {r.state.status === "running" && <span className="ms-auto self-center font-mono text-[11px] text-os-cyan">{t.running}</span>}
      </div>

      {/* The topology stays visible above the testbed so the live run can be watched moving through the stack. */}
      {(panel === "topology" || panel === "testbed") && (
        <div className="os-panel mt-4 rounded-2xl p-3">
          <TopologyCanvas inputs={a.inputs} engines={a.engines} outputs={a.outputs} statuses={statuses} composing={composing} threshold={rules.requireApprovalAlways ? t.every : `≥ ${usd(rules.approvalThresholdUsd)}`} onPick={setPicked} />
          {picked && (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-xl border border-os-line bg-black/30 p-3 text-[12.5px]">
              <div>
                <p className="font-medium text-white">{picked.label}</p>
                <p className="text-white/55">
                  {picked.engine
                    ? t.engineNote(localizeEngine(ENGINES[picked.engine], lang).role, modelInfo(rules.model as ModelId).label, Math.floor(rules.budgetTokens / a.engines.length).toLocaleString("en-US"))
                    : picked.kind === "gate"
                      ? t.gateNote(usd(rules.approvalThresholdUsd), rules.requireApprovalAlways)
                      : picked.kind === "input"
                        ? t.inputNote
                        : t.outputNote}
                </p>
              </div>
              <button type="button" onClick={() => setPicked(null)} aria-label={t.close} className="text-white/40 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {panel === "topology" && (
          <div className="grid gap-3 sm:grid-cols-3">
            {a.impact.compare.map((m) => (
              <div key={m.label} className="os-panel rounded-xl p-4">
                <p className="os-label">{m.label}</p>
                <p className="mt-2 flex items-baseline gap-2 font-mono">
                  <span className="text-[15px] text-white/40 line-through">{m.before}</span>
                  <span className="text-[24px] text-os-emerald">{m.after}</span>
                  <span className="text-[11px] text-white/40">{m.unit}</span>
                </p>
                <p className="mt-1 text-[11px] text-white/35">{t.typical}</p>
              </div>
            ))}
            <button type="button" onClick={() => setPanel("testbed")} className="flex items-center justify-center gap-2 rounded-xl border border-os-cyan/40 bg-os-cyan/[0.06] p-4 text-[13px] text-os-cyan hover:bg-os-cyan/10 sm:col-span-3">
              <FlaskConical className="size-4" /> {t.runTestbed}
            </button>
          </div>
        )}
        {panel === "testbed" && <Testbed r={r} spec={spec} rules={rules} sample={a.sample} kind="architecture" />}
        {panel === "governance" && <Governance id={a.id} name={a.name} rules={rules} engines={a.engines} t={t} />}
        {panel === "history" && <RunHistory target={a.id} name={a.name} />}
      </div>
    </main>
  );
}

function Governance({ id, name, rules, engines, t }: { id: string; name: string; rules: ArchitectureRules; engines: EngineKey[]; t: WT }) {
  const { settings } = useDeskSettings();
  const allowed = can(activeMember(settings).role, "calibrate");
  const set = (patch: Partial<ArchitectureRules>) => updateSettings((s) => ({ architectureRules: { ...s.architectureRules, [id]: { ...rulesFor(s.architectureRules, id), ...patch } } }));
  const log = (what: string) => audit("calibration", `${name}: ${what}`);

  return (
    <fieldset disabled={!allowed} className="grid gap-4 disabled:opacity-60 lg:grid-cols-2">
      {!allowed && <p className="text-[12.5px] text-white/55 lg:col-span-2">{t.viewOnly}</p>}
      <div className="os-panel rounded-2xl p-5">
        <h3 className="os-label text-os-cyan/80">{t.rate}</h3>
        <Slider label={t.runsPerHour} value={rules.runsPerHour} min={1} max={120} step={1} fmt={(v) => `${v}`} onChange={(v) => set({ runsPerHour: v })} onCommit={(v) => log(`rate limit set to ${v} runs/hour`)} />
        <Slider label={t.budget} value={rules.budgetTokens} min={4000} max={240000} step={4000} fmt={(v) => t.tokens(v.toLocaleString("en-US"))} onChange={(v) => set({ budgetTokens: v })} onCommit={(v) => log(`stack budget set to ${v} tokens`)} />
        <p className="mt-2 text-[11.5px] text-white/40">{t.split(Math.floor(rules.budgetTokens / engines.length).toLocaleString("en-US"), engines.length)}</p>
      </div>
      <div className="os-panel rounded-2xl p-5">
        <h3 className="os-label text-os-cyan/80">{t.fallback}</h3>
        <ModelSelect
          label={t.primary}
          value={rules.model}
          onChange={(m) => {
            set({ model: m });
            log(`primary model set to ${modelInfo(m).label}`);
          }}
        />
        <ModelSelect
          label={t.fallbackModel}
          value={rules.fallbackModel}
          onChange={(m) => {
            set({ fallbackModel: m });
            log(`fallback model set to ${modelInfo(m).label}`);
          }}
        />
        <p className="mt-2 text-[11.5px] text-white/40">{t.fallbackNote}</p>
      </div>
      <div className="os-panel rounded-2xl p-5">
        <h3 className="os-label text-os-cyan/80">{t.hitl}</h3>
        <Slider label={t.threshold} value={rules.approvalThresholdUsd} min={0} max={500000} step={5000} fmt={usd} onChange={(v) => set({ approvalThresholdUsd: v })} onCommit={(v) => log(`approval threshold set to ${usd(v)}`)} />
        <label className="mt-4 flex items-center justify-between gap-3 text-[13px] text-white/75">
          {t.always}
          <input
            type="checkbox"
            checked={rules.requireApprovalAlways}
            onChange={(e) => {
              set({ requireApprovalAlways: e.target.checked });
              log(`approval for every action ${e.target.checked ? "on" : "off"}`);
            }}
            className="size-4 accent-[#00f0ff]"
          />
        </label>
      </div>
      <div className="os-panel rounded-2xl p-5">
        <h3 className="os-label text-os-cyan/80">{t.memory}</h3>
        <Slider label={t.remembers} value={rules.memoryRuns} min={0} max={10} step={1} fmt={(v) => (v ? `${v}` : t.off)} onChange={(v) => set({ memoryRuns: v })} onCommit={(v) => log(`memory retention set to ${v}`)} />
        <button
          type="button"
          onClick={() => {
            updateSettings((s) => {
              const { [id]: _drop, ...rest } = s.architectureRules;
              void _drop;
              return { architectureRules: rest };
            });
            log("governance reset to defaults");
          }}
          className="mt-4 text-[12px] text-white/45 hover:text-white/80"
        >
          {t.reset(DEFAULT_RULES.runsPerHour, DEFAULT_RULES.budgetTokens.toLocaleString("en-US"))}
        </button>
      </div>
    </fieldset>
  );
}

function Slider({ label, value, min, max, step, fmt, onChange, onCommit }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void; onCommit: (v: number) => void }) {
  return (
    <label className="mt-4 block">
      <span className="flex items-baseline justify-between text-[12.5px] text-white/70">
        {label}
        <span className="font-mono text-[13px] tabular-nums text-os-cyan">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} onPointerUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))} onKeyUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))} className="mt-2 w-full accent-[#00f0ff]" />
    </label>
  );
}

function ModelSelect({ label, value, onChange }: { label: string; value: string; onChange: (m: ModelId) => void }) {
  return (
    <label className="mt-4 block text-[12.5px] text-white/70">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as ModelId)} className="mt-1.5 w-full rounded-lg border border-os-line bg-os-panel px-3 py-2 text-[13px] text-white">
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} · {m.vendor}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Searchable history of this product's runs, exportable as CSV. */
export function RunHistory({ target, name }: { target: string; name: string }) {
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const { settings } = useDeskSettings();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const rows = settings.runs.filter((r) => r.target === target && (!q || `${r.command} ${r.summary} ${r.runId} ${r.env}`.toLowerCase().includes(q.toLowerCase()))).reverse();
  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [["run_id", "time", "environment", "status", "duration_ms", "input_tokens", "output_tokens", "command", "summary"].join(","), ...rows.map((r) => [r.runId, new Date(r.at).toISOString(), r.env, r.ok ? "ok" : "failed", r.ms, r.tokens.input, r.tokens.output, r.command, r.summary].map(esc).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `${target}-runs.csv` }).click();
    URL.revokeObjectURL(url);
    audit("run", `Exported ${rows.length} ${name} runs as CSV`);
  };
  return (
    <div className="os-panel rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-os-line bg-black/30 px-3 py-1.5">
          <Search className="size-4 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh} aria-label={t.searchLabel} className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 focus:outline-none" />
        </label>
        <button type="button" onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-1.5 rounded-full border border-os-cyan/40 px-3 py-1.5 text-[12px] text-os-cyan disabled:opacity-40">
          <Download className="size-3.5" /> CSV
        </button>
      </div>
      <table className="mt-3 w-full text-start text-[12.5px]">
        <thead>
          <tr className="os-label">
            {t.cols.map((h) => (
              <th key={h} className="border-b border-os-line py-2 pe-3 text-start font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-white/40">
                {q ? t.noMatch : t.noRuns}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <Fragment key={r.runId}>
              <tr onClick={() => setOpen(open === r.runId ? null : r.runId)} className="cursor-pointer border-b border-os-line/60 hover:bg-white/[0.02]">
                <td className="py-2 pe-3 font-mono text-[11px] text-white/50">{new Date(r.at).toLocaleString(lang)}</td>
                <td className="py-2 pe-3 font-mono text-[11px] text-os-cyan/80">{r.runId}</td>
                <td className="py-2 pe-3 text-white/60">{r.env}</td>
                <td className={cn("py-2 pe-3", r.ok ? "text-os-emerald" : "text-red-300")}>{r.ok ? t.ok : t.failed}</td>
                <td className="py-2 pe-3 font-mono text-[11px] text-white/60">{fmtMs(r.ms)}</td>
                <td className="py-2 pe-3 font-mono text-[11px] text-white/60">{(r.tokens.input + r.tokens.output).toLocaleString("en-US")}</td>
                <td dir="auto" className="max-w-xs truncate py-2 pe-3 text-white/70">{r.command}</td>
              </tr>
              {open === r.runId && (
                <tr>
                  <td colSpan={7} dir="auto" className="bg-black/30 p-3 text-[12.5px] leading-relaxed text-white/70">
                    {r.summary || t.noSummary}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

