import { NextResponse } from "next/server";
import { ACCESS_COOKIE, cookieValue, verifyAccessKey } from "@/lib/licensing/codec";
import { traceStore, type TraceRecord } from "@/lib/datasets/trace-log";
import type { DatasetsResponse, TraceRow } from "@/lib/datasets/summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Tails the dataset trace store (the local JSONL file, Vercel KV, or the in-memory fallback). `?from=<cursor>`;
 * the first poll (from=0) and any poll after a reset also return the whole-store summary.
 */
export async function GET(req: Request) {
  // The middleware already guards this route; it's checked again here so the data never depends on one layer.
  const v = await verifyAccessKey(cookieValue(req.headers.get("cookie"), ACCESS_COOKIE));
  if (!v.ok || !v.payload.permissions.accessNeuralControlPlane) return NextResponse.json({ error: { message: "The Neural Control Plane needs an Operator access key." } }, { status: 403 });

  const from = Math.max(0, Number(new URL(req.url).searchParams.get("from")) || 0);
  const store = traceStore();
  try {
    const t = await store.read(from);
    const summary = from === 0 || t.reset ? await store.summarize() : null;
    const body: DatasetsResponse = { available: true, exists: t.exists, size: t.size, next: t.next, rows: t.records.map(row), summary, file: store.label, store: store.kind };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch {
    // Unreadable store (permissions, KV outage): report it instead of failing the monitor.
    const body: DatasetsResponse = { available: false, exists: false, size: 0, next: from, rows: [], summary: null, file: store.label, store: store.kind };
    return NextResponse.json(body, { headers: NO_STORE });
  }
}
