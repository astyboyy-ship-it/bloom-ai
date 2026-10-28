"use client";

import { useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TierBadge } from "@/components/onboarding/spec-review";
import type { DashboardConfig } from "./types";

type StepState = {
  agent: string;
  status: "pending" | "running" | "done" | "error";
  model?: string;
  servedModel?: string;
  text: string;
  tokens?: number;
  latencyMs?: number;
  error?: string;
};

type RunEvent =
  | { type: "run_start"; runId: string; agents: string[] }
  | { type: "context"; chunks: { sourceName: string; similarity: number }[] }
  | { type: "agent_start"; agent: string; model: string }
  | { type: "delta"; agent: string; text: string }
  | {
      type: "agent_end";
      agent: string;
      servedModel: string;
      usage: { prompt_tokens: number; completion_tokens: number };
      latencyMs: number;
    }
  | { type: "error"; agent?: string; message: string }
  | { type: "run_end"; runId: string; usage: { prompt_tokens: number; completion_tokens: number } };

export function ControlRoom({ workspaceId, config }: { workspaceId: string; config: DashboardConfig }) {
  const [input, setInput] = useState("");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const agentsByName = new Map(config.agents.map((a) => [a.name, a]));

  const patch = (agent: string, update: (s: StepState) => StepState) =>
    setSteps((prev) => prev.map((s) => (s.agent === agent ? update(s) : s)));

  function apply(event: RunEvent) {
    switch (event.type) {
      case "run_start":
        setSteps(event.agents.map((agent) => ({ agent, status: "pending", text: "" })));
        break;
      case "context":
        setNotices((n) => [
          ...n,
          `Retrieved ${event.chunks.length} chunks from ${[...new Set(event.chunks.map((c) => c.sourceName))].join(", ")}`,
        ]);
        break;
      case "agent_start":
        patch(event.agent, (s) => ({ ...s, status: "running", model: event.model }));
        break;
      case "delta":
        patch(event.agent, (s) => ({ ...s, text: s.text + event.text }));
        break;
      case "agent_end":
        patch(event.agent, (s) => ({
          ...s,
          status: "done",
          servedModel: event.servedModel,
          tokens: event.usage.prompt_tokens + event.usage.completion_tokens,
          latencyMs: event.latencyMs,
        }));
        break;
      case "error":
        if (event.agent) {
          patch(event.agent, (s) => ({ ...s, status: "error", error: event.message }));
        } else {
          setNotices((n) => [...n, event.message]);
        }
        toast.error(event.message);
        break;
      case "run_end":
        setTotalTokens(event.usage.prompt_tokens + event.usage.completion_tokens);
        break;
    }
  }

  async function run() {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setSteps([]);
    setNotices([]);
    setTotalTokens(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? `Run failed (${res.status})`);
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) apply(JSON.parse(line) as RunEvent);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error((err as Error).message);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Task input</CardTitle>
          <CardDescription>
            Runs the full {config.topology.replace("_", " ").toLowerCase()} workflow through the
            gateway with live routing, fallbacks, and budget enforcement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a brief, a Terraform plan, a deal summary…"
            className="min-h-48 font-mono text-sm"
          />
          <div className="flex gap-2">
            {running ? (
              <Button variant="destructive" onClick={() => abortRef.current?.abort()}>
                <Square /> Stop
              </Button>
            ) : (
              <Button onClick={run} disabled={!input.trim()}>
                <Play /> Run workflow
              </Button>
            )}
          </div>
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Execution order
            </p>
            {config.agents.map((a, i) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                  {a.name}
                </span>
                <span className="flex items-center gap-2">
                  <code className="hidden text-xs text-muted-foreground sm:inline">{a.model}</code>
                  <TierBadge tier={a.tier} />
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {notices.map((n, i) => (
          <p key={i} className="rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {n}
          </p>
        ))}
        {steps.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Agent output streams here, step by step.
            </CardContent>
          </Card>
        )}
        {steps.map((s) => (
          <Card
            key={s.agent}
            className={cn("gap-3", s.status === "pending" && "opacity-50")}
          >
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {s.status === "running" && <Loader2 className="size-4 animate-spin" />}
                  {s.status === "done" && <CheckCircle2 className="size-4 text-emerald-600" />}
                  {s.status === "error" && <CircleAlert className="size-4 text-destructive" />}
                  {s.agent}
                  <span className="text-xs font-normal capitalize text-muted-foreground">
                    {agentsByName.get(s.agent)?.role}
                  </span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {(s.servedModel ?? s.model) && (
                    <Badge variant="outline" className="font-mono">
                      {s.servedModel ?? s.model}
                    </Badge>
                  )}
                  {s.tokens !== undefined && <span>{s.tokens.toLocaleString()} tok</span>}
                  {s.latencyMs !== undefined && <span>{(s.latencyMs / 1000).toFixed(1)}s</span>}
                </div>
              </div>
            </CardHeader>
            {(s.text || s.error) && (
              <CardContent>
                {s.error ? (
                  <p className="text-sm text-destructive">{s.error}</p>
                ) : (
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
                    {s.text}
                  </pre>
                )}
              </CardContent>
            )}
          </Card>
        ))}
        {totalTokens !== null && (
          <p className="text-right text-xs text-muted-foreground">
            Run complete · {totalTokens.toLocaleString()} tokens total
          </p>
        )}
      </div>
    </div>
  );
}
