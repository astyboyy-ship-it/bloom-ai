import "server-only";
import { ENGINE_ORDER, type EngineKey } from "@/components/bloom/command/engines";
import { verifyLicense } from "@/lib/license/keys";
import { TIER_ENGINES, TIER_INFO, type Tier } from "@/lib/license/tiers";
import { ACCESS_KEY_PREFIX, engineScope, verifyAccessKey } from "./codec";
import type { BloomLicensePayload, KeyRole } from "./types";

/**
 * One resolver for both key generations: the older BLOOM- tier keys and the BLOOMK- access keys. Run routes
 * enforce `engines` from here, so an access key's `unlockedEngines` is what the server actually allows.
 */
export type ResolvedLicense = {
  tier: Tier;
  engines: EngineKey[];
  access: BloomLicensePayload | null;
  label: string;
  /** Eval keys preview the desk and demo partner keys run the sandbox: neither may start a real run. */
  readOnly: boolean;
};

const ROLE_LABEL: Record<KeyRole, string> = { operator: "Operator Key (Tier 4)", agency: "Agency Key (Tier 3)", enterprise: "Enterprise Key (Tier 2)", eval: "Evaluation Key (Tier 1)", demo_partner: "Demo Partner Key (Tier 5)" };

/** The legacy tier an access key reports for older UI (pills, upgrade prompts): the smallest that covers its engines. */
export function legacyTierFor(p: BloomLicensePayload): Exclude<Tier, "evaluation"> {
  if (p.role === "operator") return "admin";
  const scope = engineScope(p.unlockedEngines);
  return (["tier1", "tier2", "tier3"] as const).find((t) => scope.every((k) => TIER_ENGINES[t].includes(k as EngineKey))) ?? "tier3";
}

export async function resolveLicense(key: string | null | undefined): Promise<ResolvedLicense> {
  if (key?.trim().startsWith(ACCESS_KEY_PREFIX)) {
    const v = await verifyAccessKey(key);
    if (v.ok) {
      const engines = engineScope(v.payload.unlockedEngines).filter((k): k is EngineKey => (ENGINE_ORDER as string[]).includes(k));
      const readOnly = v.payload.role === "eval" || v.payload.permissions.isDemoOnly;
      return { tier: legacyTierFor(v.payload), engines, access: v.payload, label: ROLE_LABEL[v.payload.role], readOnly };
    }
    return { tier: "evaluation", engines: TIER_ENGINES.evaluation, access: null, label: TIER_INFO.evaluation.label, readOnly: false };
  }
  const legacy = verifyLicense(key);
  const tier: Tier = legacy.ok ? legacy.license.tier : "evaluation";
  return { tier, engines: TIER_ENGINES[tier], access: null, label: TIER_INFO[tier].label, readOnly: false };
}

/** The 403 message for a run a read-only key may not start, or null if the run may go ahead. */
export function readOnlyRefusal(l: ResolvedLicense): string | null {
  if (!l.readOnly) return null;
  return l.access?.permissions.isDemoOnly
    ? `${l.label} runs the Demo Engine sandbox only. Provision a production key to run live engines.`
    : `${l.label} is a read-only preview. Runs are disabled; upgrade the key to run engines.`;
}
