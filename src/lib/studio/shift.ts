/**
 * Engine 02 (Aware Infrastructure Architect): the exact-AI cost optimizer and the clock-off jobs.
 * Costs use Anthropic's published per-token prices (cached 2026-10-06); token counts for prompts are
 * estimated at ~4 characters per token, which is fine for comparing before/after but not for billing.
 */

export type ModelId = "claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-opus-5-5";

/** USD per million tokens. Cache writes (5-minute TTL) are 1.25× input; Batch API halves everything. */
export const MODELS: Record<ModelId, { label: string; input: number; output: number; cacheRead: number }> = {
  "claude-haiku-5-5": { label: "Claude Haiku 5.5", input: 0.1, output: 0.5, cacheRead: 0.01 },
  "claude-sonnet-5-5": { label: "Claude Sonnet 5.5", input: 2, output: 10, cacheRead: 0.2 },
  "claude-opus-5-5": { label: "Claude Opus 5.5", input: 4, output: 20, cacheRead: 0.2 },
};
export const MODEL_IDS = Object.keys(MODELS) as ModelId[];
export const PRICING_NOTE = "Anthropic list prices as of Oct 2026 (Haiku 5.5 rate for prompts ≤100K tokens). Verify at platform.claude.com before budgeting.";
const CACHE_WRITE = 1.25;
const BATCH = 0.5;

export type Task = "classify" | "extract" | "summarize" | "generate" | "reason";
export const TASKS: Record<Task, { label: string; model: ModelId; why: string }> = {
  classify: { label: "Classify / route", model: "claude-haiku-5-5", why: "Short label output; the smallest model is accurate here." },
  extract: { label: "Extract fields", model: "claude-haiku-5-5", why: "Structured extraction from given text; no deep reasoning needed." },
  summarize: { label: "Summarize", model: "claude-sonnet-5-5", why: "Needs good compression of long input, not frontier reasoning." },
  generate: { label: "Write / draft", model: "claude-sonnet-5-5", why: "Customer-facing prose where Sonnet's quality is enough." },
  reason: { label: "Multi-step reasoning", model: "claude-opus-5-5", why: "Judgement calls with real downside; keep the strongest model." },
};

export type Step = {
  id: string;
  name: string;
  task: Task;
  model: ModelId;
  system: string;
  /** Average variable input per call (the ticket, the document), in tokens. */
  inputTokens: number;
  outputTokens: number;
  callsPerDay: number;
  /** A user is waiting on the answer; batch processing is not an option. */
  realtime: boolean;
  cache: boolean;
  batch: boolean;
};

export const tokens = (text: string) => Math.ceil(text.trim().length / 4);

// Phrases that add tokens but no instruction. Matched case-insensitively.
const FILLER = [
  /\bplease\b\s*/gi,
  /\bkindly\b\s*/gi,
  /\bmake sure (that )?(you )?/gi,
  /\bit is (very |extremely )?important (that )?(you )?/gi,
  /\balways remember (to|that)\s*/gi,
  /\bas an ai( language model)?,?\s*/gi,
  // Only the bare boilerplate sentence; "You are a helpful assistant that works for…" carries meaning.
  /\byou are a helpful assistant\.\s*/gi,
  /\bin order to\b/gi,
  /\bat all times\b\s*/gi,
  /\bvery\s+/gi,
  /\breally\s+/gi,
  /\bbasically\s+/gi,
];

/**
 * Strips prompt bloat with plain text transforms: filler phrases, repeated sentences, few-shot
 * examples beyond the first two, and extra whitespace. Returns what was removed so it can be reviewed.
 */
export function compress(text: string): { text: string; removed: string[] } {
  const removed: string[] = [];
  let out = text;
  for (const re of FILLER) {
    const hits = out.match(re);
    if (hits) removed.push(...hits.map((h) => `filler: “${h.trim()}”`));
    out = out.replace(re, (m) => (/^in order to$/i.test(m.trim()) ? "to" : ""));
  }
  // Few-shot examples: keep the first two.
  let n = 0;
  out = out.replace(/(^|\n)Example \d+:[\s\S]*?(?=\nExample \d+:|\n\n(?!Example)|$)/g, (block) => {
    n++;
    if (n <= 2) return block;
    removed.push(`example ${n} (keeping two)`);
    return "";
  });
  // Repeated sentences, compared across the whole prompt but split line by line so layout survives.
  const seen = new Set<string>();
  out = out
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.!?])\s+/)
        .filter((s) => {
          const key = s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
          if (!key) return true;
          if (seen.has(key)) {
            removed.push(`duplicate: “${s.trim().slice(0, 60)}”`);
            return false;
          }
          seen.add(key);
          return true;
        })
        .join(" "),
    )
    .join("\n");
  out = out.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/\s+([.,])/g, "$1").trim();
  // Re-capitalise sentences that lost their first word.
  out = out.replace(/(^|[.!?]\s+|\n)([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
  return { text: out, removed };
}

export type Cost = { perDay: number; lines: { label: string; usd: number }[] };

/** Daily cost of one step as configured. */
export function stepCost(s: Step): Cost {
  const m = MODELS[s.model];
  const sys = tokens(s.system);
  const discount = s.batch && !s.realtime ? BATCH : 1;
  const per = (n: number, price: number) => (n * price) / 1_000_000;
  // With caching, the system prompt is written once per 5-minute window and read on every other call.
  const writes = s.cache ? Math.min(s.callsPerDay, 288) : 0;
  const reads = s.cache ? s.callsPerDay - writes : 0;
  const sysCost = s.cache ? per(sys * writes, m.input * CACHE_WRITE) + per(sys * reads, m.cacheRead) : per(sys * s.callsPerDay, m.input);
  const lines = [
    { label: `System prompt (${sys.toLocaleString("en-US")} tok${s.cache ? ", cached" : ""})`, usd: sysCost * discount },
    { label: `Variable input (${s.inputTokens.toLocaleString("en-US")} tok)`, usd: per(s.inputTokens * s.callsPerDay, m.input) * discount },
    { label: `Output (${s.outputTokens.toLocaleString("en-US")} tok)`, usd: per(s.outputTokens * s.callsPerDay, m.output) * discount },
  ];
  return { perDay: lines.reduce((a, l) => a + l.usd, 0), lines };
}

export type Lever = { id: "model" | "compress" | "cache" | "batch"; label: string; detail: string; apply: (s: Step) => Step };

/** The optimizations that would lower this step's cost, each applicable on its own. */
export function levers(s: Step): Lever[] {
  const out: Lever[] = [];
  const rec = TASKS[s.task].model;
  if (MODEL_IDS.indexOf(rec) < MODEL_IDS.indexOf(s.model)) {
    out.push({ id: "model", label: `Route to ${MODELS[rec].label}`, detail: TASKS[s.task].why, apply: (x) => ({ ...x, model: rec }) });
  }
  const c = compress(s.system);
  if (tokens(c.text) < tokens(s.system)) {
    out.push({ id: "compress", label: `Strip ${tokens(s.system) - tokens(c.text)} tokens of prompt bloat`, detail: `${c.removed.length} edits: ${c.removed.slice(0, 3).join(", ")}${c.removed.length > 3 ? "…" : ""}`, apply: (x) => ({ ...x, system: compress(x.system).text }) });
  }
  if (!s.cache && s.callsPerDay > 288 && tokens(s.system) >= 512) {
    out.push({ id: "cache", label: "Cache the system prompt", detail: "Stable prefix on every call: pay ~10% on reads instead of full input.", apply: (x) => ({ ...x, cache: true }) });
  }
  if (!s.batch && !s.realtime) {
    out.push({ id: "batch", label: "Run through the Batch API", detail: "Nobody waits on this step: 50% off, results within 24 h.", apply: (x) => ({ ...x, batch: true }) });
  }
  return out;
}

export const optimized = (s: Step) => levers(s).reduce((x, l) => l.apply(x), s);

const BLOATED = `You are a helpful assistant. You are a helpful assistant that works for Acme Support. It is very important that you read the ticket carefully. Please make sure that you read the ticket carefully. Always remember to be polite at all times. As an AI language model, you should classify the ticket into exactly one category: billing, bug, how-to, account, or other. Please make sure you only output the category name. It is extremely important that you only output the category name.

Example 1: "I was charged twice" -> billing
Example 2: "The export button does nothing" -> bug
Example 3: "How do I add a teammate?" -> how-to
Example 4: "I can't log in" -> account
Example 5: "Do you have an office in Berlin?" -> other`;

export const DEFAULT_STEPS: Step[] = [
  { id: "st1", name: "Classify inbound ticket", task: "classify", model: "claude-opus-5-5", system: BLOATED, inputTokens: 450, outputTokens: 5, callsPerDay: 6000, realtime: true, cache: false, batch: false },
  {
    id: "st2",
    name: "Extract order & account details",
    task: "extract",
    model: "claude-sonnet-5-5",
    system: "You are a helpful assistant. Please extract the order ID, account email, plan and amount from the ticket. Return JSON with keys order_id, email, plan, amount. It is very important that you return valid JSON. Make sure that you return valid JSON. If a field is missing, use null.",
    inputTokens: 520,
    outputTokens: 60,
    callsPerDay: 2400,
    realtime: true,
    cache: false,
    batch: false,
  },
  {
    id: "st3",
    name: "Draft the customer reply",
    task: "generate",
    model: "claude-opus-5-5",
    system: "You are Acme's support writer. Write a warm, concise reply that solves the customer's problem in under 120 words, using the extracted details and the help-centre article provided. Never promise refunds; route refund requests to billing. Sign off as the Acme Support team.",
    inputTokens: 1400,
    outputTokens: 220,
    callsPerDay: 2400,
    realtime: true,
    cache: false,
    batch: false,
  },
  {
    id: "st4",
    name: "Escalation decision",
    task: "reason",
    model: "claude-opus-5-5",
    system: "Decide whether this ticket needs a human: legal threats, security incidents, enterprise accounts over $50k ARR, or a third contact on the same issue. Explain the decision in one sentence, then output ESCALATE or RESOLVE.",
    inputTokens: 1600,
    outputTokens: 120,
    callsPerDay: 400,
    realtime: false,
    cache: false,
    batch: false,
  },
  {
    id: "st5",
    name: "Nightly support digest",
    task: "summarize",
    model: "claude-opus-5-5",
    system: "Summarize the day's tickets for the support lead: top five issues by volume, any new bugs, and accounts at churn risk. Keep it under 300 words.",
    inputTokens: 60000,
    outputTokens: 600,
    callsPerDay: 1,
    realtime: false,
    cache: false,
    batch: false,
  },
];

export type Job = { id: string; group: "Admin cleanup" | "Backend sync" | "Infra optimization"; label: string; hours: number };

export const JOBS: Job[] = [
  { id: "tickets", group: "Admin cleanup", label: "Archive tickets resolved more than 14 days ago", hours: 0.4 },
  { id: "sessions", group: "Admin cleanup", label: "Purge expired sessions and stale API tokens", hours: 0.2 },
  { id: "logs", group: "Admin cleanup", label: "Rotate and compress application logs", hours: 0.3 },
  { id: "crm", group: "Backend sync", label: "Reconcile CRM ↔ billing (plans, seats, MRR)", hours: 0.9 },
  { id: "search", group: "Backend sync", label: "Rebuild the help-centre search index", hours: 0.6 },
  { id: "warehouse", group: "Backend sync", label: "Load the day into the analytics warehouse", hours: 1.1 },
  { id: "routing", group: "Infra optimization", label: "Deploy the optimized model routing from the canvas", hours: 0.3 },
  { id: "rightsize", group: "Infra optimization", label: "Right-size idle instances and autoscaling floors", hours: 0.8 },
  { id: "orphans", group: "Infra optimization", label: "Delete orphaned volumes and snapshots older than 30 days", hours: 0.4 },
  { id: "tls", group: "Infra optimization", label: "Renew TLS certificates expiring within 30 days", hours: 0.2 },
];

/** Default schedules: a staggered night, heavy syncs after midnight, the weekly purge on Sundays. */
export const DEFAULT_CRON: Record<string, string> = {
  tickets: "0 22 * * *",
  sessions: "15 22 * * *",
  logs: "30 22 * * *",
  crm: "0 23 * * *",
  search: "0 0 * * *",
  warehouse: "30 0 * * *",
  routing: "0 2 * * 1-5",
  rightsize: "0 3 * * *",
  orphans: "0 4 * * 0",
  tls: "0 5 * * *",
};

function cronField(field: string, min: number, max: number): Set<number> | null {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const [range, stepRaw] = part.split("/");
    const step = stepRaw ? Number(stepRaw) : 1;
    let lo: number;
    let hi: number;
    if (range === "*") [lo, hi] = [min, max];
    else if (range.includes("-")) [lo, hi] = range.split("-").map(Number) as [number, number];
    else lo = hi = Number(range);
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || !Number.isInteger(step) || step < 1 || lo < min || hi > max || lo > hi) return null;
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

/**
 * Next time a 5-field cron expression fires (minute hour day-of-month month day-of-week), searching
 * up to 8 days ahead. Supports *, numbers, lists, ranges and steps. Returns null when invalid.
 */
export function nextRun(cron: string, from = new Date()): Date | null {
  const f = cron.trim().split(/\s+/);
  if (f.length !== 5) return null;
  const [mi, ho, dom, mo, dow] = [cronField(f[0], 0, 59), cronField(f[1], 0, 23), cronField(f[2], 1, 31), cronField(f[3], 1, 12), cronField(f[4].replace("7", "0"), 0, 6)];
  if (!mi || !ho || !dom || !mo || !dow) return null;
  const t = new Date(from);
  t.setSeconds(0, 0);
  t.setMinutes(t.getMinutes() + 1);
  for (let i = 0; i < 8 * 24 * 60; i++) {
    if (mi.has(t.getMinutes()) && ho.has(t.getHours()) && dom.has(t.getDate()) && mo.has(t.getMonth() + 1) && dow.has(t.getDay())) return t;
    t.setMinutes(t.getMinutes() + 1);
  }
  return null;
}

/** "0 2 * * 1-5" → "02:00 · weekdays". Good enough for the common shapes. */
export function describeCron(cron: string) {
  const f = cron.trim().split(/\s+/);
  if (f.length !== 5) return "Invalid schedule";
  const at = /^\d+$/.test(f[0]) && /^\d+$/.test(f[1]) ? `${f[1].padStart(2, "0")}:${f[0].padStart(2, "0")}` : `minute ${f[0]}, hour ${f[1]}`;
  const days = f[4] === "*" ? "every day" : f[4] === "1-5" ? "weekdays" : f[4] === "0" || f[4] === "7" ? "Sundays" : f[4] === "6" ? "Saturdays" : `days ${f[4]}`;
  return `${at} · ${days}${f[2] !== "*" ? ` · day ${f[2]} of month` : ""}`;
}

export type ShiftRule = { id: string; text: string; on: boolean };

export const HUMAN_RULES: ShiftRule[] = [
  { id: "h1", text: "Enterprise escalations (> $50k ARR)", on: true },
  { id: "h2", text: "Refunds over $500", on: true },
  { id: "h3", text: "Security and legal tickets", on: true },
  { id: "h4", text: "Pricing exceptions", on: false },
];

export const AUTO_RULES: ShiftRule[] = [
  { id: "a1", text: "Classify, extract and draft every ticket", on: true },
  { id: "a2", text: "Auto-send replies scoring ≥ 0.9 confidence", on: true },
  { id: "a3", text: "Queue everything else for my morning review", on: true },
  { id: "a4", text: "Run the clock-off job list overnight", on: true },
];

/** Result lines for a job, derived from a seed so a run reads like real output. */
export function jobResult(job: Job, seed: number, routingSavingsPerDay: number): string {
  const n = (lo: number, hi: number) => Math.round(lo + (((seed * 9301 + job.id.length * 49297) % 233280) / 233280) * (hi - lo));
  switch (job.id) {
    case "tickets":
      return `${n(800, 2400).toLocaleString("en-US")} tickets archived`;
    case "sessions":
      return `${n(3000, 9000).toLocaleString("en-US")} sessions and ${n(4, 40)} stale tokens removed`;
    case "logs":
      return `${n(12, 60)} GB rotated, ${n(70, 88)}% compression`;
    case "crm":
      return `${n(1200, 4000).toLocaleString("en-US")} accounts reconciled, ${n(2, 19)} seat mismatches fixed`;
    case "search":
      return `${n(900, 2600).toLocaleString("en-US")} articles reindexed`;
    case "warehouse":
      return `${n(2, 9)}.${n(0, 9)}M rows loaded`;
    case "routing":
      return routingSavingsPerDay > 0 ? `Routing deployed: −$${routingSavingsPerDay.toFixed(2)}/day (−$${(routingSavingsPerDay * 30).toFixed(0)}/month)` : "Routing already optimal; nothing to deploy";
    case "rightsize":
      return `${n(3, 14)} instances downsized, ~$${n(140, 900)}/month saved`;
    case "orphans":
      return `${n(6, 40)} volumes and ${n(10, 90)} snapshots deleted (${n(200, 1800)} GB)`;
    case "tls":
      return `${n(0, 3)} certificates renewed`;
    default:
      return "Done";
  }
}
