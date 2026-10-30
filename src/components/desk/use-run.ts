"use client";

import { useCallback, useReducer, useRef } from "react";
import type { EngineKey } from "@/components/bloom/command/engines";
import type { Lang } from "@/components/bloom/i18n";
import type { CalibrationInput } from "@/lib/engines/calibration";
import type { Metric } from "@/lib/engines/brief";
import type { RunEvent, RunMode, RunPhase, Usage } from "@/lib/engines/events";
import { scanCommand } from "@/lib/security/injection";
import { audit } from "./settings";

/**
 * Drives one command run against /api/command/[engine]: POSTs the command, reads the SSE body, and folds
 * RunEvents into a log the desk renders. EventSource can't POST, so the stream is parsed by hand.
 */

export type AgentState = { id: string; engine: EngineKey; parentId: string | null; depth: number; status: "running" | "done" | "failed" };

export type LogEntry =
  | { id: string; kind: "agent"; at: number; agentId: string; phase: "start" | "end" | "failed"; ms?: number }
  | { id: string; kind: "reasoning" | "text"; at: number; agentId: string; text: string }
  | { id: string; kind: "tool"; at: number; agentId: string; tool: string; input: unknown; output?: unknown; ok?: boolean; ms?: number }
  | { id: string; kind: "delegate"; at: number; agentId: string; to: EngineKey }
  | { id: string; kind: "notice" | "error"; at: number; agentId: string | null; text: string };

export type RunStatus = "idle" | "running" | "done" | "failed";

type RunTarget = { kind: "engine"; engine: EngineKey } | { kind: "pipeline"; id: string; label: string; engines: EngineKey[] };
type RunExtras = { headers?: Record<string, string>; calibrations?: Partial<Record<EngineKey, CalibrationInput>> };

export type PhaseState = { status: "pending" | "active" | "done" | "failed"; detail: string; startedAt: number | null; ms: number | null };
export const PHASES: RunPhase[] = ["parse", "route", "compose"];
const freshPhases = (): Record<RunPhase, PhaseState> => ({
  parse: { status: "pending", detail: "", startedAt: null, ms: null },
  route: { status: "pending", detail: "", startedAt: null, ms: null },
  compose: { status: "pending", detail: "", startedAt: null, ms: null },
});

export type RunState = {
  status: RunStatus;
  runId: string | null;
  command: string;
  phases: Record<RunPhase, PhaseState>;
  brief: { markdown: string; metrics: Metric[]; approvals: number[] } | null;
  engine: EngineKey | null;
  mode: RunMode | null;
  model: string | null;
  startedAt: number;
  firstEventMs: number | null;
  agents: Record<string, AgentState>;
  log: LogEntry[];
  output: unknown;
  usage: Usage;
  /** Tokens so far, summed from top-level agents as they finish (children are inside their parent's figure). */
  liveUsage: Usage;
  ms: number | null;
  toolCalls: number;
};

const initial: RunState = { status: "idle", runId: null, command: "", phases: freshPhases(), brief: null, engine: null, mode: null, model: null, startedAt: 0, firstEventMs: null, agents: {}, log: [], output: null, usage: { input: 0, output: 0 }, liveUsage: { input: 0, output: 0 }, ms: null, toolCalls: 0 };

type Action = { type: "begin"; engine: EngineKey; command: string; at: number } | { type: "event"; e: RunEvent; at: number } | { type: "fail"; message: string; at: number };

function reduce(s: RunState, a: Action): RunState {
  if (a.type === "begin") return { ...initial, phases: freshPhases(), status: "running", engine: a.engine, command: a.command, startedAt: a.at };
  if (a.type === "fail") return { ...s, status: "failed", phases: failActive(s.phases, a.at), log: [...s.log, { id: `err-${s.log.length}`, kind: "error", at: a.at - s.startedAt, agentId: null, text: a.message }] };

  const e = a.e;
  const at = a.at - s.startedAt;
  const next: RunState = s.firstEventMs === null ? { ...s, firstEventMs: at } : s;
  switch (e.type) {
    case "run.start":
      return { ...next, runId: e.runId, mode: e.mode, model: e.model };
    case "phase": {
      // Starting a phase closes the one before it.
      const phases = { ...next.phases };
      for (const p of PHASES) {
        if (p === e.phase) break;
        const ph = phases[p];
        if (ph.status === "active") phases[p] = { ...ph, status: "done", ms: a.at - (ph.startedAt ?? a.at) };
      }
      phases[e.phase] = { status: "active", detail: e.detail, startedAt: a.at, ms: null };
      return { ...next, phases };
    }
    case "brief":
      return { ...next, brief: { markdown: e.markdown, metrics: e.metrics, approvals: e.approvals } };
    case "agent.start":
      return {
        ...next,
        agents: { ...next.agents, [e.agentId]: { id: e.agentId, engine: e.engine, parentId: e.parentId, depth: e.depth, status: "running" } },
        log: [...next.log, { id: `${e.agentId}-start`, kind: "agent", at, agentId: e.agentId, phase: "start" }],
      };
    case "reasoning":
    case "text": {
      // Streamed deltas from the same agent fold into one growing entry.
      const last = next.log.at(-1);
      if (last && last.kind === e.type && last.agentId === e.agentId) return { ...next, log: [...next.log.slice(0, -1), { ...last, text: last.text + e.text }] };
      return { ...next, log: [...next.log, { id: `${e.agentId}-${e.type}-${next.log.length}`, kind: e.type, at, agentId: e.agentId, text: e.text }] };
    }
    case "tool.call":
      return { ...next, toolCalls: next.toolCalls + 1, log: [...next.log, { id: e.callId, kind: "tool", at, agentId: e.agentId, tool: e.tool, input: e.input }] };
    case "tool.result":
      return { ...next, log: next.log.map((l) => (l.kind === "tool" && l.id === e.callId ? { ...l, output: e.output, ok: e.ok, ms: e.ms } : l)) };
    case "delegate":
      return { ...next, log: [...next.log, { id: `${e.callId}-delegate`, kind: "delegate", at, agentId: e.agentId, to: e.to }] };
    case "agent.end": {
      const agent = next.agents[e.agentId];
      const top = agent?.depth === 0;
      return {
        ...next,
        liveUsage: top ? { input: next.liveUsage.input + e.usage.input, output: next.liveUsage.output + e.usage.output } : next.liveUsage,
        agents: agent ? { ...next.agents, [e.agentId]: { ...agent, status: e.ok ? "done" : "failed" } } : next.agents,
        log: [...next.log, { id: `${e.agentId}-end`, kind: "agent", at, agentId: e.agentId, phase: e.ok ? "end" : "failed", ms: e.ms }],
      };
    }
    case "notice":
      return { ...next, log: [...next.log, { id: `notice-${next.log.length}`, kind: "notice", at, agentId: e.agentId, text: e.text }] };
    case "error":
      return { ...next, log: [...next.log, { id: `err-${next.log.length}`, kind: "error", at, agentId: e.agentId, text: e.message }] };
    case "run.end": {
      const phases = e.ok
        ? (Object.fromEntries(PHASES.map((p) => [p, next.phases[p].status === "active" ? { ...next.phases[p], status: "done", ms: a.at - (next.phases[p].startedAt ?? a.at) } : next.phases[p]])) as Record<RunPhase, PhaseState>)
        : failActive(next.phases, a.at);
      return { ...next, phases, status: e.ok ? "done" : "failed", output: e.output, usage: e.usage, ms: e.ms };
    }
  }
}

function failActive(phases: Record<RunPhase, PhaseState>, at: number): Record<RunPhase, PhaseState> {
  return Object.fromEntries(PHASES.map((p) => [p, phases[p].status === "active" ? { ...phases[p], status: "failed", ms: at - (phases[p].startedAt ?? at) } : phases[p]])) as Record<RunPhase, PhaseState>;
}

export function useRun(networkError: string, aborted: string) {
  const [state, dispatch] = useReducer(reduce, initial);
  const abortRef = useRef<AbortController | null>(null);

  /** Streams one run: a single engine (/api/command/:engine) or a stack of engines (/api/pipeline). */
  const start = useCallback(
    async (target: RunTarget, command: string, lang: Lang, extras: RunExtras = {}) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const engine = target.kind === "engine" ? target.engine : target.engines[0];
      const where = target.kind === "engine" ? target.engine : target.label;
      // Screened here for the Threat Matrix; the server notes the same finding in the run's own log.
      for (const f of scanCommand(command)) audit("security", `${f.rule} (${f.severity}) in a ${where} command: "${f.match}". Contained: operating rules kept precedence.`);
      dispatch({ type: "begin", engine, command, at: Date.now() });
      let ended = false;
      try {
        const res = await fetch(target.kind === "engine" ? `/api/command/${engine}` : "/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...extras.headers },
          body: JSON.stringify(
            target.kind === "engine"
              ? { command, lang, calibrations: extras.calibrations ?? {} }
              : { id: target.id, label: target.label, engines: target.engines, command, lang, calibrations: extras.calibrations ?? {} },
          ),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          if (res.status === 403) audit("security", `Gateway refused a ${where} run: ${body?.error?.message ?? "not licensed"}`);
          if (res.status === 429) audit("security", `Rate limit tripped on a ${where} run; the gateway throttled it.`);
          dispatch({ type: "fail", message: body?.error?.message ?? `HTTP ${res.status}`, at: Date.now() });
          return;
        }
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const data = frame.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
            if (!data) continue; // keep-alive comment
            try {
              const e = JSON.parse(data) as RunEvent;
              if (e.type === "run.end") ended = true;
              dispatch({ type: "event", e, at: Date.now() });
            } catch {
              // A malformed frame is skipped; the run keeps streaming.
            }
          }
        }
        if (!ended) dispatch({ type: "fail", message: networkError, at: Date.now() });
      } catch (err) {
        if (ctrl.signal.aborted) dispatch({ type: "fail", message: aborted, at: Date.now() });
        else dispatch({ type: "fail", message: err instanceof Error ? err.message : networkError, at: Date.now() });
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
      }
    },
    [networkError, aborted],
  );

  const run = useCallback((engine: EngineKey, command: string, lang: Lang, extras: RunExtras = {}) => start({ kind: "engine", engine }, command, lang, extras), [start]);
  const runPipeline = useCallback((spec: { id: string; label: string; engines: EngineKey[] }, command: string, lang: Lang, extras: RunExtras = {}) => start({ kind: "pipeline", ...spec }, command, lang, extras), [start]);
  const abort = useCallback(() => abortRef.current?.abort(), []);

  return { state, run, runPipeline, abort };
}
