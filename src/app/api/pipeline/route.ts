import { z } from "zod";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { CORS, fail, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { CalibrationsSchema } from "@/lib/engines/calibration";
import type { RunEvent } from "@/lib/engines/events";
import { readOnlyRefusal, resolveLicense } from "@/lib/licensing/server";
import { traceRun } from "@/lib/datasets/trace-log";
import { runPipeline } from "@/lib/orchestrator";
import { ownKeys } from "../command/keys";

export const dynamic = "force-dynamic";
// A full eight-engine stack runs every engine in turn.
export const maxDuration = 300;

const Body = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  engines: z
    .array(z.enum(ENGINE_ORDER as [EngineKey, ...EngineKey[]]))
    .min(1)
    .max(8)
    .refine((e) => new Set(e).size === e.length, "Each engine can appear once in a stack."),
  command: z.string().trim().min(3).max(4000),
  lang: z.enum(["en", "es", "he"]).default("en"),
  calibrations: CalibrationsSchema,
});

export const OPTIONS = preflight;

/** Runs an architecture or a builder pipeline: its engines in order, streamed as server-sent events. */
export async function POST(req: Request) {
  const keys = ownKeys(req);
  const own = Boolean(keys.anthropic || keys.openrouter);
  if (rateLimited(req, own ? "pipeline-own" : "pipeline", own ? 20 : 4)) return fail(429, "Too many runs. Try again in a minute.");
  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const body = Body.safeParse(json.body);
  if (!body.success) return fail(422, "Invalid pipeline payload.", body.error.issues.map((i) => i.message));

  const license = await resolveLicense(req.headers.get("x-bloom-license"));
  const tier = license.tier;
  const refusal = readOnlyRefusal(license);
  if (refusal) return fail(403, refusal, { tier, readOnly: true });
  const missing = body.data.engines.filter((k) => !license.engines.includes(k));
  if (missing.length) return fail(403, `${body.data.label} needs ${missing.map((k) => ENGINES[k].name).join(", ")}, which ${missing.length === 1 ? "isn't" : "aren't"} in ${license.label}.`, { tier, missing });

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
      const keepAlive = setInterval(() => send(": keep-alive\n\n"), 15_000);
      const trace = traceRun({ kind: "pipeline", target: body.data.id, engines: body.data.engines, command: body.data.command }, (e: RunEvent) => send(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
      try {
        await runPipeline(
          { id: body.data.id, label: body.data.label, engines: body.data.engines },
          { command: body.data.command },
          {
            emit: trace.emit,
            signal: req.signal,
            lang: body.data.lang,
            keys,
            calibrations: body.data.calibrations,
            allowed: license.engines,
          },
        );
      } finally {
        clearInterval(keepAlive);
        // The trace write must land before the response closes (serverless functions freeze after it).
        await trace.flush();
        open = false;
        try {
          controller.close();
        } catch {
          // Already closed by a client disconnect.
        }
      }
    },
  });
  return new Response(stream, { headers: { ...CORS, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
