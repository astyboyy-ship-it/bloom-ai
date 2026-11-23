"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, FileLock2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ed25519Supported } from "@/lib/scout/relay-client";
import { verifyReceiptPayload, type ReceiptChecks, type ReceiptPayload } from "@/lib/scout/relay-protocol";
import type { Proof } from "@/lib/scout/types";
import { short } from "./brief-text";
import { useScoutCopy } from "./copy";

type Verified = { by: "browser" | "server"; valid: boolean; checks: ReceiptChecks; leafIndex: number; treeSize: number };

function Field({ k, v, example }: { k: string; v: string; example?: boolean }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2 font-mono text-[11.5px]">
      <dt className="shrink-0 text-white/40">{k}</dt>
      <dd title={v} className={cn("min-w-0 truncate tabular-nums", example ? "text-white/45" : "text-white/85")} dir="ltr">
        {short(v)}
      </dd>
    </div>
  );
}

/**
 * The proof behind a feed entry. Only a live `receipt` is ever looked up: it is fetched through /api/scout/receipts
 * and re-verified here in the browser (hash, both signatures, ledger inclusion). Example proofs and impasse
 * transcript references render from the record alone, with no network request.
 */
export function ReceiptPanel({ proof }: { proof: Proof }) {
  const c = useScoutCopy();
  const live = proof.kind === "receipt";
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; result?: Verified }>({ status: live ? "loading" : "idle" });
  const hash = live ? proof.receiptHash : null;

  useEffect(() => {
    if (!hash) return;
    let gone = false;
    (async () => {
      try {
        const r = await fetch(`/api/scout/receipts/${hash}`, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { payload: ReceiptPayload; verification: { valid: boolean; checks: ReceiptChecks } };
        // Checked again here, with no trust in the server; only a browser without Ed25519 shows the server's result.
        const local = (await ed25519Supported()) ? await verifyReceiptPayload(j.payload, hash) : null;
        const v: Verified = { by: local ? "browser" : "server", ...(local ?? j.verification), leafIndex: j.payload.ledger.leafIndex, treeSize: j.payload.ledger.treeSize };
        if (!gone) setState({ status: "done", result: v });
      } catch {
        if (!gone) setState({ status: "error" });
      }
    })();
    return () => {
      gone = true;
    };
  }, [hash]);

  if (proof.kind === "example-receipt" || proof.kind === "example-transcript") {
    return (
      <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="os-label">{proof.kind === "example-receipt" ? c.proof.receipt : c.proof.transcript}</span>
          <span className="rounded-full border border-amber-300/40 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-amber-200/85">{c.badges.example}</span>
        </div>
        <dl className="mt-2 grid gap-1 sm:grid-cols-3">
          {proof.kind === "example-receipt" ? (
            <>
              <Field k="receipt_hash" v={proof.receiptHash} example />
              <Field k="transcript_head" v={proof.transcriptHead} example />
              <Field k="ledger_root" v={proof.ledgerRoot} example />
            </>
          ) : (
            <>
              <Field k="room_id" v={proof.roomId} example />
              <Field k="transcript_hash" v={proof.transcriptHash} example />
            </>
          )}
        </dl>
        <p className="mt-2 text-[11.5px] leading-relaxed text-white/45">{proof.kind === "example-transcript" ? `${c.proof.impasse} ` : ""}{c.proof.example}</p>
      </div>
    );
  }

  if (proof.kind === "transcript") {
    return (
      <div className="rounded-lg border border-os-line bg-white/[0.02] p-3">
        <div className="flex items-center gap-2">
          <FileLock2 className="size-3.5 text-os-violet" />
          <span className="os-label">{c.proof.transcript}</span>
        </div>
        <dl className="mt-2 grid gap-1 sm:grid-cols-2">
          <Field k="room_id" v={proof.roomId} />
          <Field k="transcript_hash" v={proof.transcriptHash} />
        </dl>
        <p className="mt-2 text-[11.5px] leading-relaxed text-white/55">{c.proof.impasse}</p>
      </div>
    );
  }

  const r = state.result;
  return (
    <div className="rounded-lg border border-os-emerald/25 bg-os-emerald/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="os-label text-os-emerald/80">{c.proof.receipt}</span>
        <a href={proof.verifyUrl} target="_blank" rel="noreferrer" className="ms-auto inline-flex items-center gap-1 rounded-full border border-os-emerald/40 px-2.5 py-1 text-[11.5px] text-os-emerald hover:bg-os-emerald/10">
          {c.proof.verify} <ArrowUpRight className="size-3 rtl:-scale-x-100" />
        </a>
      </div>
      <dl className="mt-2 grid gap-1 sm:grid-cols-3">
        <Field k="receipt_hash" v={proof.receiptHash} />
        <Field k="transcript_head" v={proof.transcriptHead} />
        <Field k="ledger_root" v={proof.ledgerRoot} />
      </dl>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        {state.status === "loading" && (
          <span className="inline-flex items-center gap-1.5 text-white/50">
            <Loader2 className="size-3 animate-spin" /> {c.proof.checking}
          </span>
        )}
        {state.status === "error" && <span className="text-amber-200/80">{c.proof.unreachable}</span>}
        {r && (
          <>
            {(Object.keys(r.checks) as (keyof ReceiptChecks)[]).map((k) => (
              <span key={k} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono", r.checks[k] === "pass" ? "border-os-emerald/35 text-os-emerald" : "border-red-400/40 text-red-300")}>
                {r.checks[k] === "pass" ? <Check className="size-3" /> : <X className="size-3" />} {c.proof.checks[k]}
              </span>
            ))}
            <span className="font-mono text-white/40">{c.proof.leaf(r.leafIndex, r.treeSize)}</span>
            <span className={cn("ms-auto", r.valid ? "text-os-emerald/85" : "text-red-300")}>{r.valid ? (r.by === "browser" ? c.proof.inBrowser : c.proof.byServer) : c.proof.failed}</span>
          </>
        )}
      </div>
    </div>
  );
}
