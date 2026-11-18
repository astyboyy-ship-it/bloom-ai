import { A2A_HEADERS, callerFor } from "@/lib/exchange/gateway";
import { nodeStatus } from "@/lib/exchange/node-status";

export const dynamic = "force-dynamic";

/** The node this terminal is connected to: mode, root fingerprint and egress posture; hardware and audit for the operator. */
export async function GET(req: Request) {
  return Response.json(await nodeStatus(await callerFor(req)), { headers: A2A_HEADERS });
}
