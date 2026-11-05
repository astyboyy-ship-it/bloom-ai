// Signs the indefinite Tier 4 Operator key for the creator: every engine, the Neural Control Plane, and the
// high-density obsidian / cyan theme. Saved to .bloom/master-operator.key (git-ignored).
//
//   npm run key:master
//
// Uses LICENSE_SIGNING_SECRET (from the shell, .env.local or .env); without it, signs a development key.
import { randomUUID } from "node:crypto";
import { BLOOM_ACCENTS, ROLE_DEFAULTS, ROLE_TIER, type UnsignedBloomPayload } from "../src/lib/licensing/types.ts";
import { issueAndSave, loadEnv, printSummary } from "./bloom-key-common.ts";

loadEnv();

const payload: UnsignedBloomPayload = {
  keyId: `op_${randomUUID()}`,
  holderName: "Eliad Krakover / Creator",
  role: "operator",
  tier: ROLE_TIER.operator,
  unlockedEngines: ["*"],
  themeConfig: { accentColor: BLOOM_ACCENTS.cyan, glassOpacity: "rgba(7, 8, 12, 0.85)", density: "high_density" },
  permissions: { ...ROLE_DEFAULTS.operator.permissions, accessNeuralControlPlane: true, accessShadowConsensus: true, accessVectorTree: true, accessFineTuner: true, canIssueKeys: true, isDemoOnly: false },
  issuedAt: new Date().toISOString(),
  expiresAt: null,
};

try {
  const { key, verified, path } = await issueAndSave(payload, ".bloom/master-operator.key");
  printSummary(verified, path, key);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
