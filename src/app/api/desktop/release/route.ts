import { ok } from "@/lib/demo-http";
import { desktopConfig, releaseSummary } from "@/lib/desktop/releases";

export const dynamic = "force-dynamic";

/** Which desktop installers are published right now (names and sizes only; downloads go through /api/desktop/download). */
export async function GET() {
  return ok(await releaseSummary(desktopConfig(), { next: { revalidate: 300 } }));
}
