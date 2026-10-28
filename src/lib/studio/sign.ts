/**
 * Creator e-signatures: ECDSA P-256 over the agreement text, with a key pair generated once in the
 * browser and kept on this device. Anyone holding the public key can verify a signed agreement.
 */

const KEY_STORE = "bloom.s1.signingKey";

export type Signature = { hash: string; signature: string; publicKey: JsonWebKey; keyId: string };

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));

async function keyPair(): Promise<{ privateKey: CryptoKey; publicJwk: JsonWebKey }> {
  try {
    const saved = localStorage.getItem(KEY_STORE);
    if (saved) {
      const { priv, pub } = JSON.parse(saved) as { priv: JsonWebKey; pub: JsonWebKey };
      return { privateKey: await crypto.subtle.importKey("jwk", priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]), publicJwk: pub };
    }
  } catch {}
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const [priv, pub] = await Promise.all([crypto.subtle.exportKey("jwk", kp.privateKey), crypto.subtle.exportKey("jwk", kp.publicKey)]);
  try {
    localStorage.setItem(KEY_STORE, JSON.stringify({ priv, pub }));
  } catch {}
  return { privateKey: kp.privateKey, publicJwk: pub };
}

export async function signText(text: string): Promise<Signature> {
  const bytes = new TextEncoder().encode(text);
  const { privateKey, publicJwk } = await keyPair();
  const [digest, sig] = await Promise.all([crypto.subtle.digest("SHA-256", bytes), crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, bytes)]);
  const publicKey = { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y };
  const keyId = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${publicKey.x}.${publicKey.y}`))).slice(0, 16);
  return { hash: hex(digest), signature: b64(sig), publicKey, keyId };
}

/** The block appended under the agreement: everything a counterparty needs to verify it. */
export function signatureBlock(s: Signature) {
  return `
DIGITAL SIGNATURE
  Document SHA-256: ${s.hash}
  Algorithm:        ECDSA P-256 with SHA-256 over the agreement text above
  Signer key ID:    ${s.keyId}
  Public key (JWK): ${JSON.stringify(s.publicKey)}
  Signature:        ${s.signature}
`;
}
