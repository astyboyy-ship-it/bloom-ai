import { describe, expect, it } from "vitest";
import { buildBrief, usdFromCents } from "../brief";
import { verifyGapNote } from "../gap";
import { checkRelayRequest, PolicyError, REAL_BRANDS } from "../policy";
import { AgentKey, authString, RelayClient, verifyEd25519 } from "../relay-client";
import { commitMandate, eventHash, receiptHash, RECEIPT_VERSION, verifyInclusion, type RelayReceipt } from "../relay-protocol";
import { runScenario } from "../runner";
import { EXAMPLE_HASHES, ILLUSTRATIVE_RUNS, SCRIPTS } from "../scenarios";
import { isLiveProof } from "../types";
import { SIM_RELAY, simRelay } from "../sim-relay";

/** Values computed by the Bloom Exchange SDK itself (packages/sdk), so the port is checked against the original. */
const SDK = {
  seed: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
  pubkey: "A6EHv_POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg",
  sig: "4ajKqojgAKNNMTaCx9IpxO5IldTLy1eehs2twycjrg6WMKW8NdjM_dXrx1kRy_O_WaQ9cc25eDKMhbJkURzBDA",
  commitment: "47649ce34ea2bb837f9dbfd131ee62907b59983eb97e1f419d52d27b956c8fb9",
  eventHash: "e2aa80746e3429a991e567d6cadc26ed1b5270a0032a4e3a7b148a69f3f23849",
  receiptHash: "11271127e97a5028361581e3b816ee90ade11ea9940192575f4517427b1b4ef8",
  root: "c51042bb8b9d81dfc115ef99d0e2cecf1954cfc078d70032d187b46615f01b90",
  proof3: ["acaa04663a8547a2f70c60cc18f9378796b13c4f9a08f70d6adae662365b30c6", "3a066e0f40c6a1981ebfa60d2411625d0517ae22c2fc8c7c1784ff8a75c78565", "f3ab555d06a67b08ab25039fdbe2a6fcb305c83bc165492ce81d3dea13ec1fbf"],
};

describe("relay client port matches the Bloom Exchange SDK", () => {
  it("derives the same Ed25519 key and request signature", async () => {
    const k = await AgentKey.fromSeed(SDK.seed);
    expect(k.publicKey).toBe(SDK.pubkey);
    const auth = authString("POST", "/v1/rooms?x=1", "1764000000000", "11111111-2222-4333-8444-555555555555", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(await k.sign(auth)).toBe(SDK.sig);
    expect(await verifyEd25519(k.publicKey, SDK.sig, auth)).toBe(true);
    expect(await verifyEd25519(k.publicKey, SDK.sig, `${auth}x`)).toBe(false);
  });

  it("hashes mandates, events and receipts byte for byte", async () => {
    const k = await AgentKey.fromSeed(SDK.seed);
    const c = await commitMandate({ vertical: "api.inference", role: "buyer", currency: "USD", limitAtomic: "75" }, "ab".repeat(32));
    expect(c.commitment).toBe(SDK.commitment);
    const ev = await eventHash({ roomId: "rm_1", seq: 1, type: "PROPOSE", by: k.publicKey, body: { terms: { b: 2, a: [1, "x"] }, mandateCommitment: c.commitment }, at: "2026-11-21T00:00:00.000Z", prevHash: "0".repeat(64) });
    expect(ev).toBe(SDK.eventHash);
    const receipt: RelayReceipt = { version: RECEIPT_VERSION, relay: "https://bloom-exchange-relay.vercel.app", roomId: "rm_1", intentId: "in_1", vertical: "api.inference", buyer: { pubkey: k.publicKey, mandateCommitment: c.commitment }, seller: { pubkey: k.publicKey, mandateCommitment: c.commitment }, terms: { vertical: "api.inference", unitPriceAtomic: "72", currency: "USD" }, priceAtomic: "72", currency: "USD", rounds: 3, openedAt: "2026-11-21T00:00:00.000Z", acceptedAt: "2026-11-21T00:00:09.000Z", transcriptHead: ev };
    expect(await receiptHash(receipt)).toBe(SDK.receiptHash);
  });

  it("verifies an RFC 6962 inclusion proof, and rejects a wrong one", async () => {
    const leaf = "04".repeat(32);
    expect(await verifyInclusion(leaf, 3, 5, SDK.proof3, SDK.root)).toBe(true);
    expect(await verifyInclusion(leaf, 2, 5, SDK.proof3, SDK.root)).toBe(false);
    expect(await verifyInclusion("05".repeat(32), 3, 5, SDK.proof3, SDK.root)).toBe(false);
  });
});

async function play(id: keyof typeof SCRIPTS) {
  const relay = simRelay();
  const [ok, ck] = await Promise.all([AgentKey.generate(), AgentKey.generate()]);
  const client = (key: AgentKey) => new RelayClient({ baseUrl: SIM_RELAY, key, fetch: relay.fetch, beforeSend: checkRelayRequest });
  const events: string[] = [];
  const run = await runScenario(SCRIPTS[id], { owner: client(ok), counterpart: client(ck) }, { runId: "scout-test-00000000", verifierUrl: "https://verify.test", emit: (e) => events.push(e.type) });
  return { relay, run, events };
}

describe("runner on a strict simulated relay", () => {
  it("fleet-api: counters, records an authority ceiling, then clears provisional terms with a verifying receipt", async () => {
    const { relay, run, events } = await play("fleet-api");
    expect(run.moves.map((m) => `${m.type}${m.priceAtomic ? ` ${m.priceAtomic}` : ""}`)).toEqual(["PROPOSE 60", "COUNTER 80", "COUNTER 68", "COUNTER 72", "ACCEPT", "CLEAR"]);
    expect(run.outcome).toBe("CLEARED");
    expect(run.gap.note.kind).toBe("AUTHORITY_CEILING");
    expect(run.proof.kind).toBe("receipt");
    if (run.proof.kind !== "receipt") return;
    expect(run.proof.verifyUrl).toBe(`https://verify.test/r/${run.proof.receiptHash}`);
    const stored = relay.rooms.get(run.gap.note.roomId)!;
    expect(stored.room.receiptHash).toBe(run.proof.receiptHash);
    expect(run.proof.transcriptHead).toBe(stored.room.accepted!.eventHash);
    expect(await verifyGapNote(run.gap.note, run.gap.signature, stored.events)).toEqual({ signature: "pass", bound: "pass" });
    expect(events).toContain("gap");
  });

  it("gpu-render: records a knowledge gap and ends in a rejected room with only a transcript reference", async () => {
    const { relay, run } = await play("gpu-render");
    expect(run.outcome).toBe("REJECTED");
    expect(run.gap.note.kind).toBe("KNOWLEDGE_OR_POLICY_GAP");
    expect(run.proof).toMatchObject({ kind: "transcript", status: "REJECTED" });
    const stored = relay.rooms.get(run.gap.note.roomId)!;
    expect(run.proof.kind === "transcript" && run.proof.transcriptHash).toBe(stored.room.transcriptHead);
    expect(stored.room.receiptHash).toBeNull();
  });

  it("a gap note moved to another point in the transcript, or edited, fails", async () => {
    const { relay, run } = await play("fleet-api");
    const events = relay.rooms.get(run.gap.note.roomId)!.events;
    expect((await verifyGapNote({ ...run.gap.note, afterSeq: 1, transcriptHash: events[0].hash }, run.gap.signature, events)).signature).toBe("fail");
    expect((await verifyGapNote({ ...run.gap.note, kind: "KNOWLEDGE_OR_POLICY_GAP" }, run.gap.signature)).signature).toBe("fail");
  });

  it("never sends a real company name, and labels every agent and intent as sandbox", async () => {
    for (const id of ["fleet-api", "gpu-render"] as const) {
      const { relay } = await play(id);
      const sent = JSON.stringify(relay.bodies).toLowerCase();
      for (const b of REAL_BRANDS) expect(sent).not.toContain(b);
      const agents = relay.bodies.filter((x) => x.path === "/v1/agents");
      expect(agents.length).toBe(2);
      for (const a of agents) expect(String((a.body as { displayName: string }).displayName)).toMatch(/sandbox/i);
    }
  });
});

describe("sandbox policy", () => {
  it("refuses real brands, binding language and out-of-bounds requests", () => {
    const code = (path: string, body: unknown) => {
      try {
        checkRelayRequest(path, body);
        return null;
      } catch (e) {
        return e instanceof PolicyError ? e.code : "other";
      }
    };
    expect(code("/v1/agents", { displayName: "Tesla sandbox buyer", org: "x" })).toBe("real_brand");
    expect(code("/v1/agents", { displayName: "Sandbox", org: "Epic Games" })).toBe("real_brand");
    expect(code("/v1/agents", { displayName: "Sandbox agent", org: "a legally binding offer" })).toBe("binding_language");
    expect(code("/v1/agents", { displayName: "Procurement bot", org: "x" })).toBe("not_sandbox");
    expect(code("/v1/intents", { capabilityTags: ["gpu"], ttlSeconds: 60 })).toBe("not_sandbox");
    expect(code("/v1/intents", { capabilityTags: ["sandbox"], ttlSeconds: 3600 })).toBe("out_of_bounds");
    expect(code("/v1/rooms", { ttlSeconds: 300, maxRounds: 9 })).toBe("out_of_bounds");
    expect(code("/v1/rooms", { ttlSeconds: 300, maxRounds: 4, terms: { vertical: "compute.gpu", totalPriceAtomic: "100000001" } })).toBe("out_of_bounds");
    expect(code("/v1/rooms", { ttlSeconds: 300, maxRounds: 4, terms: SCRIPTS["gpu-render"].terms("360000") })).toBeNull();
  });
});

describe("illustrative feed entries", () => {
  it("carry only example proofs and example hashes, never anything live", () => {
    expect(ILLUSTRATIVE_RUNS.map((r) => r.company).sort()).toEqual(["auto", "games"]);
    for (const r of ILLUSTRATIVE_RUNS) {
      expect(r.mode).toBe("illustrative");
      expect(isLiveProof(r.proof)).toBe(false);
      expect(r.gap.signature).toBeNull();
      const hashes = [...r.moves.map((m) => m.eventHash), r.gap.note.transcriptHash, ...Object.values(r.proof).filter((v): v is string => typeof v === "string" && /^[0-9a-f]{64}$/.test(v))];
      for (const h of hashes) expect(EXAMPLE_HASHES.has(h)).toBe(true);
      expect(JSON.stringify(r).toLowerCase()).not.toMatch(new RegExp(REAL_BRANDS.join("|")));
    }
  });

  it("play out exactly as the live scripts do", () => {
    for (const r of ILLUSTRATIVE_RUNS) {
      const s = SCRIPTS[r.scenario];
      expect(r.moves.slice(0, s.moves.length).map((m) => [m.by, m.type, m.priceAtomic])).toEqual(s.moves.map((m) => [m.by, m.type, m.priceAtomic]));
      expect(r.gap.note.kind).toBe(s.gap.kind);
    }
  });
});

describe("Surprise Negotiation Brief", () => {
  it("states the gap, the proof and options inside the owner's ceiling", () => {
    const [fleet, gpu] = ILLUSTRATIVE_RUNS;
    const a = buildBrief(fleet);
    expect(a.admission.kind).toBe("AUTHORITY_CEILING");
    expect(a.happened).toMatchObject({ counters: 3, openingAtomic: "60", standingAtomic: "72", outcome: "CLEARED" });
    expect(a.decision.options).toEqual([{ id: "approve_extended", priceAtomic: "72" }, { id: "counter_lower", priceAtomic: "70" }, { id: "decline" }]);
    for (const o of a.decision.options) if ("priceAtomic" in o) expect(BigInt(o.priceAtomic) <= BigInt(fleet.ownerLimitAtomic)).toBe(true);
    const b = buildBrief(gpu);
    expect(b.decision.options.map((o) => o.id)).toEqual(["supply_policy", "reopen_at", "walk_away"]);
    expect(b.proof.kind).toBe("example-transcript");
    expect(usdFromCents("72")).toBe("$0.72");
    expect(usdFromCents("360000")).toBe("$3,600");
  });
});
