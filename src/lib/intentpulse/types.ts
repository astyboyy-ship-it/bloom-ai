/** Shapes shared by the IntentPulse API route, the demo page, and the embed script. */

export type IntentTier = "VIP" | "QUALIFIED" | "NURTURE";
export type Persona = "buyer" | "evaluator" | "competitor" | "student" | "unknown";
export type SignalKey = "budget" | "urgency" | "techFit" | "authority";

export type LeadInput = {
  leadName: string;
  company: string;
  /** Estimated budget in thousands of USD; null when undisclosed. */
  budgetK: number | null;
  message: string;
};

export type IntentSignal = {
  key: SignalKey;
  label: string;
  score: number;
  weight: number;
  evidence: string[];
};

export type IntentAction = {
  title: string;
  channel: string;
  sla: string;
  owner: string;
  steps: string[];
  dispatchId: string;
};

export type IntentResult = {
  source: "groq" | "heuristic";
  model: string | null;
  /** Set when the run fell back from Groq, explaining why. */
  notice?: string;
  latencyMs: number;
  evaluatedAt: string;
  lead: LeadInput;
  persona: Persona;
  microSignals: string[];
  signals: IntentSignal[];
  score: number;
  tier: IntentTier;
  summary: string;
  reasoning: string[];
  action: IntentAction;
};

export const SIGNAL_WEIGHTS: Record<SignalKey, number> = {
  budget: 0.35,
  urgency: 0.3,
  techFit: 0.2,
  authority: 0.15,
};

export const SIGNAL_LABELS: Record<SignalKey, string> = {
  budget: "Budget match",
  urgency: "Urgency",
  techFit: "Tech stack fit",
  authority: "Buyer authority",
};

export const TIER_BANDS: { tier: IntentTier; min: number; label: string }[] = [
  { tier: "VIP", min: 85, label: "85–100" },
  { tier: "QUALIFIED", min: 60, label: "60–84" },
  { tier: "NURTURE", min: 0, label: "<60" },
];
