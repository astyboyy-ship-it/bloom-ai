import { fail, ok, rateLimited } from "@/lib/demo-http";
import { getRun } from "@/lib/scout/store";

export const dynamic = "force-dynamic";

/** One stored live run. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (rateLimited(req, "scout-run-get", 60)) return fail(429, "Too many requests. Try again in a minute.");
  const { id } = await params;
  if (!/^scout-[a-z0-9]+-[0-9a-f]{8}$/.test(id)) return fail(404, "No such run.");
  const run = await getRun(id);
  return run ? ok({ run }) : fail(404, "No such run.");
}
