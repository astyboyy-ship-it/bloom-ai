import { z } from "zod";
import { fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { DEFAULT_GROQ_MODEL } from "@/lib/aware-marketing/groq";
import { buildStrategy } from "@/lib/aware-marketing/strategy";
import { groqStrategyReply } from "@/lib/aware-marketing/strategy-groq";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const StrategySchema = z.object({
  /** Everything the user has told the agent so far, newest last. */
  messages: z.array(z.string().trim().min(1).max(1000)).min(1).max(12),
});

export const OPTIONS = preflight;

/** The onboarding agent: turns a handle, niche or product into a Master Strategy Roadmap. */
export async function POST(req: Request) {
  if (rateLimited(req, "aware-marketing-strategy", 20)) return fail(429, "Too many requests. Try again in a minute.");
  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const parsed = StrategySchema.safeParse(json.body);
  if (!parsed.success) return fail(422, "Invalid strategy payload.", parsed.error.issues.map((i) => i.message));

  const conversation = parsed.data.messages.join("\n");
  const plan = buildStrategy(conversation);

  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
    try {
      const written = await groqStrategyReply(conversation, plan, apiKey, model);
      return ok({ ...plan, ...written, source: "groq", model });
    } catch (err) {
      console.error("[aware-marketing/strategy] Groq failed, using planner copy:", err);
    }
  }
  return ok(plan);
}
