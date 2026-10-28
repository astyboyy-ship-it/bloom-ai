import { NextResponse } from "next/server";

/** Helpers for the public engine-demo APIs (/api/intent-pulse, /api/aware-infrastructure, /api/shadow-workforce). */

// Public endpoints: the demo pages and third-party sites using the embed scripts both call them.
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

const WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

/** Best-effort per-instance limiter so a public endpoint can't be hammered from one IP. */
export function rateLimited(req: Request, scope: string, maxPerMinute: number) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) buckets.clear();
  return recent.length > maxPerMinute;
}

export const fail = (status: number, message: string, details?: unknown) =>
  NextResponse.json({ error: { message, details } }, { status, headers: CORS });

export const ok = (body: unknown) => NextResponse.json(body, { headers: CORS });

export async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return { ok: false };
  }
}

export const preflight = () => new Response(null, { status: 204, headers: CORS });
