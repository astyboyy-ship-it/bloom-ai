"use client";

import { useCallback, useReducer, useRef } from "react";
import type { EngineKey } from "@/components/bloom/command/engines";
import type { Lang } from "@/components/bloom/i18n";
import type { RunEvent, RunMode, Usage } from "@/lib/engines/events";

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
  | { id: string; kind: "error"; at: number; agentId: string | null; text: string };

export type RunStatus = "idle" | "running" | "done" | "failed";

export type RunState = {
  status: RunStatus;
  engine: EngineKey | null;
  mode: RunMode | null;
  model: string | null;
  startedAt: number;
  firstEventMs: number | null;
  agents: Record<string, AgentState>;
  log: LogEntry[];
  output: unknown;
  usage: Usage;
  ms: number | null;
  toolCalls: number;
};

const initial: RunState = { status: "idle", engine: null, mode: null, model: null, startedAt: 0, firstEventMs: null, agents: {}, log: [], output: null, usage: { input: 0, output: 0 }, ms: null, toolCalls: 0 };

type Action = { type: "begin"; engine: EngineKey; at: number } | { type: "event"; e: RunEvent; at: number } | { type: "fail"; message: string; at: number };

function reduce(s: RunState, a: Action): RunState {
  if (a.type === "begin") return { ...initial, status: "running", engine: a.engine, startedAt: a.at };
  if (a.type === "fail") return { ...s, status: "failed", log: [...s.log, { id: `err-${s.log.length}`, kind: "error", at: a.at - s.startedAt, agentId: null, text: a.message }] };

  const e = a.e;
  const at = a.at - s.startedAt;
  const next: RunState = s.firstEventMs === null ? { ...s, firstEventMs: at } : s;
  switch (e.type) {
    case "run.start":
      return { ...next, mode: e.mode, model: e.model };
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
      return {
        ...next,
        agents: agent ? { ...next.agents, [e.agentId]: { ...agent, status: e.ok ? "done" : "failed" } } : next.agents,
        log: [...next.log, { id: `${e.agentId}-end`, kind: "agent", at, agentId: e.agentId, phase: e.ok ? "end" : "failed", ms: e.ms }],
      };
    }
    case "error":
      return { ...next, log: [...next.log, { id: `err-${next.log.length}`, kind: "error", at, agentId: e.agentId, text: e.message }] };
    case "run.end":
      return { ...next, status: e.ok ? "done" : "failed", output: e.output, usage: e.usage, ms: e.ms };
  }
}

export function useRun(networkError: string, aborted: string) {
  const [state, dispatch] = useReducer(reduce, initial);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (engine: EngineKey, command: string, lang: Lang) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      dispatch({ type: "begin", engine, at: Date.now() });
      let ended = false;
      try {
        const res = await fetch(`/api/command/${engine}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, lang }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
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

  const abort = useCallback(() => abortRef.current?.abort(), []);

  return { state, run, abort };
}
