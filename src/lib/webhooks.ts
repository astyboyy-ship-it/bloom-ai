import "server-only";
import { createHmac, randomBytes } from "node:crypto";

export function generateWebhookSecret() {
  return "whsec_" + randomBytes(24).toString("base64url");
}

/**
 * POSTs a signed event. Receivers verify with:
 *   HMAC_SHA256(secret, `${timestamp}.${rawBody}`) === header "X-WFA-Signature" (after "v1=")
 * and should reject timestamps older than a few minutes.
 */
export async function deliverWebhook(
  target: { url: string; secret: string },
  event: string,
  payload: unknown,
) {
  const body = JSON.stringify({ event, createdAt: new Date().toISOString(), data: payload });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", target.secret).update(`${timestamp}.${body}`).digest("hex");

  const res = await fetch(target.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-WFA-Event": event,
      "X-WFA-Timestamp": timestamp,
      "X-WFA-Signature": `v1=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  return { ok: res.ok, status: res.status };
}
