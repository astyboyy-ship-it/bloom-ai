import { z } from "zod";
import { isEngineKey } from "@/components/bloom/command/engines";
import { CORS, fail, preflight, readJson } from "@/lib/demo-http";
import { decideLive, RUN_LIMITS, withNotice } from "@/lib/guard/live-access";
import { rateLimit } from "@/lib/guard/rate-limit";
import { meterRun } from "@/lib/guard/spend";
import { CalibrationsSchema } from "@/lib/engines/calibration";
import type { RunEvent } from "@/lib/engines/events";
import { TIER_INFO, upgradeTierFor } from "@/lib/license/tiers";
import { readOnlyRefusal, resolveLicense } from "@/lib/licensing/server";
import { traceRun } from "@/lib/datasets/trace-log";
import { runCommand } from "@/lib/orchestrator";
import { ownKeys } from "../keys";

export const dynamic = "force-dynamic";
// A Sovereign command can fan out to four engines, each with its own tool loop.
export const maxDuration = 300;

const Body = z.object({
  command: z.string().trim().min(3).max(4000),
  params: z.record(z.string(), z.unknown()).default({}),
  lang: z.enum(["en", "es", "he"]).default("en"),
  /** Per-engine tuning from the Engine Calibration bay; applies to the commanded engine and any it delegates to. */
  calibrations: CalibrationsSchema,
});

export const OPTIONS = preflight;

/** Runs one engine command and streams its execution as server-sent events (see RunEvent). */
export async function POST(req: Request, { params }: { params: Promise<{ engine: string }> }) {
  const { engine } = await params;
  if (!isEngineKey(engine)) return fail(404, `Unknown engine "${engine}".`);

  // The license is verified here on every run; the desk's own gating is a convenience, not the control.
  const license = await resolveLicense(req.headers.get("x-bloom-license"));
  const tier = license.tier;
  const refusal = readOnlyRefusal(license);
  if (refusal) return fail(403, refusal, { tier, readOnly: true });
  if (!license.engines.includes(engine)) {
    const need = upgradeTierFor(engine);
    return fail(403, `${engine} isn't included in ${license.label}. Upgrade to ${TIER_INFO[need].label} to run it.`, { tier, requires: need });
  }
  const keys = ownKeys(req);
  // Live on the server's model key only for a verified license under its spend caps; otherwise simulation.
  const decision = await decideLive(req, license, keys, req.headers.get("x-bloom-license"));
  const limit = await rateLimit("command", decision.identity, RUN_LIMITS.command[decision.tier]);
  if (!limit.ok) return fail(429, "Too many runs. Try again in a minute.", { limit: limit.limit });
  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const body = Body.safeParse(json.body);
  if (!body.success) return fail(422, "Invalid command payload.", body.error.issues.map((i) => i.message));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (chunk: string) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          open = false;
        }
      };
      // Keeps proxies from closing the connection while a model thinks between events.
      const keepAlive = setInterval(() => send(": keep-alive\n\n"), 15_000);
      const sse = (e: RunEvent) => send(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
      const trace = traceRun({ kind: "engine", target: engine, engines: [engine], command: body.data.command }, withNotice(decision.notice, sse));
      const meter = meterRun(decision.identity, decision.serverKey, trace.emit);
      try {
        await runCommand(engine, { command: body.data.command, params: body.data.params }, {
          emit: meter.emit,
          serverKey: decision.serverKey,
          signal: req.signal,
          lang: body.data.lang,
          keys,
          calibrations: body.data.calibrations,
          allowed: license.engines,
        });
      } finally {
        clearInterval(keepAlive);
        // Trace and spend writes must land before the response closes (serverless functions freeze after it).
        await Promise.all([trace.flush(), meter.flush()]);
        open = false;
        try {
          controller.close();
        } catch {
          // Already closed by a client disconnect.
        }
      }
    },
  });

  return new Response(stream, {
    headers: { ...CORS, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
