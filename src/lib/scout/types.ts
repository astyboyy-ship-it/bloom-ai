/**
 * Bloom Scout's records. Two kinds of run share one shape:
 *  - "live": a real sandbox negotiation on the Bloom Exchange relay, with real hashes that verify;
 *  - "illustrative": a pre-recorded blueprint with example hashes that are never sent to the relay.
 * `Proof` keeps the two apart in the type system: only the `receipt` and `transcript` variants are live, and only a
 * `receipt` is publicly verifiable.
 */

export type ScenarioId = "fleet-api" | "gpu-render";
export type ScoutCompanyId = "auto" | "games";
export type Vertical = "api.inference" | "compute.gpu";

/** The two ways a counterpart agent can fail to close on its own, recorded on the Bloom AI side (not relay moves). */
export type GapKind = "AUTHORITY_CEILING" | "KNOWLEDGE_OR_POLICY_GAP";
/** The negotiation states the feed shows, in order. PARTIAL_WITH_RECEIPT: the outcome is recorded with proof. */
export type ScoutState = "NEGOTIATING" | GapKind | "PARTIAL_WITH_RECEIPT";
export type GapReason = "term_commitment" | "multi_region_margin";

export type MoveType = "PROPOSE" | "COUNTER" | "ACCEPT" | "REJECT" | "CLEAR";
export type ScoutMove = {
  seq: number;
  type: MoveType;
  by: "owner" | "counterpart";
  /** The price this move offers (PROPOSE and COUNTER), atomic. */
  priceAtomic?: string;
  /** The relay event hash (an example value on illustrative runs). */
  eventHash: string;
  at: string;
};

/**
 * Bloom AI's record that the counterpart reached a ceiling, signed by the owner-side agent key and bound to the
 * room's transcript at that moment (`afterSeq`, `transcriptHash`). It is not a relay move: the relay has no move
 * for "I lack authority", so this lives in Bloom AI's store alongside the run.
 */
export type GapNote = {
  version: "bloom-ai-gap-note/1";
  kind: GapKind;
  reason: GapReason;
  relay: string;
  roomId: string;
  /** The transcript event the admission followed, and that event's hash. */
  afterSeq: number;
  transcriptHash: string;
  /** COUNTER rounds so far. */
  round: number;
  recordedBy: string;
  at: string;
};
export type SignedGapNote = { note: GapNote; signature: string | null };

export type Proof =
  /** A cleared live room: publicly verifiable on the relay and the verifier. */
  | { kind: "receipt"; receiptHash: string; transcriptHead: string; ledgerRoot: string; leafIndex: number; treeSize: number; verifyUrl: string }
  /** An impasse on the live relay: no receipt exists. Only the two participants can read the room and check this hash. */
  | { kind: "transcript"; roomId: string; transcriptHash: string; status: "REJECTED" | "EXPIRED" }
  /** Illustrative only: example values, not on the ledger and never looked up. */
  | { kind: "example-receipt"; receiptHash: string; transcriptHead: string; ledgerRoot: string }
  | { kind: "example-transcript"; roomId: string; transcriptHash: string; status: "REJECTED" | "EXPIRED" };

export const isLiveProof = (p: Proof): p is Extract<Proof, { kind: "receipt" | "transcript" }> => p.kind === "receipt" || p.kind === "transcript";

export type ScoutRun = {
  id: string;
  mode: "live" | "illustrative";
  scenario: ScenarioId;
  company: ScoutCompanyId;
  vertical: Vertical;
  currency: "USD";
  relay: string;
  startedAt: string;
  finishedAt: string;
  moves: ScoutMove[];
  gap: SignedGapNote;
  outcome: "CLEARED" | "REJECTED" | "EXPIRED";
  /** The price on the table when the room closed, and the owner's own ceiling (kept in Bloom AI, never sent). */
  standingPriceAtomic: string;
  ownerLimitAtomic: string;
  proof: Proof;
};

/** What the run endpoint streams, one JSON object per line. */
export type ScoutEvent =
  | { type: "step"; step: "register" | "intent" | "room" | "sign" | "clear" | "verify" }
  | { type: "move"; move: ScoutMove }
  | { type: "gap"; gap: SignedGapNote }
  | { type: "done"; run: ScoutRun }
  | { type: "error"; code: string; message: string };
