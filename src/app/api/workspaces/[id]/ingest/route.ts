import { NextResponse } from "next/server";
import { requireOwnedWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { handle, HttpError } from "@/lib/http";
import { ingestDocument } from "@/lib/rag/store";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const TEXT_TYPES = /\.(txt|md|markdown|json|csv|tsv|log|ya?ml|tf|hcl|py|ts|js|sql)$/i;

/**
 * RAG ingestion: multipart/form-data with one or more `files` (plain-text
 * formats). Chunked with the workspace's architect-chosen strategy, embedded,
 * and stored in pgvector.
 */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  await requireOwnedWorkspace(id);

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) throw new HttpError(400, "Attach at least one file as `files`");

  const store =
    (await db.vectorStoreReference.findFirst({ where: { workspaceId: id }, orderBy: { createdAt: "asc" } })) ??
    (await db.vectorStoreReference.create({
      data: {
        workspaceId: id,
        name: "primary",
        embeddingModel: env().EMBEDDINGS_MODEL,
        dimensions: 1536,
        chunkStrategy: "recursive",
        chunkSize: 1200,
        chunkOverlap: 150,
      },
    }));

  const results: { file: string; chunks: number }[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) throw new HttpError(413, `${file.name} exceeds 5 MB`);
    if (!TEXT_TYPES.test(file.name) && !file.type.startsWith("text/")) {
      throw new HttpError(415, `${file.name}: only plain-text formats are supported`);
    }
    const { chunks } = await ingestDocument(store.id, file.name, await file.text());
    results.push({ file: file.name, chunks });
  }

  return NextResponse.json({ storeId: store.id, results });
});

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  await requireOwnedWorkspace(id);
  const stores = await db.vectorStoreReference.findMany({
    where: { workspaceId: id },
    include: { _count: { select: { chunks: true } } },
  });
  return NextResponse.json({ stores });
});
