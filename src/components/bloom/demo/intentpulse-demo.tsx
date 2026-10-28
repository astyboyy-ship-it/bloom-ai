"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AtSign,
  Briefcase,
  CalendarCheck,
  Code2,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Pause,
  Play,
  Plus,
  ScanSearch,
  Send,
  ShieldAlert,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DispatchAction, DispatchResult } from "@/lib/intentpulse/outreach";
import type { IntentResult, IntentTier } from "@/lib/intentpulse/types";
import { EmbedDrawer } from "./intentpulse/embed-drawer";
import { BUDGET_BUCKETS, CHANNELS, CHANNEL_KEYS, budgetBucket, makeSignal, type ChannelKey, type StreamSignal } from "./intentpulse/stream";
import { DemoShell } from "./shared/demo-shell";
import { clock, compact, fmt, rng, useInterval } from "./shared/sim";
import { Chip, DemoSection, LiveLog, Meter, Panel, ProcessDeepDive, ShiftSchedule, Stat, type LogEntry } from "./shared/ui";

const CHANNEL_ICON: Record<ChannelKey, LucideIcon> = {
  instagram: MessageCircle,
  x: AtSign,
  reddit: MessagesSquare,
  linkedin: Briefcase,
  webhook: Webhook,
};

const TIER_TEXT: Record<IntentTier, string> = { VIP: "text-[#f7e2a8]", QUALIFIED: "text-sun", NURTURE: "text-dusk" };
const TIER_PILL: Record<IntentTier, string> = {
  VIP: "border-[#f3d48f]/60 bg-[#f3d48f]/10 text-[#f7e2a8]",
  QUALIFIED: "border-sun/50 bg-sun/10 text-sun",
  NURTURE: "border-dusk/40 bg-dusk/10 text-dusk",
};
const BLIP_COLOR: Record<IntentTier, string> = { VIP: "#f3d48f", QUALIFIED: "#ffbd6e", NURTURE: "#b49bff" };

type Route = "vip" | "outreach" | "quarantine" | "nurture";
const routeOf = (r: IntentResult): Route =>
  r.persona === "competitor" || r.persona === "student" ? "quarantine" : r.tier === "VIP" ? "vip" : r.tier === "QUALIFIED" ? "outreach" : "nurture";

const ROUTE_LABEL: Record<DispatchAction, { label: string; icon: LucideIcon; tone: LogEntry["tone"] }> = {
  vip: { label: "VIP calendar booking link dispatched", icon: CalendarCheck, tone: "gold" },
  outreach: { label: "Custom outreach message sent", icon: Send, tone: "cyan" },
  quarantine: { label: "Signal quarantined", icon: ShieldAlert, tone: "ember" },
};

type Blip = { id: string; angle: number; radius: number; color: string; born: number };
type DispatchItem = {
  id: string;
  kind: DispatchAction;
  handle: string;
  channel: ChannelKey;
  score: number;
  time: string;
  via: "auto" | "api";
  pending?: boolean;
  message?: string | null;
  source?: string;
  dispatchId?: string;
};

type Sim = {
  feed: StreamSignal[];
  blips: Blip[];
  intercepted: number;
  perChannel: Record<ChannelKey, number>;
  tiers: Record<IntentTier, number>;
  buckets: number[];
  urgencySum: number;
  stackSum: number;
  routed: Record<Route, number>;
  window: { t: number; n: number }[];
  dispatches: DispatchItem[];
  log: LogEntry[];
};

const EMPTY_SIM: Sim = {
  feed: [],
  blips: [],
  intercepted: 0,
  perChannel: { instagram: 0, x: 0, reddit: 0, linkedin: 0, webhook: 0 },
  tiers: { VIP: 0, QUALIFIED: 0, NURTURE: 0 },
  buckets: [0, 0, 0, 0],
  urgencySum: 0,
  stackSum: 0,
  routed: { vip: 0, outreach: 0, quarantine: 0, nurture: 0 },
  window: [],
  dispatches: [],
  log: [],
};

const TICK_MS = 250;
const BLIP_LIFE_MS = 4500;

const PRESETS = [
  {
    label: "High-ticket enterprise buyer",
    data: {
      leadName: "Mara Ellison",
      company: "Halvorsen Logistics",
      budgetK: "320",
      message:
        "I'm VP of Revenue Operations. We've approved budget and need to go live by end of quarter. We run Salesforce and Snowflake, ~1,200 reps, SSO via Okta. Can we get pricing and a contract draft this week? Procurement is already looped in.",
    },
  },
  {
    label: "Low-intent student",
    data: {
      leadName: "Jonah Pike",
      company: "State University",
      budgetK: "",
      message: "Hi! I'm a student writing a thesis on lead scoring for my marketing class. Just curious how tools like yours work. No budget, just researching.",
    },
  },
  {
    label: "Competitor researching",
    data: {
      leadName: "Alex Moreau",
      company: "SignalForge",
      budgetK: "50",
      message: "We're building a similar intent-scoring product and benchmarking competitors for our roadmap. How do your scoring model and routing logic work?",
    },
  },
];

function signalSig(s: StreamSignal) {
  const get = (k: string) => s.result.signals.find((x) => x.key === k)?.score ?? 0;
  return { urgency: get("urgency"), stack: get("techFit") };
}

/** Folds one batch of freshly scored signals into the running simulation. */
function ingest(prev: Sim, batch: StreamSignal[], featured: StreamSignal | null, r: () => number, now: number): Sim {
  const next: Sim = {
    ...prev,
    perChannel: { ...prev.perChannel },
    tiers: { ...prev.tiers },
    buckets: [...prev.buckets],
    routed: { ...prev.routed },
  };
  const blips: Blip[] = [];
  for (const s of batch) {
    const { urgency, stack } = signalSig(s);
    next.intercepted += 1;
    next.perChannel[s.channel] += 1;
    next.tiers[s.result.tier] += 1;
    next.buckets[budgetBucket(s.result.lead.budgetK)] += 1;
    next.urgencySum += urgency;
    next.stackSum += stack;
    const route = routeOf(s.result);
    next.routed[route] += 1;
    const sector = CHANNEL_KEYS.indexOf(s.channel);
    blips.push({
      id: s.id,
      angle: sector * 72 + 8 + r() * 56,
      radius: 8 + (100 - s.result.score) * 0.8,
      color: route === "quarantine" ? "#ff9b78" : BLIP_COLOR[s.result.tier],
      born: now,
    });
  }
  next.blips = [...blips, ...prev.blips.filter((b) => now - b.born < BLIP_LIFE_MS)].slice(0, 90);
  next.window = [...prev.window.filter((w) => now - w.t < 60_000), { t: now, n: batch.length }];

  if (featured) {
    next.feed = [featured, ...prev.feed].slice(0, 12);
    const route = routeOf(featured.result);
    if (route !== "nurture") {
      const time = clock(new Date(now));
      next.dispatches = [
        { id: `d-${featured.id}`, kind: route, handle: featured.handle, channel: featured.channel, score: featured.result.score, time, via: "auto" as const },
        ...prev.dispatches,
      ].slice(0, 14);
      next.log = [
        {
          id: `l-${featured.id}`,
          time,
          tone: ROUTE_LABEL[route].tone,
          text: `${CHANNELS[featured.channel].label} · ${featured.handle} scored ${featured.result.score} (${featured.result.tier}) → ${ROUTE_LABEL[route].label.toLowerCase()}`,
        },
        ...prev.log,
      ].slice(0, 40);
    }
  }
  return next;
}

export function IntentPulseDemo() {
  const [sim, setSim] = useState<Sim>(EMPTY_SIM);
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState<StreamSignal | null>(null);
  const [busy, setBusy] = useState<null | DispatchAction | "scan">(null);
  const [lastDispatch, setLastDispatch] = useState<DispatchResult | null>(null);
  const [pulse, setPulse] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [injectOpen, setInjectOpen] = useState(false);
  const [form, setForm] = useState(PRESETS[0].data);
  const [injectError, setInjectError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const rRef = useRef<(() => number) | null>(null);
  const seq = useRef(0);
  const pulseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flash = () => {
    setPulse(true);
    clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulse(false), 1400);
  };

  const step = (batchSize?: number) => {
    const r = (rRef.current ??= rng(Date.now() % 100000));
    const t = Date.now();
    const k = batchSize ?? 3 + Math.floor(r() * 6);
    const batch = Array.from({ length: k }, () => makeSignal(r, seq.current++));
    const featured = batch[0];
    setSim((prev) => ingest(prev, batch, featured, r, t));
    setNow(t);
    if (featured.result.tier === "VIP") flash();
    setSelected((cur) => cur ?? (featured.result.tier === "VIP" ? featured : null));
  };

  // Prefill so the console is alive on first paint, then stream.
  useEffect(() => {
    for (let i = 0; i < 10; i++) step(6);
    return () => clearTimeout(pulseTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useInterval(() => step(), running ? TICK_MS : null);

  const perMin = sim.window.reduce((s, w) => s + w.n, 0);
  const inFlight = sim.window.filter((w) => now - w.t < 4000).reduce((s, w) => s + w.n, 0);
  const avgUrgency = sim.intercepted ? sim.urgencySum / sim.intercepted : 0;
  const avgStack = sim.intercepted ? sim.stackSum / sim.intercepted : 0;
  const maxChannel = Math.max(1, ...CHANNEL_KEYS.map((k) => sim.perChannel[k]));
  const maxBucket = Math.max(1, ...sim.buckets);

  const pushLog = (entry: Omit<LogEntry, "id" | "time">) =>
    setSim((p) => ({ ...p, log: [{ ...entry, id: `u-${Date.now()}-${Math.random()}`, time: clock() }, ...p.log].slice(0, 40) }));

  const act = async (kind: DispatchAction, sig: StreamSignal) => {
    if (busy) return;
    setBusy(kind);
    const id = `api-${Date.now()}`;
    setSim((p) => ({
      ...p,
      dispatches: [
        { id, kind, handle: sig.handle, channel: sig.channel, score: sig.result.score, time: clock(), via: "api" as const, pending: true },
        ...p.dispatches,
      ].slice(0, 14),
    }));
    try {
      const res = await fetch("/api/intent-pulse/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: kind,
          lead: sig.result.lead,
          score: sig.result.score,
          tier: sig.result.tier,
          persona: sig.result.persona,
          channel: CHANNELS[sig.channel].label,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Dispatch failed.");
      const d = json as DispatchResult;
      setLastDispatch(d);
      setSim((p) => ({
        ...p,
        dispatches: p.dispatches.map((x) => (x.id === id ? { ...x, pending: false, message: d.message, source: d.source, dispatchId: d.dispatchId } : x)),
      }));
      pushLog({ tone: ROUTE_LABEL[kind].tone, text: `${d.dispatchId} · ${ROUTE_LABEL[kind].label} to ${sig.handle} via API (${d.source}, ${d.latencyMs} ms)` });
      toast.success(ROUTE_LABEL[kind].label);
    } catch (err) {
      setSim((p) => ({ ...p, dispatches: p.dispatches.filter((x) => x.id !== id) }));
      toast.error(err instanceof Error ? err.message : "Dispatch failed.");
    } finally {
      setBusy(null);
    }
  };

  const scoreViaApi = async (lead: { leadName: string; company: string; budgetK: number | null; message: string }) => {
    const res = await fetch("/api/intent-pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    const json = await res.json();
    if (!res.ok) {
      const details = Array.isArray(json.error?.details) ? ` ${json.error.details.join(" ")}` : "";
      throw new Error(`${json.error?.message ?? "Engine error."}${details}`);
    }
    return json as IntentResult;
  };

  const deepScan = async (sig: StreamSignal) => {
    if (busy) return;
    setBusy("scan");
    flash();
    try {
      const result = await scoreViaApi(sig.result.lead);
      setSelected({ ...sig, result });
      pushLog({ tone: "cyan", text: `Deep scan · ${sig.handle} re-scored ${result.score} (${result.tier}) by ${result.source === "groq" ? `Groq ${result.model}` : "heuristic engine"} in ${result.latencyMs} ms` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deep scan failed.");
    } finally {
      setBusy(null);
    }
  };

  const inject = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.message.trim()) {
      setInjectError("Add a message for the engine to read.");
      return;
    }
    setInjectError(null);
    setBusy("scan");
    flash();
    try {
      const result = await scoreViaApi({ ...form, budgetK: form.budgetK.trim() === "" ? null : Number(form.budgetK) });
      const sig: StreamSignal = { id: `inj-${Date.now()}`, channel: "webhook", handle: "Your injected signal", at: Date.now(), result, injected: true };
      setSim((p) => ingest(p, [sig], sig, rRef.current ?? Math.random, Date.now()));
      setSelected(sig);
      setInjectOpen(false);
    } catch (err) {
      setInjectError(err instanceof Error ? err.message : "The engine could not score this lead.");
    } finally {
      setBusy(null);
    }
  };

  const sel = selected;
  const selRoute = sel ? routeOf(sel.result) : null;

  return (
    <DemoShell
      slug="intentpulse"
      kicker="The Massive Signal Interceptor"
      title="IntentPulse Signal Radar"
      pulse={pulse}
      chips={
        <>
          <Chip>{running ? "Intercepting live" : "Stream paused"}</Chip>
          <Chip tone="cyan">Simulated omnichannel stream · real scoring engine</Chip>
        </>
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setRunning((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-ink/50 px-4 text-[13px] text-white/80 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />} {running ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            onClick={() => setEmbedOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#f0d59a]/30 bg-ink/50 px-4 text-[13px] font-medium text-[#f3e2b8] backdrop-blur-md transition-colors hover:border-[#f0d59a]/60 hover:text-white"
          >
            <Code2 className="size-4" /> Embed Engine
          </button>
        </>
      }
    >
      {/* Mass-scale counters */}
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Signals intercepted" value={fmt(sim.intercepted)} sub="all channels" accent />
        <Stat label="Scored / min" value={fmt(perMin)} sub="rolling 60 s" />
        <Stat label="In flight" value={fmt(inFlight)} sub="scored in last 4 s" />
        <Stat label="VIP routed" value={fmt(sim.routed.vip)} sub="calendar links" />
        <Stat label="Outreach sent" value={fmt(sim.routed.outreach)} sub="custom messages" />
        <Stat label="Quarantined" value={fmt(sim.routed.quarantine)} sub="competitors & students" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        {/* Radar + channels */}
        <Panel className="xl:col-span-4" kicker="Omnichannel radar" title="Every channel, one sweep">
          <Radar blips={sim.blips} now={now} />
          <ul className="mt-5 space-y-2.5">
            {CHANNEL_KEYS.map((k) => {
              const Icon = CHANNEL_ICON[k];
              return (
                <li key={k}>
                  <div className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="flex items-center gap-2 text-white/80">
                      <Icon className="size-3.5" style={{ color: CHANNELS[k].color }} /> {CHANNELS[k].label}
                    </span>
                    <span className="font-mono tabular-nums text-white/60">{fmt(sim.perChannel[k])}</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(sim.perChannel[k] / maxChannel) * 100}%`, background: CHANNELS[k].color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* Live stream */}
        <Panel
          className="xl:col-span-5"
          kicker="Live signal stream"
          title="Intercepted & scored"
          right={
            <button
              type="button"
              onClick={() => setInjectOpen((v) => !v)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#f0d59a]/30 px-3 text-[12px] text-[#f3e2b8] transition-colors hover:border-[#f0d59a]/60"
            >
              <Plus className="size-3.5" /> Inject signal
            </button>
          }
        >
          <AnimatePresence initial={false}>
            {injectOpen && (
              <motion.form
                onSubmit={inject}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="space-y-2.5 rounded-2xl border border-[#f0d59a]/20 bg-ink/50 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm(p.data)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                          form.message === p.data.message ? "border-[#f0d59a]/60 text-[#f3e2b8]" : "border-white/10 text-white/50 hover:text-white",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input className={inputCls} placeholder="Lead name" value={form.leadName} onChange={(e) => setForm({ ...form, leadName: e.target.value })} maxLength={120} />
                    <input className={inputCls} placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={120} />
                    <input className={inputCls} placeholder="Budget ($k)" type="number" min={0} step="any" value={form.budgetK} onChange={(e) => setForm({ ...form, budgetK: e.target.value })} />
                  </div>
                  <textarea
                    className={cn(inputCls, "min-h-20 resize-y")}
                    placeholder="Prospect message or signal…"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    maxLength={4000}
                  />
                  {injectError && <p className="text-[12px] text-[#ffc2a8]">{injectError}</p>}
                  <button
                    type="submit"
                    disabled={!!busy}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f3e2b8] px-5 text-[13px] font-semibold text-[#1a0f05] disabled:opacity-60"
                  >
                    {busy === "scan" ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />} Score through the engine API
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <ol className="space-y-2">
            <AnimatePresence initial={false}>
              {sim.feed.map((s) => {
                const Icon = CHANNEL_ICON[s.channel];
                const route = routeOf(s.result);
                const { urgency, stack } = signalSig(s);
                return (
                  <motion.li
                    key={s.id}
                    layout="position"
                    initial={{ opacity: 0, y: -14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(s)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                        sel?.id === s.id ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.08]" : "border-white/[0.07] bg-ink/40 hover:border-white/20",
                        s.injected && "ring-1 ring-[#5ee7ff]/40",
                      )}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0" style={{ color: CHANNELS[s.channel].color }} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-medium text-white/90">{s.handle}</span>
                          <span className={cn("shrink-0 rounded-full border px-2 py-px font-mono text-[9px] tracking-[0.14em]", TIER_PILL[s.result.tier])}>
                            {s.result.score} · {s.result.tier}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-white/50">{s.result.lead.message}</span>
                        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
                          URG {urgency} · {s.result.lead.budgetK === null ? "budget n/a" : `$${s.result.lead.budgetK}k`} · STACK {stack}
                          {route === "quarantine" && <span className="ml-2 text-[#ff9b78]">quarantine</span>}
                        </span>
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
        </Panel>

        {/* Aggregate telemetry */}
        <Panel className="xl:col-span-3" kicker="Real-time telemetry" title="Across every signal">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Budget estimates</p>
          <ul className="mt-3 space-y-2.5">
            {BUDGET_BUCKETS.map((b, i) => (
              <li key={b}>
                <div className="flex justify-between text-[12px] text-white/75">
                  <span>{b}</span>
                  <span className="font-mono tabular-nums text-white/55">{compact(sim.buckets[i])}</span>
                </div>
                <Meter value={(sim.buckets[i] / maxBucket) * 100} className="mt-1.5" />
              </li>
            ))}
          </ul>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Avg urgency</p>
              <p className="mt-1 font-display text-3xl font-light tabular-nums text-white">{avgUrgency.toFixed(0)}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Avg stack fit</p>
              <p className="mt-1 font-display text-3xl font-light tabular-nums text-white">{avgStack.toFixed(0)}</p>
            </div>
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Tier distribution</p>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
            {(["VIP", "QUALIFIED", "NURTURE"] as IntentTier[]).map((t) => (
              <div key={t} className="h-full transition-[width] duration-500" style={{ width: `${sim.intercepted ? (sim.tiers[t] / sim.intercepted) * 100 : 0}%`, background: BLIP_COLOR[t] }} />
            ))}
          </div>
          <ul className="mt-3 space-y-1">
            {(["VIP", "QUALIFIED", "NURTURE"] as IntentTier[]).map((t) => (
              <li key={t} className="flex justify-between font-mono text-[11px]">
                <span className={TIER_TEXT[t]}>{t}</span>
                <span className="tabular-nums text-white/55">{sim.intercepted ? ((sim.tiers[t] / sim.intercepted) * 100).toFixed(1) : "0.0"}%</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Selected signal + 1-click actions */}
        <Panel className="xl:col-span-7" kicker="Signal telemetry" title={sel ? sel.handle : "Select a signal"}>
          {sel ? (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                  {CHANNELS[sel.channel].label}
                  <span className="text-white/20">·</span> persona {sel.result.persona}
                  <span className="text-white/20">·</span> {sel.result.source === "groq" ? `Groq ${sel.result.model}` : "heuristic engine"}
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-white/80">“{sel.result.lead.message}”</p>
                <div className="mt-4 flex items-center gap-4">
                  <span className="text-gold-metal font-display text-6xl font-light tabular-nums leading-none">{sel.result.score}</span>
                  <span className={cn("rounded-full border px-4 py-1.5 font-mono text-xs font-semibold tracking-[0.24em]", TIER_PILL[sel.result.tier])}>{sel.result.tier}</span>
                </div>
                <p className="mt-3 text-[13px] text-white/55">{sel.result.action.title}</p>
              </div>
              <ul className="min-w-0 space-y-3">
                {sel.result.signals.map((s) => (
                  <li key={s.key}>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/80">{s.label}</span>
                      <span className="font-mono tabular-nums text-[#f3e2b8]">
                        {s.score}
                        <span className="ml-1.5 text-[10px] text-white/35">×{s.weight.toFixed(2)}</span>
                      </span>
                    </div>
                    <Meter value={s.score} className="mt-1.5" />
                    {s.evidence.length > 0 && <p className="mt-1 truncate font-mono text-[10px] text-white/40">{s.evidence.join(" · ")}</p>}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <ActionButton icon={Send} label="Send Custom Outreach Message" busy={busy === "outreach"} disabled={!!busy} onClick={() => act("outreach", sel)} />
                <ActionButton
                  icon={CalendarCheck}
                  label="Dispatch VIP Calendar Booking Link"
                  primary={selRoute === "vip"}
                  busy={busy === "vip"}
                  disabled={!!busy}
                  onClick={() => act("vip", sel)}
                />
                <ActionButton icon={ShieldAlert} label="Quarantine Signal" busy={busy === "quarantine"} disabled={!!busy} onClick={() => act("quarantine", sel)} />
                <ActionButton icon={ScanSearch} label="Deep-scan via engine API" busy={busy === "scan"} disabled={!!busy} onClick={() => deepScan(sel)} />
              </div>
              {lastDispatch?.message && (
                <div className="rounded-2xl border border-[#5ee7ff]/20 bg-[#5ee7ff]/[0.05] p-4 md:col-span-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8ff0ff]">
                    {lastDispatch.dispatchId} · drafted by {lastDispatch.source === "groq" ? `Groq ${lastDispatch.model}` : "template"}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/85">{lastDispatch.message}</p>
                  {lastDispatch.notice && <p className="mt-2 text-[11px] text-[#ffc777]">{lastDispatch.notice}</p>}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-white/45">Click any signal in the stream to inspect its telemetry and act on it.</p>
          )}
        </Panel>

        {/* Dispatch console */}
        <Panel className="xl:col-span-5" kicker="Action & dispatch console" title="Routing in real time">
          <ol className="space-y-2">
            <AnimatePresence initial={false}>
              {sim.dispatches.map((d) => {
                const meta = ROUTE_LABEL[d.kind];
                return (
                  <motion.li
                    key={d.id}
                    layout="position"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-ink/40 px-3 py-2"
                  >
                    {d.pending ? (
                      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-[#8ff0ff]" />
                    ) : (
                      <meta.icon className={cn("mt-0.5 size-4 shrink-0", d.kind === "vip" ? "text-[#f3d48f]" : d.kind === "outreach" ? "text-[#8ff0ff]" : "text-[#ff9b78]")} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2 text-[12px]">
                        <span className="truncate text-white/85">{meta.label}</span>
                        <span className="shrink-0 font-mono text-[10px] text-white/35">{d.time}</span>
                      </span>
                      <span className="block truncate font-mono text-[10px] text-white/45">
                        {d.handle} · {d.score} · {d.via === "api" ? `API${d.source ? ` · ${d.source}` : ""}` : "auto-trigger"}
                        {d.dispatchId && ` · ${d.dispatchId}`}
                      </span>
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
        </Panel>
      </div>

      <DemoSection eyebrow="The process" title="Three movements," accent="thousands of times a minute.">
        <ProcessDeepDive
          steps={[
            {
              title: "Environmental Perception",
              body: "Every DM, post, thread and webhook is read the moment it lands. Micro-intent cues (timelines, budgets, named tools, seniority) are lifted out of the noise.",
              stat: fmt(perMin),
              statLabel: "signals perceived / min",
            },
            {
              title: "Autonomous Reasoning",
              body: "Four weighted signals (budget 35%, urgency 30%, stack fit 20%, authority 15%) fuse into one readiness score. Competitors and students are capped before they waste a rep's day.",
              stat: avgUrgency.toFixed(0),
              statLabel: "average urgency right now",
            },
            {
              title: "Self-Execution",
              body: "VIPs get a calendar link, qualified buyers get a personal message, and noise is quarantined. No human triage queue.",
              stat: fmt(sim.routed.vip + sim.routed.outreach + sim.routed.quarantine),
              statLabel: "autonomous actions taken",
            },
          ]}
        />
      </DemoSection>

      <DemoSection eyebrow="Workforce shift scheduler" title="It works the shifts" accent="you sleep through.">
        <ShiftSchedule
          shifts={[
            {
              name: "Global Social Radar Sweep",
              window: "06:00 – 14:00",
              tasks: ["Sweep X, Instagram, Reddit & LinkedIn", "De-duplicate cross-posted signals", "Score every inbound in under 50 ms", "Flag competitor & student traffic"],
              output: `${compact(sim.intercepted)} signals swept this session`,
            },
            {
              name: "High-Intent Calendar Booking",
              window: "14:00 – 22:00",
              tasks: ["Dispatch VIP booking links", "Draft personal replies for qualified buyers", "Hold priority AE slots", "Sync booked meetings to CRM"],
              output: `${fmt(sim.routed.vip)} VIP links · ${fmt(sim.routed.outreach)} replies`,
            },
            {
              name: "Overnight Nurture Staging",
              window: "22:00 – 06:00",
              tasks: ["Queue nurture drips for low-intent leads", "Re-score dormant signals", "Archive quarantined intel", "Stage the morning pipeline brief"],
              output: `${fmt(sim.routed.nurture)} leads staged for nurture`,
            },
          ]}
        />
      </DemoSection>

      <DemoSection id="log" eyebrow="Automation log" title="Every decision," accent="on the record.">
        <Panel>
          <LiveLog entries={sim.log.slice(0, 18)} className="max-h-[420px]" />
        </Panel>
        <p className="mt-4 text-xs text-white/40">
          The omnichannel sources are simulated sample data. Every signal is scored by the real IntentPulse engine; 1-click actions, deep scans and injected signals call the live API.
        </p>
      </DemoSection>

      <EmbedDrawer open={embedOpen} onClose={() => setEmbedOpen(false)} />
    </DemoShell>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-[#f0d59a]/50 focus:outline-none focus:ring-2 focus:ring-[#f0d59a]/15";

function ActionButton({ icon: Icon, label, onClick, busy, disabled, primary }: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12px] font-medium transition-colors disabled:opacity-50",
        primary
          ? "bg-[#f3e2b8] text-[#1a0f05] shadow-[0_0_40px_-10px_rgb(243_212_143/0.8)]"
          : "border border-white/15 bg-ink/50 text-white/85 hover:border-white/35 hover:text-white",
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />} {label}
    </button>
  );
}

function Radar({ blips, now }: { blips: Blip[]; now: number }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <svg viewBox="0 0 200 200" className="size-full" aria-label="Signal radar">
        <defs>
          <radialGradient id="ip-radar-bg">
            <stop offset="0" stopColor="rgb(243 212 143 / 0.10)" />
            <stop offset="1" stopColor="rgb(11 6 18 / 0)" />
          </radialGradient>
          <linearGradient id="ip-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgb(243 212 143 / 0)" />
            <stop offset="1" stopColor="rgb(243 212 143 / 0.35)" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="96" fill="url(#ip-radar-bg)" />
        {[96, 72, 48, 24].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgb(240 213 154 / 0.14)" strokeWidth="0.6" />
        ))}
        {CHANNEL_KEYS.map((k, i) => {
          const a = ((i * 72 - 90) * Math.PI) / 180;
          const la = (((i * 72 + 36) - 90) * Math.PI) / 180;
          return (
            <g key={k}>
              <line x1="100" y1="100" x2={(100 + Math.cos(a) * 96).toFixed(2)} y2={(100 + Math.sin(a) * 96).toFixed(2)} stroke="rgb(240 213 154 / 0.12)" strokeWidth="0.6" />
              <text
                x={(100 + Math.cos(la) * 86).toFixed(2)}
                y={(100 + Math.sin(la) * 86).toFixed(2)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white/35 font-mono"
                style={{ fontSize: 6 }}
              >
                {CHANNELS[k].label.split(" ")[0].toUpperCase()}
              </text>
            </g>
          );
        })}
        <g style={{ transformOrigin: "100px 100px", animation: "bloom-spin 3.2s linear infinite" }}>
          <path d="M100 100 L196 100 A96 96 0 0 0 179.4 46 Z" fill="url(#ip-sweep)" />
          <line x1="100" y1="100" x2="196" y2="100" stroke="rgb(243 212 143 / 0.7)" strokeWidth="0.8" />
        </g>
        {blips.map((b) => {
          const age = Math.min(1, (now - b.born) / BLIP_LIFE_MS);
          const a = ((b.angle - 90) * Math.PI) / 180;
          const cx = 100 + Math.cos(a) * b.radius;
          const cy = 100 + Math.sin(a) * b.radius;
          return (
            <g key={b.id} opacity={1 - age * 0.85}>
              <circle cx={cx} cy={cy} r={age < 0.15 ? 5 : 3.4} fill={b.color} opacity={0.18} />
              <circle cx={cx} cy={cy} r={age < 0.15 ? 2.4 : 1.6} fill={b.color} />
            </g>
          );
        })}
        <circle cx="100" cy="100" r="3" fill="#f3d48f" />
      </svg>
      <p className="pointer-events-none absolute inset-x-0 bottom-0 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
        Center = highest intent
      </p>
    </div>
  );
}
