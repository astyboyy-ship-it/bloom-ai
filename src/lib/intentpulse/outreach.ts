import type { IntentTier, LeadInput, Persona } from "./types";

export type DispatchAction = "outreach" | "vip" | "quarantine";

export type DispatchResult = {
  action: DispatchAction;
  dispatchId: string;
  status: "sent" | "dispatched" | "quarantined";
  route: string;
  /** The message the engine would send. `{{booking_link}}` is left for the integrator to fill. */
  message: string | null;
  source: "groq" | "template";
  model: string | null;
  notice?: string;
  latencyMs: number;
};

export const firstName = (lead: LeadInput) => lead.leadName.split(/\s+/)[0] || "there";

/** Deterministic copy used when Groq isn't available, tuned per tier and persona. */
export function templateMessage(action: DispatchAction, lead: LeadInput, tier: IntentTier, persona: Persona, channel: string) {
  const name = firstName(lead);
  const org = lead.company ? ` at ${lead.company}` : "";
  if (action === "quarantine") return null;
  if (action === "vip") {
    return `Hi ${name}, thanks for reaching out on ${channel}. Given your timeline${org}, I've held a priority slot with our senior team so we can scope this properly: {{booking_link}}. If none of those times work, reply with two that do and we'll lock one in.`;
  }
  if (tier === "NURTURE" || persona === "student") {
    return `Hi ${name}, thanks for the note. I've sent over our short guide on how teams like yours approach this, no strings attached. When the timing is right, just reply here and we'll pick it up.`;
  }
  return `Hi ${name}, saw your message on ${channel}. Teams${org} usually start with a 20-minute scoping call: we map your current stack, confirm budget and timeline, and show where the quick wins are. Want me to send a couple of times this week?`;
}

export function dispatchMeta(action: DispatchAction) {
  switch (action) {
    case "vip":
      return { status: "dispatched" as const, route: "Calendar lock · AE priority lane" };
    case "quarantine":
      return { status: "quarantined" as const, route: "Intel log · outreach suppressed" };
    default:
      return { status: "sent" as const, route: "Personal outreach · same channel" };
  }
}

export function newDispatchId() {
  return `IP-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;
}
