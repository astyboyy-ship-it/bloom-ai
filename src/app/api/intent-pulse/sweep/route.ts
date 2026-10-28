import { NextResponse } from "next/server";
import { z } from "zod";
import { actorFor, apifyConfig, liveSweep, type LivePlatform, type SweepRun } from "@/lib/apify/client";
import { CORS, fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { simulateSweep } from "@/lib/intentpulse/data-simulator";
import { SWEEPABLE } from "@/lib/intentpulse/signal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const OPTIONS = preflight;

const SweepSchema = z.object({
  keywords: z.array(z.string().trim().min(1).max(60)).min(1).max(6),
  platforms: z.array(z.enum(["x", "instagram", "tiktok", "reddit"])).min(1).max(4),
  perPlatform: z.number().int().min(1).max(60).default(25),
});

// Live runs spend Apify credits, so cap them tighter than the simulator.
const LIVE_MAX_PER_PLATFORM = 25;

/** Which mode the radar is in. Never exposes the token itself. */
export function GET() {
  const cfg = apifyConfig();
  return NextResponse.json(
    {
      mode: cfg.live ? "live" : "simulated",
      liveRequested: cfg.liveRequested,
      tokenConfigured: !!cfg.token,
      actors: Object.fromEntries(SWEEPABLE.map((p) => [p, actorFor(p as LivePlatform)])),
      usage: 'POST { keywords: string[], platforms: ("x"|"instagram"|"tiktok"|"reddit")[], perPlatform?: number }',
    },
    { headers: CORS },
  );
}

/** Global radar sweep: live Apify Actor runs when USE_LIVE_APIFY=true, else the mass-scale simulator. */
export async function POST(req: Request) {
  const cfg = apifyConfig();
  if (rateLimited(req, "intent-pulse-sweep", cfg.live ? 4 : 20)) return fail(429, "Too many sweeps. Try again in a minute.");

  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const parsed = SweepSchema.safeParse(json.body);
  if (!parsed.success) return fail(422, "Invalid sweep payload.", parsed.error.issues.map((i) => i.message));

  const { keywords, platforms, perPlatform } = parsed.data;
  const startedAt = Date.now();

  if (cfg.live && cfg.token) {
    const { runs, signals } = await liveSweep(platforms, keywords, Math.min(perPlatform, LIVE_MAX_PER_PLATFORM), cfg.token);
    if (signals.length > 0) {
      return ok({ mode: "live", runs, signals, latencyMs: Date.now() - startedAt });
    }
    const failed = runs.filter((r) => r.error).map((r) => `${r.platform}: ${r.error}`);
    return ok({
      mode: "simulated",
      runs,
      signals: simulateSweep(perPlatform * platforms.length, { platforms, keywords }),
      notice: failed.length ? `Live Apify runs failed (${failed.join("; ")}). Showing simulated signals.` : "Live Apify runs returned no items. Showing simulated signals.",
      latencyMs: Date.now() - startedAt,
    });
  }

  const runs: SweepRun[] = platforms.map((p) => ({ platform: p, actor: "simulator", count: perPlatform, ms: 0 }));
  return ok({
    mode: "simulated",
    runs,
    signals: simulateSweep(perPlatform * platforms.length, { platforms, keywords }),
    notice: cfg.liveRequested && !cfg.token ? "USE_LIVE_APIFY is true but APIFY_API_TOKEN is missing; showing simulated signals." : undefined,
    latencyMs: Date.now() - startedAt,
  });
}
