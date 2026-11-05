import "server-only";
import { appendFile, mkdir, open, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { RunEvent } from "@/lib/engines/events";
import { redactSecrets } from "@/lib/security/injection";

/**
 * The autonomous dataset pipeline: every finished run is appended to .bloom/datasets/trace_log.jsonl as one JSON
 * line. Successful runs with output are marked as fine-tuning sample candidates; the Neural Control Plane tails
 * the file. Best-effort and local only: on a read-only or serverless filesystem (Vercel) nothing is written.
 */

export const TRACE_LOG = join(process.cwd(), ".bloom", "datasets", "trace_log.jsonl");

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

const writable = () => !process.env.VERCEL && process.env.BLOOM_TRACE_LOG !== "off";
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Wraps a run's emit so the run is traced when it ends. Returns the emit to pass to the orchestrator. */
export function traceRun(meta: { kind: TraceRecord["kind"]; target: string; engines: string[]; command: string }, emit: (e: RunEvent) => void) {
  let start: Extract<RunEvent, { type: "run.start" }> | null = null;
  return (e: RunEvent) => {
    emit(e);
    if (e.type === "run.start" && !start) start = e;
    else if (e.type === "run.end" && writable()) {
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
      void appendTrace(record);
    }
  };
}

async function appendTrace(r: TraceRecord) {
  try {
    await mkdir(dirname(TRACE_LOG), { recursive: true });
    await appendFile(TRACE_LOG, `${JSON.stringify(r)}\n`, "utf8");
  } catch {
    // Read-only filesystem or no permission: the dataset pipeline is simply off here.
  }
}

/** Reads trace lines appended after byte `from` (capped), for the control plane's live tail. */
export async function readTraceTail(from: number, maxBytes = 256_000): Promise<{ size: number; next: number; lines: string[]; exists: boolean }> {
  let size = 0;
  try {
    size = (await stat(TRACE_LOG)).size;
  } catch {
    return { size: 0, next: 0, lines: [], exists: false };
  }
  // A truncated or rotated file starts over; a large backlog is read from its tail.
  let start = from > size || from < 0 ? 0 : from;
  if (size - start > maxBytes) start = size - maxBytes;
  if (start === size) return { size, next: size, lines: [], exists: true };
  const fh = await open(TRACE_LOG, "r");
  try {
    const buf = Buffer.alloc(size - start);
    await fh.read(buf, 0, buf.length, start);
    const text = buf.toString("utf8");
    // Only complete lines: a line still being written is picked up on the next poll.
    const end = text.lastIndexOf("\n");
    if (end < 0) return { size, next: start, lines: [], exists: true };
    const chunk = text.slice(0, end);
    const lines = chunk.split("\n").filter(Boolean);
    // When reading from the middle of the file, the first piece may be a partial line.
    if (start > 0 && start !== from) lines.shift();
    return { size, next: start + Buffer.byteLength(chunk, "utf8") + 1, lines, exists: true };
  } finally {
    await fh.close();
  }
}
