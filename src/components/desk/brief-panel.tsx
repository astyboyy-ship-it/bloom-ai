"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useDeskUi } from "./desk-ui-copy";
import { animate, useReducedMotion } from "framer-motion";
import { Check, Download, FileJson, FileText, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, isEngineKey, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import type { Metric } from "@/lib/engines/brief";
import { can } from "./rbac";
import { activeMember, audit, decideApproval, registerApprovals, useDeskSettings } from "./settings";

type Action = { title: string; owner: string; priority: "p0" | "p1" | "p2"; detail: string };
type Decision = "approved" | "rejected";

const PRIORITY: Record<Action["priority"], string> = {
  p0: "border-red-400/50 text-red-200",
  p1: "border-[#f0d59a]/50 text-[#f3e2b8]",
  p2: "border-white/15 text-white/55",
};

/**
 * The run's executive output: the brief types itself out, headline metrics count up, actions over the approval
 * threshold wait for a decision (by members whose role allows approving), and the whole thing downloads as
 * JSON or Markdown, decisions included.
 */
export function BriefPanel({
  engine,
  runId,
  output,
  brief,
  source,
}: {
  engine: EngineKey;
  runId: string | null;
  output: unknown;
  brief: { markdown: string; metrics: Metric[]; approvals: number[] } | null;
  /** What raised the approvals (an engine or an architecture product); defaults to the engine's name. */
  source?: string;
}) {
  const { settings } = useDeskSettings();
  const member = activeMember(settings);
  const mayApprove = can(member.role, "approve");
  const o = (output && typeof output === "object" ? output : {}) as { confidence?: number; actions?: Action[] };
  const actions = o.actions ?? [];
  const typed = useTypewriter(brief?.markdown ?? "");
  const u = useDeskUi();

  // Approval-gated actions join the workspace queue, so the Home approval bay sees the same decisions.
  useEffect(() => {
    if (runId && brief?.approvals.length) registerApprovals(runId, source ?? ENGINES[engine].name, engine, actions, brief.approvals);
    // Registered once per run; the queue ignores repeats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);
  const decisions: Record<number, { decision: Decision; by: string; at: number }> = Object.fromEntries(
    settings.approvals.filter((a) => a.runId === runId && a.status !== "pending").map((a) => [Number(a.id.split(":")[1]), { decision: a.status as Decision, by: a.by ?? "", at: a.decidedAt ?? a.at }]),
  );
  const decide = (i: number, decision: Decision) => {
    if (runId) decideApproval(`${runId}:${i}`, decision);
  };

  const download = (kind: "json" | "md") => {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const name = `bloom-${engine}-${runId ?? stamp}`;
    const decided = Object.entries(decisions).map(([i, d]) => ({ action: actions[Number(i)]?.title, ...d, at: new Date(d.at).toISOString() }));
    const body =
      kind === "json"
        ? JSON.stringify({ engine, runId, generatedAt: new Date().toISOString(), output, metrics: brief?.metrics ?? [], approvalsRequired: brief?.approvals ?? [], decisions: decided }, null, 2)
        : `${brief?.markdown ?? ""}${decided.length ? `\n\n## Approval decisions\n${decided.map((d) => `- ${d.action}: **${d.decision}** by ${d.by} (${d.at})`).join("\n")}` : ""}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: kind === "json" ? "application/json" : "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${name}.${kind}` });
    a.click();
    URL.revokeObjectURL(url);
    audit("run", `Downloaded the ${ENGINES[engine].name} report as ${kind.toUpperCase()}`);
  };

  if (!brief) return null;
  const pending = brief.approvals.filter((i) => !decisions[i]).length;

  return (
    <section aria-label={u.brief.section} style={paletteVars(PALETTES[engine])} className="os-panel rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#f0d59a]/85">{u.brief.title(ENGINES[engine].name)}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => download("md")} className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[11.5px] text-white/75 hover:border-c-edge hover:text-white">
            <FileText className="size-3.5" /> Markdown
          </button>
          <button type="button" onClick={() => download("json")} className="demo-hide flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[11.5px] text-white/75 hover:border-c-edge hover:text-white">
            <FileJson className="size-3.5" /> JSON
          </button>
          <Download className="size-3.5 text-white/30" aria-hidden />
        </div>
      </div>

      {brief.metrics.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {brief.metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-c-edge/40 bg-black/30 px-3 py-2.5">
              <dt className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-white/45" title={m.label}>
                {m.label}
              </dt>
              <dd className="mt-1 font-mono text-[19px] tabular-nums text-c-2">
                <CountUp metric={m} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div dir="auto" className="mt-4 max-h-[26rem] overflow-y-auto rounded-xl border border-white/[0.06] bg-black/30 p-4 text-[13px] leading-relaxed text-white/80">
        <Markdown text={typed} />
        {typed.length < brief.markdown.length && <span className="ms-0.5 inline-block h-4 w-1.5 animate-pulse bg-c-1 align-middle" aria-hidden />}
      </div>

      {brief.approvals.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            <ShieldAlert className="size-3.5 text-[#f3e2b8]" /> {u.brief.hitl} · {pending ? u.brief.awaiting(pending) : u.brief.allDecided}
          </p>
          <ul className="mt-2 space-y-2">
            {brief.approvals.map((i) => {
              const a = actions[i];
              if (!a) return null;
              const d = decisions[i];
              const owner = isEngineKey(a.owner) ? ENGINES[a.owner].name : u.brief.human;
              return (
                <li key={i} className="flex flex-wrap items-start gap-3 rounded-xl border border-white/[0.08] bg-black/25 p-3">
                  <span className={cn("h-fit shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase", PRIORITY[a.priority])}>{u.brief.priority[a.priority] ?? a.priority}</span>
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="text-[13px] font-medium text-white">
                      {a.title} <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/45">· {owner}</span>
                    </p>
                    <p dir="auto" className="mt-0.5 text-[12px] text-white/55">{a.detail}</p>
                  </div>
                  {d ? (
                    <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px]", d.decision === "approved" ? "bg-emerald-400/15 text-emerald-200" : "bg-red-500/15 text-red-200")}>
                      {d.decision === "approved" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                      {d.decision === "approved" ? u.brief.approved : u.brief.rejected} · {d.by}
                    </span>
                  ) : (
                    <span className="flex gap-1.5">
                      <button type="button" disabled={!mayApprove} onClick={() => decide(i, "approved")} className="rounded-full border border-emerald-400/40 px-3 py-1 text-[11.5px] text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-35" title={mayApprove ? undefined : u.brief.noApprove}>
                        {u.brief.approve}
                      </button>
                      <button type="button" disabled={!mayApprove} onClick={() => decide(i, "rejected")} className="rounded-full border border-red-400/40 px-3 py-1 text-[11.5px] text-red-200 hover:bg-red-500/10 disabled:opacity-35">
                        {u.brief.reject}
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Reveals text progressively, about 60 characters a frame-batch, as if the model were writing it. */
function useTypewriter(text: string) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    if (reduce) {
      setN(text.length);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      // Faster through long briefs so even a big report finishes in a few seconds.
      i = Math.min(text.length, i + Math.max(3, Math.round(text.length / 220)));
      setN(i);
      if (i >= text.length) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [text, reduce]);
  return text.slice(0, n);
}

function CountUp({ metric }: { metric: Metric }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, metric.value, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: setV });
    return () => c.stop();
  }, [metric.value]);
  const r = metric.unit === "usd" || metric.unit === "count" ? Math.round(v) : Math.round(v * 10) / 10;
  return <>{metric.unit === "usd" ? `$${r.toLocaleString("en-US")}` : metric.unit === "hours" ? `${r.toLocaleString("en-US")}h` : metric.unit === "percent" ? `${r}%` : r.toLocaleString("en-US")}</>;
}

/** The brief's small Markdown dialect: headings, quotes, lists, tables, bold and italics. */
function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => text.split("\n"), [text]);
  const out: React.ReactNode[] = [];
  let table: string[][] = [];
  const flush = (key: number) => {
    if (!table.length) return;
    const [head, , ...rows] = table;
    out.push(
      <table key={`t${key}`} className="my-2 w-full border-collapse text-[12px]">
        <thead>
          <tr>{head.map((c, i) => <th key={i} className="border-b border-white/15 py-1 pe-3 text-start font-medium text-white/60">{inline(c)}</th>)}</tr>
        </thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border-b border-white/[0.06] py-1 pe-3 tabular-nums">{inline(c)}</td>)}</tr>)}</tbody>
      </table>,
    );
    table = [];
  };
  blocks.forEach((line, i) => {
    if (line.startsWith("|")) {
      table.push(line.split("|").slice(1, -1).map((c) => c.trim()));
      return;
    }
    flush(i);
    if (line.startsWith("# ")) out.push(<h3 key={i} className="font-logo text-[19px] font-medium text-white">{inline(line.slice(2))}</h3>);
    else if (line.startsWith("## ")) out.push(<h4 key={i} className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-c-2">{inline(line.slice(3))}</h4>);
    else if (line.startsWith("### ")) out.push(<h5 key={i} className="mt-2 text-[12.5px] font-semibold text-white/85">{inline(line.slice(4))}</h5>);
    else if (line.startsWith("> ")) out.push(<blockquote key={i} className="my-1 border-s-2 border-c-1/50 ps-3 italic text-white/55">{inline(line.slice(2))}</blockquote>);
    else if (/^\s*([-*]|\d+\.)\s/.test(line)) out.push(<p key={i} className="ps-3">{inline(line.trim())}</p>);
    else if (line.trim()) out.push(<p key={i}>{inline(line)}</p>);
  });
  flush(blocks.length);
  return <>{out}</>;
}

function inline(s: string): React.ReactNode {
  return s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    ) : part.startsWith("_") && part.endsWith("_") && part.length > 2 ? (
      <em key={i} className="text-white/55">{part.slice(1, -1)}</em>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
