import { briefSections, counterpartName } from "@/components/scout/brief-text";
import { SCOUT_COPY } from "@/components/scout/copy-text";
import { makeVerifyReceiptTool } from "@/lib/engines/tools/exchange";
import { handoffGapDetect } from "@/lib/engines/tools/scout";
import { buildBrief, usdFromCents } from "./brief";
import { verifyGapNote, type GapCheck } from "./gap";
import { checkRelayRequest } from "./policy";
import { AgentKey, RelayClient } from "./relay-client";
import { runScenario } from "./runner";
import { SCENARIO_IDS, SCRIPTS } from "./scenarios";
import { SIM_RELAY, simRelay } from "./sim-relay";
import type { GapKind, ScenarioId, ScoutRun } from "./types";

/**
 * `npm run scout:simulate`: both Bloom Scout scenarios, end to end, against the in-process simulated relay.
 *
 *   fleet-api   rounds → the counterpart hits an AUTHORITY_CEILING → provisional sandbox terms clear with a receipt
 *   gpu-render  rounds → the counterpart has a KNOWLEDGE_OR_POLICY_GAP → impasse, recorded by transcript hash only
 *
 * For each it prints the rounds, what Cortex's handoff_gap_detect finds in the counterpart's words, the signed gap
 * note, the owner's four-section brief, and Sovereign's exchange_verify_receipt checks. Every signature, hash and
 * ledger proof is computed for real with fresh Ed25519 keys; only the relay is simulated. Global fetch is blocked
 * for the duration, so nothing can reach the network, and no API key is needed.
 */

export type SimResult = {
  scenario: ScenarioId;
  outcome: ScoutRun["outcome"];
  gap: GapKind;
  detected: GapKind | null;
  gapNote: GapCheck;
  receipt: { valid: boolean; checks: Record<string, string> } | null;
  ok: boolean;
};

const c = SCOUT_COPY.en;
const RULE = "─".repeat(78);

export async function simulate(print: (line: string) => void = (l) => console.log(l)): Promise<{ ok: boolean; results: SimResult[]; ms: number }> {
  const started = Date.now();
  const realFetch = globalThis.fetch;
  const priorRelayUrl = process.env.BLOOM_RELAY_URL;
  globalThis.fetch = (async () => {
    throw new Error("scout:simulate makes no network calls");
  }) as typeof fetch;
  process.env.BLOOM_RELAY_URL = SIM_RELAY;

  const results: SimResult[] = [];
  try {
    print("Bloom Scout × Bloom Exchange: local simulation");
    print("In-process simulated relay · real Ed25519 signatures, hashes and Merkle proofs · no network, no keys");
    for (const id of SCENARIO_IDS) results.push(await scenario(id, print));
  } finally {
    globalThis.fetch = realFetch;
    if (priorRelayUrl === undefined) delete process.env.BLOOM_RELAY_URL;
    else process.env.BLOOM_RELAY_URL = priorRelayUrl;
  }

  const ms = Date.now() - started;
  const ok = results.every((r) => r.ok);
  print(RULE);
  print(`${ok ? "PASS" : "FAIL"} · ${results.map((r) => `${r.scenario}: ${r.outcome.toLowerCase()} after ${c.states[r.gap].toLowerCase()}`).join(" · ")} · ${ms} ms`);
  return { ok, results, ms };
}

async function scenario(id: ScenarioId, print: (line: string) => void): Promise<SimResult> {
  const script = SCRIPTS[id];
  const s = c.scenario[id];
  const sim = simRelay();
  const client = async () => new RelayClient({ baseUrl: SIM_RELAY, key: await AgentKey.generate(), fetch: sim.fetch, beforeSend: checkRelayRequest });
  const run = await runScenario(script, { owner: await client(), counterpart: await client() }, { runId: `scout-sim-${id}`, verifierUrl: "https://verify.sim.invalid" });

  print(RULE);
  print(`${s.title} · ${counterpartName(run, c)} · ${s.vertical}`);
  print("");
  print("Rounds");
  for (const m of run.moves) print(`  #${m.seq}  ${c.by[m.by].padEnd(12)} ${c.moves[m.type].padEnd(8)} ${m.priceAtomic ? `${usdFromCents(m.priceAtomic)} ${s.unit}` : ""}`.trimEnd());

  // Cortex reads the counterpart's own words, the same sentence the gap note records.
  const quote = c.reasons[run.gap.note.reason].quote(usdFromCents(run.moves.find((m) => m.seq === run.gap.note.afterSeq)?.priceAtomic ?? run.standingPriceAtomic));
  const detect = await handoffGapDetect.execute({ text: quote });
  const detected = detect.ok ? ((detect.output as { kind: GapKind | null }).kind ?? null) : null;
  print("");
  print("handoff_gap_detect (Cortex)");
  print(`  counterpart: “${quote}”`);
  print(`  → ${detected ? `${detected}: hand the open point to the owner` : "no gap found"}`);

  const events = sim.rooms.get(run.gap.note.roomId)?.events;
  const gapNote = await verifyGapNote(run.gap.note, run.gap.signature, events);
  print("");
  print("Signed gap note (Bloom AI's record, not a relay move)");
  print(`  ${run.gap.note.kind} after event #${run.gap.note.afterSeq}, round ${run.gap.note.round} · transcript ${run.gap.note.transcriptHash.slice(0, 16)}…`);
  print(`  signature ${gapNote.signature} · bound to the transcript ${gapNote.bound}`);

  const brief = buildBrief(run);
  const sec = briefSections(run, c, brief);
  const proof =
    run.proof.kind === "receipt"
      ? `receipt_hash ${run.proof.receiptHash.slice(0, 16)}… · transcript_head ${run.proof.transcriptHead.slice(0, 16)}… · ledger_root ${run.proof.ledgerRoot.slice(0, 16)}… (simulated ledger, not the public one)`
      : run.proof.kind === "transcript"
        ? `No deal, so no receipt: room ${run.proof.roomId} ${run.proof.status.toLowerCase()}, transcript_hash ${run.proof.transcriptHash.slice(0, 16)}…`
        : "";
  print("");
  print(`Owner catch-up brief: ${c.brief.title}`);
  print(`  1 · ${sec.happened}`);
  print(`  2 · ${c.states[brief.admission.kind]} after round ${brief.admission.note.round}: ${c.reasons[brief.admission.note.reason].missing}.`);
  print(`  3 · ${proof}`);
  print(`  4 · ${sec.decision.split("\n").join("\n      ")}`);

  let receipt: SimResult["receipt"] = null;
  print("");
  print("exchange_verify_receipt (Sovereign)");
  if (run.proof.kind === "receipt") {
    const v = await makeVerifyReceiptTool(sim.fetch).execute({ receiptHash: run.proof.receiptHash });
    const out = (v.ok ? v.output : { valid: false, checks: {} }) as { valid: boolean; checks: Record<string, string> };
    receipt = { valid: out.valid, checks: out.checks };
    print(`  ${Object.entries(out.checks).map(([k, x]) => `${k} ${x}`).join(" · ")}`);
    print(`  → ${out.valid ? "verified: Sovereign may accept the settlement" : "not verified: Sovereign holds it for a person"}`);
  } else {
    print("  nothing to verify: an impasse has no receipt, and none is invented");
  }

  const ok =
    detected === run.gap.note.kind &&
    gapNote.signature === "pass" &&
    gapNote.bound === "pass" &&
    (script.outcome === "provisional" ? run.outcome === "CLEARED" && receipt?.valid === true : run.outcome === "REJECTED" && receipt === null);
  return { scenario: id, outcome: run.outcome, gap: run.gap.note.kind, detected, gapNote, receipt, ok };
}
