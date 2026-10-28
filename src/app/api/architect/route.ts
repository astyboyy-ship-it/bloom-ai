import { NextResponse } from "next/server";
import { z } from "zod";
import { generateArchitecture } from "@/lib/architect/generate";
import { persistArchitecture } from "@/lib/architect/persist";
import { getCurrentUser, requireOwnedWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/http";

export const runtime = "nodejs";
// Architecting with deep reasoning can take a few minutes.
export const maxDuration = 300;

const Body = z.object({
  name: z.string().trim().min(2).max(80),
  workflowDescription: z.string().trim().min(40).max(12000),
  // Re-architect an existing workspace instead of creating a new one.
  workspaceId: z.string().optional(),
});

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "workspace"}-${Math.random().toString(36).slice(2, 8)}`;
}

export const POST = handle(async (req: Request) => {
  const body = Body.parse(await req.json());
  const user = await getCurrentUser();

  const workspace = body.workspaceId
    ? (await requireOwnedWorkspace(body.workspaceId)).workspace
    : await db.workspace.create({
        data: {
          name: body.name,
          slug: slugify(body.name),
          workflowDescription: body.workflowDescription,
          userId: user.id,
        },
      });

  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      status: "ARCHITECTING",
      name: body.name,
      workflowDescription: body.workflowDescription,
    },
  });

  try {
    const spec = await generateArchitecture(body.workflowDescription);
    const config = await persistArchitecture(workspace.id, spec);
    return NextResponse.json({ workspaceId: workspace.id, spec, configVersion: config.version });
  } catch (err) {
    await db.workspace.update({
      where: { id: workspace.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Architecture generation failed",
      },
    });
    if (err instanceof HttpError) {
      err.details = { ...(err.details as object), workspaceId: workspace.id };
    }
    throw err;
  }
});
