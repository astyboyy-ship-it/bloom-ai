// Signs a Tier 5 Demo Partner key for a sales partner: locked to the Demo Engine sandbox (no real engine runs),
// with the partner's referral ID embedded so every "Provision Production Key" request is attributed.
// Saved to .bloom/demo-partner.key (git-ignored).
//
//   npm run key:demo -- --partner "Northwind Advisory" --referral NW-2026-014 [--days 90] [--accent pink|cyan|emerald|amber]
//
// Uses LICENSE_SIGNING_SECRET (from the shell, .env.local or .env); without it, signs a development key.
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { BLOOM_ACCENTS, DEMO_ENGINE_ID, ROLE_DEFAULTS, ROLE_TIER, type UnsignedBloomPayload } from "../src/lib/licensing/types.ts";
import { issueAndSave, loadEnv, printSummary } from "./bloom-key-common.ts";

loadEnv();

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { partner: { type: "string" }, referral: { type: "string" }, days: { type: "string" }, accent: { type: "string" }, out: { type: "string" } },
});
const partner = (values.partner ?? positionals[0])?.trim();
const referral = (values.referral ?? positionals[1])?.trim();
const days = values.days ? Number(values.days) : 90;
const accent = (values.accent ?? "pink") as keyof typeof BLOOM_ACCENTS;

if (!partner || !referral || !/^[A-Za-z0-9._-]{2,64}$/.test(referral) || !Number.isFinite(days) || days <= 0 || !(accent in BLOOM_ACCENTS)) {
  console.error('Usage: npm run key:demo -- --partner "Partner name" --referral REF-ID [--days 90] [--accent pink|cyan|emerald|amber]');
  console.error("       The referral ID may use letters, digits, '.', '_' and '-' (2–64 characters).");
  process.exit(1);
}

const payload: UnsignedBloomPayload = {
  keyId: `demo_${randomUUID()}`,
  holderName: partner.slice(0, 120),
  role: "demo_partner",
  tier: ROLE_TIER.demo_partner,
  unlockedEngines: [DEMO_ENGINE_ID],
  themeConfig: { ...ROLE_DEFAULTS.demo_partner.theme, accentColor: BLOOM_ACCENTS[accent] },
  permissions: { ...ROLE_DEFAULTS.demo_partner.permissions, isDemoOnly: true, partnerReferralId: referral },
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + days * 86_400_000).toISOString(),
};

try {
  const { key, verified, path } = await issueAndSave(payload, values.out ?? ".bloom/demo-partner.key");
  printSummary(verified, path, key);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
