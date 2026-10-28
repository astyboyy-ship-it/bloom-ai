"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Clock, History, Zap } from "lucide-react";
import { AUTO_RULES, DEFAULT_CRON, DEFAULT_STEPS, HUMAN_RULES, JOBS, jobResult, nextRun, optimized, stepCost, type Job, type ShiftRule, type Step } from "@/lib/studio/shift";
import { EngineShell, usePersistent, type Section, type StudioMeta } from "../frame";

export const META: StudioMeta = {
  index: "02",
  name: "Aware Infrastructure Architect · Shift Operator",
  kicker: "Infrastructure Architect",
  tagline: "zero-waste routing and overnight operations",
  painting: "wanderer",
  palette: "frost",
  accent: "#c9d6e6",
};

export const BASE = "/demo/engine-02";
const SECTIONS: Section[] = [
  { href: `${BASE}/shift`, label: "Shift", hint: "Clock in / off and today's focus", icon: Clock },
  { href: `${BASE}/optimizer`, label: "Optimizer", hint: "Exact-AI routing and token cost", icon: Zap },
  { href: `${BASE}/jobs`, label: "Jobs", hint: "Overnight schedules and agents", icon: CalendarClock },
  { href: `${BASE}/audit`, label: "Audit", hint: "Runs, token burn and trail", icon: History },
];

export type RunLine = { time: string; text: string; ok: boolean };
export type Run = { id: string; date: string; mode: "dry" | "apply"; lines: RunLine[]; summary: string; jobs: number };
export type JobConfig = { enabled: boolean; cron: string };
export type AuditEntry = { at: string; action: string; detail: string };
export type FocusBlock = { id: string; start: string; end: string; label: string };

export const usd = (n: number) => (n >= 100 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : `$${n.toFixed(2)}`);
export const total = (steps: Step[]) => steps.reduce((a, s) => a + stepCost(s).perDay, 0);

const SEED_RUN: Run = {
  id: "seed",
  date: "Last night",
  mode: "apply",
  jobs: 5,
  summary: "5 jobs · 0 failures · −$212/month infrastructure",
  lines: [
    { time: "22:00", text: "Clocked off. Shift rules handed to autonomous mode.", ok: true },
    { time: "22:00", text: "Archive tickets resolved more than 14 days ago: 1,482 tickets archived", ok: true },
    { time: "23:00", text: "Reconcile CRM ↔ billing: 2,904 accounts reconciled, 7 seat mismatches fixed", ok: true },
    { time: "00:30", text: "Load the day into the analytics warehouse: 4.2M rows loaded", ok: true },
    { time: "03:00", text: "Right-size idle instances: 6 instances downsized, ~$212/month saved", ok: true },
    { time: "05:00", text: "Renew TLS certificates expiring within 30 days: 1 certificate renewed", ok: true },
    { time: "06:00", text: "Shift complete. Morning brief ready.", ok: true },
  ],
};

const DEFAULT_FOCUS: FocusBlock[] = [
  { id: "f1", start: "09:00", end: "10:30", label: "Enterprise escalations" },
  { id: "f2", start: "10:30", end: "12:30", label: "Deep work: platform roadmap" },
  { id: "f3", start: "14:00", end: "15:00", label: "Refund approvals over $500" },
  { id: "f4", start: "16:00", end: "17:00", label: "Security & legal queue" },
];

const hhmm = (d = new Date()) => d.toTimeString().slice(0, 5);
const cronTime = (cron: string) => {
  const [m, h] = cron.split(/\s+/);
  return /^\d+$/.test(m) && /^\d+$/.test(h) ? `${h.padStart(2, "0")}:${m.padStart(2, "0")}` : "--:--";
};
// Overnight order: jobs after 18:00 run first, then those after midnight.
const nightKey = (cron: string) => {
  const [m, h] = cron.split(/\s+/).map(Number);
  const mins = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  return mins >= 18 * 60 ? mins - 24 * 60 : mins;
};

function useInfraState() {
  const [steps, setSteps] = usePersistent<Step[]>("bloom.e2.steps", DEFAULT_STEPS);
  const [human, setHuman] = usePersistent<ShiftRule[]>("bloom.e2.human", HUMAN_RULES);
  const [auto, setAuto] = usePersistent<ShiftRule[]>("bloom.e2.auto", AUTO_RULES);
  const [runs, setRuns] = usePersistent<Run[]>("bloom.e2.runs", [SEED_RUN]);
  const [jobs, setJobs] = usePersistent<Record<string, JobConfig>>("bloom.e2.jobs", Object.fromEntries(JOBS.map((j) => [j.id, { enabled: true, cron: DEFAULT_CRON[j.id] }])));
  const [trail, setTrail] = usePersistent<AuditEntry[]>("bloom.e2.trail", []);
  const [focus, setFocus] = usePersistent<FocusBlock[]>("bloom.e2.focus", DEFAULT_FOCUS);
  const [mode, setMode] = usePersistent<"dry" | "apply">("bloom.e2.mode", "apply");
  const [window_, setWindow] = usePersistent("bloom.e2.window", { start: "22:00", end: "06:00" });
  const [shift, setShift] = useState<"in" | "running" | "done">("in");
  const [live, setLive] = useState<RunLine[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const before = useMemo(() => total(steps), [steps]);
  const best = useMemo(() => total(steps.map(optimized)), [steps]);
  const baseline = useMemo(() => total(DEFAULT_STEPS), []);

  const record = (action: string, detail: string) => setTrail((t) => [{ at: new Date().toISOString(), action, detail }, ...t].slice(0, 300));

  const queue = () => JOBS.filter((j) => jobs[j.id]?.enabled).sort((a, b) => nightKey(jobs[a.id].cron) - nightKey(jobs[b.id].cron));

  const execute = (list: Job[], label: string, onDone?: (lines: RunLine[]) => void) => {
    const seed = Date.now() % 100000;
    const savings = Math.max(0, baseline - before);
    const lines: RunLine[] = [];
    let i = 0;
    const next = () => {
      if (i >= list.length) return onDone?.(lines);
      const job = list[i++];
      const line = { time: cronTime(jobs[job.id]?.cron ?? DEFAULT_CRON[job.id]), text: `${job.label}: ${mode === "dry" ? "would do: " : ""}${jobResult(job, seed + i, savings)}`, ok: true };
      lines.push(line);
      setLive((l) => [...l, line]);
      timer.current = setTimeout(next, 850);
    };
    record(label, `${list.length} job(s), ${mode === "dry" ? "dry run" : "applying changes"}`);
    timer.current = setTimeout(next, 600);
  };

  const clockOff = () => {
    const list = queue();
    if (!list.length) return false;
    const first = { time: window_.start, text: `Clocked off. ${human.filter((r) => r.on).length} human-only rules parked; ${auto.filter((r) => r.on).length} autonomous rules active.${mode === "dry" ? " Dry run: nothing will change." : ""}`, ok: true };
    setLive([first]);
    setShift("running");
    execute(list, "Clock off", (lines) => {
      const done = { time: window_.end, text: "Shift complete. Morning brief ready.", ok: true };
      setLive((l) => [...l, done]);
      setShift("done");
      const savings = Math.max(0, baseline - before);
      setRuns((r) => [
        { id: `r${Date.now()}`, date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), mode, jobs: list.length, lines: [first, ...lines, done], summary: `${list.length} jobs · 0 failures${savings > 0 && jobs.routing?.enabled ? ` · routing −$${(savings * 30).toFixed(0)}/month` : ""}` },
        ...r,
      ]);
    });
    return true;
  };

  const clockIn = () => {
    setShift("in");
    setLive([]);
    record("Clock in", `Back on shift at ${hhmm()}`);
  };

  const runNow = (job: Job) => {
    if (shift === "running") return;
    setLive([]);
    execute([job], "Run now", (lines) => {
      setRuns((r) => [{ id: `r${Date.now()}`, date: `${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} · manual`, mode, jobs: 1, lines, summary: `Run now: ${job.label}` }, ...r]);
    });
  };

  return {
    steps,
    setSteps,
    before,
    best,
    baseline,
    human,
    setHuman,
    auto,
    setAuto,
    runs,
    jobs,
    setJobs,
    trail,
    record,
    focus,
    setFocus,
    mode,
    setMode,
    window: window_,
    setWindow,
    shift,
    live,
    clockOff,
    clockIn,
    runNow,
    queue,
    nextRun,
  };
}

export type InfraState = ReturnType<typeof useInfraState>;
const Ctx = createContext<InfraState | null>(null);

export function useInfra() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useInfra must be used inside the Engine 02 layout");
  return v;
}

/** Engine 02's persistent layout: workflow, shift and job state, plus the app shell. */
export function InfraApp({ children }: { children: React.ReactNode }) {
  const state = useInfraState();
  return (
    <Ctx.Provider value={state}>
      <EngineShell meta={META} base={BASE} sections={SECTIONS}>
        {children}
      </EngineShell>
    </Ctx.Provider>
  );
}
