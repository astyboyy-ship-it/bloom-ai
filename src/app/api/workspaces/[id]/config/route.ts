import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnedWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/http";
import { loadConfig, monthlyUsage } from "@/lib/gateway/router";
import { generateWebhookSecret } from "@/lib/webhooks";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { workspace } = await requireOwnedWorkspace(id);
  const [config, usage] = await Promise.all([loadConfig(id), monthlyUsage(id)]);
  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
      webhookUrl: workspace.webhookUrl,
      hasWebhookSecret: Boolean(workspace.webhookSecret),
    },
    config,
    usage,
  });
});

const ModelSlug = z.string().trim().min(3).max(200);

const Patch = z.object({
  orchestratorPrompt: z.string().min(1).optional(),
  maxTokensPerRequest: z.number().int().min(256).max(128000).optional(),
  monthlyTokenBudget: z.number().int().min(1000).optional(),
  webhookUrl: z.string().url().nullable().optional(),
  rotateWebhookSecret: z.boolean().optional(),
  agents: z
    .array(
      z.object({
        id: z.string(),
        systemPrompt: z.string().min(1).optional(),
        model: ModelSlug.optional(),
        fallbackModels: z.array(ModelSlug).max(5).optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().int().min(64).max(128000).optional(),
        tools: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

/** Inspector edits: prompts, model hot-swap, budgets, webhook target. Bumps config version. */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { workspace } = await requireOwnedWorkspace(id);
  const body = Patch.parse(await req.json());
  const config = await loadConfig(id);

  const agentIds = new Set(config.agents.map((a) => a.id));
  for (const a of body.agents ?? []) {
    if (!agentIds.has(a.id)) throw new HttpError(400, `Agent ${a.id} is not part of this workspace`);
  }

  let webhookSecret: string | undefined;
  if (body.rotateWebhookSecret || (body.webhookUrl && !workspace.webhookSecret)) {
    webhookSecret = generateWebhookSecret();
  }

  await db.$transaction([
    db.workflowConfig.update({
      where: { id: config.id },
      data: {
        orchestratorPrompt: body.orchestratorPrompt,
        maxTokensPerRequest: body.maxTokensPerRequest,
        monthlyTokenBudget: body.monthlyTokenBudget,
        version: { increment: 1 },
      },
    }),
    ...(body.agents ?? []).map(({ id: agentId, ...data }) =>
      db.agentRole.update({ where: { id: agentId }, data }),
    ),
    ...(body.webhookUrl !== undefined || webhookSecret
      ? [
          db.workspace.update({
            where: { id },
            data: {
              ...(body.webhookUrl !== undefined ? { webhookUrl: body.webhookUrl } : {}),
              ...(webhookSecret ? { webhookSecret } : {}),
            },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({
    config: await loadConfig(id),
    // Returned once, when created or rotated.
    ...(webhookSecret ? { webhookSecret } : {}),
  });
});
