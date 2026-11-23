import { fail, ok, rateLimited } from "@/lib/demo-http";
import { scoutConfig } from "@/lib/scout/config";
import { AgentKey, RelayClient, RelayError } from "@/lib/scout/relay-client";
import { verifyReceiptPayload } from "@/lib/scout/relay-protocol";
import { EXAMPLE_HASHES } from "@/lib/scout/scenarios";

export const dynamic = "force-dynamic";

/**
 * A cleared receipt from the relay, with Bloom AI's own verification of it (hash, both signatures, ledger inclusion,
 * revocation). The desk re-runs the same checks in the browser. Example hashes from the illustrative feed are refused:
 * they are not on the ledger and are never looked up.
 */
export async function GET(req: Request, { params }: { params: Promise<{ hash: string }> }) {
  if (rateLimited(req, "scout-receipt", 30)) return fail(429, "Too many requests. Try again in a minute.");
  const { hash } = await params;
  if (!/^[0-9a-f]{64}$/.test(hash)) return fail(400, "A receipt hash is 64 lowercase hex characters.");
  if (EXAMPLE_HASHES.has(hash)) return fail(400, "That is an example hash from an illustrative blueprint. It is not on the ledger.", { code: "example_hash" });
  const cfg = scoutConfig();
  try {
    // Reading a receipt is unsigned; the key is only there because the client always carries one.
    const relay = new RelayClient({ baseUrl: cfg.relayUrl, key: await AgentKey.generate() });
    const payload = await relay.getReceipt(hash);
    return ok({ payload, verification: await verifyReceiptPayload(payload, hash) });
  } catch (err) {
    if (err instanceof RelayError) return fail(err.status === 404 ? 404 : 502, err.status === 404 ? "The relay has no receipt with that hash." : `The relay could not be reached: ${err.message}`);
    return fail(502, "The relay could not be reached.");
  }
}
