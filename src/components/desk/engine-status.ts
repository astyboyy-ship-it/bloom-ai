import type { EngineKey } from "@/components/bloom/command/engines";
import type { AgentState } from "./use-run";

export type EngineRunStatus = "idle" | "running" | "done" | "failed";

/** An engine's state in the current run: running wins over failed, failed over done. */
export function engineStatuses(agents: Record<string, AgentState>): Partial<Record<EngineKey, EngineRunStatus>> {
  const rank: Record<EngineRunStatus, number> = { idle: 0, done: 1, failed: 2, running: 3 };
  const out: Partial<Record<EngineKey, EngineRunStatus>> = {};
  for (const a of Object.values(agents)) {
    const cur = out[a.engine] ?? "idle";
    if (rank[a.status] > rank[cur]) out[a.engine] = a.status;
  }
  return out;
}

export const STATUS_DOT: Record<EngineRunStatus, string> = {
  idle: "bg-white/25",
  running: "bg-c-1 animate-pulse shadow-[0_0_10px_var(--c-glow)]",
  done: "bg-emerald-400",
  failed: "bg-red-500",
};
