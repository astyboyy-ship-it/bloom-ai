"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { Check, Gavel, Play, RotateCcw, ShieldAlert, ShieldCheck, ShieldX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandCopy } from "@/components/bloom/command/locale";
import type { Lang } from "@/components/bloom/i18n";
import { can } from "@/components/desk/rbac";
import { activeMember, decideApproval, recordBoardSession, useDeskSettings, type BoardSession, type BoardVote } from "@/components/desk/settings";
import { DEFAULT_RULES } from "./architecture-rules";
import { OsPage } from "./os-shell";
import { AGENT_COLORS, BOARD_TEXT, CRITERIA, deliberate, rebuttals, type Proposal } from "./shadow-board-logic";

type Verdict = BoardSession["verdict"];

const COPY = {
  en: {
    presets: [
      { label: "Contract approval", subject: "Sign $48,000 annual renewal with Northwind Logistics", detail: "Counter-offer at 15% discount on a 2-year agreement; expected to retain $210k pipeline and upsell analytics seats. Legal review complete." },
      { label: "Budget re-allocation", subject: "Re-allocate $120k from paid social to outbound agents", detail: "Move Q4 budget into the Autonomous Outbound Engine to reduce cost per meeting; staged over 3 sprints with a pilot in NA mid-market first." },
      { label: "System intervention", subject: "Purge stale customer data and rotate admin credentials in production", detail: "Delete all customer records inactive > 24 months across every region and export the email list to the new CRM; rotate root API keys." },
    ],
    raised: (source: string, priority: string, owner: string) => `(raised by ${source}, priority ${priority}, owner ${owner})`,
    proposal: "Proposal",
    fromQueue: "From the approval queue",
    freeForm: "Free-form proposal",
    subjectPh: "What should happen, e.g. Wire $60,000 deposit to vendor",
    subjectLabel: "Proposal",
    detailPh: "Context: scope, expected return, safeguards, rollback plan…",
    detailLabel: "Context",
    budget: "Approval budget",
    budgetLabel: "Approval budget in USD",
    convene: "Convene the board",
    reconvene: "Reconvene the board",
    recent: "Recent sessions",
    noSessions: "No sessions yet.",
    stream: "Debate stream",
    computed: (ms: string) => `consensus computed in ${ms} ms`,
    hint: "Load a pending approval or a preset, then convene the board.",
    rounds: { opening: "Opening", rebuttal: "Rebuttal", vote: "Vote" },
    stances: { support: "support", conditional: "conditional", oppose: "oppose", veto: "veto" } as Record<BoardVote["stance"], string>,
    vote: (stance: string, pct: string, conds: string) => `${stance.toUpperCase()} at ${pct}%${conds ? ` · conditions: ${conds}` : ""}`,
    matrix: "Consensus matrix",
    agent: "Agent",
    voteCol: "Vote",
    compute: "Compute",
    outside: "Outside this agent's mandate",
    verdicts: { approved: "Consensus: approve", rejected: "Consensus: reject", escalate: "No consensus: escalate to a human" } as Record<Verdict, string>,
    vetoed: (point: string) => `Compliance Gate exercised its veto: ${point}`,
    approvedWhy: "Weighted score cleared the 62% bar with no agent opposed.",
    rejectedWhy: "Weighted score fell below the 42% floor.",
    escalateWhy: "Score landed between the floor and the bar, or an agent opposed.",
    hash: "session hash",
    yourCall: "Your call on",
    applyTo: "Apply to",
    approve: "Approve as signed-off human",
    reject: "Reject",
  },
  es: {
    presets: [
      { label: "Aprobación de contrato", subject: "Firmar la renovación anual de $48,000 con Northwind Logistics", detail: "Contraoferta con un 15% de descuento en un acuerdo a 2 años; se espera retener $210k de pipeline y vender licencias de analítica. Revisión legal completa." },
      { label: "Reasignación de presupuesto", subject: "Reasignar $120k de anuncios en redes a agentes outbound", detail: "Mover el presupuesto del T4 al Motor outbound autónomo para reducir el coste por reunión; por fases en 3 sprints, con un piloto primero en mid-market de Norteamérica." },
      { label: "Intervención en sistemas", subject: "Purgar datos antiguos de clientes y rotar credenciales de administrador en producción", detail: "Eliminar todos los registros de clientes inactivos más de 24 meses en todas las regiones y exportar la lista de email al nuevo CRM; rotar las claves API raíz." },
    ],
    raised: (source: string, priority: string, owner: string) => `(planteada por ${source}, prioridad ${priority}, responsable ${owner})`,
    proposal: "Propuesta",
    fromQueue: "De la cola de aprobaciones",
    freeForm: "Propuesta libre",
    subjectPh: "Qué debe ocurrir, p. ej. Transferir un depósito de $60,000 al proveedor",
    subjectLabel: "Propuesta",
    detailPh: "Contexto: alcance, retorno esperado, salvaguardas, plan de marcha atrás…",
    detailLabel: "Contexto",
    budget: "Presupuesto de aprobación",
    budgetLabel: "Presupuesto de aprobación en USD",
    convene: "Convocar al board",
    reconvene: "Volver a convocar",
    recent: "Sesiones recientes",
    noSessions: "Aún no hay sesiones.",
    stream: "Debate en curso",
    computed: (ms: string) => `consenso calculado en ${ms} ms`,
    hint: "Carga una aprobación pendiente o un ejemplo y convoca al board.",
    rounds: { opening: "Apertura", rebuttal: "Réplica", vote: "Voto" },
    stances: { support: "a favor", conditional: "condicionado", oppose: "en contra", veto: "veto" },
    vote: (stance: string, pct: string, conds: string) => `${stance.toUpperCase()} al ${pct}%${conds ? ` · condiciones: ${conds}` : ""}`,
    matrix: "Matriz de consenso",
    agent: "Agente",
    voteCol: "Voto",
    compute: "Cómputo",
    outside: "Fuera del mandato de este agente",
    verdicts: { approved: "Consenso: aprobar", rejected: "Consenso: rechazar", escalate: "Sin consenso: decide una persona" },
    vetoed: (point: string) => `El control de cumplimiento ejerció su veto: ${point}`,
    approvedWhy: "La puntuación ponderada superó el 62% sin ningún agente en contra.",
    rejectedWhy: "La puntuación ponderada quedó por debajo del 42%.",
    escalateWhy: "La puntuación quedó entre el mínimo y el umbral, o un agente se opuso.",
    hash: "hash de la sesión",
    yourCall: "Tu decisión sobre",
    applyTo: "Aplicar a",
    approve: "Aprobar como persona responsable",
    reject: "Rechazar",
  },
  he: {
    presets: [
      { label: "אישור חוזה", subject: "חתימה על חידוש שנתי של $48,000 עם Northwind Logistics", detail: "הצעה נגדית בהנחה של 15% להסכם לשנתיים; צפוי לשמר $210k בפייפליין ולמכור רישיונות אנליטיקה. הבדיקה המשפטית הושלמה." },
      { label: "הקצאת תקציב מחדש", subject: "העברת $120k מפרסום ממומן ברשתות לסוכני פנייה יזומה", detail: "העברת תקציב רבעון 4 למנוע הפנייה היזומה האוטונומי כדי להוזיל את העלות לפגישה; בשלבים לאורך 3 ספרינטים, עם פיילוט קודם בשוק הבינוני בצפון אמריקה." },
      { label: "התערבות במערכת", subject: "מחיקת נתוני לקוחות ישנים והחלפת אישורי מנהל בייצור", detail: "מחיקת כל רשומות הלקוחות שלא היו פעילים יותר מ־24 חודשים בכל האזורים וייצוא רשימת המיילים ל־CRM החדש; החלפת מפתחות ה־API הראשיים." },
    ],
    raised: (source: string, priority: string, owner: string) => `(הועלה על ידי ${source}, עדיפות ${priority}, אחראי ${owner})`,
    proposal: "הצעה",
    fromQueue: "מתור האישורים",
    freeForm: "הצעה חופשית",
    subjectPh: "מה צריך לקרות, למשל העברת פיקדון של $60,000 לספק",
    subjectLabel: "הצעה",
    detailPh: "הקשר: היקף, תשואה צפויה, אמצעי הגנה, תוכנית חזרה לאחור…",
    detailLabel: "הקשר",
    budget: "תקציב אישור",
    budgetLabel: "תקציב אישור בדולרים",
    convene: "כינוס ה־Board",
    reconvene: "כינוס מחדש",
    recent: "ישיבות אחרונות",
    noSessions: "עדיין אין ישיבות.",
    stream: "זרם הדיון",
    computed: (ms: string) => `הקונצנזוס חושב ב־${ms} מ״ש`,
    hint: "טענו אישור ממתין או דוגמה, ואז כנסו את ה־Board.",
    rounds: { opening: "פתיחה", rebuttal: "תגובה", vote: "הצבעה" },
    stances: { support: "בעד", conditional: "בתנאים", oppose: "נגד", veto: "וטו" },
    vote: (stance: string, pct: string, conds: string) => `${stance} ב־${pct}%${conds ? ` · תנאים: ${conds}` : ""}`,
    matrix: "מטריצת הקונצנזוס",
    agent: "סוכן",
    voteCol: "הצבעה",
    compute: "חישוב",
    outside: "מחוץ לסמכות של הסוכן הזה",
    verdicts: { approved: "קונצנזוס: לאשר", rejected: "קונצנזוס: לדחות", escalate: "אין קונצנזוס: ההחלטה עוברת לאדם" },
    vetoed: (point: string) => `שער הציות הפעיל את זכות הווטו: ${point}`,
    approvedWhy: "הציון המשוקלל עבר את רף ה־62% בלי שאף סוכן התנגד.",
    rejectedWhy: "הציון המשוקלל ירד מתחת לרצפה של 42%.",
    escalateWhy: "הציון נפל בין הרצפה לרף, או שסוכן התנגד.",
    hash: "גיבוב הישיבה",
    yourCall: "ההחלטה שלכם לגבי",
    applyTo: "החלה על",
    approve: "לאשר כאדם אחראי",
    reject: "לדחות",
  },
} satisfies Record<Lang, unknown>;

type Live = { proposal: Proposal; hash?: string; step: number };

/** /desk/shadow-board: an adversarial debate chamber that stress-tests high-stakes operations before execution. */
export function ShadowBoard() {
  const params = useSearchParams();
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const { settings } = useDeskSettings();
  const mayApprove = can(activeMember(settings).role, "approve");
  const reduce = useReducedMotion();
  const pending = settings.approvals.filter((a) => a.status === "pending");
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [detail, setDetail] = useState("");
  const [budget, setBudget] = useState(DEFAULT_RULES.approvalThresholdUsd);
  const [live, setLive] = useState<Live | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const linked = settings.approvals.find((a) => a.id === approvalId);

  // ?approval=<id> (from Home's approval bay) preloads that action.
  // Settings hydrate after the first render, so this waits for the approval to appear, then loads it once.
  const fromUrl = params.get("approval");
  const preloaded = useRef<string | null>(null);
  const arriving = fromUrl ? settings.approvals.find((x) => x.id === fromUrl) : undefined;
  useEffect(() => {
    if (!arriving || preloaded.current === arriving.id) return;
    preloaded.current = arriving.id;
    load(arriving.id, arriving.title, `${arriving.detail} ${t.raised(arriving.source, arriving.priority.toUpperCase(), arriving.owner)}`);
    // Loads once per approval; the language at that moment words the context line.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arriving]);
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  function load(id: string | null, s: string, d: string) {
    setApprovalId(id);
    setSubject(s);
    setDetail(d);
    setLive(null);
  }

  const convene = () => {
    if (subject.trim().length < 4) return;
    if (timer.current) clearInterval(timer.current);
    const proposal: Proposal = { subject: subject.trim(), detail: detail.trim(), budgetUsd: budget };
    // The record is hashed over the deliberation in the language it was convened in.
    const result = deliberate(proposal, lang);
    setLive({ proposal, step: reduce ? STEPS : 0 });
    const finish = () => {
      const hash = recordBoardSession({ ...result, id: `board-${Date.now().toString(36)}`, at: Date.now(), approvalId: linked?.id, runId: linked?.runId });
      setLive({ proposal, hash, step: STEPS });
    };
    if (reduce) return finish();
    let step = 0;
    timer.current = setInterval(() => {
      step++;
      if (step >= STEPS) {
        clearInterval(timer.current!);
        finish();
      } else setLive((l) => l && { ...l, step });
    }, 260);
  };

  // The deliberation is deterministic, so it's re-worded in the current language without changing the verdict.
  const s = useMemo(() => (live ? deliberate(live.proposal, lang) : null), [live, lang]);
  const done = !!live?.hash;
  const history = [...settings.boardSessions].reverse().slice(0, 8);

  return (
    <OsPage route="/desk/shadow-board">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <section className="os-panel space-y-3 rounded-2xl p-4">
          <p className="os-label flex items-center gap-2">
            <Gavel className="size-3.5 text-os-cyan" /> {t.proposal}
          </p>
          {pending.length > 0 && (
            <label className="block text-[12px] text-white/55">
              {t.fromQueue}
              <select
                value={approvalId ?? ""}
                onChange={(e) => {
                  const a = pending.find((x) => x.id === e.target.value);
                  if (a) load(a.id, a.title, `${a.detail} ${t.raised(a.source, a.priority.toUpperCase(), a.owner)}`);
                  else setApprovalId(null);
                }}
                className="mt-1 w-full rounded-lg border border-os-line bg-os-panel px-3 py-2 text-[12.5px] text-white"
              >
                <option value="">{t.freeForm}</option>
                {pending.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.source}: {a.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-1.5">
            {t.presets.map((p) => (
              <button key={p.label} type="button" onClick={() => load(null, p.subject, p.detail)} className="rounded-full border border-os-line px-2.5 py-1 text-[11.5px] text-white/60 transition-colors hover:border-os-cyan/40 hover:text-white">
                {p.label}
              </button>
            ))}
          </div>
          <input dir="auto" value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 160))} placeholder={t.subjectPh} aria-label={t.subjectLabel} className="w-full rounded-lg border border-os-line bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none" />
          <textarea dir="auto" value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 1200))} rows={4} placeholder={t.detailPh} aria-label={t.detailLabel} className="w-full resize-none rounded-lg border border-os-line bg-black/40 p-3 text-[12.5px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none" />
          <label className="flex items-center gap-2 text-[12px] text-white/55">
            {t.budget}
            <span dir="ltr" className="flex items-center rounded-lg border border-os-line bg-black/40 px-2">
              <span className="text-white/40">$</span>
              <input type="number" min={100} step={500} value={budget} onChange={(e) => setBudget(Math.max(100, Number(e.target.value) || 0))} aria-label={t.budgetLabel} className="w-28 bg-transparent px-1 py-1.5 font-mono text-[12.5px] text-white focus:outline-none" />
            </span>
          </label>
          <button type="button" onClick={convene} disabled={subject.trim().length < 4 || (!!live && !done)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-os-cyan px-4 py-2.5 text-[13px] font-semibold text-black shadow-[0_0_24px_-8px_rgb(0_240_255/0.8)] disabled:opacity-40">
            {done ? <RotateCcw className="size-4" /> : <Play className="size-4 rtl:-scale-x-100" />} {done ? t.reconvene : t.convene}
          </button>

          <div className="border-t border-os-line pt-3">
            <p className="os-label">{t.recent}</p>
            {history.length === 0 ? (
              <p className="mt-1.5 text-[12px] text-white/40">{t.noSessions}</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 text-[12px]">
                    <VerdictDot v={h.verdict} />
                    <span dir="auto" className="min-w-0 flex-1 truncate text-white/70">{h.subject}</span>
                    <span className="shrink-0 font-mono text-[10.5px] text-white/35">{(h.score * 100).toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-live="polite" className="os-panel min-w-0 rounded-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-os-line px-4 py-2.5">
            <p className="os-label flex items-center gap-2 text-white/60">
              <span className={cn("size-1.5 rounded-full", live && !done ? "animate-pulse bg-os-cyan shadow-[0_0_8px_#00f0ff]" : "bg-white/25")} /> {t.stream}
            </p>
            {s && <span className="font-mono text-[10.5px] text-white/40">{t.computed(s.ms.toFixed(3))}</span>}
          </div>
          {!s || !live ? (
            <div className="grid gap-2 p-4 sm:grid-cols-3">
              {(["advocate", "optimizer", "compliance"] as const).map((k) => (
                <div key={k} className="rounded-xl border border-os-line bg-black/25 p-3">
                  <p className="text-[13px] font-medium" style={{ color: AGENT_COLORS[k] }}>{BOARD_TEXT[lang].agents[k].name}</p>
                  <p className="mt-1 text-[12px] text-white/50">{BOARD_TEXT[lang].agents[k].role}</p>
                </div>
              ))}
              <p className="text-[12.5px] text-white/40 sm:col-span-3">{t.hint}</p>
            </div>
          ) : (
            <Debate votes={s.votes} step={live.step} lang={lang} />
          )}
          {done && s && live?.hash && (
            <VerdictPanel
              session={{ ...s, hash: live.hash }}
              lang={lang}
              linked={linked && linked.status === "pending" ? linked.title : null}
              mayApprove={mayApprove}
              onApply={(d) => linked && decideApproval(linked.id, d)}
            />
          )}
        </section>
      </div>
    </OsPage>
  );
}

// 3 openings x 4 points, 3 rebuttals, 3 votes, then the matrix.
const STEPS = 12 + 3 + 3 + 1;

function Debate({ votes, step, lang }: { votes: BoardVote[]; step: number; lang: Lang }) {
  const t = COPY[lang];
  const agents = BOARD_TEXT[lang].agents;
  const lines: { agent: BoardVote["agent"]; round: string; text: string }[] = [];
  for (let i = 0; i < 4; i++) for (const v of votes) lines.push({ agent: v.agent, round: t.rounds.opening, text: v.points[i] });
  for (const r of rebuttals(votes, lang)) lines.push({ agent: r.agent, round: t.rounds.rebuttal, text: r.line });
  for (const v of votes) lines.push({ agent: v.agent, round: t.rounds.vote, text: t.vote(t.stances[v.stance], (v.score * 100).toFixed(0), v.conditions.join("; ")) });
  const shown = lines.slice(0, step);
  return (
    <div>
      <ol className="max-h-[26rem] space-y-1.5 overflow-y-auto p-4">
        {shown.map((l, i) => (
          <li key={i} className="flex gap-2.5 text-[12.5px] motion-safe:animate-[fade-in_0.3s_ease-out]">
            <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: AGENT_COLORS[l.agent], boxShadow: `0 0 8px ${AGENT_COLORS[l.agent]}` }} />
            <span className="min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">{l.round} · </span>
              <span className="font-medium" style={{ color: AGENT_COLORS[l.agent] }}>{agents[l.agent].short}</span>
              <span className="text-white/75"> {l.text}</span>
            </span>
          </li>
        ))}
      </ol>
      {step >= STEPS - 1 && <Matrix votes={votes} lang={lang} />}
    </div>
  );
}

function Matrix({ votes, lang }: { votes: BoardVote[]; lang: Lang }) {
  const t = COPY[lang];
  const bt = BOARD_TEXT[lang];
  // Each agent scores only the criteria in its mandate, so the matrix shows who drove what.
  return (
    <div className="overflow-x-auto border-t border-os-line p-4">
      <p className="os-label mb-2">{t.matrix}</p>
      <table className="w-full min-w-[38rem] text-[12px]">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
            <th className="pb-1.5 text-start font-normal">{t.agent}</th>
            {CRITERIA.map((c) => (
              <th key={c} className="pb-1.5 text-start font-normal">{bt.criteria[c]}</th>
            ))}
            <th className="pb-1.5 text-start font-normal">{t.voteCol}</th>
            <th className="pb-1.5 text-end font-normal">{t.compute}</th>
          </tr>
        </thead>
        <tbody>
          {votes.map((v) => (
            <tr key={v.agent} className="border-t border-os-line/50">
              <td className="py-1.5 pe-2" style={{ color: AGENT_COLORS[v.agent] }}>{bt.agents[v.agent].short}</td>
              {CRITERIA.map((c) => {
                const x = v.criteria[c];
                return (
                  <td key={c} className="py-1.5 pe-2">
                    {x === undefined ? (
                      <span className="inline-block min-w-12 text-center font-mono text-white/20" title={t.outside}>·</span>
                    ) : (
                      <span className="inline-block min-w-12 rounded px-1.5 py-0.5 text-center font-mono tabular-nums text-white" style={{ background: `rgb(${x < 0.5 ? "255 80 110" : "52 245 181"} / ${0.12 + Math.abs(x - 0.5) * 0.7})` }}>
                        {(x * 100).toFixed(0)}
                      </span>
                    )}
                  </td>
                );
              })}
              <td className={cn("py-1.5 pe-2 font-mono text-[11px] uppercase", v.stance === "support" ? "text-os-emerald" : v.stance === "conditional" ? "text-amber-300" : "text-red-300")}>{t.stances[v.stance]}</td>
              <td dir="ltr" className="py-1.5 text-end font-mono text-[11px] tabular-nums text-white/50">{v.ms.toFixed(3)} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerdictDot({ v }: { v: Verdict }) {
  return <span className={cn("size-2 shrink-0 rounded-full", v === "approved" ? "bg-os-emerald" : v === "rejected" ? "bg-red-400" : "bg-amber-300")} />;
}

function VerdictPanel({ session, lang, linked, mayApprove, onApply }: { session: Omit<BoardSession, "id" | "at" | "approvalId" | "runId">; lang: Lang; linked: string | null; mayApprove: boolean; onApply: (d: "approved" | "rejected") => void }) {
  const t = COPY[lang];
  const v = session.verdict;
  const Icon = v === "approved" ? ShieldCheck : v === "rejected" ? ShieldX : ShieldAlert;
  const conditions = session.votes.flatMap((x) => x.conditions);
  const veto = session.votes.find((x) => x.stance === "veto");
  return (
    <div className={cn("border-t p-4", v === "approved" ? "border-os-emerald/30 bg-os-emerald/[0.04]" : v === "rejected" ? "border-red-400/30 bg-red-500/[0.05]" : "border-amber-300/30 bg-amber-300/[0.04]")}>
      <p className={cn("flex items-center gap-2 text-[17px] font-semibold", v === "approved" ? "text-os-emerald" : v === "rejected" ? "text-red-300" : "text-amber-200")}>
        <Icon className="size-5" /> {t.verdicts[v]}
        <span className="ms-auto font-mono text-[13px] tabular-nums">{(session.score * 100).toFixed(1)}%</span>
      </p>
      <p className="mt-1 text-[12.5px] text-white/60">{veto ? t.vetoed(veto.points[1]) : v === "approved" ? t.approvedWhy : v === "rejected" ? t.rejectedWhy : t.escalateWhy}</p>
      {conditions.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[12px] text-white/65">
          {conditions.map((c) => (
            <li key={c}>· {c}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 break-all font-mono text-[10px] text-white/35">
        {t.hash} {session.hash}
      </p>
      {linked && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-white/55">
            {v === "escalate" ? t.yourCall : t.applyTo} «{linked}»:
          </span>
          {(v === "escalate" ? (["approved", "rejected"] as const) : [v]).map((d) => (
            <button key={d} type="button" disabled={!mayApprove} onClick={() => onApply(d)} className={cn("flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] disabled:opacity-40", d === "approved" ? "border-os-emerald/40 text-os-emerald hover:bg-os-emerald/10" : "border-red-400/40 text-red-200 hover:bg-red-500/10")}>
              {d === "approved" ? <Check className="size-3.5" /> : <X className="size-3.5" />} {d === "approved" ? t.approve : t.reject}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
