import { scoreSignal, SWEEPABLE, type Platform, type PulseSignal, type RawSignal, type SignalKind } from "./signal";

/**
 * Mass-scale simulated omnichannel stream for the IntentPulse command center. Sample data in the
 * voice of each platform (DMs, posts, comments, threads, form webhooks) across buyer scenarios,
 * each signal scored by the real engine. Used when USE_LIVE_APIFY is off, so no Actor credits burn.
 * Safe on both server and client.
 */

export type Scenario = "enterprise" | "agency" | "evaluator" | "competitor" | "student" | "cold";

export const SCENARIO_LABEL: Record<Scenario, string> = {
  enterprise: "Enterprise $50k+ buyer",
  agency: "Urgent agency request",
  evaluator: "Vendor evaluator",
  competitor: "Competitor recon",
  student: "Student / intern",
  cold: "Cold browser",
};

const SCENARIO_WEIGHTS: Record<Scenario, number> = { enterprise: 10, agency: 16, evaluator: 30, competitor: 10, student: 12, cold: 22 };

const PLATFORM_WEIGHTS: Record<Platform, number> = { x: 32, instagram: 22, tiktok: 12, reddit: 12, linkedin: 10, email: 7, webhook: 5 };

const KIND_BY_PLATFORM: Record<Platform, SignalKind[]> = {
  instagram: ["dm", "dm", "comment", "post"],
  x: ["post", "post", "comment", "dm"],
  tiktok: ["comment", "comment", "post"],
  reddit: ["thread", "comment"],
  linkedin: ["dm", "post", "comment"],
  email: ["email"],
  webhook: ["webhook"],
};

// {co} company · {stack} tools · {n} headcount · {when} deadline · {b} budget · {kw} sweep keyword
const TEXT: Record<Scenario, string[]> = {
  enterprise: [
    "We've approved budget ({b}) for an AI lead-routing rollout across {n} reps. Procurement is looped in, we need SOC 2, SSO via Okta and a Salesforce API integration. Go-live is {when}. Who can run a pilot next week?",
    "RFP goes out Friday. {co} needs an intent-scoring platform that plugs into {stack}. Budget allocated at {b}, contract ready to sign this quarter. DM me if you can support {n} employees.",
    "Looking for an enterprise partner for {kw}. Budget is set ({b}), we're on {stack}, ~{n} staff. Hard deadline {when}. Can we get pricing and a demo this week?",
    "Our board signed off on {b} for {kw}. Need implementation ASAP with webhook + API access into {stack}. Can your team scope a pilot for {n} users before {when}?",
    "Replacing our current vendor at {co}. Funded, {b} purchase order ready, {n} seats. Must integrate with {stack} and have SSO. Timeline: launch {when}.",
  ],
  agency: [
    "URGENT: client launch moved up, need an agency to own {kw} by {when}. {b} budget approved. We run {stack}. Can you start immediately?",
    "Agency owner here. We need a white-label {kw} partner for 3 accounts, {b} per month, start date next week. Slack + HubSpot shop.",
    "Who can build custom AI infrastructure for our agency ASAP? Deadline {when}, budget around {b}, integration with our CRM via API is a must.",
    "Need help yesterday: {kw} for a retail client, {b} budget, go live {when}. We're on {stack}. Founder, 40 people.",
  ],
  evaluator: [
    "Comparing a few vendors for {kw}. Do you integrate with {stack}? Budget depends on scope.",
    "Any recommendations for {kw} tools? Not sure on budget yet, maybe a demo later this quarter.",
    "We use HubSpot and spreadsheets for {kw} today, exploring options. What does onboarding look like?",
    "Thinking about replacing our current tool. Does it work with Slack and Zapier? Budget TBD.",
    "Head of growth at a small team. Looking at {kw} options, timeline is maybe next quarter, budget depends on pricing.",
  ],
  competitor: [
    "We're building a similar tool for {kw}. How does your scoring work under the hood?",
    "Benchmarking competitors for our roadmap. What's your routing logic and which CRMs do you integrate with?",
    "Doing a competitive analysis of {kw} platforms. How is your pricing structured per seat?",
    "PM at a rival platform, benchmarking intent scoring. Can you share how your model weights urgency?",
  ],
  student: [
    "Student here doing a research project on {kw}. Can I interview someone from your team?",
    "Working on my thesis about lead scoring for a university course. Any docs on how {kw} works?",
    "For a class assignment: how do tools like this classify buyer intent? Intern at a startup, no budget.",
    "Business school student, writing a case study on {kw}. Would love a free trial for the course.",
  ],
  cold: [
    "Just browsing, maybe later next year. Cool thread on {kw} though.",
    "Following for later, not ready yet. Saving this {kw} breakdown.",
    "Just curious how this works. No rush.",
    "Love this aesthetic 😍 just looking for now.",
  ],
};

const BUDGET: Record<Scenario, [number, number] | null> = {
  enterprise: [80, 480],
  agency: [25, 150],
  evaluator: [6, 60],
  competitor: [20, 80],
  student: null,
  cold: [0, 4],
};

const TITLES: Record<Scenario, string[]> = {
  enterprise: ["VP Revenue Operations", "CTO", "Chief Revenue Officer", "VP Engineering", "Head of Sales Ops", "CFO"],
  agency: ["Founder", "Agency Owner", "Director of Client Services", "CEO"],
  evaluator: ["Growth Manager", "Marketing Lead", "Ops Manager", "Head of Growth"],
  competitor: ["Product Manager", "Competitive Intel Analyst", "Product Marketing Manager"],
  student: ["Student", "Marketing Intern", "MBA Candidate"],
  cold: ["Creator", "Designer", ""],
};

const FIRST = ["Mara", "Leo", "Priya", "Jonah", "Amara", "Kenji", "Sofia", "Diego", "Noor", "Elias", "Hana", "Marco", "Zoe", "Ravi", "Ines", "Theo", "Lena", "Omar", "Yuki", "Nadia", "Aaron", "Bea", "Cyrus", "Dalia", "Felix", "Greta"];
const LAST = ["Ellison", "Okafor", "Raman", "Pike", "Lindqvist", "Sato", "Moreau", "Alvarez", "Haddad", "Novak", "Kim", "Rossi", "Becker", "Iyer", "Costa", "Weber", "Nakamura", "Farah", "Quinn", "Varga"];
const COMPANIES = ["Halvorsen Logistics", "Northwind Clinics", "Lumen Labs", "Arcadia Health", "Vantage Freight", "Corvid Capital", "Brightline Retail", "Meridian Bank", "Atlas Robotics", "Solace Insurance", "Helix Biotech", "Orbital Payments", "Kestrel Studios", "Juniper Commerce"];
const AGENCIES = ["Northstar Creative", "Field & Form", "Velvet Signal Agency", "Ninefold Media", "Oxbow Digital"];
const SCHOOLS = ["State University", "City College", "Polytechnic Institute", "Business School"];
const RIVALS = ["SignalForge", "LeadLoom", "IntentHive", "ScoreStack"];
const STACKS = ["Salesforce, Snowflake and Okta SSO", "HubSpot, Segment and BigQuery", "Salesforce and Slack", "HubSpot and Zapier", "AWS, Slack and HubSpot", "Marketo and Salesforce"];
const DEADLINES = ["end of quarter", "next week", "this quarter", "in 3 weeks", "before the Q3 launch"];
export const SUBREDDITS = ["SaaS", "marketing", "sales", "startups", "agency", "Entrepreneur"];
const REELS = ["How we 3×'d inbound in 30 days", "Our AI SDR booked 41 calls", "Stop scoring leads by hand", "The $50k client playbook"];
const VIDEOS = ["POV: your DMs qualify themselves", "I let an AI run my sales for a week", "3 signs a lead is ready to buy", "Agency owner day in the life"];
const DEFAULT_KEYWORDS = ["lead routing", "AI agency", "intent data", "sales automation", "B2B growth"];

/** Small seeded PRNG (mulberry32). */
export function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, items: readonly T[]) => items[Math.floor(r() * items.length)];

function weighted<K extends string>(r: () => number, weights: Record<K, number>): K {
  const entries = Object.entries(weights) as [K, number][];
  let roll = r() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) {
    roll -= w;
    if (roll <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

const digits = (r: () => number, n: number) => Array.from({ length: n }, (_, i) => (i === 0 ? 1 + Math.floor(r() * 9) : Math.floor(r() * 10))).join("");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function followers(r: () => number, scenario: Scenario) {
  const base = scenario === "enterprise" ? 4000 : scenario === "agency" ? 2500 : scenario === "cold" ? 300 : 900;
  // Long-tailed: most accounts are small, a few are large.
  return Math.round(base * Math.exp(r() * 4.2) * (0.3 + r()));
}

function money(k: number) {
  return k >= 1000 ? `$${(k / 1000).toFixed(1)}M` : `$${Math.round(k)}k`;
}

function sourceUrl(r: () => number, platform: Platform, kind: SignalKind, handle: string, text: string, subreddit: string) {
  const h = handle.replace(/^[@u/]+/, "");
  switch (platform) {
    case "x":
      return `https://x.com/${h}/status/${digits(r, 19)}`;
    case "instagram":
      return kind === "dm" ? `https://www.instagram.com/direct/t/${digits(r, 17)}` : `https://www.instagram.com/p/${Math.floor(r() * 36 ** 8).toString(36).padStart(8, "0")}/`;
    case "tiktok":
      return `https://www.tiktok.com/@${h}/video/${digits(r, 19)}`;
    case "reddit":
      return `https://www.reddit.com/r/${subreddit}/comments/${Math.floor(r() * 36 ** 6).toString(36)}/${slug(text.split(/[.?!]/)[0]).slice(0, 48)}/`;
    case "linkedin":
      return kind === "dm" ? `https://www.linkedin.com/messaging/thread/${digits(r, 16)}` : `https://www.linkedin.com/feed/update/urn:li:activity:${digits(r, 19)}`;
    case "email":
    case "webhook":
      return null;
  }
}

export type SimOptions = { platforms?: Platform[]; keywords?: string[]; scenario?: Scenario; subreddits?: string[] };

/** One hyper-detailed simulated signal, already scored. */
export function simulateSignal(r: () => number, seq: number, opts: SimOptions = {}): PulseSignal {
  const allowed = opts.platforms?.length ? opts.platforms : undefined;
  const weights = allowed
    ? (Object.fromEntries(allowed.map((p) => [p, PLATFORM_WEIGHTS[p]])) as Record<Platform, number>)
    : PLATFORM_WEIGHTS;
  const platform = weighted(r, weights);
  const scenario = opts.scenario ?? weighted(r, SCENARIO_WEIGHTS);
  const keyword = pick(r, opts.keywords?.length ? opts.keywords : DEFAULT_KEYWORDS);

  const first = pick(r, FIRST);
  const last = pick(r, LAST);
  const company =
    scenario === "student" ? pick(r, SCHOOLS) : scenario === "competitor" ? pick(r, RIVALS) : scenario === "agency" ? pick(r, AGENCIES) : pick(r, COMPANIES);
  const range = BUDGET[scenario];
  const budgetK = range ? Math.round(range[0] + r() * (range[1] - range[0])) : null;
  const n = scenario === "enterprise" ? 200 + Math.floor(r() * 2400) : 10 + Math.floor(r() * 90);

  const text = pick(r, TEXT[scenario])
    .replaceAll("{co}", company)
    .replaceAll("{stack}", pick(r, STACKS))
    .replaceAll("{n}", n.toLocaleString("en-US"))
    .replaceAll("{when}", pick(r, DEADLINES))
    .replaceAll("{b}", budgetK === null ? "TBD" : money(budgetK))
    .replaceAll("{kw}", keyword);

  const handle =
    platform === "webhook"
      ? `form/${slug(company)}`
      : platform === "email"
        ? `${first.toLowerCase()}@${slug(company).replace(/-/g, "")}.com`
      : platform === "linkedin"
        ? `${first} ${last}`
      : platform === "reddit"
        ? `u/${first.toLowerCase()}_${last.toLowerCase().slice(0, 3)}${10 + Math.floor(r() * 90)}`
        : `@${first.toLowerCase()}${pick(r, ["", "_", "."])}${last.toLowerCase().slice(0, 5)}`;
  const kind = pick(r, KIND_BY_PLATFORM[platform]);
  const fans = platform === "webhook" || platform === "email" ? 0 : followers(r, scenario);
  const subreddit = pick(r, opts.subreddits?.length ? opts.subreddits : SUBREDDITS);
  const context: RawSignal["context"] =
    platform === "reddit"
      ? { subreddit }
      : platform === "instagram" && kind !== "dm"
        ? { reel: pick(r, REELS) }
        : platform === "tiktok"
          ? { video: pick(r, VIDEOS) }
          : platform === "x"
            ? { mention: r() < 0.45 }
            : undefined;

  const raw: RawSignal = {
    id: `sim-${seq}`,
    platform,
    kind,
    author: {
      name: `${first} ${last}`,
      handle,
      verified: platform !== "webhook" && platform !== "email" && (scenario === "enterprise" ? r() < 0.55 : r() < 0.08 + Math.min(0.4, fans / 400000)),
      followers: fans,
      title: pick(r, TITLES[scenario]) || undefined,
      company,
    },
    text,
    url: sourceUrl(r, platform, kind, handle, text, subreddit),
    context,
    postedAt: new Date(Date.now() - Math.floor(r() * 90_000)).toISOString(),
    budgetK,
    engagement: platform === "webhook" || platform === "email" ? undefined : { likes: Math.floor(r() * fans * 0.04), replies: Math.floor(r() * 40) },
    origin: platform === "webhook" ? "webhook" : "simulated",
    keyword,
  };
  return scoreSignal(raw);
}

/** A batch for one simulated radar sweep across the given platforms. */
export function simulateSweep(count: number, opts: SimOptions & { seed?: number } = {}): PulseSignal[] {
  const r = seeded(opts.seed ?? Date.now() % 1_000_000);
  const platforms = (opts.platforms?.length ? opts.platforms : SWEEPABLE).filter((p) => p !== "webhook");
  const base = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const s = simulateSignal(r, i, { ...opts, platforms });
    return { ...s, id: `sweep-${base.toString(36)}-${i}` };
  });
}
