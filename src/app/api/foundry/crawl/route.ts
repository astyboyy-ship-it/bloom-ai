import { z } from "zod";
import { fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { CrawlError, factsFrom, safeFetch } from "@/lib/foundry/crawl";

export const dynamic = "force-dynamic";
export const maxDuration = 20;
export const runtime = "nodejs";

export const OPTIONS = preflight;

const Body = z.object({ url: z.string().trim().min(3).max(500) });

/** Crawls one public page and returns the audit facts the Solution Foundry builds from. */
export async function POST(req: Request) {
  if (rateLimited(req, "foundry-crawl", 10)) return fail(429, "Too many crawls. Try again in a minute.");
  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const parsed = Body.safeParse(json.body);
  if (!parsed.success) return fail(422, "Send { url }.");
  try {
    const fetched = await safeFetch(parsed.data.url);
    return ok({ facts: factsFrom(fetched), truncated: fetched.truncated });
  } catch (err) {
    if (err instanceof CrawlError) return fail(422, err.message);
    const msg = err instanceof Error && err.name === "TimeoutError" ? "The site took too long to respond." : "Couldn't reach that site.";
    return fail(502, msg);
  }
}
