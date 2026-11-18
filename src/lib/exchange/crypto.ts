import "server-only";
import { createHash, createHmac, createPrivateKey, createPublicKey, randomBytes, sign, timingSafeEqual, type KeyObject } from "node:crypto";
import { signingInput } from "./canonical";

/**
 * Exchange key material. One secret (BLOOM_EXCHANGE_SECRET, else the deployment's LICENSE_SIGNING_SECRET) derives
 * both the Ed25519 signing key, whose public half the Agent Card publishes so anyone can verify a certificate, and
 * the HMAC key behind the operator seal. Every instance derives the same keys, so a certificate minted on one
 * verifies on all. With no secret, development uses a fixed dev seed and production an ephemeral per-instance key
 * (flagged on the card), never a guessable one.
 */
export type KeyOrigin = "configured" | "development" | "ephemeral";
export type PublicJwk = { kty: "OKP"; crv: "Ed25519"; x: string; kid: string; alg: "EdDSA"; use: "sig" };

const DEV_SECRET = "bloom-exchange-development-secret-not-for-production";
const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

type Keys = { origin: KeyOrigin; privateKey: KeyObject; jwk: PublicJwk; hmacKey: Buffer };
let cached: { secret: string | undefined; keys: Keys } | null = null;

function secret(): { value: string; origin: KeyOrigin } {
  const s = process.env.BLOOM_EXCHANGE_SECRET?.trim() || process.env.LICENSE_SIGNING_SECRET?.trim();
  if (s) return { value: s, origin: "configured" };
  if (process.env.NODE_ENV !== "production") return { value: DEV_SECRET, origin: "development" };
  return { value: randomBytes(32).toString("hex"), origin: "ephemeral" };
}

export function exchangeKeys(): Keys {
  const raw = process.env.BLOOM_EXCHANGE_SECRET?.trim() || process.env.LICENSE_SIGNING_SECRET?.trim();
  if (cached && cached.secret === raw) return cached.keys;
  const s = secret();
  const seed = createHmac("sha256", s.value).update("bloom-exchange/ed25519/v1").digest();
  const privateKey = createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]), format: "der", type: "pkcs8" });
  const pub = createPublicKey(privateKey).export({ format: "jwk" }) as { x: string };
  const kid = `bxk-${sha256Hex(pub.x).slice(0, 16)}`;
  const hmacKey = createHmac("sha256", s.value).update("bloom-exchange/hmac-seal/v1").digest();
  const keys: Keys = { origin: s.origin, privateKey, jwk: { kty: "OKP", crv: "Ed25519", x: pub.x, kid, alg: "EdDSA", use: "sig" }, hmacKey };
  cached = { secret: raw, keys };
  return keys;
}

export const sha256Hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

export function signDigest(digest: string): string {
  return sign(null, Buffer.from(signingInput(digest), "utf8"), exchangeKeys().privateKey).toString("base64url");
}

export function signString(s: string): string {
  return sign(null, Buffer.from(s, "utf8"), exchangeKeys().privateKey).toString("base64url");
}

export function sealDigest(digest: string): string {
  return createHmac("sha256", exchangeKeys().hmacKey).update(signingInput(digest)).digest("base64url");
}

export function verifySeal(digest: string, seal: string): boolean {
  const expected = Buffer.from(sealDigest(digest));
  const got = Buffer.from(seal);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/** HMAC for outbound settlement webhooks (Stripe-style `t=…,v1=…`). */
export function webhookSignature(body: string, timestamp: number): string {
  const v1 = createHmac("sha256", exchangeKeys().hmacKey).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

export const randomId = (prefix: string, bytes = 16) => `${prefix}${randomBytes(bytes).toString("base64url")}`;
export const randomHex = (bytes = 32) => randomBytes(bytes).toString("hex");
