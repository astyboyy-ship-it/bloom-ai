import { A2A_HEADERS } from "@/lib/exchange/gateway";
import { listPulse } from "@/lib/exchange/intent-store";
import { aggregatePulse, type PulseSample } from "@/lib/exchange/omni-adapter";

export const dynamic = "force-dynamic";

/** Global telemetry pulse: aggregates over the last 15 minutes. Numbers only, so it is safe to serve publicly. */
export async function GET() {
  return Response.json(aggregatePulse(await listPulse<PulseSample>()), { headers: { ...A2A_HEADERS, "Cache-Control": "no-store" } });
}
