import { z } from "zod";
import { isEngineKey } from "@/components/bloom/command/engines";
import { CORS, fail, preflight, rateLimited, readJson } from "@/lib/demo-http";
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
  // Runs on the operator's own key cost the server nothing, so they get more room.
  const own = Boolean(keys.anthropic || keys.openrouter);
  if (rateLimited(req, own ? "command-run-own" : "command-run", own ? 30 : 6)) return fail(429, "Too many runs. Try again in a minute.");
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
      try {
        await runCommand(engine, { command: body.data.command, params: body.data.params }, {
          emit: traceRun({ kind: "engine", target: engine, engines: [engine], command: body.data.command }, (e: RunEvent) => send(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)),
          signal: req.signal,
          lang: body.data.lang,
          keys,
          calibrations: body.data.calibrations,
          allowed: license.engines,
        });
      } finally {
        clearInterval(keepAlive);
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
