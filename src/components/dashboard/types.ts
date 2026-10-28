import type { AgentRole, ApiKey, VectorStoreReference, Workspace, WorkflowConfig } from "@prisma/client";

export type DashboardConfig = WorkflowConfig & { agents: AgentRole[] };

export type PublicApiKey = Pick<ApiKey, "id" | "name" | "prefix" | "createdAt" | "lastUsedAt" | "revokedAt">;

export type DashboardStore = VectorStoreReference & { _count: { chunks: number } };

export interface DashboardData {
  workspace: Pick<Workspace, "id" | "name" | "domain" | "summary" | "status" | "webhookUrl"> & {
    hasWebhookSecret: boolean;
  };
  config: DashboardConfig;
  keys: PublicApiKey[];
  stores: DashboardStore[];
  usage: { tokens: number; requests: number };
  appUrl: string;
}

export interface RoutingRule {
  taskType: string;
  tier: string;
  rationale: string;
}

export interface ToolIntegration {
  kind: string;
  name: string;
  purpose: string;
  config: Record<string, string>;
}
