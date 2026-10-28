"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { seeded, simulateSignal, SUBREDDITS } from "@/lib/intentpulse/data-simulator";
import type { DispatchAction, DispatchResult } from "@/lib/intentpulse/outreach";
import { isUrgent, PLATFORM_KEYS, PLATFORMS, routeOf, SWEEPABLE, type Platform, type PulseSignal, type Route } from "@/lib/intentpulse/signal";
import type { IntentResult, IntentTier } from "@/lib/intentpulse/types";
import type { LogEntry } from "../demo/shared/ui";
import { useInterval } from "../demo/shared/sim";
import { usePersistent } from "../studio/frame";
import { clock, fmt, ROUTE_LABEL } from "./platform";

const TICK_MS = 200;
const WINDOW_MS = 60_000;
export const BLIP_LIFE_MS = 4500;
const LEDGER_MAX = 300;
const FEED_MAX = 80;
export const ROUTES: Route[] = ["vip", "outreach", "nurture", "quarantine"];
export const TIERS: IntentTier[] = ["VIP", "QUALIFIED", "NURTURE"];

/** A keyword trigger: when an inbound signal on `channel` contains any keyword, the action fires. */
export type TriggerRule = { id: string; keywords: string[]; channel: Platform | "all"; action: string; reply: string; enabled: boolean };

export const DEFAULT_TRIGGERS: TriggerRule[] = [
  { id: "pricing", keywords: ["price", "prices", "pricing"], channel: "instagram", action: "Send pricing DM", reply: "Here's our pricing page and the plan most teams your size pick.", enabled: true },
  { id: "demo", keywords: ["demo", "call"], channel: "instagram", action: "Send booking link", reply: "Grab any slot that suits you: {{booking_link}}", enabled: true },
  { id: "budget", keywords: ["budget"], channel: "all", action: "Budget-qualifier DM", reply: "Happy to help. Roughly what budget range are you working with?", enabled: true },
  { id: "urgent", keywords: ["asap", "urgent", "immediately", "next week"], channel: "all", action: "Priority VIP DM", reply: "Flagged as urgent: a specialist will reply within 15 minutes.", enabled: true },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whether a rule matches a message (whole words, case-insensitive) on a channel. */
export function matchRule(rule: TriggerRule, text: string, platform: Platform) {
  if (rule.channel !== "all" && rule.channel !== platform) return false;
  return rule.keywords.some((k) => k.trim() && new RegExp(`\\b${escapeRe(k.trim())}\\b`, "i").test(text));
}

/** What the auto-responder does with each tier when no human is watching. */
export type AutoResponder = { vip: "book" | "draft"; qualified: "send" | "draft"; nurture: "playbook" | "ignore"; quarantine: boolean; maxPerHour: number; hours: { start: string; end: string; always: boolean } };
export const DEFAULT_AUTORESPONDER: AutoResponder = { vip: "book", qualified: "draft", nurture: "playbook", quarantine: true, maxPerHour: 120, hours: { start: "08:00", end: "20:00", always: true } };

export type Blip = { id: string; angle: number; radius: number; color: string; born: number };
type Bucket = { t: number; n: number; per: Record<Platform, [total: number, urgent: number]> };
export type Mode = "live" | "simulated";
export type Sales = { engaged: number; conversations: number; deals: number; revenue: number; pipeline: number };
export type Close = { id: string; platform: Platform; name: string; handle: string; amount: number; t: number };

export type Hub = {
  total: number;
  perPlatform: Record<Platform, number>;
  tiers: Record<IntentTier, number>;
  routed: Record<Route, number>;
  window: Bucket[];
  ledger: PulseSignal[];
  feeds: Record<Platform, PulseSignal[]>;
  blips: Blip[];
  log: LogEntry[];
  sales: Record<Platform, Sales>;
  closes: Close[];
  subreddits: Record<string, number>;
  triggers: Record<string, number>;
  /** Counts by `${platform}:${kind}`, plus `x:mention`. */
  kinds: Record<string, number>;
};

const zeros = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
const perPlatform = <T,>(make: () => T) => Object.fromEntries(PLATFORM_KEYS.map((k) => [k, make()])) as Record<Platform, T>;

const EMPTY: Hub = {
  total: 0,
  perPlatform: zeros(PLATFORM_KEYS),
  tiers: zeros(TIERS),
  routed: zeros(ROUTES),
  window: [],
  ledger: [],
  feeds: perPlatform(() => []),
  blips: [],
  log: [],
  sales: perPlatform(() => ({ engaged: 0, conversations: 0, deals: 0, revenue: 0, pipeline: 0 })),
  closes: [],
  subreddits: zeros(SUBREDDITS),
  triggers: {},
  kinds: {},
};

export const routeColor = (route: Route, tier: IntentTier) => (route === "quarantine" ? "#ff9b78" : tier === "VIP" ? "#f3d48f" : tier === "QUALIFIED" ? "#ffbd6e" : "#b49bff");

function autoLog(s: PulseSignal, now: number): LogEntry | null {
  const route = routeOf(s);
  if (route === "outreach" && s.result.score < 75) return null;
  const tone: LogEntry["tone"] = route === "vip" ? "gold" : route === "quarantine" ? "ember" : route === "outreach" ? "cyan" : "muted";
  return {
    id: `a-${s.id}`,
    time: clock(new Date(now)),
    tone,
    text: `${PLATFORMS[s.platform].label} · ${s.author.handle} scored ${s.result.score} (${s.result.tier}) → ${ROUTE_LABEL[route].toLowerCase()} staged`,
  };
}

/**
 * Folds a scored batch into the hub. Sales attribution is simulated: engaged signals open
 * conversations, and a small share of VIP and qualified ones close at a fraction of their budget.
 */
function ingest(prev: Hub, batch: PulseSignal[], notable: PulseSignal[], featured: PulseSignal[], now: number, r: () => number, rules: TriggerRule[]): Hub {
  const next: Hub = {
    ...prev,
    perPlatform: { ...prev.perPlatform },
    tiers: { ...prev.tiers },
    routed: { ...prev.routed },
    sales: { ...prev.sales },
    subreddits: { ...prev.subreddits },
    triggers: { ...prev.triggers },
    kinds: { ...prev.kinds },
  };
  const per = perPlatform<[number, number]>(() => [0, 0]);
  const blips: Blip[] = [];
  const closes: Close[] = [];
  const lines: LogEntry[] = [];

  for (const s of batch) {
    const route = routeOf(s);
    next.total += 1;
    next.perPlatform[s.platform] += 1;
    next.tiers[s.result.tier] += 1;
    next.routed[route] += 1;
    per[s.platform][0] += 1;
    if (isUrgent(s)) per[s.platform][1] += 1;
    const kindKey = `${s.platform}:${s.kind}`;
    next.kinds[kindKey] = (next.kinds[kindKey] ?? 0) + 1;
    if (s.context?.mention) next.kinds["x:mention"] = (next.kinds["x:mention"] ?? 0) + 1;
    if (s.context?.subreddit) next.subreddits[s.context.subreddit] = (next.subreddits[s.context.subreddit] ?? 0) + 1;
    for (const rule of rules) if (matchRule(rule, s.text, s.platform)) next.triggers[rule.id] = (next.triggers[rule.id] ?? 0) + 1;

    if (route === "vip" || route === "outreach") {
      const sales = { ...next.sales[s.platform] };
      sales.engaged += 1;
      if (route === "vip") sales.pipeline += (s.budgetK ?? 5) * 1000;
      if (r() < 0.3) sales.conversations += 1;
      if (r() < (route === "vip" ? 0.02 : 0.003)) {
        // First-contract value: a slice of the stated budget, not the whole of it.
        const amount = Math.round(((s.budgetK ?? 8) * 1000 * (0.15 + r() * 0.2)) / 100) * 100;
        sales.deals += 1;
        sales.revenue += amount;
        closes.push({ id: `c-${s.id}`, platform: s.platform, name: s.author.name, handle: s.author.handle, amount, t: now });
        lines.push({ id: `cl-${s.id}`, time: clock(new Date(now)), tone: "gold", text: `Deal closed · ${s.author.name} via ${PLATFORMS[s.platform].label} · $${fmt(amount)} attributed` });
      }
      next.sales[s.platform] = sales;
    }

    if (blips.length < 8) {
      blips.push({ id: s.id, angle: PLATFORM_KEYS.indexOf(s.platform) * 72 + 8 + r() * 56, radius: 8 + (100 - s.result.score) * 0.8, color: routeColor(route, s.result.tier), born: now });
    }
  }

  for (const s of notable) {
    const line = autoLog(s, now);
    if (line) lines.push(line);
  }
  if (featured.length) {
    next.feeds = { ...prev.feeds };
    for (const s of featured) next.feeds[s.platform] = [s, ...next.feeds[s.platform]].slice(0, FEED_MAX);
  }

  next.window = [...prev.window.filter((w) => now - w.t < WINDOW_MS), { t: now, n: batch.length, per }];
  next.ledger = notable.length ? [...notable, ...prev.ledger].slice(0, LEDGER_MAX) : prev.ledger;
  next.blips = [...blips, ...prev.blips.filter((b) => now - b.born < BLIP_LIFE_MS)].slice(0, 80);
  next.log = lines.length ? [...lines, ...prev.log].slice(0, 80) : prev.log;
  next.closes = closes.length ? [...closes, ...prev.closes].slice(0, 24) : prev.closes;
  return next;
}

/** The best signal per platform in a batch, for the platform views' feeds. */
function bestPerPlatform(batch: PulseSignal[], r: () => number) {
  const best = new Map<Platform, PulseSignal>();
  for (const s of batch) {
    const cur = best.get(s.platform);
    // Mostly the strongest, sometimes a random one, so feeds show the full range of intent.
    if (!cur || (r() < 0.25 ? r() < 0.5 : s.result.score > cur.result.score)) best.set(s.platform, s);
  }
  return [...best.values()];
}

export type Staged = { label: string; at: number; text?: string; signal: PulseSignal };

export type SweepSummary ={ mode: Mode; count: number; ms: number; notice?: string; runs: { platform: string; count: number; error?: string }[] };

export function usePulseEngine() {
  const [hub, setHub] = useState<Hub>(EMPTY);
  const [now, setNow] = useState(0);
  const [running, setRunning] = useState(true);
  const [mode, setMode] = useState<Mode>("simulated");
  const [keywords, setKeywords] = useState<string[]>(["lead routing", "AI agency", "intent data"]);
  const [platforms, setPlatforms] = useState<Platform[]>([...SWEEPABLE]);
  const [watchedSubs, setWatchedSubs] = useState<string[]>(["SaaS", "marketing", "sales", "startups"]);
  const [perSweep, setPerSweep] = useState(25);
  const [sweep, setSweep] = useState<{ busy: boolean; last?: SweepSummary }>({ busy: false });
  const [outcomes, setOutcomes] = useState<Record<string, DispatchResult>>({});
  const [staged, setStaged] = useState<Record<string, Staged>>({});
  const [busy, setBusy] = useState<{ id: string; kind: DispatchAction | "rescore" } | null>(null);
  /** Increments to make the dahlias bloom with light. */
  const [flare, setFlare] = useState(0);
  const [glowing, setGlowing] = useState(false);
  const [rules, setRules] = usePersistent<TriggerRule[]>("bloom.e4.triggers", DEFAULT_TRIGGERS);
  const [autoResponder, setAutoResponder] = usePersistent<AutoResponder>("bloom.e4.auto", DEFAULT_AUTORESPONDER);
  // The stream reads the rules through a ref, so edits apply from the next tick without restarting it.
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const rRef = useRef<(() => number) | null>(null);
  const seq = useRef(0);
  const tickN = useRef(0);
  const lastFlare = useRef(0);
  const hovering = useRef(false);
  const glowTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dripTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  const rand = () => (rRef.current ??= seeded(Date.now() % 1_000_000));

  /** Dahlias bloom with golden light; throttled so a burst of VIPs doesn't strobe. */
  const bloom = useCallback((force = false) => {
    const t = Date.now();
    if (!force && t - lastFlare.current < 2600) return;
    lastFlare.current = t;
    setFlare((f) => f + 1);
    setGlowing(true);
    clearTimeout(glowTimer.current);
    glowTimer.current = setTimeout(() => setGlowing(false), 1800);
  }, []);

  useEffect(() => {
    fetch("/api/intent-pulse/sweep")
      .then((r) => r.json())
      .then((j: { mode?: Mode }) => j.mode && setMode(j.mode))
      .catch(() => {});
    return () => {
      clearTimeout(glowTimer.current);
      clearInterval(dripTimer.current);
    };
  }, []);

  const step = (size?: number) => {
    const r = rand();
    const t = Date.now();
    const k = size ?? 20 + Math.floor(r() * 19); // ≈145 signals / second
    // LinkedIn, email and webhooks arrive on their own; the sweep toggles only scope the scrapable channels.
    const opts = { platforms: platforms.length ? [...platforms, "linkedin" as const, "email" as const, "webhook" as const] : undefined, keywords, subreddits: watchedSubs };
    const batch = Array.from({ length: k }, () => simulateSignal(r, seq.current++, opts));
    tickN.current += 1;
    const notable: PulseSignal[] = [];
    if (!hovering.current && tickN.current % 2 === 0) {
      const best = batch.reduce((a, b) => (b.result.score > a.result.score ? b : a));
      notable.push(best);
      const other = batch[Math.floor(r() * batch.length)];
      if (other !== best && r() < 0.45) notable.push(other);
    }
    const featured = !hovering.current && tickN.current % 3 === 0 ? bestPerPlatform(batch, r) : [];
    setHub((prev) => ingest(prev, batch, notable, featured, t, r, rulesRef.current));
    setNow(t);
    if (notable.some((s) => s.result.tier === "VIP" && s.result.score >= 92)) bloom();
  };

  // Fill the hub before the intro lifts, then stream.
  useEffect(() => {
    for (let i = 0; i < 30; i++) step(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useInterval(() => step(), running ? TICK_MS : null);

  const pushLog = useCallback(
    (entry: Omit<LogEntry, "id" | "time">) =>
      setHub((p) => ({ ...p, log: [{ ...entry, id: `u-${Date.now()}-${Math.random()}`, time: clock() }, ...p.log].slice(0, 80) })),
    [],
  );

  const triggerSweep = async (only?: Platform[], extraKeyword?: string) => {
    if (sweep.busy) return;
    const kws = (extraKeyword?.trim() ? [...keywords, extraKeyword.trim()] : keywords).slice(0, 6);
    const targets = (only ?? platforms).filter((p) => p !== "webhook");
    if (!kws.length) return void toast.error("Add at least one keyword to sweep.");
    if (!targets.length) return void toast.error("Toggle at least one platform.");
    setSweep((s) => ({ ...s, busy: true }));
    bloom(true);
    pushLog({ tone: "cyan", text: `Radar sweep dispatched · ${targets.map((p) => PLATFORMS[p].label).join(", ")} · “${kws.join("”, “")}”` });
    try {
      const res = await fetch("/api/intent-pulse/sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: kws, platforms: targets, perPlatform: perSweep }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Sweep failed.");
      const signals = json.signals as PulseSignal[];
      setMode(json.mode === "live" ? "live" : "simulated");
      setSweep({ busy: false, last: { mode: json.mode, count: signals.length, ms: json.latencyMs, notice: json.notice, runs: json.runs } });
      if (json.notice) toast.warning(json.notice);
      else toast.success(`${signals.length} signals intercepted (${json.mode})`);
      pushLog({ tone: "gold", text: `Sweep returned ${signals.length} ${json.mode} signals in ${fmt(json.latencyMs)} ms` });
      bloom(true);

      // Drip results in, strongest first, so the sweep lands visibly across every view.
      const queue = [...signals].sort((a, b) => b.result.score - a.result.score);
      clearInterval(dripTimer.current);
      dripTimer.current = setInterval(() => {
        const chunk = queue.splice(0, 3);
        if (!chunk.length) return clearInterval(dripTimer.current);
        const t = Date.now();
        setHub((prev) => ingest(prev, chunk, chunk, chunk, t, rand(), rulesRef.current));
        setNow(t);
      }, 60);
    } catch (err) {
      setSweep((s) => ({ ...s, busy: false }));
      toast.error(err instanceof Error ? err.message : "Sweep failed.");
    }
  };

  const dispatch = async (sig: PulseSignal, kind: DispatchAction) => {
    if (busy) return;
    setBusy({ id: sig.id, kind });
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
          channel: PLATFORMS[sig.platform].label,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Dispatch failed.");
      const d = json as DispatchResult;
      setOutcomes((o) => ({ ...o, [sig.id]: d }));
      const label = kind === "vip" ? "VIP calendar booking dispatched" : kind === "outreach" ? "Custom message sent" : "Signal quarantined";
      pushLog({ tone: kind === "vip" ? "gold" : kind === "outreach" ? "cyan" : "ember", text: `${d.dispatchId} · ${label} → ${sig.author.handle} (${d.source}, ${d.latencyMs} ms)` });
      toast.success(label);
      if (kind === "vip") bloom(true);
      return d;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dispatch failed.");
    } finally {
      setBusy(null);
    }
  };

  const rescore = async (sig: PulseSignal): Promise<PulseSignal | undefined> => {
    if (busy) return;
    setBusy({ id: sig.id, kind: "rescore" });
    try {
      const res = await fetch("/api/intent-pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sig.result.lead) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Re-score failed.");
      const result = json as IntentResult;
      const next = { ...sig, result };
      const swap = (list: PulseSignal[]) => list.map((s) => (s.id === sig.id ? next : s));
      setHub((p) => ({ ...p, ledger: swap(p.ledger), feeds: { ...p.feeds, [sig.platform]: swap(p.feeds[sig.platform]) } }));
      pushLog({ tone: "cyan", text: `Deep re-score · ${sig.author.handle} → ${result.score} (${result.tier}) by ${result.source === "groq" ? `Groq ${result.model}` : "heuristic engine"} in ${result.latencyMs} ms` });
      if (result.notice) toast.message(result.notice);
      return next;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-score failed.");
    } finally {
      setBusy(null);
    }
  };

  /** Platform-native actions (post a comment, queue a quote-tweet) staged locally: no social account is connected. */
  const stage = (sig: PulseSignal, label: string, text?: string) => {
    setStaged((s) => ({ ...s, [sig.id]: { label, at: Date.now(), text, signal: sig } }));
    pushLog({ tone: "cyan", text: `${label} · ${PLATFORMS[sig.platform].label} · ${sig.author.handle} (staged, no account connected)` });
    toast.success(`${label} (staged)`);
  };

  return {
    hub,
    now,
    running,
    setRunning,
    mode,
    keywords,
    setKeywords,
    platforms,
    setPlatforms,
    watchedSubs,
    setWatchedSubs,
    perSweep,
    setPerSweep,
    sweep,
    triggerSweep,
    outcomes,
    staged,
    busy,
    dispatch,
    rescore,
    stage,
    flare,
    glowing,
    hovering,
    rules,
    setRules,
    autoResponder,
    setAutoResponder,
  };
}

export type PulseEngine = ReturnType<typeof usePulseEngine>;
