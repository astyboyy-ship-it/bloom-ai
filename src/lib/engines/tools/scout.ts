import { z } from "zod";
import { checkRelayRequest, PolicyError } from "@/lib/scout/policy";
import type { GapKind } from "@/lib/scout/types";
import { tool } from "../types";

/**
 * Bloom Scout inside the engines.
 *
 *   handoff_gap_detect      (Cortex)  finds where a counterparty admits it cannot close: an authority ceiling ("I need
 *                                     my manager's sign-off") or a knowledge or policy gap ("I have no pricing policy
 *                                     for that"). Rule-based and deterministic, so the same text always gives the
 *                                     same answer. A hit becomes a human-owned action, which the desk queues for the
 *                                     owner's approval instead of letting an agent invent a commitment.
 *   exchange_payload_policy (Shield)  runs Bloom Scout's sandbox policy on a payload before it may be sent to the
 *                                     public relay: no real company names, no binding language, sandbox bounds.
 */

const PATTERNS: { kind: GapKind; re: RegExp; missing: string }[] = [
  { kind: "AUTHORITY_CEILING", re: /\b(?:not|n't) (?:authori[sz]ed|allowed|permitted|empowered) to\b/i, missing: "Authority to commit" },
  { kind: "AUTHORITY_CEILING", re: /\b(?:can(?:no|')t|cannot|unable to) (?:commit|sign|approve|bind|agree to|sign off)\b/i, missing: "Authority to commit" },
  { kind: "AUTHORITY_CEILING", re: /\bneeds? (?:my |our |the )?(?:owner|manager|boss|director|vp|cfo|ceo|legal|procurement|finance)(?:'s)? (?:sign-?off|approval|ok|okay)\b/i, missing: "Sign-off from the counterpart's owner" },
  { kind: "AUTHORITY_CEILING", re: /\b(?:above|beyond|outside|over) my (?:authority|limit|approval|sign-?off)\b/i, missing: "Authority beyond the counterpart's limit" },
  { kind: "AUTHORITY_CEILING", re: /\b(?:have|need) to (?:check|escalate|run (?:it|this)) (?:with|by|to)\b/i, missing: "An escalation the counterpart has to make" },
  { kind: "KNOWLEDGE_OR_POLICY_GAP", re: /\b(?:don't|do not|doesn't|does not) have (?:a |the |any )?(?:policy|pricing|margin|guidance|rule|playbook)\b/i, missing: "A pricing or margin policy" },
  { kind: "KNOWLEDGE_OR_POLICY_GAP", re: /\bno (?:policy|pricing|guidance|playbook|rule) (?:for|on|covering)\b/i, missing: "A policy that covers this request" },
  { kind: "KNOWLEDGE_OR_POLICY_GAP", re: /\b(?:not sure|unsure|no idea) (?:how|what) to (?:price|quote|counter)\b/i, missing: "Pricing knowledge for this request" },
  { kind: "KNOWLEDGE_OR_POLICY_GAP", re: /\b(?:i'd|i would|we'd|we would) (?:just )?be guessing\b/i, missing: "Grounds for a counter-offer" },
  { kind: "KNOWLEDGE_OR_POLICY_GAP", re: /\boutside (?:of )?(?:my|our) (?:playbook|knowledge|scope)\b/i, missing: "Scope the counterpart can price" },
  { kind: "AUTHORITY_CEILING", re: /\b(?:run|check|clear) (?:it|this|that) (?:by|with|past) (?:my |our |the )?(?:owner|manager|boss|director|vp|cfo|ceo|legal|procurement|finance|team|headquarters|hq)\b/i, missing: "An escalation the counterpart has to make" },
  { kind: "AUTHORITY_CEILING", re: /\babove my pay ?grade\b/i, missing: "Authority beyond the counterpart's limit" },
  { kind: "AUTHORITY_CEILING", re: /\bnot (?:the right person|in a position|able) to (?:approve|sign|commit|agree|decide)\b/i, missing: "Authority to commit" },
  { kind: "AUTHORITY_CEILING", re: /\b(?:set|decided|approved|controlled) (?:by|at) (?:headquarters|hq|corporate|my (?:owner|manager|boss)|our (?:owner|leadership|finance team))\b/i, missing: "A decision that sits with the counterpart's owner" },
  { kind: "KNOWLEDGE_OR_POLICY_GAP", re: /\b(?:don't|do not|doesn't|does not) know (?:how|what) to (?:price|quote|counter|charge)\b/i, missing: "Pricing knowledge for this request" },
];

/** Typographic apostrophes and quotes count as plain ones, so "can’t" matches like "can't". */
const plain = (s: string) => s.normalize("NFKC").replace(/[‘’ʼ′]/g, "'").replace(/[“”]/g, '"');

export type GapHit = { kind: GapKind; quote: string; missing: string };

/** Every admission in the text, one per sentence, authority ceilings first. */
export function detectGaps(text: string): GapHit[] {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const hits: GapHit[] = [];
  for (const s of sentences) {
    const p = PATTERNS.find((x) => x.re.test(plain(s)));
    if (p) hits.push({ kind: p.kind, quote: s.slice(0, 300), missing: p.missing });
  }
  return hits.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "AUTHORITY_CEILING" ? -1 : 1));
}

export const handoffGapDetect = tool({
  name: "handoff_gap_detect",
  description:
    "Reads a counterparty's message for where it admits it cannot close: AUTHORITY_CEILING (it lacks permission to bind price, terms or SLAs without its owner) or KNOWLEDGE_OR_POLICY_GAP (it lacks the pricing, margin or scope policy to counter). Rule-based. When handoff is true, hand the open point to the human owner; never treat the message as a commitment.",
  input: z.object({ text: z.string().min(1).max(4000) }),
  run({ text }) {
    const gaps = detectGaps(text);
    const first = gaps[0];
    return {
      handoff: gaps.length > 0,
      kind: first?.kind ?? null,
      gaps,
      guidance: first
        ? first.kind === "AUTHORITY_CEILING"
          ? "The counterpart can't bind this. Hand the open term to your owner; don't read its offer as final."
          : "The counterpart has no policy to price this. Hand it to your owner, or supply a sealed range, rather than guess."
        : "No authority or policy gap stated.",
    };
  },
});

export const exchangePayloadPolicy = tool({
  name: "exchange_payload_policy",
  description:
    "Checks a payload against Bloom Scout's sandbox policy before it may be sent to the public Bloom Exchange relay: refuses real company names, binding language (contracts, purchase orders, guarantees) and anything outside sandbox bounds. Returns allowed=false with the reason when refused.",
  input: z.object({ path: z.enum(["/v1/agents", "/v1/intents", "/v1/rooms", "/v1/rooms/events"]), payload: z.record(z.string(), z.unknown()) }),
  run({ path, payload }) {
    try {
      checkRelayRequest(path, payload);
      return { allowed: true, code: null, message: "Within the sandbox policy." };
    } catch (err) {
      if (err instanceof PolicyError) return { allowed: false, code: err.code, message: err.message };
      throw err;
    }
  },
});
