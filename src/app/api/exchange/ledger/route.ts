import { A2A_HEADERS, callerFor } from "@/lib/exchange/gateway";
import { operatorSummary } from "@/lib/exchange/projection";
import { ledgerIds, listTraffic, loadTask } from "@/lib/exchange/store";

export const dynamic = "force-dynamic";

/** The provider's settlement ledger, exception queue and recent traffic. Operator key only. */
export async function GET(req: Request) {
  const caller = await callerFor(req);
  if (!caller.operator) return Response.json({ error: { message: "The ledger is visible to the Operator access key only." } }, { status: 403, headers: A2A_HEADERS });
  const ids = await ledgerIds(60);
  const traffic = await listTraffic(60);
  // Exceptions never reach the ledger list itself (it holds settlements), so pull them from recent traffic too.
  const exceptionIds = traffic.filter((t) => t.kind === "exception").map((t) => t.taskId);
  const recs = (await Promise.all([...new Set([...ids, ...exceptionIds])].map(loadTask))).filter((r) => r !== null);
  const rows = recs.map(operatorSummary).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return Response.json({ settled: rows.filter((r) => r.state === "completed"), exceptions: rows.filter((r) => r.state === "input_required"), traffic }, { headers: A2A_HEADERS });
}
