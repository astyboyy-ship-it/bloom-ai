/**
 * Client-safe shapes for the dataset pipeline monitor (no fs imports), shared by the control-plane API and the
 * Neural Control Plane widget.
 */
export type TraceTokens = { input: number; output: number };

export type TraceRow = {
  ts: string;
  runId: string;
  kind: "engine" | "pipeline";
  target: string;
  engines: string[];
  mode: string;
  ok: boolean;
  ms: number;
  tokens: TraceTokens;
  sample: boolean;
  /** The first 140 characters of the (redacted) prompt; full prompts and completions never leave the server. */
  preview: string;
};

export type TraceSummary = { traces: number; samples: number; failed: number; ms: number; tokens: number; byEngine: Record<string, number> };

export type DatasetsResponse = { available: boolean; exists: boolean; size: number; next: number; rows: TraceRow[]; summary: TraceSummary | null; file: string };

export const emptySummary = (): TraceSummary => ({ traces: 0, samples: 0, failed: 0, ms: 0, tokens: 0, byEngine: {} });

/** Folds one trace into a summary, in place. */
export function addToSummary(s: TraceSummary, r: { ok: boolean; ms: number; tokens?: TraceTokens; sample: boolean; engines?: string[] }) {
  s.traces++;
  if (!r.ok) s.failed++;
  s.ms += r.ms || 0;
  s.tokens += (r.tokens?.input ?? 0) + (r.tokens?.output ?? 0);
  if (r.sample) {
    s.samples++;
    for (const e of r.engines ?? []) s.byEngine[e] = (s.byEngine[e] ?? 0) + 1;
  }
}
