"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardConfig, DashboardStore } from "./types";

type RagStrategy = {
  enabled: boolean;
  strategy: string;
  chunkSize: number;
  chunkOverlap: number;
  rationale: string;
};

export function KnowledgePanel({
  workspaceId,
  config,
  initialStores,
}: {
  workspaceId: string;
  config: DashboardConfig;
  initialStores: DashboardStore[];
}) {
  const [stores, setStores] = useState(initialStores);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rag = config.ragStrategy as unknown as RagStrategy;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", f);
      const res = await fetch(`/api/workspaces/${workspaceId}/ingest`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Ingestion failed");
      const total = json.results.reduce((n: number, r: { chunks: number }) => n + r.chunks, 0);
      toast.success(`Ingested ${json.results.length} file(s) · ${total} chunks`);
      const list = await fetch(`/api/workspaces/${workspaceId}/ingest`).then((r) => r.json());
      setStores(list.stores);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>RAG strategy</CardTitle>
          <CardDescription>{rag.rationale}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant={rag.enabled ? "default" : "outline"}>
              {rag.enabled ? "Recommended" : "Optional for this workflow"}
            </Badge>
            <Badge variant="outline">{rag.strategy}</Badge>
            <Badge variant="outline">{rag.chunkSize} chars</Badge>
            <Badge variant="outline">{rag.chunkOverlap} overlap</Badge>
          </div>
          <div
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center hover:bg-muted/50"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              upload(e.dataTransfer.files);
            }}
          >
            {uploading ? <Loader2 className="size-6 animate-spin" /> : <FileUp className="size-6" />}
            <p className="font-medium">Drop documents or click to upload</p>
            <p className="text-xs text-muted-foreground">
              .md, .txt, .json, .csv, .tf, .yaml, source files — up to 5 MB each
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => upload(e.target.files)}
            />
          </div>
          <Button variant="outline" className="w-full" disabled={uploading} onClick={() => inputRef.current?.click()}>
            Choose files
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vector stores</CardTitle>
          <CardDescription>
            pgvector · cosine similarity · top-6 chunks injected into the first agent and
            researchers on every run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {stores.length === 0 && <p className="text-muted-foreground">No documents ingested yet.</p>}
          {stores.map((s) => (
            <div key={s.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{s.name}</p>
                <Badge variant="outline">{s.status.toLowerCase()}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.documentCount} documents · {s._count.chunks} chunks · {s.embeddingModel} (
                {s.dimensions}d) · {s.chunkStrategy}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
