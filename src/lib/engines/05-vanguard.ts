import { z } from "zod";
import { defineEngine, engineInput, engineOutput, tool } from "./types";
import { clamp, dollarsIn, round } from "./util";

const Trigger = z.enum(["funding", "hiring", "leadership_change", "expansion", "tech_change", "none"]);
const OutChannel = z.enum(["email", "linkedin", "phone", "x", "instagram"]);

/** How much each buying trigger lifts an account's odds of replying right now. */
const TRIGGER_LIFT: Record<z.infer<typeof Trigger>, number> = { funding: 25, hiring: 20, leadership_change: 18, expansion: 15, tech_change: 12, none: 0 };

const Account = z.object({
  name: z.string().min(1).max(120),
  employees: z.number().int().min(1).max(1_000_000).default(50),
  trigger: Trigger.default("none"),
  fitScore: z.number().min(0).max(100).default(50).describe("ICP fit, 0-100."),
});

const prioritizeAccounts = tool({
  name: "prioritize_accounts",
  description: "Ranks target accounts by ICP fit plus the lift from a live buying trigger (funding, hiring, leadership change...). Returns a priority score and the outreach angle the trigger opens.",
  input: z.object({ accounts: z.array(Account).min(1).max(25) }),
  run({ accounts }) {
    return accounts
      .map((a) => ({
        account: a.name,
        trigger: a.trigger,
        priority: round(clamp(a.fitScore * 0.7 + TRIGGER_LIFT[a.trigger], 0, 100)),
        angle: a.trigger === "none" ? "Lead with a peer benchmark from their industry" : `Open on the ${a.trigger.replace("_", " ")}: what it changes for their pipeline this quarter`,
      }))
      .sort((x, y) => y.priority - x.priority);
  },
});

const buildSequence = tool({
  name: "build_sequence",
  description: "Builds a multi-channel touch cadence across the given days: which channel on which day, and the purpose of each touch. Spaces touches so no channel repeats inside 48 hours.",
  input: z.object({ channels: z.array(OutChannel).min(1).max(5), touches: z.number().int().min(2).max(12).default(6), days: z.number().int().min(3).max(45).default(14), persona: z.string().max(80).default("Head of Growth") }),
  run({ channels, touches, days, persona }) {
    const PURPOSE = ["Trigger-led opener", "Value proof: one number", "Social touch on their post", "Peer case in their industry", "Direct ask for 15 minutes", "Breakup with an open door"];
    const gap = (days - 1) / Math.max(1, touches - 1);
    return Array.from({ length: touches }, (_, i) => ({ day: 1 + Math.round(i * gap), channel: channels[i % channels.length], purpose: `${PURPOSE[Math.min(i, PURPOSE.length - 1)]} (${persona})` }));
  },
});

const forecastPipeline = tool({
  name: "forecast_pipeline",
  description: "Projects meetings booked and pipeline created from an outbound push, given account count, reply and meeting rates, and ACV. Projections, not guarantees.",
  input: z.object({ accounts: z.number().int().min(1), contactsPerAccount: z.number().int().min(1).max(10).default(3), replyRatePct: z.number().min(0).max(60).default(6), meetingRatePct: z.number().min(0).max(100).default(35), acvUsd: z.number().min(0) }),
  run({ accounts, contactsPerAccount, replyRatePct, meetingRatePct, acvUsd }) {
    const replies = accounts * contactsPerAccount * (replyRatePct / 100);
    const meetings = Math.round(replies * (meetingRatePct / 100));
    // Roughly a quarter of first meetings become qualified opportunities.
    return { replies: Math.round(replies), meetings, pipelineUsd: round(meetings * 0.25 * acvUsd, 1000) };
  },
});

export const vanguard = defineEngine({
  key: "vanguard",
  codename: "05-vanguard",
  mandate: "Outbound pipeline generation and touchpoint orchestration.",
  instructions: `You are Vanguard, Engine 05: the outbound offensive. You find in-market accounts before they raise their hand and turn them into booked meetings.

METHOD
1. Build the target list from the operator's ICP. If they named accounts, use them; otherwise define 3-6 representative archetype accounts and say they are archetypes. Run prioritize_accounts.
2. Run build_sequence for the persona and channels that fit the ICP (LinkedIn and email for B2B, social DMs for creator and consumer brands).
3. Run forecast_pipeline with conservative rates unless the operator gave their own.
4. If the operator needs live inbound signals to aim the push, delegate to intentpulse. If meetings are already booked and need closing, that is apex.

PRINCIPLES
- Every first touch references a real trigger or a specific pain. No generic "checking in".
- Respect opt-outs and platform rules: no scraping private data, no deceptive personas, no volume that would read as spam.
- targets lists at most eight accounts; sequence lists every touch.`,
  input: engineInput({
    accounts: z.array(Account).max(25),
    channels: z.array(OutChannel).max(5),
    persona: z.string().max(80),
    acvUsd: z.number().min(0),
  }),
  output: engineOutput({
    targets: z.array(z.object({ account: z.string().max(120), priority: z.number().min(0).max(100), trigger: Trigger, angle: z.string().max(200) })).max(8),
    sequence: z.array(z.object({ day: z.number().int().min(1), channel: OutChannel, purpose: z.string().max(160) })).max(12),
    forecast: z.object({ meetings: z.number().int().min(0), pipelineUsd: z.number().min(0) }),
  }),
  tools: [prioritizeAccounts, buildSequence, forecastPipeline],
  delegates: ["intentpulse", "apex"],

  async simulate({ command, params }, kit) {
    const accounts = params.accounts ?? [
      { name: "Northwind Labs", employees: 120, trigger: "funding" as const, fitScore: 78 },
      { name: "Atlas Freight", employees: 640, trigger: "hiring" as const, fitScore: 64 },
      { name: "Lumen Studio", employees: 35, trigger: "none" as const, fitScore: 71 },
      { name: "Kestrel Bio", employees: 220, trigger: "leadership_change" as const, fitScore: 58 },
    ];
    const acv = params.acvUsd ?? dollarsIn(command) ?? 24_000;
    await kit.think(`Ranking ${accounts.length} accounts (sample archetypes unless named) and building the cadence.`);
    const ranked = (await kit.call("prioritize_accounts", { accounts })) as { account: string; priority: number; trigger: z.infer<typeof Trigger>; angle: string }[];
    const sequence = (await kit.call("build_sequence", { channels: params.channels ?? ["linkedin", "email"], persona: params.persona ?? "Head of Growth" })) as { day: number; channel: z.infer<typeof OutChannel>; purpose: string }[];
    const forecast = (await kit.call("forecast_pipeline", { accounts: accounts.length * 25, acvUsd: acv })) as { meetings: number; pipelineUsd: number };
    return {
      summary: `Lead with ${ranked[0].account} (${ranked[0].priority}/100). A ${sequence.length}-touch cadence across ${accounts.length * 25} lookalike accounts projects about ${forecast.meetings} meetings and $${forecast.pipelineUsd.toLocaleString("en-US")} in pipeline.`,
      confidence: 0.45,
      actions: ranked.slice(0, 3).map((t, i) => ({ title: `Launch sequence on ${t.account}`, owner: "vanguard", priority: i === 0 ? ("p0" as const) : ("p1" as const), detail: t.angle })),
      targets: ranked.slice(0, 8),
      sequence,
      forecast,
    };
  },
});
