import { afterEach, describe, expect, it, vi } from "vitest";
import { exchangeCommitTerms, makeVerifyReceiptTool } from "@/lib/engines/tools/exchange";
import { detectGaps, exchangePayloadPolicy } from "@/lib/engines/tools/scout";
import { checkRelayRequest, PolicyError } from "@/lib/scout/policy";
import { AgentKey, RelayClient, toB64url } from "@/lib/scout/relay-client";
import { verifyReceiptPayload, type ReceiptPayload } from "@/lib/scout/relay-protocol";
import { runScenario } from "@/lib/scout/runner";
import { SCRIPTS } from "@/lib/scout/scenarios";
import { SIM_RELAY, simRelay } from "@/lib/scout/sim-relay";

/** Adversarial and edge cases for Bloom Scout and the Bloom Exchange engine tools. Each block names what it defends. */

async function cleared() {
  const sim = simRelay();
  const client = async () => new RelayClient({ baseUrl: SIM_RELAY, key: await AgentKey.generate(), fetch: sim.fetch, beforeSend: checkRelayRequest });
  const run = await runScenario(SCRIPTS["fleet-api"], { owner: await client(), counterpart: await client() }, { runId: "redteam", verifierUrl: "https://v.test" });
  if (run.proof.kind !== "receipt") throw new Error("expected a receipt");
  const payload = await (await client()).getReceipt(run.proof.receiptHash);
  return { sim, run, hash: run.proof.receiptHash, payload };
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const code = (path: string, body: unknown) => {
  try {
    checkRelayRequest(path, body);
    return null;
  } catch (e) {
    return e instanceof PolicyError ? e.code : "other";
  }
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("handoff_gap_detect: gaps are caught, not evaded", () => {
  it.each([
    ["I can’t commit to that.", "AUTHORITY_CEILING"],
    ["I don’t have a pricing policy for that.", "KNOWLEDGE_OR_POLICY_GAP"],
    ["Let me run this by legal.", "AUTHORITY_CEILING"],
    ["That's above my pay grade.", "AUTHORITY_CEILING"],
    ["I'm not the right person to approve this.", "AUTHORITY_CEILING"],
    ["Pricing is set by headquarters.", "AUTHORITY_CEILING"],
    ["I don't know how to price this.", "KNOWLEDGE_OR_POLICY_GAP"],
    ["Honestly, I'd be guessing.", "KNOWLEDGE_OR_POLICY_GAP"],
  ])("%s → %s", (text, kind) => {
    expect(detectGaps(text)[0]?.kind).toBe(kind);
  });

  it.each(["I am authorized to commit to this.", "We can do $0.72 for 12 months.", "The price is too high this quarter."])("no false gap: %s", (text) => {
    expect(detectGaps(text)).toEqual([]);
  });

  it("finds a gap buried in a long, mixed message, with the exact sentence quoted", () => {
    const text = "Thanks for the call. Volume looks fine. Anything past 30 days needs my manager's approval. Talk soon!";
    expect(detectGaps(text)).toEqual([{ kind: "AUTHORITY_CEILING", quote: "Anything past 30 days needs my manager's approval.", missing: "Sign-off from the counterpart's owner" }]);
  });
});

describe("exchange_payload_policy: evasion is refused, refusals reveal nothing", () => {
  it.each([
    ["soft hyphen", "Tes­la procurement"],
    ["zero-width space", "Te​sla"],
    ["full-width letters", "ＴＥＳＬＡ"],
    ["spaced letters", "T e s l a"],
    ["punctuated", "Epic-Games"],
    ["case", "SPOTIFY sandbox"],
  ])("real brand via %s is refused", (_how, org) => {
    expect(code("/v1/agents", { displayName: "Sandbox agent", org })).toBe("real_brand");
  });

  it.each(["legally-binding offer", "binding  contract", "a Binding\nAgreement", "purchase-order 42"])("binding language is refused: %j", (org) => {
    expect(code("/v1/agents", { displayName: "Sandbox agent", org })).toBe("binding_language");
  });

  it("does not misfire on random key and signature material", async () => {
    for (let i = 0; i < 200; i++) {
      const token = toB64url(crypto.getRandomValues(new Uint8Array(64)));
      expect(code("/v1/rooms/events", { type: "CLEAR", signatures: { buyer: token, seller: token } })).toBeNull();
    }
  });

  it("refusal messages are fixed text: they never echo the payload or a number from it", async () => {
    const probes = [{ displayName: "Sandbox agent", org: "Tesla floor is $70" }, { displayName: "Sandbox agent", org: "binding contract at 0.7499" }];
    for (const payload of probes) {
      const out = (await exchangePayloadPolicy.execute({ path: "/v1/agents", payload })) as { ok: true; output: { allowed: boolean; message: string } };
      expect(out.output.allowed).toBe(false);
      expect(out.output.message).not.toMatch(/\d|tesla|floor/i);
    }
  });

  it("a full run never sends a mandate limit, salt or opening to the relay", async () => {
    const { sim } = await cleared();
    const sent = JSON.stringify(sim.bodies);
    for (const secret of ["limitAtomic", "salt", "opening", "ownerLimit", "counterpartFloor"]) expect(sent).not.toContain(secret);
    // Only prices the clamp allowed were offered: never above the buyer's sealed 75 or below the seller's 70.
    for (const b of sim.bodies) {
      const t = (b.body as { terms?: { unitPriceAtomic?: string } }).terms;
      if (t?.unitPriceAtomic) expect(Number(t.unitPriceAtomic)).toBeGreaterThanOrEqual(60);
    }
  });
});

describe("exchange_commit_terms: ambiguous limits never loosen the mandate", () => {
  const run = async (input: unknown) => (await exchangeCommitTerms.execute(input)) as { ok: boolean; output?: { clampedUsd: number; sealedLimitUsd: number; clamped: boolean }; error?: string };

  it("fractions of a cent round toward safety", async () => {
    expect((await run({ role: "buyer", limitUsd: 0.755, proposedUsd: 0.9 })).output).toMatchObject({ sealedLimitUsd: 0.75, clampedUsd: 0.75, clamped: true });
    expect((await run({ role: "seller", limitUsd: 0.755, proposedUsd: 0.1 })).output).toMatchObject({ sealedLimitUsd: 0.76, clampedUsd: 0.76, clamped: true });
    expect((await run({ role: "buyer", limitUsd: 0.29, proposedUsd: 0.29 })).output).toMatchObject({ sealedLimitUsd: 0.29, clamped: false });
  });

  it.each([
    ["zero limit", { role: "buyer", limitUsd: 0, proposedUsd: 1 }],
    ["negative proposal", { role: "seller", limitUsd: 1, proposedUsd: -5 }],
    ["unbounded limit", { role: "buyer", limitUsd: Number.POSITIVE_INFINITY, proposedUsd: 1 }],
    ["not a number", { role: "buyer", limitUsd: Number.NaN, proposedUsd: 1 }],
    ["above the cap", { role: "seller", limitUsd: 20_000_000, proposedUsd: 1 }],
    ["unknown role", { role: "broker", limitUsd: 1, proposedUsd: 1 }],
    ["sub-cent limit", { role: "buyer", limitUsd: 0.004, proposedUsd: 1 }],
  ])("refuses %s instead of committing", async (_why, input) => {
    expect((await run(input)).ok).toBe(false);
  });
});

describe("exchange_verify_receipt: tampering, substitution and replay fail", () => {
  it("the untouched receipt verifies", async () => {
    const { payload, hash } = await cleared();
    expect((await verifyReceiptPayload(payload, hash)).valid).toBe(true);
  });

  it.each<[string, (p: ReceiptPayload) => void]>([
    ["a changed price", (p) => void (p.receipt.priceAtomic = "60")],
    ["changed terms", (p) => void (p.receipt.terms = { ...p.receipt.terms, unitPriceAtomic: "60" })],
    ["swapped signatures", (p) => void (p.signatures = { buyer: p.signatures.seller, seller: p.signatures.buyer })],
    ["a forged buyer key", (p) => void (p.receipt.buyer.pubkey = p.receipt.seller.pubkey)],
    ["a wrong ledger root", (p) => void (p.ledger.root = "0".repeat(64))],
    ["a wrong leaf index", (p) => void (p.ledger.leafIndex = p.ledger.leafIndex + 1)],
    ["a revoked flag", (p) => void (p.revoked = true)],
  ])("%s fails", async (_what, mutate) => {
    const { payload, hash } = await cleared();
    const p = clone(payload);
    mutate(p);
    expect((await verifyReceiptPayload(p, hash)).valid).toBe(false);
  });

  it("a different, validly signed receipt returned for the requested hash fails (substitution)", async () => {
    const a = await cleared();
    const b = await cleared();
    expect((await verifyReceiptPayload(b.payload)).valid).toBe(true); // b is genuine on its own
    expect((await verifyReceiptPayload(b.payload, a.hash)).valid).toBe(false); // but not as the answer for a

    vi.stubEnv("BLOOM_RELAY_URL", SIM_RELAY);
    const swap: typeof fetch = async (u, init) => b.sim.fetch(String(u).replace(a.hash, b.hash), init);
    const out = (await makeVerifyReceiptTool(swap).execute({ receiptHash: a.hash })) as { output: { valid: boolean; status: string } };
    expect(out.output).toMatchObject({ valid: false, status: "mismatch" });
  });

  it("a receipt from one room cannot be replayed as another room's settlement", async () => {
    const a = await cleared();
    const b = await cleared();
    expect(a.hash).not.toBe(b.hash);
    expect((await verifyReceiptPayload({ ...clone(a.payload), receipt: clone(b.payload.receipt) }, a.hash)).valid).toBe(false);
  });

  it("a relay URL that isn't plain https is ignored, not trusted", async () => {
    vi.stubEnv("BLOOM_RELAY_URL", "http://evil.example");
    const seen: string[] = [];
    const spy: typeof fetch = async (u) => (seen.push(String(u)), new Response("{}", { status: 404 }));
    await makeVerifyReceiptTool(spy).execute({ receiptHash: "ab".repeat(32) });
    expect(seen[0]).toMatch(/^https:\/\/bloom-exchange-relay\.vercel\.app\//);
  });
});

describe("Shield refusal audit logging", () => {
  it("writes one security entry, chained, with the reason and no payload", async () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0 };
    vi.stubGlobal("window", { localStorage: storage, sessionStorage: storage, addEventListener: () => undefined, removeEventListener: () => undefined });
    vi.resetModules();
    const { auditPolicyRefusal, verifyAudit } = await import("@/components/desk/settings");
    auditPolicyRefusal("a shield run", "real_brand", "A real company name may not be sent to the relay: its records are public and permanent.");
    const s = JSON.parse(store.get("bloom-desk-settings")!) as { audit: { kind: string; message: string }[] };
    const entry = s.audit.at(-1)!;
    expect(entry.kind).toBe("security");
    expect(entry.message).toMatch(/^Shield refused a Bloom Exchange payload in a shield run \(real_brand\): .* Nothing was sent to the relay\.$/);
    expect(verifyAudit(s.audit as never).ok).toBe(true);
  });
});
