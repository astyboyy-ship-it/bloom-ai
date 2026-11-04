"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, GitBranch, GitCommitHorizontal, History, RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { can } from "@/components/desk/rbac";
import { useCommandCopy } from "@/components/bloom/command/locale";
import type { Lang } from "@/components/bloom/i18n";
import { activeMember, checkoutBranch, forkMemory, rollbackMemory, useDeskSettings, verifySnapshots, type MemorySnapshot } from "@/components/desk/settings";

const COL = 46;
const LANE = 34;

const COPY = {
  en: {
    title: "Temporal memory · time-travel",
    broken: (n: number) => `${n} snapshot${n > 1 ? "s" : ""} fail verification`,
    verified: (n: number) => `${n} snapshots hash-verified`,
    engineTimeline: "Engine timeline",
    noHistory: " (no history)",
    empty: (name: string) => `No snapshots for ${name} yet. Every memory change (a completed run, seeding, forgetting, clearing) is committed here as a snapshot you can roll back to or fork. Seed some context below, or complete a run.`,
    branches: "Branches",
    head: "head",
    checkedOut: "Checked out",
    checkOut: (b: string) => `Check out ${b}`,
    timeline: (name: string) => `${name} memory timeline`,
    memories: (n: number) => `${n} memories`,
    parent: "parent",
    none: "none",
    thoughtState: (n: number) => `Thought-state (${n} memories)`,
    emptyState: "Empty: the engine starts without retained context.",
    rollback: "[ Rollback to node ]",
    rollbackNote: (name: string) => `Re-hydrates ${name}'s context to this snapshot. The rollback is itself a new snapshot, so nothing after it is lost.`,
    fork: "Fork a what-if branch",
    branchPh: "Branch name, e.g. recession-q1",
    branchLabel: "Branch name",
    scenarioPh: "Scenario premise, e.g. Competitor cuts list price 30% in EMEA",
    scenarioLabel: "Scenario premise",
    forkFrom: (id: string) => `Fork from ${id}`,
    runOn: (name: string) => `Run ${name} on the checked-out branch`,
    labels: { baseline: "Baseline", cleared: "Memory cleared", retained: (n: number) => `Retained ${n} result${n > 1 ? "s" : ""}`, forgot: (n: number) => `Forgot ${n} memor${n > 1 ? "ies" : "y"}`, mixed: (a: string, r: string) => `+${a} / -${r} memories`, rollback: (id: string) => `Rollback to ${id}`, forkScenario: (x: string) => `Fork: ${x}`, forkFrom: (id: string) => `Fork from ${id}` },
  },
  es: {
    title: "Memoria temporal · viaje en el tiempo",
    broken: (n: number) => `${n} instantánea${n > 1 ? "s" : ""} no supera${n > 1 ? "n" : ""} la verificación`,
    verified: (n: number) => `${n} instantáneas verificadas por hash`,
    engineTimeline: "Línea temporal del motor",
    noHistory: " (sin historial)",
    empty: (name: string) => `Todavía no hay instantáneas de ${name}. Cada cambio de memoria (una ejecución completada, sembrar, olvidar, borrar) se guarda aquí como una instantánea a la que puedes volver o desde la que puedes bifurcar. Siembra contexto abajo o completa una ejecución.`,
    branches: "Ramas",
    head: "actual",
    checkedOut: "Activa",
    checkOut: (b: string) => `Activar ${b}`,
    timeline: (name: string) => `Línea temporal de la memoria de ${name}`,
    memories: (n: number) => `${n} recuerdos`,
    parent: "origen",
    none: "ninguno",
    thoughtState: (n: number) => `Estado mental (${n} recuerdos)`,
    emptyState: "Vacío: el motor empieza sin contexto guardado.",
    rollback: "[ Volver a este nodo ]",
    rollbackNote: (name: string) => `Restaura el contexto de ${name} a esta instantánea. La vuelta atrás es en sí una instantánea nueva, así que no se pierde nada posterior.`,
    fork: "Bifurcar un escenario hipotético",
    branchPh: "Nombre de la rama, p. ej. recesion-t1",
    branchLabel: "Nombre de la rama",
    scenarioPh: "Premisa del escenario, p. ej. Un competidor baja su precio un 30% en EMEA",
    scenarioLabel: "Premisa del escenario",
    forkFrom: (id: string) => `Bifurcar desde ${id}`,
    runOn: (name: string) => `Ejecutar ${name} en la rama activa`,
    labels: { baseline: "Punto de partida", cleared: "Memoria borrada", retained: (n: number) => `${n} resultado${n > 1 ? "s" : ""} guardado${n > 1 ? "s" : ""}`, forgot: (n: number) => `${n} recuerdo${n > 1 ? "s" : ""} olvidado${n > 1 ? "s" : ""}`, mixed: (a: string, r: string) => `+${a} / -${r} recuerdos`, rollback: (id: string) => `Vuelta a ${id}`, forkScenario: (x: string) => `Bifurcación: ${x}`, forkFrom: (id: string) => `Bifurcación desde ${id}` },
  },
  he: {
    title: "זיכרון בזמן · מסע בזמן",
    broken: (n: number) => (n > 1 ? `${n} תמונות מצב נכשלו באימות` : "תמונת מצב אחת נכשלה באימות"),
    verified: (n: number) => `${n} תמונות מצב אומתו בגיבוב`,
    engineTimeline: "ציר הזמן של המנוע",
    noHistory: " (אין היסטוריה)",
    empty: (name: string) => `עדיין אין תמונות מצב עבור ${name}. כל שינוי בזיכרון (הרצה שהושלמה, הזנה, מחיקה, איפוס) נשמר כאן כתמונת מצב שאפשר לחזור אליה או להתפצל ממנה. הזינו הקשר למטה או השלימו הרצה.`,
    branches: "ענפים",
    head: "נוכחי",
    checkedOut: "פעיל",
    checkOut: (b: string) => `מעבר ל־${b}`,
    timeline: (name: string) => `ציר הזמן של הזיכרון של ${name}`,
    memories: (n: number) => `${n} זיכרונות`,
    parent: "מקור",
    none: "אין",
    thoughtState: (n: number) => `מצב מחשבתי (${n} זיכרונות)`,
    emptyState: "ריק: המנוע מתחיל בלי הקשר שמור.",
    rollback: "[ חזרה לצומת ]",
    rollbackNote: (name: string) => `מחזיר את ההקשר של ${name} לתמונת המצב הזו. החזרה עצמה נשמרת כתמונת מצב חדשה, כך ששום דבר שאחריה לא הולך לאיבוד.`,
    fork: "פיצול ענף ״מה אם״",
    branchPh: "שם הענף, למשל recession-q1",
    branchLabel: "שם הענף",
    scenarioPh: "הנחת התרחיש, למשל מתחרה מוריד מחיר ב־30% באירופה",
    scenarioLabel: "הנחת התרחיש",
    forkFrom: (id: string) => `פיצול מ־${id}`,
    runOn: (name: string) => `הרצת ${name} על הענף הפעיל`,
    labels: { baseline: "נקודת התחלה", cleared: "הזיכרון אופס", retained: (n: number) => (n > 1 ? `נשמרו ${n} תוצאות` : "נשמרה תוצאה אחת"), forgot: (n: number) => (n > 1 ? `נמחקו ${n} זיכרונות` : "נמחק זיכרון אחד"), mixed: (a: string, r: string) => `+${a} / -${r} זיכרונות`, rollback: (id: string) => `חזרה ל־${id}`, forkScenario: (x: string) => `פיצול: ${x}`, forkFrom: (id: string) => `פיצול מ־${id}` },
  },
} satisfies Record<Lang, unknown>;

/** Snapshot labels are stored in English; this words them in the current language. */
function snapLabel(label: string, t: (typeof COPY)[Lang]): string {
  const L = t.labels;
  let m: RegExpMatchArray | null;
  if (label === "Baseline") return L.baseline;
  if (label === "Memory cleared") return L.cleared;
  if ((m = label.match(/^Retained (\d+) result/))) return L.retained(Number(m[1]));
  if ((m = label.match(/^Forgot (\d+) memor/))) return L.forgot(Number(m[1]));
  if ((m = label.match(/^\+(\d+) \/ -(\d+) memories$/))) return L.mixed(m[1], m[2]);
  if ((m = label.match(/^Rollback to (\w+)$/))) return L.rollback(m[1]);
  if ((m = label.match(/^Fork from (\w+)$/))) return L.forkFrom(m[1]);
  if ((m = label.match(/^Fork: (.*)$/))) return L.forkScenario(m[1]);
  return label;
}

/**
 * Temporal memory: each engine's memory as a commit graph. Every change is a snapshot; operators can inspect any
 * node, roll back to it (recorded as a new snapshot, so history is never lost) or fork a what-if branch.
 */
export function MemoryTimeline() {
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const { settings } = useDeskSettings();
  const mayEdit = can(activeMember(settings).role, "calibrate");
  const withHistory = ENGINE_ORDER.filter((k) => settings.memorySnapshots.some((x) => x.engine === k));
  const [engine, setEngine] = useState<EngineKey | null>(null);
  const k = engine ?? withHistory[0] ?? "apex";
  const snaps = useMemo(() => settings.memorySnapshots.filter((x) => x.engine === k), [settings.memorySnapshots, k]);
  const head = settings.memoryHeads[k];
  const [picked, setPicked] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [scenario, setScenario] = useState("");
  const broken = useMemo(() => new Set(verifySnapshots(settings.memorySnapshots)), [settings.memorySnapshots]);

  const branches = [...new Set(snaps.map((x) => x.branch))];
  const lane = (b: string) => branches.indexOf(b);
  const pos = new Map(snaps.map((x, i) => [x.id, { x: 24 + i * COL, y: 22 + lane(x.branch) * LANE }]));
  const width = Math.max(320, 48 + (snaps.length - 1) * COL);
  const height = 44 + (branches.length - 1) * LANE;
  const sel = snaps.find((x) => x.id === picked) ?? snaps.find((x) => x.id === head) ?? snaps.at(-1);
  const parent = sel && snaps.find((x) => x.id === sel.parent);
  const headSnap = snaps.find((x) => x.id === head);

  const fork = (from: MemorySnapshot) => {
    const name = (branchName.trim() || `what-if-${branches.length}`).toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 32);
    forkMemory(from.id, branches.includes(name) ? `${name}-${Date.now().toString(36).slice(-3)}` : name, scenario);
    setBranchName("");
    setScenario("");
    setPicked(null);
  };

  return (
    <section style={paletteVars(PALETTES[k])} className="os-panel mt-4 rounded-2xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-os-line px-4 py-2.5">
        <p className="os-label flex items-center gap-2 text-white/60">
          <History className="size-3.5 text-os-cyan" /> {t.title}
        </p>
        <span className={cn("flex items-center gap-1 font-mono text-[10.5px]", broken.size ? "text-red-300" : "text-os-emerald/80")}>
          {broken.size ? <ShieldX className="size-3" /> : <ShieldCheck className="size-3" />}
          {broken.size ? t.broken(broken.size) : t.verified(settings.memorySnapshots.length)}
        </span>
        <select value={k} onChange={(e) => { setEngine(e.target.value as EngineKey); setPicked(null); }} aria-label={t.engineTimeline} className="ms-auto rounded-lg border border-os-line bg-os-panel px-2.5 py-1.5 text-[12.5px] text-white">
          {ENGINE_ORDER.map((e) => (
            <option key={e} value={e}>
              {ENGINES[e].name}
              {withHistory.includes(e) ? "" : t.noHistory}
            </option>
          ))}
        </select>
      </div>

      {snaps.length === 0 ? (
        <p className="px-4 py-6 text-[12.5px] text-white/45">
          {t.empty(ENGINES[k].name)}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
            <span className="os-label me-1">{t.branches}</span>
            {branches.map((b) => {
              const on = headSnap?.branch === b;
              return (
                <button key={b} type="button" disabled={!mayEdit || on} onClick={() => checkoutBranch(k, b)} title={on ? t.checkedOut : t.checkOut(b)} className={cn("flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px]", on ? "border-c-edge/60 bg-c-deep/40 text-c-2" : "border-os-line text-white/55 hover:text-white disabled:opacity-50")}>
                  <GitBranch className="size-3" /> {b}
                  {on && <span className="text-[9px] uppercase">· {t.head}</span>}
                </button>
              );
            })}
          </div>
          <div className="overflow-x-auto px-4 py-3">
            <svg width={width} height={height} role="group" aria-label={t.timeline(ENGINES[k].name)} style={{ direction: "ltr" }}>
              {snaps.map((x) => {
                const p = pos.get(x.id)!;
                const q = x.parent ? pos.get(x.parent) : undefined;
                if (!q) return null;
                return <path key={`e-${x.id}`} d={q.y === p.y ? `M${q.x},${q.y}L${p.x},${p.y}` : `M${q.x},${q.y}C${q.x + COL / 2},${q.y} ${p.x - COL / 2},${p.y} ${p.x},${p.y}`} fill="none" stroke="var(--c-1)" strokeOpacity={0.5} strokeWidth={1.5} />;
              })}
              {snaps.map((x) => {
                const p = pos.get(x.id)!;
                const isHead = x.id === head;
                const isSel = x.id === sel?.id;
                return (
                  <g key={x.id} onClick={() => setPicked(x.id)} className="cursor-pointer">
                    {isHead && <circle cx={p.x} cy={p.y} r={11} fill="none" stroke="#00f0ff" strokeWidth={1.5} className="motion-safe:animate-pulse" />}
                    <circle cx={p.x} cy={p.y} r={isSel ? 7 : 5.5} fill={broken.has(x.id) ? "#f87171" : x.label.startsWith("Rollback") ? "#07080c" : "var(--c-1)"} stroke={isSel ? "white" : "var(--c-2)"} strokeWidth={x.label.startsWith("Rollback") ? 2 : 1.5} />
                    <title>{`${snapLabel(x.label, t)} · ${new Date(x.at).toLocaleString(lang)} · ${t.memories(x.memory.length)}`}</title>
                  </g>
                );
              })}
            </svg>
          </div>

          {sel && (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-os-line p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium text-white">
                  <GitCommitHorizontal className="size-4 text-c-2" /> {snapLabel(sel.label, t)}
                  {sel.id === head && <span className="rounded border border-os-cyan/40 px-1.5 font-mono text-[9.5px] uppercase text-os-cyan">{t.head}</span>}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] text-white/40">
                  {sel.id.slice(0, 7)} · {sel.branch} · {new Date(sel.at).toLocaleString(lang)} · {t.parent} {sel.parent?.slice(0, 7) ?? t.none}
                </p>
                <p className="mt-0.5 break-all font-mono text-[10px] text-white/30">sha256 {sel.hash}</p>
                <p className="os-label mt-3">{t.thoughtState(sel.memory.length)}</p>
                <ul className="mt-1.5 max-h-56 space-y-1 overflow-y-auto">
                  {sel.memory.length === 0 && <li className="text-[12px] text-white/40">{t.emptyState}</li>}
                  {sel.memory.map((m, i) => {
                    const added = parent && !parent.memory.includes(m);
                    return (
                      <li key={i} dir="auto" className={cn("rounded-md border px-2 py-1 text-[12px]", added ? "border-os-emerald/30 bg-os-emerald/[0.05] text-white/85" : "border-white/[0.06] text-white/60")}>
                        {added && <span className="me-1 font-mono text-os-emerald">+</span>}
                        {m}
                      </li>
                    );
                  })}
                  {parent?.memory.filter((m) => !sel.memory.includes(m)).map((m, i) => (
                    <li key={`r${i}`} dir="auto" className="rounded-md border border-red-400/20 bg-red-500/[0.04] px-2 py-1 text-[12px] text-white/40 line-through">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>

              <fieldset disabled={!mayEdit} className="space-y-3 disabled:opacity-50">
                <button type="button" disabled={sel.id === head} onClick={() => rollbackMemory(sel.id)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-os-cyan/50 bg-os-cyan/[0.06] px-4 py-2.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-os-cyan transition-colors hover:bg-os-cyan/15 disabled:opacity-40">
                  <RotateCcw className="size-4" /> {t.rollback}
                </button>
                <p className="text-[11.5px] text-white/40">{t.rollbackNote(ENGINES[k].name)}</p>
                <div className="rounded-xl border border-os-line p-3">
                  <p className="os-label flex items-center gap-1.5">
                    <GitBranch className="size-3.5" /> {t.fork}
                  </p>
                  <input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder={t.branchPh} aria-label={t.branchLabel} className="mt-2 w-full rounded-lg border border-os-line bg-black/40 px-2.5 py-1.5 font-mono text-[12px] text-white placeholder:text-white/25 focus:border-os-cyan/50 focus:outline-none" />
                  <textarea value={scenario} onChange={(e) => setScenario(e.target.value)} rows={2} placeholder={t.scenarioPh} aria-label={t.scenarioLabel} className="mt-1.5 w-full resize-none rounded-lg border border-os-line bg-black/40 p-2.5 text-[12px] text-white placeholder:text-white/25 focus:border-os-cyan/50 focus:outline-none" />
                  <button type="button" onClick={() => fork(sel)} className="mt-1.5 rounded-full border border-os-line px-3 py-1.5 text-[12px] text-white/75 hover:border-os-cyan/40 hover:text-white">
                    {t.forkFrom(sel.id.slice(0, 7))}
                  </button>
                </div>
                <Link href={`/desk/engines/${k}`} className="flex items-center gap-1 text-[12px] text-os-cyan/80 hover:text-os-cyan">
                  {t.runOn(ENGINES[k].name)} <ArrowUpRight className="size-3 rtl:-scale-x-100" />
                </Link>
              </fieldset>
            </div>
          )}
        </>
      )}
    </section>
  );
}
