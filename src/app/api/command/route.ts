import { ok, preflight } from "@/lib/demo-http";
import { decideLive } from "@/lib/guard/live-access";
import { resolveLicense } from "@/lib/licensing/server";
import { manifest } from "@/lib/orchestrator";
import { ownKeys } from "./keys";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/**
 * The runtime the Operating Desk is talking to: live or simulation, provider, model, and each engine's tools.
 * Also the desk's latency probe. With ?detail=1 it adds each engine's instructions and JSON schemas for the
 * Engine Calibration bay. It reports the mode THIS caller's runs would get: own-key headers and the license
 * header (x-bloom-license) both change it, so an unlicensed visitor sees "simulation", not the server's model.
 */
export async function GET(req: Request) {
  const detail = new URL(req.url).searchParams.get("detail") === "1";
  const own = ownKeys(req);
  const rawKey = req.headers.get("x-bloom-license");
  const decision = await decideLive(req, await resolveLicense(rawKey), own, rawKey);
  return ok(manifest(own, detail, decision.serverKey));
}
