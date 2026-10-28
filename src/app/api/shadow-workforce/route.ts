import { z } from "zod";
import { fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { AGENTS, AGENT_IDS } from "@/lib/shadow-workforce/agents";
import { compileBrief } from "@/lib/shadow-workforce/brief";

export const dynamic = "force-dynamic";

const BriefSchema = z.object({
  deliverables: z
    .array(
      z.object({
        agentId: z.enum(AGENT_IDS),
        title: z.string().trim().max(200),
        output: z.string().trim().max(200),
        at: z.string().trim().max(10),
        humanMinutes: z.number().min(0).max(1440),
      }),
    )
    .max(500),
  handoffs: z.number().int().min(0).max(10_000).default(0),
});

export const OPTIONS = preflight;

export function GET() {
  return ok({
    engine: "Aware Shadow Workforce",
    status: "operational",
    agents: AGENTS.map((a) => ({ id: a.id, name: a.name, role: a.role })),
    usage: "POST { deliverables, handoffs } to compile the morning brief.",
  });
}

export async function POST(req: Request) {
  if (rateLimited(req, "shadow-workforce", 30)) return fail(429, "Too many requests. Try again in a minute.");
  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const parsed = BriefSchema.safeParse(json.body);
  if (!parsed.success) return fail(422, "Invalid brief payload.", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  return ok(compileBrief(parsed.data.deliverables, parsed.data.handoffs));
}
