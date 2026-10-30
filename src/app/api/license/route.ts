import { z } from "zod";
import { fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { devLicensesEnabled, issueLicense, verifyLicense } from "@/lib/license/keys";
import { TIER_ENGINES } from "@/lib/license/tiers";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** Whether this deployment lets the hidden tier switcher mint development keys. */
export function GET() {
  return ok({ devLicenses: devLicensesEnabled() });
}

const Body = z.union([
  z.object({ key: z.string().trim().max(600) }),
  // Development only: mint a key for the tier switcher.
  z.object({ dev: z.enum(["tier1", "tier2", "tier3", "admin"]), org: z.string().trim().max(80).default("Development Workspace") }),
]);

const REASONS = {
  format: "That isn't a Bloom AI license key.",
  signature: "This key wasn't issued by Bloom AI, or has been altered.",
  expired: "This license has expired. Contact Bloom AI to renew.",
  unavailable: "License activation isn't configured on this server yet.",
} as const;

/** Validates a license key (or, in development, issues one) and reports the tier and engines it unlocks. */
export async function POST(req: Request) {
  if (rateLimited(req, "license", 20)) return fail(429, "Too many attempts. Try again in a minute.");
  const json = await readJson(req);
  if (!json.ok) return fail(400, "Request body must be valid JSON.");
  const body = Body.safeParse(json.body);
  if (!body.success) return fail(422, "Invalid license request.");

  let key: string;
  if ("dev" in body.data) {
    if (!devLicensesEnabled()) return fail(403, "Development licenses are disabled on this deployment.");
    key = issueLicense({ tier: body.data.dev, org: body.data.org, days: 30 });
  } else key = body.data.key;

  const v = verifyLicense(key);
  if (!v.ok) return fail(v.reason === "unavailable" ? 503 : 400, REASONS[v.reason]);
  return ok({ key, ...v.license, engines: TIER_ENGINES[v.license.tier] });
}
