import { ENGINE_ORDER, type EngineKey } from "@/components/bloom/command/engines";

/**
 * The Client License tiers: which engines each one unlocks. Shared by the server (which enforces it on every
 * run) and the desk (which gates the UI). "evaluation" is what a workspace gets with no license key.
 */
export type Tier = "evaluation" | "tier1" | "tier2" | "tier3" | "admin";

export const TIERS: Tier[] = ["evaluation", "tier1", "tier2", "tier3", "admin"];

export const TIER_ENGINES: Record<Tier, EngineKey[]> = {
  evaluation: ["coreops", "intentpulse"],
  tier1: ["coreops", "intentpulse"],
  tier2: ["sovereign", "apex", "coreops"],
  tier3: ENGINE_ORDER,
  admin: ENGINE_ORDER,
};

export const TIER_INFO: Record<Tier, { label: string; short: string; blurb: string }> = {
  evaluation: { label: "Evaluation", short: "EVAL", blurb: "No license key. CoreOps and IntentPulse in evaluation mode." },
  tier1: { label: "Tier 1 · Signal & Ops", short: "T1", blurb: "CoreOps and IntentPulse: market radar plus silent back-office automation." },
  tier2: { label: "Tier 2 · Command & Close", short: "T2", blurb: "Sovereign, Apex and CoreOps: governance, deal closing and operations." },
  tier3: { label: "Tier 3 · Enterprise", short: "T3", blurb: "All eight engines unlocked, with full cross-engine delegation." },
  admin: { label: "Master Admin Override", short: "ADMIN", blurb: "Every engine and every control. For Bloom AI staff and development." },
};

/** The lowest paid tier that unlocks an engine: what its Upgrade CTA offers. */
export function upgradeTierFor(engine: EngineKey): Tier {
  return (["tier1", "tier2", "tier3"] as Tier[]).find((t) => TIER_ENGINES[t].includes(engine)) ?? "tier3";
}

export const engineAllowed = (tier: Tier, engine: EngineKey) => TIER_ENGINES[tier].includes(engine);

/** Tier labels and blurbs in Spanish and Hebrew; `short` (EVAL, T1…) is a code and stays the same. */
const TIER_TEXT: Record<"es" | "he", Record<Tier, { label: string; blurb: string }>> = {
  es: {
    evaluation: { label: "Evaluación", blurb: "Sin clave de licencia. CoreOps e IntentPulse en modo de evaluación." },
    tier1: { label: "Nivel 1 · Señales y operaciones", blurb: "CoreOps e IntentPulse: radar de mercado y automatización silenciosa del back office." },
    tier2: { label: "Nivel 2 · Mando y cierre", blurb: "Sovereign, Apex y CoreOps: gobierno, cierre de acuerdos y operaciones." },
    tier3: { label: "Nivel 3 · Enterprise", blurb: "Los ocho motores desbloqueados, con delegación completa entre motores." },
    admin: { label: "Control maestro de administrador", blurb: "Todos los motores y todos los controles. Para el equipo de Bloom AI y desarrollo." },
  },
  he: {
    evaluation: { label: "הערכה", blurb: "בלי מפתח רישיון. CoreOps ו־IntentPulse במצב הערכה." },
    tier1: { label: "רמה 1 · אותות ותפעול", blurb: "CoreOps ו־IntentPulse: מכ״ם שוק ואוטומציה שקטה של הבק־אופיס." },
    tier2: { label: "רמה 2 · פיקוד וסגירה", blurb: "Sovereign, Apex ו־CoreOps: משילות, סגירת עסקאות ותפעול." },
    tier3: { label: "רמה 3 · אנטרפרייז", blurb: "כל שמונת המנועים פתוחים, עם האצלה מלאה בין מנועים." },
    admin: { label: "עקיפת מנהל ראשי", blurb: "כל המנועים וכל הבקרות. לצוות Bloom AI ולפיתוח." },
  },
};

/** TIER_INFO in the given language. */
export function tierInfo(lang: "en" | "es" | "he"): Record<Tier, { label: string; short: string; blurb: string }> {
  if (lang === "en") return TIER_INFO;
  return Object.fromEntries(TIERS.map((t) => [t, { ...TIER_INFO[t], ...TIER_TEXT[lang][t] }])) as Record<Tier, { label: string; short: string; blurb: string }>;
}
