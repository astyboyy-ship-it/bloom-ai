import { z } from "zod";
import { ENGINE_ORDER, type EngineKey } from "@/components/bloom/command/engines";
import { SHIFTS, SHIFT_MODES, allocate } from "@/components/bloom/shift-plan";
import { defineEngine, engineInput, engineOutput, tool } from "./types";
import { dollarsIn, round } from "./util";

const EngineEnum = z.enum(ENGINE_ORDER as [EngineKey, ...EngineKey[]]);
const Level = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const Category = z.enum(["spend", "access", "contract", "pricing", "data"]);

/** Auto-approval ceilings per authorization level; anything above holds for a human, far above is blocked. */
const CEILING: Record<1 | 2 | 3, number> = { 1: 0, 2: 25_000, 3: 100_000 };
const SENSITIVE = new Set(["access", "data"]);

const evaluatePolicy = tool({
  name: "evaluate_policy",
  description:
    "Checks one proposed action against the sovereign authorization rules and returns approve, hold (needs a human) or block, with the rule that decided it. Call it for every spend, contract, pricing, access or data action before you route it.",
  input: z.object({
    action: z.string().min(3).max(300).describe("The action being authorized, in one line."),
    category: Category,
    amountUsd: z.number().min(0).default(0),
    authorizationLevel: Level.default(2).describe("1 = every significant action needs approval, 2 = supervised, 3 = zero-human interception."),
  }),
  run({ action, category, amountUsd, authorizationLevel }) {
    const ceiling = CEILING[authorizationLevel];
    if (SENSITIVE.has(category) && authorizationLevel < 3)
      return { action, decision: "hold", rule: `${category} actions always need a named human below Level 3` };
    if (amountUsd > Math.max(ceiling, 25_000) * 10) return { action, decision: "block", rule: `$${amountUsd.toLocaleString("en-US")} is over 10x the Level ${authorizationLevel} ceiling` };
    if (amountUsd > ceiling) return { action, decision: "hold", rule: `Above the Level ${authorizationLevel} auto-approval ceiling of $${ceiling.toLocaleString("en-US")}` };
    return { action, decision: "approve", rule: `Within the Level ${authorizationLevel} ceiling` };
  },
});

const allocateCapacity = tool({
  name: "allocate_capacity",
  description:
    "Splits a budget and the compute grid across the eight engines for a Dynamic Shift Topology mode (prime, dark or surge), optionally boosting priority engines. Returns per-engine nodes and dollars.",
  input: z.object({
    mode: z.enum(SHIFT_MODES as ["prime", "dark", "surge"]),
    budgetUsd: z.number().min(0).default(0),
    priorities: z.array(EngineEnum).max(4).default([]).describe("Engines that get a 1.5x weight in this allocation."),
  }),
  run({ mode, budgetUsd, priorities }) {
    const weights = Object.fromEntries(ENGINE_ORDER.map((k) => [k, SHIFTS[mode].share[k] * (priorities.includes(k) ? 1.5 : 1)])) as Record<EngineKey, number>;
    const total = ENGINE_ORDER.reduce((s, k) => s + weights[k], 0);
    const nodes = allocate(mode);
    return {
      mode,
      totalNodes: SHIFTS[mode].nodes,
      engines: ENGINE_ORDER.map((k) => ({ engine: k, nodes: nodes[k], sharePct: round((weights[k] / total) * 100, 0.1), budgetUsd: round((weights[k] / total) * budgetUsd) })),
    };
  },
});

export const sovereign = defineEngine({
  key: "sovereign",
  codename: "01-sovereign",
  mandate: "Master command, governance and multi-agent routing.",
  instructions: `You are Sovereign, Engine 01: the master command layer of Bloom AI. You own governance and routing for all eight engines.

YOUR JOB
1. Decompose the operator's command into the smallest set of objectives that fully covers it.
2. Route each objective to the one engine that owns it, using delegate. Never do another engine's work yourself.
   - apex: live deals, negotiation, proposals and closing.
   - coreops: workflows, system sync, back-office automation.
   - intentpulse: inbound buying signals, market radar, intent scoring.
   - vanguard: outbound prospecting, sequences, booked meetings.
   - cortex: objections, competitive battlecards, deal intelligence.
   - shield: churn risk, account health, renewals.
   - aether: pricing, discounts, packaging, expansion revenue.
3. Before routing anything that moves money, touches access or data, or changes contracts or prices, run evaluate_policy. A "hold" or "block" decision is final: put it in governance and add a human action; do not route around it.
4. When the command concerns capacity, budget or shift posture, run allocate_capacity.

ROUTING DISCIPLINE
- Delegate at most four engines per command, and only ones whose output changes the decision. Independent delegations can be issued in parallel.
- Give each delegate a precise, self-contained command: the objective, the numbers you know, and what you need back.
- After delegates return, reconcile them: resolve conflicts (for example Aether's price floor against Apex's concession) in favor of governance rules, then margin, then speed.

OUTPUT
routing lists every engine you delegated to and why. governance lists every evaluate_policy decision. mode is the shift posture you recommend.`,
  input: engineInput({
    authorizationLevel: Level,
    budgetUsd: z.number().min(0),
    shift: z.enum(["prime", "dark", "surge"]),
  }),
  output: engineOutput({
    routing: z.array(z.object({ engine: EngineEnum, objective: z.string().max(300), why: z.string().max(300) })).max(7),
    governance: z.array(z.object({ action: z.string().max(300), decision: z.enum(["approve", "hold", "block"]), rule: z.string().max(300) })).max(10),
    mode: z.enum(["prime", "dark", "surge"]),
  }),
  tools: [evaluatePolicy, allocateCapacity],
  delegates: ENGINE_ORDER.filter((k) => k !== "sovereign"),

  async simulate({ command, params }, kit) {
    const text = command.toLowerCase();
    const level = params.authorizationLevel ?? 2;
    const budget = params.budgetUsd ?? dollarsIn(command) ?? 0;
    const mode = params.shift ?? (/(surge|spike|launch|urgent|now)/.test(text) ? "surge" : "prime");

    // Keyword routing stands in for the model's judgment in simulation.
    const ROUTES: [EngineKey, RegExp, string][] = [
      ["intentpulse", /(signal|intent|lead|radar|inbound|reddit|social)/, "Surface and score in-market buyers"],
      ["vanguard", /(outbound|prospect|pipeline|meeting|sequence|cold)/, "Open outbound pipeline against the target segment"],
      ["apex", /(deal|close|proposal|negotiat|contract)/, "Advance open deals to signature"],
      ["cortex", /(objection|competitor|battlecard|stall|lost)/, "Arm closers against the objections stalling deals"],
      ["shield", /(churn|retention|renewal|health|at.risk)/, "Find and rescue at-risk revenue"],
      ["aether", /(pric|discount|margin|acv|monetiz|upsell|expansion)/, "Protect margin and price the expansion"],
      ["coreops", /(workflow|sync|ops|admin|infra|automat|onboard)/, "Remove the manual work slowing execution"],
    ];
    let picks = ROUTES.filter(([, re]) => re.test(text));
    if (picks.length === 0) picks = ROUTES.filter(([k]) => k === "intentpulse" || k === "apex" || k === "shield");
    picks = picks.slice(0, 4);

    await kit.think(`Decomposed the command into ${picks.length} objective${picks.length === 1 ? "" : "s"}: ${picks.map(([k]) => k).join(", ")}. Checking governance before routing.`);

    const governance = [];
    if (budget > 0) governance.push(await kit.call("evaluate_policy", { action: `Deploy $${budget.toLocaleString("en-US")} across engines`, category: "spend", amountUsd: budget, authorizationLevel: level }));
    await kit.call("allocate_capacity", { mode, budgetUsd: budget, priorities: picks.map(([k]) => k) });

    const routing = [];
    for (const [engine, , objective] of picks) {
      await kit.delegate(engine, `${objective}. Operator command: ${command}`);
      routing.push({ engine, objective, why: `The command names work ${engine} owns.` });
    }

    const held = (governance as { decision: string }[]).some((g) => g.decision !== "approve");
    return {
      summary: `Routed ${routing.length} objective${routing.length === 1 ? "" : "s"} across ${routing.map((r) => r.engine).join(", ")} under ${mode} shift posture.${held ? " Spend is held for human approval under the current authorization level." : ""}`,
      confidence: 0.55,
      actions: [
        ...(held ? [{ title: "Approve held spend", owner: "human", priority: "p0" as const, detail: "Spend exceeds the auto-approval ceiling for this authorization level." }] : []),
        ...routing.map((r) => ({ title: r.objective, owner: r.engine, priority: "p1" as const, detail: r.why })),
      ].slice(0, 8),
      routing,
      governance: governance as { action: string; decision: "approve" | "hold" | "block"; rule: string }[],
      mode,
    };
  },
});
