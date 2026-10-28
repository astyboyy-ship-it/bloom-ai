import { notFound, redirect } from "next/navigation";
import { WorkspaceDashboard } from "@/components/dashboard/workspace-dashboard";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { monthlyUsage } from "@/lib/gateway/router";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const workspace = await db.workspace.findFirst({
    where: { id, userId: user.id },
    include: {
      config: { include: { agents: { orderBy: { position: "asc" } } } },
      apiKeys: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
      },
      vectorStores: { include: { _count: { select: { chunks: true } } } },
    },
  });
  if (!workspace) notFound();
  if (!workspace.config) redirect("/onboarding");

  const usage = await monthlyUsage(id);

  return (
    <WorkspaceDashboard
      initial={{
        workspace: {
          id: workspace.id,
          name: workspace.name,
          domain: workspace.domain,
          summary: workspace.summary,
          status: workspace.status,
          webhookUrl: workspace.webhookUrl,
          hasWebhookSecret: Boolean(workspace.webhookSecret),
        },
        config: workspace.config,
        keys: workspace.apiKeys,
        stores: workspace.vectorStores,
        usage,
        appUrl: env().APP_URL,
      }}
    />
  );
}
