/** The five agents of the Shadow Workforce demo and the overnight work each one cycles through. */

export type AgentId = "extraction" | "refactor" | "distribution" | "support" | "finance";

export type AgentTask = {
  title: string;
  /** What the finished task leaves on the owner's desk by morning. */
  output: string;
  /** Minutes a human would have spent on it. */
  humanMinutes: number;
  handoff?: AgentId;
};

export type Agent = { id: AgentId; name: string; role: string; speed: number; color: string; tasks: AgentTask[] };

export const AGENTS: Agent[] = [
  {
    id: "extraction",
    name: "Data Extraction Agent",
    role: "Pulls and structures raw data",
    speed: 6,
    color: "#8ff0ff",
    tasks: [
      { title: "Parse 1,240 invoices from the billing inbox", output: "1,240 invoices structured to JSON", humanMinutes: 240, handoff: "finance" },
      { title: "Scrape 38 competitor pricing pages", output: "Pricing matrix for 38 competitors", humanMinutes: 150, handoff: "distribution" },
      { title: "Extract CRM deltas since 18:00", output: "412 CRM records updated", humanMinutes: 90 },
      { title: "OCR 12 scanned supplier contracts", output: "12 contracts searchable, 3 renewal dates flagged", humanMinutes: 120, handoff: "finance" },
    ],
  },
  {
    id: "refactor",
    name: "Code Refactoring Agent",
    role: "Ships clean, tested code",
    speed: 4,
    color: "#b49bff",
    tasks: [
      { title: "Refactor the billing module to async I/O", output: "PR #482: billing module async, 0 regressions", humanMinutes: 300 },
      { title: "Raise test coverage on /api/orders", output: "Coverage 61% → 88% on /api/orders", humanMinutes: 180 },
      { title: "Patch 3 dependency CVEs", output: "3 CVEs patched, lockfile updated", humanMinutes: 90 },
      { title: "Split monolith route handlers", output: "PR #483: 14 handlers extracted", humanMinutes: 240 },
    ],
  },
  {
    id: "distribution",
    name: "Content Distribution Agent",
    role: "Publishes everywhere, on time",
    speed: 7,
    color: "#f5a9b0",
    tasks: [
      { title: "Cut 6 shorts from Tuesday's webinar", output: "6 captioned shorts scheduled", humanMinutes: 180 },
      { title: "Draft and schedule the 08:30 LinkedIn thread", output: "LinkedIn thread queued for 08:30", humanMinutes: 60 },
      { title: "Localise the newsletter to Spanish and German", output: "Newsletter ready in ES and DE", humanMinutes: 120 },
      { title: "Publish the changelog to 4 channels", output: "Changelog live on blog, X, Discord and email", humanMinutes: 45 },
    ],
  },
  {
    id: "support",
    name: "Customer Support Triage",
    role: "Clears the overnight queue",
    speed: 8,
    color: "#f3d48f",
    tasks: [
      { title: "Triage 214 overnight tickets", output: "214 tickets tagged, 171 resolved", humanMinutes: 360, handoff: "refactor" },
      { title: "Draft replies to 37 billing questions", output: "37 replies drafted for approval", humanMinutes: 110, handoff: "finance" },
      { title: "Escalate 2 P1 incidents with full context", output: "2 P1s escalated with repro steps", humanMinutes: 40 },
      { title: "Route 19 feature requests to the roadmap", output: "19 requests merged into 6 roadmap themes", humanMinutes: 50 },
    ],
  },
  {
    id: "finance",
    name: "Financial Reconciliation",
    role: "Keeps the books closed daily",
    speed: 5,
    color: "#ffbd6e",
    tasks: [
      { title: "Match 1,240 invoices to Stripe payouts", output: "1,236 matched, 4 exceptions flagged", humanMinutes: 280 },
      { title: "Flag duplicate and failed charges", output: "4 duplicate charges queued for refund", humanMinutes: 60 },
      { title: "Close the daily ledger", output: "Ledger closed, variance $0.00", humanMinutes: 90 },
      { title: "Prepare the cash-flow snapshot", output: "13-week cash-flow snapshot ready", humanMinutes: 75 },
    ],
  },
];

export const AGENT_IDS = AGENTS.map((a) => a.id) as [AgentId, ...AgentId[]];
export const getAgent = (id: AgentId) => AGENTS.find((a) => a.id === id)!;
