import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";

/**
 * Single seam for user identity. Ships as a single-owner deployment keyed on
 * DEFAULT_USER_EMAIL; swap the body for Auth.js / Clerk / your IdP session
 * lookup and every route and page picks it up.
 */
export async function getCurrentUser() {
  const email = env().DEFAULT_USER_EMAIL;
  return db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Workspace Owner" },
  });
}

export async function requireOwnedWorkspace(workspaceId: string) {
  const user = await getCurrentUser();
  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId, userId: user.id },
  });
  if (!workspace) throw new HttpError(404, "Workspace not found");
  return { user, workspace };
}
