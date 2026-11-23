/**
 * The sandbox policy for everything Bloom Scout sends to the relay. The relay's agents, intents, rooms and
 * receipts are public and permanent, so this runs on every request body before it is signed (RelayClient's
 * `beforeSend`) and refuses, rather than rewrites:
 *  - real company names: the brand gate applies to the UI only, so no real name may ever be written to the relay;
 *  - binding language: a sandbox run never claims a contract, purchase order or legal commitment;
 *  - anything outside sandbox bounds: unlabeled agents or intents, long-lived rooms, too many rounds, large prices.
 */

export class PolicyError extends Error {
  constructor(
    readonly code: "real_brand" | "binding_language" | "not_sandbox" | "out_of_bounds",
    message: string,
  ) {
    super(message);
    this.name = "PolicyError";
  }
}

/** Every real brand the desk can show (pulse/companies.ts), lowercased. Kept here so the list exists in every build. */
export const REAL_BRANDS = ["tesla", "epic games", "spotify", "palantir", "shopify", "builders firstsource"] as const;

const BINDING = /\b(legally binding|binding (?:contract|agreement|commitment|offer)|signed contract|purchase order|master services agreement|guaranteed? (?:price|supply|capacity))\b/i;

export const SANDBOX_LIMITS = { ttlSeconds: 600, maxRounds: 4, maxPriceAtomic: 1_000_000n } as const;

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => (out.push(k), strings(x, out)));
  return out;
}

const price = (terms: unknown): string | undefined => {
  const t = terms as Record<string, unknown> | undefined;
  const p = t?.vertical === "api.inference" ? t.unitPriceAtomic : t?.totalPriceAtomic;
  return typeof p === "string" ? p : undefined;
};

/**
 * Text as the policy reads it: NFKC (full-width "ＴＥＳＬＡ" is "TESLA"), invisible format characters removed (soft
 * hyphens, zero-width spaces and joiners, bidi marks), lowercased, with runs of spaces, hyphens and underscores
 * collapsed to one space. `compact` also drops every non-letter, so "T-e s_l.a" is caught too; it is built per string
 * and skips key-, hash- and signature-shaped tokens, whose random letters could otherwise spell a name by chance.
 */
const TOKEN = /^[A-Za-z0-9_\-+/=:.]{32,}$/;
const fold = (s: string) => s.normalize("NFKC").replace(/\p{Cf}/gu, "").toLowerCase();

export function policyText(body: unknown): { text: string; compact: string[] } {
  const all = strings(body);
  const text = fold(all.join("\n")).replace(/[\s\-_]+/g, " ");
  const compact = all.filter((s) => !TOKEN.test(s)).map((s) => fold(s).replace(/[^\p{L}]/gu, ""));
  return { text, compact };
}

export function checkRelayRequest(path: string, body: unknown): void {
  const { text, compact } = policyText(body);
  const brand = REAL_BRANDS.find((b) => text.includes(b) || compact.some((c) => c.includes(b.replace(/[^a-z]/g, ""))));
  if (brand) throw new PolicyError("real_brand", "A real company name may not be sent to the relay: its records are public and permanent.");
  if (BINDING.test(text)) throw new PolicyError("binding_language", "Sandbox runs never state a binding commitment.");

  const b = (body ?? {}) as Record<string, unknown>;
  if (path === "/v1/agents" && !/sandbox/i.test(String(b.displayName ?? ""))) throw new PolicyError("not_sandbox", "Scout agents must be labeled as sandbox agents.");
  if (path === "/v1/intents") {
    if (!Array.isArray(b.capabilityTags) || !b.capabilityTags.includes("sandbox")) throw new PolicyError("not_sandbox", "Scout intents must carry the sandbox tag.");
    if (typeof b.ttlSeconds !== "number" || b.ttlSeconds > SANDBOX_LIMITS.ttlSeconds) throw new PolicyError("out_of_bounds", "Scout intents live at most 10 minutes.");
  }
  if (path === "/v1/rooms") {
    if (typeof b.ttlSeconds !== "number" || b.ttlSeconds > SANDBOX_LIMITS.ttlSeconds) throw new PolicyError("out_of_bounds", "Scout rooms live at most 10 minutes.");
    if (typeof b.maxRounds !== "number" || b.maxRounds > SANDBOX_LIMITS.maxRounds) throw new PolicyError("out_of_bounds", "Scout rooms allow at most 4 counters.");
  }
  for (const terms of [b.terms, b.spec]) {
    const p = price(terms);
    if (p !== undefined && (!/^\d{1,30}$/.test(p) || BigInt(p) > SANDBOX_LIMITS.maxPriceAtomic)) throw new PolicyError("out_of_bounds", "Sandbox prices stay at or below $10,000.");
  }
}
