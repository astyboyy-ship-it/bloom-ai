import { z } from "zod";
import type { NextResponse } from "next/server";
import { fail, ok, preflight, rateLimited, readJson } from "@/lib/demo-http";
import { devLicensesEnabled, issueLicense, verifyLicense } from "@/lib/license/keys";
import { TIER_ENGINES } from "@/lib/license/tiers";
import { ACCESS_COOKIE, ACCESS_KEY_PREFIX, verifyAccessKey } from "@/lib/licensing/codec";
import { resolveLicense } from "@/lib/licensing/server";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** Whether this deployment lets the hidden tier switcher mint development keys. */
export function GET() {
  return ok({ devLicenses: devLicensesEnabled() });
}

const Body = z.union([
  z.object({ key: z.string().trim().max(8000) }),
  // Development only: mint a key for the tier switcher.
  z.object({ dev: z.enum(["tier1", "tier2", "tier3", "admin"]), org: z.string().trim().max(80).default("Development Workspace") }),
]);

const REASONS = {
  format: "That isn't a Bloom AI license key.",
  signature: "This key wasn't issued by Bloom AI, or has been altered.",
  expired: "This license has expired. Contact Bloom AI to renew.",
  unavailable: "License activation isn't configured on this server yet.",
} as const;

/** The verified access key rides in an httpOnly cookie so the middleware can guard /desk/control-plane. */
function setAccessCookie(res: NextResponse, key: string | null, expiresAt?: string | null) {
  if (!key) {
    res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
  const until = expiresAt ? Math.floor((Date.parse(expiresAt) - Date.now()) / 1000) : 400 * 86_400;
  res.cookies.set(ACCESS_COOKIE, key, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.max(60, Math.min(until, 400 * 86_400)) });
  return res;
}

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

  // BLOOMK- access keys: role, permissions and theme travel with the key.
  if (key.startsWith(ACCESS_KEY_PREFIX)) {
    const v = await verifyAccessKey(key);
    if (!v.ok) return fail(v.reason === "unavailable" ? 503 : 400, REASONS[v.reason]);
    const r = await resolveLicense(key);
    const res = ok({ key, tier: r.tier, org: v.payload.holderName, expiresAt: v.payload.expiresAt, issuedAt: v.payload.issuedAt, dev: v.dev, engines: r.engines, access: v.payload });
    return setAccessCookie(res, key, v.payload.expiresAt);
  }

  const v = verifyLicense(key);
  if (!v.ok) return fail(v.reason === "unavailable" ? 503 : 400, REASONS[v.reason]);
  // A tier key carries no control-plane rights: clear any access cookie left by a previous key.
  return setAccessCookie(ok({ key, ...v.license, engines: TIER_ENGINES[v.license.tier], access: null }), null);
}

/** Deactivation: drops the access cookie (the key itself lives in the desk's own settings). */
export function DELETE() {
  return setAccessCookie(ok({ ok: true }), null);
}
