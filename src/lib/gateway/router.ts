import "server-only";
import type { AgentRole, WorkflowConfig } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import type { Usage } from "./upstream";

export type ConfigWithAgents = WorkflowConfig & { agents: AgentRole[] };

export async function loadConfig(workspaceId: string): Promise<ConfigWithAgents> {
  const config = await db.workflowConfig.findUnique({
    where: { workspaceId },
    include: { agents: { orderBy: { position: "asc" } } },
  });
  if (!config) throw new HttpError(409, "Workspace has no generated architecture yet");
  return config;
}

export interface ResolvedRoute {
  agent: AgentRole;
  models: string[];
  maxTokens: number;
  temperature: number;
}

/**
 * Picks the agent (by name, else the first in the topology) and builds its
 * model chain. A `modelOverride` hot-swaps the primary for this request only;
 * the agent's configured models remain as fallbacks.
 */
export function resolveRoute(
  config: ConfigWithAgents,
  opts: { agentName?: string; modelOverride?: string; maxTokens?: number },
): ResolvedRoute {
  const agent = opts.agentName
    ? config.agents.find((a) => a.name.toLowerCase() === opts.agentName!.toLowerCase())
    : config.agents[0];
  if (!agent) {
    throw new HttpError(404, `Unknown agent "${opts.agentName}"`, {
      available: config.agents.map((a) => a.name),
    });
  }

  const chain = [opts.modelOverride, agent.model, ...agent.fallbackModels].filter(
    (m): m is string => Boolean(m),
  );
  const models = [...new Set(chain)];

  // Token cap: the caller may ask for less, never more than the workspace allows.
  const ceiling = Math.min(agent.maxTokens, config.maxTokensPerRequest);
  const maxTokens = opts.maxTokens ? Math.min(opts.maxTokens, config.maxTokensPerRequest) : ceiling;

  return { agent, models, maxTokens, temperature: agent.temperature };
}

function startOfMonthUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function monthlyUsage(workspaceId: string) {
  const agg = await db.gatewayRequest.aggregate({
    where: { workspaceId, createdAt: { gte: startOfMonthUtc() } },
    _sum: { promptTokens: true, completionTokens: true },
    _count: true,
  });
  return {
    tokens: (agg._sum.promptTokens ?? 0) + (agg._sum.completionTokens ?? 0),
    requests: agg._count,
  };
}

export async function assertWithinBudget(workspaceId: string, config: WorkflowConfig) {
  const { tokens } = await monthlyUsage(workspaceId);
  if (tokens >= config.monthlyTokenBudget) {
    throw new HttpError(429, "Monthly token budget exhausted for this workspace", {
      used: tokens,
      budget: config.monthlyTokenBudget,
    });
  }
}

export async function logRequest(entry: {
  workspaceId: string;
  apiKeyId?: string;
  agentRoleId?: string;
  source: "gateway" | "playground" | "api_run";
  requestedModel: string;
  servedModel?: string;
  attempts?: number;
  usage?: Usage;
  latencyMs: number;
  status: "ok" | "error";
  error?: string;
}) {
  await db.gatewayRequest.create({
    data: {
      workspaceId: entry.workspaceId,
      apiKeyId: entry.apiKeyId,
      agentRoleId: entry.agentRoleId,
      source: entry.source,
      requestedModel: entry.requestedModel,
      servedModel: entry.servedModel,
      attempts: entry.attempts ?? 1,
      promptTokens: entry.usage?.prompt_tokens ?? 0,
      completionTokens: entry.usage?.completion_tokens ?? 0,
      latencyMs: entry.latencyMs,
      status: entry.status,
      error: entry.error,
    },
  });
}
