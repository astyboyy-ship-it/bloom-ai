import { USAGE_RIGHTS, money } from "./engine";

/**
 * Master Strategy Roadmap: reads a creator handle, niche or product description and plans floor
 * rates per platform, a 50+ sponsor outreach programme, and negotiation guardrails. Deterministic,
 * so the roadmap is always available; the API layers an optional Groq-written positioning note on top.
 */

export type Niche =
  | "tech"
  | "gaming"
  | "finance"
  | "crypto"
  | "beauty"
  | "fitness"
  | "food"
  | "travel"
  | "education"
  | "b2b"
  | "lifestyle";

export type Platform = "YouTube" | "Instagram" | "TikTok" | "X";

export type StrategyRoadmap = {
  profile: {
    handle: string | null;
    niche: Niche;
    nicheLabel: string;
    platforms: Platform[];
    audience: number;
    audienceSource: "stated" | "estimated";
    mode: "creator" | "product";
    tier: "Emerging" | "Mid-tier" | "Established" | "Top-tier";
  };
  positioning: string;
  floorRates: { platform: Platform; format: string; floor: number }[];
  packageFloor: number;
  outreach: {
    totalTargets: number;
    waves: { name: string; day: string; count: number; focus: string }[];
    targets: { brand: string; category: string; fit: number; openingAsk: number }[];
    cadence: string[];
  };
  guardrails: { rule: string; detail: string }[];
  agentReply: string;
  source: "planner" | "groq";
  model: string | null;
};

// Checked in order: the more specific niches come before broad ones like "tech".
const NICHES: Record<Niche, { label: string; re: RegExp; cpm: number; categories: string[] }> = {
  b2b: { label: "B2B / SaaS", re: /b2b|saas|startup|founder|sales team|crm|devtools|developer|enterprise/i, cpm: 1.7, categories: ["Dev tools", "Sales software", "Cloud infrastructure", "HR & payroll", "Analytics platforms"] },
  crypto: { label: "Crypto & web3", re: /crypto|bitcoin|web3|defi|nft|blockchain|ethereum/i, cpm: 1.5, categories: ["Exchanges", "Hardware wallets", "DeFi protocols", "Crypto cards", "Analytics tools"] },
  tech: { label: "Consumer tech", re: /tech|gadget|review|phone|laptop|ai\b|software|setup|pc build/i, cpm: 1.35, categories: ["Consumer electronics", "VPN & privacy", "Productivity SaaS", "Audio gear", "Smart home"] },
  gaming: { label: "Gaming", re: /gam(e|ing|er)|esports|stream(er|ing)|twitch|fps|rpg/i, cpm: 1.1, categories: ["Game studios", "Peripherals", "Energy drinks", "Gaming chairs", "Cloud gaming"] },
  finance: { label: "Personal finance", re: /financ|invest|money|budget|stocks|wealth|fire\b/i, cpm: 1.6, categories: ["Neobanks", "Brokerages", "Budgeting apps", "Credit cards", "Tax software"] },
  beauty: { label: "Beauty & skincare", re: /beauty|skin|makeup|cosmetic|hair|nails/i, cpm: 1.2, categories: ["Skincare DTC", "Clean beauty", "Haircare", "Fragrance", "Beauty tech"] },
  fitness: { label: "Fitness & wellness", re: /fitness|gym|workout|yoga|run(ning)?|wellness|nutrition|protein/i, cpm: 1.0, categories: ["Supplements", "Athleisure", "Fitness apps", "Wearables", "Meal kits"] },
  food: { label: "Food & cooking", re: /food|cook|recipe|chef|baking|kitchen/i, cpm: 0.9, categories: ["Cookware", "Meal kits", "Grocery delivery", "Specialty foods", "Kitchen appliances"] },
  travel: { label: "Travel", re: /travel|nomad|trip|hotel|flight|backpack/i, cpm: 1.0, categories: ["Travel booking", "Luggage", "eSIM providers", "Travel insurance", "Hospitality"] },
  education: { label: "Education", re: /educat|teach|learn|course|study|tutor|science/i, cpm: 1.15, categories: ["Online learning", "Language apps", "Note-taking tools", "Edtech hardware", "Book clubs"] },
  lifestyle: { label: "Lifestyle", re: /lifestyle|vlog|daily|family|home|fashion|style/i, cpm: 1.0, categories: ["Fashion DTC", "Home goods", "Subscription boxes", "Mattresses", "Coffee"] },
};

const PLATFORM_RE: Record<Platform, RegExp> = {
  YouTube: /youtube|\byt\b|subscriber|subs\b|channel/i,
  Instagram: /instagram|\big\b|reels?|insta/i,
  TikTok: /tik\s*tok|\btt\b/i,
  X: /\bx\b|twitter|tweets?|threads? on x/i,
};

// Base floors at 100k engaged audience, per platform format.
const BASE_RATES: { platform: Platform; format: string; floor: number }[] = [
  { platform: "YouTube", format: "Dedicated video", floor: 9000 },
  { platform: "YouTube", format: "60–90 s integration", floor: 4500 },
  { platform: "YouTube", format: "Short", floor: 1200 },
  { platform: "Instagram", format: "Reel", floor: 2200 },
  { platform: "Instagram", format: "Story set (3 frames)", floor: 1950 },
  { platform: "TikTok", format: "In-feed video", floor: 1800 },
  { platform: "TikTok", format: "Spark Ads licence (30 d)", floor: 900 },
  { platform: "X", format: "Sponsored thread", floor: 700 },
  { platform: "X", format: "Pinned post (7 d)", floor: 450 },
];

const BRAND_A = ["Nova", "Lumen", "Arc", "Pulse", "Vela", "Orbit", "Kite", "Halo", "Ember", "Atlas", "Juniper", "Quill", "Sable", "Tide", "Verve", "Zenith", "Cobalt", "Fable"];
const BRAND_B = ["Labs", "Works", "Co", "HQ", "Studio", "Supply", "Systems", "Goods", "Collective", "Cloud"];

const round250 = (n: number) => Math.max(250, Math.round(n / 250) * 250);

function parseAudience(text: string): number | null {
  const m = /(\d+(?:[.,]\d+)?)\s*(k|m|thousand|million)?\s*(subs|subscribers|followers|audience|viewers|readers|fans)/i.exec(text);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  const unit = (m[2] ?? "").toLowerCase();
  return Math.round(n * (unit.startsWith("m") ? 1_000_000 : unit === "k" || unit.startsWith("t") ? 1_000 : 1));
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function buildStrategy(text: string): StrategyRoadmap {
  const handle = /@[\w.]{2,30}/.exec(text)?.[0] ?? null;
  const niche = (Object.keys(NICHES) as Niche[]).find((k) => NICHES[k].re.test(text)) ?? "lifestyle";
  const n = NICHES[niche];
  const mode: "creator" | "product" = /\b(product|app|tool|platform|our (company|brand)|we sell|we build|saas|startup)\b/i.test(text) && !handle ? "product" : "creator";

  const mentioned = (Object.keys(PLATFORM_RE) as Platform[]).filter((p) => PLATFORM_RE[p].test(text));
  const platforms: Platform[] = mentioned.length ? mentioned : ["YouTube", "Instagram", "TikTok", "X"];
  const stated = parseAudience(text);
  const audience = stated ?? 60_000 + (hash(text) % 140_000);
  const tier = audience >= 1_000_000 ? "Top-tier" : audience >= 250_000 ? "Established" : audience >= 50_000 ? "Mid-tier" : "Emerging";

  // Rates scale sub-linearly with audience and by the niche's advertiser CPM.
  const scale = Math.min(12, Math.max(0.3, Math.pow(audience / 100_000, 0.8))) * n.cpm;
  const floorRates = BASE_RATES.filter((r) => platforms.includes(r.platform)).map((r) => ({ ...r, floor: round250(r.floor * scale) }));
  const anchor = (p: Platform) => floorRates.find((r) => r.platform === p)?.floor ?? 0;
  const packageFloor = round250(platforms.reduce((s, p) => s + anchor(p), 0));

  const seed = hash(text);
  const targets = Array.from({ length: 54 }, (_, i) => {
    const a = BRAND_A[(seed + i * 7) % BRAND_A.length];
    const b = BRAND_B[(seed + i * 3) % BRAND_B.length];
    const fit = 96 - Math.floor(i * 0.7) - ((seed >> (i % 16)) & 3);
    return {
      brand: `${a} ${b}`,
      category: n.categories[i % n.categories.length],
      fit: Math.max(55, fit),
      openingAsk: round250(packageFloor * (1.15 + ((54 - i) / 54) * 0.35)),
    };
  });

  const guardrails = [
    { rule: "Never below floor", detail: `Walk-away price ${money(packageFloor)} for the cross-platform package; every counter lands at or above it.` },
    ...(["paid30", "paid90", "whitelist", "perpetual"] as const).map((k) => ({
      rule: `Usage rights · ${USAGE_RIGHTS[k].short}`,
      detail: `+${Math.round(USAGE_RIGHTS[k].markup * 100)}% on the base fee${k === "perpetual" ? "; counter with a 12-month cap first" : ""}.`,
    })),
    { rule: "Category exclusivity", detail: "Max 30 days, priced at +20% per 30-day block; direct competitors only." },
    { rule: "Ex-exclusivity carve-out", detail: "Existing partners and non-competing categories are always excluded from exclusivity." },
    { rule: "Payment & revisions", detail: "50% deposit on signature, balance Net 30; two revision rounds, extras at 10% of fee." },
  ];

  const who = handle ?? (mode === "product" ? "your product" : "you");
  const positioning =
    mode === "product"
      ? `${n.label} product: target creators with ${tier.toLowerCase()} reach on ${platforms.join(", ")}, budget ~${money(packageFloor)} per creator package.`
      : `${tier} ${n.label.toLowerCase()} creator (~${Math.round(audience / 1000)}k${stated ? "" : " est."} audience) with premium ${n.cpm >= 1.3 ? "advertiser demand" : "brand-safe reach"} on ${platforms.join(", ")}.`;

  return {
    profile: { handle, niche, nicheLabel: n.label, platforms, audience, audienceSource: stated ? "stated" : "estimated", mode, tier },
    positioning,
    floorRates,
    packageFloor,
    outreach: {
      totalTargets: targets.length,
      waves: [
        { name: "Wave 1 · Perfect-fit sponsors", day: "Day 1", count: 18, focus: `${n.categories[0]} & ${n.categories[1]}` },
        { name: "Wave 2 · Adjacent categories", day: "Day 3", count: 18, focus: `${n.categories[2]} & ${n.categories[3]}` },
        { name: "Wave 3 · Stretch & seasonal", day: "Day 7", count: 18, focus: `${n.categories[4]} + Q4 budgets` },
      ],
      targets,
      cadence: ["Personalised opener citing a recent campaign", "Media kit + rate card on reply", "Follow-up on day 4 with a case study", "Final nudge on day 10, then park for 60 days"],
    },
    guardrails,
    agentReply: `I've mapped ${who}. ${positioning} I priced ${floorRates.length} formats, queued ${targets.length} sponsors across three outreach waves, and locked negotiation guardrails so nothing closes below ${money(packageFloor)}.`,
    source: "planner",
    model: null,
  };
}
