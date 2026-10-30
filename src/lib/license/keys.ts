import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed license keys. A key is `BLOOM-<payload>.<signature>`: the payload names the tier, the licensed
 * organization and an expiry; the signature is an HMAC-SHA256 over it with LICENSE_SIGNING_SECRET, so keys can
 * be verified on any server instance without a database, and can't be forged or edited without the secret.
 *
 * Without LICENSE_SIGNING_SECRET, development uses a fixed dev secret (keys are marked `dev`), and production
 * accepts no keys at all: every workspace stays in Evaluation until the secret is set.
 *
 * Deliberately free of path aliases and Next.js imports: scripts/issue-license.mts imports this file directly.
 */

export type LicenseTier = "tier1" | "tier2" | "tier3" | "admin";
const TIERS: LicenseTier[] = ["tier1", "tier2", "tier3", "admin"];

export type LicensePayload = { t: LicenseTier; o: string; e: number | null; i: number; n: string };
export type VerifiedLicense = { tier: LicenseTier; org: string; expiresAt: string | null; issuedAt: string; dev: boolean };

const DEV_SECRET = "bloom-ai-development-license-secret";
const isProduction = () => process.env.NODE_ENV === "production" && process.env.BLOOM_DEV_LICENSES !== "true";

function secret(): { value: string; dev: boolean } | null {
  const s = process.env.LICENSE_SIGNING_SECRET?.trim();
  if (s) return { value: s, dev: false };
  return isProduction() ? null : { value: DEV_SECRET, dev: true };
}

/** Whether the tier switcher may mint keys on request: development, or explicitly enabled. */
export const devLicensesEnabled = () => !isProduction();

const b64 = (s: Buffer | string) => Buffer.from(s).toString("base64url");
const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url").slice(0, 32);

export function issueLicense(opts: { tier: LicenseTier; org: string; days?: number | null }, secretOverride?: string): string {
  const s = secretOverride ? { value: secretOverride } : secret();
  if (!s) throw new Error("LICENSE_SIGNING_SECRET is not set");
  const payload: LicensePayload = {
    t: opts.tier,
    o: opts.org.slice(0, 80),
    e: opts.days ? Math.floor(Date.now() / 86_400_000) + opts.days : null,
    i: Math.floor(Date.now() / 1000),
    n: randomBytes(4).toString("hex"),
  };
  const body = b64(JSON.stringify(payload));
  return `BLOOM-${body}.${sign(body, s.value)}`;
}

export type VerifyResult = { ok: true; license: VerifiedLicense } | { ok: false; reason: "format" | "signature" | "expired" | "unavailable" };

export function verifyLicense(key: string | null | undefined): VerifyResult {
  const m = key?.trim().match(/^BLOOM-([A-Za-z0-9_-]{10,400})\.([A-Za-z0-9_-]{32})$/);
  if (!m) return { ok: false, reason: "format" };
  const s = secret();
  if (!s) return { ok: false, reason: "unavailable" };
  const [, body, sig] = m;
  const expected = Buffer.from(sign(body, s.value));
  if (expected.length !== sig.length || !timingSafeEqual(expected, Buffer.from(sig))) return { ok: false, reason: "signature" };
  let p: LicensePayload;
  try {
    p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as LicensePayload;
  } catch {
    return { ok: false, reason: "format" };
  }
  if (!TIERS.includes(p.t) || typeof p.o !== "string") return { ok: false, reason: "format" };
  if (p.e !== null && p.e * 86_400_000 < Date.now()) return { ok: false, reason: "expired" };
  return {
    ok: true,
    license: { tier: p.t, org: p.o, expiresAt: p.e === null ? null : new Date(p.e * 86_400_000).toISOString().slice(0, 10), issuedAt: new Date(p.i * 1000).toISOString(), dev: s.dev },
  };
}
