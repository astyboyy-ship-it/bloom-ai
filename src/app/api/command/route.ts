import { ok, preflight } from "@/lib/demo-http";
import { manifest } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/** The runtime the Operating Desk is talking to: live or simulation, provider, model, and each engine's tools. Also its latency probe. */
export function GET() {
  return ok(manifest());
}
