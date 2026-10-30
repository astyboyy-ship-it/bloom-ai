import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

const Body = z.object({ provider: z.enum(["anthropic", "openrouter", "openai"]), key: z.string().trim().min(10).max(300) });

type Result = { ok: boolean; latencyMs: number; detail: string };

/**
 * App Settings' "Test Connection": a real, free, read-only call to the provider with the operator's key
 * (list models, or OpenRouter's key-info endpoint, which also reports remaining credit). Only these fixed
 * provider hosts are ever contacted, so this can't be used to make the server fetch arbitrary URLs.
 * The key is used for this one call and not stored or logged.
 */
export async function POST(req: Request) {
  if (rateLimited(req, "settings-test", 12)) return fail(429, "Too many tests. Try again in a minute.");
  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const body = Body.safeParse(json.body);
  if (!body.success) return fail(422, "Provider and key are required.");
  const { provider, key } = body.data;
  const t0 = Date.now();
  const done = (okay: boolean, detail: string): Response => ok({ ok: okay, latencyMs: Date.now() - t0, detail } satisfies Result);
  const signal = AbortSignal.timeout(8000);

  try {
    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: 8000 });
      const page = await client.models.list({ limit: 3 });
      return done(true, `Connected. Models available include ${page.data.map((m) => m.id).join(", ")}.`);
    }
    if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` }, signal });
      if (!res.ok) return done(false, res.status === 401 ? "OpenRouter rejected this key." : `OpenRouter returned ${res.status}.`);
      const { data } = (await res.json()) as { data?: { limit?: number | null; limit_remaining?: number | null; usage?: number } };
      const credit = data?.limit_remaining ?? (data?.limit != null && data.usage != null ? data.limit - data.usage : null);
      return done(true, credit === null ? "Connected. No spending limit on this key." : credit <= 0.05 ? `Connected, but the key has no credit left ($${credit.toFixed(2)}). Runs will fail until it's topped up.` : `Connected. $${credit.toFixed(2)} of credit remaining.`);
    }
    const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal });
    return done(res.ok, res.ok ? "Connected to OpenAI." : res.status === 401 ? "OpenAI rejected this key." : `OpenAI returned ${res.status}.`);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return done(false, "Anthropic rejected this key.");
    if (err instanceof Anthropic.PermissionDeniedError) return done(false, "This Anthropic key doesn't have permission to list models.");
    if (err instanceof Anthropic.APIError) return done(false, `Anthropic returned ${err.status ?? "a network error"}.`);
    return done(false, signal.aborted ? "The provider didn't answer within 8 seconds." : "Couldn't reach the provider.");
  }
}
