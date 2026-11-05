import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, cookieValue, verifyAccessKey } from "@/lib/licensing/codec";
import { readTraceTail, TRACE_LOG, type TraceRecord } from "@/lib/datasets/trace-log";
import { addToSummary, emptySummary, type DatasetsResponse, type TraceRow, type TraceSummary } from "@/lib/datasets/summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parse(line: string): TraceRecord | null {
  try {
    const r = JSON.parse(line) as TraceRecord;
    return typeof r.runId === "string" ? r : null;
  } catch {
    return null;
  }
}

/** One pass over the whole file, line by line, for the opening summary. */
async function summarize(): Promise<TraceSummary> {
  const s = emptySummary();
  const rl = createInterface({ input: createReadStream(TRACE_LOG, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    const r = line && parse(line);
    if (r) addToSummary(s, r);
  }
  return s;
}

const row = (r: TraceRecord): TraceRow => ({
  ts: r.ts,
  runId: r.runId,
  kind: r.kind,
  target: r.target,
  engines: r.engines,
  mode: r.mode,
  ok: r.ok,
  ms: r.ms,
  tokens: r.tokens,
  sample: r.sample,
  preview: (r.prompt ?? "").slice(0, 140),
});

/** Tails .bloom/datasets/trace_log.jsonl. `?from=<byte offset>`; from=0 also returns the whole-file summary. */
export async function GET(req: Request) {
  // The middleware already guards this route; it's checked again here so the data never depends on one layer.
  const v = await verifyAccessKey(cookieValue(req.headers.get("cookie"), ACCESS_COOKIE));
  if (!v.ok || !v.payload.permissions.accessNeuralControlPlane) return NextResponse.json({ error: { message: "The Neural Control Plane needs an Operator access key." } }, { status: 403 });

  const from = Math.max(0, Number(new URL(req.url).searchParams.get("from")) || 0);
  const file = ".bloom/datasets/trace_log.jsonl";
  const available = !process.env.VERCEL;
  if (!available) return NextResponse.json({ available, exists: false, size: 0, next: 0, rows: [], summary: null, file } satisfies DatasetsResponse, { headers: { "Cache-Control": "no-store" } });

  try {
    const tail = await readTraceTail(from);
    const rows = tail.lines.map(parse).filter((r): r is TraceRecord => r !== null).slice(-200).map(row);
    // A fresh tail, or a file that shrank under us (rotated or truncated), gets the whole-file summary again.
    const reset = from === 0 || from > tail.size;
    const summary = reset ? (tail.exists ? await summarize() : emptySummary()) : null;
    return NextResponse.json({ available, exists: tail.exists, size: tail.size, next: tail.next, rows, summary, file } satisfies DatasetsResponse, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ available: false, exists: false, size: 0, next: from, rows: [], summary: null, file } satisfies DatasetsResponse, { headers: { "Cache-Control": "no-store" } });
  }
}
