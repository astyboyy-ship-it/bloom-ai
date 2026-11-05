import "server-only";
import { createReadStream } from "node:fs";
import { appendFile, mkdir, open, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import type { RunEvent } from "@/lib/engines/events";
import { redactSecrets } from "@/lib/security/injection";
import { addToSummary, emptySummary, type TraceStoreKind, type TraceSummary } from "./summary";

/**
 * The autonomous dataset pipeline: every finished run is recorded as one trace. Successful runs with output are
 * marked as fine-tuning sample candidates; the Neural Control Plane tails the store.
 *
 * Three backends behind one interface, picked at runtime:
 *  - file    local / desktop: appends to .bloom/datasets/trace_log.jsonl (cursor = byte offset)
 *  - kv      Vercel with Vercel KV / Upstash Redis configured (KV_REST_API_URL + KV_REST_API_TOKEN, or
 *            UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN): a capped Redis list over the REST API, shared by
 *            every function instance (cursor = sequence number)
 *  - memory  Vercel without KV: a capped in-process ring buffer. Never throws, but each serverless instance has
 *            its own buffer, so the monitor only sees runs that landed on the same instance.
 */

export const TRACE_LOG = join(process.cwd(), ".bloom", "datasets", "trace_log.jsonl");
export const TRACE_FILE_LABEL = ".bloom/datasets/trace_log.jsonl";

export type TraceRecord = {
  ts: string;
  runId: string;
  kind: "engine" | "pipeline";
  target: string;
  engines: string[];
  mode: string;
  ok: boolean;
  ms: number;
  tokens: { input: number; output: number };
  agents: number;
  tools: number;
  /** A successful run with output: a fine-tuning sample candidate. */
  sample: boolean;
  prompt: string;
  completion: string | null;
};

export type TraceRead = { records: TraceRecord[]; next: number; size: number; exists: boolean; reset: boolean };

export interface TraceStore {
  kind: TraceStoreKind;
  label: string;
  append(r: TraceRecord): Promise<void>;
  /** Records added after `cursor` (at most `limit`); `reset` when the cursor no longer fits the store. */
  read(cursor: number, limit?: number): Promise<TraceRead>;
  summarize(): Promise<TraceSummary>;
}

const CAP = 2000;

function parse(line: string): TraceRecord | null {
  try {
    const r = JSON.parse(line) as TraceRecord;
    return r && typeof r.runId === "string" ? r : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------------------------------ file */

const fileStore: TraceStore = {
  kind: "file",
  label: TRACE_FILE_LABEL,
  async append(r) {
    if (process.env.BLOOM_TRACE_LOG === "off") return;
    await mkdir(dirname(TRACE_LOG), { recursive: true });
    await appendFile(TRACE_LOG, `${JSON.stringify(r)}\n`, "utf8");
  },
  async read(from, limit = 200) {
    const maxBytes = 256_000;
    let size = 0;
    try {
      size = (await stat(TRACE_LOG)).size;
    } catch {
      return { records: [], next: 0, size: 0, exists: false, reset: from !== 0 };
    }
    // A truncated or rotated file starts over; a large backlog is read from its tail.
    const reset = from > size || from < 0;
    let start = reset ? 0 : from;
    if (size - start > maxBytes) start = size - maxBytes;
    if (start === size) return { records: [], next: size, size, exists: true, reset };
    const fh = await open(TRACE_LOG, "r");
    try {
      const buf = Buffer.alloc(size - start);
      await fh.read(buf, 0, buf.length, start);
      const text = buf.toString("utf8");
      // Only complete lines: a line still being written is picked up on the next poll.
      const end = text.lastIndexOf("\n");
      if (end < 0) return { records: [], next: start, size, exists: true, reset };
      const chunk = text.slice(0, end);
      const lines = chunk.split("\n").filter(Boolean);
      // Reading from the middle of the file: the first piece may be a partial line.
      if (start > 0 && start !== from) lines.shift();
      const records = lines.map(parse).filter((x): x is TraceRecord => x !== null).slice(-limit);
      return { records, next: start + Buffer.byteLength(chunk, "utf8") + 1, size, exists: true, reset };
    } finally {
      await fh.close();
    }
  },
  async summarize() {
    const s = emptySummary();
    try {
      await stat(TRACE_LOG);
    } catch {
      return s;
    }
    const rl = createInterface({ input: createReadStream(TRACE_LOG, { encoding: "utf8" }), crlfDelay: Infinity });
    for await (const line of rl) {
      const r = line && parse(line);
      if (r) addToSummary(s, r);
    }
    return s;
  },
};

/* ---------------------------------------------------------------------------------------------- memory */

type Ring = { total: number; items: TraceRecord[] };
const globalRing = globalThis as unknown as { __bloomTraceRing?: Ring };
const ring = (): Ring => (globalRing.__bloomTraceRing ??= { total: 0, items: [] });

/** Shared by the memory and KV stores: a sequence cursor over a capped list holding the latest `held` items. */
function sliceBySeq(cursor: number, total: number, held: number, limit: number): { reset: boolean; from: number; count: number } {
  const reset = cursor > total || cursor < 0;
  const since = reset ? 0 : cursor;
  const count = Math.min(total - since, held, limit);
  return { reset, from: held - count, count };
}

const memoryStore: TraceStore = {
  kind: "memory",
  label: "in-memory ring buffer (this instance)",
  async append(r) {
    const b = ring();
    b.items.push(r);
    b.total++;
    if (b.items.length > CAP) b.items.splice(0, b.items.length - CAP);
  },
  async read(cursor, limit = 200) {
    const b = ring();
    const { reset, from, count } = sliceBySeq(cursor, b.total, b.items.length, limit);
    return { records: count > 0 ? b.items.slice(from) : [], next: b.total, size: b.items.length, exists: b.total > 0, reset };
  },
  async summarize() {
    const s = emptySummary();
    ring().items.forEach((r) => addToSummary(s, r));
    return s;
  },
};

/* -------------------------------------------------------------------------------------------------- kv */

const LIST = "bloom:datasets:trace_log";
const SEQ = "bloom:datasets:trace_seq";

function kvConfig(): { url: string; token: string } | null {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)?.replace(/\/+$/, "");
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/** Runs Redis commands in one round trip over the Upstash REST pipeline endpoint. */
async function kv(cfg: { url: string; token: string }, commands: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const failed = out.find((x) => x.error);
  if (failed) throw new Error(`KV ${failed.error}`);
  return out.map((x) => x.result);
}

function kvStore(cfg: { url: string; token: string }): TraceStore {
  return {
    kind: "kv",
    label: "Vercel KV / Redis",
    async append(r) {
      await kv(cfg, [["RPUSH", LIST, JSON.stringify(r)], ["LTRIM", LIST, -CAP, -1], ["INCR", SEQ]]);
    },
    async read(cursor, limit = 200) {
      const [total, held] = (await kv(cfg, [["GET", SEQ], ["LLEN", LIST]])).map((x) => Number(x) || 0);
      const { reset, from, count } = sliceBySeq(cursor, total, held, limit);
      const raw = count > 0 ? ((await kv(cfg, [["LRANGE", LIST, from, -1]]))[0] as string[]) : [];
      return { records: raw.map(parse).filter((x): x is TraceRecord => x !== null), next: total, size: held, exists: total > 0, reset };
    },
    async summarize() {
      const s = emptySummary();
      const raw = (await kv(cfg, [["LRANGE", LIST, 0, -1]]))[0] as string[];
      raw.map(parse).forEach((r) => r && addToSummary(s, r));
      return s;
    },
  };
}

/* ------------------------------------------------------------------------------------------------ pick */

export const onVercel = () => process.env.VERCEL === "1";

/** The store for this runtime: the file locally and on the desktop, KV (or memory) on Vercel. */
export function traceStore(): TraceStore {
  if (!onVercel()) return fileStore;
  const cfg = kvConfig();
  return cfg ? kvStore(cfg) : memoryStore;
}

/* ---------------------------------------------------------------------------------------------- record */

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * Wraps a run's emit so the run is traced when it ends. Call `flush()` before closing the response: serverless
 * functions can freeze once the response ends, so the write must finish first. Trace failures never fail a run.
 */
export function traceRun(meta: { kind: TraceRecord["kind"]; target: string; engines: string[]; command: string }, send: (e: RunEvent) => void) {
  let start: Extract<RunEvent, { type: "run.start" }> | null = null;
  let pending: Promise<void> = Promise.resolve();
  const emit = (e: RunEvent) => {
    send(e);
    if (e.type === "run.start" && !start) start = e;
    else if (e.type === "run.end") {
      const output = e.output == null ? "" : typeof e.output === "string" ? e.output : JSON.stringify(e.output);
      const record: TraceRecord = {
        ts: new Date().toISOString(),
        runId: e.runId,
        kind: meta.kind,
        target: meta.target,
        engines: meta.engines,
        mode: start?.mode ?? "unknown",
        ok: e.ok,
        ms: Math.round(e.ms),
        tokens: e.usage,
        agents: e.agents,
        tools: e.tools,
        sample: e.ok && output.length > 0,
        prompt: clip(redactSecrets(meta.command), 2000),
        completion: e.ok && output ? clip(redactSecrets(output), 6000) : null,
      };
      pending = traceStore()
        .append(record)
        .catch(() => {
          // Read-only filesystem, KV outage: the dataset pipeline skips this trace; the run is unaffected.
        });
    }
  };
  return { emit, flush: () => pending };
}
