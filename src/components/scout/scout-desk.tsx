"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Radio, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { OsPage } from "@/components/os/os-shell";
import { can } from "@/components/desk/rbac";
import { activeMember, audit, decideApproval, registerApprovals, useDeskSettings } from "@/components/desk/settings";
import { ILLUSTRATIVE_RUNS } from "@/lib/scout/scenarios";
import type { ScoutRun } from "@/lib/scout/types";
import { BriefView } from "./brief-view";
import { briefText, counterpartName } from "./brief-text";
import { useScoutCopy } from "./copy";
import { FeedCard } from "./feed-card";
import { RunConsole, type ScoutHealth } from "./run-console";

type Tab = "feed" | "run" | "briefs";
export const SCOUT_SOURCE = "exchange-scout";

/**
 * /desk/exchange-scout: sandbox negotiations on Bloom Exchange, and where they hand off to the owner.
 *   Feed    live sandbox runs (from /api/scout/runs) above the two illustrative blueprints
 *   Run     start a live run (gated; see RunConsole)
 *   Briefs  the owner handoff queue: each live run's brief, queued as an approval and recorded in the audit log
 */
export function ScoutDesk() {
  const c = useScoutCopy();
  const { settings } = useDeskSettings();
  const me = activeMember(settings);
  const [tab, setTab] = useState<Tab>("feed");
  const [health, setHealth] = useState<ScoutHealth | null>(null);
  const [healthFailed, setHealthFailed] = useState(false);
  const [live, setLive] = useState<ScoutRun[] | null>(null);
  const [open, setOpen] = useState<ScoutRun | null>(null);

  useEffect(() => {
    let gone = false;
    fetch("/api/scout/health", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<ScoutHealth>) : Promise.reject(new Error(String(r.status)))))
      .then((h) => !gone && setHealth(h))
      .catch(() => !gone && setHealthFailed(true));
    fetch("/api/scout/runs", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ runs: ScoutRun[] }>) : { runs: [] }))
      .then((j) => !gone && setLive((prev) => mergeRuns(prev ?? [], j.runs)))
      .catch(() => !gone && setLive((prev) => prev ?? []));
    return () => {
      gone = true;
    };
  }, []);

  const onDone = useCallback(
    (run: ScoutRun) => {
      setLive((prev) => mergeRuns([run], prev ?? []));
      // The owner handoff: one approval holding the four-section brief, plus an audit entry. Nothing leaves the desk.
      registerApprovals(run.id, SCOUT_SOURCE, "sovereign", [{ title: c.approval.title(c.scenario[run.scenario].title, counterpartName(run, c)), detail: briefText(run, c), priority: "p0", owner: "human" }], [0]);
      audit("approval", `Exchange Scout queued an owner brief for live run ${run.id} (${run.gap.note.kind}, ${run.outcome})`);
    },
    [c],
  );

  const briefs = useMemo(() => settings.approvals.filter((a) => a.source === SCOUT_SOURCE).slice().reverse(), [settings.approvals]);
  const runById = useMemo(() => new Map((live ?? []).map((r) => [r.id, r])), [live]);

  const relayPill = health?.relay ? (
    <span className="flex items-center gap-1.5 rounded-full border border-os-line bg-os-panel/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
      <Activity className="size-3 text-os-emerald" /> {c.relay.up(health.relay.store, health.relay.nonces)}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 rounded-full border border-os-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
      <Activity className={cn("size-3", healthFailed || health ? "text-red-400" : "text-white/40")} /> {healthFailed || health ? c.relay.down : c.relay.checking}
    </span>
  );

  return (
    <OsPage
      route="/desk/exchange-scout"
      actions={
        <>
          {relayPill}
          {health?.relay && <span className="hidden rounded-full border border-os-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50 sm:inline">{c.relay.streams(health.relay.transports)}</span>}
          {health && (
            <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]", health.live ? "border-os-emerald/40 text-os-emerald" : "border-white/15 text-white/50")}>
              <Radio className="size-3" /> {health.live ? c.relay.live : c.relay.liveOff}
            </span>
          )}
          <div role="tablist" className="flex rounded-full border border-os-line p-0.5">
            {(["feed", "run", "briefs"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-full px-3.5 py-1 text-[12.5px] transition-colors", tab === k ? "bg-os-cyan/15 text-os-cyan" : "text-white/60 hover:text-white")}>
                {c.tabs[k]}
                {k === "briefs" && briefs.some((b) => b.status === "pending") && <span className="ms-1.5 inline-block size-1.5 rounded-full bg-os-gold align-middle" />}
              </button>
            ))}
          </div>
        </>
      }
    >
      {tab === "feed" && (
        <div className="grid gap-6">
          <section>
            <h2 className="os-label mb-2">{c.feed.live}</h2>
            {live === null ? (
              <p className="text-[13px] text-white/45">{c.feed.loading}</p>
            ) : live.length ? (
              <div className="grid gap-4 xl:grid-cols-2">{live.map((r) => <FeedCard key={r.id} run={r} onOpenBrief={setOpen} />)}</div>
            ) : (
              <p className="text-[13px] text-white/45">{c.feed.noLive}</p>
            )}
          </section>
          <section>
            <h2 className="os-label mb-2">{c.feed.illustrative}</h2>
            <div className="grid gap-4 xl:grid-cols-2">{ILLUSTRATIVE_RUNS.map((r) => <FeedCard key={r.id} run={r} onOpenBrief={setOpen} />)}</div>
          </section>
        </div>
      )}

      {tab === "run" && <RunConsole health={health} onDone={onDone} />}

      {tab === "briefs" && (
        <section className="grid gap-3">
          <p className="text-[12.5px] text-white/50">{c.briefs.note}</p>
          {briefs.length === 0 && <p className="text-[13px] text-white/45">{c.briefs.empty}</p>}
          {briefs.map((a) => {
            const run = runById.get(a.runId);
            return (
              <article key={a.id} className="os-panel rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ScrollText className="size-4 text-os-cyan" />
                  <h3 className="min-w-0 flex-1 text-[14.5px] text-white">{a.title}</h3>
                  <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]", a.status === "pending" ? "border-os-gold/40 text-os-gold" : a.status === "approved" ? "border-os-emerald/40 text-os-emerald" : "border-red-400/40 text-red-300")}>{c.briefs.status[a.status]}</span>
                </div>
                {run ? (
                  <button type="button" onClick={() => setOpen(run)} className="mt-2 text-[12.5px] text-os-cyan hover:underline">
                    {c.brief.open}
                  </button>
                ) : (
                  <>
                    <p className="mt-2 text-[12px] text-white/40">{c.briefs.noRun}</p>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-white/70">{a.detail}</pre>
                  </>
                )}
                {a.status === "pending" && can(me.role, "approve") && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => decideApproval(a.id, "approved")} className="rounded-full border border-os-emerald/40 px-3 py-1.5 text-[12px] text-os-emerald hover:bg-os-emerald/10">
                      {c.briefs.approve}
                    </button>
                    <button type="button" onClick={() => decideApproval(a.id, "rejected")} className="rounded-full border border-red-400/40 px-3 py-1.5 text-[12px] text-red-300 hover:bg-red-400/10">
                      {c.briefs.reject}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {open && <BriefView run={open} onClose={() => setOpen(null)} />}
    </OsPage>
  );
}

/** Newest first, one entry per run id. */
function mergeRuns(a: ScoutRun[], b: ScoutRun[]): ScoutRun[] {
  const seen = new Set<string>();
  return [...a, ...b].filter((r) => r.mode === "live" && !seen.has(r.id) && (seen.add(r.id), true)).sort((x, y) => Date.parse(y.startedAt) - Date.parse(x.startedAt));
}
