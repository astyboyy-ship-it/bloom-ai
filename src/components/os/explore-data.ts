import type { EngineKey } from "@/components/bloom/command/engines";

/**
 * The Explore hub's 30-second walkthroughs: a realistic input, the steps the engine takes (named after its
 * real tools), the output it produces, and the typical efficiency impact. Illustrative figures, not promises.
 */
export type EngineDemo = { input: string; thoughts: string[]; output: string; impact: { label: string; value: string }[] };

export const ENGINE_DEMOS: Record<EngineKey, EngineDemo> = {
  sovereign: {
    input: "Push inbound demand this week, close open deals, protect margin. Budget $40k.",
    thoughts: ["Splitting the command into three objectives: signals, closing, pricing.", "evaluate_policy: $40k exceeds the Level 2 ceiling, so it's held for a human.", "allocate_capacity: Surge shift, weighting IntentPulse, Apex and Aether.", "Routing each objective to the engine that owns it."],
    output: "Three objectives routed to IntentPulse, Apex and Aether under Surge posture. The $40k spend waits for your approval.",
    impact: [
      { label: "Approval turnaround", value: "30h → 2h" },
      { label: "Spend outside policy", value: "−100%" },
      { label: "Routing decisions logged", value: "100%" },
    ],
  },
  apex: {
    input: "Acme is in negotiation at $85k ACV, 22 days in stage, asking for 25% off.",
    thoughts: ["score_deal_velocity: 22 days is past a healthy negotiation stage; one champion missing.", "negotiation_envelope: walk-away at $72,300; the 25% ask exceeds the floor.", "build_proposal: three tiers anchored so Scale is the natural pick."],
    output: "Hold at $80,800 and trade term or prepay instead of discount. Send the three-tier proposal today and multi-thread the committee.",
    impact: [
      { label: "Average discount", value: "18% → 9%" },
      { label: "Proposal turnaround", value: "2 days → 10 min" },
      { label: "Slipped deals caught", value: "+3x" },
    ],
  },
  coreops: {
    input: "Onboarding takes days: contract, billing setup, workspace, kickoff email. CRM and Billing drift.",
    thoughts: ["analyze_workflow: 105 minutes per client, 95% of it manual.", "check_system_sync: Billing is lagging the CRM by 64 records.", "schedule_shadow_job: reconcile overnight in the Dark shift."],
    output: "Automate provisioning and billing setup to free about 53 hours a month; nightly reconciliation keeps CRM and Billing in sync.",
    impact: [
      { label: "Admin hours", value: "−80%" },
      { label: "Records out of sync", value: "420 → 15" },
      { label: "Client go-live", value: "4 days → same day" },
    ],
  },
  intentpulse: {
    input: "Find people asking for help with lead follow-up and CRM chaos, and route the hottest.",
    thoughts: ["scan_market_radar: sweeping Reddit, LinkedIn and X for pain-language posts.", "score_intent: budget, urgency, tech fit and authority per signal.", "enrich_account: firmographics for the qualified ones."],
    output: "Four signals scored; the VIP goes to Apex within seconds, the qualified ones to Vanguard's sequence.",
    impact: [
      { label: "Lead response time", value: "26h → 12 min" },
      { label: "Qualified leads / month", value: "+3x" },
      { label: "Manual triage", value: "−90%" },
    ],
  },
  vanguard: {
    input: "Open outbound into Series A SaaS companies hiring SDRs. LinkedIn and email, $24k ACV.",
    thoughts: ["prioritize_accounts: funding and hiring triggers lift the best fits to the top.", "build_sequence: six touches over 14 days, no channel twice in 48 hours.", "forecast_pipeline: conservative reply and meeting rates."],
    output: "Lead with Northwind Labs. A six-touch cadence across 100 lookalikes projects about 6 meetings and $36k in pipeline.",
    impact: [
      { label: "Meetings booked / month", value: "12 → 41" },
      { label: "SDR research hours", value: "−85%" },
      { label: "Personalized first touches", value: "100%" },
    ],
  },
  cortex: {
    input: "Deal stalled after the demo: 'too expensive vs Acme', 'wait until next quarter'. 14 days of silence.",
    thoughts: ["classify_objection: price (high severity) and timing.", "build_battlecard: win themes and landmine questions against Acme.", "deal_risk_scan: silence plus single-threading puts stall risk at 72/100."],
    output: "Reframe price as the cost of waiting, offer a scoped pilot for timing, and add a second stakeholder this week.",
    impact: [
      { label: "Win rate", value: "19% → 31%" },
      { label: "Deals revived after demo", value: "+40%" },
      { label: "Closer prep time", value: "3h → 15 min" },
    ],
  },
  shield: {
    input: "Usage at Halcyon Health dropped 30%, renewal in 60 days, three open tickets.",
    thoughts: ["compute_health: usage decline is the primary driver; Halcyon scores 38/100.", "rescue_play: executive check-in within 48 hours, then re-onboarding.", "Flagging Meridian Capital (92% seat use) for expansion."],
    output: "$75k of ARR is at risk inside 90 days. Run the Halcyon rescue now; Meridian is ready to expand.",
    impact: [
      { label: "Gross churn", value: "14% → 8.5%" },
      { label: "At-risk accounts caught early", value: "30% → 85%" },
      { label: "CSM reporting time", value: "−90%" },
    ],
  },
  aether: {
    input: "We charge $1,200 a month, win 38% of deals and discount 12% on average.",
    thoughts: ["price_sensitivity: a 38% win rate with modest discounting reads as underpriced.", "discount_guardrail: cap at 10% unless the term is 24 months.", "expansion_model: seat expansion is the lead lever."],
    output: "Raise list price ~9% for new customers, cap discounts at 10%, and run the seat-expansion play on high-utilization accounts.",
    impact: [
      { label: "Average contract value", value: "+21%" },
      { label: "Margin lost to discounts", value: "16% → 7%" },
      { label: "Price change shipped in", value: "6 weeks → 3 days" },
    ],
  },
};
