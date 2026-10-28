import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";

const KEY_PREFIX = "wfa_live_";

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/** Creates a key and returns the plaintext once; only the hash is stored. */
export async function createApiKey(workspaceId: string, name: string) {
  const plaintext = KEY_PREFIX + randomBytes(24).toString("base64url");
  const record = await db.apiKey.create({
    data: {
      workspaceId,
      name,
      prefix: plaintext.slice(0, KEY_PREFIX.length + 6),
      hashedKey: hashKey(plaintext),
    },
  });
  return { record, plaintext };
}

/** Resolves `Authorization: Bearer wfa_live_...` to an active key + workspace. */
export async function authenticateApiKey(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const key = header.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!key?.startsWith(KEY_PREFIX)) {
    throw new HttpError(401, "Missing or malformed API key");
  }
  const apiKey = await db.apiKey.findUnique({
    where: { hashedKey: hashKey(key) },
    include: { workspace: true },
  });
  if (!apiKey || apiKey.revokedAt) throw new HttpError(401, "Invalid or revoked API key");

  // Fire-and-forget: last-used tracking must not add latency or fail the request.
  db.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return apiKey;
}
