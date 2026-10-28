import { z } from "zod";
import { requireOwnedWorkspace } from "@/lib/auth";
import { handle } from "@/lib/http";
import { executeWorkflow, ndjsonStream } from "@/lib/workflow/execute";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({ input: z.string().trim().min(1).max(50000) });

/** Control Room execution: streams NDJSON run events to the playground. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { workspace } = await requireOwnedWorkspace(id);
  const { input } = Body.parse(await req.json());

  const events = executeWorkflow({ workspace, input, source: "playground", signal: req.signal });
  return new Response(ndjsonStream(events), {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
  });
});
