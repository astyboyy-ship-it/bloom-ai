import "server-only";
import { createId } from "@paralleldrive/cuid2";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { chunkText, type ChunkStrategy } from "./chunk";

const EMBED_BATCH = 64;

export async function embed(inputs: string[]): Promise<number[][]> {
  const e = env();
  if (!e.EMBEDDINGS_API_KEY) throw new HttpError(500, "EMBEDDINGS_API_KEY is not configured");

  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += EMBED_BATCH) {
    const batch = inputs.slice(i, i + EMBED_BATCH);
    const res = await fetch(`${e.EMBEDDINGS_BASE_URL.replace(/\/$/, "")}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${e.EMBEDDINGS_API_KEY}`,
      },
      body: JSON.stringify({ model: e.EMBEDDINGS_MODEL, input: batch }),
    });
    if (!res.ok) {
      throw new HttpError(502, `Embedding request failed (${res.status})`, await res.text());
    }
    const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    out.push(...json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
  }
  return out;
}

const toVector = (v: number[]) => `[${v.join(",")}]`;

export async function ingestDocument(storeId: string, sourceName: string, text: string) {
  const store = await db.vectorStoreReference.findUniqueOrThrow({ where: { id: storeId } });
  const chunks = chunkText(
    text,
    store.chunkStrategy as ChunkStrategy,
    store.chunkSize,
    store.chunkOverlap,
  );
  if (chunks.length === 0) return { chunks: 0 };

  await db.vectorStoreReference.update({ where: { id: storeId }, data: { status: "PROCESSING" } });
  try {
    const vectors = await embed(chunks.map((c) => c.content));
    if (vectors[0] && vectors[0].length !== store.dimensions) {
      throw new HttpError(
        500,
        `Embedding model returned ${vectors[0].length} dims; store expects ${store.dimensions}`,
      );
    }

    // Re-ingesting a source replaces its previous chunks.
    await db.$transaction([
      db.documentChunk.deleteMany({ where: { storeId, sourceName } }),
      ...chunks.map((c, i) =>
        db.$executeRaw`
          INSERT INTO "DocumentChunk" ("id", "storeId", "sourceName", "chunkIndex", "content", "metadata", "embedding")
          VALUES (${createId()}, ${storeId}, ${sourceName}, ${c.index}, ${c.content},
                  ${JSON.stringify({ heading: c.heading ?? null })}::jsonb,
                  ${toVector(vectors[i])}::vector)`,
      ),
    ]);

    const documentCount = await db.documentChunk
      .groupBy({ by: ["sourceName"], where: { storeId } })
      .then((rows) => rows.length);
    await db.vectorStoreReference.update({
      where: { id: storeId },
      data: { status: "READY", documentCount },
    });
    return { chunks: chunks.length };
  } catch (err) {
    await db.vectorStoreReference.update({ where: { id: storeId }, data: { status: "FAILED" } });
    throw err;
  }
}

export interface RetrievedChunk {
  sourceName: string;
  content: string;
  similarity: number;
}

/** Cosine top-k across every store in the workspace. Returns [] when RAG isn't set up. */
export async function retrieve(workspaceId: string, query: string, k = 6): Promise<RetrievedChunk[]> {
  const hasChunks = await db.documentChunk.count({
    where: { store: { workspaceId } },
    take: 1,
  });
  if (!hasChunks || !env().EMBEDDINGS_API_KEY) return [];

  const [vector] = await embed([query]);
  return db.$queryRaw<RetrievedChunk[]>(Prisma.sql`
    SELECT c."sourceName", c."content", 1 - (c."embedding" <=> ${toVector(vector)}::vector) AS similarity
    FROM "DocumentChunk" c
    JOIN "VectorStoreReference" s ON s."id" = c."storeId"
    WHERE s."workspaceId" = ${workspaceId} AND c."embedding" IS NOT NULL
    ORDER BY c."embedding" <=> ${toVector(vector)}::vector
    LIMIT ${k}`);
}
