import { signGapNote } from "./gap";
import { canonicalize, verifierLink, type RelayClient } from "./relay-client";
import { clampPrice, commitMandate, receiptFromTranscript, receiptHash, signReceipt, verifyReceiptPayload, type Mandate, type Room, type RoomEvent } from "./relay-protocol";
import type { Script } from "./scenarios";
import type { ScoutEvent, ScoutMove, ScoutRun, SignedGapNote } from "./types";

/**
 * Plays one scenario script on the live relay with two Bloom-owned sandbox agents:
 *   register both → the counterpart publishes a sandbox intent → the owner opens a room (PROPOSE) → counters as
 *   scripted, every price clamped to its side's sealed mandate → the counterpart admits its ceiling (a signed gap
 *   note bound to the transcript) → "provisional": owner ACCEPT, both edges rebuild and sign the receipt, CLEAR,
 *   verify it from the ledger; "impasse": owner REJECT, and the transcript head is the record.
 * Every request body passes the sandbox policy first (the clients' `beforeSend`).
 */

export const SANDBOX_ORG = "Bloom AI Exchange Scout sandbox";

export type Parties = { owner: RelayClient; counterpart: RelayClient };

export async function runScenario(script: Script, parties: Parties, opts: { runId: string; verifierUrl: string; emit?: (e: ScoutEvent) => void; now?: () => Date }): Promise<ScoutRun> {
  const emit = opts.emit ?? (() => undefined);
  const now = opts.now ?? (() => new Date());
  const { owner, counterpart } = parties;
  const startedAt = now().toISOString();

  emit({ type: "step", step: "register" });
  await counterpart.registerAgent({ displayName: "Exchange Scout sandbox counterpart (disposable)", org: SANDBOX_ORG });
  await owner.registerAgent({ displayName: "Exchange Scout sandbox owner agent (disposable)", org: SANDBOX_ORG });

  const ownerMandate: Mandate = { vertical: script.vertical, role: "buyer", currency: "USD", limitAtomic: script.ownerLimitAtomic };
  const cpMandate: Mandate = { vertical: script.vertical, role: "seller", currency: "USD", limitAtomic: script.counterpartFloorAtomic };
  const ownerC = await commitMandate(ownerMandate);
  const cpC = await commitMandate(cpMandate);

  emit({ type: "step", step: "intent" });
  const listPrice = script.moves.find((m) => m.by === "counterpart")?.priceAtomic ?? script.counterpartFloorAtomic;
  const intent = await counterpart.publishIntent({ vertical: script.vertical, role: "seller", capabilityTags: ["exchange-scout", "sandbox"], spec: script.terms(listPrice), ttlSeconds: 300 });

  const moves: ScoutMove[] = [];
  const record = (e: RoomEvent, by: ScoutMove["by"], priceAtomic?: string) => {
    const m: ScoutMove = { seq: e.seq, type: e.type as ScoutMove["type"], by, ...(priceAtomic && { priceAtomic }), eventHash: e.hash, at: e.at };
    moves.push(m);
    emit({ type: "move", move: m });
  };

  emit({ type: "step", step: "room" });
  let room: Room | null = null;
  let gap: SignedGapNote | null = null;
  const committed = { owner: false, counterpart: false };
  for (const [i, m] of script.moves.entries()) {
    // The edge's own clamp: no offer leaves this side outside its sealed mandate, whatever the script says.
    const price = clampPrice(m.priceAtomic, m.by === "owner" ? ownerMandate : cpMandate);
    const terms = script.terms(price);
    const commitment = committed[m.by] ? undefined : m.by === "owner" ? ownerC.commitment : cpC.commitment;
    committed[m.by] = true;
    const res: { room: Room; event: RoomEvent } =
      m.type === "PROPOSE"
        ? await owner.openRoom({ intentId: intent.id, terms, mandateCommitment: ownerC.commitment, maxRounds: 4, ttlSeconds: 300 })
        : await (m.by === "owner" ? owner : counterpart).move(room!.id, { type: "COUNTER", terms, ...(commitment && { mandateCommitment: commitment }) });
    const current = res.room;
    room = current;
    record(res.event, m.by, price);

    if (i === script.gap.afterMove) {
      const note = { version: "bloom-ai-gap-note/1" as const, kind: script.gap.kind, reason: script.gap.reason, relay: current.relay, roomId: current.id, afterSeq: res.event.seq, transcriptHash: res.event.hash, round: current.rounds, recordedBy: owner.key.publicKey, at: now().toISOString() };
      gap = { note, signature: await signGapNote(owner.key, note) };
      emit({ type: "gap", gap });
    }
  }
  if (!room || !gap) throw new Error("runScenario: the script made no moves or recorded no gap");
  const standingPriceAtomic = moves.filter((m) => m.priceAtomic).at(-1)!.priceAtomic!;
  const base = { id: opts.runId, mode: "live" as const, scenario: script.id, company: script.company, vertical: script.vertical, currency: "USD" as const, relay: room.relay, startedAt, gap, standingPriceAtomic, ownerLimitAtomic: script.ownerLimitAtomic };

  if (script.outcome === "impasse") {
    const res = await owner.move(room.id, { type: "REJECT" });
    record(res.event, "owner");
    return { ...base, finishedAt: now().toISOString(), moves, outcome: "REJECTED", proof: { kind: "transcript", roomId: room.id, transcriptHash: res.room.transcriptHead, status: "REJECTED" } };
  }

  const accepted = await owner.move(room.id, { type: "ACCEPT" });
  record(accepted.event, "owner");

  // Both edges rebuild the receipt from the signed transcript and sign only if they agree with each other and with
  // what the relay recorded as accepted.
  emit({ type: "step", step: "sign" });
  const [o, c] = await Promise.all([owner.getRoom(room.id), counterpart.getRoom(room.id)]);
  const mine = await receiptFromTranscript(o.room, o.events);
  const theirs = await receiptFromTranscript(c.room, c.events);
  if (canonicalize(mine) !== canonicalize(theirs) || o.room.accepted?.eventHash !== mine.transcriptHead || o.room.accepted?.priceAtomic !== mine.priceAtomic) throw new Error("The relay's accepted terms differ from the signed transcript; nothing was signed.");
  const hash = await receiptHash(mine);
  const signatures = { buyer: await signReceipt(owner.key, hash), seller: await signReceipt(counterpart.key, hash) };

  emit({ type: "step", step: "clear" });
  const cleared = await owner.move(room.id, { type: "CLEAR", receipt: mine as unknown as Record<string, unknown>, signatures });
  record(cleared.event, "owner");

  emit({ type: "step", step: "verify" });
  const payload = await owner.getReceipt(hash);
  const v = await verifyReceiptPayload(payload);
  if (!v.valid) throw new Error(`The cleared receipt did not verify: ${Object.entries(v.checks).filter(([, x]) => x === "fail").map(([k]) => k).join(", ")}.`);
  return {
    ...base,
    finishedAt: now().toISOString(),
    moves,
    outcome: "CLEARED",
    proof: { kind: "receipt", receiptHash: hash, transcriptHead: mine.transcriptHead, ledgerRoot: payload.ledger.root, leafIndex: payload.ledger.leafIndex, treeSize: payload.ledger.treeSize, verifyUrl: verifierLink(opts.verifierUrl, hash) },
  };
}
