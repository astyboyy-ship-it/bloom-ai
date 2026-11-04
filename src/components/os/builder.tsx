"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FilePlus2, FlaskConical, Lock, LogIn, LogOut, Save, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { localizeEngine, useCommandCopy } from "@/components/bloom/command/locale";
import type { Lang } from "@/components/bloom/i18n";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { DESK_COPY } from "@/components/desk/copy";
import { engineStatuses } from "@/components/desk/engine-status";
import { can } from "@/components/desk/rbac";
import { activeMember, audit, updateSettings, useDeskSettings, type Pipeline, type PipelineNode } from "@/components/desk/settings";
import { useRun } from "@/components/desk/use-run";
import { useLicense } from "@/lib/license-context";
import { rulesFor } from "./architecture-rules";
import { OsPage } from "./os-shell";
import { Testbed } from "./testbed";
import { TopologyCanvas } from "./topology-canvas";

const NODE_W = 168;
const NODE_H = 64;
const uid = () => Math.random().toString(36).slice(2, 9);

const COPY = {
  en: {
    untitled: "Untitled pipeline",
    input: "Input",
    output: "Output",
    oneInput: "A pipeline needs exactly one input.",
    oneOutput: "A pipeline needs exactly one output.",
    addEngine: "Add at least one engine.",
    manyOut: (n: string) => `${n} has more than one outgoing link; chain engines one after another.`,
    manyIn: (n: string) => `${n} has more than one incoming link.`,
    stops: (n: string) => `The chain stops at ${n}; connect it onward to the output.`,
    loops: "The chain loops back on itself.",
    stray: (names: string, one: boolean) => `${names} ${one ? "isn't" : "aren't"} on the path from input to output.`,
    once: "Each engine can appear once in a pipeline.",
    pipelineName: "Pipeline name",
    newP: "New",
    save: "Save",
    runSandbox: "Run in sandbox",
    palette: "Engines · drag or click",
    placed: "placed",
    autoLink: "Auto-link left to right",
    saved: "Saved pipelines",
    del: (n: string) => `Delete ${n}`,
    removeLink: "Click to remove this link",
    linkInto: (n: string) => `Link into ${n}`,
    linkFrom: (n: string) => `Link from ${n}`,
    remove: (n: string) => `Remove ${n}`,
    command: "Operator command",
    brief: "Executive brief",
    linkHint: "Now click the input port (left dot) of the next node. Click the same port again to cancel.",
    valid: (chain: string) => `Valid chain: ${chain}`,
    needTier: (names: string) => `· ${names} need a higher license tier to run.`,
    pipeline: "Pipeline",
    edit: "Edit in builder",
    noneSaved: "No saved pipelines yet.",
    buildOne: "Build one",
    appear: "and it will appear here.",
    incomplete: "This pipeline isn't a complete chain yet. Open it in the builder to finish linking it.",
    sample: "Run this pipeline on our pipeline for this quarter: find buyers, open conversations and protect margin.",
  },
  es: {
    untitled: "Pipeline sin nombre",
    input: "Entrada",
    output: "Salida",
    oneInput: "Un pipeline necesita exactamente una entrada.",
    oneOutput: "Un pipeline necesita exactamente una salida.",
    addEngine: "Añade al menos un motor.",
    manyOut: (n: string) => `${n} tiene más de un enlace de salida; encadena los motores uno tras otro.`,
    manyIn: (n: string) => `${n} tiene más de un enlace de entrada.`,
    stops: (n: string) => `La cadena se detiene en ${n}; conéctalo hasta la salida.`,
    loops: "La cadena vuelve sobre sí misma.",
    stray: (names: string, one: boolean) => `${names} ${one ? "no está" : "no están"} en el camino de la entrada a la salida.`,
    once: "Cada motor solo puede aparecer una vez en un pipeline.",
    pipelineName: "Nombre del pipeline",
    newP: "Nuevo",
    save: "Guardar",
    runSandbox: "Ejecutar en el sandbox",
    palette: "Motores · arrastra o haz clic",
    placed: "colocado",
    autoLink: "Enlazar de izquierda a derecha",
    saved: "Pipelines guardados",
    del: (n: string) => `Eliminar ${n}`,
    removeLink: "Haz clic para quitar este enlace",
    linkInto: (n: string) => `Enlazar hacia ${n}`,
    linkFrom: (n: string) => `Enlazar desde ${n}`,
    remove: (n: string) => `Quitar ${n}`,
    command: "Orden del operador",
    brief: "Informe ejecutivo",
    linkHint: "Ahora haz clic en el puerto de entrada (punto izquierdo) del siguiente nodo. Vuelve a hacer clic en el mismo puerto para cancelar.",
    valid: (chain: string) => `Cadena válida: ${chain}`,
    needTier: (names: string) => `· ${names} necesitan un nivel de licencia superior para ejecutarse.`,
    pipeline: "Pipeline",
    edit: "Editar en el constructor",
    noneSaved: "Aún no hay pipelines guardados.",
    buildOne: "Crea uno",
    appear: "y aparecerá aquí.",
    incomplete: "Este pipeline todavía no es una cadena completa. Ábrelo en el constructor para terminar de enlazarlo.",
    sample: "Ejecuta este pipeline sobre nuestro pipeline de este trimestre: encuentra compradores, abre conversaciones y protege el margen.",
  },
  he: {
    untitled: "פייפליין ללא שם",
    input: "קלט",
    output: "פלט",
    oneInput: "לפייפליין צריך להיות בדיוק קלט אחד.",
    oneOutput: "לפייפליין צריך להיות בדיוק פלט אחד.",
    addEngine: "הוסיפו לפחות מנוע אחד.",
    manyOut: (n: string) => `ל־${n} יש יותר מקישור יוצא אחד; שרשרו את המנועים אחד אחרי השני.`,
    manyIn: (n: string) => `ל־${n} יש יותר מקישור נכנס אחד.`,
    stops: (n: string) => `השרשרת נעצרת ב־${n}; חברו אותו הלאה עד הפלט.`,
    loops: "השרשרת חוזרת לעצמה.",
    stray: (names: string, one: boolean) => `${names} ${one ? "לא נמצא" : "לא נמצאים"} בנתיב מהקלט לפלט.`,
    once: "כל מנוע יכול להופיע פעם אחת בפייפליין.",
    pipelineName: "שם הפייפליין",
    newP: "חדש",
    save: "שמירה",
    runSandbox: "הרצה בארגז החול",
    palette: "מנועים · גררו או לחצו",
    placed: "הוצב",
    autoLink: "קישור אוטומטי משמאל לימין",
    saved: "פייפליינים שמורים",
    del: (n: string) => `מחיקת ${n}`,
    removeLink: "לחצו כדי להסיר את הקישור",
    linkInto: (n: string) => `קישור אל ${n}`,
    linkFrom: (n: string) => `קישור מ־${n}`,
    remove: (n: string) => `הסרת ${n}`,
    command: "פקודת המפעיל",
    brief: "תדריך מנהלים",
    linkHint: "עכשיו לחצו על פתח הקלט (הנקודה השמאלית) של הצומת הבא. לחצו שוב על אותו פתח כדי לבטל.",
    valid: (chain: string) => `שרשרת תקינה: ${chain}`,
    needTier: (names: string) => `· ${names} דורשים רמת רישיון גבוהה יותר כדי לרוץ.`,
    pipeline: "פייפליין",
    edit: "עריכה בבונה",
    noneSaved: "עדיין אין פייפליינים שמורים.",
    buildOne: "בנו אחד",
    appear: "והוא יופיע כאן.",
    incomplete: "הפייפליין הזה עדיין לא שרשרת שלמה. פתחו אותו בבונה כדי לסיים לקשר.",
    sample: "הריצו את הפייפליין הזה על הפייפליין שלנו לרבעון: מצאו קונים, פתחו שיחות ושמרו על הרווחיות.",
  },
} satisfies Record<Lang, unknown>;
type BuilderCopy = (typeof COPY)[Lang];

const blank = (name = COPY.en.untitled): Pipeline => ({
  id: `pl-${uid()}`,
  name,
  nodes: [
    { id: "in", kind: "input", x: 40, y: 160 },
    { id: "out", kind: "output", x: 760, y: 160 },
  ],
  edges: [],
  updatedAt: Date.now(),
});

/** Walks input → … → output. Returns the engines in order, or the problems that stop it being a single chain. */
export function validate(p: Pipeline, t: BuilderCopy = COPY.en): { ok: true; engines: EngineKey[] } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  const label = (n: PipelineNode) => labelOf(n, t);
  const inputs = p.nodes.filter((n) => n.kind === "input");
  const outputs = p.nodes.filter((n) => n.kind === "output");
  if (inputs.length !== 1) problems.push(t.oneInput);
  if (outputs.length !== 1) problems.push(t.oneOutput);
  const engines = p.nodes.filter((n) => n.kind === "engine");
  if (!engines.length) problems.push(t.addEngine);
  for (const n of p.nodes) {
    if (p.edges.filter(([a]) => a === n.id).length > 1) problems.push(t.manyOut(label(n)));
    if (p.edges.filter(([, b]) => b === n.id).length > 1) problems.push(t.manyIn(label(n)));
  }
  if (problems.length) return { ok: false, problems };
  const order: EngineKey[] = [];
  let cur = inputs[0].id;
  const seen = new Set<string>();
  for (;;) {
    const next = p.edges.find(([a]) => a === cur)?.[1];
    if (!next) return { ok: false, problems: [t.stops(label(p.nodes.find((n) => n.id === cur)!))] };
    if (seen.has(next)) return { ok: false, problems: [t.loops] };
    seen.add(next);
    const node = p.nodes.find((n) => n.id === next)!;
    if (node.kind === "output") break;
    if (node.kind === "engine") order.push(node.engine!);
    cur = next;
  }
  const stray = engines.filter((n) => !seen.has(n.id));
  if (stray.length) return { ok: false, problems: [t.stray(stray.map(label).join(", "), stray.length === 1)] };
  if (new Set(order).size !== order.length) return { ok: false, problems: [t.once] };
  return { ok: true, engines: order };
}

const labelOf = (n: PipelineNode, t: BuilderCopy) => (n.kind === "engine" ? ENGINES[n.engine!].name : n.kind === "input" ? t.input : t.output);

/** /desk/builder: node-based drag-and-drop canvas for chaining engines into a custom architecture. */
export function PipelineBuilder() {
  const router = useRouter();
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const label = (n: PipelineNode) => labelOf(n, t);
  const { settings } = useDeskSettings();
  const { isUnlocked } = useLicense();
  const mayEdit = can(activeMember(settings).role, "calibrate");
  const [p, setP] = useState<Pipeline>(() => blank(t.untitled));
  const [link, setLink] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const v = useMemo(() => validate(p, t), [p, t]);
  const locked = p.nodes.filter((n) => n.kind === "engine" && !isUnlocked(n.engine!));

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    const saved = id && settings.pipelines.find((x) => x.id === id);
    if (saved) setP(saved);
    // Only on mount: later edits shouldn't be overwritten by the saved copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left + canvas.current!.scrollLeft, y: e.clientY - r.top + canvas.current!.scrollTop };
  };
  const addEngine = (engine: EngineKey, at?: { x: number; y: number }) => {
    if (p.nodes.some((n) => n.engine === engine)) return;
    const count = p.nodes.filter((n) => n.kind === "engine").length;
    setP((q) => ({ ...q, nodes: [...q.nodes, { id: `n-${uid()}`, kind: "engine", engine, x: at ? at.x - NODE_W / 2 : 230 + count * 190, y: at ? at.y - NODE_H / 2 : 160 + (count % 2 ? 90 : -40) }] }));
  };
  const removeNode = (id: string) => setP((q) => ({ ...q, nodes: q.nodes.filter((n) => n.id !== id), edges: q.edges.filter(([a, b]) => a !== id && b !== id) }));
  const connect = (to: string) => {
    if (!link || link === to) return setLink(null);
    setP((q) => ({ ...q, edges: [...q.edges.filter(([a, b]) => !(a === link && b === to)), [link, to]] }));
    setLink(null);
  };
  /** Lays the current chain out left to right and links it, as a starting point. */
  const autoChain = () => {
    const engines = p.nodes.filter((n) => n.kind === "engine");
    const order = ["in", ...engines.map((n) => n.id), "out"];
    setP((q) => ({
      ...q,
      nodes: q.nodes.map((n) => {
        const i = order.indexOf(n.id);
        // Spaced so ports never touch; the canvas scrolls for long chains.
        return { ...n, x: 40 + i * (NODE_W + 56), y: 160 };
      }),
      edges: order.slice(1).map((id, i) => [order[i], id] as [string, string]),
    }));
  };
  const save = () => {
    const next = { ...p, updatedAt: Date.now() };
    updateSettings((s) => ({ pipelines: [...s.pipelines.filter((x) => x.id !== p.id), next] }));
    audit("calibration", `Saved pipeline "${p.name}" (${v.ok ? v.engines.map((k) => ENGINES[k].name).join(" → ") : "incomplete"})`);
    setP(next);
  };

  return (
    <OsPage
      route="/desk/builder"
      actions={
        <>
          <input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value.slice(0, 60) })} aria-label={t.pipelineName} className="rounded-lg border border-os-line bg-black/40 px-3 py-1.5 text-[13px] text-white focus:border-os-cyan/50 focus:outline-none" />
          <button type="button" onClick={() => setP(blank(t.untitled))} className="flex items-center gap-1.5 rounded-full border border-os-line px-3 py-1.5 text-[12px] text-white/70 hover:text-white">
            <FilePlus2 className="size-3.5" /> {t.newP}
          </button>
          <button type="button" disabled={!mayEdit} onClick={save} className="flex items-center gap-1.5 rounded-full border border-os-cyan/40 px-3 py-1.5 text-[12px] text-os-cyan disabled:opacity-40">
            <Save className="size-3.5" /> {t.save}
          </button>
          <button type="button" disabled={!v.ok || locked.length > 0} onClick={() => {
              save();
              router.push(`/desk/sandbox?id=${p.id}`);
            }} className="flex items-center gap-1.5 rounded-full bg-os-cyan px-4 py-1.5 text-[12px] font-semibold text-black disabled:opacity-40">
            <FlaskConical className="size-3.5" /> {t.runSandbox}
          </button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <aside className="os-panel rounded-2xl p-3">
          <p className="os-label">{t.palette}</p>
          <ul className="mt-2 space-y-1.5">
            {ENGINE_ORDER.map((k) => {
              const used = p.nodes.some((n) => n.engine === k);
              const ok = isUnlocked(k);
              return (
                <li key={k}>
                  <button
                    type="button"
                    draggable={ok && !used}
                    onDragStart={(e) => e.dataTransfer.setData("text/bloom-engine", k)}
                    onClick={() => ok && addEngine(k)}
                    disabled={!ok || used}
                    style={paletteVars(PALETTES[k])}
                    className="flex w-full items-center gap-2 rounded-lg border border-c-edge/50 bg-c-deep/40 px-2.5 py-2 text-start text-[12.5px] text-white hover:bg-c-deep/70 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="font-mono text-[10px] text-c-2">{ENGINES[k].index}</span>
                    {ENGINES[k].name}
                    {!ok ? <Lock className="ms-auto size-3" /> : used ? <span className="ms-auto font-mono text-[9px] text-white/40">{t.placed}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={autoChain} className="mt-3 w-full rounded-lg border border-os-line py-1.5 text-[11.5px] text-white/60 hover:text-white">
            {t.autoLink}
          </button>
          {settings.pipelines.length > 0 && (
            <>
              <p className="os-label mt-4">{t.saved}</p>
              <ul className="mt-1.5 space-y-1">
                {settings.pipelines.map((x) => (
                  <li key={x.id} className="flex items-center gap-1">
                    <button type="button" onClick={() => setP(x)} className={cn("min-w-0 flex-1 truncate rounded px-2 py-1 text-start text-[12px]", x.id === p.id ? "bg-os-cyan/10 text-os-cyan" : "text-white/65 hover:text-white")}>
                      {x.name}
                    </button>
                    <button
                      type="button"
                      aria-label={t.del(x.name)}
                      onClick={() => {
                        updateSettings((s) => ({ pipelines: s.pipelines.filter((y) => y.id !== x.id) }));
                        audit("calibration", `Deleted pipeline "${x.name}"`);
                      }}
                      className="p-1 text-white/30 hover:text-red-300"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <section className="space-y-3">
          <div
            ref={canvas}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const k = e.dataTransfer.getData("text/bloom-engine") as EngineKey;
              if (k) addEngine(k, local(e));
            }}
            onPointerMove={(e) => {
              if (!drag) return;
              const at = local(e);
              setP((q) => ({ ...q, nodes: q.nodes.map((n) => (n.id === drag.id ? { ...n, x: Math.max(0, at.x - drag.dx), y: Math.max(0, at.y - drag.dy) } : n)) }));
            }}
            onPointerUp={() => setDrag(null)}
            onPointerLeave={() => setDrag(null)}
            className="os-panel relative h-[26rem] overflow-auto rounded-2xl [background-image:radial-gradient(rgb(0_240_255/0.12)_1px,transparent_1px)] [background-size:22px_22px]"
            style={{ direction: "ltr" }}
          >
            <svg className="pointer-events-none absolute inset-0 h-[60rem] w-[90rem]">
              {p.edges.map(([a, b]) => {
                const s = p.nodes.find((n) => n.id === a);
                const tgt = p.nodes.find((n) => n.id === b);
                if (!s || !tgt) return null;
                const x1 = s.x + NODE_W;
                const y1 = s.y + NODE_H / 2;
                const x2 = tgt.x;
                const y2 = tgt.y + NODE_H / 2;
                const mx = (x1 + x2) / 2;
                const d = `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
                return (
                  <g key={`${a}-${b}`} className="pointer-events-auto cursor-pointer" onClick={() => setP((q) => ({ ...q, edges: q.edges.filter(([x, y]) => !(x === a && y === b)) }))}>
                    <title>{t.removeLink}</title>
                    <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
                    <path d={d} fill="none" stroke="#00f0ff" strokeOpacity={0.7} strokeWidth={1.6} strokeDasharray="5 6" className="animate-[net-flow_1s_linear_infinite]" />
                  </g>
                );
              })}
            </svg>
            {p.nodes.map((n) => {
              const color = n.engine ? PALETTES[n.engine].c1 : n.kind === "input" ? "#00f0ff" : "#34f5b5";
              const off = n.kind === "engine" && !isUnlocked(n.engine!);
              return (
                <div
                  key={n.id}
                  className={cn("absolute flex select-none items-center rounded-xl border bg-os-panel/95 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.9)]", link === n.id && "ring-2 ring-os-cyan", off && "opacity-50")}
                  style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H, borderColor: `${color}66` }}
                >
                  {n.kind !== "input" && (
                    <button type="button" aria-label={t.linkInto(label(n))} onClick={() => connect(n.id)} className={cn("absolute -start-2 top-1/2 size-4 -translate-y-1/2 rounded-full border-2 bg-os-bg", link ? "border-os-cyan animate-pulse" : "border-white/40")} />
                  )}
                  <div
                    onPointerDown={(e) => {
                      const at = local(e);
                      setDrag({ id: n.id, dx: at.x - n.x, dy: at.y - n.y });
                    }}
                    className="flex h-full flex-1 cursor-grab items-center gap-2 px-4 active:cursor-grabbing"
                  >
                    {n.kind === "input" ? <LogIn className="size-4" style={{ color }} /> : n.kind === "output" ? <LogOut className="size-4" style={{ color }} /> : <span className="font-mono text-[11px]" style={{ color }}>{ENGINES[n.engine!].index}</span>}
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-white">{label(n)}</span>
                      <span className="block truncate font-mono text-[9.5px] text-white/40">{n.kind === "engine" ? localizeEngine(ENGINES[n.engine!], lang).badge : n.kind === "input" ? t.command : t.brief}</span>
                    </span>
                  </div>
                  {n.kind === "engine" && (
                    <button type="button" aria-label={t.remove(label(n))} onClick={() => removeNode(n.id)} className="absolute end-1 top-1 rounded p-0.5 text-white/30 hover:text-red-300">
                      <X className="size-3" />
                    </button>
                  )}
                  {n.kind !== "output" && (
                    <button type="button" aria-label={t.linkFrom(label(n))} onClick={() => setLink(link === n.id ? null : n.id)} className={cn("absolute -end-2 top-1/2 size-4 -translate-y-1/2 rounded-full border-2 bg-os-bg", link === n.id ? "border-os-cyan bg-os-cyan" : "border-white/40 hover:border-os-cyan")} />
                  )}
                </div>
              );
            })}
            {link && <p dir={lang === "he" ? "rtl" : "ltr"} className="absolute bottom-3 left-3 rounded-md bg-os-bg/90 px-2.5 py-1 text-[11.5px] text-os-cyan">{t.linkHint}</p>}
          </div>

          <div className={cn("os-panel rounded-xl p-3 text-[12.5px]", v.ok && !locked.length ? "border-os-emerald/40" : "border-amber-400/30")}>
            {v.ok ? (
              <p className="flex flex-wrap items-center gap-2 text-os-emerald">
                <CheckCircle2 className="size-4" /> {t.valid([t.input, ...v.engines.map((k) => ENGINES[k].name), t.output].join(lang === "he" ? " ← " : " → "))}
                {locked.length > 0 && <span className="text-amber-200">{t.needTier(locked.map((n) => ENGINES[n.engine!].name).join(", "))}</span>}
              </p>
            ) : (
              <ul className="space-y-1 text-amber-200/90">
                {v.problems.map((m) => (
                  <li key={m} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </OsPage>
  );
}

/** /desk/sandbox: run a saved builder pipeline through the simulation testbed. */
export function Sandbox() {
  const { lang } = useCommandCopy();
  const c = DESK_COPY[lang];
  const t = COPY[lang];
  const { settings } = useDeskSettings();
  const [id, setId] = useState<string | null>(null);
  const r = useRun(c.networkError, c.aborted);
  useEffect(() => setId(new URLSearchParams(window.location.search).get("id") ?? settings.pipelines.at(-1)?.id ?? null), [settings.pipelines]);
  const p = settings.pipelines.find((x) => x.id === id);
  const v = p ? validate(p, t) : null;
  const statuses = useMemo(() => engineStatuses(r.state.agents), [r.state.agents]);
  const spec = useMemo(() => (p && v?.ok ? { id: p.id, label: p.name, engines: v.engines } : null), [p, v]);

  return (
    <OsPage
      route="/desk/sandbox"
      name={p?.name}
      actions={
        <>
          {settings.pipelines.length > 0 && (
            <select value={id ?? ""} onChange={(e) => setId(e.target.value)} aria-label={t.pipeline} className="rounded-lg border border-os-line bg-os-panel px-3 py-1.5 text-[13px] text-white">
              {settings.pipelines.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
          <Link href={p ? `/desk/builder?id=${p.id}` : "/desk/builder"} className="rounded-full border border-os-line px-3.5 py-1.5 text-[12.5px] text-white/75 hover:text-white">
            {t.edit}
          </Link>
        </>
      }
    >
      {!p ? (
        <div className="os-panel rounded-2xl p-8 text-center text-[13.5px] text-white/55">
          {t.noneSaved}{" "}
          <Link href="/desk/builder" className="text-os-cyan">
            {t.buildOne}
          </Link>{" "}
          {t.appear}
        </div>
      ) : !spec ? (
        <div className="os-panel rounded-2xl p-6 text-[13px] text-amber-200">{t.incomplete}</div>
      ) : (
        <div className="space-y-4">
          <div className="os-panel rounded-2xl p-3">
            <TopologyCanvas inputs={[t.command]} engines={spec.engines} outputs={[t.brief]} statuses={statuses} composing={r.state.phases.compose.status === "active"} threshold={`≥ $${rulesFor(settings.architectureRules, spec.id).approvalThresholdUsd.toLocaleString("en-US")}`} />
          </div>
          <Testbed r={r} spec={spec} rules={rulesFor(settings.architectureRules, spec.id)} sample={t.sample} kind="pipeline" />
        </div>
      )}
    </OsPage>
  );
}
