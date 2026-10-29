import { z } from "zod";
import { defineEngine, engineInput, engineOutput, tool } from "./types";
import { clamp, dollarsIn, round } from "./util";

const Stage = z.enum(["discovery", "demo", "proposal", "negotiation", "legal"]);

/** Typical healthy days in each stage; time past this is what slows a deal. */
const STAGE_DAYS: Record<z.infer<typeof Stage>, number> = { discovery: 10, demo: 12, proposal: 14, negotiation: 10, legal: 12 };
const STAGE_LEFT: Record<z.infer<typeof Stage>, number> = { discovery: 55, demo: 42, proposal: 28, negotiation: 16, legal: 8 };

const scoreDealVelocity = tool({
  name: "score_deal_velocity",
  description: "Scores how fast a deal is moving (0-100) from its stage, time in stage, size and buying-committee coverage. Returns slip risk and expected days to close.",
  input: z.object({
    stage: Stage,
    daysInStage: z.number().int().min(0).max(365),
    acvUsd: z.number().min(0),
    stakeholdersEngaged: z.number().int().min(0).max(20).default(1),
    championIdentified: z.boolean().default(false),
  }),
  run({ stage, daysInStage, acvUsd, stakeholdersEngaged, championIdentified }) {
    const overdue = Math.max(0, daysInStage - STAGE_DAYS[stage]) / STAGE_DAYS[stage];
    // Larger deals need wider committees; one contact on a six-figure deal is a red flag.
    const needed = acvUsd >= 100_000 ? 4 : acvUsd >= 30_000 ? 3 : 2;
    const coverage = Math.min(1, stakeholdersEngaged / needed);
    const score = round(clamp(100 - overdue * 45 - (1 - coverage) * 30 + (championIdentified ? 10 : -10), 0, 100));
    return {
      velocityScore: score,
      slipRisk: score >= 70 ? "low" : score >= 45 ? "medium" : "high",
      expectedCloseDays: round(STAGE_LEFT[stage] * (1 + overdue * 0.6) * (championIdentified ? 0.85 : 1.15)),
      gaps: [
        ...(overdue > 0 ? [`${daysInStage - STAGE_DAYS[stage]} days past a healthy ${stage} stage`] : []),
        ...(coverage < 1 ? [`${stakeholdersEngaged} of ${needed} needed stakeholders engaged`] : []),
        ...(championIdentified ? [] : ["No champion identified"]),
      ],
    };
  },
});

const negotiationEnvelope = tool({
  name: "negotiation_envelope",
  description: "Builds the negotiation envelope for a deal: anchor, target and walk-away prices, plus an ordered list of concessions to trade instead of discount.",
  input: z.object({
    listPriceUsd: z.number().positive(),
    maxDiscountPct: z.number().min(0).max(60).default(15).describe("The floor the business allows."),
    buyerAskDiscountPct: z.number().min(0).max(90).default(0),
    termMonths: z.number().int().min(1).max(60).default(12),
  }),
  run({ listPriceUsd, maxDiscountPct, buyerAskDiscountPct, termMonths }) {
    const walkaway = listPriceUsd * (1 - maxDiscountPct / 100);
    // Concede in thirds of the floor, and only in exchange for term, payment or references.
    const target = listPriceUsd * (1 - Math.min(buyerAskDiscountPct, maxDiscountPct) / 3 / 100);
    return {
      anchorUsd: round(listPriceUsd * 1.08, 100),
      targetUsd: round(target, 100),
      walkawayUsd: round(walkaway, 100),
      askExceedsFloor: buyerAskDiscountPct > maxDiscountPct,
      concessions: [
        termMonths < 24 ? "Trade up to 5% for a 24-month term" : "Hold price; term is already long",
        "Trade 3% for annual upfront payment",
        "Trade onboarding hours (not price) for a signed date this month",
        "Trade 2% for a public reference and case study",
      ],
    };
  },
});

const buildProposal = tool({
  name: "build_proposal",
  description: "Turns an account, a target ACV and the modules in play into a three-tier proposal (good / better / best), priced around the target so the middle tier is the natural pick.",
  input: z.object({
    account: z.string().min(1).max(120),
    targetAcvUsd: z.number().positive(),
    modules: z.array(z.string().max(60)).min(1).max(8),
  }),
  run({ account, targetAcvUsd, modules }) {
    const third = Math.max(1, Math.ceil(modules.length / 3));
    return {
      headline: `${account}: from signal to signed in one motion`,
      tiers: [
        { name: "Launch", priceUsd: round(targetAcvUsd * 0.7, 500), includes: modules.slice(0, third) },
        { name: "Scale", priceUsd: round(targetAcvUsd, 500), includes: modules.slice(0, third * 2) },
        { name: "Sovereign", priceUsd: round(targetAcvUsd * 1.45, 500), includes: [...modules, "Dedicated engine operator"] },
      ],
    };
  },
});

const Tier = z.object({ name: z.string().max(40), priceUsd: z.number().min(0), includes: z.array(z.string().max(80)).max(10) });

export const apex = defineEngine({
  key: "apex",
  codename: "02-apex",
  mandate: "Contract deal velocity, negotiation logic and proposal generation.",
  instructions: `You are Apex, Engine 02: the closer. You own deal velocity, negotiation and proposals from first meeting to signature.

METHOD
1. Diagnose the deal with score_deal_velocity. Use the operator's numbers; where one is missing, assume a conservative value and say so in the summary.
2. If price, discount or terms are in play, run negotiation_envelope. Never recommend a price below walkawayUsd. When askExceedsFloor is true, the answer is a concession trade, not a deeper discount.
3. If a proposal is needed, run build_proposal with the modules the buyer actually cares about.
4. If a specific objection is blocking the deal, delegate to cortex for the answer. If the price floor itself is in question, delegate to aether.

PRINCIPLES
- Speed wins deals, but margin is not yours to give away: trade every concession for term, cash or a signature date.
- Every action names a date-bound next step with an owner (apex for automated follow-up, human for the closer).
- Numbers are projections. Never promise a close.`,
  input: engineInput({
    account: z.string().max(120),
    stage: Stage,
    daysInStage: z.number().int().min(0),
    acvUsd: z.number().min(0),
    maxDiscountPct: z.number().min(0).max(60),
    buyerAskDiscountPct: z.number().min(0).max(90),
    modules: z.array(z.string().max(60)).max(8),
  }),
  output: engineOutput({
    deal: z.object({ velocityScore: z.number().min(0).max(100), slipRisk: z.enum(["low", "medium", "high"]), expectedCloseDays: z.number().min(0), gaps: z.array(z.string().max(200)).max(6) }),
    negotiation: z.object({ anchorUsd: z.number(), targetUsd: z.number(), walkawayUsd: z.number(), concessions: z.array(z.string().max(200)).max(6) }).nullable(),
    proposal: z.object({ headline: z.string().max(160), tiers: z.array(Tier).max(4) }).nullable(),
  }),
  tools: [scoreDealVelocity, negotiationEnvelope, buildProposal],
  delegates: ["cortex", "aether"],

  async simulate({ command, params }, kit) {
    const acv = params.acvUsd ?? dollarsIn(command) ?? 48_000;
    const account = params.account ?? command.match(/\b([A-Z][\w&.-]*(?: [A-Z][\w&.-]*)*) (?:is|are|has)\b/)?.[1] ?? "This account";
    const stage = params.stage ?? (/(negotiat|discount)/i.test(command) ? "negotiation" : /proposal/i.test(command) ? "proposal" : "demo");
    await kit.think(`Diagnosing ${account} at the ${stage} stage, $${acv.toLocaleString("en-US")} ACV.`);
    const deal = (await kit.call("score_deal_velocity", { stage, daysInStage: params.daysInStage ?? 18, acvUsd: acv, stakeholdersEngaged: 2, championIdentified: false })) as {
      velocityScore: number; slipRisk: "low" | "medium" | "high"; expectedCloseDays: number; gaps: string[];
    };
    const negotiation = (await kit.call("negotiation_envelope", { listPriceUsd: acv, maxDiscountPct: params.maxDiscountPct ?? 15, buyerAskDiscountPct: params.buyerAskDiscountPct ?? 20 })) as {
      anchorUsd: number; targetUsd: number; walkawayUsd: number; concessions: string[];
    };
    const proposal = (await kit.call("build_proposal", { account, targetAcvUsd: acv, modules: params.modules ?? ["Lead capture", "Automated follow-up", "Proposal engine", "Deal analytics"] })) as {
      headline: string; tiers: z.infer<typeof Tier>[];
    };
    return {
      summary: `${account} is moving at ${deal.velocityScore}/100 with ${deal.slipRisk} slip risk, roughly ${deal.expectedCloseDays} days from close. Hold at $${negotiation.targetUsd.toLocaleString("en-US")} and trade concessions rather than discount below $${negotiation.walkawayUsd.toLocaleString("en-US")}.`,
      confidence: 0.5,
      actions: [
        { title: "Multi-thread the buying committee", owner: "human", priority: "p0" as const, detail: deal.gaps.join("; ") || "Coverage is healthy; confirm the signer." },
        { title: "Send the three-tier proposal", owner: "apex", priority: "p1" as const, detail: proposal.headline },
        { title: "Offer term-for-price trade", owner: "apex", priority: "p1" as const, detail: negotiation.concessions[0] },
      ],
      deal: { ...deal, gaps: deal.gaps.slice(0, 6) },
      negotiation: { ...negotiation, concessions: negotiation.concessions.slice(0, 6) },
      proposal,
    };
  },
});
