import "server-only";
import { createHash } from "node:crypto";
import type { RunEvent } from "@/lib/engines/events";
import type { ResolvedLicense } from "@/lib/licensing/server";
import type { OwnKeys } from "@/lib/orchestrator";
import { checkSpend } from "./spend";
import { clientIp } from "./rate-limit";

/**
 * Who may spend the server's model key, decided once per run request:
 *  - the operator's own provider key  → live on their key (costs the server nothing; not metered)
 *  - a verified license key under its daily spend caps → live on the server's key (metered)
 *  - anything else (no key, invalid key, caps reached) → deterministic simulation, with a notice saying why
 * Read-only keys (eval, demo partner) never get this far: the routes refuse them first.
 */
export type LiveDecision = {
  serverKey: boolean;
  /** Metering and rate-limit identity: the access key id, a hash of a tier key, or the caller's IP. */
  identity: string;
  /** Rate-limit tier for this request. */
  tier: "own" | "licensed" | "anonymous";
  /** Shown in the run log when the run is simulated for a policy reason. */
  notice: string | null;
};

const serverKeyConfigured = () => Boolean(process.env.LLM_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim()) && process.env.COMMAND_PROVIDER?.trim() !== "simulation";

export async function decideLive(req: Request, license: ResolvedLicense, own: OwnKeys, rawKey: string | null): Promise<LiveDecision> {
  if (own.anthropic || own.openrouter) return { serverKey: false, identity: `ip:${clientIp(req)}`, tier: "own", notice: null };

  const verified = license.access !== null || license.tier !== "evaluation";
  if (!verified) {
    return {
      serverKey: false,
      identity: `ip:${clientIp(req)}`,
      tier: "anonymous",
      notice: serverKeyConfigured() ? "No verified license key: this run is a deterministic simulation. Activate a license key to run engines live." : null,
    };
  }

  const identity = license.access ? `key:${license.access.keyId}` : `tier:${createHash("sha256").update(rawKey ?? "").digest("hex").slice(0, 16)}`;
  if (!serverKeyConfigured()) return { serverKey: false, identity, tier: "licensed", notice: null };

  const spend = await checkSpend(identity);
  if (!spend.ok) {
    const which = spend.reason === "key_cap" ? `this key's daily live budget ($${spend.capsUsd.key})` : `the deployment's daily live budget ($${spend.capsUsd.total})`;
    return { serverKey: false, identity, tier: "licensed", notice: `Reached ${which}: this run is a deterministic simulation. Live runs resume at 00:00 UTC.` };
  }
  return { serverKey: true, identity, tier: "licensed", notice: null };
}

/** Per-minute run limits by tier. Anonymous callers only ever get simulation, but still cost compute. */
export const RUN_LIMITS = {
  command: { own: 30, licensed: 20, anonymous: 6 },
  pipeline: { own: 20, licensed: 12, anonymous: 4 },
} as const;

/** Emits the decision's notice into the run log right after run.start, so the operator sees why it was simulated. */
export function withNotice(notice: string | null, send: (e: RunEvent) => void) {
  if (!notice) return send;
  let shown = false;
  return (e: RunEvent) => {
    send(e);
    if (e.type === "run.start" && !shown) {
      shown = true;
      send({ type: "notice", agentId: null, text: notice });
    }
  };
}
