import { fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { DEFAULT_GROQ_MODEL, groqOutreach } from "@/lib/intentpulse/groq";
import { dispatchMeta, newDispatchId, templateMessage, type DispatchResult } from "@/lib/intentpulse/outreach";
import { DispatchSchema } from "@/lib/intentpulse/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export const OPTIONS = preflight;

/** Acts on a scored lead: drafts outreach, dispatches a VIP booking, or quarantines the signal. */
export async function POST(req: Request) {
  if (rateLimited(req, "intent-pulse-dispatch", 30)) return fail(429, "Too many requests. Try again in a minute.");

  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const parsed = DispatchSchema.safeParse(json.body);
  if (!parsed.success) return fail(422, "Invalid dispatch payload.", parsed.error.issues.map((i) => i.message));

  const { action, lead, tier, persona, channel } = parsed.data;
  const startedAt = Date.now();
  const meta = dispatchMeta(action);
  const base = { action, dispatchId: newDispatchId(), ...meta };

  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  let notice: string | undefined;

  if (action !== "quarantine" && apiKey) {
    try {
      const message = await groqOutreach({ lead, tier, channel, vip: action === "vip" }, apiKey, model);
      return ok({ ...base, message, source: "groq", model, latencyMs: Date.now() - startedAt } satisfies DispatchResult);
    } catch (err) {
      console.error("[intent-pulse/dispatch] Groq failed, using template:", err);
      notice = "Groq drafting failed for this dispatch; used the template copy.";
    }
  } else if (action !== "quarantine") {
    notice = "GROQ_API_KEY is not configured; used the template copy.";
  }

  return ok({
    ...base,
    message: templateMessage(action, lead, tier, persona, channel),
    source: "template",
    model: null,
    notice,
    latencyMs: Date.now() - startedAt,
  } satisfies DispatchResult);
}
