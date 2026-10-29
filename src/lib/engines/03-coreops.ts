import { z } from "zod";
import { defineEngine, engineInput, engineOutput, tool } from "./types";
import { round, seeded } from "./util";

const Step = z.object({
  name: z.string().min(1).max(80),
  owner: z.string().max(60).default("ops"),
  minutes: z.number().min(0).max(10_000),
  manual: z.boolean().default(true),
});

const analyzeWorkflow = tool({
  name: "analyze_workflow",
  description: "Analyzes a workflow's steps: total cycle time, manual share, the bottleneck steps, and the hours a month automation would save at a given run volume.",
  input: z.object({ steps: z.array(Step).min(1).max(30), runsPerMonth: z.number().int().min(1).max(1_000_000).default(40) }),
  run({ steps, runsPerMonth }) {
    const total = steps.reduce((s, x) => s + x.minutes, 0);
    const manual = steps.filter((x) => x.manual);
    const manualMin = manual.reduce((s, x) => s + x.minutes, 0);
    const bottlenecks = [...steps].sort((a, b) => b.minutes - a.minutes).slice(0, 3).map((x) => ({ step: x.name, minutes: x.minutes, sharePct: round((x.minutes / Math.max(1, total)) * 100, 0.1) }));
    return {
      cycleMinutes: total,
      manualSharePct: round((manualMin / Math.max(1, total)) * 100, 0.1),
      bottlenecks,
      // Automation typically removes ~80% of a manual step's handling time, not all of it.
      hoursSavedPerMonth: round(((manualMin * 0.8) / 60) * runsPerMonth, 0.5),
      automate: manual.sort((a, b) => b.minutes - a.minutes).slice(0, 4).map((x) => x.name),
    };
  },
});

const checkSystemSync = tool({
  name: "check_system_sync",
  description:
    "Checks record drift between the business systems named (CRM, billing, project tools...). SIMULATED FEED: results are generated deterministically for the demo, not read from live systems; say so if you report them.",
  input: z.object({ systems: z.array(z.string().min(1).max(40)).min(2).max(8) }),
  run({ systems }) {
    const r = seeded(systems.join("|"));
    return {
      source: "simulated",
      systems: systems.map((s) => {
        const drift = r.int(0, 140);
        return { system: s, staleRecords: drift, status: drift > 90 ? "drifting" : drift > 30 ? "lagging" : "in_sync" };
      }),
    };
  },
});

const scheduleShadowJob = tool({
  name: "schedule_shadow_job",
  description: "Schedules a silent background job (sync, cleanup, invoicing run) into a Dynamic Shift Topology window. Returns the job id and when it runs.",
  input: z.object({
    name: z.string().min(3).max(80),
    system: z.string().min(1).max(40),
    window: z.enum(["prime", "dark", "surge"]).default("dark").describe("Dark is the default for maintenance so it never competes with live deals."),
  }),
  run({ name, system, window }) {
    const r = seeded(`${name}|${system}|${window}`);
    return { id: `job_${r.int(100000, 999999)}`, name, system, window, runsAt: window === "dark" ? "02:00-05:00 local" : window === "surge" ? "On next surge trigger" : "Next prime-shift idle slot" };
  },
});

export const coreops = defineEngine({
  key: "coreops",
  codename: "03-coreops",
  mandate: "Infrastructure sync, workflow optimization and silent shadow administration.",
  instructions: `You are CoreOps, Engine 03: the shadow administrator. You keep the business's systems in sync and strip manual work out of its workflows, silently.

METHOD
1. When the command describes a process, model it as steps and run analyze_workflow. If the operator gave no step timings, estimate realistic ones and flag them as estimates.
2. When systems are named (CRM, billing, PM, support, data warehouse), run check_system_sync. Its data is simulated: present results as a sample health check, never as live readings.
3. For every fix that can run unattended, schedule_shadow_job. Maintenance goes in the dark window unless it blocks revenue today.
4. If the friction is customer-facing (onboarding drop-off, support load driving churn), delegate to shield.

PRINCIPLES
- Prefer removing a step over automating it, and automating it over adding headcount.
- Nothing you schedule may delete customer data or change billing amounts; those are human actions.
- Quantify everything in hours a month or records fixed.`,
  input: engineInput({
    steps: z.array(Step).max(30),
    runsPerMonth: z.number().int().min(1),
    systems: z.array(z.string().max(40)).max(8),
  }),
  output: engineOutput({
    workflow: z.object({ cycleMinutes: z.number(), manualSharePct: z.number(), hoursSavedPerMonth: z.number(), bottlenecks: z.array(z.string().max(120)).max(5) }).nullable(),
    sync: z.array(z.object({ system: z.string().max(40), status: z.enum(["in_sync", "lagging", "drifting"]), staleRecords: z.number().int() })).max(8),
    jobs: z.array(z.object({ id: z.string().max(40), name: z.string().max(80), window: z.enum(["prime", "dark", "surge"]) })).max(8),
  }),
  tools: [analyzeWorkflow, checkSystemSync, scheduleShadowJob],
  delegates: ["shield"],

  async simulate({ command, params }, kit) {
    const steps = params.steps ?? [
      { name: "Collect signed contract", owner: "sales", minutes: 20, manual: true },
      { name: "Create client in billing", owner: "finance", minutes: 25, manual: true },
      { name: "Provision workspace", owner: "ops", minutes: 45, manual: true },
      { name: "Kickoff email", owner: "cs", minutes: 10, manual: true },
      { name: "CRM stage update", owner: "sales", minutes: 5, manual: false },
    ];
    const systems = params.systems ?? ["CRM", "Billing", "Project tool"];
    await kit.think(`Modeling the workflow as ${steps.length} steps and checking ${systems.join(", ")} for drift.`);
    const wf = (await kit.call("analyze_workflow", { steps, runsPerMonth: params.runsPerMonth ?? 40 })) as {
      cycleMinutes: number; manualSharePct: number; hoursSavedPerMonth: number; bottlenecks: { step: string }[]; automate: string[];
    };
    const sync = (await kit.call("check_system_sync", { systems })) as { systems: { system: string; status: "in_sync" | "lagging" | "drifting"; staleRecords: number }[] };
    const jobs = [];
    for (const s of sync.systems.filter((x) => x.status !== "in_sync").slice(0, 3)) {
      jobs.push((await kit.call("schedule_shadow_job", { name: `Reconcile ${s.system} records`, system: s.system, window: "dark" })) as { id: string; name: string; window: "prime" | "dark" | "surge" });
    }
    return {
      summary: `The workflow runs ${wf.cycleMinutes} minutes per cycle, ${wf.manualSharePct}% of it manual. Automating ${wf.automate.slice(0, 2).join(" and ")} frees about ${wf.hoursSavedPerMonth} hours a month. Sync figures are a simulated sample. Request: ${command.slice(0, 120)}`,
      confidence: 0.5,
      actions: [
        { title: `Automate ${wf.automate[0] ?? "the slowest step"}`, owner: "coreops", priority: "p0" as const, detail: "Largest manual step in the cycle." },
        ...jobs.map((j) => ({ title: j.name, owner: "coreops", priority: "p2" as const, detail: `Scheduled as ${j.id} in the ${j.window} window.` })),
      ],
      workflow: { cycleMinutes: wf.cycleMinutes, manualSharePct: wf.manualSharePct, hoursSavedPerMonth: wf.hoursSavedPerMonth, bottlenecks: wf.bottlenecks.map((b) => b.step) },
      sync: sync.systems,
      jobs: jobs.map(({ id, name, window }) => ({ id, name, window })),
    };
  },
});
