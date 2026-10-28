"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_CRON, describeCron, JOBS, nextRun } from "@/lib/studio/shift";
import { Button } from "../../command-center/kit";
import { inputCls, PageBar, Panes, PaneSection } from "../frame";
import { useInfra } from "./store";

const AGENT: Record<string, string> = { "Admin cleanup": "Ops agent", "Backend sync": "Sync agent", "Infra optimization": "Infra agent" };

/** Overnight scheduler: a cron schedule per job, grouped by the background agent that runs it. */
export function JobsPage() {
  const s = useInfra();
  // Next-run times depend on the clock; compute after mount so the server render matches.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const groups = [...new Set(JOBS.map((j) => j.group))];
  const order = s.queue();

  const setJob = (id: string, patch: Partial<{ enabled: boolean; cron: string }>, audit?: string) => {
    s.setJobs({ ...s.jobs, [id]: { ...s.jobs[id], ...patch } });
    if (audit) s.record(audit, JOBS.find((j) => j.id === id)!.label);
  };

  return (
    <>
      <PageBar
        icon={CalendarClock}
        accent="#c9d6e6"
        title="Overnight scheduler"
        meta={`${order.length} of ${JOBS.length} jobs enabled · 5-field cron (minute hour day month weekday), your local time`}
        actions={
          <Button size="sm" variant="ghost" onClick={() => { s.setJobs(Object.fromEntries(JOBS.map((j) => [j.id, { enabled: true, cron: DEFAULT_CRON[j.id] }]))); s.record("Schedules reset", "All jobs back to defaults"); }}>
            <RotateCcw className="size-3.5" /> Reset schedules
          </Button>
        }
      />
      <Panes
        rightWidth={340}
        right={
          <PaneSection title="Tonight's run order">
            <ol className="space-y-1.5">
              {order.map((j, i) => (
                <li key={j.id} className="flex gap-2.5 text-[12.5px]">
                  <span className="w-11 shrink-0 font-mono tabular-nums text-white/45">{s.jobs[j.id].cron.split(" ").slice(0, 2).reverse().map((x) => x.padStart(2, "0")).join(":")}</span>
                  <span className="min-w-0">
                    <span className="block text-white/85">
                      {i + 1}. {j.label}
                    </span>
                    <span className="text-[11px] text-white/40">{AGENT[j.group]}</span>
                  </span>
                </li>
              ))}
            </ol>
            {s.shift === "running" && (
              <p className="mt-3 flex items-center gap-2 text-[12px] text-[#c9d6e6]">
                <Loader2 className="size-3.5 animate-spin" /> A run is in progress. Follow it on the Shift page.
              </p>
            )}
          </PaneSection>
        }
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#0b0a0e]/60 p-4">
          {groups.map((g) => (
            <section key={g} className="rounded-lg border border-white/[0.08] bg-[#121116]/90">
              <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
                <h2 className="text-[13px] font-semibold text-white">{AGENT[g]}</h2>
                <span className="text-[11.5px] text-white/40">{g}</span>
              </header>
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="text-[11px] text-white/40">
                    <th className="w-10 px-4 py-2 font-normal">On</th>
                    <th className="py-2 pr-3 font-normal">Job</th>
                    <th className="w-36 py-2 pr-3 font-normal">Schedule</th>
                    <th className="w-44 py-2 pr-3 font-normal">Next run</th>
                    <th className="w-24 py-2 pr-4 font-normal" />
                  </tr>
                </thead>
                <tbody>
                  {JOBS.filter((j) => j.group === g).map((j) => {
                    const cfg = s.jobs[j.id] ?? { enabled: true, cron: DEFAULT_CRON[j.id] };
                    const next = now ? nextRun(cfg.cron, now) : null;
                    const valid = nextRun(cfg.cron, new Date(0)) !== null;
                    return (
                      <tr key={j.id} className="border-t border-white/[0.05] align-top">
                        <td className="px-4 py-2.5">
                          <input type="checkbox" checked={cfg.enabled} onChange={(e) => setJob(j.id, { enabled: e.target.checked }, e.target.checked ? "Job enabled" : "Job disabled")} className="accent-[#c9d6e6]" aria-label={`Enable ${j.label}`} />
                        </td>
                        <td className={cn("py-2.5 pr-3", cfg.enabled ? "text-white/85" : "text-white/40")}>
                          {j.label}
                          <span className="block text-[11px] text-white/35">~{Math.round(j.hours * 60)} min</span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <input
                            className={cn(inputCls, "font-mono", !valid && "border-[#ff7b6b]/60")}
                            value={cfg.cron}
                            onChange={(e) => setJob(j.id, { cron: e.target.value })}
                            onBlur={(e) => valid && e.target.value !== DEFAULT_CRON[j.id] && s.record("Schedule changed", `${j.label}: ${e.target.value}`)}
                            aria-label={`Schedule for ${j.label}`}
                          />
                          <span className={cn("mt-1 block text-[11px]", valid ? "text-white/40" : "text-[#ff9d90]")}>{valid ? describeCron(cfg.cron) : "Not a valid schedule"}</span>
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-white/65">{!cfg.enabled ? "Disabled" : next ? next.toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : now ? "—" : ""}</td>
                        <td className="py-2.5 pr-4 text-right">
                          <Button size="sm" disabled={s.shift === "running"} onClick={() => s.runNow(j)}>
                            <Play className="size-3" /> Run now
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
          <p className="text-[11px] text-white/35">Runs are simulated: no infrastructure is connected. Manual runs and overnight runs both land in Audit.</p>
        </div>
      </Panes>
    </>
  );
}
