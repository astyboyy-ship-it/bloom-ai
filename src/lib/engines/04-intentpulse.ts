import { z } from "zod";
import { heuristicSignals } from "@/lib/intentpulse/heuristic";
import { assemble } from "@/lib/intentpulse/score";
import { defineEngine, engineInput, engineOutput, tool } from "./types";
import { seeded } from "./util";

const Channel = z.enum(["reddit", "linkedin", "x", "tiktok", "instagram"]);

const PAINS = [
  "drowning in follow-ups, need something that answers leads while we sleep",
  "our CRM is a graveyard, looking for a tool that actually works the pipeline",
  "budget approved for Q3, need a vendor live before end of quarter",
  "anyone using an AI SDR? our reps can't keep up with inbound",
  "just curious how people handle lead scoring, no rush",
  "head of growth here, evaluating options for outbound automation, demo this week?",
];

const scanMarketRadar = tool({
  name: "scan_market_radar",
  description:
    "Sweeps public channels for posts matching the keywords and returns raw candidate signals. SIMULATED FEED: posts are generated deterministically for the demo, not scraped live; present them as sample signals.",
  input: z.object({ keywords: z.array(z.string().min(2).max(40)).min(1).max(8), channels: z.array(Channel).min(1).max(5).default(["reddit", "linkedin", "x"]), limit: z.number().int().min(1).max(10).default(5) }),
  run({ keywords, channels, limit }) {
    const r = seeded(keywords.join("|") + channels.join("|"));
    return {
      source: "simulated",
      signals: Array.from({ length: limit }, (_, i) => ({
        id: `sig_${i + 1}`,
        channel: r.pick(channels),
        author: `${r.pick(["ops", "founder", "growth", "revops", "agency"])}_${r.int(10, 999)}`,
        company: r.pick(["Northwind Labs", "Halcyon Health", "Atlas Freight", "Lumen Studio", "Kestrel Bio", "Orchard Retail"]),
        text: `${r.pick(PAINS)} (${keywords[i % keywords.length]})`,
        minutesAgo: r.int(2, 600),
      })),
    };
  },
});

const scoreIntent = tool({
  name: "score_intent",
  description: "Scores one signal's buying intent 0-100 using the IntentPulse model (budget, urgency, tech fit, authority) and returns tier (VIP / QUALIFIED / NURTURE), persona and the routing action.",
  input: z.object({
    text: z.string().min(3).max(2000),
    company: z.string().max(120).default("Unknown"),
    author: z.string().max(80).default("Unknown"),
    budgetK: z.number().min(0).nullable().default(null).describe("Stated or inferred budget in thousands of USD; null if unknown."),
  }),
  run({ text, company, author, budgetK }) {
    const lead = { leadName: author, company, budgetK, message: text };
    const h = heuristicSignals(lead);
    const result = assemble({ lead, source: "heuristic", model: null, ...h, startedAt: Date.now() });
    return { score: result.score, tier: result.tier, persona: result.persona, action: result.action.title, evidence: result.signals.flatMap((s) => s.evidence).slice(0, 4) };
  },
});

const enrichAccount = tool({
  name: "enrich_account",
  description: "Adds firmographics to a company (size band, industry, likely stack, estimated deal value). SIMULATED: deterministic sample enrichment, not a live data provider.",
  input: z.object({ company: z.string().min(1).max(120) }),
  run({ company }) {
    const r = seeded(company.toLowerCase());
    const employees = r.pick([12, 35, 80, 220, 640, 1800]);
    return {
      source: "simulated",
      company,
      employees,
      industry: r.pick(["B2B SaaS", "Healthcare services", "Logistics", "Agency", "E-commerce", "Fintech"]),
      stack: [r.pick(["HubSpot", "Salesforce", "Pipedrive"]), r.pick(["Stripe", "Chargebee"]), r.pick(["Slack", "Teams"])],
      estDealUsd: Math.round(employees * r.int(60, 140) / 100) * 100,
    };
  },
});

export const intentpulse = defineEngine({
  key: "intentpulse",
  codename: "04-intentpulse",
  mandate: "Intent signal mining, market radar and score enrichment.",
  instructions: `You are IntentPulse, Engine 04: the market radar. You find people describing the exact problem the operator solves, score how ready they are to buy, and route the hottest to a closer in seconds.

METHOD
1. Turn the command into 2-6 precise pain-language keywords (what a buyer would actually type, not category jargon) and run scan_market_radar. Its feed is simulated sample data: label it that way.
2. Run score_intent on every candidate. Do not re-score or override its number; explain it.
3. Run enrich_account on VIP and QUALIFIED signals only.
4. Route: VIP signals go to apex (delegate when the operator asked you to act, not just to report). Accounts with no inbound signal but strong fit are vanguard's job.

PRINCIPLES
- Competitors and students are never routed to sales, whatever their score.
- Rank signals by score, then recency. Report at most eight.
- nextStep is one concrete move per signal, under 20 words.`,
  input: engineInput({
    keywords: z.array(z.string().max(40)).max(8),
    channels: z.array(Channel).max(5),
  }),
  output: engineOutput({
    signals: z.array(z.object({
      source: z.string().max(40),
      company: z.string().max(120),
      excerpt: z.string().max(300),
      score: z.number().min(0).max(100),
      tier: z.enum(["VIP", "QUALIFIED", "NURTURE"]),
      nextStep: z.string().max(160),
    })).max(8),
    routeTo: z.enum(["apex", "vanguard", "none"]),
    dataSource: z.enum(["simulated", "live"]),
  }),
  tools: [scanMarketRadar, scoreIntent, enrichAccount],
  delegates: ["vanguard", "apex"],

  async simulate({ command, params }, kit) {
    const keywords = params.keywords ?? (command.toLowerCase().match(/[a-z]{5,}/g) ?? ["leads"]).slice(0, 3);
    await kit.think(`Sweeping ${params.channels?.join(", ") ?? "reddit, linkedin, x"} for: ${keywords.join(", ")}.`);
    const radar = (await kit.call("scan_market_radar", { keywords, channels: params.channels ?? ["reddit", "linkedin", "x"], limit: 4 })) as {
      signals: { channel: string; company: string; author: string; text: string }[];
    };
    const signals = [];
    for (const s of radar.signals) {
      const scored = (await kit.call("score_intent", { text: s.text, company: s.company, author: s.author })) as { score: number; tier: "VIP" | "QUALIFIED" | "NURTURE"; action: string };
      if (scored.tier !== "NURTURE") await kit.call("enrich_account", { company: s.company });
      signals.push({ source: s.channel, company: s.company, excerpt: s.text.slice(0, 300), score: scored.score, tier: scored.tier, nextStep: scored.action.slice(0, 160) });
    }
    signals.sort((a, b) => b.score - a.score);
    const hot = signals.filter((s) => s.tier !== "NURTURE");
    return {
      summary: `Scored ${signals.length} sample signals; ${hot.length} qualify for a sales route, led by ${signals[0]?.company ?? "none"} at ${signals[0]?.score ?? 0}/100. Feed is simulated for this demo.`,
      confidence: 0.45,
      actions: hot.slice(0, 3).map((s) => ({ title: `Engage ${s.company}`, owner: s.tier === "VIP" ? "apex" : "vanguard", priority: s.tier === "VIP" ? ("p0" as const) : ("p1" as const), detail: s.nextStep })),
      signals,
      routeTo: hot.some((s) => s.tier === "VIP") ? ("apex" as const) : hot.length ? ("vanguard" as const) : ("none" as const),
      dataSource: "simulated" as const,
    };
  },
});
