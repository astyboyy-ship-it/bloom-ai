import { z } from "zod";
import { fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { planSpike } from "@/lib/aware-infrastructure/plan";
import { INSTANCE_CAPACITY_RPS, NODE_CAPACITY_RPS, REGIONS, REGION_IDS, TOTAL_NODES } from "@/lib/aware-infrastructure/regions";

export const dynamic = "force-dynamic";

const SpikeSchema = z.object({
  rps: z.number().int().min(1_000).max(5_000_000),
  region: z.enum(REGION_IDS),
  healthyNodes: z.number().int().min(1).max(TOTAL_NODES).default(TOTAL_NODES),
});

export const OPTIONS = preflight;

export function GET() {
  return ok({
    engine: "Aware Infrastructure Architect",
    status: "operational",
    regions: REGIONS.map((r) => ({ id: r.id, city: r.city, nodes: r.nodes })),
    totalNodes: TOTAL_NODES,
    nodeCapacityRps: NODE_CAPACITY_RPS,
    instanceCapacityRps: INSTANCE_CAPACITY_RPS,
    usage: "POST { rps, region, healthyNodes } to receive an auto-scaling and rerouting plan.",
  });
}

export async function POST(req: Request) {
  if (rateLimited(req, "aware-infrastructure", 30)) return fail(429, "Too many requests. Try again in a minute.");
  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const parsed = SpikeSchema.safeParse(json.body);
  if (!parsed.success) return fail(422, "Invalid spike payload.", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  return ok(planSpike(parsed.data));
}
