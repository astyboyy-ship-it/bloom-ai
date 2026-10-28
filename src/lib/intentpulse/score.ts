import {
  SIGNAL_LABELS,
  SIGNAL_WEIGHTS,
  TIER_BANDS,
  type IntentAction,
  type IntentResult,
  type IntentSignal,
  type IntentTier,
  type LeadInput,
  type Persona,
  type SignalKey,
} from "./types";

/**
 * The deterministic half of IntentPulse: whoever extracts the signals (Groq or the keyword
 * heuristic), the composite score, persona caps, tier, and routing action are computed here,
 * so the breakdown on screen always adds up to the score.
 */

// Non-buyers can be enthusiastic, but they never earn a sales route.
const PERSONA_CAPS: Partial<Record<Persona, number>> = { competitor: 30, student: 45 };

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

export function classify(score: number): IntentTier {
  return TIER_BANDS.find((b) => score >= b.min)!.tier;
}

export function composeSignals(raw: Record<SignalKey, { score: number; evidence: string[] }>): IntentSignal[] {
  return (Object.keys(SIGNAL_WEIGHTS) as SignalKey[]).map((key) => ({
    key,
    label: SIGNAL_LABELS[key],
    score: clamp(raw[key].score),
    weight: SIGNAL_WEIGHTS[key],
    evidence: raw[key].evidence.slice(0, 5),
  }));
}

function dispatchId(lead: LeadInput, score: number) {
  let h = 2166136261;
  const seed = `${lead.leadName}|${lead.company}|${lead.budgetK}|${lead.message}|${score}|${Date.now()}`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `IP-${(h >>> 0).toString(36).toUpperCase().padStart(7, "0")}`;
}

function routeAction(tier: IntentTier, persona: Persona, lead: LeadInput, score: number): IntentAction {
  const id = dispatchId(lead, score);
  const who = lead.leadName || "Prospect";
  const org = lead.company || "unknown account";

  if (persona === "competitor") {
    return {
      title: "Competitor Signal Quarantined",
      channel: "Intel log · outreach suppressed",
      sla: "No route",
      owner: "Product marketing",
      steps: [`Suppress ${org} from every sales sequence`, "Log the questions asked to the competitive-intel feed", "Send only the public docs reply"],
      dispatchId: id,
    };
  }
  switch (tier) {
    case "VIP":
      return {
        title: "VIP Calendar Route Dispatched",
        channel: "Calendar lock · AE priority lane",
        sla: "≤ 15 min",
        owner: "Senior account executive",
        steps: [`Hold the next priority AE slot for ${who}`, `Open a Discovery-Plus opportunity on ${org}`, "Push the signal digest to the AE before the call"],
        dispatchId: id,
      };
    case "QUALIFIED":
      return {
        title: "SDR Discovery Sequence Armed",
        channel: "Sequencer · 5-touch cadence",
        sla: "≤ 4 h",
        owner: "SDR pod, round robin",
        steps: [`Assign ${who} to the next available SDR`, "Enroll in discovery with a budget-confirmation step", "Re-score automatically on reply or booked meeting"],
        dispatchId: id,
      };
    default:
      return {
        title: "Nurture Drip Queued",
        channel: "Lifecycle automation · 21-day drip",
        sla: "Async",
        owner: "Lifecycle marketing",
        steps: [`Tag ${who} into the low-intent nurture segment`, "Queue the educational drip and case studies", "Watch for re-engagement and re-score on intent spikes"],
        dispatchId: id,
      };
  }
}

export function assemble(args: {
  lead: LeadInput;
  source: IntentResult["source"];
  model: string | null;
  persona: Persona;
  microSignals: string[];
  signals: IntentSignal[];
  summary: string;
  reasoning: string[];
  startedAt: number;
  notice?: string;
}): IntentResult {
  const weighted = args.signals.reduce((sum, s) => sum + s.score * s.weight, 0);
  const cap = PERSONA_CAPS[args.persona];
  const score = clamp(cap === undefined ? weighted : Math.min(weighted, cap));
  const tier = classify(score);
  const action = routeAction(tier, args.persona, args.lead, score);

  const math = args.signals.map((s) => `${s.score}×${s.weight.toFixed(2)}`).join(" + ");
  const band = TIER_BANDS.find((b) => b.tier === tier)!;
  const reasoning = [
    ...args.reasoning,
    `Composite: ${math} = ${weighted.toFixed(1)}${cap !== undefined && weighted > cap ? `, capped at ${cap} for a ${args.persona} persona` : ""}.`,
    `Score ${score} falls in the ${band.label} band → ${tier}. ${action.title} (${action.dispatchId}).`,
  ];

  return {
    source: args.source,
    model: args.model,
    notice: args.notice,
    latencyMs: Date.now() - args.startedAt,
    evaluatedAt: new Date().toISOString(),
    lead: args.lead,
    persona: args.persona,
    microSignals: args.microSignals.slice(0, 6),
    signals: args.signals,
    score,
    tier,
    summary: args.summary,
    reasoning,
    action,
  };
}
