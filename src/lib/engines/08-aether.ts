import { z } from "zod";
import { exchangeCommitTerms } from "./tools/exchange";
import { defineEngine, engineInput, engineOutput, tool } from "./types";
import { clamp, dollarsIn, round } from "./util";

const priceSensitivity = tool({
  name: "price_sensitivity",
  description:
    "Reads willingness to pay from win rate and discounting: a high win rate with little discounting means the price is too low. Returns the recommended list price and the reasoning.",
  input: z.object({
    currentPriceUsd: z.number().positive(),
    winRatePct: z.number().min(0).max(100),
    avgDiscountPct: z.number().min(0).max(90).default(0),
    competitorPriceUsd: z.number().positive().nullable().default(null),
  }),
  run({ currentPriceUsd, winRatePct, avgDiscountPct, competitorPriceUsd }) {
    // Healthy B2B win rates sit around 20-30%. Above that, buyers are telling you the price is low.
    const pressure = (winRatePct - 25) / 100 - avgDiscountPct / 200;
    let move = clamp(pressure * 0.8, -0.15, 0.25);
    if (competitorPriceUsd) move = Math.min(move, competitorPriceUsd * 1.3 / currentPriceUsd - 1);
    const read = move > 0.03 ? "underpriced" : move < -0.03 ? "overpriced" : "priced right";
    return {
      read,
      recommendedPriceUsd: round(currentPriceUsd * (1 + move), 10),
      changePct: round(move * 100, 0.1),
      rationale: `${winRatePct}% win rate at ${avgDiscountPct}% average discount reads as ${read}${competitorPriceUsd ? `; capped at 1.3x the competitor's $${competitorPriceUsd.toLocaleString("en-US")}` : ""}.`,
    };
  },
});

const discountGuardrail = tool({
  name: "discount_guardrail",
  description: "Rules on one discount request: approve, counter or reject, with the floor price and what to ask for in return. Larger and longer deals earn more room.",
  input: z.object({ listPriceUsd: z.number().positive(), requestedDiscountPct: z.number().min(0).max(90), dealSizeUsd: z.number().min(0), termMonths: z.number().int().min(1).max(60).default(12) }),
  run({ listPriceUsd, requestedDiscountPct, dealSizeUsd, termMonths }) {
    const room = 10 + (dealSizeUsd >= 100_000 ? 5 : 0) + (termMonths >= 24 ? 5 : 0);
    const decision = requestedDiscountPct <= room * 0.5 ? "approve" : requestedDiscountPct <= room ? "counter" : "reject";
    return {
      decision,
      maxDiscountPct: room,
      floorPriceUsd: round(listPriceUsd * (1 - room / 100), 10),
      ask: decision === "approve" ? "Nothing extra required" : termMonths < 24 ? "A 24-month term or annual prepay" : "A case study and a signed date this month",
    };
  },
});

const expansionModel = tool({
  name: "expansion_model",
  description: "Models expansion ACV from seat growth and tier upgrades across a customer base: which lever adds the most contract value.",
  input: z.object({ accounts: z.number().int().min(1), avgSeats: z.number().min(1), utilizationPct: z.number().min(0).max(100), seatPriceUsd: z.number().positive(), upgradeUpliftPct: z.number().min(0).max(200).default(30) }),
  run({ accounts, avgSeats, utilizationPct, seatPriceUsd, upgradeUpliftPct }) {
    // Accounts above 85% utilization are buying seats; roughly 15% of all accounts will take a tier upgrade.
    const seatReady = utilizationPct >= 85 ? 0.6 : utilizationPct >= 70 ? 0.3 : 0.1;
    const seats = round(accounts * seatReady * avgSeats * 0.25 * seatPriceUsd * 12, 100);
    const tiers = round(accounts * 0.15 * avgSeats * seatPriceUsd * 12 * (upgradeUpliftPct / 100), 100);
    return { acvUpliftUsd: seats + tiers, seatExpansionUsd: seats, tierUpgradeUsd: tiers, leadLever: seats >= tiers ? "seat expansion" : "tier upgrades" };
  },
});

export const aether = defineEngine({
  key: "aether",
  codename: "08-aether",
  mandate: "Monetization yield optimization, dynamic pricing and ACV expansion.",
  instructions: `You are Aether, Engine 08: monetization. You find what customers will really pay, stop margin leaking through discounts, and price the expansion that grows contract value.

METHOD
1. If current price and win or discount data are available, run price_sensitivity. If the operator gave none, use clearly stated assumptions and lower your confidence.
2. For each discount request in the command, run discount_guardrail. Its floor is binding: never recommend below floorPriceUsd.
3. If the command concerns upsell, seats or tiers, run expansion_model.
   When a price will be negotiated with another agent (for example on Bloom Exchange), run exchange_commit_terms with the floor as a seller limit: share only the commitment, keep the opening private.
4. If at-risk accounts are part of the pricing question (renewals, downgrades), delegate to shield before you change their price.

PRINCIPLES
- Price on value delivered, not cost. Every discount is traded for something (term, prepay, reference, timing).
- Price increases go to new customers first; existing customers get notice and a grandfathering window.
- guardrails lists the concrete rules the sales team should follow from today.`,
  input: engineInput({
    currentPriceUsd: z.number().positive(),
    winRatePct: z.number().min(0).max(100),
    avgDiscountPct: z.number().min(0).max(90),
    requestedDiscountPct: z.number().min(0).max(90),
    accounts: z.number().int().min(1),
    seatPriceUsd: z.number().positive(),
  }),
  output: engineOutput({
    pricing: z.object({ currentUsd: z.number(), recommendedUsd: z.number(), changePct: z.number(), rationale: z.string().max(400) }).nullable(),
    guardrails: z.array(z.object({ rule: z.string().max(200), value: z.string().max(80) })).max(8),
    expansion: z.object({ acvUpliftUsd: z.number().min(0), leadLever: z.string().max(60) }).nullable(),
  }),
  tools: [priceSensitivity, discountGuardrail, expansionModel, exchangeCommitTerms],
  delegates: ["shield"],

  async simulate({ command, params }, kit) {
    const price = params.currentPriceUsd ?? dollarsIn(command) ?? 1_200;
    await kit.think(`Reading willingness to pay at $${price.toLocaleString("en-US")} and setting discount guardrails.`);
    const p = (await kit.call("price_sensitivity", { currentPriceUsd: price, winRatePct: params.winRatePct ?? 38, avgDiscountPct: params.avgDiscountPct ?? 12 })) as {
      recommendedPriceUsd: number; changePct: number; rationale: string;
    };
    const g = (await kit.call("discount_guardrail", { listPriceUsd: p.recommendedPriceUsd, requestedDiscountPct: params.requestedDiscountPct ?? 20, dealSizeUsd: p.recommendedPriceUsd * 12 })) as {
      decision: string; maxDiscountPct: number; floorPriceUsd: number; ask: string;
    };
    // Seal the floor the way Bloom Exchange does, so the quoted price can later be proven to respect it.
    const sealed = (await kit.call("exchange_commit_terms", { role: "seller", limitUsd: g.floorPriceUsd, proposedUsd: round(p.recommendedPriceUsd * (1 - (params.requestedDiscountPct ?? 20) / 100), 1) })) as { commitment: string; clampedUsd: number };
    const x = (await kit.call("expansion_model", { accounts: params.accounts ?? 60, avgSeats: 12, utilizationPct: 82, seatPriceUsd: params.seatPriceUsd ?? 45 })) as { acvUpliftUsd: number; leadLever: string };
    return {
      summary: `Move list price ${p.changePct >= 0 ? "up" : "down"} ${Math.abs(p.changePct)}% to $${p.recommendedPriceUsd.toLocaleString("en-US")} for new customers. Cap discounts at ${g.maxDiscountPct}%. Expansion is worth about $${x.acvUpliftUsd.toLocaleString("en-US")} in ACV, led by ${x.leadLever}.`,
      confidence: params.winRatePct === undefined ? 0.4 : 0.65,
      actions: [
        { title: "Publish the new list price for new customers", owner: "human", priority: "p0" as const, detail: p.rationale },
        { title: "Enforce the discount floor in quoting", owner: "aether", priority: "p1" as const, detail: `Floor $${g.floorPriceUsd.toLocaleString("en-US")}; beyond half the room, ask for ${g.ask.toLowerCase()}.` },
        { title: `Run the ${x.leadLever} play`, owner: "aether", priority: "p1" as const, detail: "Target accounts above 85% seat utilization first." },
      ],
      pricing: { currentUsd: price, recommendedUsd: p.recommendedPriceUsd, changePct: p.changePct, rationale: p.rationale },
      guardrails: [
        { rule: "Maximum discount without approval", value: `${g.maxDiscountPct}%` },
        { rule: "Floor price", value: `$${g.floorPriceUsd.toLocaleString("en-US")}` },
        { rule: "Every discount over half the room requires", value: g.ask.slice(0, 80) },
        { rule: `Sealed floor commitment (quote clamped to $${sealed.clampedUsd.toLocaleString("en-US")})`, value: `${sealed.commitment.slice(0, 16)}…` },
      ],
      expansion: { acvUpliftUsd: x.acvUpliftUsd, leadLever: x.leadLever },
    };
  },
});
