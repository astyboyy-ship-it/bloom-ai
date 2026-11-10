import { z } from "zod";
import { ENGINE_ORDER } from "@/components/bloom/command/engines";
import { CORS, fail, preflight, readJson } from "@/lib/demo-http";
import { clientIp, rateLimit } from "@/lib/guard/rate-limit";
import { checkSpend } from "@/lib/guard/spend";
import { provider, streamReply } from "@/lib/command/chat";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ChatSchema = z.object({
  engine: z.enum(ENGINE_ORDER as [string, ...string[]]),
  // The visitor's UI language; the engine answers in it.
  lang: z.enum(["en", "es", "he"]).default("en"),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(16)
    .refine((m) => m.at(-1)?.role === "user", "The last message must be from the user."),
});

export const OPTIONS = preflight;

/** The engines' live Neural Breakdown: streams the engine's pitch back as plain text. */
export async function POST(req: Request) {
  // Public by design (landing-page chat), so it is bounded three ways: per caller, across all callers (so rotating
  // IPs can't multiply the cost), and by the deployment's daily live-spend cap shared with engine runs.
  const ip = await rateLimit("chat", clientIp(req), 10);
  if (!ip.ok) return fail(429, "Too many requests. Try again in a minute.");
  const global = await rateLimit("chat-global", "all", 120);
  if (!global.ok) return fail(429, "Live chat is busy. Try again in a minute.");
  if (!(await checkSpend("chat")).ok) return fail(503, "Live chat is paused for today. It resumes at 00:00 UTC.");
  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const parsed = ChatSchema.safeParse(json.body);
  if (!parsed.success) return fail(422, "Invalid chat payload.", parsed.error.issues.map((i) => i.message));

  const p = provider();
  if (!p) return fail(503, "Live chat is not configured: set LLM_API_KEY.");

  try {
    const stream = await streamReply(p, parsed.data.engine as (typeof ENGINE_ORDER)[number], parsed.data.messages, parsed.data.lang, AbortSignal.any([req.signal, AbortSignal.timeout(25_000)]));
    return new Response(stream, { headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", "X-Accel-Buffering": "no" } });
  } catch (err) {
    console.error("[chat] upstream failed:", err);
    return fail(502, "The engine couldn't respond right now.");
  }
}
