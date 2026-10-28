import { z } from "zod";
import { apifyConfig, datasetItems, normalizeItems, type LivePlatform } from "@/lib/apify/client";
import { fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { extractBudgetK, scoreSignal, type RawSignal } from "@/lib/intentpulse/signal";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const OPTIONS = preflight;

const PLATFORM = z.enum(["instagram", "x", "tiktok", "reddit", "webhook"]);

/** Your own signals: forms, CRMs, Zapier/Make/n8n. */
const RawSignalsSchema = z.object({
  signals: z
    .array(
      z.object({
        platform: PLATFORM.default("webhook"),
        text: z.string().trim().min(1).max(4000),
        author: z
          .object({
            name: z.string().trim().max(120).default(""),
            handle: z.string().trim().max(120).default(""),
            title: z.string().trim().max(120).optional(),
            company: z.string().trim().max(120).default(""),
            verified: z.boolean().default(false),
            followers: z.number().int().min(0).default(0),
          })
          .default({ name: "", handle: "", company: "", verified: false, followers: 0 }),
        url: z.string().url().max(500).nullable().optional(),
        budgetK: z.number().min(0).max(1_000_000).nullable().optional(),
      }),
    )
    .min(1)
    .max(100),
});

/** Apify's default webhook payload for ACTOR.RUN.SUCCEEDED. */
const ApifyWebhookSchema = z.object({
  eventType: z.string(),
  resource: z.object({ defaultDatasetId: z.string().min(1) }),
});

/**
 * Ingests signals pushed to IntentPulse and returns them scored. Accepts either `{ signals: [...] }`
 * or an Apify run-succeeded webhook (`?platform=x|instagram|tiktok|reddit`), whose dataset is then
 * fetched with the server's token. Dataset reads require INTENTPULSE_WEBHOOK_SECRET to be set and sent
 * as `x-intentpulse-secret` (or `?secret=`), so the public endpoint can't be used to read your datasets.
 */
export async function POST(req: Request) {
  if (rateLimited(req, "intent-pulse-webhook", 30)) return fail(429, "Too many requests. Try again in a minute.");
  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");

  const apify = ApifyWebhookSchema.safeParse(json.body);
  if (apify.success) {
    const url = new URL(req.url);
    const secret = process.env.INTENTPULSE_WEBHOOK_SECRET;
    const given = req.headers.get("x-intentpulse-secret") ?? url.searchParams.get("secret");
    if (!secret) return fail(403, "Set INTENTPULSE_WEBHOOK_SECRET on the server to accept Apify run webhooks.");
    if (given !== secret) return fail(401, "Invalid webhook secret.");
    const { token } = apifyConfig();
    if (!token) return fail(503, "APIFY_API_TOKEN is not configured.");
    const platform = PLATFORM.exclude(["webhook"]).safeParse(url.searchParams.get("platform"));
    if (!platform.success) return fail(422, "Add ?platform=x|instagram|tiktok|reddit to the webhook URL.");

    try {
      const items = await datasetItems(apify.data.resource.defaultDatasetId, token);
      const signals = normalizeItems(platform.data as LivePlatform, items);
      return ok({ received: items.length, scored: signals.length, signals });
    } catch (err) {
      return fail(502, err instanceof Error ? err.message : "Could not read the Apify dataset.");
    }
  }

  const parsed = RawSignalsSchema.safeParse(json.body);
  if (!parsed.success) return fail(422, "Send { signals: [...] } or an Apify run webhook.", parsed.error.issues.map((i) => i.message));

  const now = Date.now();
  const signals = parsed.data.signals.map((s, i) => {
    const raw: RawSignal = {
      id: `hook-${now.toString(36)}-${i}`,
      platform: s.platform,
      kind: s.platform === "webhook" ? "webhook" : "post",
      author: s.author,
      text: s.text,
      url: s.url ?? null,
      postedAt: new Date(now).toISOString(),
      budgetK: s.budgetK ?? extractBudgetK(s.text),
      origin: "webhook",
    };
    return scoreSignal(raw);
  });
  return ok({ received: signals.length, scored: signals.length, signals });
}
