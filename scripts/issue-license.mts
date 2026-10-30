// Mints a signed Bloom AI license key for a client.
//
//   LICENSE_SIGNING_SECRET=... npm run license:issue -- --tier tier3 --org "Acme Corp" --days 365
//
// Tiers: tier1 (CoreOps + IntentPulse), tier2 (Sovereign + Apex + CoreOps), tier3 (all eight), admin.
// Omit --days for a key that never expires. The secret must match the deployment's LICENSE_SIGNING_SECRET.
import { parseArgs } from "node:util";
import { issueLicense, type LicenseTier } from "../src/lib/license/keys.ts";

const { values } = parseArgs({ options: { tier: { type: "string" }, org: { type: "string" }, days: { type: "string" } } });
const tier = values.tier as LicenseTier | undefined;
if (!tier || !["tier1", "tier2", "tier3", "admin"].includes(tier) || !values.org) {
  console.error('Usage: npm run license:issue -- --tier <tier1|tier2|tier3|admin> --org "Client name" [--days 365]');
  process.exit(1);
}
const secret = process.env.LICENSE_SIGNING_SECRET?.trim();
if (!secret) {
  console.error("Set LICENSE_SIGNING_SECRET to the same value the deployment uses.");
  process.exit(1);
}
console.log(issueLicense({ tier, org: values.org, days: values.days ? Number(values.days) : null }, secret));
