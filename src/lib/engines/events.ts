import type { EngineKey } from "@/components/bloom/command/engines";

/**
 * The wire contract between /api/command/[engine] and the Operating Desk. Each event is one SSE frame
 * (`event: <type>` + `data: <json>`). Client-safe: no server imports.
 */

export type RunMode = "live" | "simulation";
export type Usage = { input: number; output: number };

export type RunEvent =
  | { type: "run.start"; runId: string; engine: EngineKey; mode: RunMode; provider: string; model: string; at: number }
  | { type: "agent.start"; agentId: string; engine: EngineKey; parentId: string | null; depth: number; command: string }
  /** Summarized reasoning (live mode) or the engine's stated plan (simulation). */
  | { type: "reasoning"; agentId: string; text: string }
  | { type: "text"; agentId: string; text: string }
  | { type: "tool.call"; agentId: string; callId: string; tool: string; input: unknown }
  | { type: "tool.result"; agentId: string; callId: string; tool: string; ok: boolean; output: unknown; ms: number }
  | { type: "delegate"; agentId: string; callId: string; to: EngineKey }
  | { type: "agent.end"; agentId: string; engine: EngineKey; ok: boolean; output: unknown; usage: Usage; ms: number }
  | { type: "run.end"; runId: string; ok: boolean; output: unknown; usage: Usage; ms: number; agents: number; tools: number }
  | { type: "error"; agentId: string | null; message: string };

export type RunEventType = RunEvent["type"];

/** What GET /api/command reports, so the desk knows the runtime before it runs anything. */
export type CommandManifest = {
  mode: RunMode;
  provider: string;
  model: string;
  engines: { key: EngineKey; codename: string; mandate: string; tools: string[]; delegates: EngineKey[] }[];
};
