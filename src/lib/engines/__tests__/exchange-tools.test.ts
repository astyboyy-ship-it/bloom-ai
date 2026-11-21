import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentKey, RelayClient } from "@/lib/scout/relay-client";
import { commitMandate } from "@/lib/scout/relay-protocol";
import { checkRelayRequest } from "@/lib/scout/policy";
import { runScenario } from "@/lib/scout/runner";
import { EXAMPLE_HASHES, SCRIPTS } from "@/lib/scout/scenarios";
import { FAKE_RELAY, fakeRelay } from "@/lib/scout/__tests__/fake-relay";
import { AGENTS } from "../index";
import type { EngineAgent, SimulationKit } from "../types";
import { exchangeCommitTerms, makeVerifyReceiptTool } from "../tools/exchange";
import { detectGaps, exchangePayloadPolicy, handoffGapDetect } from "../tools/scout";

/** Runs a tool through its validating `execute`, the way the orchestrator does, and returns its output. */
async function run(tool: { execute: (raw: unknown) => Promise<{ ok: boolean; output?: unknown; error?: string }> }, input: unknown) {
  const r = await tool.execute(input);
  if (!r.ok) throw new Error(r.error);
  return r.output as Record<string, unknown>;
}

/** A simulation kit that runs the engine's own tools, records which ran, and delegates nowhere. */
function kitFor(agent: EngineAgent): SimulationKit & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    call: async (name, input) => {
      calls.push(name);
      const t = agent.tools.find((x) => x.name === name);
      if (!t) throw new Error(`${agent.key} has no tool ${name}`);
      const r = await t.execute(input);
      if (!r.ok) throw new Error(r.error);
      return r.output;
    },
    delegate: async () => null,
    think: async () => undefined,
  };
}

/** A real cleared receipt, produced by a full sandbox run on the strict fake relay. */
async function clearedReceipt() {
  const relay = fakeRelay();
  const client = async () => new RelayClient({ baseUrl: FAKE_RELAY, key: await AgentKey.generate(), fetch: relay.fetch, beforeSend: checkRelayRequest });
  const run = await runScenario(SCRIPTS["fleet-api"], { owner: await client(), counterpart: await client() }, { runId: "scout-tools-00000000", verifierUrl: "https://verify.test" });
  if (run.proof.kind !== "receipt") throw new Error("expected a receipt");
  return { relay, hash: run.proof.receiptHash };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("exchange_verify_receipt (Sovereign)", () => {
  it("verifies a cleared receipt: hash, both signatures, ledger inclusion, not revoked", async () => {
    const { relay, hash } = await clearedReceipt();
    vi.stubEnv("BLOOM_RELAY_URL", FAKE_RELAY);
    vi.stubEnv("BLOOM_VERIFIER_URL", "https://verify.test");
    const out = await run(makeVerifyReceiptTool(relay.fetch), { receiptHash: hash });
    expect(out).toMatchObject({ valid: true, status: "verified", verifyUrl: `https://verify.test/r/${hash}` });
    expect(out.checks).toEqual({ canonicalHash: "pass", buyerSignature: "pass", sellerSignature: "pass", ledgerInclusion: "pass", notRevoked: "pass" });
  });

  it("reports an unknown hash as not found, and never looks up an example hash", async () => {
    const { relay } = await clearedReceipt();
    vi.stubEnv("BLOOM_RELAY_URL", FAKE_RELAY);
    expect(await run(makeVerifyReceiptTool(relay.fetch), { receiptHash: "ab".repeat(32) })).toMatchObject({ valid: false, status: "not_found" });
    const spy = vi.fn(relay.fetch);
    const example = [...EXAMPLE_HASHES][0];
    expect(await run(makeVerifyReceiptTool(spy as typeof fetch), { receiptHash: example })).toMatchObject({ valid: false, status: "example" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses malformed input before running", async () => {
    expect((await makeVerifyReceiptTool().execute({ receiptHash: "not-a-hash" })).ok).toBe(false);
  });

  it("Sovereign accepts a settlement only on a verified receipt, and holds an unverifiable one", async () => {
    const { relay, hash } = await clearedReceipt();
    vi.stubEnv("BLOOM_RELAY_URL", FAKE_RELAY);
    vi.stubGlobal("fetch", relay.fetch);
    const ok = (await AGENTS.sovereign.simulate({ command: `Accept the API settlement ${hash}`, params: {} }, kitFor(AGENTS.sovereign))) as { governance: { decision: string; rule: string }[] };
    expect(ok.governance.find((g) => g.rule.startsWith("Receipt verified"))?.decision).toBe("approve");
    const held = (await AGENTS.sovereign.simulate({ command: "Accept the settlement", params: { receiptHash: "cd".repeat(32) } }, kitFor(AGENTS.sovereign))) as { governance: { decision: string }[]; actions: { owner: string }[] };
    expect(held.governance.at(-1)?.decision).toBe("hold");
  });

  it("makes no relay call when no receipt is named", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const kit = kitFor(AGENTS.sovereign);
    await AGENTS.sovereign.simulate({ command: "Route the outbound push", params: {} }, kit);
    expect(kit.calls).not.toContain("exchange_verify_receipt");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("exchange_commit_terms (Aether)", () => {
  it("clamps a seller up to its floor and a buyer down to its ceiling", async () => {
    expect(await run(exchangeCommitTerms, { role: "seller", limitUsd: 900, proposedUsd: 850 })).toMatchObject({ clampedUsd: 900, clamped: true });
    expect(await run(exchangeCommitTerms, { role: "seller", limitUsd: 900, proposedUsd: 950 })).toMatchObject({ clampedUsd: 950, clamped: false });
    expect(await run(exchangeCommitTerms, { role: "buyer", limitUsd: 0.75, proposedUsd: 0.8 })).toMatchObject({ clampedUsd: 0.75, clamped: true });
  });

  it("produces the relay's own bloom-mandate/1 commitment, which its opening reproduces", async () => {
    const out = (await run(exchangeCommitTerms, { role: "seller", limitUsd: 1_080, proposedUsd: 1_200, vertical: "compute.gpu" })) as { commitment: string; opening: { mandate: { vertical: string; role: "seller"; currency: string; limitAtomic: string }; salt: string } };
    expect(out.opening.mandate).toEqual({ vertical: "compute.gpu", role: "seller", currency: "USD", limitAtomic: "108000" });
    expect((await commitMandate(out.opening.mandate, out.opening.salt)).commitment).toBe(out.commitment);
  });

  it("Aether's simulation seals its floor and reports the commitment as a guardrail", async () => {
    const kit = kitFor(AGENTS.aether);
    const out = (await AGENTS.aether.simulate({ command: "Price the new tier at $1,200", params: {} }, kit)) as { guardrails: { rule: string; value: string }[] };
    expect(kit.calls).toContain("exchange_commit_terms");
    expect(out.guardrails.some((g) => g.rule.startsWith("Sealed floor commitment") && /^[0-9a-f]{16}…$/.test(g.value))).toBe(true);
    expect(AGENTS.aether.output.safeParse({ ...out }).success).toBe(true);
  });
});

describe("handoff_gap_detect (Cortex)", () => {
  it("finds authority ceilings and knowledge or policy gaps, and nothing in plain objections", () => {
    expect(detectGaps("I'm not authorized to commit past 12 months.")[0]?.kind).toBe("AUTHORITY_CEILING");
    expect(detectGaps("That needs my manager's sign-off.")[0]?.kind).toBe("AUTHORITY_CEILING");
    expect(detectGaps("Anything above my approval limit has to wait.")[0]?.kind).toBe("AUTHORITY_CEILING");
    expect(detectGaps("We don't have a pricing policy for multi-region burst.")[0]?.kind).toBe("KNOWLEDGE_OR_POLICY_GAP");
    expect(detectGaps("Honestly I'd be guessing at a number.")[0]?.kind).toBe("KNOWLEDGE_OR_POLICY_GAP");
    expect(detectGaps("The price is too high and the timing is bad.")).toEqual([]);
  });

  it("is deterministic and quotes the sentence that admitted the gap", async () => {
    const text = "Thanks for the offer. I can't commit to a 3-year term. Let's talk Friday.";
    const a = await run(handoffGapDetect, { text });
    expect(a).toEqual(await run(handoffGapDetect, { text }));
    expect(a).toMatchObject({ handoff: true, kind: "AUTHORITY_CEILING", gaps: [{ quote: "I can't commit to a 3-year term." }] });
  });

  it("Cortex hands the open point to a human instead of treating it as a commitment", async () => {
    const kit = kitFor(AGENTS.cortex);
    const out = (await AGENTS.cortex.simulate({ command: "Buyer says: the price is high. I don't have a margin policy for this volume.", params: {} }, kit)) as { handoff: { kind: string } | null; actions: { owner: string; priority: string; title: string }[] };
    expect(kit.calls).toContain("handoff_gap_detect");
    expect(out.handoff?.kind).toBe("KNOWLEDGE_OR_POLICY_GAP");
    expect(out.actions[0]).toMatchObject({ owner: "human", priority: "p0", title: "Decide the point the counterpart can't close" });
    expect(AGENTS.cortex.output.safeParse(out).success).toBe(true);
    const plain = (await AGENTS.cortex.simulate({ command: "The price is too high for this quarter.", params: {} }, kitFor(AGENTS.cortex))) as { handoff: unknown };
    expect(plain.handoff).toBeNull();
  });
});

describe("exchange_payload_policy (Shield)", () => {
  it("refuses real company names and binding language, and allows a clean sandbox payload", async () => {
    expect(await run(exchangePayloadPolicy, { path: "/v1/agents", payload: { displayName: "Sandbox agent", org: "Tesla procurement" } })).toMatchObject({ allowed: false, code: "real_brand" });
    expect(await run(exchangePayloadPolicy, { path: "/v1/agents", payload: { displayName: "Sandbox agent", org: "a binding contract" } })).toMatchObject({ allowed: false, code: "binding_language" });
    expect(await run(exchangePayloadPolicy, { path: "/v1/agents", payload: { displayName: "Renewal sandbox agent", org: "Bloom sandbox" } })).toMatchObject({ allowed: true });
  });

  it("Shield turns a refused payload into a human action and runs no check when none is supplied", async () => {
    const kit = kitFor(AGENTS.shield);
    const out = (await AGENTS.shield.simulate({ command: "Renewal offers", params: { relayPayload: { path: "/v1/agents", payload: { displayName: "Sandbox", org: "Epic Games" } } } }, kit)) as { actions: { title: string; owner: string }[] };
    expect(out.actions[0]).toMatchObject({ title: "Rework the Bloom Exchange payload before sending", owner: "human" });
    const quiet = kitFor(AGENTS.shield);
    await AGENTS.shield.simulate({ command: "Renewal offers", params: {} }, quiet);
    expect(quiet.calls).not.toContain("exchange_payload_policy");
  });
});
