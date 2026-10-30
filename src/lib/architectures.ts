import type { EngineKey } from "@/components/bloom/command/engines";

/**
 * The ten pre-packaged Bloom AI architectures: engine stacks in the order data flows through them, with
 * their deployment fee and monthly platform retainer (USD). Shared by the website's topology gallery and
 * the Operating Desk's architecture workspaces, so the products are defined once.
 *
 * `impact` is an illustrative operating model for the Explore views (before/after and ROI): typical figures
 * for a mid-market team, presented as estimates, never as guarantees.
 */
export type Architecture = {
  id: string;
  slug: string;
  name: string;
  engines: EngineKey[];
  setup: number;
  retainer: number;
  tagline: string;
  /** What enters the stack and what it delivers, for the node topology canvas. */
  inputs: string[];
  outputs: string[];
  impact: {
    /** Before vs after on three operating metrics; `better` says which direction is an improvement. */
    compare: { label: string; unit: string; before: number; after: number; better: "lower" | "higher" }[];
    /** Hours a week the stack takes off each person working the function. */
    hoursPerSeatWeek: number;
    /** Share of monthly revenue the function influences that the stack typically lifts. */
    revenueLiftPct: number;
  };
  /** A sample command for the simulation testbed. */
  sample: string;
};

export const ARCHITECTURES: Architecture[] = [
  {
    id: "inbound",
    slug: "inbound-signal-collector",
    name: "Inbound Signal Collector",
    engines: ["intentpulse", "sovereign"],
    setup: 35000,
    retainer: 8500,
    tagline: "IntentPulse catches buyers describing your problem; Sovereign routes budget and approvals to the hottest ones.",
    inputs: ["Reddit", "LinkedIn", "X", "Web forms"],
    outputs: ["Scored lead queue", "Approved spend"],
    impact: {
      compare: [
        { label: "Lead response time", unit: "hours", before: 26, after: 0.2, better: "lower" },
        { label: "Qualified leads / month", unit: "leads", before: 40, after: 118, better: "higher" },
        { label: "Manual triage", unit: "hrs/week", before: 14, after: 1.5, better: "lower" },
      ],
      hoursPerSeatWeek: 9,
      revenueLiftPct: 6,
    },
    sample: "Find people on Reddit and LinkedIn asking for help with lead follow-up, score them and route budget to the hottest. Budget $15k.",
  },
  {
    id: "outbound",
    slug: "autonomous-outbound-engine",
    name: "Autonomous Outbound Engine",
    engines: ["intentpulse", "vanguard", "apex"],
    setup: 50000,
    retainer: 14500,
    tagline: "Buying signals feed Vanguard's outreach, and Apex works every reply until it's signed.",
    inputs: ["Intent signals", "Target accounts", "Hiring & funding triggers"],
    outputs: ["Booked meetings", "Proposals", "Signed deals"],
    impact: {
      compare: [
        { label: "Meetings booked / month", unit: "meetings", before: 12, after: 41, better: "higher" },
        { label: "SDR hours on research", unit: "hrs/week", before: 22, after: 3, better: "lower" },
        { label: "Reply-to-meeting time", unit: "days", before: 4, after: 0.5, better: "lower" },
      ],
      hoursPerSeatWeek: 14,
      revenueLiftPct: 11,
    },
    sample: "Build an outbound push into Series A SaaS companies hiring SDRs, then work every reply to a proposal. $24k ACV.",
  },
  {
    id: "fullfunnel",
    slug: "full-funnel-closing-suite",
    name: "Full-Funnel Closing Suite",
    engines: ["vanguard", "cortex", "aether"],
    setup: 65000,
    retainer: 22000,
    tagline: "Vanguard opens the deals, Cortex closes them, and Aether makes sure each one is priced to win.",
    inputs: ["ICP accounts", "Call transcripts", "Price book"],
    outputs: ["Pipeline", "Objection maps", "Discount guardrails"],
    impact: {
      compare: [
        { label: "Win rate", unit: "%", before: 19, after: 31, better: "higher" },
        { label: "Average discount", unit: "%", before: 18, after: 9, better: "lower" },
        { label: "Sales cycle", unit: "days", before: 74, after: 48, better: "lower" },
      ],
      hoursPerSeatWeek: 11,
      revenueLiftPct: 14,
    },
    sample: "Deals stall after the demo on price vs Acme. Open new pipeline, map the objections and set discount rules. $60k ACV.",
  },
  {
    id: "retention",
    slug: "retention-churn-shield",
    name: "Retention & Churn Shield",
    engines: ["shield", "aether", "sovereign"],
    setup: 45000,
    retainer: 12500,
    tagline: "Shield spots churn early, Aether prices the save, and Sovereign signs off within your limits.",
    inputs: ["Product usage", "Support tickets", "Billing events"],
    outputs: ["Health scores", "Save offers", "Approved concessions"],
    impact: {
      compare: [
        { label: "Gross churn", unit: "%/yr", before: 14, after: 8.5, better: "lower" },
        { label: "At-risk accounts caught early", unit: "%", before: 30, after: 85, better: "higher" },
        { label: "CSM hours on reporting", unit: "hrs/week", before: 9, after: 1, better: "lower" },
      ],
      hoursPerSeatWeek: 8,
      revenueLiftPct: 5,
    },
    sample: "Usage at Halcyon Health dropped 30%, renewal in 60 days. Score our accounts, price the save and approve concessions up to $20k.",
  },
  {
    id: "executive",
    slug: "executive-authority-engine",
    name: "Executive Authority Engine",
    engines: ["coreops", "shield", "sovereign"],
    setup: 35000,
    retainer: 9500,
    tagline: "Back office, retention and governance run themselves, with every decision on the record.",
    inputs: ["CRM", "Billing", "Project tools"],
    outputs: ["Synced systems", "Health alerts", "Governed approvals"],
    impact: {
      compare: [
        { label: "Admin hours", unit: "hrs/week", before: 30, after: 6, better: "lower" },
        { label: "Records out of sync", unit: "records", before: 420, after: 15, better: "lower" },
        { label: "Approval turnaround", unit: "hours", before: 30, after: 2, better: "lower" },
      ],
      hoursPerSeatWeek: 12,
      revenueLiftPct: 3,
    },
    sample: "Client onboarding takes days and CRM, Billing and Project tool drift apart. Fix it and put approvals over $25k on the record.",
  },
  {
    id: "pipeline",
    slug: "pipeline-acceleration-stack",
    name: "Pipeline Acceleration Stack",
    engines: ["intentpulse", "vanguard", "cortex"],
    setup: 60000,
    retainer: 18500,
    tagline: "From the first buying signal to a briefed closer in hours instead of weeks.",
    inputs: ["Social signals", "Target lists", "Deal notes"],
    outputs: ["Qualified pipeline", "Closing briefs"],
    impact: {
      compare: [
        { label: "Signal-to-meeting time", unit: "days", before: 12, after: 1, better: "lower" },
        { label: "Pipeline created / month", unit: "$k", before: 180, after: 520, better: "higher" },
        { label: "Closer prep time", unit: "hrs/deal", before: 3, after: 0.3, better: "lower" },
      ],
      hoursPerSeatWeek: 13,
      revenueLiftPct: 12,
    },
    sample: "Find in-market SaaS buyers, open outbound to the best, and brief the closer on their likely objections.",
  },
  {
    id: "monetization",
    slug: "monetization-yield-optimizer",
    name: "Monetization Yield Optimizer",
    engines: ["cortex", "aether", "coreops"],
    setup: 50000,
    retainer: 16000,
    tagline: "Objection data reshapes your pricing, and CoreOps bills the new model the same day.",
    inputs: ["Objection logs", "Win/loss data", "Billing system"],
    outputs: ["New price book", "Guardrails", "Billing changes"],
    impact: {
      compare: [
        { label: "Average contract value", unit: "$k", before: 38, after: 46, better: "higher" },
        { label: "Margin given away in discounts", unit: "%", before: 16, after: 7, better: "lower" },
        { label: "Time to ship a price change", unit: "weeks", before: 6, after: 0.5, better: "lower" },
      ],
      hoursPerSeatWeek: 7,
      revenueLiftPct: 9,
    },
    sample: "We charge $1,200 a month and lose deals on price. Rework pricing from the objection data and update billing.",
  },
  {
    id: "postsale",
    slug: "post-sale-expansion-suite",
    name: "Post-Sale Expansion Suite",
    engines: ["shield", "aether", "cortex"],
    setup: 55000,
    retainer: 19500,
    tagline: "Find the expansion, price it right and close it, inside your existing customer base.",
    inputs: ["Usage telemetry", "Seat utilization", "Renewal calendar"],
    outputs: ["Expansion targets", "Upgrade pricing", "Upsell talk tracks"],
    impact: {
      compare: [
        { label: "Net revenue retention", unit: "%", before: 101, after: 118, better: "higher" },
        { label: "Expansion deals / quarter", unit: "deals", before: 9, after: 27, better: "higher" },
        { label: "Account review prep", unit: "hrs/acct", before: 4, after: 0.5, better: "lower" },
      ],
      hoursPerSeatWeek: 9,
      revenueLiftPct: 10,
    },
    sample: "Find which accounts are ready to expand, price the upgrade and arm the team for the conversation.",
  },
  {
    id: "lifecycle",
    slug: "lifecycle-orchestration-stack",
    name: "Lifecycle Orchestration Stack",
    engines: ["intentpulse", "apex", "shield"],
    setup: 75000,
    retainer: 28000,
    tagline: "Catch the buyer, close the deal, keep the customer: one loop from signal to renewal.",
    inputs: ["Market signals", "Live deals", "Customer health"],
    outputs: ["Closed revenue", "Renewals", "Save plays"],
    impact: {
      compare: [
        { label: "Lead-to-close time", unit: "days", before: 68, after: 41, better: "lower" },
        { label: "First-year churn", unit: "%", before: 12, after: 6, better: "lower" },
        { label: "Handoff delays", unit: "days", before: 5, after: 0, better: "lower" },
      ],
      hoursPerSeatWeek: 15,
      revenueLiftPct: 13,
    },
    sample: "Catch new buyers this week, close the Acme deal at $85k, and protect accounts renewing in the next 60 days.",
  },
  {
    id: "os",
    slug: "sovereign-revenue-os",
    name: "The Sovereign Revenue OS",
    engines: ["intentpulse", "vanguard", "apex", "cortex", "aether", "coreops", "shield", "sovereign"],
    setup: 125000,
    retainer: 55000,
    tagline: "Every Bloom engine wired into one autonomous revenue operating system, governed by Sovereign.",
    inputs: ["Every channel", "Every system", "Every account"],
    outputs: ["Governed revenue operations"],
    impact: {
      compare: [
        { label: "Revenue team admin load", unit: "hrs/week", before: 120, after: 18, better: "lower" },
        { label: "Pipeline coverage", unit: "x quota", before: 2.1, after: 4.2, better: "higher" },
        { label: "Decisions on the record", unit: "%", before: 35, after: 100, better: "higher" },
      ],
      hoursPerSeatWeek: 18,
      revenueLiftPct: 20,
    },
    sample: "Run the full revenue motion this week: signals, outbound, closing, pricing, ops, retention, all governed. Budget $60k.",
  },
];

export const architectureBySlug = (slug: string) => ARCHITECTURES.find((a) => a.slug === slug || a.id === slug);
