"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Loader2, Moon, Play, Sun } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DEFAULT_CRON, DEFAULT_STEPS, describeCron, JOBS, jobResult, levers, MODEL_IDS, MODELS, nextRun, stepCost, TASKS, type Lever, type ModelId, type Step } from "@/lib/studio/shift";
import { usePersistent } from "../../studio/frame";
import { Hud, SpatialGraph, type Burst, type GraphEdge, type GraphNode } from "../graph";
import { CommandBar, glass, PanelHead, Segmented, Slider, Toggle, Sprig } from "../ui";
import { InfrastructureArchitectShell } from "./shell";

const total = (steps: Step[]) => steps.reduce((a, s) => a + stepCost(s).perDay, 0);
const usd = (n: number) => `$${n.toFixed(2)}`;
const SHORT: Record<ModelId, string> = { "claude-haiku-5-5": "Haiku", "claude-sonnet-5-5": "Sonnet", "claude-opus-5-5": "Opus" };

/**
 * Every optimization in order of what it saves: each slider notch applies the next biggest one.
 * Notch 0 is today's setup; the last notch is the fully exact workflow.
 */
type Notch = { steps: Step[]; cost: number; label: string; lever?: Lever["id"] };

function ladder() {
  const out: Notch[] = [{ cost: total(DEFAULT_STEPS), label: "Today's setup", steps: DEFAULT_STEPS }];
  let cur = DEFAULT_STEPS;
  for (;;) {
    let best: Notch | null = null;
    for (const [i, s] of cur.entries()) {
      for (const l of levers(s)) {
        const next = cur.map((x, j) => (j === i ? l.apply(x) : x));
        const c = total(next);
        if (!best || c < best.cost) best = { steps: next, cost: c, label: `${s.name}: ${l.label.charAt(0).toLowerCase()}${l.label.slice(1)}`, lever: l.id };
      }
    }
    if (!best || best.cost >= out[out.length - 1].cost - 0.001) break;
    out.push(best);
    cur = best.steps;
  }
  return out;
}

// Schedules a person would pick; the job's own default is always offered too.
const PRESETS = ["0 22 * * *", "0 0 * * *", "0 2 * * *", "0 4 * * *", "0 2 * * 1-5", "0 4 * * 0"];
const LEVER_LABEL: Record<Lever["id"], string> = { model: "Right-sizing models", compress: "Prompt trimming", cache: "System-prompt caching", batch: "Batch processing" };
const when = (d: Date | null) => (d ? d.toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "—");

type Line = { job: string; result: string };

// Typical p95 latency per model for this workload, used to simulate live telemetry from the routing mix.
const P95_MS: Record<ModelId, number> = { "claude-haiku-5-5": 380, "claude-sonnet-5-5": 920, "claude-opus-5-5": 1650 };
const SHORT_ID: Record<ModelId, "haiku" | "sonnet" | "opus"> = { "claude-haiku-5-5": "haiku", "claude-sonnet-5-5": "sonnet", "claude-opus-5-5": "opus" };
const BY_SHORT = { haiku: "claude-haiku-5-5", sonnet: "claude-sonnet-5-5", opus: "claude-opus-5-5" } as const;

/** Fallback tiers when a primary model errors or times out. DeepSeek and local models are billed by their own provider. */
type Tier = { id: "sonnet" | "haiku" | "deepseek" | "local"; on: boolean };
const TIER_LABEL: Record<Tier["id"], string> = { sonnet: "Claude Sonnet 5.5", haiku: "Claude Haiku 5.5", deepseek: "DeepSeek (external)", local: "Local model (self-hosted)" };
const DEFAULT_CASCADE: Tier[] = [
  { id: "sonnet", on: true },
  { id: "haiku", on: true },
  { id: "deepseek", on: false },
  { id: "local", on: true },
];
const BUDGETS = [0, 500, 1000, 2000];

const hms = (ms: number) => [Math.floor(ms / 3_600_000), Math.floor(ms / 60_000) % 60, Math.floor(ms / 1000) % 60].map((v) => String(v).padStart(2, "0")).join(":");

function Spark({ data }: { data: number[] }) {
  if (data.length < 2) return <svg className="h-8 w-full" />;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * 100).toFixed(1)},${(28 - ((v - lo) / (hi - lo || 1)) * 24).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full overflow-visible">
      <polyline points={pts} fill="none" stroke="rgb(var(--p-glow))" strokeWidth={1.4} vectorEffect="non-scaling-stroke" style={{ filter: "drop-shadow(0 0 4px rgb(var(--p-glow) / 0.8))" }} />
    </svg>
  );
}

/**
 * System health, sampled every two seconds from the current routing: request rate from the workflow's
 * call volume, p95 latency from the model mix, spend from the live bill. Simulated around those baselines.
 */
function Telemetry({ steps, costPerDay }: { steps: Step[]; costPerDay: number }) {
  const calls = steps.reduce((a, s) => a + s.callsPerDay, 0);
  const base = {
    rpm: calls / 1440,
    p95: steps.reduce((a, s) => a + P95_MS[s.model] * s.callsPerDay, 0) / calls,
    err: 0.18,
    spend: costPerDay / 24,
  };
  const [series, setSeries] = useState<Record<keyof typeof base, number[]>>({ rpm: [], p95: [], err: [], spend: [] });
  const baseRef = useRef(base);
  baseRef.current = base;
  useEffect(() => {
    const sample = () => {
      const b = baseRef.current;
      const j = (v: number, pct: number) => v * (1 + (Math.random() - 0.5) * pct);
      setSeries((s) => ({
        rpm: [...s.rpm, j(b.rpm, 0.3)].slice(-30),
        p95: [...s.p95, j(b.p95, 0.18)].slice(-30),
        err: [...s.err, Math.max(0, j(b.err, 0.9))].slice(-30),
        spend: [...s.spend, j(b.spend, 0.25)].slice(-30),
      }));
    };
    sample();
    const t = setInterval(sample, 2000);
    return () => clearInterval(t);
  }, []);
  const last = (k: keyof typeof base) => series[k][series[k].length - 1] ?? base[k];
  const tiles = [
    { k: "rpm" as const, label: "Requests / min", value: last("rpm").toFixed(1) },
    { k: "p95" as const, label: "p95 latency", value: `${Math.round(last("p95"))} ms` },
    { k: "err" as const, label: "Error rate", value: `${last("err").toFixed(2)}%` },
    { k: "spend" as const, label: "Spend / hour", value: `$${last("spend").toFixed(2)}` },
  ];
  return (
    <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.k} className="rounded-2xl border border-p-edge/10 bg-black/20 px-4 py-3 shadow-[inset_0_2px_6px_rgb(0_0_0/0.35)]">
          <p className="text-[12px] text-p-text/55">{t.label}</p>
          <p className="prod-glow mt-0.5 text-[22px] font-semibold tabular-nums text-p-accent">{t.value}</p>
          <Spark data={series[t.k]} />
        </div>
      ))}
    </div>
  );
}

/** Infrastructure Architect: the shift console, the exact-AI bill, model routing and the night's cron. */
export function InfrastructureArchitectApp() {
  const steps = useMemo(ladder, []);
  const [level, setLevel] = usePersistent("bloom.s2.level", 0);
  const [overrides, setOverrides] = usePersistent<Record<string, ModelId>>("bloom.s2.models", {});
  const [tasks, setTasks] = usePersistent<Record<string, boolean>>("bloom.s2.tasks", Object.fromEntries(JOBS.map((j) => [j.id, true])));
  const [cron, setCron] = usePersistent<Record<string, string>>("bloom.s2.cron", DEFAULT_CRON);
  const [focus, setFocus] = usePersistent("bloom.s2.focus", "");
  const [shiftStart, setShiftStart] = usePersistent<number | null>("bloom.s2.shiftStart", null);
  const [prune, setPrune] = usePersistent("bloom.s2.prune", 0);
  const [budgets, setBudgets] = usePersistent<Record<string, number>>("bloom.s2.latency", {});
  const [cascade, setCascade] = usePersistent<Tier[]>("bloom.s2.cascade", DEFAULT_CASCADE);
  const [burst, setBurst] = useState<Burst | null>(null);
  const [state, setState] = useState<"in" | "off">("in");
  // A one-second clock for the shift console; null until mounted so server and browser render the same.
  const [tick, setTick] = useState<number | null>(null);
  useEffect(() => {
    setTick(Date.now());
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (tick && shiftStart === null) setShiftStart(tick);
  }, [tick, shiftStart, setShiftStart]);
  const onShift = tick && shiftStart ? hms(tick - shiftStart) : "--:--:--";
  const [lines, setLines] = useState<Line[]>([]);
  // Next-run times depend on the clock: computed after mount so server and browser render the same.
  const [now, setNow] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      clearInterval(t);
      clearTimeout(timer.current);
    };
  }, []);

  const k = Math.min(level, steps.length - 1);
  const routed = steps[k].steps.map((s) => (overrides[s.id] ? { ...s, model: overrides[s.id] } : s));
  // Token pruning trims up to 40% of each step's variable input (the ticket or document), never the system prompt.
  const final = routed.map((s) => ({ ...s, inputTokens: Math.round(s.inputTokens * (1 - (0.4 * prune) / 100)) }));
  const cost = total(final);
  const pruneSaving = total(routed) - cost;
  const callsBy = (m: ModelId) => final.filter((s) => s.model === m).reduce((a, s) => a + s.callsPerDay, 0);
  const costBy = (m: ModelId) => final.filter((s) => s.model === m).reduce((a, s) => a + stepCost(s).perDay, 0);
  const allCalls = final.reduce((a, s) => a + s.callsPerDay, 0);
  const batchedCalls = final.filter((s) => s.batch).reduce((a, s) => a + s.callsPerDay, 0);
  const p95 = final.reduce((a, s) => a + P95_MS[s.model] * s.callsPerDay, 0) / allCalls;
  const cheapest = MODEL_IDS.filter((m) => callsBy(m) > 0)[0] ?? MODEL_IDS[0];
  const fire = (path: string[]) => setBurst({ key: Date.now(), path });
  const setLevelAndRoute = (v: number) => {
    setLevel(v);
    fire(["ingress", "router", SHORT_ID[cheapest]]);
  };
  const enabledTiers = cascade.filter((c) => c.on);
  const nodes: GraphNode[] = [
    { id: "ingress", label: "Ingress", x: 80, y: 215, metric: `${allCalls.toLocaleString("en-US")}/day`, sub: `${(allCalls / 1440).toFixed(1)} req/min`, state: "done" },
    { id: "router", label: "Exact-AI router", x: 270, y: 215, r: 26, metric: `${usd(cost)}/day`, sub: `p95 ${Math.round(p95)} ms`, state: "active" },
    ...MODEL_IDS.map((m, i) => ({ id: SHORT_ID[m], label: SHORT[m], x: [530, 560, 530][i], y: [90, 215, 340][i], metric: `${callsBy(m).toLocaleString("en-US")} calls`, sub: `${usd(costBy(m))}/day`, state: (callsBy(m) ? "active" : "idle") as GraphNode["state"] })),
    { id: "batch", label: "Batch API", x: 770, y: 345, metric: `${batchedCalls.toLocaleString("en-US")} calls`, sub: "50% off · async", state: batchedCalls ? "done" : "idle" },
    { id: "deepseek", label: "DeepSeek", x: 790, y: 95, metric: cascade.find((c) => c.id === "deepseek")?.on ? "fallback" : "off", sub: "external", state: cascade.find((c) => c.id === "deepseek")?.on ? "done" : "idle" },
    { id: "local", label: "Local model", x: 935, y: 215, metric: cascade.find((c) => c.id === "local")?.on ? "fallback" : "off", sub: "self-hosted", state: cascade.find((c) => c.id === "local")?.on ? "done" : "idle" },
  ];
  const edges: GraphEdge[] = [
    { from: "ingress", to: "router", flow: 0.9 },
    ...MODEL_IDS.map((m) => ({ from: "router", to: SHORT_ID[m], flow: callsBy(m) / allCalls })),
    { from: "router", to: "batch", flow: batchedCalls / allCalls, curve: 0.25 },
    // The fallback cascade: each enabled tier hands off to the next.
    ...enabledTiers.slice(1).map((t, i) => ({ from: enabledTiers[i].id, to: t.id, flow: 0.06, curve: -0.2 })),
  ];
  const saved = steps[0].cost - cost;
  // Where the saving comes from: each applied notch credited to its lever.
  const byLever = steps.slice(1, k + 1).reduce<Partial<Record<Lever["id"], number>>>((acc, s, i) => {
    if (s.lever) acc[s.lever] = (acc[s.lever] ?? 0) + (steps[i].cost - s.cost);
    return acc;
  }, {});
  const active = JOBS.filter((j) => tasks[j.id])
    .map((j) => ({ j, next: now ? nextRun(cron[j.id] ?? DEFAULT_CRON[j.id], now) : null }))
    .sort((a, b) => (a.next?.getTime() ?? 0) - (b.next?.getTime() ?? 0));
  const hours = active.reduce((a, x) => a + x.j.hours, 0);

  const clockOff = () => {
    fire(["ingress", "router", "batch"]);
    setShiftStart(null);
    setState("off");
    setLines([]);
    const seed = Date.now() % 100000;
    let i = 0;
    const next = () => {
      if (i >= active.length) return;
      const { j } = active[i++];
      setLines((l) => [...l, { job: j.label, result: jobResult(j, seed + i, Math.max(0, saved)) }]);
      timer.current = setTimeout(next, 650);
    };
    timer.current = setTimeout(next, 500);
  };
  const running = state === "off" && lines.length < active.length;

  const onCommand = (cmd: string): string | undefined => {
    const [verb, ...rest] = cmd.trim().split(/\s+/);
    const arg = rest.join(" ").toLowerCase();
    switch (verb.toLowerCase()) {
      case "clock":
        if (arg === "off") {
          if (state === "off") return "Already off shift.";
          clockOff();
          return `Clocked off: ${active.length} jobs armed for tonight.`;
        }
        if (arg === "in") {
          setShiftStart(Date.now());
          setState("in");
          setLines([]);
          return "Clocked in. Shift timer started.";
        }
        return "Usage: clock off | clock in";
      case "level": {
        const n = arg === "max" ? steps.length - 1 : arg === "reset" ? 0 : Number(arg);
        if (!Number.isInteger(n) || n < 0 || n >= steps.length) return `Usage: level 0–${steps.length - 1}, max or reset`;
        setLevelAndRoute(n);
        return `Optimization level ${n}: ${usd(total(steps[n].steps))}/day before your overrides.`;
      }
      case "route": {
        const [num, model] = arg.split(/\s+/);
        const s = final[Number(num) - 1];
        const m = BY_SHORT[model as keyof typeof BY_SHORT];
        if (!s || !m) return `Usage: route <1–${final.length}> haiku|sonnet|opus`;
        setOverrides({ ...overrides, [s.id]: m });
        fire(["ingress", "router", model]);
        return `${s.name} now runs on ${SHORT[m]}.`;
      }
      case "prune": {
        const n = Number(arg);
        if (!Number.isFinite(n) || n < 0 || n > 100) return "Usage: prune 0–100";
        setPrune(Math.round(n / 5) * 5);
        return `Token pruning at ${Math.round(n / 5) * 5}%.`;
      }
      case "run": {
        const j = JOBS.find((x) => x.id === arg || x.label.toLowerCase().includes(arg));
        if (!arg || !j) return `Jobs: ${JOBS.map((x) => x.id).join(", ")}`;
        return `${j.label}: ${jobResult(j, Date.now() % 100000, Math.max(0, saved))}`;
      }
      case "focus":
        setFocus(rest.join(" "));
        return rest.length ? `Focus set: ${rest.join(" ")}` : "Focus cleared.";
      default:
        return undefined;
    }
  };

  return (
    <InfrastructureArchitectShell
      title={state === "in" ? "You're on shift." : running ? "You're off. The night shift has it." : "Everything ran. Rest easy."}
      subtitle={`One button for your shift, one slider for your AI bill, and the jobs that run while you're away: ${active.length} scheduled, about ${hours.toFixed(1)} hours of work.`}
      status={
        <span className="inline-flex items-center gap-2 tabular-nums">
          {state === "in" ? <Sun className="size-3.5 text-p-accent" /> : <Moon className="size-3.5 text-p-second" />} {state === "in" ? `On shift · ${onShift}` : "Off shift"}
        </span>
      }
    >
      <section aria-label="Compute graph" className="-mx-6 lg:-mx-10">
        <SpatialGraph nodes={nodes} edges={edges} burst={burst}>
          <Hud className="left-6 top-3 lg:left-10" items={[{ label: "Spend today", value: `${usd(cost)}/day` }, { label: "Saved this month", value: `$${Math.round(Math.max(0, saved) * 30).toLocaleString("en-US")}` }]} />
          <Hud className="right-6 top-3 text-right lg:right-10" items={[{ label: "Routed p95", value: `${Math.round(p95)} ms` }, { label: "Fallback cascade", value: enabledTiers.map((x) => x.id).join(" → ") || "none" }]} />
        </SpatialGraph>
      </section>

      <div className="-mx-6 grid lg:-mx-10 lg:grid-cols-[minmax(300px,0.8fr)_1.4fr_1fr]">
        <section className={cn(glass, "flex flex-col items-center px-6 py-8 text-center lg:px-8")}>
          <Sprig />
          <Sprig corner="br" />
          {state === "in" ? (
            <>
              <div className="mb-6 w-full text-left">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-p-text/45">{focus.trim() ? "Focus mode" : "On shift"}</p>
                <p className="prod-glow font-mono text-[34px] tabular-nums leading-tight text-p-accent">{onShift}</p>
              </div>
              <label className="mb-7 block w-full text-left">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-p-second">Today&apos;s focus</span>
                <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="What matters most today?" className="prod-field mt-2 h-11 w-full px-4 text-[14.5px]" />
              </label>
              <button type="button" onClick={clockOff} disabled={!active.length} className="prod-btn size-48 flex-col rounded-full text-[26px] shadow-[0_0_90px_-10px_rgb(var(--p-glow)/0.7)]">
                Clock off
                <span className="text-[13px] font-normal opacity-70">arm {active.length} jobs tonight</span>
              </button>
            </>
          ) : (
            <div className="w-full text-left">
              {focus && (
                <p className="mb-4 rounded-xl border border-p-second/25 bg-p-second/10 px-4 py-2.5 text-[13px] text-p-text/80">
                  <span className="text-p-second">Tomorrow picks up:</span> {focus}
                </p>
              )}
              <p className="mb-3 flex items-center gap-2 text-[14px] text-p-text/70">
                {running ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 text-[#a8e0b0]" />}
                {running ? `Working through the night (${lines.length} of ${active.length})…` : `All ${active.length} jobs done.`}
              </p>
              <ol className="max-h-[360px] space-y-2 overflow-y-auto">
                {lines.map((l, i) => (
                  <li key={i} className="animate-row-in rounded-xl border border-p-edge/10 bg-black/20 px-4 py-2.5">
                    <span className="block text-[13.5px] text-p-text/90">{l.job}</span>
                    <span className="block text-[12.5px] text-p-text/55">{l.result}</span>
                  </li>
                ))}
              </ol>
              {!running && (
                <button type="button" onClick={() => { setShiftStart(Date.now()); setState("in"); setLines([]); }} className="prod-ghost mx-auto mt-6 flex size-32 flex-col rounded-full border-2 border-p-accent text-[20px] font-semibold">
                  Clock in
                </button>
              )}
            </div>
          )}
          <p className="mt-6 text-[12px] text-p-text/40">The overnight jobs are simulated: no infrastructure is connected yet.</p>
        </section>

        <section className={cn(glass, "px-6 py-7 lg:px-8")}>
          <Sprig />
          <Sprig corner="br" />
          <PanelHead title="Your AI bill" hint="Slide right to stop paying for compute you don't need. Each notch applies the next biggest saving." />
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="prod-glow text-[56px] font-semibold tabular-nums leading-none text-p-text">
              {usd(cost)}
              <span className="text-[16px] font-normal text-p-text/45"> a day</span>
            </p>
            <p className="text-right text-[15px] text-p-text/70">
              {saved > 0.005 ? (
                <>
                  Saving <span className="font-semibold text-p-hi">${Math.round(saved * 30).toLocaleString("en-US")}</span> a month
                  <span className="block text-[12.5px] text-p-text/45">{Math.round((saved / steps[0].cost) * 100)}% less than today</span>
                </>
              ) : saved < -0.005 ? (
                <span className="text-[#ffb3a8]">Your model picks cost {usd(-saved)} a day more than today</span>
              ) : (
                "No savings applied yet"
              )}
            </p>
          </div>
          {/* Today's bill as the full bar; what's left after the optimizations glows inside it. */}
          <div className="relative mt-5 h-3 overflow-hidden rounded-full bg-p-text/10">
            <div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,var(--p-second),var(--p-accent-hi))] shadow-[0_0_18px_rgb(var(--p-glow)/0.6)] transition-[width] duration-500" style={{ width: `${Math.min(100, (cost / steps[0].cost) * 100)}%` }} />
          </div>
          <Slider min={0} max={steps.length - 1} value={k} onChange={setLevelAndRoute} label="Optimization level" className="mt-5" />
          <div className="mt-1 flex justify-between text-[12px] tabular-nums text-p-text/40">
            <span>{usd(steps[0].cost)} today</span>
            <span>{usd(steps[steps.length - 1].cost)} exact</span>
          </div>
          {Object.keys(byLever).length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {(Object.entries(byLever) as [Lever["id"], number][])
                .sort((a, b) => b[1] - a[1])
                .map(([id, v]) => (
                  <span key={id} className="rounded-full border border-p-second/30 bg-p-second/10 px-3 py-1 text-[12.5px] tabular-nums text-p-text/85">
                    {LEVER_LABEL[id]} <span className="font-semibold text-p-second">−{usd(v)}</span>/day
                  </span>
                ))}
            </div>
          )}
          <label className="mt-6 block">
            <span className="flex justify-between text-[13px] text-p-text/70">
              Token pruning aggression <span className="prod-hud text-[13px]">{prune}% · −{usd(pruneSaving)}/day</span>
            </span>
            <Slider min={0} max={100} step={5} value={prune} onChange={setPrune} label="Token pruning aggression" className="mt-2" />
            <span className="mt-1 block text-[11.5px] text-p-text/40">Trims up to 40% of each request&apos;s variable context (never the system prompt). Higher settings risk dropping detail the model needed.</span>
          </label>
          <ol className="mt-5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {steps.slice(1).map((s, i) => (
              <li key={s.label} className={cn("flex items-start gap-2 text-[13px]", i < k ? "text-p-text/85" : "text-p-text/35")}>
                <Check className={cn("mt-0.5 size-3.5 shrink-0", i < k ? "text-p-accent" : "text-p-text/15")} />
                {s.label}
              </li>
            ))}
          </ol>
        </section>

        <section className={cn(glass, "px-6 py-7 lg:px-8")}>
          <Sprig />
          <Sprig corner="br" />
          <PanelHead title="Fallback cascade" hint="Where a request goes when its model errors or times out, in order." />
          <ol className="mt-5 space-y-2">
            {cascade.map((c, i) => (
              <li key={c.id} className={cn("flex items-center gap-3 rounded-xl border border-p-edge/10 bg-black/20 px-3 py-2.5 shadow-[inset_0_2px_6px_rgb(0_0_0/0.35)]", !c.on && "opacity-50")}>
                <span className="prod-hud w-5 text-[13px]">{c.on ? enabledTiers.indexOf(c) + 1 : "–"}</span>
                <span className="flex-1 text-[13.5px] text-p-text/85">{TIER_LABEL[c.id]}</span>
                <button type="button" disabled={i === 0} onClick={() => setCascade(cascade.map((x, j) => (j === i - 1 ? c : j === i ? cascade[i - 1] : x)))} aria-label={`Move ${TIER_LABEL[c.id]} up`} className="rounded p-1 text-p-text/45 hover:text-p-text disabled:opacity-20">
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" disabled={i === cascade.length - 1} onClick={() => setCascade(cascade.map((x, j) => (j === i + 1 ? c : j === i ? cascade[i + 1] : x)))} aria-label={`Move ${TIER_LABEL[c.id]} down`} className="rounded p-1 text-p-text/45 hover:text-p-text disabled:opacity-20">
                  <ArrowDown className="size-3.5" />
                </button>
                <Toggle on={c.on} onChange={(v) => setCascade(cascade.map((x) => (x.id === c.id ? { ...x, on: v } : x)))} label={`Use ${TIER_LABEL[c.id]} as a fallback`} />
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11.5px] text-p-text/40">DeepSeek and local models aren&apos;t priced here: they&apos;re billed by their own provider or your hardware.</p>
        </section>
      </div>

      <section className={cn(glass, "-mx-6 px-6 py-7 lg:-mx-10 lg:px-10")}>
        <Sprig />
        <Sprig corner="br" />
        <PanelHead title="System health" hint="Live telemetry for the routed workflow. It moves as you change the models and the bill above. Simulated around this workflow's real volumes and model mix." />
        <Telemetry steps={final} costPerDay={cost} />
      </section>

      <section className={cn(glass, "-mx-6 px-6 py-7 lg:-mx-10 lg:px-10")}>
        <Sprig />
        <Sprig corner="br" />
        <PanelHead title="Model routing" hint="Which Claude model answers each step. The slider picks the cheapest model that does the job well; override any step here.">
          {Object.keys(overrides).length > 0 && (
            <button type="button" onClick={() => setOverrides({})} className="text-[13px] text-p-text/55 hover:text-p-text">
              Reset overrides
            </button>
          )}
        </PanelHead>
        <ul className="mt-5 divide-y divide-p-edge/10">
          {final.map((s) => {
            const c = stepCost(s).perDay;
            const rec = TASKS[s.task].model;
            return (
              <li key={s.id} className="grid items-center gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto_120px]">
                <div className="min-w-0">
                  <p className="text-[14.5px] text-p-text">{s.name}</p>
                  <p className="mt-0.5 text-[12px] text-p-text/45">
                    {s.callsPerDay.toLocaleString("en-US")} calls a day · {TASKS[s.task].label.toLowerCase()} · best fit: {SHORT[rec]}
                    {s.cache && " · cached"}
                    {s.batch && " · batched"}
                  </p>
                </div>
                <Segmented
                  size="sm"
                  label={`Model for ${s.name}`}
                  value={s.model}
                  onChange={(m) => setOverrides({ ...overrides, [s.id]: m })}
                  options={MODEL_IDS.map((m) => ({ value: m, label: SHORT[m] }))}
                />
                <div className="flex items-center gap-2">
                  <select value={budgets[s.id] ?? 0} onChange={(e) => setBudgets({ ...budgets, [s.id]: Number(e.target.value) })} aria-label={`Latency budget for ${s.name}`} className="prod-field h-9 px-2 text-[12.5px]">
                    {BUDGETS.map((b) => (
                      <option key={b} value={b} className="bg-[#10151e]">
                        {b ? `p95 ≤ ${b >= 1000 ? `${b / 1000}s` : `${b}ms`}` : "No latency cap"}
                      </option>
                    ))}
                  </select>
                  {budgets[s.id] > 0 && P95_MS[s.model] > budgets[s.id] && (
                    <button
                      type="button"
                      onClick={() => {
                        // The best-fit model if it meets the budget, otherwise the fastest one.
                        const fit = P95_MS[rec] <= budgets[s.id] ? rec : MODEL_IDS.reduce((a, m) => (P95_MS[m] < P95_MS[a] ? m : a));
                        setOverrides({ ...overrides, [s.id]: fit });
                        fire(["ingress", "router", SHORT_ID[fit]]);
                      }}
                      className="whitespace-nowrap text-[12px] text-[#ffb3a3] hover:text-[#ffd2c8]"
                      title={`${SHORT[s.model]} runs at ~${P95_MS[s.model]} ms p95`}
                    >
                      Over budget · fix
                    </button>
                  )}
                </div>
                <div className="text-right">
                  <p className="prod-glow text-[15px] font-semibold tabular-nums text-p-text">{usd(c)}</p>
                  <div className="ml-auto mt-1 h-1 w-full overflow-hidden rounded-full bg-p-text/10">
                    <div className="h-full rounded-full bg-p-accent" style={{ width: `${Math.min(100, (c / Math.max(...final.map((x) => stepCost(x).perDay))) * 100)}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12px] text-p-text/40">
          {Object.values(MODELS)
            .map((m) => `${m.label} $${m.input}/$${m.output}`)
            .join(" · ")}{" "}
          per million input/output tokens, Anthropic list prices (Oct 2026), for a sample support workflow.
        </p>
      </section>

      <section className={cn(glass, "-mx-6 px-6 py-7 lg:-mx-10 lg:px-10")}>
        <Sprig />
        <Sprig corner="br" />
        <PanelHead title="While you're off" hint="Jobs that run on their own schedule overnight. Clock off to run tonight's list now." />
        <ul className="mt-5 divide-y divide-p-edge/10">
          {JOBS.map((j) => {
            const expr = cron[j.id] ?? DEFAULT_CRON[j.id];
            const options = [...new Set([DEFAULT_CRON[j.id], ...PRESETS, expr])];
            return (
              <li key={j.id} className={cn("grid items-center gap-3 py-3.5 md:grid-cols-[auto_minmax(0,1fr)_210px_120px_auto]", !tasks[j.id] && "opacity-50")}>
                <Toggle on={!!tasks[j.id]} onChange={(v) => setTasks({ ...tasks, [j.id]: v })} label={j.label} />
                <div className="min-w-0">
                  <p className="text-[14.5px] text-p-text/90">{j.label}</p>
                  <p className="text-[12px] text-p-text/40">
                    {j.group} · ~{Math.round(j.hours * 60)} min
                  </p>
                </div>
                <select value={expr} onChange={(e) => setCron({ ...cron, [j.id]: e.target.value })} aria-label={`Schedule for ${j.label}`} className="prod-field h-10 px-3 text-[13px]">
                  {options.map((o) => (
                    <option key={o} value={o} className="bg-[#10151e]">
                      {describeCron(o)}
                    </option>
                  ))}
                </select>
                <p className="text-right text-[12.5px] tabular-nums text-p-text/55">{tasks[j.id] ? `next ${when(now ? nextRun(expr, now) : null)}` : "paused"}</p>
                <button type="button" onClick={() => toast.success(`${j.label}: ${jobResult(j, Date.now() % 100000, Math.max(0, saved))}`)} className="prod-ghost h-8 px-3 text-[12px]">
                  <Play className="size-3" /> Run now
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <CommandBar placeholder="clock off · level max · route 3 haiku · prune 40 · run crm · focus ship v2" hints={["clock off", "clock in", "level <n|max|reset>", "route <step#> <haiku|sonnet|opus>", "prune <0-100>", "run <job>", "focus <text>"]} onRun={onCommand} />
    </InfrastructureArchitectShell>
  );
}
