/**
 * A self-contained client for the Bloom Exchange clearing relay (docs: bloom-exchange docs/RELAY_PROTOCOL.md), so
 * Exchange Scout does not depend on an unreleased @bloom-exchange/sdk. Runs on Web Crypto only (Node 20+ and modern
 * browsers), and is byte-compatible with the relay:
 *
 *   X-Bloom-Pubkey     raw Ed25519 public key, base64url (43 chars)
 *   X-Bloom-Timestamp  unix milliseconds (the relay allows 30 s of drift)
 *   X-Bloom-Nonce      UUIDv4 (the relay refuses a nonce it has seen in the last 60 s)
 *   X-Bloom-Signature  Ed25519 over METHOD \n PATH_WITH_QUERY \n TIMESTAMP \n NONCE \n SHA256_HEX(RAW_BODY)
 *
 * Every request body passes through `beforeSend` first, which is where the sandbox policy refuses anything that
 * must never reach the relay's public, permanent records (see policy.ts).
 */
import type { ReceiptPayload, Room, RoomEvent } from "./relay-protocol";

export const DEFAULT_RELAY_URL = "https://bloom-exchange-relay.vercel.app";
export const DEFAULT_VERIFIER_URL = "https://bloom-exchange-verify.vercel.app";

// ---------------------------------------------------------------------------------------------------------
// Bytes, hashing and canonical JSON
// ---------------------------------------------------------------------------------------------------------

const enc = new TextEncoder();
export const utf8 = (s: string): Uint8Array<ArrayBuffer> => {
  const b = enc.encode(s);
  const out = new Uint8Array(new ArrayBuffer(b.length));
  out.set(b);
  return out;
};

export function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("not base64url");
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const toHex = (bytes: Uint8Array): string => Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");

export function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[0-9a-f]{2})*$/.test(hex)) throw new Error("not lowercase hex");
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(parts.reduce((n, p) => n + p.length, 0)));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export const sha256Bytes = async (data: Uint8Array<ArrayBuffer>) => new Uint8Array(await crypto.subtle.digest("SHA-256", data));
export const sha256Hex = async (data: string | Uint8Array<ArrayBuffer>) => toHex(await sha256Bytes(typeof data === "string" ? utf8(data) : data));
export const randomHex = (bytes = 32) => toHex(crypto.getRandomValues(new Uint8Array(bytes)));

/** Canonical JSON: sorted keys, no whitespace, undefined members dropped. Byte-identical to the relay's. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonicalize: non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? "null" : canonicalize(v))).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
  }
  throw new Error(`canonicalize: unsupported ${typeof value}`);
}

// ---------------------------------------------------------------------------------------------------------
// Ed25519 agent keys
// ---------------------------------------------------------------------------------------------------------

const PKCS8_ED25519 = fromHex("302e020100300506032b657004220420");
export const PUBKEY = /^[A-Za-z0-9_-]{43}$/;
export const SIGNATURE = /^[A-Za-z0-9_-]{86}$/;

/** An agent's Ed25519 identity. The relay only ever sees the public key and signatures; the seed stays here. */
export class AgentKey {
  private constructor(
    private readonly key: CryptoKey,
    readonly publicKey: string,
  ) {}

  /** A fresh, temporary key (used when no seed is configured). */
  static generate(): Promise<AgentKey> {
    return AgentKey.fromSeed(toB64url(crypto.getRandomValues(new Uint8Array(32))));
  }

  /** Restores a key from its 32-byte seed, base64url. */
  static async fromSeed(seed: string): Promise<AgentKey> {
    const raw = fromB64url(seed.trim());
    if (raw.length !== 32) throw new Error("An agent seed is 32 bytes, base64url.");
    const key = await crypto.subtle.importKey("pkcs8", concat(PKCS8_ED25519, raw), { name: "Ed25519" }, true, ["sign"]);
    const jwk = await crypto.subtle.exportKey("jwk", key);
    if (!jwk.x) throw new Error("Could not derive the Ed25519 public key.");
    return new AgentKey(key, jwk.x);
  }

  async sign(message: string): Promise<string> {
    return toB64url(new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, this.key, utf8(message))));
  }
}

let ed25519: Promise<boolean> | null = null;
/** Whether this runtime's Web Crypto can verify Ed25519 (some older browsers can't). Cached. */
export function ed25519Supported(): Promise<boolean> {
  ed25519 ??= crypto.subtle
    .importKey("raw", new Uint8Array(32).fill(1), { name: "Ed25519" }, false, ["verify"])
    .then(() => true)
    .catch(() => false);
  return ed25519;
}

/** Verifies an Ed25519 signature against a raw public key. Never throws: malformed input is `false`. */
export async function verifyEd25519(publicKey: string, signature: string, message: string): Promise<boolean> {
  if (!PUBKEY.test(publicKey) || !SIGNATURE.test(signature)) return false;
  try {
    const key = await crypto.subtle.importKey("raw", fromB64url(publicKey), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, fromB64url(signature), utf8(message));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Request signing
// ---------------------------------------------------------------------------------------------------------

export const authString = (method: string, target: string, timestamp: string, nonce: string, bodySha256: string) => `${method.toUpperCase()}\n${target}\n${timestamp}\n${nonce}\n${bodySha256}`;

/** The four X-Bloom-* headers for one request. `raw` is the exact body that will be sent ("" for none). */
export async function signedHeaders(key: AgentKey, method: string, target: string, raw: string, now = Date.now()): Promise<Record<string, string>> {
  const timestamp = String(now);
  const nonce = crypto.randomUUID();
  const signature = await key.sign(authString(method, target, timestamp, nonce, await sha256Hex(raw)));
  return { "x-bloom-pubkey": key.publicKey, "x-bloom-timestamp": timestamp, "x-bloom-nonce": nonce, "x-bloom-signature": signature };
}

// ---------------------------------------------------------------------------------------------------------
// The client
// ---------------------------------------------------------------------------------------------------------

export class RelayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RelayError";
  }
}

export type RelayHealth = { ok: boolean; service: string; version: string; store: string; nonces: string; transports: string[]; time: string };
export type Intent = { id: string; owner: string; vertical: string; role: "buyer" | "seller"; capabilityTags: string[]; spec: Record<string, unknown>; status: string; createdAt: string; expiresAt: string };
export type MoveInput =
  | { type: "COUNTER"; terms: Record<string, unknown>; mandateCommitment?: string }
  | { type: "ACCEPT"; mandateCommitment?: string }
  | { type: "REJECT" }
  | { type: "CLEAR"; receipt: Record<string, unknown>; signatures: { buyer: string; seller: string } };

export type RelayClientOptions = {
  baseUrl?: string;
  key: AgentKey;
  fetch?: typeof fetch;
  /** Called with every request body before it is signed and sent; throw to refuse it. */
  beforeSend?: (path: string, body: unknown) => void;
  timeoutMs?: number;
};

export class RelayClient {
  readonly baseUrl: string;
  readonly key: AgentKey;
  private readonly f: typeof fetch;
  private readonly beforeSend?: (path: string, body: unknown) => void;
  private readonly timeoutMs: number;

  constructor(opts: RelayClientOptions) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_RELAY_URL).replace(/\/+$/, "");
    this.key = opts.key;
    this.f = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.beforeSend = opts.beforeSend;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  private async call<T>(method: "GET" | "POST", target: string, opts: { body?: unknown; signed?: boolean } = {}): Promise<T> {
    if (opts.body !== undefined) this.beforeSend?.(target, opts.body);
    const raw = opts.body === undefined ? "" : JSON.stringify(opts.body);
    const headers: Record<string, string> = { Accept: "application/json", ...(raw && { "Content-Type": "application/json" }) };
    if (opts.signed) Object.assign(headers, await signedHeaders(this.key, method, target, raw));
    const res = await this.f(`${this.baseUrl}${target}`, { method, headers, body: raw || undefined, cache: "no-store", signal: AbortSignal.timeout(this.timeoutMs) });
    const j = (await res.json().catch(() => null)) as (T & { error?: { code?: string; message?: string } }) | null;
    if (!res.ok || !j) throw new RelayError(res.status, j?.error?.code ?? "http_error", j?.error?.message ?? `relay answered ${res.status}`);
    return j;
  }

  health() {
    return this.call<RelayHealth>("GET", "/health");
  }

  registerAgent(profile: { displayName: string; org: string }) {
    return this.call<{ agent: { pubkey: string } }>("POST", "/v1/agents", { body: profile, signed: true });
  }

  publishIntent(intent: { vertical: string; role: "buyer" | "seller"; capabilityTags: string[]; spec: Record<string, unknown>; ttlSeconds: number }) {
    return this.call<{ intent: Intent }>("POST", "/v1/intents", { body: intent, signed: true }).then((r) => r.intent);
  }

  openRoom(input: { intentId: string; terms: Record<string, unknown>; mandateCommitment: string; maxRounds: number; ttlSeconds: number }) {
    return this.call<{ room: Room; event: RoomEvent }>("POST", "/v1/rooms", { body: input, signed: true });
  }

  getRoom(roomId: string) {
    return this.call<{ room: Room; events: RoomEvent[] }>("GET", `/v1/rooms/${encodeURIComponent(roomId)}`, { signed: true });
  }

  move(roomId: string, move: MoveInput) {
    return this.call<{ room: Room; event: RoomEvent }>("POST", `/v1/rooms/${encodeURIComponent(roomId)}/events`, { body: move, signed: true });
  }

  /** Public: a cleared receipt with both signatures and its ledger inclusion proof. */
  getReceipt(hash: string) {
    if (!/^[0-9a-f]{64}$/.test(hash)) throw new RelayError(400, "bad_hash", "A receipt hash is 64 lowercase hex characters.");
    return this.call<ReceiptPayload>("GET", `/v1/receipts/${hash}`);
  }
}

/** The verifier page for a receipt hash. */
export const verifierLink = (verifierUrl: string, hash: string) => `${verifierUrl.replace(/\/+$/, "")}/r/${hash}`;
