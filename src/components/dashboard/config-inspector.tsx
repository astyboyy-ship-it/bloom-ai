"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TierBadge } from "@/components/onboarding/spec-review";
import type { DashboardConfig, RoutingRule, ToolIntegration } from "./types";

type AgentDraft = {
  id: string;
  systemPrompt: string;
  model: string;
  fallbackModels: string;
  maxTokens: number;
  temperature: number;
};

const toDraft = (config: DashboardConfig): AgentDraft[] =>
  config.agents.map((a) => ({
    id: a.id,
    systemPrompt: a.systemPrompt,
    model: a.model,
    fallbackModels: a.fallbackModels.join(", "),
    maxTokens: a.maxTokens,
    temperature: a.temperature,
  }));

export function ConfigInspector({
  workspaceId,
  config,
  onSaved,
}: {
  workspaceId: string;
  config: DashboardConfig;
  onSaved: (config: DashboardConfig) => void;
}) {
  const [agents, setAgents] = useState(() => toDraft(config));
  const [orchestratorPrompt, setOrchestratorPrompt] = useState(config.orchestratorPrompt);
  const [maxTokensPerRequest, setMaxTokensPerRequest] = useState(config.maxTokensPerRequest);
  const [monthlyTokenBudget, setMonthlyTokenBudget] = useState(config.monthlyTokenBudget);
  const [saving, setSaving] = useState(false);

  const routing = config.routingRules as unknown as RoutingRule[];
  const tools = config.toolIntegrations as unknown as ToolIntegration[];

  const update = (id: string, patch: Partial<AgentDraft>) =>
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orchestratorPrompt,
          maxTokensPerRequest,
          monthlyTokenBudget,
          agents: agents.map((a) => ({
            id: a.id,
            systemPrompt: a.systemPrompt,
            model: a.model.trim(),
            fallbackModels: a.fallbackModels
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            maxTokens: a.maxTokens,
            temperature: a.temperature,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Save failed");
      onSaved(json.config);
      setAgents(toDraft(json.config));
      toast.success(`Saved · config v${json.config.version} is live`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Changes apply to the gateway immediately. Model fields accept any OpenRouter slug
          (or LiteLLM model name) — this is the hot-swap path.
        </p>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />} Save changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orchestration & budgets</CardTitle>
          <CardDescription>{config.topologyRationale}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Orchestrator prompt</Label>
            <Textarea
              value={orchestratorPrompt}
              onChange={(e) => setOrchestratorPrompt(e.target.value)}
              className="min-h-28 font-mono text-xs"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Max tokens per request</Label>
              <Input
                type="number"
                value={maxTokensPerRequest}
                onChange={(e) => setMaxTokensPerRequest(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly token budget</Label>
              <Input
                type="number"
                value={monthlyTokenBudget}
                onChange={(e) => setMonthlyTokenBudget(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {config.agents.map((agent) => {
        const draft = agents.find((a) => a.id === agent.id)!;
        return (
          <Card key={agent.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{agent.name}</CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {agent.role}
                </Badge>
                <TierBadge tier={agent.tier} />
                {agent.tools.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
              <CardDescription>{agent.responsibility}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>System prompt</Label>
                <Textarea
                  value={draft.systemPrompt}
                  onChange={(e) => update(agent.id, { systemPrompt: e.target.value })}
                  className="min-h-40 font-mono text-xs"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary model</Label>
                  <Input
                    value={draft.model}
                    onChange={(e) => update(agent.id, { model: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fallback models (comma-separated, in order)</Label>
                  <Input
                    value={draft.fallbackModels}
                    onChange={(e) => update(agent.id, { fallbackModels: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max output tokens</Label>
                  <Input
                    type="number"
                    value={draft.maxTokens}
                    onChange={(e) => update(agent.id, { maxTokens: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={2}
                    value={draft.temperature}
                    onChange={(e) => update(agent.id, { temperature: Number(e.target.value) })}
                  />
                </div>
              </div>
              {agent.outputSchema && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Output schema</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3">
                    {JSON.stringify(agent.outputSchema, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Routing rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {routing.map((r) => (
              <div key={r.taskType} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.taskType}</p>
                  <p className="text-xs text-muted-foreground">{r.rationale}</p>
                </div>
                <TierBadge tier={r.tier} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tool parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {tools.map((t) => (
              <div key={t.name} className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t.name}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {t.kind}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t.purpose}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-muted p-2 font-mono text-[11px]">
                  {Object.entries(t.config).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="break-all">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Final deliverable schema</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(config.outputSchema, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
