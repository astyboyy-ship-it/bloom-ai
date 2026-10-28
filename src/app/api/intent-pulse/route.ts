import { NextResponse } from "next/server";
import { CORS, fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { DEFAULT_GROQ_MODEL, groqSignals } from "@/lib/intentpulse/groq";
import { heuristicSignals } from "@/lib/intentpulse/heuristic";
import { LeadSchema } from "@/lib/intentpulse/schema";
import { assemble } from "@/lib/intentpulse/score";
import { SIGNAL_WEIGHTS, TIER_BANDS, type LeadInput } from "@/lib/intentpulse/types";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export const OPTIONS = preflight;

export function GET() {
  return NextResponse.json(
    {
      engine: "Aware IntentPulse Lead Engine",
      status: "operational",
      inference: process.env.GROQ_API_KEY ? "groq" : "heuristic",
      weights: SIGNAL_WEIGHTS,
      tiers: TIER_BANDS,
      usage: "POST { leadName, company, budgetK, message } as JSON. POST /api/intent-pulse/dispatch to act on a scored lead.",
    },
    { headers: CORS },
  );
}

export async function POST(req: Request) {
  if (rateLimited(req, "intent-pulse", 20)) return fail(429, "Too many requests. Try again in a minute.");

  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const parsed = LeadSchema.safeParse(json.body);
  if (!parsed.success) return fail(422, "Invalid lead payload.", parsed.error.issues.map((i) => i.message));

  const lead: LeadInput = parsed.data;
  const startedAt = Date.now();
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

  if (apiKey) {
    try {
      const extracted = await groqSignals(lead, apiKey, model);
      return ok(assemble({ ...extracted, lead, source: "groq", model, startedAt }));
    } catch (err) {
      console.error("[intent-pulse] Groq inference failed, using heuristic:", err);
      const notice = "Groq inference failed for this run; scored by the keyword heuristic instead.";
      return ok(assemble({ ...heuristicSignals(lead), lead, source: "heuristic", model: null, startedAt, notice }));
    }
  }

  const notice = "GROQ_API_KEY is not configured; scored by the keyword heuristic.";
  return ok(assemble({ ...heuristicSignals(lead), lead, source: "heuristic", model: null, startedAt, notice }));
}
