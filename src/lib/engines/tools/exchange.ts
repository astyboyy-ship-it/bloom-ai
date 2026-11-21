import { z } from "zod";
import { AgentKey, DEFAULT_RELAY_URL, DEFAULT_VERIFIER_URL, RelayClient, RelayError, verifierLink } from "@/lib/scout/relay-client";
import { clampPrice, commitMandate, verifyReceiptPayload } from "@/lib/scout/relay-protocol";
import { EXAMPLE_HASHES } from "@/lib/scout/scenarios";
import { tool } from "../types";

/**
 * Bloom Exchange inside the engines.
 *
 *   exchange_verify_receipt (Sovereign)  checks a counterparty's Bloom Exchange receipt before Sovereign accepts a
 *                                        settlement: canonical hash, both Ed25519 signatures, RFC 6962 ledger
 *                                        inclusion and revocation, computed here with no trust in the relay. A
 *                                        read-only lookup; it never writes to the relay.
 *   exchange_commit_terms   (Aether)     seals a price floor or ceiling as the same salted commitment the relay
 *                                        uses (bloom-mandate/1) and clamps a proposed price to it, so a pricing
 *                                        decision can later be proven without revealing the limit. No network.
 */

/** An https origin from the environment, or the default; anything else is ignored rather than trusted. */
function origin(raw: string | undefined, fallback: string): string {
  try {
    const u = new URL(raw?.trim() || fallback);
    return u.protocol === "https:" && !u.username && !u.password && (u.pathname === "/" || u.pathname === "") && !u.search && !u.hash ? u.origin : fallback;
  } catch {
    return fallback;
  }
}

const atomicCents = (usd: number) => String(Math.round(usd * 100));
const usdOf = (cents: string) => Number(cents) / 100;

export function makeVerifyReceiptTool(fetchImpl?: typeof fetch) {
  return tool({
    name: "exchange_verify_receipt",
    description:
      "Verifies a Bloom Exchange settlement receipt by its 64-hex hash before a settlement is accepted: canonical hash, buyer and seller Ed25519 signatures, inclusion in the relay's public Merkle ledger, and revocation. Read-only. Returns valid=true only when every check passes.",
    input: z.object({ receiptHash: z.string().regex(/^[0-9a-f]{64}$/, "64 lowercase hex characters") }),
    async run({ receiptHash }) {
      if (EXAMPLE_HASHES.has(receiptHash)) return { receiptHash, valid: false, status: "example", note: "An example hash from an illustrative blueprint; it is not on the ledger and was not looked up." };
      const relayUrl = origin(process.env.BLOOM_RELAY_URL, DEFAULT_RELAY_URL);
      const verifierUrl = origin(process.env.BLOOM_VERIFIER_URL, DEFAULT_VERIFIER_URL);
      // Reading a receipt is unsigned; the client always carries a key, so a throwaway one is used.
      const relay = new RelayClient({ baseUrl: relayUrl, key: await AgentKey.generate(), fetch: fetchImpl, timeoutMs: 8_000 });
      try {
        const p = await relay.getReceipt(receiptHash);
        const v = await verifyReceiptPayload(p);
        return {
          receiptHash,
          valid: v.valid,
          status: v.valid ? "verified" : "failed",
          checks: v.checks,
          vertical: p.receipt.vertical,
          price: { atomic: p.receipt.priceAtomic, currency: p.receipt.currency },
          rounds: p.receipt.rounds,
          ledger: { root: p.ledger.root, leafIndex: p.ledger.leafIndex, treeSize: p.ledger.treeSize },
          verifyUrl: verifierLink(verifierUrl, receiptHash),
        };
      } catch (err) {
        if (err instanceof RelayError && err.status === 404) return { receiptHash, valid: false, status: "not_found", note: "The relay has no receipt with this hash." };
        return { receiptHash, valid: false, status: "unreachable", note: `The relay could not be reached: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  });
}

export const exchangeVerifyReceipt = makeVerifyReceiptTool();

export const exchangeCommitTerms = tool({
  name: "exchange_commit_terms",
  description:
    "Seals a price limit as a Bloom Exchange mandate commitment (salted SHA-256, the relay's bloom-mandate/1 format) and clamps a proposed price to it: a seller never goes below its floor, a buyer never above its ceiling. Returns the commitment to share and the opening to keep private.",
  input: z.object({
    role: z.enum(["buyer", "seller"]),
    limitUsd: z.number().positive().max(10_000_000),
    proposedUsd: z.number().positive().max(10_000_000),
    vertical: z.enum(["api.inference", "compute.gpu", "data.retrieval"]).default("api.inference"),
  }),
  async run({ role, limitUsd, proposedUsd, vertical }) {
    const mandate = { vertical, role, currency: "USD", limitAtomic: atomicCents(limitUsd) };
    const clamped = clampPrice(atomicCents(proposedUsd), mandate);
    const { commitment, salt } = await commitMandate(mandate);
    return {
      commitment,
      clampedUsd: usdOf(clamped),
      clamped: clamped !== atomicCents(proposedUsd),
      rule: role === "seller" ? "Never below the sealed floor" : "Never above the sealed ceiling",
      // Opening the commitment reveals the limit, so it stays with the operator: share only `commitment`.
      opening: { mandate, salt, note: "Keep private. Revealing it later proves the price sat inside the limit." },
    };
  },
});
