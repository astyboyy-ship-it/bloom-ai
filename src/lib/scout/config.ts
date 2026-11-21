import "server-only";
import { DEFAULT_RELAY_URL, DEFAULT_VERIFIER_URL } from "./relay-client";

/**
 * Exchange Scout's server configuration. Kept out of src/lib/env.ts, which requires the workspace database.
 *
 *   BLOOM_RELAY_URL               the relay origin (default https://bloom-exchange-relay.vercel.app)
 *   BLOOM_VERIFIER_URL            the verifier origin (default https://bloom-exchange-verify.vercel.app)
 *   BLOOM_SCOUT_LIVE=1            allows live sandbox runs; anything else keeps the tab on the illustrative feed
 *   BLOOM_SCOUT_OWNER_SEED        32-byte Ed25519 seeds (base64url) for the two sandbox agents; without them, each run
 *   BLOOM_SCOUT_COUNTERPART_SEED  uses temporary keys
 *   BLOOM_SCOUT_DAILY_CAP         live runs per UTC day across the deployment (default 20)
 */
export type ScoutConfig = { relayUrl: string; verifierUrl: string; live: boolean; ownerSeed: string | null; counterpartSeed: string | null; dailyCap: number };

/** An http(s) origin with no path, credentials, query or fragment; http only for loopback. */
function origin(raw: string | undefined, fallback: string): string {
  const v = raw?.trim();
  if (!v) return fallback;
  try {
    const u = new URL(v);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
    if ((u.protocol === "https:" || (u.protocol === "http:" && loopback)) && !u.username && !u.password && (u.pathname === "/" || u.pathname === "") && !u.search && !u.hash) return u.origin;
  } catch {
    // Falls through to the default below.
  }
  console.warn(`[scout] ignoring an invalid relay or verifier URL; using ${fallback}`);
  return fallback;
}

export function scoutConfig(env: Record<string, string | undefined> = process.env): ScoutConfig {
  const cap = Number(env.BLOOM_SCOUT_DAILY_CAP);
  return {
    relayUrl: origin(env.BLOOM_RELAY_URL, DEFAULT_RELAY_URL),
    verifierUrl: origin(env.BLOOM_VERIFIER_URL, DEFAULT_VERIFIER_URL),
    live: env.BLOOM_SCOUT_LIVE?.trim() === "1",
    ownerSeed: env.BLOOM_SCOUT_OWNER_SEED?.trim() || null,
    counterpartSeed: env.BLOOM_SCOUT_COUNTERPART_SEED?.trim() || null,
    dailyCap: Number.isInteger(cap) && cap > 0 ? Math.min(cap, 20) : 20,
  };
}
