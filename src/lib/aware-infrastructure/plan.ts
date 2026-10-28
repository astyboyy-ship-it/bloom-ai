import { INSTANCE_CAPACITY_RPS, NODE_CAPACITY_RPS, getRegion, type RegionId } from "./regions";

export type ScalingPlan = {
  incidentId: string;
  region: RegionId;
  city: string;
  rps: number;
  capacityRps: number;
  overflowRps: number;
  provision: { region: RegionId; instances: number }[];
  totalInstances: number;
  reroute: { from: RegionId; to: RegionId; sharePct: number }[];
  latency: { beforeP95Ms: number; afterP95Ms: number };
  coldStartMs: number;
  costPerHourUsd: number;
  steps: string[];
  source: "planner";
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Deterministic auto-scaling plan for a traffic spike on one region: absorb what the region can,
 * shed a share to its neighbours, and burst serverless instances for the remainder.
 */
export function planSpike(input: { rps: number; region: RegionId; healthyNodes: number }): ScalingPlan {
  const region = getRegion(input.region);
  const nodes = Math.max(1, Math.min(input.healthyNodes, region.nodes));
  const capacityRps = nodes * NODE_CAPACITY_RPS;
  const overflowRps = Math.max(0, input.rps - capacityRps);

  // Neighbours take up to 35% of the overflow, split by how many nodes they run.
  const neighbors = region.neighbors.map(getRegion);
  const neighborNodes = neighbors.reduce((s, n) => s + n.nodes, 0);
  const shedRps = Math.min(overflowRps * 0.35, neighborNodes * NODE_CAPACITY_RPS * 0.4);
  const reroute = neighbors.map((n) => ({
    from: region.id,
    to: n.id,
    sharePct: overflowRps ? round1(((shedRps * n.nodes) / neighborNodes / input.rps) * 100) : 0,
  }));

  const burstRps = overflowRps - shedRps;
  const localInstances = Math.ceil(burstRps / INSTANCE_CAPACITY_RPS);
  // Neighbours pre-warm a small reserve so the rerouted share never lands cold.
  const provision = [
    { region: region.id, instances: localInstances },
    ...neighbors.map((n) => ({ region: n.id, instances: overflowRps ? Math.max(2, Math.ceil((shedRps * n.nodes) / neighborNodes / INSTANCE_CAPACITY_RPS)) : 0 })),
  ].filter((p) => p.instances > 0);
  const totalInstances = provision.reduce((s, p) => s + p.instances, 0);

  const load = input.rps / capacityRps;
  const beforeP95Ms = round1(Math.min(480, 6 + Math.max(0, load - 1) * 9));
  const afterP95Ms = round1(6.2 + Math.min(3.2, totalInstances / 120));

  const incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;
  return {
    incidentId,
    region: region.id,
    city: region.city,
    rps: input.rps,
    capacityRps,
    overflowRps,
    provision,
    totalInstances,
    reroute,
    latency: { beforeP95Ms, afterP95Ms },
    coldStartMs: 180,
    costPerHourUsd: Math.round(totalInstances * 0.046 * 100) / 100,
    steps: overflowRps
      ? [
          `Detected ${Math.round(input.rps / 1000)}k req/s on ${region.city}, ${Math.round(load * 100)}% of edge capacity`,
          `Burst ${localInstances} serverless instances in ${region.id} (cold start ~180 ms)`,
          `Shed ${Math.round((shedRps / input.rps) * 100)}% of traffic to ${neighbors.map((n) => n.city).join(", ")}`,
          `Pre-warm ${totalInstances - localInstances} reserve instances in neighbouring regions`,
          `Hold p95 at ~${afterP95Ms} ms, then drain burst capacity when traffic subsides`,
        ]
      : [`${Math.round(input.rps / 1000)}k req/s is within ${region.city}'s edge capacity; no scaling needed`],
    source: "planner",
  };
}
