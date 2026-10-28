import { Activity, Crown, Eye, FileText, Mail, MessageCircle, Radar, RefreshCw, Route, Scale, ShieldCheck, Swords, Target, UserPlus, type LucideIcon } from "lucide-react";
import type { PaintingKey } from "../art/paintings";

export type EngineKey = "sovereign" | "apex" | "coreops" | "intentpulse";
export type Stance = "stealth" | "aggressive" | "balanced";

export type Option = {
  value: string;
  label: string;
  detail: string;
  /** The stance every workforce card starts in when this option is chosen. */
  stance?: Stance;
  /** Ticker speed multiplier when this option is chosen (1 = normal). */
  tempo?: number;
};

export type Step = {
  id: string;
  kind: "choice" | "level" | "multi";
  title: string;
  hint: string;
  options: Option[];
};

export type Answers = Record<string, string | string[]>;

/** A requirement on the setup answers: [step id, option value]. */
type Requires = [string, string];

export type Card = {
  id: string;
  icon: LucideIcon;
  agents: number;
  count: number;
  title: (agents: number, count: number) => string;
  /** Plain-English activity lines. {agent}, {co} and {amt} are filled in live. */
  events: { text: string; requires?: Requires; lead?: boolean; amt?: [number, number]; deal?: boolean }[];
};

export type Channel = "instagram" | "reddit" | "tiktok" | "linkedin" | "x";
export const CHANNELS: { id: Channel; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "reddit", label: "Reddit" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X" },
];

export type Flow = { from: EngineKey; to: EngineKey | null; toLabel?: string; n: number; text: (n: number) => string; requires?: Requires };

export type Brief = { leads: number; pipeline: number; hours: number };

export type Engine = {
  key: EngineKey;
  index: string;
  name: string;
  role: string;
  painting: PaintingKey;
  greeting: string;
  steps: [Step, Step, Step];
  cta: string;
  cards: Card[];
  flows: Flow[];
  /** Engines that listen on public channels tag every signal with one; {ch} names it in feed lines. */
  channels?: boolean;
  brief: { base: Brief; lines: (b: Brief) => string[] };
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const s = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const agents = (n: number) => s(n, "agent");

export const ENGINES: Record<EngineKey, Engine> = {
  sovereign: {
    key: "sovereign",
    index: "01",
    name: "Sovereign",
    role: "Master Command & Security",
    painting: "destruction",
    greeting: "Initializing Engine Nº 01: Sovereign... Establishing subterranean governance link. Syncing master neural key.",
    steps: [
      {
        id: "stance",
        kind: "choice",
        title: "Select your master operational stance",
        hint: "This sets the posture every engine below Sovereign inherits.",
        options: [
          { value: "expansion", label: "Aggressive Market Expansion", detail: "Push budget toward growth and move first on every opening.", stance: "aggressive" },
          { value: "stealth", label: "Stealth Risk Mitigation", detail: "Protect what you have. Quiet moves, tight limits, no exposure.", stance: "stealth" },
          { value: "autonomy", label: "Absolute System Autonomy", detail: "Let the engines run themselves and report back to you.", stance: "balanced" },
        ],
      },
      {
        id: "threshold",
        kind: "level",
        title: "Set your sovereign authorization threshold",
        hint: "How much can happen before a person has to say yes?",
        options: [
          { value: "1", label: "Level 1 · Require Approval", detail: "Every significant action waits for your sign-off before it happens." },
          { value: "2", label: "Level 2 · Supervised", detail: "Routine actions run on their own. Anything unusual waits for you." },
          { value: "3", label: "Level 3 · Zero-Human Interception", detail: "Everything runs without stopping, and you review the record afterward." },
        ],
      },
      {
        id: "velocity",
        kind: "choice",
        title: "Define max resource allocation velocity",
        hint: "How fast money and agents can be moved between priorities.",
        options: [
          { value: "conservative", label: "Conservative", detail: "Small, deliberate shifts. Nothing moves more than 5% a day.", tempo: 0.75 },
          { value: "balanced", label: "Balanced", detail: "Moves resources as results come in, within sensible limits.", tempo: 1 },
          { value: "maximum", label: "Maximum Velocity", detail: "Moves everything toward what is working, as soon as it works.", tempo: 1.4 },
        ],
      },
    ],
    cta: "Engage Sovereign Protocol",
    cards: [
      {
        id: "policy",
        icon: ShieldCheck,
        agents: 6,
        count: 18,
        title: (a, n) => `${agents(a)} enforcing ${s(n, "approval rule")}`,
        events: [
          { text: "{agent} blocked a $12,400 vendor payment that broke your spending rules" },
          { text: "{agent} approved {amt} in ad spend for {co} within your threshold", amt: [1800, 6400] },
          { text: "{agent} locked a shared login that was used from two countries at once" },
        ],
      },
      {
        id: "capital",
        icon: Scale,
        agents: 7,
        count: 31,
        title: (a, n) => `${agents(a)} rebalancing ${s(n, "budget line")}`,
        events: [
          { text: "{agent} moved {amt} from a slow campaign to the one that is converting", amt: [2000, 9000], deal: true },
          { text: "{agent} cut an unused software seat and saved {amt} a year", amt: [600, 2400] },
          { text: "{agent} reserved budget for Apex's next closing push" },
        ],
      },
      {
        id: "risk",
        icon: Eye,
        agents: 5,
        count: 7,
        title: (a, n) => `${agents(a)} watching ${s(n, "open risk")}`,
        events: [
          { text: "{agent} spotted a competitor price cut and alerted Apex" },
          { text: "{agent} found a contract with {co} that renews in 9 days" },
          { text: "{agent} confirmed every backup finished overnight" },
        ],
      },
      {
        id: "directives",
        icon: Crown,
        agents: 6,
        count: 12,
        title: (a, n) => `${agents(a)} carrying out ${s(n, "strategic order")}`,
        events: [
          { text: "{agent} told every engine to focus on enterprise buyers this week", lead: true },
          { text: "{agent} raised IntentPulse's lead quality bar after a strong morning" },
          { text: "{agent} scheduled a growth review for Friday at 9:00" },
        ],
      },
    ],
    flows: [
      { from: "sovereign", to: "apex", n: 3, text: (n) => `Releasing budget for ${s(n, "new closing campaign")}` },
      { from: "sovereign", to: "coreops", n: 9, text: (n) => `Cleared ${s(n, "vendor contract")} for filing` },
      { from: "intentpulse", to: "sovereign", n: 2, text: (n) => `Escalated ${s(n, "market shift")} for a decision` },
    ],
    brief: {
      base: { leads: 186, pipeline: 412000, hours: 64 },
      lines: (b) => [
        `Every engine stayed inside the rules you set. Nothing needed your emergency attention.`,
        `${b.leads} qualified leads came through the system, and budget followed the ones most likely to buy.`,
        `${usd(b.pipeline)} in pipeline is now protected by approved budgets and signed terms.`,
        `You were spared about ${Math.round(b.hours)} hours of approvals, reviews and budget meetings.`,
      ],
    },
  },

  apex: {
    key: "apex",
    index: "02",
    name: "Apex",
    role: "High-Value Acquisition & Closing",
    painting: "issus",
    greeting: "Initializing Engine Nº 02: Apex... Calibrating high-precision automated sales strike algorithms.",
    steps: [
      {
        id: "caliber",
        kind: "choice",
        title: "Choose your target deal caliber",
        hint: "Apex shapes its conversations around the size of deal you want.",
        options: [
          { value: "b2b", label: "High-Ticket B2B ($10k+)", detail: "Fewer, larger deals with decision-makers at established companies." },
          { value: "d2c", label: "High-Volume D2C", detail: "Many fast purchases from individual buyers.", tempo: 1.3 },
          { value: "retainer", label: "VIP Retainers", detail: "Long-term clients on monthly agreements." },
        ],
      },
      {
        id: "tone",
        kind: "choice",
        title: "Set the negotiation stance and tone",
        hint: "How your closers talk to buyers.",
        options: [
          { value: "elite", label: "Consultative & Elite", detail: "Calm, expert, and selective. Buyers feel they are being advised.", stance: "stealth" },
          { value: "urgency", label: "Rapid High-Urgency", detail: "Clear deadlines and quick decisions.", stance: "aggressive", tempo: 1.2 },
          { value: "stack", label: "Value-Stacking", detail: "Builds the offer piece by piece until yes is obvious.", stance: "balanced" },
        ],
      },
      {
        id: "channels",
        kind: "multi",
        title: "Choose your active strike channels",
        hint: "Apex only reaches buyers where you allow it.",
        options: [
          { value: "instagram", label: "Instagram DMs", detail: "Warm, personal conversations." },
          { value: "linkedin", label: "LinkedIn", detail: "Decision-makers and company buyers." },
          { value: "voice", label: "Automated Voice / Email", detail: "Follow-up calls and email sequences." },
        ],
      },
    ],
    cta: "Engage Apex Closers",
    cards: [
      {
        id: "closing",
        icon: Swords,
        agents: 12,
        count: 8,
        title: (a, n) => `${agents(a)} closing ${s(n, "active sale")}`,
        events: [
          { text: "{agent} closed a {amt} deal with {co}", amt: [8000, 42000], deal: true },
          { text: "{agent} sent final terms to {co} and booked a signing call for tomorrow" },
          { text: "{agent} handled a pricing objection from {co} and kept the full rate" },
        ],
      },
      {
        id: "dialogues",
        icon: MessageCircle,
        agents: 14,
        count: 37,
        title: (a, n) => `${agents(a)} running ${s(n, "buyer conversation")}`,
        events: [
          { text: "{agent} started a consultative DM conversation on Instagram", requires: ["channels", "instagram"], lead: true },
          { text: "{agent} got a reply from the head of growth at {co} on LinkedIn", requires: ["channels", "linkedin"], lead: true },
          { text: "{agent} booked a discovery call with {co} after a follow-up call", requires: ["channels", "voice"], lead: true },
          { text: "{agent} answered a buyer's question about onboarding in under a minute" },
        ],
      },
      {
        id: "proposals",
        icon: FileText,
        agents: 8,
        count: 11,
        title: (a, n) => `${agents(a)} drafting ${s(n, "custom proposal")}`,
        events: [
          { text: "{agent} sent a {amt} proposal to {co}", amt: [6000, 30000] },
          { text: "{agent} added a case study to the {co} proposal after they asked for proof" },
        ],
      },
      {
        id: "followups",
        icon: Mail,
        agents: 8,
        count: 23,
        title: (a, n) => `${agents(a)} following up with ${s(n, "quiet prospect")}`,
        events: [
          { text: "{agent} re-opened a deal with {co} that went quiet two weeks ago", requires: ["channels", "voice"] },
          { text: "{agent} sent {co} a short check-in by email", requires: ["channels", "voice"] },
          { text: "{agent} nudged a LinkedIn connection at {co} about last week's call", requires: ["channels", "linkedin"] },
          { text: "{agent} followed up on an Instagram conversation that stopped mid-question", requires: ["channels", "instagram"] },
        ],
      },
    ],
    flows: [
      { from: "intentpulse", to: "apex", n: 12, text: (n) => `Handing off ${s(n, "lead")} for immediate closing` },
      { from: "apex", to: "coreops", n: 4, text: (n) => `Sending ${s(n, "signed deal")} for contracts and invoicing` },
      { from: "apex", to: "sovereign", n: 1, text: (n) => `Requesting approval on ${s(n, "discount")} above 15%` },
    ],
    brief: {
      base: { leads: 142, pipeline: 386000, hours: 51 },
      lines: (b) => [
        `Your closers spoke with ${b.leads} interested buyers in the last 24 hours.`,
        `${usd(b.pipeline)} in pipeline is now locked in proposals, verbal agreements and signed deals.`,
        `Signed deals went straight to CoreOps for contracts and invoices. Nobody had to retype anything.`,
        `That is about ${Math.round(b.hours)} hours of messaging, follow-ups and proposal writing you didn't have to do.`,
      ],
    },
  },

  coreops: {
    key: "coreops",
    index: "03",
    name: "CoreOps",
    role: "Shadow Administration & Infrastructure",
    painting: "forge",
    greeting: "Initializing Engine Nº 03: CoreOps... Linking database architectures and automated administrative pipelines.",
    steps: [
      {
        id: "bottleneck",
        kind: "choice",
        title: "Select the primary bottleneck to vaporize",
        hint: "CoreOps puts most of its workforce here first.",
        options: [
          { value: "onboarding", label: "Client Onboarding & Contracts", detail: "Welcome packs, contracts and account setup, done the moment a deal closes." },
          { value: "sync", label: "Cross-Platform Data Syncing", detail: "Your CRM, billing and project tools always agree with each other." },
          { value: "invoicing", label: "Invoicing & Routing", detail: "Invoices out on time, payments chased, requests sent to the right person." },
        ],
      },
      {
        id: "latency",
        kind: "choice",
        title: "Choose execution latency",
        hint: "When CoreOps acts on new work.",
        options: [
          { value: "batch", label: "Scheduled Batches", detail: "Works through everything at set times each day.", stance: "stealth", tempo: 0.7 },
          { value: "event", label: "Event-Driven Trigger", detail: "Acts as soon as something happens, like a signed contract.", stance: "balanced" },
          { value: "realtime", label: "Zero-Latency Real-Time Stream", detail: "Watches everything continuously and acts instantly.", stance: "aggressive", tempo: 1.4 },
        ],
      },
      {
        id: "logging",
        kind: "choice",
        title: "Pick a logging protocol",
        hint: "How CoreOps reports what it did.",
        options: [
          { value: "continuous", label: "Continuous Background Logging", detail: "A complete record you can check any time." },
          { value: "brief", label: "End-of-Day Executive Brief", detail: "One clear summary each evening." },
        ],
      },
    ],
    cta: "Initialize CoreOps Workforce",
    cards: [
      {
        id: "onboarding",
        icon: UserPlus,
        agents: 9,
        count: 6,
        title: (a, n) => `${agents(a)} onboarding ${s(n, "new client")}`,
        events: [
          { text: "{agent} sent {co} their contract and welcome pack 40 seconds after the deal closed" },
          { text: "{agent} set up a shared project space for {co}" },
          { text: "{agent} collected the signed contract from {co} and filed it" },
        ],
      },
      {
        id: "sync",
        icon: RefreshCw,
        agents: 10,
        count: 14,
        title: (a, n) => `${agents(a)} syncing ${s(n, "connected system")}`,
        events: [
          { text: "{agent} matched 312 CRM contacts with billing records" },
          { text: "{agent} fixed 14 duplicate customer records across three tools" },
          { text: "{agent} updated {co}'s deal stage everywhere it appears" },
        ],
      },
      {
        id: "invoicing",
        icon: FileText,
        agents: 9,
        count: 128,
        title: (a, n) => `${agents(a)} processing ${s(n, "invoice")}`,
        events: [
          { text: "{agent} sent {co} an invoice for {amt}", amt: [2400, 18000], deal: true },
          { text: "{agent} collected an overdue payment of {amt} from {co}", amt: [1200, 9000], deal: true },
          { text: "{agent} matched 46 bank payments to their invoices" },
        ],
      },
      {
        id: "routing",
        icon: Route,
        agents: 8,
        count: 52,
        title: (a, n) => `${agents(a)} routing ${s(n, "inbound request")}`,
        events: [
          { text: "{agent} sent a billing question from {co} to finance with the answer drafted" },
          { text: "{agent} passed a new sales enquiry to Apex", lead: true },
          { text: "{agent} closed 9 support requests that were already resolved" },
        ],
      },
    ],
    flows: [
      { from: "apex", to: "coreops", n: 4, text: (n) => `Received ${s(n, "signed deal")} for onboarding` },
      { from: "coreops", to: "sovereign", n: 1, text: (n) => `Flagged ${s(n, "overdue invoice")} above $20k for review` },
      { from: "coreops", to: "intentpulse", n: 9, text: (n) => `Returned ${s(n, "churn warning")} to the radar` },
    ],
    brief: {
      base: { leads: 38, pipeline: 164000, hours: 92 },
      lines: (b) => [
        `New clients were onboarded within minutes of signing, with contracts and welcome packs sent automatically.`,
        `${usd(b.pipeline)} in invoices went out or was collected, and every payment was matched to its invoice.`,
        `${b.leads} new enquiries reached the right person or engine without anyone sorting the inbox.`,
        `Your team got back about ${Math.round(b.hours)} hours of data entry, filing and chasing.`,
      ],
    },
  },

  intentpulse: {
    key: "intentpulse",
    index: "04",
    name: "IntentPulse",
    role: "Market Intelligence & Lead Radar",
    painting: "storm",
    greeting: "Initializing Engine Nº 04: IntentPulse... Booting global signal radar and behavioral intent scanners.",
    steps: [
      {
        id: "vector",
        kind: "choice",
        title: "Select the target radar vector",
        hint: "Which markets IntentPulse listens to.",
        options: [
          { value: "tech", label: "AI & Tech Buyers", detail: "Software teams, founders and technical decision-makers." },
          { value: "luxury", label: "E-Commerce & Luxury", detail: "Online brands and premium consumer buyers." },
          { value: "finance", label: "Real Estate & Finance", detail: "Investors, agencies, lenders and advisors." },
          { value: "custom", label: "Custom Sweep", detail: "A broad sweep you can narrow down later." },
        ],
      },
      {
        id: "filter",
        kind: "choice",
        title: "Set the buying-signal filter",
        hint: "How ready someone has to be before IntentPulse flags them.",
        options: [
          { value: "high", label: "High Intent Only (Ready to Buy)", detail: "Only people actively asking for a solution right now.", stance: "stealth" },
          { value: "aware", label: "Problem-Aware", detail: "People who describe the problem you solve.", stance: "balanced" },
          { value: "broad", label: "Broad Market Trends", detail: "Wider conversations and shifts in your market.", stance: "aggressive", tempo: 1.3 },
        ],
      },
      {
        id: "route",
        kind: "choice",
        title: "Choose a routing protocol",
        hint: "What happens to a lead once IntentPulse finds one.",
        options: [
          { value: "apex", label: "Instantly Hand Off Lead to Apex", detail: "Apex, the closing engine, starts a conversation within seconds." },
          { value: "dashboard", label: "Log to IntentPulse Dashboard", detail: "Leads wait here for you to review." },
        ],
      },
    ],
    cta: "Initiate Shadow Radar",
    cards: [
      {
        id: "scanning",
        icon: Radar,
        agents: 16,
        count: 312,
        title: (a, n) => `${agents(a)} scanning ${s(n, "live signal source")}`,
        events: [
          { text: "{agent} found a buyer on {ch} asking for exactly what you sell", lead: true },
          { text: "{agent} picked up a {ch} post from {co} that points to a new budget", lead: true },
          { text: "{agent} spotted 6 people on {ch} comparing your competitors" },
        ],
      },
      {
        id: "qualifying",
        icon: Target,
        agents: 14,
        count: 46,
        title: (a, n) => `${agents(a)} qualifying ${s(n, "warm buyer")}`,
        events: [
          { text: "{agent} extracted a verified lead from {ch}: a decision-maker at {co}", lead: true },
          { text: "{agent} confirmed {co} has budget and a deadline this quarter, from a {ch} thread", lead: true },
          { text: "{agent} set aside a {ch} lead that turned out to be a student project" },
        ],
      },
      {
        id: "competitors",
        icon: Activity,
        agents: 8,
        count: 19,
        title: (a, n) => `${agents(a)} tracking ${s(n, "competitor move")}`,
        events: [
          { text: "{agent} noticed buyers on {ch} reacting to a competitor's 12% price rise" },
          { text: "{agent} found unhappy customers of a competitor asking for alternatives on {ch}", lead: true },
        ],
      },
      {
        id: "handoffs",
        icon: Route,
        agents: 10,
        count: 12,
        title: (a, n) => `${agents(a)} preparing ${s(n, "lead hand-off")}`,
        events: [
          { text: "{agent} handed a {ch} lead from {co} to Apex with a summary of what they need", requires: ["route", "apex"], lead: true },
          { text: "{agent} logged a {ch} lead from {co} to your dashboard for review", requires: ["route", "dashboard"], lead: true },
          { text: "{agent} estimated a {ch} lead from {co} is worth about {amt}", amt: [9000, 48000], deal: true, lead: true },
        ],
      },
    ],
    channels: true,
    flows: [
      { from: "intentpulse", to: "apex", n: 12, text: (n) => `Handing off ${s(n, "lead")} for immediate closing`, requires: ["route", "apex"] },
      { from: "intentpulse", to: null, toLabel: "Dashboard", n: 12, text: (n) => `Logged ${s(n, "high-intent lead")} for your review`, requires: ["route", "dashboard"] },
      { from: "intentpulse", to: "sovereign", n: 2, text: (n) => `Escalated ${s(n, "market shift")} for a decision` },
      { from: "coreops", to: "intentpulse", n: 9, text: (n) => `Received ${s(n, "churn warning")} to watch` },
    ],
    brief: {
      base: { leads: 214, pipeline: 528000, hours: 47 },
      lines: (b) => [
        `IntentPulse found ${b.leads} people who are actively looking for what you offer.`,
        `Together they are worth about ${usd(b.pipeline)} in potential revenue.`,
        `The strongest leads were handed on within seconds, before competitors could reach them.`,
        `That saved about ${Math.round(b.hours)} hours of searching, researching and qualifying by hand.`,
      ],
    },
  },
};

export const ENGINE_ORDER: EngineKey[] = ["sovereign", "apex", "coreops", "intentpulse"];

export const isEngineKey = (v: string): v is EngineKey => v in ENGINES;

export const COMPANIES = ["Northwind Labs", "Halcyon Health", "Meridian Capital", "Atlas Freight", "Lumen Studio", "Corvid Systems", "Sable & Finch", "Verity Logistics", "Orchard Retail", "Kestrel Bio", "Arden Realty", "Quill & Co"];

export function defaultAnswers(e: Engine): Answers {
  return Object.fromEntries(e.steps.map((st) => [st.id, st.kind === "multi" ? st.options.map((o) => o.value) : st.kind === "level" ? st.options[1].value : st.options[0].value]));
}

export const meets = (answers: Answers, req?: Requires) => {
  if (!req) return true;
  const v = answers[req[0]];
  return Array.isArray(v) ? v.includes(req[1]) : v === req[1];
};

/** The stance and ticker tempo implied by the setup answers. */
export function postureOf(e: Engine, answers: Answers): { stance: Stance; tempo: number } {
  let stance: Stance = "balanced";
  let tempo = 1;
  for (const st of e.steps) {
    const v = answers[st.id];
    for (const o of st.options) {
      if (Array.isArray(v) ? !v.includes(o.value) : v !== o.value) continue;
      if (o.stance) stance = o.stance;
      if (o.tempo) tempo *= o.tempo;
    }
  }
  return { stance, tempo };
}

export const usdFmt = usd;
