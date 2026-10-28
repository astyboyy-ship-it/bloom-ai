"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Gauge, HeartPulse, Loader2, Server, Shuffle, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ScalingPlan } from "@/lib/aware-infrastructure/plan";
import { NODE_CAPACITY_RPS, REGIONS, TOTAL_NODES, getRegion, type RegionId } from "@/lib/aware-infrastructure/regions";
import { DemoShell } from "./shared/demo-shell";
import { clock, compact, fmt, pick, rng, useInterval } from "./shared/sim";
import { Chip, DemoSection, LiveLog, Panel, ProcessDeepDive, ShiftSchedule, Stat, type LogEntry } from "./shared/ui";

type NodeStatus = "ok" | "hot" | "failed" | "healing" | "burst";
type EdgeNode = { id: string; region: RegionId; x: number; y: number; load: number; status: NodeStatus };
type Phase = "steady" | "detect" | "provision" | "reroute" | "stable";

const BASELINE_RPS = 42_000;
const SPIKE_RPS = 500_000;
const TICK_MS = 250;
const AUTO_SPIKE_MS = 32_000;

// Fixed seed so server and client lay the nodes out identically.
function layoutNodes(): EdgeNode[] {
  const r = rng(54);
  return REGIONS.flatMap((reg) =>
    Array.from({ length: reg.nodes }, (_, i) => ({
      id: `${reg.id}-${i}`,
      region: reg.id,
      x: Math.round(reg.x + (r() - 0.5) * 34),
      y: Math.round(reg.y + (r() - 0.5) * 26),
      load: 30 + Math.round(r() * 25),
      status: "ok" as NodeStatus,
    })),
  );
}

const LINKS = (() => {
  const seen = new Set<string>();
  const out: { a: RegionId; b: RegionId }[] = [];
  for (const reg of REGIONS)
    for (const n of reg.neighbors) {
      const key = [reg.id, n].sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ a: reg.id, b: n });
      }
    }
  return out;
})();

const linkPath = (a: RegionId, b: RegionId) => {
  const A = getRegion(a);
  const B = getRegion(b);
  const mx = (A.x + B.x) / 2;
  const my = (A.y + B.y) / 2 - Math.min(60, Math.hypot(B.x - A.x, B.y - A.y) * 0.18);
  return `M${A.x} ${A.y} Q${Math.round(mx)} ${Math.round(my)} ${B.x} ${B.y}`;
};

const NODE_COLOR: Record<NodeStatus, string> = {
  ok: "#8ff0ff",
  hot: "#ff9b78",
  failed: "#ff4d4d",
  healing: "#f3d48f",
  burst: "#f7e2a8",
};

export function AwareInfrastructureDemo() {
  const [nodes, setNodes] = useState<EdgeNode[]>(layoutNodes);
  const [burst, setBurst] = useState<EdgeNode[]>([]);
  const [phase, setPhase] = useState<Phase>("steady");
  const [rps, setRps] = useState(BASELINE_RPS);
  const [history, setHistory] = useState<number[]>(() => Array(80).fill(BASELINE_RPS));
  const [p95, setP95] = useState(6.4);
  const [instances, setInstances] = useState(0);
  const [plan, setPlan] = useState<ScalingPlan | null>(null);
  const [heals, setHeals] = useState(0);
  const [reroutes, setReroutes] = useState(0);
  const [spikes, setSpikes] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const target = useRef({ rps: BASELINE_RPS, p95: 6.4, instances: 0 });
  const r = useRef(rng(Date.now() % 9973));
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const lastSpike = useRef(0);
  const healthyRef = useRef(TOTAL_NODES);

  const push = (text: string, tone: LogEntry["tone"] = "muted") =>
    setLog((l) => [{ id: `${Date.now()}-${Math.random()}`, time: clock(), text, tone }, ...l].slice(0, 40));
  const later = (ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  useEffect(() => {
    lastSpike.current = Date.now() - AUTO_SPIKE_MS + 4000; // first spike a few seconds after load
    push("Topology online: 54 edge nodes across 14 regions, all health checks green", "cyan");
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const healthy = nodes.filter((n) => n.status === "ok" || n.status === "hot").length;
  healthyRef.current = healthy;

  const spike = async () => {
    if (phase !== "steady") return;
    const region = pick(r.current, ["us-east", "eu-central", "ap-southeast", "us-west", "ap-northeast"] as RegionId[]);
    const city = getRegion(region).city;
    lastSpike.current = Date.now();
    setSpikes((s) => s + 1);
    setPhase("detect");
    target.current = { ...target.current, rps: SPIKE_RPS, p95: 38 };
    setNodes((ns) => ns.map((n) => (n.region === region ? { ...n, status: "hot", load: 97 } : n)));
    push(`Anomaly: traffic on ${city} climbing to ${compact(SPIKE_RPS)} req/s, p95 degrading`, "ember");

    let p: ScalingPlan;
    try {
      const res = await fetch("/api/aware-infrastructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rps: SPIKE_RPS, region, healthyNodes: healthyRef.current }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Planner unavailable.");
      p = json as ScalingPlan;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Planner unavailable.");
      setNodes((ns) => ns.map((n) => (n.status === "hot" ? { ...n, status: "ok", load: 45 } : n)));
      target.current = { rps: BASELINE_RPS, p95: 6.4, instances: 0 };
      setPhase("steady");
      return;
    }
    setPlan(p);
    push(`${p.incidentId} · plan received from /api/aware-infrastructure: ${p.totalInstances} instances, ${p.reroute.length} reroutes`, "gold");

    later(900, () => {
      setPhase("provision");
      target.current = { ...target.current, instances: p.totalInstances, p95: 21 };
      const reg = getRegion(region);
      setBurst(
        Array.from({ length: Math.min(8, p.provision[0]?.instances ?? 0) }, (_, i) => ({
          id: `burst-${i}`,
          region,
          x: Math.round(reg.x + Math.cos(i * 0.8) * 30),
          y: Math.round(reg.y + Math.sin(i * 0.8) * 22),
          load: 60,
          status: "burst" as NodeStatus,
        })),
      );
      push(`Provisioning ${p.totalInstances} serverless instances (cold start ~${p.coldStartMs} ms)`, "cyan");
    });
    later(2100, () => {
      setPhase("reroute");
      setReroutes((x) => x + p.reroute.length);
      setNodes((ns) => ns.map((n) => (n.region === region ? { ...n, status: "hot", load: 72 } : n)));
      p.reroute.forEach((rt) => push(`Rerouting ${rt.sharePct}% of traffic ${rt.from} → ${rt.to}`, "cyan"));
    });
    later(3400, () => {
      setPhase("stable");
      target.current = { ...target.current, p95: p.latency.afterP95Ms };
      setNodes((ns) => ns.map((n) => (n.region === region ? { ...n, status: "ok", load: 58 } : n)));
      push(`Stabilised: ${compact(SPIKE_RPS)} req/s served at p95 ${p.latency.afterP95Ms} ms, zero dropped requests`, "gold");
    });
    later(11000, () => {
      target.current = { rps: BASELINE_RPS, p95: 6.4, instances: 0 };
      push("Spike subsided; draining burst capacity back to baseline", "muted");
    });
    later(14500, () => {
      setBurst([]);
      setPhase("steady");
    });
  };

  useInterval(() => {
    const rand = r.current;
    const t = target.current;
    const nextRps = Math.max(1000, rps + (t.rps - rps) * 0.22 + (rand() - 0.5) * 2200);
    setRps(nextRps);
    setHistory((h) => [...h.slice(1), nextRps]);
    setP95((v) => Math.max(4.8, v + (t.p95 - v) * 0.25 + (rand() - 0.5) * 0.4));
    setInstances((v) => Math.round(v + (t.instances - v) * 0.3));

    // Random hardware failure, detected and replaced without a human.
    const candidates = nodes.filter((n) => n.status === "ok");
    const victim = rand() < 0.035 && candidates.length ? pick(rand, candidates) : null;
    const jitter = nodes.map(() => (rand() - 0.5) * 8);
    setNodes((ns) =>
      ns.map((n, i) =>
        n.id === victim?.id
          ? { ...n, status: "failed" }
          : n.status === "ok"
            ? { ...n, load: Math.max(18, Math.min(88, n.load + (jitter[i] ?? 0))) }
            : n,
      ),
    );
    if (victim) {
      push(`Health check failed on ${victim.id}; draining connections`, "ember");
      later(1000, () => {
        setNodes((cur) => cur.map((n) => (n.id === victim.id ? { ...n, status: "healing" } : n)));
        push(`Replacing ${victim.id} with a fresh instance`, "muted");
      });
      later(2200, () => {
        setNodes((cur) => cur.map((n) => (n.id === victim.id ? { ...n, status: "ok", load: 30 } : n)));
        setHeals((h) => h + 1);
        push(`${victim.id} self-healed and back in rotation`, "cyan");
      });
    }

    if (Date.now() - lastSpike.current > AUTO_SPIKE_MS) spike();
  }, TICK_MS);

  const activeRoutes = phase === "reroute" || phase === "stable" ? plan?.reroute ?? [] : [];
  const maxHist = Math.max(...history, BASELINE_RPS * 2);
  const spark = useMemo(
    () => history.map((v, i) => `${(i / (history.length - 1)) * 300},${(60 - (v / maxHist) * 56).toFixed(1)}`).join(" "),
    [history, maxHist],
  );

  return (
    <DemoShell
      slug="infrastructure"
      kicker="The Self-Healing Architecture"
      title="Aware Infrastructure Control Plane"
      pulse={phase === "detect" || phase === "provision"}
      chips={
        <>
          <Chip>{phase === "steady" ? "All regions nominal" : `Incident · ${phase}`}</Chip>
          <Chip tone="cyan">Simulated topology · live planner API</Chip>
        </>
      }
      actions={
        <button
          type="button"
          onClick={spike}
          disabled={phase !== "steady"}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f3e2b8] px-4 text-[13px] font-semibold text-[#1a0f05] shadow-[0_0_40px_-10px_rgb(243_212_143/0.8)] disabled:opacity-50"
        >
          {phase === "steady" ? <Zap className="size-4" /> : <Loader2 className="size-4 animate-spin" />} Inject 500k req/s spike
        </button>
      }
    >
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Requests / sec" value={compact(rps)} sub={`baseline ${compact(BASELINE_RPS)}`} accent />
        <Stat label="p95 latency" value={`${p95.toFixed(1)} ms`} sub={p95 < 10 ? "within SLO (<10 ms)" : "absorbing spike"} />
        <Stat label="Healthy nodes" value={`${healthy}/${TOTAL_NODES}`} sub="edge fleet" />
        <Stat label="Burst instances" value={fmt(instances)} sub="serverless, on demand" />
        <Stat label="Self-heals" value={fmt(heals)} sub="nodes replaced" />
        <Stat label="Reroutes" value={fmt(reroutes)} sub={`${spikes} spikes absorbed`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-8" kicker="Live node topology" title="54 edge nodes, self-optimising">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-ink/50">
            <svg viewBox="0 0 1000 480" className="block w-full" role="img" aria-label="Edge node topology">
              <defs>
                <pattern id="ai-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.9" fill="rgb(255 255 255 / 0.07)" />
                </pattern>
              </defs>
              <rect width="1000" height="480" fill="url(#ai-grid)" />
              {LINKS.map((l) => (
                <path key={`${l.a}-${l.b}`} d={linkPath(l.a, l.b)} fill="none" stroke="rgb(143 240 255 / 0.12)" strokeWidth="1" />
              ))}
              {activeRoutes.map((rt) => (
                <path
                  key={`rt-${rt.to}`}
                  d={linkPath(rt.from, rt.to)}
                  fill="none"
                  stroke="#f3d48f"
                  strokeWidth="2.2"
                  strokeDasharray="6 6"
                  className="animate-demo-dash"
                  style={{ filter: "drop-shadow(0 0 4px rgb(243 212 143 / 0.8))" }}
                />
              ))}
              {REGIONS.map((reg) => (
                <text key={reg.id} x={reg.x} y={reg.y + 30} textAnchor="middle" className="fill-white/40 font-mono" style={{ fontSize: 10 }}>
                  {reg.city}
                </text>
              ))}
              {[...nodes, ...burst].map((n) => (
                <g key={n.id}>
                  {(n.status === "hot" || n.status === "failed" || n.status === "burst") && (
                    <circle cx={n.x} cy={n.y} r={n.status === "burst" ? 7 : 10} fill={NODE_COLOR[n.status]} opacity={0.2} className="animate-pulse" />
                  )}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.status === "burst" ? 3 : 3.2 + n.load / 40}
                    fill={NODE_COLOR[n.status]}
                    opacity={n.status === "ok" ? 0.55 + n.load / 250 : 1}
                    style={{ transition: "r 0.4s, fill 0.4s" }}
                  />
                </g>
              ))}
            </svg>
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
              {(["ok", "hot", "failed", "healing", "burst"] as NodeStatus[]).map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: NODE_COLOR[s] }} /> {s}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
              <span className="flex items-center gap-1.5">
                <Activity className="size-3.5 text-[#8ff0ff]" /> Global request rate
              </span>
              <span className="tabular-nums text-white/70">{fmt(rps)} req/s</span>
            </div>
            <svg viewBox="0 0 300 60" preserveAspectRatio="none" className="mt-2 h-16 w-full">
              <polyline points={`0,60 ${spark} 300,60`} fill="rgb(243 212 143 / 0.12)" stroke="none" />
              <polyline points={spark} fill="none" stroke="#f3d48f" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        </Panel>

        <Panel
          className="xl:col-span-4"
          kicker="Incident console"
          title={plan ? plan.incidentId : "Waiting for an anomaly"}
          right={phase !== "steady" ? <Loader2 className="size-4 animate-spin text-[#8ff0ff]" /> : undefined}
        >
          {plan ? (
            <div className="space-y-5">
              <ol className="grid grid-cols-4 gap-1">
                {(["detect", "provision", "reroute", "stable"] as Phase[]).map((ph, i) => {
                  const order = ["detect", "provision", "reroute", "stable"];
                  const reached = phase === "steady" || order.indexOf(phase) >= i;
                  return (
                    <li
                      key={ph}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.14em]",
                        reached ? "border-[#f0d59a]/40 text-[#f3e2b8]" : "border-white/10 text-white/30",
                      )}
                    >
                      {ph}
                    </li>
                  );
                })}
              </ol>
              <ul className="space-y-2">
                {plan.steps.map((s) => (
                  <li key={s} className="flex gap-2.5 text-[13px] text-white/75">
                    <Gauge className="mt-0.5 size-3.5 shrink-0 text-[#f3d48f]" /> {s}
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-[12px]">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">p95 before → after</p>
                  <p className="mt-1 font-display text-2xl text-white">
                    {plan.latency.beforeP95Ms} → <span className="text-gold-metal">{plan.latency.afterP95Ms} ms</span>
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">Burst cost</p>
                  <p className="mt-1 font-display text-2xl text-white">${plan.costPerHourUsd}/h</p>
                </div>
              </div>
              <ul className="space-y-1.5 border-t border-white/10 pt-4">
                {plan.provision.map((p) => (
                  <li key={p.region} className="flex justify-between font-mono text-[11px] text-white/60">
                    <span className="flex items-center gap-1.5">
                      <Server className="size-3 text-[#8ff0ff]" /> {p.region}
                    </span>
                    <span className="tabular-nums">+{p.instances} instances</span>
                  </li>
                ))}
                {plan.reroute.map((rt) => (
                  <li key={rt.to} className="flex justify-between font-mono text-[11px] text-white/45">
                    <span className="flex items-center gap-1.5">
                      <Shuffle className="size-3 text-[#f3d48f]" /> → {rt.to}
                    </span>
                    <span className="tabular-nums">{rt.sharePct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[13px] text-white/45">
              A {compact(SPIKE_RPS)} req/s spike lands automatically every half minute, or inject one now. The planner API decides how many instances to burst and where to shed traffic.
            </p>
          )}
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
              <HeartPulse className="size-3.5 text-[#ff9b78]" /> Live operations
            </p>
            <LiveLog entries={log.slice(0, 8)} />
          </div>
        </Panel>
      </div>

      <DemoSection eyebrow="The process" title="Three movements," accent="under ten milliseconds.">
        <ProcessDeepDive
          steps={[
            {
              title: "Environmental Perception",
              body: "Every node reports load, error rate and latency four times a second. A spike or a failing disk is visible the instant it starts, not when a pager goes off.",
              stat: `${healthy}/${TOTAL_NODES}`,
              statLabel: "nodes reporting healthy",
            },
            {
              title: "Autonomous Reasoning",
              body: `The planner compares demand against ${compact(NODE_CAPACITY_RPS)} req/s per node, decides what neighbours can absorb, and sizes the serverless burst for the remainder.`,
              stat: plan ? `${plan.totalInstances}` : "0",
              statLabel: "instances in the last plan",
            },
            {
              title: "Self-Execution",
              body: "Instances are provisioned, traffic is rerouted, failed nodes are drained and replaced, and the burst is torn down when demand falls. Zero tickets.",
              stat: `${p95.toFixed(1)} ms`,
              statLabel: "p95 latency right now",
            },
          ]}
        />
      </DemoSection>

      <DemoSection eyebrow="Shift automation" title="Infrastructure that" accent="runs its own rota.">
        <ShiftSchedule
          shifts={[
            {
              name: "Peak Traffic Auto-Scaling",
              window: "08:00 – 18:00",
              tasks: ["Watch 54 edge nodes at 4 Hz", "Burst serverless capacity on spikes", "Shed load to neighbouring regions", "Drain burst capacity after the peak"],
              output: `${spikes} spikes absorbed · ${reroutes} reroutes`,
            },
            {
              name: "Database Re-Indexing & Security Audit",
              window: "18:00 – 02:00",
              tasks: ["Rebuild fragmented indexes", "Rotate credentials & TLS certs", "Scan images for new CVEs", "Verify backups restore cleanly"],
              output: "0 critical findings outstanding",
            },
            {
              name: "Zero-Downtime Deployment",
              window: "02:00 – 08:00",
              tasks: ["Canary the release to 2% of traffic", "Compare error budgets against baseline", "Roll forward region by region", "Auto-rollback on any regression"],
              output: `${heals} nodes self-healed this session`,
            },
          ]}
        />
      </DemoSection>

      <DemoSection eyebrow="Automation log" title="Every decision," accent="on the record.">
        <Panel>
          <LiveLog entries={log.slice(0, 18)} className="max-h-[420px]" />
        </Panel>
        <p className="mt-4 text-xs text-white/40">
          The node fleet and traffic are a live simulation. Every spike is planned by the real /api/aware-infrastructure planner.
        </p>
      </DemoSection>
    </DemoShell>
  );
}
