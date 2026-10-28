import { analyzeDeal, type DealAnalysis, type DealInput, type UsageRightsKey } from "@/lib/aware-marketing/engine";
import { between, pick } from "../shared/sim";

/**
 * Simulated sponsor inbox. Each inbound deal is sample data, but it is triaged by the real
 * Aware Marketing rate-card engine, and every counter respects that engine's floor.
 */

export type Stage = "inbound" | "triaged" | "countering" | "round2" | "closed" | "declined";

export type InboxDeal = {
  id: string;
  brand: string;
  category: string;
  input: DealInput;
  analysis: DealAnalysis;
  stage: Stage;
  offer: number;
  counter: number;
  final: number | null;
  /** Tick at which the deal moves to its next stage. */
  nextAt: number;
};

type Template = { category: string; budgetK: [number, number]; deliverables: string[]; usage: UsageRightsKey[]; emails: string[] };

const TEMPLATES: Template[] = [
  {
    category: "Tech Brand",
    budgetK: [12, 18],
    deliverables: ["1x YouTube Integration + 2x IG Reels", "1x Dedicated YouTube video"],
    usage: ["paid30", "organic"],
    emails: ["We'd love a 60-second integration in your next upload. Paid social usage for 30 days.", "Launching our new earbuds, looking for an honest review. Net 30."],
  },
  {
    category: "Crypto Sponsor",
    budgetK: [6, 10],
    deliverables: ["1x YouTube Integration + 3x TikTok", "2x TikTok + 1x Newsletter feature"],
    usage: ["paid90", "whitelist"],
    emails: ["Category exclusivity for 90 days required, payment Net 60.", "We need whitelisting for Spark Ads and exclusivity vs. other exchanges."],
  },
  {
    category: "Gaming Deal",
    budgetK: [20, 30],
    deliverables: ["1x Dedicated YouTube video + 3x Shorts", "1x YouTube Integration + 2x TikTok + 2x IG Reels"],
    usage: ["paid30", "organic"],
    emails: ["Launch week for our new title, we'd like a dedicated video. Script will be provided.", "Big season launch, need delivery ASAP."],
  },
  {
    category: "Fitness Brand",
    budgetK: [4, 9],
    deliverables: ["3x TikTok + 5x IG Stories", "2x IG Reels + 1x TikTok"],
    usage: ["organic", "paid30"],
    emails: ["Our protein launch is next month. Unlimited revisions until it feels right!", "Simple, fun, authentic. Organic usage only."],
  },
  {
    category: "Fintech",
    budgetK: [10, 22],
    deliverables: ["1x YouTube Integration + 1x Newsletter feature", "1x Dedicated YouTube video"],
    usage: ["paid90", "organic"],
    emails: ["Compliance needs final approval on the script. Paid usage 90 days.", "We'd like to sponsor your next deep-dive. Net 30, two revisions."],
  },
  {
    category: "Beauty DTC",
    budgetK: [3, 8],
    deliverables: ["2x IG Reels + 4x IG Stories", "1x IG Reel + 3x TikTok"],
    usage: ["perpetual", "paid30"],
    emails: ["We'll send the full product range. Usage in all media, in perpetuity.", "Gifted kit plus a fee, boosted posts for 30 days."],
  },
  {
    category: "SaaS Startup",
    budgetK: [8, 16],
    deliverables: ["1x Podcast ad read + 1x Newsletter feature", "1x YouTube Integration"],
    usage: ["organic", "paid30"],
    emails: ["Founder-led brand, we love your audience. Happy to do Net 30.", "Looking for a long-term ambassador, starting with one integration."],
  },
  {
    category: "Energy Drink",
    budgetK: [0, 3],
    deliverables: ["3x TikTok + 2x IG Reels", "1x Dedicated YouTube video"],
    usage: ["perpetual", "whitelist"],
    emails: ["We can offer free product in exchange for the content, plus great exposure!", "Small budget but perpetual rights, all media worldwide."],
  },
];

const BRAND_A = ["Vela", "Nimbus", "Corsa", "Lyra", "Kinetic", "Halcyon", "Brisk", "Orra", "Mosaic", "Quanta", "Fjord", "Solstice", "Tandem", "Ivory", "Rook"];
const BRAND_B = ["Audio", "Labs", "Games", "Pay", "Skin", "Fuel", "Cloud", "Wear", "Studio", "Mint"];

export function makeDeal(r: () => number, seq: number, tick: number, creatorName: string): InboxDeal {
  const t = pick(r, TEMPLATES);
  const brand = `${pick(r, BRAND_A)} ${pick(r, BRAND_B)}`;
  const budget = Math.round(between(r, t.budgetK[0], t.budgetK[1]) * 4) * 250;
  const input: DealInput = {
    brandName: brand,
    creatorName,
    budget,
    deliverables: pick(r, t.deliverables),
    usageRights: pick(r, t.usage),
    tone: "warm",
    emailText: pick(r, t.emails),
  };
  const analysis = analyzeDeal(input);
  return {
    id: `deal-${seq}`,
    brand,
    category: t.category,
    input,
    analysis,
    stage: "inbound",
    offer: budget,
    counter: analysis.counterPrice,
    final: null,
    nextAt: tick + 2 + Math.floor(r() * 3),
  };
}

const round250 = (n: number) => Math.round(n / 250) * 250;

/** Moves a deal one stage along its lifecycle when its timer is due. */
export function advance(d: InboxDeal, r: () => number, tick: number): { deal: InboxDeal; event?: string } {
  if (tick < d.nextAt || d.stage === "closed" || d.stage === "declined") return { deal: d };
  const wait = () => tick + 3 + Math.floor(r() * 4);
  const a = d.analysis;

  switch (d.stage) {
    case "inbound":
      return { deal: { ...d, stage: "triaged", nextAt: tick + 2 }, event: `Triaged ${d.brand}: score ${a.score}, floor $${Math.round(a.floorTotal).toLocaleString("en-US")}` };
    case "triaged":
      if (a.action === "ACCEPT") return { deal: { ...d, stage: "closed", final: d.offer }, event: `Accepted ${d.brand} at $${d.offer.toLocaleString("en-US")}, above floor` };
      if (a.action === "DECLINE") return { deal: { ...d, stage: "declined" }, event: `Declined ${d.brand}: $${d.offer.toLocaleString("en-US")} is a lowball for this scope` };
      return { deal: { ...d, stage: "countering", nextAt: wait() }, event: `Countered ${d.brand}: $${d.offer.toLocaleString("en-US")} → $${d.counter.toLocaleString("en-US")}` };
    case "countering":
      if (r() < 0.55) return { deal: { ...d, stage: "closed", final: d.counter }, event: `${d.brand} accepted the counter: closed at $${d.counter.toLocaleString("en-US")}` };
      return { deal: { ...d, stage: "round2", nextAt: wait() }, event: `${d.brand} pushed back; holding the floor in round 2` };
    case "round2": {
      const final = Math.max(round250((d.offer + d.counter) / 2), Math.ceil(a.floorTotal / 250) * 250);
      return { deal: { ...d, stage: "closed", final }, event: `Closed ${d.brand} at $${final.toLocaleString("en-US")} (floor held)` };
    }
  }
}

export const dealLabel = (d: InboxDeal) => `$${Math.round(d.offer / 1000)}k ${d.category}`;
