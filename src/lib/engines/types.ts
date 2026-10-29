import { z } from "zod";
import type { EngineKey } from "@/components/bloom/command/engines";

/**
 * The shape every Bloom engine agent shares: system instructions, a Zod contract for what it accepts and
 * what it returns, the tools it may call, and which engines it may delegate to. The orchestrator turns
 * this into a live Claude/OpenRouter tool loop, or runs `simulate` when no model is configured.
 */

export type ToolOutcome = { ok: true; output: unknown } | { ok: false; error: string };

export type ToolDef = {
  name: string;
  description: string;
  schema: z.ZodType;
  /** Validates the model's raw input against `schema` before running, so a malformed call never executes. */
  execute: (raw: unknown) => Promise<ToolOutcome>;
};

export function tool<S extends z.ZodType>(def: {
  name: string;
  description: string;
  input: S;
  run: (input: z.infer<S>) => unknown;
}): ToolDef {
  return {
    name: def.name,
    description: def.description,
    schema: def.input,
    async execute(raw) {
      const parsed = def.input.safeParse(raw);
      if (!parsed.success) return { ok: false, error: `Invalid input: ${z.prettifyError(parsed.error)}` };
      try {
        return { ok: true, output: await def.run(parsed.data) };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

/** Every engine is commanded the same way: a plain-language command plus engine-specific parameters. */
export function engineInput<P extends z.ZodRawShape>(params: P) {
  return z.object({
    command: z.string().trim().min(3).max(4000).describe("The operator's command in plain language."),
    // Every field is optional, so {} is always a valid value; the cast only satisfies the generic.
    params: z.object(params).partial().default({} as never).describe("Optional structured parameters for this engine."),
  });
}

export const ActionSchema = z.object({
  title: z.string().max(120),
  owner: z.string().max(40).describe('The engine key that executes it (e.g. "apex"), or "human" when a person must act.'),
  priority: z.enum(["p0", "p1", "p2"]),
  detail: z.string().max(400),
});

/** Every engine reports a summary, its confidence and an action list, plus its own domain fields. */
export function engineOutput<S extends z.ZodRawShape>(shape: S) {
  return z.object({
    summary: z.string().max(800).describe("Two to four sentences an executive can act on."),
    confidence: z.number().min(0).max(1).describe("0-1. Lower it when inputs were assumed or data is simulated."),
    actions: z.array(ActionSchema).max(8),
    ...shape,
  });
}

export type Effort = "low" | "medium" | "high";

export type SimulationKit = {
  /** Runs one of this engine's tools exactly as the live loop would, emitting the same events. */
  call: (tool: string, input: unknown) => Promise<unknown>;
  /** Hands a command to another engine and returns its validated output. */
  delegate: (engine: EngineKey, command: string, params?: Record<string, unknown>) => Promise<unknown>;
  /** Narrates a planning step into the execution log. */
  think: (text: string) => Promise<void>;
};

// Outputs are objects so calibration can tighten their fields (see applyCalibration in the orchestrator).
export type EngineAgent<I extends z.ZodType = z.ZodType, O extends z.ZodObject = z.ZodObject> = {
  key: EngineKey;
  /** File-system name, e.g. "01-sovereign". */
  codename: string;
  /** One line: what this engine owns. */
  mandate: string;
  instructions: string;
  input: I;
  output: O;
  tools: ToolDef[];
  /** Engines this one may hand work to. The orchestrator adds a `delegate` tool when non-empty. */
  delegates: EngineKey[];
  /** Deterministic run used when no model provider is configured. Must return output that passes `output`. */
  simulate: (input: NoInfer<z.infer<I>>, kit: SimulationKit) => Promise<NoInfer<z.infer<O>>>;
};

export const defineEngine = <I extends z.ZodType, O extends z.ZodObject>(e: EngineAgent<I, O>): EngineAgent => e as unknown as EngineAgent;
