import { NextResponse } from "next/server";
import { requireOwnedWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; keyId: string }> };

/** Revokes (soft-deletes) a key so usage history stays attributable. */
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { id, keyId } = await params;
  await requireOwnedWorkspace(id);
  const result = await db.apiKey.updateMany({
    where: { id: keyId, workspaceId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) throw new HttpError(404, "Key not found or already revoked");
  return NextResponse.json({ revoked: true });
});
