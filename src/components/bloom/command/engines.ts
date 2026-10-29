import { Activity, AudioLines, BrainCircuit, Calculator, Crown, Eye, FileText, Gauge, Gem, LifeBuoy, Mail, MessageCircle, Radar, RefreshCw, Route, Scale, Send, ShieldCheck, Swords, Tags, Target, Telescope, TrendingUp, UserPlus, type LucideIcon } from "lucide-react";
import type { PaintingKey } from "../art/paintings";

export type EngineKey = "sovereign" | "apex" | "coreops" | "intentpulse" | "vanguard" | "cortex" | "shield" | "aether";
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
  /** Short domain tag shown beside the engine's number (engines 05–08). */
  badge?: string;
  /** The headline number its execution card reports, e.g. "Projected 30-Day Pipeline ($)". */
  metric?: string;
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

  vanguard: {
    key: "vanguard",
    index: "05",
    name: "Vanguard",
    role: "Outbound Pipeline & Prospecting",
    badge: "PIPELINE",
    metric: "Projected 30-Day Pipeline ($)",
    painting: "wanderer",
    greeting: "Initializing Engine Nº 05: Vanguard... Scanning the horizon for in-market accounts. Arming outbound sequences.",
    steps: [
      {
        id: "icp",
        kind: "choice",
        title: "Define your ideal target account",
        hint: "Vanguard hunts where your best customers already live.",
        options: [
          { value: "smb", label: "Fast-Growing SMBs", detail: "Founder-led teams of 10 to 200 people who decide quickly.", tempo: 1.2 },
          { value: "midmarket", label: "Mid-Market Operators", detail: "Department heads with real budget and a buying process." },
          { value: "enterprise", label: "Enterprise Accounts", detail: "Multi-stakeholder deals worth the long game.", stance: "stealth" },
        ],
      },
      {
        id: "cadence",
        kind: "level",
        title: "Set your outbound cadence",
        hint: "How hard Vanguard pushes once it finds a fit.",
        options: [
          { value: "1", label: "Level 1 · Surgical", detail: "A few hand-tuned touches to the hottest accounts only.", stance: "stealth" },
          { value: "2", label: "Level 2 · Steady", detail: "A full sequence for every good fit, paced like a person would." },
          { value: "3", label: "Level 3 · Blitz", detail: "Every in-market account gets a multi-channel sequence today.", stance: "aggressive", tempo: 1.3 },
        ],
      },
      {
        id: "channels",
        kind: "multi",
        title: "Choose your prospecting channels",
        hint: "Vanguard only reaches out where you allow it.",
        options: [
          { value: "email", label: "Cold Email", detail: "Personal, researched first lines at scale." },
          { value: "linkedin", label: "LinkedIn", detail: "Connection requests and DMs to decision-makers." },
          { value: "social", label: "Social Signals", detail: "Replies to people publicly asking for what you sell." },
        ],
      },
    ],
    cta: "Launch Vanguard Offensive",
    channels: true,
    cards: [
      {
        id: "research",
        icon: Telescope,
        agents: 6,
        count: 240,
        title: (a, n) => `${agents(a)} researching ${s(n, "target account")}`,
        events: [
          { text: "{agent} found {co} hiring three sales reps, a classic buying trigger", lead: true },
          { text: "{agent} mapped four decision-makers at {co} and verified their emails" },
          { text: "{agent} flagged {co}'s new funding round as an opening" },
        ],
      },
      {
        id: "sequences",
        icon: Send,
        agents: 7,
        count: 38,
        title: (a, n) => `${agents(a)} running ${s(n, "outbound sequence")}`,
        events: [
          { text: "{agent} sent a personal first touch to the VP of Sales at {co}" },
          { text: "{agent} booked a discovery call with {co} from a cold email reply", lead: true },
          { text: "{agent} opened a LinkedIn conversation with {co}'s founder", requires: ["channels", "linkedin"] },
          { text: "{agent} paused a sequence after {co} replied 'not this quarter'" },
        ],
      },
      {
        id: "signals",
        icon: Radar,
        agents: 5,
        count: 64,
        title: (a, n) => `${agents(a)} tracking ${s(n, "intent signal")}`,
        events: [
          { text: "{agent} caught a post asking for exactly what you sell and replied within minutes", requires: ["channels", "social"], lead: true },
          { text: "{agent} spotted {co} comparing your competitors on a review site" },
          { text: "{agent} logged {amt} in new pipeline from this morning's replies", amt: [8000, 42000], deal: true },
        ],
      },
      {
        id: "pipeline",
        icon: Target,
        agents: 4,
        count: 22,
        title: (a, n) => `${agents(a)} qualifying ${s(n, "booked meeting")}`,
        events: [
          { text: "{agent} qualified {co}: budget confirmed, decision within 30 days", lead: true },
          { text: "{agent} handed a warm {co} meeting to Apex with full research attached" },
          { text: "{agent} added {amt} to your 30-day pipeline", amt: [12000, 60000], deal: true },
        ],
      },
    ],
    flows: [
      { from: "vanguard", to: "apex", n: 6, text: (n) => `Handing off ${s(n, "booked meeting")}` },
      { from: "intentpulse", to: "vanguard", n: 14, text: (n) => `Passing ${s(n, "warm signal")} for outreach` },
      { from: "vanguard", to: "coreops", n: 3, text: (n) => `Syncing ${s(n, "new account")} into the CRM` },
    ],
    brief: {
      base: { leads: 214, pipeline: 386000, hours: 71 },
      lines: (b) => [
        `${b.leads} target accounts were researched and contacted in your voice.`,
        `${usd(b.pipeline)} in projected pipeline was opened from cold outreach.`,
        `The warmest replies were booked as meetings and handed to Apex the same hour.`,
        `About ${Math.round(b.hours)} hours of list-building, research and follow-up were done for you.`,
      ],
    },
  },

  cortex: {
    key: "cortex",
    index: "06",
    name: "Cortex",
    role: "Deal Closing & Objection Intelligence",
    badge: "CLOSING",
    metric: "Recovered Deal Velocity ($)",
    painting: "venice",
    greeting: "Initializing Engine Nº 06: Cortex... Loading call transcripts. Mapping every objection to its winning response.",
    steps: [
      {
        id: "motion",
        kind: "choice",
        title: "Choose your sales motion",
        hint: "Cortex studies how your deals are actually won and lost.",
        options: [
          { value: "calls", label: "Call-Led Sales", detail: "Discovery and demo calls, recorded and transcribed." },
          { value: "async", label: "Async & Email Deals", detail: "Deals won over email threads and proposals.", stance: "stealth" },
          { value: "hybrid", label: "Hybrid Pipeline", detail: "A mix of calls, email and DMs.", stance: "balanced" },
        ],
      },
      {
        id: "coaching",
        kind: "level",
        title: "Set Cortex's intervention level",
        hint: "How directly Cortex steps into live deals.",
        options: [
          { value: "1", label: "Level 1 · Advise", detail: "Briefs your closer before every call; you decide what to use." },
          { value: "2", label: "Level 2 · Co-Pilot", detail: "Drafts follow-ups and objection replies for your approval." },
          { value: "3", label: "Level 3 · Autonomous Closer", detail: "Sends rebuttals and closing terms within the limits you set.", stance: "aggressive", tempo: 1.2 },
        ],
      },
      {
        id: "focus",
        kind: "choice",
        title: "Pick the leak to plug first",
        hint: "Where Cortex puts most of its agents.",
        options: [
          { value: "price", label: "Price Objections", detail: "Deals that stall on 'too expensive'." },
          { value: "stalled", label: "Stalled Deals", detail: "Opportunities that went quiet after the demo." },
          { value: "competitor", label: "Competitor Losses", detail: "Buyers who pick a rival at the last minute." },
        ],
      },
    ],
    cta: "Engage Cortex Intelligence",
    cards: [
      {
        id: "transcripts",
        icon: AudioLines,
        agents: 6,
        count: 48,
        title: (a, n) => `${agents(a)} analysing ${s(n, "call transcript")}`,
        events: [
          { text: "{agent} found {co} raised budget concerns three times on yesterday's call" },
          { text: "{agent} flagged a buying signal: {co} asked about onboarding timelines", lead: true },
          { text: "{agent} scored the {co} demo: strong fit, weak urgency" },
        ],
      },
      {
        id: "objections",
        icon: Swords,
        agents: 7,
        count: 19,
        title: (a, n) => `${agents(a)} countering ${s(n, "live objection")}`,
        events: [
          { text: "{agent} drafted a value-first answer to {co}'s pricing pushback" },
          { text: "{agent} turned 'we need to think about it' at {co} into a booked decision call", lead: true },
          { text: "{agent} built a side-by-side for {co} against the competitor they mentioned" },
        ],
      },
      {
        id: "briefs",
        icon: BrainCircuit,
        agents: 5,
        count: 11,
        title: (a, n) => `${agents(a)} writing ${s(n, "closing brief")}`,
        events: [
          { text: "{agent} briefed your closer on {co}: the decision-maker, the budget and the one risk to defuse" },
          { text: "{agent} predicted {co} will ask for a discount and prepared the trade-off" },
          { text: "{agent} recovered {amt} by reviving a deal that went quiet after the demo", amt: [6000, 38000], deal: true },
        ],
      },
      {
        id: "velocity",
        icon: Gauge,
        agents: 4,
        count: 26,
        title: (a, n) => `${agents(a)} accelerating ${s(n, "open deal")}`,
        events: [
          { text: "{agent} shortened {co}'s cycle by sending the security pack before they asked" },
          { text: "{agent} moved {co} to contract stage, worth {amt}", amt: [9000, 52000], deal: true },
          { text: "{agent} warned Shield that {co} signed only a short-term commitment" },
        ],
      },
    ],
    flows: [
      { from: "apex", to: "cortex", n: 5, text: (n) => `Requested ${s(n, "objection brief")}` },
      { from: "cortex", to: "apex", n: 4, text: (n) => `Sent ${s(n, "closing script")}` },
      { from: "cortex", to: "aether", n: 2, text: (n) => `Flagged ${s(n, "price objection pattern")}` },
    ],
    brief: {
      base: { leads: 64, pipeline: 298000, hours: 48 },
      lines: (b) => [
        `${b.leads} live deals were analysed, each with an objection plan.`,
        `${usd(b.pipeline)} in deal velocity was recovered from stalled and at-risk deals.`,
        `Every closer went into their calls with a one-page brief on what will make or break the deal.`,
        `About ${Math.round(b.hours)} hours of call review, note-taking and follow-up writing were saved.`,
      ],
    },
  },

  shield: {
    key: "shield",
    index: "07",
    name: "Shield",
    role: "Retention & Anti-Churn Defense",
    badge: "RETENTION",
    metric: "Retained ARR & Churn Saved ($)",
    painting: "temeraire",
    greeting: "Initializing Engine Nº 07: Shield... Streaming account telemetry. Arming churn-rescue protocols.",
    steps: [
      {
        id: "signals",
        kind: "choice",
        title: "Choose your churn early-warning source",
        hint: "What Shield watches to spot an account cooling off.",
        options: [
          { value: "usage", label: "Product Usage", detail: "Logins, seats and feature adoption dropping." },
          { value: "support", label: "Support & Sentiment", detail: "Ticket volume, tone and unanswered complaints.", stance: "stealth" },
          { value: "billing", label: "Billing Signals", detail: "Failed payments, downgrades and late invoices." },
        ],
      },
      {
        id: "rescue",
        kind: "level",
        title: "Set the rescue protocol",
        hint: "How hard Shield moves once an account is at risk.",
        options: [
          { value: "1", label: "Level 1 · Alert", detail: "Flags at-risk accounts to your team, with the reason." },
          { value: "2", label: "Level 2 · Intervene", detail: "Sends a personal check-in and a fix plan, with your approval." },
          { value: "3", label: "Level 3 · Full Defense", detail: "Runs the whole save play: outreach, offer and executive escalation.", stance: "aggressive", tempo: 1.2 },
        ],
      },
      {
        id: "expansion",
        kind: "choice",
        title: "Pick your expansion stance",
        hint: "What Shield does with your healthiest accounts.",
        options: [
          { value: "protect", label: "Protect First", detail: "Every agent focused on keeping revenue, not growing it.", stance: "stealth" },
          { value: "balanced", label: "Protect & Grow", detail: "Save the risky accounts, upsell the thriving ones." },
          { value: "expand", label: "Expansion Push", detail: "Actively pitch upgrades and seat expansions.", tempo: 1.2 },
        ],
      },
    ],
    cta: "Raise Shield Defenses",
    cards: [
      {
        id: "telemetry",
        icon: Activity,
        agents: 6,
        count: 312,
        title: (a, n) => `${agents(a)} monitoring ${s(n, "customer account")}`,
        events: [
          { text: "{agent} noticed {co}'s active users fell 30% in two weeks" },
          { text: "{agent} flagged {co}: their internal champion just left the company" },
          { text: "{agent} confirmed {co} adopted the new feature after onboarding" },
        ],
      },
      {
        id: "rescue",
        icon: LifeBuoy,
        agents: 7,
        count: 9,
        title: (a, n) => `${agents(a)} rescuing ${s(n, "at-risk account")}`,
        events: [
          { text: "{agent} booked a save call with {co}'s COO before their renewal", lead: true },
          { text: "{agent} rescued {co} and protected {amt} in annual revenue", amt: [8000, 64000], deal: true },
          { text: "{agent} sent {co} a fix plan for the issue they complained about" },
        ],
      },
      {
        id: "renewals",
        icon: RefreshCw,
        agents: 5,
        count: 27,
        title: (a, n) => `${agents(a)} securing ${s(n, "upcoming renewal")}`,
        events: [
          { text: "{agent} renewed {co} for another year, 60 days early" },
          { text: "{agent} prepared a renewal brief for {co} with proof of usage" },
          { text: "{agent} caught a failed payment from {co} and fixed it before service stopped" },
        ],
      },
      {
        id: "expansion",
        icon: TrendingUp,
        agents: 4,
        count: 14,
        title: (a, n) => `${agents(a)} expanding ${s(n, "healthy account")}`,
        events: [
          { text: "{agent} spotted {co} hitting their seat limit and proposed an upgrade", lead: true },
          { text: "{agent} closed a {amt} expansion with {co}", amt: [4000, 30000], deal: true },
          { text: "{agent} asked Aether for the best upgrade price for {co}" },
        ],
      },
    ],
    flows: [
      { from: "coreops", to: "shield", n: 11, text: (n) => `Handed over ${s(n, "newly onboarded account")}` },
      { from: "shield", to: "aether", n: 4, text: (n) => `Requested ${s(n, "upgrade price")}` },
      { from: "shield", to: "cortex", n: 3, text: (n) => `Sent ${s(n, "at-risk renewal")} for a closing brief` },
    ],
    brief: {
      base: { leads: 312, pipeline: 274000, hours: 52 },
      lines: (b) => [
        `${b.leads} customer accounts were watched around the clock for early signs of churn.`,
        `${usd(b.pipeline)} in recurring revenue was retained or saved from cancellation.`,
        `Every at-risk account got a personal response before it could slip away.`,
        `About ${Math.round(b.hours)} hours of account reviews, renewal prep and save calls were handled for you.`,
      ],
    },
  },

  aether: {
    key: "aether",
    index: "08",
    name: "Aether",
    role: "Dynamic Pricing & Monetization",
    badge: "PRICING",
    metric: "Unlocked ACV Expansion ($)",
    painting: "consummation",
    greeting: "Initializing Engine Nº 08: Aether... Modelling willingness to pay. Calibrating value metrics.",
    steps: [
      {
        id: "model",
        kind: "choice",
        title: "Choose your current pricing model",
        hint: "Aether starts from how you charge today.",
        options: [
          { value: "flat", label: "Flat Plans", detail: "A few fixed tiers everyone picks from." },
          { value: "seat", label: "Per Seat", detail: "Price grows with the number of users." },
          { value: "usage", label: "Usage-Based", detail: "Customers pay for what they consume." },
        ],
      },
      {
        id: "appetite",
        kind: "level",
        title: "Set your pricing risk appetite",
        hint: "How boldly Aether tests new prices.",
        options: [
          { value: "1", label: "Level 1 · Guarded", detail: "Small tests on new customers only.", stance: "stealth" },
          { value: "2", label: "Level 2 · Measured", detail: "Tests across segments, never touching existing contracts." },
          { value: "3", label: "Level 3 · Bold", detail: "Rebuilds tiers and value metrics wherever the data says so.", stance: "aggressive", tempo: 1.25 },
        ],
      },
      {
        id: "lever",
        kind: "choice",
        title: "Pick your main monetization lever",
        hint: "Where Aether looks for revenue first.",
        options: [
          { value: "acv", label: "Raise ACV", detail: "Bigger first contracts through smarter packaging." },
          { value: "upsell", label: "Expansion & Add-Ons", detail: "Paid upgrades customers actually want." },
          { value: "discount", label: "Discount Discipline", detail: "Stop giving away margin to close deals." },
        ],
      },
    ],
    cta: "Activate Aether Pricing Engine",
    cards: [
      {
        id: "wtp",
        icon: Calculator,
        agents: 6,
        count: 18,
        title: (a, n) => `${agents(a)} modelling ${s(n, "price point")}`,
        events: [
          { text: "{agent} found buyers like {co} would pay 22% more for the annual plan" },
          { text: "{agent} tested a new Growth tier on 40 visitors and conversions held steady" },
          { text: "{agent} mapped which features {co} uses most, to price them properly" },
        ],
      },
      {
        id: "packaging",
        icon: Gem,
        agents: 5,
        count: 6,
        title: (a, n) => `${agents(a)} restructuring ${s(n, "pricing tier")}`,
        events: [
          { text: "{agent} moved reporting into the Pro tier, where it lifts upgrades" },
          { text: "{agent} proposed a usage-based add-on for heavy accounts like {co}" },
          { text: "{agent} unlocked {amt} in expansion by repackaging the Pro plan", amt: [6000, 40000], deal: true },
        ],
      },
      {
        id: "discounts",
        icon: Tags,
        agents: 5,
        count: 23,
        title: (a, n) => `${agents(a)} policing ${s(n, "discount request")}`,
        events: [
          { text: "{agent} blocked an unneeded 25% discount for {co} and offered a two-year term instead" },
          { text: "{agent} approved a 10% discount for {co} in exchange for a case study" },
          { text: "{agent} saved {amt} in margin across this week's deals", amt: [3000, 18000], deal: true },
        ],
      },
      {
        id: "expansion",
        icon: TrendingUp,
        agents: 4,
        count: 31,
        title: (a, n) => `${agents(a)} pricing ${s(n, "expansion offer")}`,
        events: [
          { text: "{agent} priced {co}'s seat expansion at a rate they accepted in a day", lead: true },
          { text: "{agent} sent Shield the right upgrade offer for {co}" },
          { text: "{agent} raised {co}'s contract value by {amt} at renewal", amt: [5000, 36000], deal: true },
        ],
      },
    ],
    flows: [
      { from: "aether", to: "apex", n: 3, text: (n) => `Sent ${s(n, "new price sheet")}` },
      { from: "shield", to: "aether", n: 4, text: (n) => `Requested ${s(n, "upgrade price")}` },
      { from: "aether", to: "sovereign", n: 1, text: (n) => `Submitted ${s(n, "pricing change")} for approval` },
    ],
    brief: {
      base: { leads: 46, pipeline: 228000, hours: 39 },
      lines: (b) => [
        `${b.leads} pricing tests and discount requests were handled without a meeting.`,
        `${usd(b.pipeline)} in contract value was unlocked through packaging, upgrades and discount discipline.`,
        `No deal closed below the margin floor you set.`,
        `About ${Math.round(b.hours)} hours of spreadsheet modelling and pricing debates were saved.`,
      ],
    },
  },
};

export const ENGINE_ORDER: EngineKey[] = ["sovereign", "apex", "coreops", "intentpulse", "vanguard", "cortex", "shield", "aether"];

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
