import { heuristicSignals } from "@/lib/intentpulse/heuristic";
import { assemble } from "@/lib/intentpulse/score";
import type { IntentResult, LeadInput } from "@/lib/intentpulse/types";
import { between, pick, weighted } from "../shared/sim";

/**
 * Simulated omnichannel inbound: sample leads in the voice of each platform. Every one of them is
 * scored by the real IntentPulse heuristic engine in the browser, so the radar, counters and
 * telemetry reflect actual scoring, while the sources themselves are sample data.
 */

export type ChannelKey = "instagram" | "x" | "reddit" | "linkedin" | "webhook";

export const CHANNELS: Record<ChannelKey, { label: string; weight: number; color: string }> = {
  instagram: { label: "Instagram DMs", weight: 30, color: "#f5a9b0" },
  x: { label: "Twitter / X", weight: 50, color: "#8ff0ff" },
  reddit: { label: "Reddit", weight: 8, color: "#ff9b78" },
  linkedin: { label: "LinkedIn", weight: 7, color: "#b49bff" },
  webhook: { label: "Webhooks", weight: 5, color: "#f3d48f" },
};

export const CHANNEL_KEYS = Object.keys(CHANNELS) as ChannelKey[];

type Kind = "enterprise" | "buyer" | "evaluator" | "cold" | "student" | "competitor";

const KIND_WEIGHTS: Record<Kind, number> = { enterprise: 12, buyer: 20, evaluator: 28, cold: 18, student: 10, competitor: 12 };

const MESSAGES: Record<Kind, string[]> = {
  enterprise: [
    "VP Engineering here, ~1,500 employees. Budget allocated, procurement looped in. Need a pilot this week and go live by end of quarter. Stack: Snowflake, Okta SSO, Salesforce API.",
    "CTO at a fintech, 400 staff. RFP goes out Friday, we need SOC 2 and SSO via Okta, contract ready to sign this quarter. Integration with our Salesforce CRM is a must.",
    "Head of Revenue Ops. Budget is set, need implementation ASAP. We run HubSpot, Segment and BigQuery for 900 reps. Can you do a demo next week?",
    "Founder & CEO, 250 employees. Looking for an enterprise agency now. Budget approved, deadline is launch in 3 weeks, we need API + webhook integration.",
  ],
  buyer: [
    "Who can build custom AI infrastructure for us? Series B, need a pilot by next week. We're on AWS with Slack and HubSpot.",
    "Looking for an enterprise agency now. Budget approved, need to launch this quarter. We're on HubSpot.",
    "Director of Growth, 120 people. Need pricing and a demo, timeline is next month. Our CRM is Salesforce.",
    "Ready to sign if you can integrate with our CRM via API. Owner of a 60-person agency.",
  ],
  evaluator: [
    "Comparing a few vendors. Do you integrate with Zapier? Budget depends on scope.",
    "Any recommendations for lead routing tools? Not sure on budget yet, maybe a demo later.",
    "We use HubSpot and spreadsheets, exploring options. What does onboarding look like?",
    "Thinking about replacing our current tool. Does it work with Slack? Budget TBD.",
  ],
  cold: [
    "Just browsing, maybe later next year.",
    "Cool thread, just curious how this works. No rush.",
    "Following for later, not ready yet.",
    "Saving this. Just looking for now.",
  ],
  student: [
    "Student here doing a research project on AI agents. Can I interview you?",
    "Working on my thesis about lead scoring for a university course. Any docs?",
    "For a class assignment: how do tools like this classify leads?",
  ],
  competitor: [
    "We're building a similar tool. How does your scoring work under the hood?",
    "Benchmarking competitors for our roadmap. What's your routing logic?",
    "Doing a competitive analysis. Which CRMs do you integrate with, and how is pricing structured?",
  ],
};

const BUDGET: Record<Kind, [number, number] | null> = {
  enterprise: [180, 420],
  buyer: [40, 160],
  evaluator: [8, 70],
  cold: [0, 6],
  student: null,
  competitor: [15, 60],
};

const FIRST = ["Mara", "Leo", "Priya", "Jonah", "Amara", "Kenji", "Sofia", "Diego", "Noor", "Elias", "Hana", "Marco", "Zoe", "Ravi", "Ines", "Theo", "Lena", "Omar", "Yuki", "Nadia"];
const LAST = ["Ellison", "Okafor", "Raman", "Pike", "Lindqvist", "Sato", "Moreau", "Alvarez", "Haddad", "Novak", "Kim", "Rossi", "Becker", "Iyer", "Costa", "Weber", "Nakamura", "Farah"];
const COMPANIES = ["Halvorsen Logistics", "Northwind Clinics", "Lumen Labs", "Arcadia Health", "Vantage Freight", "Corvid Capital", "Brightline Retail", "Meridian Bank", "Atlas Robotics", "Solace Insurance", "Quarry Studio", "Helix Biotech", "Pinecrest Media", "Orbital Payments"];
const SCHOOLS = ["State University", "City College", "Polytechnic Institute", "Business School"];
const RIVALS = ["SignalForge", "LeadLoom", "IntentHive", "ScoreStack"];

export type StreamSignal = {
  id: string;
  channel: ChannelKey;
  handle: string;
  at: number;
  result: IntentResult;
  injected?: boolean;
};

export function makeSignal(r: () => number, seq: number): StreamSignal {
  const channel = weighted(r, Object.fromEntries(CHANNEL_KEYS.map((k) => [k, CHANNELS[k].weight])) as Record<ChannelKey, number>);
  const kind = weighted(r, KIND_WEIGHTS);
  const first = pick(r, FIRST);
  const last = pick(r, LAST);
  const company = kind === "student" ? pick(r, SCHOOLS) : kind === "competitor" ? pick(r, RIVALS) : pick(r, COMPANIES);
  const range = BUDGET[kind];
  const lead: LeadInput = {
    leadName: `${first} ${last}`,
    company,
    budgetK: range ? Math.round(between(r, range[0], range[1])) : null,
    message: pick(r, MESSAGES[kind]),
  };
  const result = assemble({ ...heuristicSignals(lead), lead, source: "heuristic", model: null, startedAt: Date.now() });
  const handle =
    channel === "webhook"
      ? `form/${company.toLowerCase().replace(/\W+/g, "-")}`
      : channel === "linkedin"
        ? `${first} ${last} · ${company}`
        : channel === "reddit"
          ? `u/${first.toLowerCase()}_${last.toLowerCase().slice(0, 3)}${Math.floor(r() * 90 + 10)}`
          : `@${first.toLowerCase()}${pick(r, ["", "_", "."])}${last.toLowerCase().slice(0, 5)}`;
  return { id: `s${seq}`, channel, handle, at: Date.now(), result };
}

export const budgetBucket = (b: number | null) => (b === null || b < 5 ? 0 : b < 25 ? 1 : b < 100 ? 2 : 3);
export const BUDGET_BUCKETS = ["< $5k / undisclosed", "$5k – $25k", "$25k – $100k", "$100k+"];
