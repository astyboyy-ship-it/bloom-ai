"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ArchitectureSpec } from "@/lib/architect/schema";
import { SpecReview } from "./spec-review";

const PRESETS = [
  {
    label: "B2B Multi-Agent Agency",
    name: "Agency Delivery Engine",
    text: "I run a B2B marketing agency. For each new client we research their market and competitors, draft positioning and a 90-day campaign plan, have a strategist audit it for brand and compliance risk, then produce channel-specific deliverables (LinkedIn posts, cold email sequences, landing page copy). Inputs are client briefs, call transcripts, and their existing site content.",
  },
  {
    label: "DevOps IaC / Cloud",
    name: "Cloud Infra Copilot",
    text: "I'm a platform engineer managing AWS infrastructure with Terraform across 40 modules and 3 environments. I need to turn feature requests into Terraform changes, review plans for security misconfigurations (open security groups, unencrypted storage, IAM wildcards), estimate cost impact, and write the PR description and rollback runbook. I work from our module repo, internal runbooks, and plan output.",
  },
  {
    label: "VC Due Diligence",
    name: "Diligence Desk",
    text: "I'm an associate at a Series A venture fund. For each deal I parse the pitch deck, data room financials, and cap table; benchmark metrics (ARR growth, NRR, burn multiple, CAC payback) against comparables; flag inconsistencies and red flags between the deck and the financials; and produce an investment memo with a risk matrix for the partner meeting.",
  },
];

const STAGES = [
  "Parsing workflow and domain vocabulary",
  "Selecting agent topology",
  "Writing role-specific system prompts",
  "Designing model routing and token budgets",
  "Recommending tool integrations and RAG strategy",
  "Compiling output schemas",
];

const STEPS = ["Describe workflow", "Architect", "Review & launch"];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spec, setSpec] = useState<ArchitectureSpec | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);

  // Cosmetic stage ticker while the single architect call runs.
  useEffect(() => {
    if (step !== 1) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 9000);
    return () => clearInterval(t);
  }, [step]);

  const canSubmit = name.trim().length >= 2 && description.trim().length >= 40;

  async function architect() {
    setError(null);
    setStep(1);
    try {
      const res = await fetch("/api/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          workflowDescription: description,
          workspaceId: workspaceId ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?.details?.workspaceId) setWorkspaceId(json.error.details.workspaceId);
        throw new Error(json.error?.message ?? `Request failed (${res.status})`);
      }
      setSpec(json.spec);
      setWorkspaceId(json.workspaceId);
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Architecture generation failed";
      setError(message);
      toast.error(message);
      setStep(0);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                i < step && "border-primary bg-primary text-primary-foreground",
                i === step && "border-primary text-primary",
                i > step && "text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("truncate", i === step ? "font-medium" : "text-muted-foreground")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-2 h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Describe how you actually work</CardTitle>
            <CardDescription>
              Be specific about inputs, the steps you take, where judgment matters, and what you
              deliver. The architect turns this into agents, prompts, model routes, and tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setName(p.name);
                    setDescription(p.text);
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Diligence Desk"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-desc">Your workflow</Label>
              <Textarea
                id="ws-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="I'm a … Every week I … My inputs are … The hard part is … I deliver …"
                className="min-h-56 resize-y"
                maxLength={12000}
              />
              <p className="text-right text-xs text-muted-foreground">
                {description.trim().length < 40
                  ? `${40 - description.trim().length} more characters needed`
                  : `${description.length.toLocaleString()} / 12,000`}
              </p>
            </div>
            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={architect} disabled={!canSubmit}>
              <Sparkles /> Architect my environment
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Loader2 className="size-5 animate-spin" /> Architecting {name}
            </CardTitle>
            <CardDescription>
              Claude is reasoning through your workflow. This usually takes one to three minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={((stage + 1) / STAGES.length) * 90} />
            <ul className="space-y-3 text-sm">
              {STAGES.map((s, i) => (
                <li
                  key={s}
                  className={cn(
                    "flex items-center gap-3 transition-opacity",
                    i > stage && "opacity-40",
                  )}
                >
                  {i < stage ? (
                    <Check className="size-4 text-primary" />
                  ) : i === stage ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <span className="size-4 rounded-full border" />
                  )}
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {step === 2 && spec && workspaceId && (
        <div className="space-y-6">
          <SpecReview spec={spec} />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft /> Refine description
            </Button>
            <Button onClick={() => router.push(`/workspaces/${workspaceId}`)}>
              Launch workspace <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
