import { authString, canonicalize, concat, sha256Bytes, sha256Hex, toHex, verifyEd25519 } from "../relay-client";
import { eventHash, GENESIS_HASH, offerPrice, receiptHash, type ReceiptPayload, type RelayReceipt, type Room, type RoomEvent } from "../relay-protocol";

/**
 * An in-memory stand-in for the Bloom Exchange relay, strict where Exchange Scout could go wrong: it verifies every
 * signed request (headers, body hash, nonce reuse), records each move's raw body and signature in a hash chain like
 * the real relay, enforces turns and round limits, and accepts a CLEAR only with a receipt that hashes correctly and
 * carries both parties' signatures. `bodies` keeps every request body so tests can check what was sent.
 */
export const FAKE_RELAY = "https://fake-relay.test";

type Stored = { room: Room; events: RoomEvent[] };

const leaf = (h: string) => sha256Bytes(concat(new Uint8Array([0]), Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)))));
async function root(hashes: string[]): Promise<string> {
  const mth = async (ls: Uint8Array[]): Promise<Uint8Array> => {
    if (ls.length === 1) return ls[0];
    const k = 2 ** Math.floor(Math.log2(ls.length - 1));
    return sha256Bytes(concat(new Uint8Array([1]), await mth(ls.slice(0, k)), await mth(ls.slice(k))));
  };
  return toHex(await mth(await Promise.all(hashes.map(leaf))));
}

export function fakeRelay(now = () => new Date("2026-11-21T10:00:00.000Z")) {
  const nonces = new Set<string>();
  const intents = new Map<string, { id: string; owner: string; vertical: string }>();
  const rooms = new Map<string, Stored>();
  const receipts = new Map<string, Omit<ReceiptPayload, "ledger">>();
  const ledger: string[] = [];
  const bodies: { path: string; body: unknown }[] = [];
  let n = 0;
  let clock = now().getTime();
  const at = () => new Date((clock += 1000)).toISOString();

  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const deny = (status: number, code: string) => json(status, { error: { code, message: code } });

  async function append(s: Stored, type: RoomEvent["type"], by: string, body: Record<string, unknown>, auth: RoomEvent["auth"]) {
    const base = { roomId: s.room.id, seq: s.events.length + 1, type, by, body, at: at(), prevHash: s.events.at(-1)?.hash ?? GENESIS_HASH };
    const e: RoomEvent = { ...base, hash: await eventHash(base), auth };
    s.events.push(e);
    s.room.seq = e.seq;
    s.room.transcriptHead = e.hash;
    return e;
  }

  async function handle(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
    const url = new URL(String(input));
    const target = `${url.pathname}${url.search}`;
    const method = (init.method ?? "GET").toUpperCase();
    const raw = typeof init.body === "string" ? init.body : "";
    const h = new Headers(init.headers);
    const pub = h.get("x-bloom-pubkey");

    if (method === "GET" && url.pathname === "/health") return json(200, { ok: true, service: "bloom-relay", version: "test", store: "memory", nonces: "memory", transports: ["poll"], time: at() });
    const receiptMatch = url.pathname.match(/^\/v1\/receipts\/([0-9a-f]{64})$/);
    if (method === "GET" && receiptMatch) {
      const r = receipts.get(receiptMatch[1]);
      if (!r) return deny(404, "not_found");
      const idx = ledger.indexOf(r.hash);
      return json(200, { ...r, ledger: { leafIndex: idx, treeSize: ledger.length, root: await root(ledger), proof: [] } });
    }

    // Everything else is signed.
    const ts = h.get("x-bloom-timestamp") ?? "";
    const nonce = h.get("x-bloom-nonce") ?? "";
    const sig = h.get("x-bloom-signature") ?? "";
    if (!pub || !(await verifyEd25519(pub, sig, authString(method, target, ts, nonce, await sha256Hex(raw))))) return deny(401, "bad_signature");
    if (nonces.has(`${pub}:${nonce}`)) return deny(401, "replayed_nonce");
    nonces.add(`${pub}:${nonce}`);
    const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    if (raw) bodies.push({ path: url.pathname, body });
    const auth = { method, path: target, timestamp: ts, nonce, signature: sig, raw };

    if (method === "POST" && url.pathname === "/v1/agents") return json(200, { agent: { pubkey: pub } });
    if (method === "POST" && url.pathname === "/v1/intents") {
      const intent = { id: `in_${++n}`, owner: pub, vertical: String(body.vertical), role: body.role, capabilityTags: body.capabilityTags, spec: body.spec, status: "OPEN", createdAt: at(), expiresAt: at() };
      intents.set(intent.id, intent);
      return json(200, { intent });
    }
    if (method === "POST" && url.pathname === "/v1/rooms") {
      const intent = intents.get(String(body.intentId));
      if (!intent) return deny(404, "no_intent");
      const id = `rm_${++n}`;
      const { priceAtomic, currency } = offerPrice(body.terms as Record<string, unknown>);
      const room: Room = { id, relay: FAKE_RELAY, intentId: intent.id, vertical: intent.vertical, status: "PROPOSED", buyer: { pubkey: pub, mandateCommitment: String(body.mandateCommitment) }, seller: { pubkey: intent.owner, mandateCommitment: null }, rounds: 0, maxRounds: Number(body.maxRounds), openedAt: at(), expiresAt: at(), accepted: null, receiptHash: null, transcriptHead: GENESIS_HASH, seq: 0 };
      const s = { room, events: [] as RoomEvent[] };
      rooms.set(id, s);
      const event = await append(s, "PROPOSE", pub, body, auth);
      (s as Stored & { last?: unknown }).last = { terms: body.terms, priceAtomic, currency, by: pub };
      return json(200, { room, event });
    }
    const roomMatch = url.pathname.match(/^\/v1\/rooms\/([^/]+)(\/events)?$/);
    const s = roomMatch ? rooms.get(decodeURIComponent(roomMatch[1])) : undefined;
    if (!s) return deny(404, "no_room");
    const party = pub === s.room.buyer.pubkey ? "buyer" : pub === s.room.seller.pubkey ? "seller" : null;
    if (!party) return deny(403, "not_a_participant");
    if (method === "GET" && !roomMatch![2]) return json(200, { room: s.room, events: s.events });
    if (method !== "POST" || !roomMatch![2]) return deny(404, "not_found");

    const last = (s as Stored & { last: { terms: Record<string, unknown>; priceAtomic: string; currency: string; by: string } }).last;
    const open = s.room.status === "PROPOSED" || s.room.status === "COUNTERED";
    const type = body.type as RoomEvent["type"];
    if (typeof body.mandateCommitment === "string" && !s.room[party].mandateCommitment) s.room[party].mandateCommitment = body.mandateCommitment;
    if (type === "COUNTER") {
      if (!open || last.by === pub) return deny(409, "not_your_turn");
      if (s.room.rounds >= s.room.maxRounds) return deny(409, "max_rounds");
      s.room.rounds++;
      s.room.status = "COUNTERED";
      const event = await append(s, "COUNTER", pub, body, auth);
      (s as Stored & { last: unknown }).last = { terms: body.terms, ...offerPrice(body.terms as Record<string, unknown>), by: pub };
      return json(200, { room: s.room, event });
    }
    if (type === "ACCEPT") {
      if (!open || last.by === pub) return deny(409, "not_your_turn");
      const event = await append(s, "ACCEPT", pub, body, auth);
      s.room.status = "ACCEPTED";
      s.room.accepted = { terms: last.terms, priceAtomic: last.priceAtomic, currency: last.currency, at: event.at, eventHash: event.hash };
      return json(200, { room: s.room, event });
    }
    if (type === "REJECT") {
      if (!open) return deny(409, "closed");
      const event = await append(s, "REJECT", pub, body, auth);
      s.room.status = "REJECTED";
      return json(200, { room: s.room, event });
    }
    if (type === "CLEAR") {
      if (s.room.status !== "ACCEPTED") return deny(409, "not_accepted");
      const receipt = body.receipt as RelayReceipt;
      const hash = await receiptHash(receipt);
      const sigs = body.signatures as { buyer: string; seller: string };
      const input = `BLOOM-RELAY-RECEIPT-v1\n${hash}`;
      if (receipt.transcriptHead !== s.room.accepted!.eventHash || !(await verifyEd25519(s.room.buyer.pubkey, sigs.buyer, input)) || !(await verifyEd25519(s.room.seller.pubkey, sigs.seller, input))) return deny(422, "bad_receipt");
      const event = await append(s, "CLEAR", pub, body, auth);
      s.room.status = "CLEARED";
      s.room.receiptHash = hash;
      ledger.push(hash);
      receipts.set(hash, { hash, receipt, signatures: sigs, clearedAt: event.at, revoked: false });
      return json(200, { room: s.room, event });
    }
    return deny(400, "bad_event_type");
  }

  return { fetch: handle as typeof fetch, bodies, rooms, canonical: canonicalize };
}
