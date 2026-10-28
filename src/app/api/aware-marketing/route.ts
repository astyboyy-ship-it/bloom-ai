import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeDeal, buildLocalResult, reconcile, TONES, USAGE_RIGHTS, type DealInput, type UsageRightsKey } from "@/lib/aware-marketing/engine";
import { DEFAULT_GROQ_MODEL, groqNegotiate } from "@/lib/aware-marketing/groq";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Public endpoint: the demo page, the embed script and third-party CRMs all call it.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "x-aware-engine, x-aware-latency-ms",
  "Cache-Control": "no-store",
};

const usageKeys = Object.keys(USAGE_RIGHTS) as [UsageRightsKey, ...UsageRightsKey[]];

const DealSchema = z.object({
  brandName: z.string().trim().min(1, "brandName is required").max(120),
  creatorName: z.string().trim().max(80).default("").transform((s) => s || "The Creator"),
  budget: z
    .union([z.number(), z.string()])
    .default(0)
    .transform((v, ctx) => {
      const n = typeof v === "string" ? Number(v.replace(/[$,\s]/g, "") || 0) : v;
      if (!Number.isFinite(n) || n < 0 || n > 100_000_000) {
        ctx.addIssue({ code: "custom", message: "budget must be a number between 0 and 100,000,000" });
        return z.NEVER;
      }
      return n;
    }),
  deliverables: z.string().trim().min(1, "deliverables is required (e.g. \"1x YouTube Integration + 2x IG Reels\")").max(600),
  usageRights: z.enum(usageKeys).default("organic"),
  tone: z.enum(Object.keys(TONES) as [keyof typeof TONES, ...(keyof typeof TONES)[]]).default("warm"),
  emailText: z.string().trim().max(6000).default(""),
  callbackUrl: z.string().url().optional(),
});

// Best-effort per-instance limiter so a public LLM endpoint can't be hammered from one IP.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

/** Webhooks go to public https hosts only, never to internal addresses. */
function safeCallback(raw?: string) {
  if (!raw) return null;
  const u = new URL(raw);
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:") return null;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (/^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) return null;
  return u;
}

const fail = (status: number, message: string, details?: unknown) =>
  NextResponse.json({ error: { message, details } }, { status, headers: CORS });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export function GET() {
  return NextResponse.json(
    {
      engine: "The Aware Marketing Engine",
      status: "operational",
      inference: process.env.GROQ_API_KEY ? "groq" : "rate-card",
      model: process.env.GROQ_API_KEY ? process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL : null,
      usageRights: Object.keys(USAGE_RIGHTS),
      tones: Object.keys(TONES),
      usage: "POST { brandName, budget, deliverables, usageRights, tone, creatorName, emailText, callbackUrl? } as JSON.",
    },
    { headers: CORS },
  );
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return fail(429, "Too many requests. Try again in a minute.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Request body must be valid JSON.");
  }
  const parsed = DealSchema.safeParse(body);
  if (!parsed.success) return fail(422, "Invalid deal payload.", parsed.error.issues.map((i) => i.message));

  const { callbackUrl, ...input } = parsed.data;
  const deal: DealInput = input;
  const analysis = analyzeDeal(deal);
  const local = buildLocalResult(deal, analysis);

  let result = local;
  let engine = "rate-card";
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
    try {
      result = reconcile(await groqNegotiate(deal, analysis, apiKey, model), analysis, local);
      engine = `groq:${model}`;
    } catch (err) {
      console.error("[aware-marketing] Groq inference failed, using rate-card engine:", err);
      engine = "rate-card-fallback";
    }
  }

  const callback = safeCallback(callbackUrl);
  if (callback) {
    try {
      await fetch(callback, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "AwareMarketingEngine/1.0" },
        body: JSON.stringify({ event: "deal.evaluated", evaluatedAt: new Date().toISOString(), engine, input: deal, result }),
        signal: AbortSignal.timeout(4000),
      });
    } catch (err) {
      console.error("[aware-marketing] webhook delivery failed:", err);
    }
  }

  return NextResponse.json(result, {
    headers: { ...CORS, "x-aware-engine": engine, "x-aware-latency-ms": String(Date.now() - startedAt) },
  });
}
