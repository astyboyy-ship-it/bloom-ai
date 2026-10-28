import { heuristicSignals } from "./heuristic";
import { assemble } from "./score";
import type { IntentResult, LeadInput } from "./types";

/**
 * The normalized social signal shared by the simulator, the Apify client, the sweep/webhook APIs and
 * the command center. Whatever the source, every signal is scored by the same IntentPulse engine.
 */

export type Platform = "instagram" | "x" | "tiktok" | "reddit" | "linkedin" | "email" | "webhook";

export const PLATFORMS: Record<Platform, { label: string; short: string; color: string }> = {
  instagram: { label: "Instagram", short: "IG", color: "#f5a9b0" },
  x: { label: "Twitter/X", short: "X", color: "#8ff0ff" },
  tiktok: { label: "TikTok", short: "TT", color: "#c7a6ff" },
  reddit: { label: "Reddit", short: "RD", color: "#ff9b78" },
  linkedin: { label: "LinkedIn", short: "IN", color: "#7fb2ff" },
  email: { label: "Email", short: "EM", color: "#b9e0a5" },
  webhook: { label: "Webhooks", short: "WH", color: "#f3d48f" },
};

export const PLATFORM_KEYS = Object.keys(PLATFORMS) as Platform[];
/** Platforms the radar can sweep with an Apify Actor (webhooks arrive on their own). */
export const SWEEPABLE: Platform[] = ["x", "instagram", "tiktok", "reddit"];

export type SignalKind = "dm" | "post" | "comment" | "thread" | "email" | "webhook";

export type RawSignal = {
  id: string;
  platform: Platform;
  kind: SignalKind;
  author: {
    name: string;
    handle: string;
    verified: boolean;
    followers: number;
    title?: string;
    company: string;
  };
  text: string;
  url: string | null;
  postedAt: string;
  budgetK: number | null;
  engagement?: { likes: number; replies: number };
  origin: "simulated" | "apify" | "webhook";
  /** The Apify Actor that produced a live signal. */
  actor?: string;
  /** The sweep keyword this signal matched, when known. */
  keyword?: string;
  /** Where on the platform it was intercepted: the subreddit, the Reel or video it sits under, a brand mention. */
  context?: { subreddit?: string; reel?: string; video?: string; mention?: boolean };
};

export type PulseSignal = RawSignal & { result: IntentResult };

/** Reads a budget out of free text: "$50k", "120k budget", "$1.2M", "$75,000". */
export function extractBudgetK(text: string): number | null {
  const m = /\$\s?(\d+(?:[.,]\d+)*)\s*(k|m|mm|million|thousand)?\b|\b(\d+(?:\.\d+)?)\s*(k|m)\s*(?:budget|usd|\/mo|per month)/i.exec(text);
  if (!m) return null;
  const raw = (m[1] ?? m[3]).replace(/,/g, "");
  const unit = (m[2] ?? m[4] ?? "").toLowerCase();
  let n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (unit.startsWith("m")) n *= 1000;
  else if (unit === "k" || unit === "thousand") n *= 1;
  else n /= 1000;
  return n >= 0.5 && n <= 1_000_000 ? Math.round(n * 10) / 10 : null;
}

export function toLead(raw: RawSignal): LeadInput {
  const bio = [raw.author.title, raw.author.company].filter(Boolean).join(", ");
  return {
    leadName: raw.author.name,
    company: raw.author.company,
    budgetK: raw.budgetK,
    // The author's bio is part of what the engine perceives (titles carry buyer authority).
    message: bio ? `${raw.text}\n— ${bio}` : raw.text,
  };
}

/** Scores a normalized signal with the deterministic IntentPulse engine. */
export function scoreSignal(raw: RawSignal): PulseSignal {
  const lead = toLead(raw);
  const result = assemble({ ...heuristicSignals(lead), lead, source: "heuristic", model: null, startedAt: Date.now() });
  return { ...raw, result };
}

export const signalScore = (s: PulseSignal, key: string) => s.result.signals.find((x) => x.key === key)?.score ?? 0;

/** Urgent = the urgency signal alone is strong, regardless of tier. */
export const isUrgent = (s: PulseSignal) => signalScore(s, "urgency") >= 66;

export type Route = "vip" | "outreach" | "quarantine" | "nurture";
/** Competitors are quarantined; students are capped at 45 by the scorer and fall through to nurture. */
export const routeOf = (s: PulseSignal): Route =>
  s.result.persona === "competitor"
    ? "quarantine"
    : s.result.tier === "VIP"
      ? "vip"
      : s.result.tier === "QUALIFIED"
        ? "outreach"
        : "nurture";
