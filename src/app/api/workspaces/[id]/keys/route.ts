import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiKey } from "@/lib/apikeys";
import { requireOwnedWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { handle } from "@/lib/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const keySelect = {
  id: true,
  name: true,
  prefix: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const;

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  await requireOwnedWorkspace(id);
  const keys = await db.apiKey.findMany({
    where: { workspaceId: id },
    select: keySelect,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ keys });
});

const Body = z.object({ name: z.string().trim().min(1).max(60).default("Default key") });

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  await requireOwnedWorkspace(id);
  const { name } = Body.parse(await req.json().catch(() => ({})));
  const { record, plaintext } = await createApiKey(id, name);
  return NextResponse.json(
    {
      key: {
        id: record.id,
        name: record.name,
        prefix: record.prefix,
        createdAt: record.createdAt,
        lastUsedAt: null,
        revokedAt: null,
      },
      // Shown exactly once — only the hash is stored.
      secret: plaintext,
    },
    { status: 201 },
  );
});
