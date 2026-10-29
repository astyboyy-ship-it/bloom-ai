import { ok, preflight } from "@/lib/demo-http";
import { manifest } from "@/lib/orchestrator";
import { ownKeys } from "./keys";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/**
 * The runtime the Operating Desk is talking to: live or simulation, provider, model, and each engine's tools.
 * Also the desk's latency probe. With ?detail=1 it adds each engine's instructions and JSON schemas for the
 * Engine Calibration bay. Own-key headers change which runtime it reports, so Settings can show the effect.
 */
export function GET(req: Request) {
  const detail = new URL(req.url).searchParams.get("detail") === "1";
  return ok(manifest(ownKeys(req), detail));
}
