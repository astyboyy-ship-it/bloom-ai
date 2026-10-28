import {
  CalendarCheck,
  Compass,
  Cpu,
  Database,
  Eye,
  FileSignature,
  FileText,
  Filter,
  Gauge,
  Megaphone,
  Radar,
  Scale,
  Target,
  TrendingUp,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Bloom } from "../art/flora";
import type { PaintingKey } from "../art/paintings";
import type { EngineKey } from "../command/engines";

export type EngineSlug = "marketing" | "infrastructure" | "workforce" | "intentpulse";

export type Engine = {
  slug: EngineSlug;
  index: string;
  icon: LucideIcon;
  name: string;
  subtitle: string;
  /** One-line summary for the gallery tile. */
  teaser: string;
  description: string;
  painting: PaintingKey;
  blooms: Bloom[];
  build: string;
  autonomy: number;
  testing: string;
  access: string;
  aware: { senses: string[]; perceive: string; reason: string; execute: string };
  pathways: { label: string; audience: string }[];
  services: { label: string; icon: LucideIcon }[];
  cta: string;
  widgetLabel: string;
  /** Standalone interactive demo, when the engine has one (legacy; the command center is primary). */
  demoHref?: string;
  /** The /command engine this one opens in: always the engine with the same number (Nº 01 → Sovereign, …). */
  command: EngineKey;
};

export const engines: Engine[] = [
  {
    slug: "marketing",
    index: "01",
    icon: Megaphone,
    name: "The Aware Marketing Engine",
    subtitle: "Aware Ops & Dealmaker · wealth generation for creators and founders",
    teaser: "Negotiates top-dollar brand partnerships on the fly, from live market data.",
    description:
      "Dynamic Awareness of live market rate cards, brand budgets, competitor positioning, and your exact deal floors. It doesn't just send emails: it reasons through the market data in real time to negotiate top-dollar partnerships on the fly. You wake up to pre-negotiated brand deals, high-value creator collaborations, and optimized rate cards, all structured and waiting for your single tap of approval. For high-end enterprises, it makes its own campaign and deal-making decisions, hands-free.",
    painting: "villaDeste",
    blooms: [
      { kind: "sakura", x: "8%", y: "78%", size: 120 },
      { kind: "goldDahlia", x: "18%", y: "90%", size: 150, delay: 0.3 },
      { kind: "sakura", x: "86%", y: "70%", size: 96, delay: 0.6 },
      { kind: "goldDahlia", x: "93%", y: "86%", size: 132, delay: 0.9 },
      { kind: "sakura", x: "74%", y: "92%", size: 80, delay: 1.2 },
    ],
    build: "Brand partnerships & negotiation modules",
    autonomy: 85,
    testing: "Currently tested in select private creator accounts",
    access: "Early beta · invite-only upon completion",
    aware: {
      senses: ["Live market rate cards", "Brand budgets", "Competitor positioning", "Your exact deal floors"],
      perceive:
        "Senses live market signals: what a brand can pay, what creators like you command, and how competitors are positioned right now.",
      reason:
        "Synthesizes a custom negotiation strategy for this exact deal, with no templates: where your true value sits, what to counter, and when to hold.",
      execute: "Counters, holds, or closes on the fly, then stages the signed partnership for your single tap.",
    },
    pathways: [
      { label: "Creator Brand Deal Automation", audience: "For creators & public figures" },
      { label: "Talent & Agency Roster Rollout", audience: "For talent managers & creator agencies" },
      { label: "Enterprise Custom Campaign Orchestration", audience: "For high-end enterprises" },
    ],
    services: [
      { label: "Real-Time Rate Card Perception", icon: TrendingUp },
      { label: "Budget & Competitor Awareness", icon: Eye },
      { label: "Autonomous Negotiation Decision-Making", icon: Scale },
      { label: "Self-Drafting Terms & Instant Close", icon: FileText },
    ],
    cta: "Request Private Beta Access",
    widgetLabel: "Live negotiation · Lumen Labs",
    demoHref: "/engine-01",
    command: "sovereign",
  },
  {
    slug: "infrastructure",
    index: "02",
    icon: Cpu,
    name: "Aware Infrastructure Architect",
    subtitle: "Total operational autonomy for scaling companies",
    teaser: "Studies how your business flows, then architects and self-deploys the pipeline.",
    description:
      "Dynamic Awareness of your company's operational bottlenecks, data silos, and friction points. Instead of waiting for someone to design a workflow, it studies how your business actually flows, architects the exact custom pipeline you need, and self-deploys it in real time. A zero-latency infrastructure builder that replaces manual operational overhead, so you run at peak velocity without a heavy human operations team.",
    painting: "athens",
    blooms: [
      { kind: "lotus", x: "6%", y: "84%", size: 130 },
      { kind: "lotus", x: "16%", y: "93%", size: 100, delay: 0.4 },
      { kind: "lotus", x: "90%", y: "88%", size: 120, delay: 0.8 },
    ],
    build: "Backend workflow & pipeline engine",
    autonomy: 75,
    testing: "Architecture locked, private client testing underway",
    access: "Early beta · reserve your slot",
    aware: {
      senses: ["Operational bottlenecks", "Data silos", "Friction points", "Your live business flow"],
      perceive: "Senses ops bottlenecks as they happen: where work stalls, duplicates, or waits on a human.",
      reason: "Synthesizes the exact custom pipeline that removes the friction, with no templates or prebuilt flows.",
      execute: "Self-deploys the pipeline in real time, then keeps re-tuning it as your business grows.",
    },
    pathways: [
      { label: "Zero-Latency Ops Migration", audience: "For scaling businesses" },
      { label: "Data Silo Unification", audience: "For multi-tool teams" },
      { label: "Enterprise Process Automation Program", audience: "For high-end enterprises" },
    ],
    services: [
      { label: "Real-Time Bottleneck Perception", icon: Gauge },
      { label: "Data Silo & Friction Diagnosis", icon: Database },
      { label: "Autonomous Pipeline Architecture", icon: Workflow },
      { label: "Self-Deploying Infrastructure", icon: Cpu },
    ],
    cta: "Reserve Early Slot",
    widgetLabel: "Live workflow · order-to-cash",
    demoHref: "/engine-02",
    command: "apex",
  },
  {
    slug: "workforce",
    index: "03",
    icon: Users,
    name: "Aware Shadow Workforce",
    subtitle: "Your 24/7 background executive team",
    teaser: "Perceives who to pitch tonight and stages flawless outbound in your voice.",
    description:
      "Dynamic Awareness of executive trigger events, company news, and your precise personal voice. An invisible, 24/7 AI executive team that perceives who to pitch and why now, adapts every narrative to the target's exact pain points, and stages flawless outbound strategies, PR plays, and contracts overnight, so your leadership team wakes up to closed momentum.",
    painting: "venice",
    blooms: [
      { kind: "orchid", x: "7%", y: "70%", size: 110 },
      { kind: "orchid", x: "13%", y: "86%", size: 90, delay: 0.5 },
      { kind: "orchid", x: "91%", y: "74%", size: 120, delay: 0.9 },
    ],
    build: "24/7 outbound & PR executive agent",
    autonomy: 80,
    testing: "Tested on high-ticket private accounts",
    access: "Early beta · Shadow Workforce waitlist",
    aware: {
      senses: ["Executive trigger events", "Company news", "Target pain points", "Your personal voice"],
      perceive: "Senses executive trigger events: funding rounds, hires, launches, and news that open a door tonight.",
      reason: "Synthesizes who to pitch and which pain point the story should lead with, in your exact voice.",
      execute: "Writes, stages, and sequences the outreach, PR plays, and contracts overnight.",
    },
    pathways: [
      { label: "Founder Overnight Outbound", audience: "For founders & solo operators" },
      { label: "Executive PR Program", audience: "For leadership teams" },
      { label: "Enterprise Deal Desk Staffing", audience: "For high-end enterprises" },
    ],
    services: [
      { label: "Trigger-Event Perception", icon: Radar },
      { label: "Dynamic Voice Awareness", icon: Compass },
      { label: "Pain-Point Narrative Adaptation", icon: Target },
      { label: "Autonomous Overnight Outbound & Staging", icon: FileSignature },
    ],
    cta: "Join Shadow Workforce Waitlist",
    widgetLabel: "Live sender log · tonight",
    demoHref: "/engine-03",
    command: "coreops",
  },
  {
    slug: "intentpulse",
    index: "04",
    icon: Radar,
    name: "Aware IntentPulse Lead Engine",
    subtitle: "Elite B2B intent scoring & VIP conversion",
    teaser: "Scores buyer readiness from micro-intent shifts and routes VIPs instantly.",
    description:
      "Dynamic Awareness of micro-intent shifts, real-time user behavior, and deep buyer-readiness signals. No static lead-scoring rules: it perceives every signal as it happens, filters out the noise, scores intent dynamically down to exact buyer readiness, and instantly routes high-value prospects, locking qualified meetings into your calendar with zero human friction.",
    painting: "goldenLandscape",
    blooms: [
      { kind: "obsidianDahlia", x: "8%", y: "86%", size: 140 },
      { kind: "obsidianDahlia", x: "20%", y: "94%", size: 100, delay: 0.4 },
      { kind: "goldDahlia", x: "88%", y: "84%", size: 120, delay: 0.8 },
      { kind: "obsidianDahlia", x: "95%", y: "95%", size: 96, delay: 1.1 },
    ],
    build: "B2B intent scoring & calendar lock",
    autonomy: 90,
    testing: "Core model training & lead filter testing",
    access: "Early beta · instant access queue",
    aware: {
      senses: ["Micro-intent shifts", "Real-time user behavior", "Buyer-readiness signals"],
      perceive: "Senses micro-intent shifts in real time: every visit, reply, and hesitation as it happens.",
      reason: "Synthesizes a live readiness score against your deal threshold, with no static scoring rules.",
      execute: "Routes the VIP lead instantly and locks the qualified meeting into your calendar.",
    },
    pathways: [
      { label: "B2B Inbound Qualification Setup", audience: "For B2B sales teams" },
      { label: "VIP Routing & Calendar Lock", audience: "For high-ticket closers" },
      { label: "Enterprise Sales Pipeline Integration", audience: "For high-end enterprises" },
    ],
    services: [
      { label: "Micro-Intent Shift Perception", icon: Radar },
      { label: "Real-Time Behavior Awareness", icon: Eye },
      { label: "Dynamic Intent Scoring", icon: Filter },
      { label: "Autonomous VIP Routing & Calendar Lock", icon: CalendarCheck },
    ],
    cta: "Get Early Access",
    widgetLabel: "Live inbound · scored in real time",
    demoHref: "/intentpulse",
    command: "intentpulse",
  },
];

export const getEngine = (slug: string) => engines.find((e) => e.slug === slug);
