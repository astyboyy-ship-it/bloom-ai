import { z } from "zod";
import { ENGINE_ORDER, type EngineKey } from "@/components/bloom/command/engines";

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
});

export type Calibration = z.infer<typeof CalibrationSchema>;
export type CalibrationInput = z.input<typeof CalibrationSchema>;

export const CalibrationsSchema = z.partialRecord(z.enum(ENGINE_ORDER as [EngineKey, ...EngineKey[]]), CalibrationSchema).default({});

export const DEFAULT_CALIBRATION: Calibration = CalibrationSchema.parse({});

/** Whether a calibration differs from the defaults, so the desk can mark tuned engines. */
export const isTuned = (c?: CalibrationInput) => Boolean(c && JSON.stringify(readCalibration(c)) !== JSON.stringify(DEFAULT_CALIBRATION));

/** A stored calibration as the runtime will read it; anything unreadable falls back to the defaults. */
export function readCalibration(c?: CalibrationInput): Calibration {
  const parsed = CalibrationSchema.safeParse(c ?? {});
  return parsed.success ? parsed.data : DEFAULT_CALIBRATION;
}
