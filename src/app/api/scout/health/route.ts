import { fail, ok, rateLimited } from "@/lib/demo-http";
import { scoutConfig } from "@/lib/scout/config";
import type { RelayHealth } from "@/lib/scout/relay-client";

export const dynamic = "force-dynamic";

/** Exchange Scout's runtime: the relay's /health (fetched server-side, so the desk needs no CORS) and whether live runs are on. */
export async function GET(req: Request) {
  if (rateLimited(req, "scout-health", 30)) return fail(429, "Too many requests. Try again in a minute.");
  const cfg = scoutConfig();
  let relay: RelayHealth | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(`${cfg.relayUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (res.ok) relay = (await res.json()) as RelayHealth;
    else error = `relay answered ${res.status}`;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  return ok({ relayUrl: cfg.relayUrl, verifierUrl: cfg.verifierUrl, live: cfg.live, dailyCap: cfg.dailyCap, relay, error });
}
