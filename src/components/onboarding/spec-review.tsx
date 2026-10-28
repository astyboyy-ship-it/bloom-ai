import { Bot, Database, GitBranch, Route, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArchitectureSpec } from "@/lib/architect/schema";

const TIER_STYLE: Record<string, string> = {
  fast: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  balanced: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
  deep: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30",
};

export function TierBadge({ tier }: { tier: string }) {
  const key = tier.toLowerCase();
  return (
    <Badge variant="outline" className={TIER_STYLE[key]}>
      {key}
    </Badge>
  );
}

export function SpecReview({ spec }: { spec: ArchitectureSpec }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{spec.domain}</Badge>
            <Badge variant="secondary" className="gap-1">
              <GitBranch className="size-3" /> {spec.topology.type.replace("_", " ")}
            </Badge>
          </div>
          <CardTitle className="text-2xl">Your generated environment</CardTitle>
          <CardDescription className="text-base">{spec.summary}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Why this topology: </span>
          {spec.topology.rationale}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <Bot className="size-4" /> Agents ({spec.agents.length})
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {spec.agents.map((a, i) => (
            <Card key={a.name} className="gap-3">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {a.name}
                  </CardTitle>
                  <TierBadge tier={a.tier} />
                </div>
                <CardDescription>
                  <span className="capitalize">{a.role}</span> · {a.responsibility}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-4 rounded-md bg-muted p-3 font-mono text-xs">
                  {a.system_prompt}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Route className="size-4" /> Model routing
            </CardTitle>
            <CardDescription>
              {spec.routing.max_tokens_per_request.toLocaleString()} tokens / request ·{" "}
              {spec.routing.monthly_token_budget.toLocaleString()} tokens / month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {spec.routing.rules.map((r) => (
              <div key={r.task_type} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.task_type}</p>
                  <p className="text-xs text-muted-foreground">{r.rationale}</p>
                </div>
                <TierBadge tier={r.tier} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4" /> Tool integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {spec.tool_integrations.length === 0 && (
              <p className="text-muted-foreground">No external tools needed.</p>
            )}
            {spec.tool_integrations.map((t) => (
              <div key={t.name}>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t.name}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {t.kind.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t.purpose}</p>
              </div>
            ))}
            <div className="flex items-start gap-2 border-t pt-3">
              <Database className="mt-0.5 size-4 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {spec.rag.enabled ? (
                  <>
                    <span className="font-medium text-foreground">RAG on</span> ·{" "}
                    {spec.rag.strategy} chunks of {spec.rag.chunk_size} chars (
                    {spec.rag.chunk_overlap} overlap). {spec.rag.rationale}
                  </>
                ) : (
                  <>RAG off. {spec.rag.rationale}</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
