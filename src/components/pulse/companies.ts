import type { EngineKey } from "@/components/bloom/command/engines";
import type { PaintingKey } from "@/components/bloom/art/paintings";
import type { Pipeline, PipelineNode } from "@/components/desk/settings";
import type { ModelId } from "@/lib/engines/models";
import { BRAND_MARKS, type BrandMark } from "./brand-marks";

/**
 * The Global Pulse companies: one shared source for the architecture feed cards, the company pages and their
 * cinematic intros.
 *
 * PRIVATE SHOWCASE: real company names and logos exist only in a local desktop build (src/lib/showcase-gate.ts:
 * NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE=true via `npm run desktop:local`, never on Vercel), and even there render only
 * inside the desktop window (useShowcase in use-desktop.ts). In every other build the table below folds to null and
 * the bundler drops it, so the public website ships fictional companies only. These are ILLUSTRATIVE BLUEPRINTS of how
 * a company like each could run on Bloom: not their real systems, customers or results. Blueprint text says "{co}"
 * instead of a company name, so no real name is written into the content itself; brandOf() fills it in.
 */
export const SHOWCASE = process.env.BLOOM_SHOWCASE_BUILD === "true";

export type Brand = { name: string; monogram?: string; mark?: BrandMark; color: string };
export type CompanyId = "auto" | "streaming" | "analytics" | "commerce" | "building" | "games";
export const COMPANY_IDS: CompanyId[] = ["auto", "streaming", "analytics", "commerce", "building", "games"];

/** Real brands behind a build-time constant: without the flag this folds to null and the bundler drops them. */
const REAL: Record<CompanyId, Brand> | null = SHOWCASE
  ? {
      auto: { name: "Tesla", mark: BRAND_MARKS.tesla, color: "#CC0000" },
      streaming: { name: "Spotify", mark: BRAND_MARKS.spotify, color: "#1ED760" },
      analytics: { name: "Palantir", mark: BRAND_MARKS.palantir, color: "#E6E8EA" },
      commerce: { name: "Shopify", mark: BRAND_MARKS.shopify, color: "#7AB55C" },
      building: { name: "Builders FirstSource", monogram: "BFS", color: "#F2A900" },
      games: { name: "Epic Games", mark: BRAND_MARKS.epicgames, color: "#E6E8EA" },
    }
  : null;

export type Site = { name: string; lon: number; lat: number };

export type Workflow = {
  id: string;
  name: string;
  trigger: string;
  cadence: string;
  /** Steps in order: which engine acts, and what it does. */
  steps: { engine: EngineKey; action: string }[];
  approval: string;
  output: string;
  /** Live-feed lines for this workflow's Global Pulse; {site} and {n} are filled in. */
  events: string[];
};

export type Company = {
  id: CompanyId;
  fictional: Brand;
  industry: "auto" | "streaming" | "analytics" | "commerce" | "building" | "games";
  painting: PaintingKey;
  tagline: string;
  /** The feed card's agent graph: chain order plus cross-talk edges. */
  agents: EngineKey[];
  edges: [number, number][];
  savedHrs: number;
  preventedUsd: number;
  activeAgents: number;
  runsPerDay: number;
  sites: Site[];
  workflows: Workflow[];
  /** What each engine does in this company's setup. */
  roles: Partial<Record<EngineKey, string>>;
  models: Partial<Record<EngineKey, ModelId>>;
  governance: string[];
  sources: string[];
};

const AUSTIN: Site = { name: "Austin", lon: -97.74, lat: 30.27 };
const BERLIN: Site = { name: "Berlin", lon: 13.4, lat: 52.52 };
const LONDON: Site = { name: "London", lon: -0.12, lat: 51.5 };
const DENVER: Site = { name: "Denver", lon: -104.99, lat: 39.74 };
const STOCKHOLM: Site = { name: "Stockholm", lon: 18.07, lat: 59.33 };

export const COMPANIES: Company[] = [
  {
    id: "auto",
    fictional: { name: "Voltara Motors", monogram: "VM", color: "#CC0000" },
    industry: "auto",
    painting: "forge",
    tagline: "Agents that keep {co}'s supply chain and factories moving.",
    agents: ["aether", "coreops", "cortex", "shield", "sovereign"],
    edges: [[0, 1], [1, 2], [2, 4], [3, 4], [1, 3], [0, 2]],
    savedHrs: 340,
    preventedUsd: 120_000,
    activeAgents: 48,
    runsPerDay: 1_920,
    sites: [AUSTIN, { name: "Fremont", lon: -121.99, lat: 37.55 }, { name: "Reno", lon: -119.81, lat: 39.53 }, BERLIN, { name: "Shanghai", lon: 121.47, lat: 31.23 }],
    workflows: [
      {
        id: "battery-supply",
        name: "Battery supply-chain sentinel",
        trigger: "A supplier shipment slips or a cell price feed moves",
        cadence: "Every 15 minutes",
        steps: [
          { engine: "coreops", action: "Reconciles purchase orders against confirmed deliveries" },
          { engine: "aether", action: "Models the cost impact of the price move per vehicle" },
          { engine: "shield", action: "Scores supplier risk and finds alternates" },
          { engine: "sovereign", action: "Routes any re-sourcing over $250K for sign-off" },
        ],
        approval: "Supplier switches above $250K",
        output: "A re-sourcing plan with the cost delta per vehicle",
        events: ["Cell shipment to {site} rerouted, {n} hours recovered", "Price move modeled at {site}: ${n} per pack impact", "Alternate supplier qualified for {site}"],
      },
      {
        id: "line-drift",
        name: "Factory line drift watch",
        trigger: "Line telemetry summaries drift from baseline",
        cadence: "Continuous",
        steps: [
          { engine: "cortex", action: "Reasons over drift patterns across stations" },
          { engine: "coreops", action: "Opens maintenance work orders with parts attached" },
          { engine: "sovereign", action: "Holds line changes until a shift lead signs" },
        ],
        approval: "Any change to a running production line",
        output: "Ranked maintenance actions with the throughput at stake",
        events: ["Station drift caught at {site}, {n} units protected", "Work order opened at {site} with parts reserved"],
      },
      {
        id: "service-balance",
        name: "Service-center demand balancing",
        trigger: "Service bookings spike in a region",
        cadence: "Hourly",
        steps: [
          { engine: "aether", action: "Forecasts demand by region for the next 14 days" },
          { engine: "coreops", action: "Rebalances technicians and mobile service vans" },
          { engine: "shield", action: "Warns affected owners before delays land" },
        ],
        approval: "Technician moves across regions",
        output: "A rebalanced schedule and proactive owner notices",
        events: ["{n} technicians rebalanced toward {site}", "Owners near {site} notified ahead of a delay"],
      },
    ],
    roles: { aether: "Unit economics and cost modeling", coreops: "Operations reconciliation", cortex: "Anomaly reasoning", shield: "Supplier and owner risk", sovereign: "Governance and approvals" },
    models: { sovereign: "claude-opus-5-5", cortex: "claude-opus-5-5", aether: "claude-sonnet-5-5", coreops: "claude-haiku-5-5", shield: "claude-sonnet-5-5" },
    governance: ["Supplier switches over $250K need a named human", "Production line changes wait for a shift lead's signature", "No owner-facing message ships without Shield review"],
    sources: ["ERP purchase orders", "Supplier price feeds", "Line telemetry summaries", "Service bookings"],
  },
  {
    id: "streaming",
    fictional: { name: "Cadence Stream", monogram: "CS", color: "#1ED760" },
    industry: "streaming",
    painting: "venice",
    tagline: "Agents that keep {co}'s catalog, creators and royalties in tune.",
    agents: ["intentpulse", "cortex", "vanguard", "apex"],
    edges: [[0, 1], [1, 2], [2, 3], [0, 3], [1, 3]],
    savedHrs: 512,
    preventedUsd: 86_000,
    activeAgents: 36,
    runsPerDay: 4_400,
    sites: [STOCKHOLM, { name: "New York", lon: -74.0, lat: 40.71 }, LONDON, { name: "São Paulo", lon: -46.63, lat: -23.55 }, { name: "Tokyo", lon: 139.69, lat: 35.68 }],
    workflows: [
      {
        id: "royalty-recon",
        name: "Royalty reconciliation",
        trigger: "A payout batch closes",
        cadence: "Daily",
        steps: [
          { engine: "coreops", action: "Reconciles play counts against payout lines" },
          { engine: "aether", action: "Checks rate tiers and territory splits" },
          { engine: "sovereign", action: "Approves corrections before they post" },
        ],
        approval: "Any payout correction",
        output: "A corrected payout file with every change explained",
        events: ["{n} payout lines reconciled for {site}", "Territory split corrected in {site}"],
      },
      {
        id: "creator-radar",
        name: "Creator intent radar",
        trigger: "A track or artist accelerates in a market",
        cadence: "Every 30 minutes",
        steps: [
          { engine: "intentpulse", action: "Detects breakout artists and genres per market" },
          { engine: "cortex", action: "Explains why the signal is real, not a spike" },
          { engine: "vanguard", action: "Drafts outreach to labels and curators" },
        ],
        approval: "Outreach before it sends",
        output: "A ranked breakout list with outreach drafts",
        events: ["Breakout artist flagged in {site}, {n}x week-over-week", "Curator outreach drafted for {site}"],
      },
      {
        id: "ad-deals",
        name: "Ad-deal closing desk",
        trigger: "An advertiser opens a campaign brief",
        cadence: "On demand",
        steps: [
          { engine: "apex", action: "Prices audience packages against inventory" },
          { engine: "vanguard", action: "Runs the follow-up sequence" },
          { engine: "sovereign", action: "Approves discounts above 15%" },
        ],
        approval: "Discounts above 15%",
        output: "A priced proposal and follow-up plan",
        events: ["Campaign package priced for {site}, ${n}K", "Discount request routed for sign-off in {site}"],
      },
    ],
    roles: { intentpulse: "Trend and demand signals", cortex: "Signal reasoning", vanguard: "Partner and label outreach", apex: "Deal pricing and closing", coreops: "Royalty reconciliation", aether: "Rate and split modeling", sovereign: "Governance and approvals" },
    models: { intentpulse: "claude-haiku-5-5", cortex: "claude-opus-5-5", vanguard: "claude-sonnet-5-5", apex: "claude-sonnet-5-5", coreops: "claude-haiku-5-5", aether: "claude-sonnet-5-5", sovereign: "claude-opus-5-5" },
    governance: ["Every payout correction is approved before posting", "Discounts above 15% need a sales lead", "Outreach is reviewed before it sends"],
    sources: ["Stream and play logs", "Payout ledgers", "Market charts", "Campaign briefs"],
  },
  {
    id: "analytics",
    fictional: { name: "Lattice Analytics", monogram: "LA", color: "#E6E8EA" },
    industry: "analytics",
    painting: "wanderer",
    tagline: "Agents that watch {co}'s exposure, access and deployments.",
    agents: ["cortex", "shield", "sovereign", "aether"],
    edges: [[0, 1], [1, 2], [0, 3], [3, 2], [0, 2]],
    savedHrs: 288,
    preventedUsd: 240_000,
    activeAgents: 30,
    runsPerDay: 1_150,
    sites: [DENVER, { name: "Washington", lon: -77.04, lat: 38.9 }, LONDON, { name: "Palo Alto", lon: -122.14, lat: 37.44 }, { name: "Canberra", lon: 149.13, lat: -35.28 }],
    workflows: [
      {
        id: "counterparty",
        name: "Counterparty exposure audit",
        trigger: "A contract is signed or amended",
        cadence: "On every change",
        steps: [
          { engine: "cortex", action: "Extracts obligations, caps and renewal terms" },
          { engine: "shield", action: "Scores counterparty exposure against limits" },
          { engine: "sovereign", action: "Escalates breaches to the risk owner" },
        ],
        approval: "Exposure above the set limit",
        output: "An exposure register with breaches flagged",
        events: ["Contract terms extracted in {site}, {n} obligations tracked", "Exposure limit breach escalated in {site}"],
      },
      {
        id: "access-guard",
        name: "Data-access policy guard",
        trigger: "An access request or permission change",
        cadence: "Continuous",
        steps: [
          { engine: "shield", action: "Checks the request against policy and history" },
          { engine: "sovereign", action: "Approves, holds or blocks with the rule cited" },
          { engine: "coreops", action: "Revokes stale access on schedule" },
        ],
        approval: "Any access to restricted datasets",
        output: "A signed decision for every access change",
        events: ["{n} stale grants revoked in {site}", "Restricted-data request held for review in {site}"],
      },
      {
        id: "deploy-digest",
        name: "Deployment health digest",
        trigger: "End of each operating week",
        cadence: "Weekly",
        steps: [
          { engine: "aether", action: "Computes cost per deployment and trend" },
          { engine: "cortex", action: "Summarizes incidents and root causes" },
          { engine: "sovereign", action: "Signs the executive brief" },
        ],
        approval: "Brief before it circulates",
        output: "A signed weekly brief for leadership",
        events: ["Deployment cost trend computed for {site}", "Incident summary signed for {site}"],
      },
    ],
    roles: { cortex: "Contract and incident reasoning", shield: "Exposure and access policy", sovereign: "Governance and signatures", aether: "Deployment cost modeling", coreops: "Access hygiene" },
    models: { cortex: "claude-opus-5-5", shield: "claude-opus-5-5", sovereign: "claude-opus-5-5", aether: "claude-sonnet-5-5", coreops: "claude-haiku-5-5" },
    governance: ["Restricted datasets need an approver of record", "Every access decision is signed and cites its rule", "Briefs circulate only after signature"],
    sources: ["Contract repository", "Access logs", "Deployment metrics", "Incident reports"],
  },
  {
    id: "commerce",
    fictional: { name: "Marketline Commerce", monogram: "MC", color: "#7AB55C" },
    industry: "commerce",
    painting: "goldenLandscape",
    tagline: "Agents that protect and grow {co}'s merchants.",
    agents: ["intentpulse", "apex", "coreops", "shield"],
    edges: [[0, 1], [1, 2], [2, 3], [0, 2], [3, 1]],
    savedHrs: 610,
    preventedUsd: 310_000,
    activeAgents: 64,
    runsPerDay: 8_700,
    sites: [{ name: "Ottawa", lon: -75.7, lat: 45.42 }, { name: "Toronto", lon: -79.38, lat: 43.65 }, { name: "Dublin", lon: -6.26, lat: 53.35 }, BERLIN, { name: "Singapore", lon: 103.82, lat: 1.35 }],
    workflows: [
      {
        id: "fraud-review",
        name: "Merchant fraud review",
        trigger: "Chargeback or risk score crosses a threshold",
        cadence: "Real time",
        steps: [
          { engine: "shield", action: "Scores chargeback and account-takeover risk" },
          { engine: "coreops", action: "Holds the affected payouts" },
          { engine: "sovereign", action: "Approves holds above $10K" },
        ],
        approval: "Payout holds above $10K",
        output: "Held payouts with evidence and a release plan",
        events: ["Payout hold placed in {site}, ${n}K protected", "Account-takeover pattern blocked in {site}"],
      },
      {
        id: "growth-radar",
        name: "Merchant growth radar",
        trigger: "A store's sales or traffic accelerate",
        cadence: "Hourly",
        steps: [
          { engine: "intentpulse", action: "Finds merchants scaling fastest" },
          { engine: "apex", action: "Prepares a plan-upgrade offer" },
        ],
        approval: "Custom pricing offers",
        output: "Upgrade offers for merchants ready to scale",
        events: ["{n} scaling merchants found in {site}", "Upgrade offer prepared for a {site} merchant"],
      },
      {
        id: "checkout-recon",
        name: "Checkout drift reconciliation",
        trigger: "Daily settlement closes",
        cadence: "Daily",
        steps: [
          { engine: "coreops", action: "Reconciles orders against settled payments" },
          { engine: "aether", action: "Finds fee and refund leakage" },
          { engine: "sovereign", action: "Approves adjustments" },
        ],
        approval: "Ledger adjustments",
        output: "A settlement report with leakage recovered",
        events: ["{n} orders reconciled in {site}", "Fee leakage recovered in {site}"],
      },
    ],
    roles: { intentpulse: "Merchant growth signals", apex: "Upgrade offers", coreops: "Payouts and reconciliation", shield: "Fraud and risk", aether: "Fee and refund analysis", sovereign: "Governance and approvals" },
    models: { intentpulse: "claude-haiku-5-5", apex: "claude-sonnet-5-5", coreops: "claude-haiku-5-5", shield: "claude-opus-5-5", aether: "claude-sonnet-5-5", sovereign: "claude-opus-5-5" },
    governance: ["Payout holds above $10K need a risk lead", "Custom pricing needs a sales lead", "Ledger adjustments are approved and logged"],
    sources: ["Orders and payments", "Chargeback feeds", "Store analytics", "Settlement files"],
  },
  {
    id: "building",
    fictional: { name: "Keystone Building Supply", monogram: "KB", color: "#F2A900" },
    industry: "building",
    painting: "athens",
    tagline: "Agents that keep {co}'s bids, crews and deliveries on margin.",
    agents: ["coreops", "aether", "apex", "sovereign"],
    edges: [[0, 1], [1, 2], [2, 3], [0, 3], [1, 3]],
    savedHrs: 455,
    preventedUsd: 1_200_000,
    activeAgents: 52,
    runsPerDay: 2_600,
    sites: [{ name: "Irving", lon: -96.95, lat: 32.81 }, DENVER, { name: "Atlanta", lon: -84.39, lat: 33.75 }, { name: "Phoenix", lon: -112.07, lat: 33.45 }, { name: "Charlotte", lon: -80.84, lat: 35.23 }],
    workflows: [
      {
        id: "lumber-shock",
        name: "Lumber price shock response",
        trigger: "Commodity lumber prices move past a band",
        cadence: "Every 15 minutes",
        steps: [
          { engine: "aether", action: "Models margin impact across open bids" },
          { engine: "apex", action: "Re-quotes the bids at risk" },
          { engine: "sovereign", action: "Approves price changes to customers" },
        ],
        approval: "Customer price changes",
        output: "Re-quoted bids with margin restored",
        events: ["{n} open bids re-quoted in {site}", "Margin restored on a {site} framing package"],
      },
      {
        id: "sub-drift",
        name: "Subcontractor drift recovery",
        trigger: "Field logs and invoices disagree",
        cadence: "Daily",
        steps: [
          { engine: "coreops", action: "Reconciles field logs against subcontractor invoices" },
          { engine: "aether", action: "Quantifies the margin leakage per job" },
          { engine: "sovereign", action: "Approves back-charges" },
        ],
        approval: "Back-charges to subcontractors",
        output: "Back-charge packages with the evidence attached",
        events: ["Invoice drift caught in {site}, ${n}K recovered", "{n} field logs reconciled in {site}"],
      },
      {
        id: "delivery-orchestration",
        name: "Job-site delivery orchestration",
        trigger: "A job schedule or truck route changes",
        cadence: "Continuous",
        steps: [
          { engine: "coreops", action: "Re-sequences deliveries and truck routes" },
          { engine: "shield", action: "Warns builders before a delay hits" },
        ],
        approval: "Rescheduling a committed delivery",
        output: "An updated delivery plan and builder notices",
        events: ["{n} deliveries re-sequenced around {site}", "Builders near {site} warned of a delay"],
      },
    ],
    roles: { coreops: "Field and delivery reconciliation", aether: "Margin and price modeling", apex: "Bids and re-quotes", sovereign: "Governance and approvals", shield: "Builder communication" },
    models: { coreops: "claude-haiku-5-5", aether: "claude-sonnet-5-5", apex: "claude-sonnet-5-5", sovereign: "claude-opus-5-5", shield: "claude-sonnet-5-5" },
    governance: ["Customer price changes need a branch manager", "Back-charges need evidence and approval", "Committed deliveries move only with sign-off"],
    sources: ["Field logs", "Subcontractor invoices", "Commodity price feeds", "Truck routes"],
  },
  {
    id: "games",
    fictional: { name: "Starforge Interactive", monogram: "SI", color: "#E6E8EA" },
    industry: "games",
    painting: "issus",
    tagline: "Agents that run {co}'s live worlds, fair play and creator payouts.",
    agents: ["vanguard", "cortex", "shield", "coreops"],
    edges: [[0, 1], [1, 2], [1, 3], [3, 2], [0, 3]],
    savedHrs: 390,
    preventedUsd: 175_000,
    activeAgents: 44,
    runsPerDay: 12_300,
    sites: [{ name: "Cary", lon: -78.78, lat: 35.79 }, { name: "Seattle", lon: -122.33, lat: 47.61 }, LONDON, { name: "Seoul", lon: 126.98, lat: 37.57 }, STOCKHOLM],
    workflows: [
      {
        id: "live-ops",
        name: "Live-ops event command",
        trigger: "A season event goes live",
        cadence: "During every event",
        steps: [
          { engine: "vanguard", action: "Targets player segments with offers" },
          { engine: "cortex", action: "Reads community sentiment in real time" },
          { engine: "sovereign", action: "Approves in-store price changes" },
        ],
        approval: "Store price changes",
        output: "Live event adjustments with sentiment tracked",
        events: ["Event offer tuned for players in {site}", "Sentiment shift caught in {site}, {n} threads read"],
      },
      {
        id: "anti-cheat",
        name: "Anti-cheat escalation",
        trigger: "Detection signals cross a confidence bar",
        cadence: "Real time",
        steps: [
          { engine: "shield", action: "Correlates detection signals per account" },
          { engine: "cortex", action: "Reviews the evidence and writes the case" },
          { engine: "sovereign", action: "Approves bans before they apply" },
        ],
        approval: "Every ban",
        output: "Evidence-backed ban cases with appeals ready",
        events: ["{n} cheat signals correlated in {site}", "Ban case prepared for review in {site}"],
      },
      {
        id: "creator-payouts",
        name: "Creator payout reconciliation",
        trigger: "Monthly creator payout run",
        cadence: "Monthly",
        steps: [
          { engine: "coreops", action: "Reconciles creator codes against purchases" },
          { engine: "aether", action: "Checks revenue-share tiers" },
          { engine: "sovereign", action: "Approves the payout file" },
        ],
        approval: "The payout file",
        output: "A verified payout file per creator",
        events: ["{n} creator codes reconciled in {site}", "Payout tier corrected for a {site} creator"],
      },
    ],
    roles: { vanguard: "Player segment offers", cortex: "Sentiment and evidence review", shield: "Fair-play detection", coreops: "Creator payouts", aether: "Revenue-share modeling", sovereign: "Governance and approvals" },
    models: { vanguard: "claude-sonnet-5-5", cortex: "claude-opus-5-5", shield: "claude-sonnet-5-5", coreops: "claude-haiku-5-5", aether: "claude-sonnet-5-5", sovereign: "claude-opus-5-5" },
    governance: ["Every ban is approved by a human", "Store price changes need a live-ops lead", "Creator payouts are approved before they send"],
    sources: ["Match and detection telemetry", "Community channels", "Store transactions", "Creator codes"],
  },
];

export const companyById = (id: string): Company | undefined => COMPANIES.find((c) => c.id === id);
/** The brand to show. `showcase` comes from useShowcase(): without it (the default) the fictional company is used. */
export const brandOf = (c: Company, showcase = false): Brand => (showcase ? REAL?.[c.id] : null) ?? c.fictional;
/** Fills a blueprint string's {co} with the company name. */
export const withCo = (text: string, c: Company, showcase = false) => text.replace(/\{co\}/g, brandOf(c, showcase).name);
export const money = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);

/** Every engine this company's setup uses, in roster order. */
export const rosterOf = (c: Company): EngineKey[] => [...new Set([...c.agents, ...c.workflows.flatMap((w) => w.steps.map((s) => s.engine))])];

/** A linear builder pipeline (input → each engine once → output) from a chain of engines. */
export function toPipeline(idPrefix: string, name: string, chain: EngineKey[]): Pipeline {
  const engines = [...new Set(chain)];
  const nodes: PipelineNode[] = [
    { id: "in", kind: "input", x: 40, y: 160 },
    ...engines.map((engine, i): PipelineNode => ({ id: `n${i}`, kind: "engine", engine, x: 220 + i * 190, y: 120 + (i % 2) * 90 })),
    { id: "out", kind: "output", x: 220 + engines.length * 190, y: 160 },
  ];
  const ids = nodes.map((x) => x.id);
  return { id: `pl-${idPrefix}-${Date.now().toString(36)}`, name, nodes, edges: ids.slice(1).map((id, i) => [ids[i], id] as [string, string]), updatedAt: Date.now() };
}
