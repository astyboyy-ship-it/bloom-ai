import { z } from "zod";
import { defineEngine, engineInput, engineOutput, tool } from "./types";
import { clamp, round } from "./util";

const Band = z.enum(["green", "amber", "red"]);
const Driver = z.enum(["usage_decline", "low_adoption", "support_friction", "detractor", "billing", "none"]);

const AccountHealth = z.object({
  name: z.string().min(1).max(120),
  arrUsd: z.number().min(0),
  usageTrendPct: z.number().min(-100).max(500).default(0).describe("Change in active usage over the last 30 days."),
  seatUtilizationPct: z.number().min(0).max(100).default(70),
  openTickets: z.number().int().min(0).max(500).default(0),
  nps: z.number().min(-100).max(100).nullable().default(null),
  daysPastDue: z.number().int().min(0).max(365).default(0),
  renewalInDays: z.number().int().min(0).max(1000).default(120),
});

/** Plays keyed by the primary driver; the band sets how hard to run them. */
const PLAYS: Record<z.infer<typeof Driver>, string> = {
  usage_decline: "Executive check-in within 48h, then a re-onboarding session on the two workflows they dropped",
  low_adoption: "Seat-level enablement: identify inactive users and run a 20-minute workflow clinic",
  support_friction: "Escalate open tickets to a named owner and send a resolution timeline today",
  detractor: "Founder-level call to hear the complaint, then a written fix plan within a week",
  billing: "Finance outreach with a flexible payment plan before service is affected",
  none: "Quarterly value review and an expansion conversation",
};

const computeHealth = tool({
  name: "compute_health",
  description: "Scores each account's health 0-100 from usage trend, seat utilization, support load, NPS and billing, and returns its band (green / amber / red), primary driver and renewal exposure.",
  input: z.object({ accounts: z.array(AccountHealth).min(1).max(25) }),
  run({ accounts }) {
    return accounts.map((a) => {
      const penalties: [z.infer<typeof Driver>, number][] = [
        ["usage_decline", a.usageTrendPct < 0 ? Math.min(35, -a.usageTrendPct * 0.9) : 0],
        ["low_adoption", Math.max(0, 60 - a.seatUtilizationPct) * 0.5],
        ["support_friction", Math.min(20, a.openTickets * 4)],
        ["detractor", a.nps !== null && a.nps < 0 ? Math.min(20, -a.nps / 3) : 0],
        ["billing", Math.min(25, a.daysPastDue * 0.8)],
      ];
      const health = round(clamp(100 - penalties.reduce((s, [, p]) => s + p, 0) + Math.min(10, Math.max(0, a.usageTrendPct) * 0.2), 0, 100));
      const [driver, worst] = penalties.sort((x, y) => y[1] - x[1])[0];
      const band = health >= 70 ? "green" : health >= 45 ? "amber" : "red";
      return {
        name: a.name,
        health,
        band,
        driver: worst > 0 ? driver : "none",
        arrUsd: a.arrUsd,
        renewalInDays: a.renewalInDays,
        // At-risk ARR is weighted by band, and doubled in weight when the renewal is inside 90 days.
        arrAtRiskUsd: round(a.arrUsd * (band === "red" ? 0.6 : band === "amber" ? 0.25 : 0) * (a.renewalInDays <= 90 ? 1.5 : 1)),
      };
    });
  },
});

const rescuePlay = tool({
  name: "rescue_play",
  description: "Returns the rescue or growth play for an account given its band and primary churn driver, with the owner and deadline.",
  input: z.object({ account: z.string().min(1).max(120), band: Band, driver: Driver }),
  run({ account, band, driver }) {
    return { account, play: PLAYS[driver], owner: band === "red" ? "human" : "shield", deadlineDays: band === "red" ? 2 : band === "amber" ? 7 : 30 };
  },
});

export const shield = defineEngine({
  key: "shield",
  codename: "07-shield",
  mandate: "Churn prevention, retention telemetry and client health monitoring.",
  instructions: `You are Shield, Engine 07: the retention perimeter. You spot accounts about to leave weeks before they do, run the play that keeps them, and point to the healthiest ones for expansion.

METHOD
1. Build the account list from the command. If the operator gave telemetry, use it exactly; if not, ask nothing and model 3-5 representative accounts, labeled as examples.
2. Run compute_health on all of them in one call.
3. Run rescue_play for every amber and red account. Red accounts always get a human owner.
4. Green accounts with rising usage and high seat utilization are expansion candidates; if the operator wants them priced, delegate to aether.
5. If the root cause is operational (onboarding gaps, broken integrations), delegate to coreops.

PRINCIPLES
- Lead with ARR at risk inside 90 days. That is the number the operator acts on.
- Never recommend a discount as the first rescue move; fix the driver first.`,
  input: engineInput({ accounts: z.array(AccountHealth).max(25) }),
  output: engineOutput({
    accounts: z.array(z.object({ name: z.string().max(120), health: z.number().min(0).max(100), band: Band, driver: Driver, play: z.string().max(300) })).max(25),
    arrAtRiskUsd: z.number().min(0),
    expansionCandidates: z.array(z.string().max(120)).max(10),
  }),
  tools: [computeHealth, rescuePlay],
  delegates: ["aether", "coreops"],

  async simulate({ params }, kit) {
    const accounts = params.accounts ?? [
      { name: "Halcyon Health", arrUsd: 84_000, usageTrendPct: -32, seatUtilizationPct: 41, openTickets: 3, nps: -10, daysPastDue: 0, renewalInDays: 60 },
      { name: "Meridian Capital", arrUsd: 120_000, usageTrendPct: 18, seatUtilizationPct: 92, openTickets: 0, nps: 52, daysPastDue: 0, renewalInDays: 200 },
      { name: "Orchard Retail", arrUsd: 36_000, usageTrendPct: -8, seatUtilizationPct: 58, openTickets: 5, nps: 12, daysPastDue: 21, renewalInDays: 85 },
    ];
    await kit.think(`Scoring ${accounts.length} accounts${params.accounts ? "" : " (example telemetry)"} and assigning plays.`);
    const scored = (await kit.call("compute_health", { accounts })) as { name: string; health: number; band: z.infer<typeof Band>; driver: z.infer<typeof Driver>; arrAtRiskUsd: number }[];
    const out = [];
    for (const a of scored) {
      const p = a.band === "green" ? { play: PLAYS[a.driver] } : ((await kit.call("rescue_play", { account: a.name, band: a.band, driver: a.driver })) as { play: string });
      out.push({ name: a.name, health: a.health, band: a.band, driver: a.driver, play: p.play });
    }
    const atRisk = scored.reduce((s, a) => s + a.arrAtRiskUsd, 0);
    const worst = [...out].sort((x, y) => x.health - y.health)[0];
    return {
      summary: `$${atRisk.toLocaleString("en-US")} of ARR is at risk. ${worst.name} is the priority (${worst.health}/100, ${worst.driver.replace("_", " ")}).`,
      confidence: params.accounts ? 0.7 : 0.45,
      actions: out.filter((a) => a.band !== "green").map((a) => ({ title: `Rescue ${a.name}`, owner: a.band === "red" ? "human" : "shield", priority: a.band === "red" ? ("p0" as const) : ("p1" as const), detail: a.play })),
      accounts: out,
      arrAtRiskUsd: atRisk,
      expansionCandidates: out.filter((a) => a.band === "green").map((a) => a.name),
    };
  },
});
