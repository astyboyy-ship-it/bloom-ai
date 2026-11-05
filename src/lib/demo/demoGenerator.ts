import { sha256 } from "@/lib/sha256";

/**
 * Tier 5 Demo Partner Mode: domain-specific mock telemetry. Everything here is synthesized, on purpose, so a
 * sales partner can show a live-feeling BLOOM architecture without a production key, a model or any client data.
 *
 * Framework-free and text-free: frames carry metric keys and log codes with values, and the UI renders them in
 * the visitor's language. A seeded PRNG keeps a run reproducible; each metric is a mean-reverting random walk
 * with occasional shocks, so numbers move like real telemetry rather than flicker like noise.
 */

export type DemoTargetId = "music" | "trading" | "coreops" | "intentpulse";

export type DemoUnit = "ms" | "pct" | "count" | "usd" | "per_s" | "per_min" | "score" | "lufs";
export type DemoTone = "ok" | "warn" | "alert";

export interface DemoMetric {
  key: string;
  value: number;
  unit: DemoUnit;
  /** Change since the previous frame. */
  delta: number;
  tone: DemoTone;
}

export interface DemoLogLine {
  id: number;
  at: number;
  level: "info" | "ok" | "warn";
  /** A message code; the UI owns the wording (see components/demo-engine/copy.ts). */
  code: string;
  vars: Record<string, string | number>;
}

export interface DemoConsensusCandidate {
  engine: string;
  score: number;
  latencyMs: number;
  /** SHA-256 over the candidate's synthetic output, shortened for display. */
  sig: string;
  chosen: boolean;
}

export interface DemoTicker {
  symbol: string;
  price: number;
  changePct: number;
}

export interface DemoQueue {
  name: string;
  depth: number;
  workers: number;
}

export interface DemoFrame {
  seq: number;
  at: number;
  target: DemoTargetId;
  metrics: DemoMetric[];
  /** The headline metric's recent history, oldest first. */
  series: number[];
  /** Lines produced by this frame only. */
  logs: DemoLogLine[];
  consensus: DemoConsensusCandidate[];
  /** Domain panels: present for the targets that have them. */
  ticker?: DemoTicker[];
  buffer?: number[];
  queues?: DemoQueue[];
  channels?: { channel: string; share: number }[];
}

export interface DemoTarget {
  id: DemoTargetId;
  /** The BLOOM engines the story is built on (display only; nothing runs). */
  engines: string[];
  headline: string;
}

export const DEMO_TARGETS: DemoTarget[] = [
  { id: "music", engines: ["cortex", "aether", "shield"], headline: "latency_ms" },
  { id: "trading", engines: ["apex", "shield", "sovereign"], headline: "exec_latency_ms" },
  { id: "coreops", engines: ["coreops", "sovereign", "vanguard"], headline: "throughput" },
  { id: "intentpulse", engines: ["intentpulse", "vanguard", "cortex"], headline: "signals" },
];

/** mulberry32: small, fast and good enough for synthetic telemetry. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Spec = { key: string; unit: DemoUnit; base: number; min: number; max: number; vol: number; revert: number; decimals: number; warn?: (v: number) => DemoTone };

const above = (warn: number, alert: number) => (v: number): DemoTone => (v >= alert ? "alert" : v >= warn ? "warn" : "ok");
const below = (warn: number, alert: number) => (v: number): DemoTone => (v <= alert ? "alert" : v <= warn ? "warn" : "ok");

const SPECS: Record<DemoTargetId, Spec[]> = {
  music: [
    { key: "latency_ms", unit: "ms", base: 11.6, min: 4, max: 40, vol: 0.9, revert: 0.18, decimals: 1, warn: above(18, 26) },
    { key: "buffer_fill", unit: "pct", base: 72, min: 20, max: 100, vol: 4, revert: 0.15, decimals: 0, warn: below(45, 30) },
    { key: "stems_per_min", unit: "per_min", base: 38, min: 8, max: 90, vol: 3, revert: 0.12, decimals: 0 },
    { key: "consensus_quality", unit: "score", base: 94, min: 70, max: 99.6, vol: 0.8, revert: 0.2, decimals: 1, warn: below(88, 80) },
    { key: "loudness", unit: "lufs", base: -14, min: -20, max: -8, vol: 0.25, revert: 0.3, decimals: 1 },
  ],
  trading: [
    { key: "exec_latency_ms", unit: "ms", base: 0.42, min: 0.08, max: 4, vol: 0.06, revert: 0.25, decimals: 2, warn: above(0.9, 2) },
    { key: "fills_per_s", unit: "per_s", base: 214, min: 20, max: 900, vol: 22, revert: 0.15, decimals: 0 },
    { key: "risk_utilization", unit: "pct", base: 46, min: 5, max: 99, vol: 2.4, revert: 0.08, decimals: 0, warn: above(75, 90) },
    { key: "pnl_usd", unit: "usd", base: 18_400, min: -60_000, max: 120_000, vol: 2600, revert: 0.02, decimals: 0 },
    { key: "risk_rejects", unit: "count", base: 2, min: 0, max: 40, vol: 0.9, revert: 0.3, decimals: 0, warn: above(8, 18) },
  ],
  coreops: [
    { key: "throughput", unit: "per_min", base: 1280, min: 200, max: 4000, vol: 70, revert: 0.12, decimals: 0 },
    { key: "worker_threads", unit: "count", base: 96, min: 16, max: 256, vol: 5, revert: 0.1, decimals: 0 },
    { key: "queue_depth", unit: "count", base: 340, min: 0, max: 4000, vol: 45, revert: 0.1, decimals: 0, warn: above(1200, 2400) },
    { key: "sla", unit: "pct", base: 99.4, min: 92, max: 100, vol: 0.12, revert: 0.25, decimals: 2, warn: below(99, 97.5) },
    { key: "retries", unit: "count", base: 4, min: 0, max: 80, vol: 1.4, revert: 0.3, decimals: 0, warn: above(15, 35) },
  ],
  intentpulse: [
    { key: "signals", unit: "per_min", base: 620, min: 80, max: 2400, vol: 40, revert: 0.12, decimals: 0 },
    { key: "hot_leads", unit: "count", base: 27, min: 0, max: 140, vol: 2.2, revert: 0.1, decimals: 0 },
    { key: "avg_intent", unit: "score", base: 71, min: 30, max: 98, vol: 1.6, revert: 0.15, decimals: 0 },
    { key: "routed", unit: "pct", base: 93, min: 60, max: 100, vol: 0.9, revert: 0.2, decimals: 1, warn: below(85, 75) },
    { key: "latency_ms", unit: "ms", base: 180, min: 40, max: 900, vol: 18, revert: 0.18, decimals: 0, warn: above(400, 650) },
  ],
};

// Synthetic instruments: invented symbols, no real listings.
const SYMBOLS: { symbol: string; price: number }[] = [
  { symbol: "BLMX", price: 184.2 },
  { symbol: "AURA", price: 62.75 },
  { symbol: "NOVQ", price: 311.4 },
  { symbol: "KSTR", price: 24.18 },
  { symbol: "OBSD", price: 97.6 },
  { symbol: "VRDN", price: 141.05 },
];
const STEMS = ["vocals", "drums", "bass", "keys", "fx"] as const;
const RISK_CHECKS = ["var_limit", "fat_finger", "position_cap", "drawdown", "kill_switch"] as const;
const QUEUES = ["ingest", "invoices", "reconcile", "notify", "reports"] as const;
const CHANNELS = ["linkedin", "reddit", "x", "instagram", "tiktok"] as const;
const TOPICS = ["pricing", "migration", "integration", "compliance", "onboarding"] as const;
const STAGES = ["mql", "sql", "demo", "proposal"] as const;
const CANDIDATES: Record<DemoTargetId, string[]> = {
  music: ["cortex", "aether", "shield"],
  trading: ["apex", "shield", "sovereign"],
  coreops: ["coreops", "sovereign", "vanguard"],
  intentpulse: ["intentpulse", "vanguard", "cortex"],
};

const SERIES_LEN = 48;
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface DemoGenerator {
  target: DemoTargetId;
  next(now?: number): DemoFrame;
}

/** A telemetry stream for one demo target. Call next() on an interval (about once a second reads well). */
export function createDemoGenerator(target: DemoTargetId, seed = Date.now()): DemoGenerator {
  const rand = prng(seed ^ target.length * 2654435761);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const specs = SPECS[target];
  const values = new Map(specs.map((s) => [s.key, s.base]));
  const headline = DEMO_TARGETS.find((t) => t.id === target)!.headline;
  const series: number[] = [];
  const tickers = SYMBOLS.map((s) => ({ ...s, open: s.price }));
  let buffer = Array.from({ length: 24 }, () => 0.5 + rand() * 0.4);
  const queues = QUEUES.map((name) => ({ name, depth: Math.floor(rand() * 200), workers: 8 + Math.floor(rand() * 24) }));
  const share = CHANNELS.map(() => 0.5 + rand());
  let seq = 0;
  let logId = 0;

  const step = (s: Spec) => {
    const cur = values.get(s.key)!;
    // Mean reversion, noise, and a rare shock (one frame in ~40) so the alerts get a chance to show.
    const shock = rand() < 0.025 ? gauss() * s.vol * 6 : 0;
    const next = clamp(cur + (s.base - cur) * s.revert + gauss() * s.vol + shock, s.min, s.max);
    values.set(s.key, next);
    return { key: s.key, value: round(next, s.decimals), unit: s.unit, delta: round(next - cur, s.decimals), tone: s.warn?.(next) ?? "ok" } satisfies DemoMetric;
  };

  const log = (at: number, level: DemoLogLine["level"], code: string, vars: DemoLogLine["vars"]): DemoLogLine => ({ id: ++logId, at, level, code, vars });

  function domainLogs(at: number, metrics: DemoMetric[]): DemoLogLine[] {
    const m = Object.fromEntries(metrics.map((x) => [x.key, x]));
    const out: DemoLogLine[] = [];
    const n = rand() < 0.35 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      switch (target) {
        case "music": {
          const r = rand();
          if (r < 0.45) out.push(log(at, "ok", "music.stem", { stem: pick(STEMS), sdr: round(7 + rand() * 5, 1), ms: Math.round(180 + rand() * 420) }));
          else if (r < 0.7) out.push(log(at, m.buffer_fill.tone === "ok" ? "info" : "warn", "music.buffer", { fill: m.buffer_fill.value, xruns: m.buffer_fill.tone === "ok" ? 0 : 1 + Math.floor(rand() * 3) }));
          else if (r < 0.85) out.push(log(at, "info", "music.master", { lufs: m.loudness.value, peak: round(-1.2 - rand(), 1) }));
          else out.push(log(at, "ok", "music.consensus", { score: m.consensus_quality.value, winner: pick(CANDIDATES.music) }));
          break;
        }
        case "trading": {
          const r = rand();
          const t = pick(tickers);
          if (r < 0.5) out.push(log(at, "ok", "trading.fill", { side: rand() < 0.5 ? "buy" : "sell", qty: (1 + Math.floor(rand() * 40)) * 100, sym: t.symbol, px: round(t.price, 2), ms: m.exec_latency_ms.value }));
          else if (r < 0.8) out.push(log(at, m.risk_utilization.tone === "ok" ? "ok" : "warn", m.risk_utilization.tone === "ok" ? "trading.risk_ok" : "trading.risk_warn", { check: pick(RISK_CHECKS), util: m.risk_utilization.value }));
          else out.push(log(at, "info", "trading.hedge", { sym: t.symbol, delta: round((rand() - 0.5) * 0.6, 2) }));
          break;
        }
        case "coreops": {
          const r = rand();
          const q = pick(queues);
          if (r < 0.5) out.push(log(at, "ok", "coreops.done", { queue: q.name, n: 10 + Math.floor(rand() * 240), ms: Math.round(40 + rand() * 600) }));
          else if (r < 0.7) out.push(log(at, "info", "coreops.scale", { queue: q.name, from: q.workers, to: q.workers + (rand() < 0.6 ? 4 : -2) }));
          else if (r < 0.88) out.push(log(at, m.retries.tone === "ok" ? "info" : "warn", "coreops.retry", { queue: q.name, job: `J-${(1000 + Math.floor(rand() * 9000)).toString(16).toUpperCase()}` }));
          else out.push(log(at, m.sla.tone === "ok" ? "ok" : "warn", "coreops.sla", { pct: m.sla.value }));
          break;
        }
        case "intentpulse": {
          const r = rand();
          if (r < 0.5) out.push(log(at, "info", "intent.signal", { channel: pick(CHANNELS), score: Math.round(50 + rand() * 49), topic: pick(TOPICS) }));
          else if (r < 0.75) out.push(log(at, "ok", "intent.lead", { score: Math.round(75 + rand() * 24), stage: pick(STAGES) }));
          else if (r < 0.9) out.push(log(at, "info", "intent.route", { to: pick(["sales", "success", "partners"]), n: 1 + Math.floor(rand() * 6) }));
          else out.push(log(at, "info", "intent.dedupe", { n: 2 + Math.floor(rand() * 30) }));
          break;
        }
      }
    }
    return out;
  }

  function consensus(at: number, quality: number): DemoConsensusCandidate[] {
    const scores = CANDIDATES[target].map((engine) => ({ engine, score: round(clamp(quality / 100 + gauss() * 0.06, 0.4, 0.995), 3), latencyMs: Math.round(120 + rand() * 900) }));
    const best = Math.max(...scores.map((s) => s.score));
    return scores.map((s) => ({ ...s, sig: sha256(`${target}|${seq}|${at}|${s.engine}|${s.score}`).slice(0, 16), chosen: s.score === best }));
  }

  return {
    target,
    next(now = Date.now()) {
      seq++;
      const metrics = specs.map(step);
      const head = metrics.find((x) => x.key === headline)!;
      series.push(head.value);
      if (series.length > SERIES_LEN) series.shift();
      const quality = target === "music" ? metrics.find((x) => x.key === "consensus_quality")!.value : 86 + rand() * 10;
      const frame: DemoFrame = { seq, at: now, target, metrics, series: [...series], logs: domainLogs(now, metrics), consensus: consensus(now, quality) };

      if (target === "trading") {
        for (const t of tickers) t.price = Math.max(0.5, t.price * (1 + gauss() * 0.0025));
        frame.ticker = tickers.map((t) => ({ symbol: t.symbol, price: round(t.price, 2), changePct: round(((t.price - t.open) / t.open) * 100, 2) }));
      } else if (target === "music") {
        const fill = metrics.find((x) => x.key === "buffer_fill")!.value / 100;
        buffer = [...buffer.slice(1), clamp(fill + gauss() * 0.12, 0.05, 1)];
        frame.buffer = buffer.map((b) => round(b, 3));
      } else if (target === "coreops") {
        for (const q of queues) {
          q.depth = Math.max(0, Math.round(q.depth + gauss() * 40 - q.workers * 0.6 + rand() * 20));
          q.workers = clamp(q.workers + (q.depth > 300 ? 1 : q.depth < 40 ? -1 : 0), 4, 64);
        }
        frame.queues = queues.map((q) => ({ ...q }));
      } else {
        share.forEach((s, i) => (share[i] = clamp(s + gauss() * 0.05, 0.1, 2)));
        const total = share.reduce((a, b) => a + b, 0);
        frame.channels = CHANNELS.map((channel, i) => ({ channel, share: round(share[i] / total, 3) }));
      }
      return frame;
    },
  };
}

/** Warms a generator up so the first paint already has history. */
export function primeDemo(gen: DemoGenerator, frames = 30, interval = 1000): DemoFrame {
  const start = Date.now() - frames * interval;
  let f = gen.next(start);
  for (let i = 1; i < frames; i++) f = gen.next(start + i * interval);
  return f;
}
