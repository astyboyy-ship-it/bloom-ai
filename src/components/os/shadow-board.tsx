"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { Check, Gavel, Play, RotateCcw, ShieldAlert, ShieldCheck, ShieldX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/components/desk/rbac";
import { activeMember, decideApproval, recordBoardSession, useDeskSettings, type BoardSession, type BoardVote } from "@/components/desk/settings";
import { DEFAULT_RULES } from "./architecture-rules";
import { OsPage } from "./os-shell";
import { BOARD_AGENTS, CRITERIA, deliberate, rebuttals } from "./shadow-board-logic";

const PRESETS = [
  { label: "Contract approval", subject: "Sign $48,000 annual renewal with Northwind Logistics", detail: "Counter-offer at 15% discount on a 2-year agreement; expected to retain $210k pipeline and upsell analytics seats. Legal review complete." },
  { label: "Budget re-allocation", subject: "Re-allocate $120k from paid social to outbound agents", detail: "Move Q4 budget into the Autonomous Outbound Engine to reduce cost per meeting; staged over 3 sprints with a pilot in NA mid-market first." },
  { label: "System intervention", subject: "Purge stale customer data and rotate admin credentials in production", detail: "Delete all customer records inactive > 24 months across every region and export the email list to the new CRM; rotate root API keys." },
];

type Live = { session: Omit<BoardSession, "hash" | "id" | "at"> & { hash?: string }; step: number };

/** /desk/shadow-board: an adversarial debate chamber that stress-tests high-stakes operations before execution. */
export function ShadowBoard() {
  const params = useSearchParams();
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
    load(arriving.id, arriving.title, `${arriving.detail} (raised by ${arriving.source}, priority ${arriving.priority.toUpperCase()}, owner ${arriving.owner})`);
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
    const result = deliberate({ subject: subject.trim(), detail: detail.trim(), budgetUsd: budget });
    const total = STEPS;
    setLive({ session: result, step: reduce ? total : 0 });
    const finish = () => {
      const hash = recordBoardSession({ ...result, id: `board-${Date.now().toString(36)}`, at: Date.now(), approvalId: linked?.id, runId: linked?.runId });
      setLive({ session: { ...result, hash }, step: total });
    };
    if (reduce) return finish();
    let step = 0;
    timer.current = setInterval(() => {
      step++;
      if (step >= total) {
        clearInterval(timer.current!);
        finish();
      } else setLive((l) => l && { ...l, step });
    }, 260);
  };

  const s = live?.session;
  const done = !!s?.hash;
  const history = [...settings.boardSessions].reverse().slice(0, 8);

  return (
    <OsPage kicker="Shadow board · adversarial consensus" title="Stress-test before you execute" lede="Three adversarial agents debate a high-stakes operation (a contract, a budget move, a system intervention) and must reach consensus before it touches live systems. The board is rule-based and runs locally: the same proposal always gets the same verdict, and every session is hashed into the audit log.">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <section className="os-panel space-y-3 rounded-2xl p-4">
          <p className="os-label flex items-center gap-2">
            <Gavel className="size-3.5 text-os-cyan" /> Proposal
          </p>
          {pending.length > 0 && (
            <label className="block text-[12px] text-white/55">
              From the approval queue
              <select value={approvalId ?? ""} onChange={(e) => { const a = pending.find((x) => x.id === e.target.value); if (a) load(a.id, a.title, `${a.detail} (raised by ${a.source}, owner ${a.owner})`); else setApprovalId(null); }} className="mt-1 w-full rounded-lg border border-os-line bg-os-panel px-3 py-2 text-[12.5px] text-white">
                <option value="">Free-form proposal</option>
                {pending.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.source}: {a.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => load(null, p.subject, p.detail)} className="rounded-full border border-os-line px-2.5 py-1 text-[11.5px] text-white/60 transition-colors hover:border-os-cyan/40 hover:text-white">
                {p.label}
              </button>
            ))}
          </div>
          <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 160))} placeholder="What should happen, e.g. Wire $60,000 deposit to vendor" aria-label="Proposal" className="w-full rounded-lg border border-os-line bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none" />
          <textarea value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 1200))} rows={4} placeholder="Context: scope, expected return, safeguards, rollback plan…" aria-label="Context" className="w-full resize-none rounded-lg border border-os-line bg-black/40 p-3 text-[12.5px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none" />
          <label className="flex items-center gap-2 text-[12px] text-white/55">
            Approval budget
            <span className="flex items-center rounded-lg border border-os-line bg-black/40 px-2">
              <span className="text-white/40">$</span>
              <input type="number" min={100} step={500} value={budget} onChange={(e) => setBudget(Math.max(100, Number(e.target.value) || 0))} aria-label="Approval budget in USD" className="w-28 bg-transparent px-1 py-1.5 font-mono text-[12.5px] text-white focus:outline-none" />
            </span>
          </label>
          <button type="button" onClick={convene} disabled={subject.trim().length < 4 || (!!live && !done)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-os-cyan px-4 py-2.5 text-[13px] font-semibold text-black shadow-[0_0_24px_-8px_rgb(0_240_255/0.8)] disabled:opacity-40">
            {done ? <RotateCcw className="size-4" /> : <Play className="size-4" />} {done ? "Reconvene the board" : "Convene the board"}
          </button>

          <div className="border-t border-os-line pt-3">
            <p className="os-label">Recent sessions</p>
            {history.length === 0 ? (
              <p className="mt-1.5 text-[12px] text-white/40">No sessions yet.</p>
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
          <div className="flex items-center justify-between border-b border-os-line px-4 py-2.5">
            <p className="os-label flex items-center gap-2 text-white/60">
              <span className={cn("size-1.5 rounded-full", live && !done ? "animate-pulse bg-os-cyan shadow-[0_0_8px_#00f0ff]" : "bg-white/25")} /> Debate stream
            </p>
            {s && <span className="font-mono text-[10.5px] text-white/40">consensus computed in {s.ms.toFixed(3)} ms</span>}
          </div>
          {!s ? (
            <div className="grid gap-2 p-4 sm:grid-cols-3">
              {Object.values(BOARD_AGENTS).map((a) => (
                <div key={a.name} className="rounded-xl border border-os-line bg-black/25 p-3">
                  <p className="text-[13px] font-medium" style={{ color: a.color }}>{a.name}</p>
                  <p className="mt-1 text-[12px] text-white/50">{a.role}</p>
                </div>
              ))}
              <p className="text-[12.5px] text-white/40 sm:col-span-3">Load a pending approval or a preset, then convene the board.</p>
            </div>
          ) : (
            <Debate session={s} step={live!.step} />
          )}
          {done && s && (
            <Verdict
              session={s as BoardSession}
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

function Debate({ session, step }: { session: Omit<BoardSession, "id" | "at" | "hash">; step: number }) {
  const lines: { agent: BoardVote["agent"]; round: string; text: string }[] = [];
  for (let i = 0; i < 4; i++) for (const v of session.votes) lines.push({ agent: v.agent, round: "Opening", text: v.points[i] });
  for (const r of rebuttals(session.votes)) lines.push({ agent: r.agent, round: "Rebuttal", text: r.line.replace(/^[^:]+: /, "") });
  for (const v of session.votes) lines.push({ agent: v.agent, round: "Vote", text: `${v.stance.toUpperCase()} at ${(v.score * 100).toFixed(0)}%${v.conditions.length ? ` · conditions: ${v.conditions.join("; ")}` : ""}` });
  const shown = lines.slice(0, step);
  return (
    <div>
      <ol className="max-h-[26rem] space-y-1.5 overflow-y-auto p-4">
        {shown.map((l, i) => {
          const a = BOARD_AGENTS[l.agent];
          return (
            <li key={i} className="flex gap-2.5 text-[12.5px] motion-safe:animate-[fade-in_0.3s_ease-out]">
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: a.color, boxShadow: `0 0 8px ${a.color}` }} />
              <span className="min-w-0">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">{l.round} · </span>
                <span className="font-medium" style={{ color: a.color }}>{a.short}</span>
                <span className="text-white/75"> {l.text}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {step >= STEPS - 1 && <Matrix votes={session.votes} />}
    </div>
  );
}

function Matrix({ votes }: { votes: BoardVote[] }) {
  // Each agent scores only the criteria in its mandate, so the matrix shows who drove what.
  return (
    <div className="overflow-x-auto border-t border-os-line p-4">
      <p className="os-label mb-2">Consensus matrix</p>
      <table className="w-full min-w-[38rem] text-[12px]">
        <thead>
          <tr className="text-start font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
            <th className="pb-1.5 text-start font-normal">Agent</th>
            {CRITERIA.map((c) => (
              <th key={c} className="pb-1.5 text-start font-normal">{c}</th>
            ))}
            <th className="pb-1.5 text-start font-normal">Vote</th>
            <th className="pb-1.5 text-end font-normal">Compute</th>
          </tr>
        </thead>
        <tbody>
          {votes.map((v) => (
            <tr key={v.agent} className="border-t border-os-line/50">
              <td className="py-1.5 pe-2" style={{ color: BOARD_AGENTS[v.agent].color }}>{BOARD_AGENTS[v.agent].short}</td>
              {CRITERIA.map((c) => {
                const x = v.criteria[c];
                return (
                  <td key={c} className="py-1.5 pe-2">
                    {x === undefined ? (
                      <span className="inline-block min-w-12 text-center font-mono text-white/20" title="Outside this agent's mandate">·</span>
                    ) : (
                      <span className="inline-block min-w-12 rounded px-1.5 py-0.5 text-center font-mono tabular-nums text-white" style={{ background: `rgb(${x < 0.5 ? "255 80 110" : "52 245 181"} / ${0.12 + Math.abs(x - 0.5) * 0.7})` }}>
                        {(x * 100).toFixed(0)}
                      </span>
                    )}
                  </td>
                );
              })}
              <td className={cn("py-1.5 pe-2 font-mono text-[11px] uppercase", v.stance === "support" ? "text-os-emerald" : v.stance === "conditional" ? "text-amber-300" : "text-red-300")}>{v.stance}</td>
              <td className="py-1.5 text-end font-mono text-[11px] tabular-nums text-white/50">{v.ms.toFixed(3)} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerdictDot({ v }: { v: BoardSession["verdict"] }) {
  return <span className={cn("size-2 shrink-0 rounded-full", v === "approved" ? "bg-os-emerald" : v === "rejected" ? "bg-red-400" : "bg-amber-300")} />;
}

function Verdict({ session, linked, mayApprove, onApply }: { session: BoardSession; linked: string | null; mayApprove: boolean; onApply: (d: "approved" | "rejected") => void }) {
  const v = session.verdict;
  const Icon = v === "approved" ? ShieldCheck : v === "rejected" ? ShieldX : ShieldAlert;
  const conditions = session.votes.flatMap((x) => x.conditions);
  const veto = session.votes.find((x) => x.stance === "veto");
  return (
    <div className={cn("border-t p-4", v === "approved" ? "border-os-emerald/30 bg-os-emerald/[0.04]" : v === "rejected" ? "border-red-400/30 bg-red-500/[0.05]" : "border-amber-300/30 bg-amber-300/[0.04]")}>
      <p className={cn("flex items-center gap-2 text-[17px] font-semibold", v === "approved" ? "text-os-emerald" : v === "rejected" ? "text-red-300" : "text-amber-200")}>
        <Icon className="size-5" /> {v === "approved" ? "Consensus: approve" : v === "rejected" ? "Consensus: reject" : "No consensus: escalate to a human"}
        <span className="ms-auto font-mono text-[13px] tabular-nums">{(session.score * 100).toFixed(1)}%</span>
      </p>
      <p className="mt-1 text-[12.5px] text-white/60">
        {veto ? "Compliance Gate exercised its veto: " + veto.points[1] : v === "approved" ? "Weighted score cleared the 62% bar with no agent opposed." : v === "rejected" ? "Weighted score fell below the 42% floor." : "Score landed between the floor and the bar, or an agent opposed."}
      </p>
      {conditions.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[12px] text-white/65">
          {conditions.map((c) => (
            <li key={c}>· {c}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 break-all font-mono text-[10px] text-white/35">session hash {session.hash}</p>
      {linked && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-white/55">{v === "escalate" ? "Your call on" : "Apply to"} &quot;{linked}&quot;:</span>
          {(v === "escalate" ? (["approved", "rejected"] as const) : [v]).map((d) => (
            <button key={d} type="button" disabled={!mayApprove} onClick={() => onApply(d)} className={cn("flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] disabled:opacity-40", d === "approved" ? "border-os-emerald/40 text-os-emerald hover:bg-os-emerald/10" : "border-red-400/40 text-red-200 hover:bg-red-500/10")}>
              {d === "approved" ? <Check className="size-3.5" /> : <X className="size-3.5" />} {d === "approved" ? "Approve as signed-off human" : "Reject"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
