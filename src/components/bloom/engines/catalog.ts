/**
 * What a waitlist lead can ask about: one of the engines, the Developer Partner Program, or nothing
 * specific yet. Shared by the cards, the form, and the server action.
 */
export const ENGINE_IDS = ["marketing", "infrastructure", "workforce", "intentpulse", "developer-partner", "general"] as const;

export type EngineId = (typeof ENGINE_IDS)[number];

export const ENGINE_LABELS: Record<EngineId, string> = {
  marketing: "Aware Marketing Engine",
  infrastructure: "Infrastructure Architect",
  workforce: "Shadow Workforce",
  intentpulse: "IntentPulse",
  "developer-partner": "Demo Creator Suite (developers)",
  general: "Not sure yet",
};

export const isEngineId = (v: unknown): v is EngineId => typeof v === "string" && (ENGINE_IDS as readonly string[]).includes(v);
