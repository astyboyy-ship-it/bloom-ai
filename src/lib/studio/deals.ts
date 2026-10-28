import { analyzeDeal, buildLocalResult, USAGE_RIGHTS, type DealAnalysis, type DealResult, type UsageRightsKey } from "@/lib/aware-marketing/engine";
import { HOOKS, tiktok, type Brand, type HookId } from "./creative";

/**
 * Engine 01 (Aware Marketing) overnight sweep. Each inbound brand proposal is run through the real
 * Aware Marketing deal core (rate-card floor, usage-rights premium, risk-clause detection, counter
 * pricing), scored for fit against the creator's brand criteria, and given campaign hooks. The
 * proposals themselves are sample data generated from a fixed seed.
 */

export const CATEGORIES = ["Tech", "Fitness", "Beauty", "Finance", "Travel", "Food", "Gaming", "Fashion", "Crypto", "Gambling"] as const;
export type Category = (typeof CATEGORIES)[number];

export const USAGE_ORDER: UsageRightsKey[] = ["organic", "paid30", "paid90", "whitelist", "perpetual"];

export type Creator = { name: string; handle: string; audience: string; niches: Category[] };
export const CREATOR: Creator = { name: "Maya Lin", handle: "@mayabuilds", audience: "early-career developers", niches: ["Tech", "Gaming", "Finance"] };

export type Criteria = {
  minBudget: number;
  /** Category-specific fee floors that override `minBudget` when higher. */
  categoryFloors: Partial<Record<Category, number>>;
  allowed: Category[];
  blocked: Category[];
  maxUsage: UsageRightsKey;
  allowExclusivity: boolean;
  minMatch: number;
};

export const DEFAULT_CRITERIA: Criteria = {
  minBudget: 2500,
  categoryFloors: { Tech: 4000, Finance: 5000 },
  allowed: ["Tech", "Gaming", "Finance", "Fitness", "Travel"],
  blocked: ["Crypto", "Gambling"],
  maxUsage: "paid90",
  allowExclusivity: true,
  minMatch: 55,
};

export type Stage = "inbox" | "agreed" | "awaiting" | "signed" | "declined";
export const STAGE_LABEL: Record<Stage, string> = {
  inbox: "Overnight inbox",
  agreed: "Terms agreed",
  awaiting: "Awaiting brand",
  signed: "Signed",
  declined: "Auto-declined",
};

/** Where the brand reached out: the overnight sweep reads every inbox and DM channel. */
export type DealChannel = "reddit" | "instagram" | "x" | "tiktok" | "linkedin" | "email";
export const DEAL_CHANNELS: DealChannel[] = ["reddit", "instagram", "x", "tiktok", "linkedin", "email"];

export type Proposal = {
  id: string;
  brand: string;
  via: DealChannel;
  product: string;
  category: Category;
  contact: string;
  receivedAt: string;
  deliverables: string;
  budget: number;
  usage: UsageRightsKey;
  email: string;
  analysis: DealAnalysis;
  result: DealResult;
  /** Price after the overnight negotiation. */
  negotiated: number;
  /** What happened overnight. */
  overnight: { stage: Stage; note: string; at: string };
  hooks: { id: HookId; label: string; text: string }[];
};

// Fixed-seed PRNG so the sweep renders identically on the server and in the browser.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Template = { brand: string; via: DealChannel; product: string; category: Category; deliverables: string; budget: [number, number]; usage: UsageRightsKey; email: string; pain: string; benefits: string[] };

const TEMPLATES: Template[] = [
  { brand: "Linear", via: "x", product: "Linear", category: "Tech", deliverables: "1x YouTube integration + 2x TikTok", budget: [7000, 11000], usage: "paid30", email: "Love your build-in-public series. We'd like a 60-second integration in your next devlog plus two TikToks. Paid usage for 30 days on our channels.", pain: "drowning in Jira tickets", benefits: ["Issues that triage themselves", "Roadmaps your team actually reads"] },
  { brand: "Raycast", via: "instagram", product: "Raycast Pro", category: "Tech", deliverables: "1x Instagram Reel + 3x Instagram Story", budget: [3800, 5200], usage: "organic", email: "We're launching Raycast AI next month and would love a Reel showing your real workflow. Organic only, no scripts, you keep creative control.", pain: "clicking through ten apps to do one thing", benefits: ["Every tool one keystroke away", "AI right in your launcher"] },
  { brand: "Notion", via: "email", product: "Notion Calendar", category: "Tech", deliverables: "1x YouTube dedicated video", budget: [9000, 15000], usage: "paid90", email: "We'd love a dedicated video on how you plan your week. We'd want to run it as paid social for 90 days. Net 60 payment terms.", pain: "juggling three calendars", benefits: ["Your docs and meetings in one place", "Time-blocking that sticks"] },
  { brand: "Brilliant", via: "email", product: "Brilliant", category: "Tech", deliverables: "1x YouTube integration", budget: [4000, 6500], usage: "organic", email: "Big fans. Looking for a 60-90 second integration in an upcoming video. Standard terms, two revision rounds.", pain: "forgetting what you learned last month", benefits: ["15 minutes a day that compounds", "Learn by solving, not watching"] },
  { brand: "Framework", via: "linkedin", product: "Framework Laptop 16", category: "Tech", deliverables: "1x YouTube dedicated video + 1x Instagram Reel", budget: [10000, 14000], usage: "paid30", email: "We'll send the Laptop 16 and would like a dedicated review plus a Reel. Exclusivity against other laptop brands for 60 days.", pain: "laptops you can't repair", benefits: ["Swap any part in minutes", "A machine that upgrades with you"] },
  { brand: "Whoop", via: "tiktok", product: "WHOOP 5.0", category: "Fitness", deliverables: "3x TikTok", budget: [3500, 5000], usage: "whitelist", email: "We'd like three TikToks about how you balance coding sprints with recovery. Whitelisting through Spark Ads for 60 days.", pain: "pulling all-nighters and wondering why you crash", benefits: ["Know when to push and when to rest", "Sleep coaching that actually adapts"] },
  { brand: "Steam Deck Hub", via: "reddit", product: "Deck Dock", category: "Gaming", deliverables: "2x TikTok + 1x Instagram Reel", budget: [2600, 3600], usage: "organic", email: "Looking for a fun Reel and two TikToks with the new dock. Organic only, launch is ASAP so we'd need it in 48 hours.", pain: "a desk full of dongles", benefits: ["One cable from handheld to desk setup", "4K out, zero fuss"] },
  { brand: "Wealthfront", via: "linkedin", product: "Wealthfront Cash", category: "Finance", deliverables: "1x YouTube integration + 1x newsletter", budget: [6000, 9000], usage: "paid30", email: "We'd love an integration about first jobs and building an emergency fund, plus a newsletter mention. Compliance will review the script.", pain: "leaving your first paycheck in a 0.01% account", benefits: ["High-yield cash, no fees", "Automate saving before you spend"] },
  { brand: "CoinPilot", via: "x", product: "CoinPilot", category: "Crypto", deliverables: "3x TikTok", budget: [8000, 12000], usage: "perpetual", email: "We want three TikToks about our trading bot. Perpetual rights, all media, worldwide. Script will be provided.", pain: "missing the pump", benefits: ["Automated trading", "Signals 24/7"] },
  { brand: "Glossier", via: "instagram", product: "Glossier You", category: "Beauty", deliverables: "1x Instagram Reel + 2x Instagram Story", budget: [2500, 4000], usage: "organic", email: "Would you be open to a desk-routine Reel featuring Glossier You? Gifted product plus a fee.", pain: "a routine that takes forever", benefits: ["Three steps, done", "Skin first"] },
  { brand: "Airalo", via: "tiktok", product: "Airalo eSIM", category: "Travel", deliverables: "1x YouTube Short + 2x TikTok", budget: [2000, 3200], usage: "paid30", email: "We'd love Shorts and TikToks from your conference trip next month. Paid usage 30 days. Unlimited revisions on the edit.", pain: "paying roaming fees at every conference", benefits: ["Data in 200 countries in minutes", "No SIM swaps"] },
  { brand: "Elgato", via: "reddit", product: "Stream Deck +", category: "Gaming", deliverables: "1x YouTube integration + 1x Instagram Reel", budget: [5000, 7500], usage: "organic", email: "We'd love to send you a Stream Deck + for your streaming setup video. Fee plus product, organic only.", pain: "alt-tabbing mid-stream", benefits: ["Every scene one dial away", "Macros for your whole workflow"] },
  { brand: "BetBoost", via: "email", product: "BetBoost", category: "Gambling", deliverables: "2x TikTok", budget: [6000, 9000], usage: "paid90", email: "Promote our new sportsbook bonus code. Paid usage 90 days.", pain: "", benefits: [] },
  { brand: "Vercel", via: "x", product: "v0", category: "Tech", deliverables: "1x YouTube dedicated video + 2x TikTok", budget: [12000, 18000], usage: "paid30", email: "We'd love a dedicated video building a real app with v0, plus two TikToks. 30-day paid usage, you keep creative control.", pain: "spending a weekend on boilerplate", benefits: ["From prompt to deployed app", "Ship the idea, not the setup"] },
];

const HOOK_SET: HookId[] = ["contrarian", "pov", "number"];

function hooksFor(t: Template, creator: Creator) {
  if (!t.pain) return [];
  const b: Brand = {
    name: t.brand,
    product: t.product,
    description: "",
    audience: creator.audience,
    pain: t.pain,
    benefits: t.benefits,
    proof: [`${t.product} saved me hours this month`],
    offer: "Link in bio",
    cta: "Try it",
    voice: "warm",
    banned: [],
    hashtags: [],
  };
  return HOOK_SET.map((id) => ({ id, label: HOOKS[id].label, text: tiktok(b, t.benefits[0] ?? "", id).hook }));
}

const time = (r: () => number, from = 0, to = 7) => {
  const m = Math.floor((from + r() * (to - from)) * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** The night's sweep: every proposal analysed and negotiated by the deal core. */
export function overnightSweep(creator: Creator = CREATOR, seed = 20261026): Proposal[] {
  const r = rng(seed);
  return TEMPLATES.map((t, i) => {
    // First offers usually land under the creator's floor; the overnight counter is where the money is.
    const opening = 0.6 + r() * 0.45;
    const budget = Math.round(((t.budget[0] + r() * (t.budget[1] - t.budget[0])) * opening) / 50) * 50;
    const input = { brandName: t.brand, creatorName: creator.name, budget, deliverables: t.deliverables, usageRights: t.usage, tone: "warm" as const, emailText: t.email };
    const analysis = analyzeDeal(input);
    const result = buildLocalResult(input, analysis);
    const receivedAt = time(r, 0, 3);
    let overnight: Proposal["overnight"];
    let negotiated = budget;
    if (result.action === "ACCEPT") {
      overnight = { stage: "agreed", note: `Offer meets your floor; terms tightened and agreed`, at: time(r, 3, 4) };
    } else if (result.action === "COUNTER") {
      negotiated = result.suggestedCounterPrice;
      // Most brands accept a floor-backed counter; some are still deciding by morning.
      overnight = r() < 0.68 ? { stage: "agreed", note: `Brand accepted the counter`, at: time(r, 3, 6.5) } : { stage: "awaiting", note: `Counter sent, brand hasn't replied`, at: time(r, 2, 4) };
    } else {
      negotiated = 0;
      overnight = { stage: "declined", note: `Below floor or unacceptable terms; polite decline sent`, at: time(r, 1, 3) };
    }
    return {
      id: `deal-${i + 1}`,
      brand: t.brand,
      via: t.via,
      product: t.product,
      category: t.category,
      contact: `partnerships@${t.brand.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      receivedAt,
      deliverables: t.deliverables,
      budget,
      usage: t.usage,
      email: t.email,
      analysis,
      result,
      negotiated,
      overnight,
      hooks: hooksFor(t, creator),
    };
  });
}

export type Fit = { score: number; reasons: { label: string; ok: boolean }[]; blocked: boolean };

/** How well a proposal fits the creator's criteria, blended with the deal core's score. */
export function fit(p: Proposal, c: Criteria, creator: Creator = CREATOR): Fit {
  const blocked = c.blocked.includes(p.category);
  const floor = Math.max(c.minBudget, c.categoryFloors?.[p.category] ?? 0);
  const reasons = [
    { label: `${p.category} is an allowed category`, ok: c.allowed.includes(p.category) && !blocked },
    { label: `Negotiated fee ≥ $${floor.toLocaleString("en-US")}${c.categoryFloors?.[p.category] ? ` (${p.category} floor)` : ""}`, ok: Math.max(p.negotiated, p.budget) >= floor },
    { label: `Usage within ${USAGE_RIGHTS[c.maxUsage].short}`, ok: USAGE_ORDER.indexOf(p.usage) <= USAGE_ORDER.indexOf(c.maxUsage) },
    { label: c.allowExclusivity ? "Exclusivity allowed" : "No exclusivity clause", ok: c.allowExclusivity || !p.analysis.flags.some((f) => f.id === "exclusivity") },
    { label: `Matches your niches (${creator.niches.join(", ")})`, ok: creator.niches.includes(p.category) },
  ];
  const fitPct = (reasons.filter((x) => x.ok).length / reasons.length) * 100;
  const score = blocked ? 0 : Math.round(p.result.dealScore * 0.55 + fitPct * 0.45);
  return { score, reasons, blocked };
}

/** Past deals for the conversion table (sample history, fixed seed). */
export function history(seed = 7) {
  const r = rng(seed);
  const cats: Category[] = ["Tech", "Gaming", "Finance", "Fitness", "Travel", "Beauty"];
  return cats.map((c) => {
    const proposals = 6 + Math.floor(r() * 30);
    const rate = c === "Tech" ? 0.42 : c === "Gaming" ? 0.35 : c === "Finance" ? 0.3 : 0.12 + r() * 0.15;
    const signed = Math.round(proposals * rate);
    const avg = Math.round((c === "Tech" ? 7800 : c === "Finance" ? 6400 : 3200 + r() * 2500) / 100) * 100;
    return { category: c, proposals, signed, rate: signed / proposals, avg };
  });
}

/** The signature-ready agreement generated on Approve & Sign. */
export function agreement(p: Proposal, creator: Creator, signer: string, signedAt: Date) {
  const lines = p.analysis.lines.map((l) => `  - ${l.qty} × ${l.label}`).join("\n");
  const terms = p.analysis.flags.map((f) => `  - ${f.term}`).join("\n");
  return `CREATOR PARTNERSHIP AGREEMENT

Brand:    ${p.brand} (${p.contact})
Creator:  ${creator.name} (${creator.handle})
Product:  ${p.product}
Date:     ${signedAt.toISOString().slice(0, 10)}

1. DELIVERABLES
${lines}

2. FEE
  ${"$" + p.negotiated.toLocaleString("en-US")} USD. 50% deposit on signature, balance Net 30 from go-live.

3. USAGE RIGHTS
  ${USAGE_RIGHTS[p.usage].label}.

4. NEGOTIATED TERMS
${terms || "  - Standard terms; no risk clauses detected."}
  - Two revision rounds included; additional rounds billed at 10% of fee.
  - #ad / Paid Partnership disclosure on every placement (FTC).

5. SIGNATURES
  Creator: ${signer}  ·  e-signed ${signedAt.toISOString()}
  Brand:   ________________________  (countersignature pending)
`;
}
