import "server-only";
import { randomUUID } from "node:crypto";
import type { AgentRole, Workspace } from "@prisma/client";
import { HttpError } from "@/lib/http";
import { retrieve, type RetrievedChunk } from "@/lib/rag/store";
import {
  assertWithinBudget,
  loadConfig,
  logRequest,
  resolveRoute,
  type ConfigWithAgents,
} from "@/lib/gateway/router";
import { stream, type ChatMessage, type Usage } from "@/lib/gateway/upstream";
import { deliverWebhook } from "@/lib/webhooks";

export type RunEvent =
  | { type: "run_start"; runId: string; topology: string; agents: string[] }
  | { type: "context"; chunks: { sourceName: string; similarity: number }[] }
  | { type: "agent_start"; agent: string; model: string }
  | { type: "delta"; agent: string; text: string }
  | { type: "agent_end"; agent: string; servedModel: string; usage: Usage; latencyMs: number }
  | { type: "error"; agent?: string; message: string; details?: unknown }
  | { type: "run_end"; runId: string; output: string; usage: Usage };

interface ExecuteOptions {
  workspace: Workspace;
  input: string;
  source: "playground" | "api_run";
  apiKeyId?: string;
  signal?: AbortSignal;
}

/**
 * Runs the workspace's agents in topology order, streaming events.
 * - single_agent: the first agent only.
 * - pipeline: each agent sees the task plus the previous agent's output.
 * - hierarchical: each agent sees the task plus every prior agent's output,
 *   so auditors/executors can check the full chain of work.
 */
export async function* executeWorkflow(opts: ExecuteOptions): AsyncGenerator<RunEvent> {
  const { workspace, input, source, apiKeyId, signal } = opts;
  const runId = randomUUID();
  const config = await loadConfig(workspace.id);
  await assertWithinBudget(workspace.id, config);

  const agents = config.topology === "SINGLE_AGENT" ? config.agents.slice(0, 1) : config.agents;
  yield { type: "run_start", runId, topology: config.topology, agents: agents.map((a) => a.name) };

  let context: RetrievedChunk[] = [];
  try {
    context = await retrieve(workspace.id, input);
  } catch (err) {
    yield { type: "error", message: `Retrieval skipped: ${(err as Error).message}` };
  }
  if (context.length > 0) {
    yield {
      type: "context",
      chunks: context.map((c) => ({ sourceName: c.sourceName, similarity: Number(c.similarity) })),
    };
  }

  const outputs: { agent: string; content: string }[] = [];
  const total: Usage = { prompt_tokens: 0, completion_tokens: 0 };

  for (const [i, agent] of agents.entries()) {
    const route = resolveRoute(config, { agentName: agent.name });
    const messages = buildMessages(config, agent, {
      input,
      context: i === 0 || agent.role === "researcher" ? context : [],
      handoffs: config.topology === "PIPELINE" ? outputs.slice(-1) : outputs,
      isFinal: i === agents.length - 1,
    });

    yield { type: "agent_start", agent: agent.name, model: route.models[0] };
    const started = Date.now();
    let content = "";
    let usage: Usage = { prompt_tokens: 0, completion_tokens: 0 };
    let servedModel = route.models[0];

    try {
      const s = await stream({
        models: route.models,
        messages,
        maxTokens: route.maxTokens,
        temperature: route.temperature,
        signal,
      });
      servedModel = s.servedModel;
      for await (const chunk of s.chunks) {
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) {
          content += text;
          yield { type: "delta", agent: agent.name, text };
        }
        if (chunk.usage) usage = chunk.usage;
        if (chunk.model) servedModel = chunk.model;
      }
      await logRequest({
        workspaceId: workspace.id,
        apiKeyId,
        agentRoleId: agent.id,
        source,
        requestedModel: route.models[0],
        servedModel,
        attempts: s.attempts,
        usage,
        latencyMs: Date.now() - started,
        status: "ok",
      });
    } catch (err) {
      await logRequest({
        workspaceId: workspace.id,
        apiKeyId,
        agentRoleId: agent.id,
        source,
        requestedModel: route.models[0],
        usage,
        latencyMs: Date.now() - started,
        status: "error",
        error: (err as Error).message,
      });
      yield {
        type: "error",
        agent: agent.name,
        message: (err as Error).message,
        details: err instanceof HttpError ? err.details : undefined,
      };
      return;
    }

    total.prompt_tokens += usage.prompt_tokens;
    total.completion_tokens += usage.completion_tokens;
    outputs.push({ agent: agent.name, content });
    yield { type: "agent_end", agent: agent.name, servedModel, usage, latencyMs: Date.now() - started };
  }

  const output = outputs.at(-1)?.content ?? "";

  if (workspace.webhookUrl && workspace.webhookSecret) {
    try {
      await deliverWebhook(
        { url: workspace.webhookUrl, secret: workspace.webhookSecret },
        "workflow.run.completed",
        { runId, workspaceId: workspace.id, input, output, steps: outputs, usage: total },
      );
    } catch (err) {
      yield { type: "error", message: `Webhook delivery failed: ${(err as Error).message}` };
    }
  }

  yield { type: "run_end", runId, output, usage: total };
}

function buildMessages(
  config: ConfigWithAgents,
  agent: AgentRole,
  parts: {
    input: string;
    context: RetrievedChunk[];
    handoffs: { agent: string; content: string }[];
    isFinal: boolean;
  },
): ChatMessage[] {
  const schema = parts.isFinal ? config.outputSchema : agent.outputSchema;
  const system = [
    config.orchestratorPrompt,
    `## Your role: ${agent.name} (${agent.role})\n${agent.responsibility}`,
    agent.systemPrompt,
    schema
      ? `## Output format\nReturn output that conforms to this JSON Schema:\n${JSON.stringify(schema, null, 2)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const sections = [`<task>\n${parts.input}\n</task>`];
  if (parts.context.length > 0) {
    sections.push(
      `<retrieved_context>\n${parts.context
        .map((c, i) => `<doc index="${i + 1}" source="${c.sourceName}">\n${c.content}\n</doc>`)
        .join("\n")}\n</retrieved_context>`,
    );
  }
  for (const h of parts.handoffs) {
    sections.push(`<handoff from="${h.agent}">\n${h.content}\n</handoff>`);
  }

  return [
    { role: "system", content: system },
    { role: "user", content: sections.join("\n\n") },
  ];
}

/** Serializes run events as newline-delimited JSON for streaming responses. */
export function ndjsonStream(events: AsyncGenerator<RunEvent>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await events.next();
        if (done) return controller.close();
        controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
      } catch (err) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "error", message: (err as Error).message }) + "\n"),
        );
        controller.close();
      }
    },
    async cancel() {
      await events.return(undefined);
    },
  });
}
