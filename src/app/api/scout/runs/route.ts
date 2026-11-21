import { createHash } from "node:crypto";
import { z } from "zod";
import { fail, ok, rateLimited, readJson } from "@/lib/demo-http";
import { rateLimit } from "@/lib/guard/rate-limit";
import { resolveLicense } from "@/lib/licensing/server";
import { scoutConfig } from "@/lib/scout/config";
import { PolicyError, checkRelayRequest } from "@/lib/scout/policy";
import { AgentKey, RelayClient, RelayError, randomHex } from "@/lib/scout/relay-client";
import { runScenario } from "@/lib/scout/runner";
import { SCENARIO_IDS, SCRIPTS } from "@/lib/scout/scenarios";
import { listRuns, saveRun } from "@/lib/scout/store";
import type { ScenarioId, ScoutEvent } from "@/lib/scout/types";

export const dynamic = "force-dynamic";
// One live run is about a dozen relay round trips.
export const maxDuration = 60;

const Body = z.object({ scenario: z.enum(SCENARIO_IDS as [ScenarioId, ...ScenarioId[]]) });

/** Recent live sandbox runs (illustrative entries ship with the page). */
export async function GET(req: Request) {
  if (rateLimited(req, "scout-runs", 60)) return fail(429, "Too many requests. Try again in a minute.");
  return ok({ runs: await listRuns(20) });
}

/**
 * Starts one live sandbox run on the relay and streams its progress as NDJSON (one ScoutEvent per line). Gates, in
 * order: BLOOM_SCOUT_LIVE=1; a verified Operator access key (the desk's role check is a convenience, this is the
 * control); 3 runs a minute per key; the deployment's daily cap (20 by default). The cap counts attempts, because a
 * run that fails half-way may already have written to the relay's permanent records.
 */
export async function POST(req: Request) {
  const cfg = scoutConfig();
  if (!cfg.live) return fail(503, "Live sandbox runs are off on this deployment. Set BLOOM_SCOUT_LIVE=1 to allow them.", { code: "live_disabled" });

  const rawKey = req.headers.get("x-bloom-license");
  const license = await resolveLicense(rawKey);
  if (license.access?.role !== "operator" || license.readOnly) return fail(403, "Live Exchange Scout runs need a verified Operator access key.", { code: "operator_only" });

  const identity = createHash("sha256").update(rawKey ?? "").digest("hex").slice(0, 16);
  if (!(await rateLimit("scout-run", identity, 3)).ok) return fail(429, "Up to 3 live runs a minute. Try again shortly.", { code: "rate_limited" });

  const json = await readJson(req);
  const body = json.ok ? Body.safeParse(json.body) : null;
  if (!body?.success) return fail(422, `Body must be {"scenario": ${SCENARIO_IDS.map((s) => `"${s}"`).join(" | ")}}.`, { code: "bad_body" });

  const day = await rateLimit("scout-live-day", "deployment", cfg.dailyCap, 86_400);
  if (!day.ok) return fail(429, `The daily cap of ${cfg.dailyCap} live runs is reached. It resets at 00:00 UTC.`, { code: "daily_cap", limit: day.limit });

  let keys: [AgentKey, AgentKey];
  try {
    keys = await Promise.all([cfg.ownerSeed ? AgentKey.fromSeed(cfg.ownerSeed) : AgentKey.generate(), cfg.counterpartSeed ? AgentKey.fromSeed(cfg.counterpartSeed) : AgentKey.generate()]);
  } catch {
    return fail(500, "BLOOM_SCOUT_OWNER_SEED or BLOOM_SCOUT_COUNTERPART_SEED is not a 32-byte base64url seed.", { code: "bad_seed" });
  }
  const client = (key: AgentKey) => new RelayClient({ baseUrl: cfg.relayUrl, key, beforeSend: checkRelayRequest });
  const runId = `scout-${Date.now().toString(36)}-${randomHex(4)}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ScoutEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        const run = await runScenario(SCRIPTS[body.data.scenario], { owner: client(keys[0]), counterpart: client(keys[1]) }, { runId, verifierUrl: cfg.verifierUrl, emit: send });
        await saveRun(run);
        send({ type: "done", run });
      } catch (err) {
        const code = err instanceof PolicyError || err instanceof RelayError ? err.code : "run_failed";
        send({ type: "error", code, message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
