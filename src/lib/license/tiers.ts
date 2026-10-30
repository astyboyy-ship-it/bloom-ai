import { ENGINE_ORDER, type EngineKey } from "@/components/bloom/command/engines";

/**
 * The Client License tiers: which engines each one unlocks. Shared by the server (which enforces it on every
 * run) and the desk (which gates the UI). "evaluation" is what a workspace gets with no license key.
 */
export type Tier = "evaluation" | "tier1" | "tier2" | "tier3" | "admin";

export const TIERS: Tier[] = ["evaluation", "tier1", "tier2", "tier3", "admin"];

export const TIER_ENGINES: Record<Tier, EngineKey[]> = {
  evaluation: ["coreops", "intentpulse"],
  tier1: ["coreops", "intentpulse"],
  tier2: ["sovereign", "apex", "coreops"],
  tier3: ENGINE_ORDER,
  admin: ENGINE_ORDER,
};

export const TIER_INFO: Record<Tier, { label: string; short: string; blurb: string }> = {
  evaluation: { label: "Evaluation", short: "EVAL", blurb: "No license key. CoreOps and IntentPulse in evaluation mode." },
  tier1: { label: "Tier 1 · Signal & Ops", short: "T1", blurb: "CoreOps and IntentPulse: market radar plus silent back-office automation." },
  tier2: { label: "Tier 2 · Command & Close", short: "T2", blurb: "Sovereign, Apex and CoreOps: governance, deal closing and operations." },
  tier3: { label: "Tier 3 · Enterprise", short: "T3", blurb: "All eight engines unlocked, with full cross-engine delegation." },
  admin: { label: "Master Admin Override", short: "ADMIN", blurb: "Every engine and every control. For Bloom AI staff and development." },
};

/** The lowest paid tier that unlocks an engine: what its Upgrade CTA offers. */
export function upgradeTierFor(engine: EngineKey): Tier {
  return (["tier1", "tier2", "tier3"] as Tier[]).find((t) => TIER_ENGINES[t].includes(engine)) ?? "tier3";
}

export const engineAllowed = (tier: Tier, engine: EngineKey) => TIER_ENGINES[tier].includes(engine);
