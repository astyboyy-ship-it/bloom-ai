import { z } from "zod";
import { ENGINE_ORDER, type EngineKey } from "@/components/bloom/command/engines";
import { DEFAULT_MODEL, MODEL_IDS } from "./models";

/**
 * Per-engine tuning from the desk's Engine Calibration bay, sent with each run. Client-safe: the desk uses the
 * same schema to build and store calibrations. Every field is optional so an empty object means "defaults".
 */
export const CalibrationSchema = z.object({
  /** Replaces or extends the engine's own instructions. The runtime's operating rules always stay in force. */
  instructions: z.string().trim().max(8000).optional(),
  instructionsMode: z.enum(["append", "replace"]).default("append"),
  /** Situational directives for this period, e.g. "Q4 freeze: no discounts above 10%". */
  overrides: z.string().trim().max(2000).optional(),
  disabledTools: z.array(z.string().max(60)).max(20).default([]),
  allowDelegation: z.boolean().default(true),
  /** Output constraints, layered on the engine's Zod output schema. */
  maxActions: z.number().int().min(1).max(8).default(8),
  summaryMax: z.number().int().min(120).max(800).default(800),

  /** Model & runtime. */
  model: z.enum(MODEL_IDS).default(DEFAULT_MODEL),
  /** 0-1; applies only to models that accept it (see models.ts). */
  temperature: z.number().min(0).max(1).default(0.4),
  /** Per-engine wall-clock cap for one run, in seconds. */
  latencyCapS: z.number().int().min(10).max(240).default(120),
  /** Output tokens one engine may spend on a run, across all its turns. */
  tokenBudget: z.number().int().min(2000).max(64000).default(24000),
  /** Actions that move at least this many dollars, or that a person must do, wait for approval on the desk. */
  approvalThresholdUsd: z.number().int().min(0).max(1_000_000).default(25_000),

  /** Memory retention: how many of this engine's recent results it is shown on its next run. */
  memoryRuns: z.number().int().min(0).max(10).default(3),
  /** The recent results themselves (summaries), sent by the desk. Never more than memoryRuns are used. */
  memory: z.array(z.string().max(800)).max(10).default([]),
});

export type Calibration = z.infer<typeof CalibrationSchema>;
export type CalibrationInput = z.input<typeof CalibrationSchema>;

export const CalibrationsSchema = z.partialRecord(z.enum(ENGINE_ORDER as [EngineKey, ...EngineKey[]]), CalibrationSchema).default({});

export const DEFAULT_CALIBRATION: Calibration = CalibrationSchema.parse({});

/** Whether a calibration differs from the defaults, so the desk can mark tuned engines. */
export const isTuned = (c?: CalibrationInput) => {
  if (!c) return false;
  // Memory fills up on its own as the engine runs; it isn't tuning.
  const { memory: _m, ...rest } = readCalibration(c);
  const { memory: _d, ...defaults } = DEFAULT_CALIBRATION;
  void _m;
  void _d;
  return JSON.stringify(rest) !== JSON.stringify(defaults);
};

/** A stored calibration as the runtime will read it; anything unreadable falls back to the defaults. */
export function readCalibration(c?: CalibrationInput): Calibration {
  const parsed = CalibrationSchema.safeParse(c ?? {});
  return parsed.success ? parsed.data : DEFAULT_CALIBRATION;
}
