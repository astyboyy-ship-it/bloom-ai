// Shared plumbing for the BLOOM access key scripts: secret resolution, node:crypto signing, a round-trip
// self-check through the same verifier the server and middleware use, and writing the key under .bloom/.
import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ACCESS_KEY_PREFIX, DEV_SIGNING_SECRET, b64urlEncode, verifyAccessKey } from "../src/lib/licensing/codec.ts";
import type { BloomLicensePayload, UnsignedBloomPayload } from "../src/lib/licensing/types.ts";

/** Loads .env.local then .env (first one wins per variable), so the deployment secret is picked up locally. */
export function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    try {
      process.loadEnvFile(f);
    } catch {
      // A malformed env file shouldn't stop key issuance; the secret can still come from the shell.
    }
  }
}

export function resolveSecret(): { value: string; dev: boolean } {
  const s = process.env.LICENSE_SIGNING_SECRET?.trim();
  if (s) return { value: s, dev: false };
  console.warn(
    "\n  ! LICENSE_SIGNING_SECRET is not set: signing with the DEVELOPMENT secret.\n" +
      "    This key only verifies on dev servers (and deployments with BLOOM_DEV_LICENSES=true).\n" +
      "    Set LICENSE_SIGNING_SECRET to the production value and re-run for a production key.\n",
  );
  // The shared verifier must check with the same secret, even under NODE_ENV=production.
  process.env.BLOOM_DEV_LICENSES = "true";
  return { value: DEV_SIGNING_SECRET, dev: true };
}

/** HMAC-SHA256 with node:crypto. Byte-identical to the Web Crypto signer in src/lib/licensing/codec.ts. */
export function signWithNodeCrypto(payload: UnsignedBloomPayload, secret: string): string {
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${ACCESS_KEY_PREFIX}${body}.${sig}`;
}

/**
 * Signs, proves the key verifies through the production verifier, and writes it to `file` (owner-only).
 * Pass `secret` to sign a batch with one resolved secret (and one warning).
 */
export async function issueAndSave(payload: UnsignedBloomPayload, file: string, secret = resolveSecret()): Promise<{ key: string; verified: BloomLicensePayload; path: string; dev: boolean }> {
  const key = signWithNodeCrypto(payload, secret.value);
  const check = await verifyAccessKey(key);
  if (!check.ok) throw new Error(`Self-check failed: the signed key did not verify (${check.reason}).`);
  const path = resolve(file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${key}\n`, { encoding: "utf8", mode: 0o600 });
  return { key, verified: check.payload, path, dev: secret.dev };
}

export function printSummary(v: BloomLicensePayload, path: string, key: string) {
  const p = v.permissions;
  console.log(`\n  BLOOM AI // ACCESS KEY ISSUED`);
  console.log(`  holder      ${v.holderName}`);
  console.log(`  role / tier ${v.role} / ${v.tier}`);
  console.log(`  key id      ${v.keyId}`);
  console.log(`  engines     ${v.unlockedEngines.join(", ")}`);
  console.log(`  theme       ${v.themeConfig.accentColor} · ${v.themeConfig.density} · ${v.themeConfig.glassOpacity}`);
  console.log(`  control     neural=${p.accessNeuralControlPlane} consensus=${p.accessShadowConsensus} vectorTree=${p.accessVectorTree} fineTuner=${p.accessFineTuner} issue=${p.canIssueKeys}`);
  if (p.isDemoOnly) console.log(`  demo        sandbox only · referral ${p.partnerReferralId ?? "—"}`);
  console.log(`  expires     ${v.expiresAt ?? "never (lifetime)"}`);
  console.log(`  saved       ${path}`);
  console.log(`\n  Paste into Desk → Settings → License:\n\n${key}\n`);
}
