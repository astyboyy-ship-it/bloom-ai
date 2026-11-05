// Signs the full BLOOM access key suite in one pass: every tier plus the domain-specific demo keys, written to
// git-ignored .bloom/. Each key is signed with node:crypto and self-checked through the production verifier.
//
//   npm run key:all
//
// Uses LICENSE_SIGNING_SECRET (from the shell, .env.local or .env); without it, every key is a development key.
import { randomUUID } from "node:crypto";
import { relative } from "node:path";
import { BLOOM_ACCENTS, DEMO_ENGINE_ID, ROLE_DEFAULTS, ROLE_TIER, type DemoArchitecture, type KeyRole, type UnsignedBloomPayload } from "../src/lib/licensing/types.ts";
import { issueAndSave, loadEnv, resolveSecret } from "./bloom-key-common.ts";

loadEnv();

type Spec = {
  label: string;
  role: KeyRole;
  holder: string;
  accent: string;
  engines: string[];
  file: string;
  /** Days until expiry; null = lifetime. */
  days: number | null;
  referral?: string;
  demoTarget?: DemoArchitecture;
};

const DEMO_DAYS = 90;

const SUITE: Spec[] = [
  { label: "Super Operator", role: "operator", holder: "Eliad Krakover / Creator", accent: BLOOM_ACCENTS.cyan, engines: ["*"], file: ".bloom/master-operator.key", days: null },
  { label: "Agency", role: "agency", holder: "BLOOM Agency Operations", accent: BLOOM_ACCENTS.emerald, engines: ["sovereign", "apex", "coreops", "cortex"], file: ".bloom/agency.key", days: 365 },
  { label: "Enterprise", role: "enterprise", holder: "Enterprise Infrastructure Node", accent: BLOOM_ACCENTS.amber, engines: ["sovereign", "apex", "vanguard", "shield"], file: ".bloom/enterprise.key", days: 365 },
  { label: "Evaluation", role: "eval", holder: "Eval User", accent: BLOOM_ACCENTS.emerald, engines: ["sovereign"], file: ".bloom/eval.key", days: 30 },
  { label: "Demo Partner (General)", role: "demo_partner", holder: "Demo Partner / General", accent: BLOOM_ACCENTS.pink, engines: [DEMO_ENGINE_ID], file: ".bloom/demo-partner-general.key", days: DEMO_DAYS, referral: "REF-DEMO-2026" },
  { label: "Demo · Music Production & Audio Ops", role: "demo_partner", holder: "Demo Partner / Music Production & Audio Ops", accent: BLOOM_ACCENTS.pink, engines: [DEMO_ENGINE_ID], file: ".bloom/demo-music.key", days: DEMO_DAYS, referral: "REF-DEMO-MUSIC-2026", demoTarget: "music" },
  { label: "Demo · Apex Quantitative Trading", role: "demo_partner", holder: "Demo Partner / Apex Quantitative Trading", accent: BLOOM_ACCENTS.amber, engines: [DEMO_ENGINE_ID], file: ".bloom/demo-trading.key", days: DEMO_DAYS, referral: "REF-DEMO-TRADING-2026", demoTarget: "trading" },
  { label: "Demo · CoreOps Enterprise", role: "demo_partner", holder: "Demo Partner / CoreOps Enterprise", accent: BLOOM_ACCENTS.cyan, engines: [DEMO_ENGINE_ID], file: ".bloom/demo-coreops.key", days: DEMO_DAYS, referral: "REF-DEMO-COREOPS-2026", demoTarget: "coreops" },
];

const ACCENT_NAME = Object.fromEntries(Object.entries(BLOOM_ACCENTS).map(([name, hex]) => [hex, name]));

function payloadFor(s: Spec, now: Date): UnsignedBloomPayload {
  const base = ROLE_DEFAULTS[s.role];
  return {
    keyId: `${s.role === "demo_partner" ? "demo" : s.role === "operator" ? "op" : s.role}_${randomUUID()}`,
    holderName: s.holder,
    role: s.role,
    tier: ROLE_TIER[s.role],
    unlockedEngines: s.engines,
    themeConfig: { ...base.theme, accentColor: s.accent },
    permissions: {
      ...base.permissions,
      ...(s.referral && { partnerReferralId: s.referral }),
      ...(s.demoTarget && { demoTarget: s.demoTarget }),
    },
    issuedAt: now.toISOString(),
    expiresAt: s.days === null ? null : new Date(now.getTime() + s.days * 86_400_000).toISOString(),
  };
}

const secret = resolveSecret();
const now = new Date();
const rows: string[][] = [];
let failed = 0;

for (const s of SUITE) {
  try {
    const { verified, path } = await issueAndSave(payloadFor(s, now), s.file, secret);
    const engines = verified.permissions.isDemoOnly ? `sandbox${verified.permissions.demoTarget ? `:${verified.permissions.demoTarget}` : ""}` : verified.unlockedEngines.join(",");
    rows.push([
      s.label,
      `T${verified.tier} ${verified.role}`,
      `${verified.themeConfig.accentColor} ${ACCENT_NAME[verified.themeConfig.accentColor] ?? ""}`.trim(),
      engines,
      verified.permissions.partnerReferralId ?? "—",
      verified.expiresAt ? verified.expiresAt.slice(0, 10) : "lifetime",
      relative(process.cwd(), path).replace(/\\/g, "/"),
    ]);
  } catch (e) {
    failed++;
    rows.push([s.label, s.role, "—", "—", "—", "FAILED", e instanceof Error ? e.message : String(e)]);
  }
}

const head = ["Key", "Tier", "Accent", "Engines", "Referral", "Expires", "File"];
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (cells: string[]) => `  ${cells.map((c, i) => c.padEnd(widths[i])).join("  ")}`;
const rule = `  ${widths.map((w) => "─".repeat(w)).join("  ")}`;

console.log(`\n  BLOOM AI // ACCESS KEY SUITE   signed with ${secret.dev ? "DEVELOPMENT secret (dev servers only)" : "LICENSE_SIGNING_SECRET (production)"}\n`);
console.log(line(head));
console.log(rule);
rows.forEach((r) => console.log(line(r)));
console.log(rule);
console.log(`  ${rows.length - failed}/${SUITE.length} keys signed and verified. Paste a key into Desk → Settings → License.\n`);
if (failed) process.exit(1);
