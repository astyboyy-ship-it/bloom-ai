import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/apikeys";
import { handle, HttpError } from "@/lib/http";
import { executeWorkflow, ndjsonStream, type RunEvent } from "@/lib/workflow/execute";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  input: z.string().trim().min(1).max(50000),
  stream: z.boolean().default(false),
});

/**
 * Runs the full multi-agent workflow for the key's workspace.
 *   POST /api/v1/run   { "input": "...", "stream": false }
 * stream=true returns NDJSON events; otherwise the final output as JSON.
 */
export const POST = handle(async (req: Request) => {
  const apiKey = await authenticateApiKey(req);
  const body = Body.parse(await req.json());
  const events = executeWorkflow({
    workspace: apiKey.workspace,
    input: body.input,
    source: "api_run",
    apiKeyId: apiKey.id,
    signal: req.signal,
  });

  if (body.stream) {
    return new Response(ndjsonStream(events), {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
    });
  }

  const steps: Extract<RunEvent, { type: "agent_end" }>[] = [];
  for await (const event of events) {
    if (event.type === "agent_end") steps.push(event);
    if (event.type === "error" && event.agent) {
      throw new HttpError(502, event.message, { agent: event.agent, details: event.details });
    }
    if (event.type === "run_end") {
      return NextResponse.json({ runId: event.runId, output: event.output, usage: event.usage, steps });
    }
  }
  throw new HttpError(500, "Run ended without output");
});
