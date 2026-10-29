import { z } from "zod";
import { defineEngine, engineInput, engineOutput, tool } from "./types";
import { clamp, round } from "./util";

const Category = z.enum(["price", "timing", "authority", "need", "competitor", "risk"]);

const SIGNS: [z.infer<typeof Category>, RegExp][] = [
  ["competitor", /(competitor|alternative|already use|vs\.?|cheaper option|other vendor)/i],
  ["price", /(price|expensive|cost|budget|discount|too much|afford)/i],
  ["timing", /(timing|next quarter|later|not now|busy|after|q[1-4])/i],
  ["authority", /(boss|board|cfo|approval|sign.?off|decision maker|procurement)/i],
  ["risk", /(risk|security|soc ?2|compliance|lock.?in|migration|trust)/i],
  ["need", /(don'?t need|not a priority|happy with|works fine|why change)/i],
];

/** The opening move for each category; Cortex tailors it to the deal. */
const PLAYBOOK: Record<z.infer<typeof Category>, string> = {
  price: "Reframe from cost to the cost of the problem: quantify what one more month without it loses.",
  timing: "Tie the start date to an event they already care about, and offer a scoped pilot that fits now.",
  authority: "Arm the champion with a one-page business case and offer to brief the approver directly.",
  need: "Surface the hidden cost with one question about volume or time lost, then let them size it.",
  competitor: "Do not attack. Ask what they would change about the incumbent, then win on that gap.",
  risk: "Lead with proof: security docs, a reference in their industry, and an exit clause.",
};

const classifyObjection = tool({
  name: "classify_objection",
  description: "Classifies an objection (price, timing, authority, need, competitor, risk), rates its severity and returns the opening playbook move for that category.",
  input: z.object({ text: z.string().min(3).max(1000), stage: z.enum(["discovery", "demo", "proposal", "negotiation", "legal"]).default("proposal") }),
  run({ text, stage }) {
    const hits = SIGNS.filter(([, re]) => re.test(text)).map(([c]) => c);
    const category = hits[0] ?? "need";
    const late = stage === "negotiation" || stage === "legal";
    return { category, also: hits.slice(1), severity: late || hits.length > 1 ? "high" : "medium", playbook: PLAYBOOK[category] };
  },
});

const buildBattlecard = tool({
  name: "build_battlecard",
  description: "Assembles a competitive battlecard from our strengths and the competitor's claims: win themes, landmine questions to plant, and traps to avoid.",
  input: z.object({ competitor: z.string().min(1).max(80), ourStrengths: z.array(z.string().max(120)).min(1).max(6), theirClaims: z.array(z.string().max(120)).max(6).default([]) }),
  run({ competitor, ourStrengths, theirClaims }) {
    return {
      competitor,
      winThemes: ourStrengths.slice(0, 4),
      landmines: ourStrengths.slice(0, 3).map((s) => `Ask: "How does ${competitor} handle ${s.toLowerCase()} today?"`),
      traps: [`Do not trade feature lists with ${competitor}; steer to outcomes.`, ...theirClaims.slice(0, 2).map((c) => `When they cite "${c}", ask for the customer reference behind it.`)],
    };
  },
});

const dealRiskScan = tool({
  name: "deal_risk_scan",
  description: "Scores a deal's risk of stalling (0-100) from silence, committee coverage, stage and competitor presence, and lists the factors driving it.",
  input: z.object({ daysSinceLastTouch: z.number().int().min(0).max(365), stakeholders: z.number().int().min(0).max(20), stage: z.enum(["discovery", "demo", "proposal", "negotiation", "legal"]), competitorPresent: z.boolean().default(false) }),
  run({ daysSinceLastTouch, stakeholders, stage, competitorPresent }) {
    const checks: [boolean, number, string][] = [
      [daysSinceLastTouch > 7, Math.min(40, (daysSinceLastTouch - 7) * 3), `${daysSinceLastTouch} days of silence`],
      [stakeholders < 2, 20, "Single-threaded"],
      [competitorPresent, 15, "Competitor in the deal"],
      [stage === "demo" && daysSinceLastTouch > 10, 10, "Post-demo stall, the most common place deals die"],
    ];
    const hit = checks.filter(([on]) => on);
    return { score: round(clamp(10 + hit.reduce((s, [, w]) => s + w, 0), 0, 100)), factors: hit.map(([, , f]) => f) };
  },
});

export const cortex = defineEngine({
  key: "cortex",
  codename: "06-cortex",
  mandate: "Deal objection handling, competitive battlecards and sales intelligence.",
  instructions: `You are Cortex, Engine 06: sales intelligence. You find the exact moment a deal stalls and write the answer that restarts it.

METHOD
1. Extract every objection from the command (quoted buyer words, call notes, email threads). Run classify_objection on each.
2. For each, write the response a top closer would say: two or three sentences, specific to this buyer, built on the playbook move. Never invent case studies, customer names or statistics; if proof is needed, say what kind of proof to bring.
3. If a competitor is named, run build_battlecard with the strengths the operator gave (or ones clearly implied).
4. If deal facts are present (silence, stage, committee), run deal_risk_scan.
5. If the fix is a price restructure rather than a talk track, delegate to aether. If the deal just needs execution, hand back to apex.

PRINCIPLES
- Answer the real objection, not the stated one: "too expensive" late in a deal usually means unproven value or no authority.
- No pressure tactics, false urgency or disparaging competitors.`,
  input: engineInput({
    objections: z.array(z.string().max(1000)).max(8),
    competitor: z.string().max(80),
    ourStrengths: z.array(z.string().max(120)).max(6),
    daysSinceLastTouch: z.number().int().min(0),
    stage: z.enum(["discovery", "demo", "proposal", "negotiation", "legal"]),
  }),
  output: engineOutput({
    objections: z.array(z.object({ text: z.string().max(300), category: Category, response: z.string().max(600) })).max(8),
    battlecard: z.object({ competitor: z.string().max(80), winThemes: z.array(z.string().max(160)).max(5), landmines: z.array(z.string().max(200)).max(5), traps: z.array(z.string().max(200)).max(5) }).nullable(),
    risk: z.object({ score: z.number().min(0).max(100), factors: z.array(z.string().max(160)).max(6) }).nullable(),
  }),
  tools: [classifyObjection, buildBattlecard, dealRiskScan],
  delegates: ["apex", "aether"],

  async simulate({ command, params }, kit) {
    const objections = params.objections ?? command.split(/[.;!?]\s+/).filter((s) => s.length > 8).slice(0, 3);
    await kit.think(`Classifying ${objections.length} objection${objections.length === 1 ? "" : "s"} and checking deal risk.`);
    const out = [];
    for (const text of objections) {
      const c = (await kit.call("classify_objection", { text, stage: params.stage ?? "proposal" })) as { category: z.infer<typeof Category>; playbook: string };
      out.push({ text: text.slice(0, 300), category: c.category, response: c.playbook });
    }
    const competitor = params.competitor ?? command.match(/\b(?:vs\.?|against|competitor)\s+([A-Z][\w-]+)/)?.[1];
    const battlecard = competitor
      ? ((await kit.call("build_battlecard", { competitor, ourStrengths: params.ourStrengths ?? ["Time to value", "Autonomous follow-up", "Transparent pricing"] })) as { competitor: string; winThemes: string[]; landmines: string[]; traps: string[] })
      : null;
    const risk = (await kit.call("deal_risk_scan", { daysSinceLastTouch: params.daysSinceLastTouch ?? 12, stakeholders: 1, stage: params.stage ?? "demo", competitorPresent: Boolean(competitor) })) as { score: number; factors: string[] };
    return {
      summary: `${out.length} objection${out.length === 1 ? "" : "s"} mapped, led by ${out[0]?.category ?? "need"}. Stall risk is ${risk.score}/100${risk.factors.length ? `: ${risk.factors.join(", ")}` : ""}.`,
      confidence: 0.5,
      actions: [
        { title: "Deliver the objection talk track", owner: "human", priority: "p0" as const, detail: out[0]?.response ?? "Confirm the real objection first." },
        ...(risk.factors.includes("Single-threaded") ? [{ title: "Add a second stakeholder", owner: "apex", priority: "p1" as const, detail: "Single-threaded deals stall when the contact goes quiet." }] : []),
      ],
      objections: out,
      battlecard,
      risk,
    };
  },
});
