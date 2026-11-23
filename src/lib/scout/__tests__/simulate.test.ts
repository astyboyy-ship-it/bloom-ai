import { describe, expect, it, vi } from "vitest";
import { REAL_BRANDS } from "../policy";
import { simulate } from "../simulate";

/** `npm run scout:simulate`: both outcomes, every section printed, and no network at all. */
describe("scout:simulate", () => {
  it("plays both scenarios to their honest outcome and checks every proof", async () => {
    const lines: string[] = [];
    const { ok, results } = await simulate((l) => lines.push(l));
    expect(ok).toBe(true);
    expect(results.map((r) => [r.scenario, r.outcome, r.gap, r.detected])).toEqual([
      ["fleet-api", "CLEARED", "AUTHORITY_CEILING", "AUTHORITY_CEILING"],
      ["gpu-render", "REJECTED", "KNOWLEDGE_OR_POLICY_GAP", "KNOWLEDGE_OR_POLICY_GAP"],
    ]);
    for (const r of results) expect(r.gapNote).toEqual({ signature: "pass", bound: "pass" });
    expect(results[0].receipt).toEqual({ valid: true, checks: { canonicalHash: "pass", buyerSignature: "pass", sellerSignature: "pass", ledgerInclusion: "pass", notRevoked: "pass" } });
    expect(results[1].receipt).toBeNull();

    const out = lines.join("\n");
    for (const section of ["Rounds", "handoff_gap_detect (Cortex)", "Signed gap note", "Owner catch-up brief", "exchange_verify_receipt (Sovereign)"]) expect(out.split(section).length - 1).toBe(2);
    expect(out).toContain("verified: Sovereign may accept the settlement");
    expect(out).toContain("an impasse has no receipt, and none is invented");
    expect(out).toMatch(/^PASS · /m);
    for (const b of REAL_BRANDS) expect(out.toLowerCase()).not.toContain(b);
  });

  it("makes no network call, and restores fetch and BLOOM_RELAY_URL afterwards", async () => {
    const spy = vi.fn(async () => new Response("{}"));
    const prior = globalThis.fetch;
    globalThis.fetch = spy as unknown as typeof fetch;
    vi.stubEnv("BLOOM_RELAY_URL", "https://relay.example");
    try {
      await simulate(() => undefined);
      expect(spy).not.toHaveBeenCalled();
      expect(globalThis.fetch).toBe(spy);
      expect(process.env.BLOOM_RELAY_URL).toBe("https://relay.example");
    } finally {
      globalThis.fetch = prior;
      vi.unstubAllEnvs();
    }
  });
});
