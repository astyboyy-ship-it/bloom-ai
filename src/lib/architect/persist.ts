import "server-only";
import type { AgentTopology, ModelTier, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { modelsForTier } from "@/lib/gateway/models";
import { parseJsonSchema } from "./generate";
import type { ArchitectureSpec } from "./schema";

const TOPOLOGY: Record<ArchitectureSpec["topology"]["type"], AgentTopology> = {
  single_agent: "SINGLE_AGENT",
  hierarchical: "HIERARCHICAL",
  pipeline: "PIPELINE",
};

const TIER: Record<"fast" | "balanced" | "deep", ModelTier> = {
  fast: "FAST",
  balanced: "BALANCED",
  deep: "DEEP",
};

const MAX_TOKENS_BY_TIER: Record<ModelTier, number> = {
  FAST: 1024,
  BALANCED: 4096,
  DEEP: 8192,
};

/** Replaces the workspace's config with one derived from the spec, atomically. */
export async function persistArchitecture(workspaceId: string, spec: ArchitectureSpec) {
  const configData = {
    topology: TOPOLOGY[spec.topology.type],
    topologyRationale: spec.topology.rationale,
    orchestratorPrompt: spec.orchestrator_prompt,
    outputSchema: parseJsonSchema(spec.final_output_schema) as Prisma.InputJsonValue,
    routingRules: spec.routing.rules.map((r) => ({
      taskType: r.task_type,
      tier: TIER[r.tier],
      rationale: r.rationale,
    })),
    toolIntegrations: spec.tool_integrations.map((t) => ({
      kind: t.kind,
      name: t.name,
      purpose: t.purpose,
      config: Object.fromEntries(t.config.map((c) => [c.key, c.value])),
    })),
    ragStrategy: {
      enabled: spec.rag.enabled,
      strategy: spec.rag.strategy,
      chunkSize: spec.rag.chunk_size,
      chunkOverlap: spec.rag.chunk_overlap,
      rationale: spec.rag.rationale,
    },
    maxTokensPerRequest: spec.routing.max_tokens_per_request,
    monthlyTokenBudget: spec.routing.monthly_token_budget,
    rawSpec: spec as unknown as Prisma.InputJsonValue,
  };

  return db.$transaction(async (tx) => {
    const existing = await tx.workflowConfig.findUnique({ where: { workspaceId } });
    if (existing) await tx.workflowConfig.delete({ where: { id: existing.id } });

    const config = await tx.workflowConfig.create({
      data: {
        ...configData,
        workspaceId,
        version: (existing?.version ?? 0) + 1,
        agents: {
          create: spec.agents.map((a, i) => {
            const tier = TIER[a.tier];
            const { model, fallbacks } = modelsForTier(tier);
            return {
              name: a.name,
              role: a.role,
              responsibility: a.responsibility,
              systemPrompt: a.system_prompt,
              outputSchema: parseJsonSchema(a.output_schema) as Prisma.InputJsonValue,
              tier,
              model,
              fallbackModels: fallbacks,
              maxTokens: Math.min(MAX_TOKENS_BY_TIER[tier], spec.routing.max_tokens_per_request),
              temperature: tier === "FAST" ? 0 : 0.3,
              tools: a.tools,
              position: i,
            };
          }),
        },
      },
      include: { agents: { orderBy: { position: "asc" } } },
    });

    if (spec.rag.enabled) {
      await tx.vectorStoreReference.upsert({
        where: { workspaceId_name: { workspaceId, name: "primary" } },
        update: {
          chunkStrategy: spec.rag.strategy,
          chunkSize: spec.rag.chunk_size,
          chunkOverlap: spec.rag.chunk_overlap,
        },
        create: {
          workspaceId,
          name: "primary",
          embeddingModel: env().EMBEDDINGS_MODEL,
          dimensions: 1536,
          chunkStrategy: spec.rag.strategy,
          chunkSize: spec.rag.chunk_size,
          chunkOverlap: spec.rag.chunk_overlap,
        },
      });
    }

    await tx.workspace.update({
      where: { id: workspaceId },
      data: { status: "READY", domain: spec.domain, summary: spec.summary, errorMessage: null },
    });

    return config;
  });
}
