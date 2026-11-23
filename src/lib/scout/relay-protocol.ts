import { canonicalize, concat, fromHex, PUBKEY, randomHex, sha256Bytes, sha256Hex, toHex, verifyEd25519, authString, type AgentKey } from "./relay-client";

/**
 * The parts of the relay protocol an edge must check itself: the room transcript's hash chain and move signatures,
 * the receipt both parties derive from it, mandate commitments, and the RFC 6962 ledger inclusion proof. Ported
 * byte for byte from the Bloom Exchange SDK, so a receipt hash computed here equals the relay's.
 */

export type RoomStatus = "PROPOSED" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CLEARED";
export type RoomEventType = "PROPOSE" | "COUNTER" | "ACCEPT" | "REJECT" | "SIGN" | "CLEAR" | "EXPIRE";
export type Party = { pubkey: string; mandateCommitment: string | null };

export type RoomEvent = {
  roomId: string;
  seq: number;
  type: RoomEventType;
  by: string;
  body: Record<string, unknown>;
  at: string;
  prevHash: string;
  hash: string;
  auth: { method: string; path: string; timestamp: string; nonce: string; signature: string; raw: string } | null;
};

export type Room = {
  id: string;
  relay: string;
  intentId: string;
  vertical: string;
  status: RoomStatus;
  buyer: Party;
  seller: Party;
  rounds: number;
  maxRounds: number;
  openedAt: string;
  expiresAt: string;
  accepted: { terms: Record<string, unknown>; priceAtomic: string; currency: string; at: string; eventHash: string } | null;
  receiptHash: string | null;
  transcriptHead: string;
  seq: number;
};

export const GENESIS_HASH = "0".repeat(64);
export const RECEIPT_VERSION = "bloom-relay-receipt/1";

export type RelayReceipt = {
  version: typeof RECEIPT_VERSION;
  relay: string;
  roomId: string;
  intentId: string;
  vertical: string;
  buyer: { pubkey: string; mandateCommitment: string };
  seller: { pubkey: string; mandateCommitment: string };
  terms: Record<string, unknown>;
  priceAtomic: string;
  currency: string;
  rounds: number;
  openedAt: string;
  acceptedAt: string;
  transcriptHead: string;
};

export type ReceiptPayload = {
  hash: string;
  receipt: RelayReceipt;
  signatures: { buyer: string; seller: string };
  clearedAt: string;
  revoked: boolean;
  ledger: { leafIndex: number; treeSize: number; root: string; proof: string[] };
};

export const eventHash = (e: Pick<RoomEvent, "roomId" | "seq" | "type" | "by" | "body" | "at" | "prevHash">) =>
  sha256Hex(canonicalize({ domain: "bloom-room-event/1", roomId: e.roomId, seq: e.seq, type: e.type, by: e.by, body: e.body, at: e.at, prevHash: e.prevHash }));

/** Re-checks a transcript: sequence, hash chain, and each move's request signature over its raw body. First problem, or null. */
export async function verifyTranscript(events: RoomEvent[]): Promise<string | null> {
  let prev = GENESIS_HASH;
  for (const [i, e] of events.entries()) {
    if (e.seq !== i + 1) return `event ${e.seq}: out of sequence`;
    if (e.prevHash !== prev) return `event ${e.seq}: broken chain`;
    if ((await eventHash(e)) !== e.hash) return `event ${e.seq}: hash mismatch`;
    prev = e.hash;
    if (e.type === "EXPIRE") {
      if (e.by !== "relay" || e.auth) return `event ${e.seq}: only the relay records expiry`;
      continue;
    }
    if (!e.auth || !PUBKEY.test(e.by)) return `event ${e.seq}: unsigned move`;
    let parsed: unknown;
    try {
      parsed = JSON.parse(e.auth.raw);
    } catch {
      return `event ${e.seq}: raw body is not JSON`;
    }
    if (canonicalize(parsed) !== canonicalize(e.body)) return `event ${e.seq}: raw body differs from the recorded body`;
    if (!(await verifyEd25519(e.by, e.auth.signature, authString(e.auth.method, e.auth.path, e.auth.timestamp, e.auth.nonce, await sha256Hex(e.auth.raw))))) return `event ${e.seq}: signature does not verify`;
  }
  return null;
}

/** The price a negotiation moves: the unit price for inference terms, the total otherwise. */
export function offerPrice(terms: Record<string, unknown>): { priceAtomic: string; currency: string } {
  const price = terms.vertical === "api.inference" ? terms.unitPriceAtomic : terms.totalPriceAtomic;
  return { priceAtomic: typeof price === "string" ? price : "", currency: typeof terms.currency === "string" ? terms.currency : "" };
}

/** Rebuilds the receipt from the signed transcript alone; an edge signs only if it equals the relay's draft. */
export async function receiptFromTranscript(room: Pick<Room, "relay" | "id" | "intentId" | "vertical" | "buyer" | "seller">, events: RoomEvent[]): Promise<RelayReceipt> {
  const problem = await verifyTranscript(events);
  if (problem) throw new Error(`transcript: ${problem}`);
  const acceptAt = events.findIndex((e) => e.type === "ACCEPT");
  if (acceptAt < 0 || events[0]?.type !== "PROPOSE") throw new Error("transcript: no PROPOSE … ACCEPT");
  const before = events.slice(0, acceptAt);
  const last = before.filter((e) => e.type === "PROPOSE" || e.type === "COUNTER").at(-1);
  if (!last) throw new Error("transcript: no offer before ACCEPT");
  const terms = last.body.terms as Record<string, unknown>;
  const commitment = (pubkey: string) => (events.slice(0, acceptAt + 1).find((e) => e.by === pubkey && typeof e.body.mandateCommitment === "string")?.body.mandateCommitment as string | undefined) ?? null;
  const buyerC = commitment(room.buyer.pubkey);
  const sellerC = commitment(room.seller.pubkey);
  if (!buyerC || !sellerC) throw new Error("transcript: a mandate commitment is missing");
  const accept = events[acceptAt];
  return {
    version: RECEIPT_VERSION,
    relay: room.relay,
    roomId: room.id,
    intentId: room.intentId,
    vertical: room.vertical,
    buyer: { pubkey: room.buyer.pubkey, mandateCommitment: buyerC },
    seller: { pubkey: room.seller.pubkey, mandateCommitment: sellerC },
    terms,
    ...offerPrice(terms),
    rounds: before.filter((e) => e.type === "COUNTER").length,
    openedAt: events[0].at,
    acceptedAt: accept.at,
    transcriptHead: accept.hash,
  };
}

export const receiptHash = (r: RelayReceipt) => sha256Hex(canonicalize(r));
const receiptSigningInput = (hash: string) => `BLOOM-RELAY-RECEIPT-v1\n${hash}`;
export const signReceipt = (key: AgentKey, hash: string) => key.sign(receiptSigningInput(hash));

// ---------------------------------------------------------------------------------------------------------
// Sealed mandates
// ---------------------------------------------------------------------------------------------------------

export type Mandate = { vertical: string; role: "buyer" | "seller"; currency: string; limitAtomic: string };
const ATOMIC = /^(0|[1-9][0-9]{0,29})$/;

/** The salted commitment published to the relay; the mandate and salt stay on this side. */
export async function commitMandate(mandate: Mandate, salt = randomHex(32)): Promise<{ commitment: string; salt: string }> {
  if (!ATOMIC.test(mandate.limitAtomic)) throw new Error("commitMandate: limitAtomic must be an atomic amount");
  const opening = { mandate: { vertical: mandate.vertical, role: mandate.role, currency: mandate.currency, limitAtomic: mandate.limitAtomic }, salt };
  return { commitment: await sha256Hex(canonicalize({ domain: "bloom-mandate/1", ...opening })), salt };
}

/** The edge's deterministic clamp: the nearest price the mandate allows (buyer: at most the limit; seller: at least). */
export function clampPrice(priceAtomic: string, mandate: Mandate): string {
  if (!ATOMIC.test(priceAtomic)) throw new Error("clampPrice: not an atomic amount");
  const p = BigInt(priceAtomic);
  const limit = BigInt(mandate.limitAtomic);
  return (mandate.role === "buyer" ? (p > limit ? limit : p) : p < limit ? limit : p).toString();
}

// ---------------------------------------------------------------------------------------------------------
// Receipt verification (no trust in the relay)
// ---------------------------------------------------------------------------------------------------------

const node = (l: Uint8Array, r: Uint8Array) => sha256Bytes(concat(new Uint8Array([1]), l, r));

/** RFC 9162 §2.1.3.2: does `proof` place this receipt at `index` in a tree of `treeSize` with this `root`? */
export async function verifyInclusion(hash: string, index: number, treeSize: number, proof: string[], root: string): Promise<boolean> {
  try {
    if (!Number.isSafeInteger(index) || !Number.isSafeInteger(treeSize) || index < 0 || index >= treeSize) return false;
    let fn = index;
    let sn = treeSize - 1;
    let r = await sha256Bytes(concat(new Uint8Array([0]), fromHex(hash)));
    for (const p of proof) {
      const pb = fromHex(p);
      if (pb.length !== 32 || sn === 0) return false;
      if (fn % 2 === 1 || fn === sn) {
        r = await node(pb, r);
        if (fn % 2 === 0)
          while (fn % 2 === 0 && fn !== 0) {
            fn = Math.floor(fn / 2);
            sn = Math.floor(sn / 2);
          }
      } else r = await node(r, pb);
      fn = Math.floor(fn / 2);
      sn = Math.floor(sn / 2);
    }
    return sn === 0 && toHex(r) === root;
  } catch {
    return false;
  }
}

export type Check = "pass" | "fail";
export type ReceiptChecks = { canonicalHash: Check; buyerSignature: Check; sellerSignature: Check; ledgerInclusion: Check; notRevoked: Check };

/**
 * Verifies a receipt payload locally: hash, both signatures, ledger inclusion and revocation. Pass `expectedHash` (the
 * hash that was asked for) so a relay that answers with a different, validly signed receipt fails canonicalHash.
 */
export async function verifyReceiptPayload(p: ReceiptPayload, expectedHash?: string): Promise<{ valid: boolean; checks: ReceiptChecks }> {
  const hash = await receiptHash(p.receipt).catch(() => "");
  const ok = (b: boolean): Check => (b ? "pass" : "fail");
  const checks: ReceiptChecks = {
    canonicalHash: ok(Boolean(hash) && hash === p.hash && (expectedHash === undefined || hash === expectedHash) && p.receipt?.version === RECEIPT_VERSION),
    buyerSignature: ok(Boolean(hash) && (await verifyEd25519(p.receipt.buyer?.pubkey, p.signatures?.buyer, receiptSigningInput(hash)))),
    sellerSignature: ok(Boolean(hash) && (await verifyEd25519(p.receipt.seller?.pubkey, p.signatures?.seller, receiptSigningInput(hash)))),
    ledgerInclusion: ok(Boolean(hash) && Boolean(p.ledger) && (await verifyInclusion(hash, p.ledger.leafIndex, p.ledger.treeSize, p.ledger.proof, p.ledger.root))),
    notRevoked: ok(p.revoked !== true),
  };
  return { valid: Object.values(checks).every((c) => c === "pass"), checks };
}
