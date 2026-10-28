import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/apikeys";
import { handle } from "@/lib/http";
import {
  assertWithinBudget,
  loadConfig,
  logRequest,
  resolveRoute,
} from "@/lib/gateway/router";
import {
  complete,
  stream,
  type ChatMessage,
  type StreamResult,
  type Usage,
} from "@/lib/gateway/upstream";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  /** Agent whose system prompt + model route to use. Defaults to the first agent. */
  agent: z.string().optional(),
  /** Hot-swap the primary model for this request; configured models stay as fallbacks. */
  model: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().default(false),
});

/**
 * Personalized OpenAI-compatible proxy.
 *   POST /api/gateway
 *   Authorization: Bearer wfa_live_...
 * Routes to OpenRouter (or LiteLLM when LITELLM_BASE_URL is set) using the
 * workspace's generated architecture: agent prompt injection, model chain
 * with automatic fallback, per-request token cap, and monthly budget.
 */
export const POST = handle(async (req: Request) => {
  const apiKey = await authenticateApiKey(req);
  const body = Body.parse(await req.json());
  const workspaceId = apiKey.workspaceId;

  const config = await loadConfig(workspaceId);
  await assertWithinBudget(workspaceId, config);

  const route = resolveRoute(config, {
    agentName: body.agent,
    modelOverride: body.model,
    maxTokens: body.max_tokens,
  });
  const messages: ChatMessage[] = [
    { role: "system", content: route.agent.systemPrompt },
    ...body.messages,
  ];
  const upstreamReq = {
    models: route.models,
    messages,
    maxTokens: route.maxTokens,
    temperature: route.temperature,
    signal: req.signal,
  };
  const base = {
    workspaceId,
    apiKeyId: apiKey.id,
    agentRoleId: route.agent.id,
    source: "gateway" as const,
    requestedModel: route.models[0],
  };
  const started = Date.now();

  if (!body.stream) {
    try {
      const result = await complete(upstreamReq);
      await logRequest({
        ...base,
        servedModel: result.servedModel,
        attempts: result.attempts,
        usage: result.usage,
        latencyMs: Date.now() - started,
        status: "ok",
      });
      return NextResponse.json({
        object: "chat.completion",
        model: result.servedModel,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: result.content },
            finish_reason: "stop",
          },
        ],
        usage: {
          ...result.usage,
          total_tokens: result.usage.prompt_tokens + result.usage.completion_tokens,
        },
        x_gateway: { agent: route.agent.name, attempts: result.attempts, route: route.models },
      });
    } catch (err) {
      await logRequest({
        ...base,
        latencyMs: Date.now() - started,
        status: "error",
        error: (err as Error).message,
      });
      throw err;
    }
  }

  let upstream: StreamResult;
  try {
    upstream = await stream(upstreamReq);
  } catch (err) {
    await logRequest({
      ...base,
      latencyMs: Date.now() - started,
      status: "error",
      error: (err as Error).message,
    });
    throw err;
  }

  const encoder = new TextEncoder();
  let usage: Usage | undefined;
  const sse = new ReadableStream<Uint8Array>({
    async start(controller) {
      let error: string | undefined;
      try {
        for await (const chunk of upstream.chunks) {
          if (chunk.usage) usage = chunk.usage;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        error = (err as Error).message;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: { message: error } })}\n\n`),
        );
      } finally {
        controller.close();
        await logRequest({
          ...base,
          servedModel: upstream.servedModel,
          attempts: upstream.attempts,
          usage,
          latencyMs: Date.now() - started,
          status: error ? "error" : "ok",
          error,
        }).catch(console.error);
      }
    },
  });

  return new Response(sse, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-WFA-Agent": route.agent.name,
      "X-WFA-Served-Model": upstream.servedModel,
    },
  });
});

/** Describes the routes available to this key — handy for client discovery. */
export const GET = handle(async (req: Request) => {
  const apiKey = await authenticateApiKey(req);
  const config = await loadConfig(apiKey.workspaceId);
  return NextResponse.json({
    workspace: apiKey.workspace.name,
    topology: config.topology,
    maxTokensPerRequest: config.maxTokensPerRequest,
    agents: config.agents.map((a) => ({
      name: a.name,
      role: a.role,
      tier: a.tier,
      model: a.model,
      fallbackModels: a.fallbackModels,
    })),
  });
});
