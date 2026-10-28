"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Database, KeyRound, Settings2, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigInspector } from "./config-inspector";
import { ControlRoom } from "./control-room";
import { ExportPanel } from "./export-panel";
import { KnowledgePanel } from "./knowledge-panel";
import type { DashboardConfig, DashboardData } from "./types";

export function WorkspaceDashboard({ initial }: { initial: DashboardData }) {
  const [config, setConfig] = useState<DashboardConfig>(initial.config);
  const { workspace, usage } = initial;
  const pct = Math.min(100, (usage.tokens / config.monthlyTokenBudget) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Link
            href="/workspaces"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All workspaces
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
            {workspace.domain && <Badge variant="secondary">{workspace.domain}</Badge>}
            <Badge variant="outline">{config.topology.replace("_", " ").toLowerCase()}</Badge>
            <Badge variant="outline">v{config.version}</Badge>
          </div>
          {workspace.summary && (
            <p className="max-w-3xl text-sm text-muted-foreground">{workspace.summary}</p>
          )}
        </div>
        <div className="w-full space-y-1.5 md:w-64">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tokens this month</span>
            <span>
              {usage.tokens.toLocaleString()} / {config.monthlyTokenBudget.toLocaleString()}
            </span>
          </div>
          <Progress value={pct} />
        </div>
      </div>

      <Tabs defaultValue="control" className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
          <TabsTrigger value="control">
            <Terminal /> Control Room
          </TabsTrigger>
          <TabsTrigger value="inspector">
            <Settings2 /> Agent Config
          </TabsTrigger>
          <TabsTrigger value="export">
            <KeyRound /> API & Webhooks
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <Database /> Knowledge
          </TabsTrigger>
        </TabsList>
        <TabsContent value="control">
          <ControlRoom workspaceId={workspace.id} config={config} />
        </TabsContent>
        <TabsContent value="inspector">
          <ConfigInspector workspaceId={workspace.id} config={config} onSaved={setConfig} />
        </TabsContent>
        <TabsContent value="export">
          <ExportPanel
            workspaceId={workspace.id}
            appUrl={initial.appUrl}
            agents={config.agents.map((a) => a.name)}
            initialKeys={initial.keys}
            initialWebhookUrl={workspace.webhookUrl}
            hasWebhookSecret={workspace.hasWebhookSecret}
          />
        </TabsContent>
        <TabsContent value="knowledge">
          <KnowledgePanel workspaceId={workspace.id} config={config} initialStores={initial.stores} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
