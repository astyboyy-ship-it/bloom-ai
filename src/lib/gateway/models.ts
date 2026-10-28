import "server-only";
import type { ModelTier } from "@prisma/client";
import { env } from "@/lib/env";

/**
 * Tier -> ordered OpenRouter model slugs (primary first, then fallbacks).
 * The architect model only picks a tier; concrete slugs are resolved here so
 * they stay under operator control. Verify slugs against
 * https://openrouter.ai/models and override per tier with MODEL_TIER_* env vars.
 */
const DEFAULT_TIERS: Record<ModelTier, string[]> = {
  FAST: ["anthropic/claude-haiku-5.5", "anthropic/claude-haiku-4.5"],
  BALANCED: ["anthropic/claude-sonnet-5.5", "anthropic/claude-sonnet-4.6"],
  DEEP: ["anthropic/claude-opus-5.5", "anthropic/claude-opus-4.8"],
};

function fromEnv(value: string | undefined): string[] | undefined {
  const list = value
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list && list.length > 0 ? list : undefined;
}

export function modelsForTier(tier: ModelTier): { model: string; fallbacks: string[] } {
  const e = env();
  const overrides: Record<ModelTier, string | undefined> = {
    FAST: e.MODEL_TIER_FAST,
    BALANCED: e.MODEL_TIER_BALANCED,
    DEEP: e.MODEL_TIER_DEEP,
  };
  const [model, ...fallbacks] = fromEnv(overrides[tier]) ?? DEFAULT_TIERS[tier];
  return { model, fallbacks };
}

export const TIER_LABELS: Record<ModelTier, string> = {
  FAST: "Fast / cheap parsing",
  BALANCED: "Balanced",
  DEEP: "Deep reasoning",
};
