import type { EngineKey } from "@/components/bloom/command/engines";
import { readCalibration, type Calibration, type CalibrationInput } from "@/lib/engines/calibration";
import { DEFAULT_MODEL, MODEL_IDS, type ModelId } from "@/lib/engines/models";
import type { ArchitectureRules, RunRecord } from "@/components/desk/settings";

/** What a product's governance starts at: a few runs an hour, a stack-wide budget, Claude with a Sonnet fallback. */
export const DEFAULT_RULES: ArchitectureRules = {
  runsPerHour: 12,
  budgetTokens: 60000,
  model: DEFAULT_MODEL,
  fallbackModel: "claude-sonnet-5-5",
  approvalThresholdUsd: 25000,
  memoryRuns: 3,
  requireApprovalAlways: false,
};

export const rulesFor = (all: Record<string, ArchitectureRules>, id: string): ArchitectureRules => ({ ...DEFAULT_RULES, ...all[id] });

const asModel = (m: string): ModelId => ((MODEL_IDS as string[]).includes(m) ? (m as ModelId) : DEFAULT_MODEL);

/**
 * Turns a product's governance into the per-engine calibrations its run sends: one model and fallback for the
 * stack, the token budget split across its engines, one approval threshold (zero when every action needs
 * approval), and the memory policy. Each engine's other calibration (rules, tools, prompts) carries through.
 */
export function rulesToCalibrations(rules: ArchitectureRules, engines: EngineKey[], existing: Partial<Record<EngineKey, CalibrationInput>>): Partial<Record<EngineKey, Calibration>> {
  const perEngine = Math.max(2000, Math.floor(rules.budgetTokens / engines.length));
  return Object.fromEntries(
    engines.map((k) => [
      k,
      {
        ...readCalibration(existing[k]),
        model: asModel(rules.model),
        fallbackModel: asModel(rules.fallbackModel),
        tokenBudget: Math.min(64000, perEngine),
        approvalThresholdUsd: rules.requireApprovalAlways ? 0 : rules.approvalThresholdUsd,
        memoryRuns: rules.memoryRuns,
      },
    ]),
  ) as Partial<Record<EngineKey, Calibration>>;
}

/** Runs of this product in the last hour, against its rate limit. */
export function rateWindow(runs: RunRecord[], target: string, rules: ArchitectureRules) {
  const since = Date.now() - 3_600_000;
  const used = runs.filter((r) => r.target === target && r.at >= since).length;
  return { used, left: Math.max(0, rules.runsPerHour - used), blocked: used >= rules.runsPerHour };
}
