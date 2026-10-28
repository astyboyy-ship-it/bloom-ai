import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const user = await getCurrentUser();
  const workspaces = await db.workspace.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { config: { select: { topology: true, _count: { select: { agents: true } } } } },
  });

  if (workspaces.length === 0) {
    return (
      <section className="mx-auto max-w-2xl space-y-6 py-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Infrastructure that understands how you work
        </h1>
        <p className="text-lg text-muted-foreground">
          Describe your professional workflow. Get agents with domain-tuned prompts, a model
          routing strategy, tool integrations, and an API endpoint — in minutes.
        </p>
        <Button size="lg" asChild>
          <Link href="/onboarding">
            Start onboarding <ArrowRight />
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
        <Button asChild>
          <Link href="/onboarding">
            <Plus /> New workspace
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((w) => (
          <Link key={w.id} href={w.status === "READY" ? `/workspaces/${w.id}` : "/onboarding"}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="truncate">{w.name}</CardTitle>
                  <Badge variant={w.status === "READY" ? "secondary" : "outline"}>
                    {w.status.toLowerCase()}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-3">
                  {w.summary ?? w.workflowDescription}
                </CardDescription>
                {w.config && (
                  <p className="text-xs text-muted-foreground">
                    {w.config.topology.replace("_", " ").toLowerCase()} · {w.config._count.agents}{" "}
                    agents
                  </p>
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
