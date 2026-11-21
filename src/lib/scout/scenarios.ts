import { DEFAULT_RELAY_URL } from "./relay-client";
import type { GapKind, GapReason, Proof, ScenarioId, ScoutCompanyId, ScoutMove, ScoutRun, Vertical } from "./types";

/**
 * The two Exchange Scout scenarios. Each is one deterministic script, used both by live sandbox runs (runner.ts) and
 * by the pre-recorded illustrative blueprints below, so a live run plays out exactly as its blueprint does.
 *
 * The owner side is the buyer (Bloom AI acting for the company owner); the counterpart is a sandbox seller persona
 * that reaches a ceiling at a fixed point. Prices are atomic US cents. Terms carry only sandbox values: the model and
 * accelerator names say "sandbox" and the container digest is SHA-256("bloom-ai-exchange-scout-sandbox"). Nothing in
 * a script names a company: the UI fills in a brand through pulse/companies.ts, behind the private-showcase flag.
 */

export type ScriptMove = { by: "owner" | "counterpart"; type: "PROPOSE" | "COUNTER"; priceAtomic: string };

export type Script = {
  id: ScenarioId;
  company: ScoutCompanyId;
  vertical: Vertical;
  terms: (priceAtomic: string) => Record<string, unknown>;
  /** The owner's ceiling (buyer) and the counterpart's floor (seller): sealed, only commitments reach the relay. */
  ownerLimitAtomic: string;
  counterpartFloorAtomic: string;
  moves: ScriptMove[];
  /** The counterpart admits its ceiling right after move `afterMove` (0-based index into `moves`). */
  gap: { afterMove: number; kind: GapKind; reason: GapReason };
  /**
   * "provisional": the owner accepts the standing sandbox price and the room clears with a receipt; the open point
   * goes to the owner. "impasse": the counterpart cannot move, so the owner rejects; the transcript is the record.
   */
  outcome: "provisional" | "impasse";
};

const SANDBOX_DIGEST = "sha256:52c12105ca16cb12df747da6faf4d11d70ec5aea31bab9bcedd8c1a7b508a052";

export const SCRIPTS: Record<ScenarioId, Script> = {
  "fleet-api": {
    id: "fleet-api",
    company: "auto",
    vertical: "api.inference",
    terms: (p) => ({ vertical: "api.inference", model: "sandbox/scout-fleet-telemetry", maxInputTokens: 8_000, maxOutputTokens: 1_000, latencySlaMs: 800, unitPriceAtomic: p, currency: "USD" }),
    ownerLimitAtomic: "75",
    counterpartFloorAtomic: "70",
    moves: [
      { by: "owner", type: "PROPOSE", priceAtomic: "60" },
      { by: "counterpart", type: "COUNTER", priceAtomic: "80" },
      { by: "owner", type: "COUNTER", priceAtomic: "68" },
      { by: "counterpart", type: "COUNTER", priceAtomic: "72" },
    ],
    gap: { afterMove: 3, kind: "AUTHORITY_CEILING", reason: "term_commitment" },
    outcome: "provisional",
  },
  "gpu-render": {
    id: "gpu-render",
    company: "games",
    vertical: "compute.gpu",
    terms: (p) => ({ vertical: "compute.gpu", accelerator: "SANDBOX-GPU-80GB", acceleratorCount: 8, vramGb: 80, durationSeconds: 86_400, containerDigest: SANDBOX_DIGEST, totalPriceAtomic: p, currency: "USD" }),
    ownerLimitAtomic: "400000",
    counterpartFloorAtomic: "420000",
    moves: [
      { by: "owner", type: "PROPOSE", priceAtomic: "320000" },
      { by: "counterpart", type: "COUNTER", priceAtomic: "480000" },
      { by: "owner", type: "COUNTER", priceAtomic: "360000" },
    ],
    gap: { afterMove: 2, kind: "KNOWLEDGE_OR_POLICY_GAP", reason: "multi_region_margin" },
    outcome: "impasse",
  },
};

export const SCENARIO_IDS = Object.keys(SCRIPTS) as ScenarioId[];

// ---------------------------------------------------------------------------------------------------------
// Illustrative blueprints: example values only
// ---------------------------------------------------------------------------------------------------------

/** Every example hash used below. The receipt route refuses these, so none is ever looked up on the relay. */
export const EXAMPLE_HASHES = new Set([
  "9e660ca6ce81fcd18271abd6c9205b93e48db30f8f4394433d2e7c388381f7b7",
  "5cfa94d2e0be7a01c8aa7f72142e32a87d11aa7d7a60ec376144aa6b60e8cd8c",
  "780316b29739f51d597f8b6c5adf0906486f48512c900332fb803ce89dbee824",
  "1397557edc967fc210457cd77921cc59364c8277a2fccf7c1072a7312d2b3af2",
  "9d66cdf6ed7db7216b547643d6468a056d523f78b2e224ab76faf34a2d13cfb9",
  "5adfad9de9746727e9e0782e2bdbd614bb6efb1db6840e5ee0bd6c5d9db1dbe7",
  "a0967f58d5a54de05e77413a417110f8477a3e7bbaf7ede40cfeae49890d8ccb",
  "1635284fb23584c67b6feff4ce7103261ccf6e1a4a83321595a028ae0a87b87b",
  "2d88eb7461273e1c568a6d26e246b7f72b2034e679ae8547b44c53970eddb3cd",
  "ca885dc8fcd86834c47c4f2c66a82076246c6df7848e658d4e452acea3c487de",
  "7e660a4de9228819542c90ee8be2c1969a7433d49568f625c06f306227673392",
  "8206016528db2cda73fe848d5ef1392a14755f1b61d209731841fdc600e88e87",
]);
const EX = [...EXAMPLE_HASHES];

function illustrative(script: Script, start: string, hashes: string[], tail: ScoutMove[], proof: Proof, outcome: ScoutRun["outcome"], standing: string): ScoutRun {
  const t0 = Date.parse(start);
  const at = (i: number) => new Date(t0 + i * 2_400).toISOString();
  const moves: ScoutMove[] = script.moves.map((m, i) => ({ seq: i + 1, type: m.type, by: m.by, priceAtomic: m.priceAtomic, eventHash: hashes[i], at: at(i) }));
  const after = moves[script.gap.afterMove];
  return {
    id: `illustrative-${script.id}`,
    mode: "illustrative",
    scenario: script.id,
    company: script.company,
    vertical: script.vertical,
    currency: "USD",
    relay: DEFAULT_RELAY_URL,
    startedAt: at(0),
    finishedAt: tail.at(-1)?.at ?? at(moves.length),
    moves: [...moves, ...tail],
    gap: {
      note: { version: "bloom-ai-gap-note/1", kind: script.gap.kind, reason: script.gap.reason, relay: DEFAULT_RELAY_URL, roomId: `example-room-${script.id}`, afterSeq: after.seq, transcriptHash: after.eventHash, round: moves.slice(0, script.gap.afterMove + 1).filter((m) => m.type === "COUNTER").length, recordedBy: "example-owner-key", at: after.at },
      signature: null,
    },
    outcome,
    standingPriceAtomic: standing,
    ownerLimitAtomic: script.ownerLimitAtomic,
    proof,
  };
}

const fleet = SCRIPTS["fleet-api"];
const gpu = SCRIPTS["gpu-render"];

/** The pre-recorded feed entries. Permanently labeled as blueprints; their proofs are `example-*` and never fetched. */
export const ILLUSTRATIVE_RUNS: ScoutRun[] = [
  illustrative(
    fleet,
    "2026-11-20T09:14:02.000Z",
    EX.slice(0, 4),
    [
      { seq: 5, type: "ACCEPT", by: "owner", eventHash: EX[4], at: "2026-11-20T09:14:14.000Z" },
      { seq: 6, type: "CLEAR", by: "owner", eventHash: EX[5], at: "2026-11-20T09:14:16.400Z" },
    ],
    { kind: "example-receipt", receiptHash: EX[6], transcriptHead: EX[4], ledgerRoot: EX[7] },
    "CLEARED",
    "72",
  ),
  illustrative(
    gpu,
    "2026-11-20T11:42:30.000Z",
    EX.slice(8, 11),
    [{ seq: 4, type: "REJECT", by: "owner", eventHash: EX[11], at: "2026-11-20T11:42:40.000Z" }],
    { kind: "example-transcript", roomId: "example-room-gpu-render", transcriptHash: EX[11], status: "REJECTED" },
    "REJECTED",
    "360000",
  ),
];
