"use client";

import { useEffect, useState } from "react";
import { Check, Download, FileSignature, Loader2, PenLine, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { money } from "@/lib/aware-marketing/engine";
import { Button } from "../../command-center/kit";
import { download, Field, inputCls, PageBar, Panes, PaneSection } from "../frame";
import { useDealParam } from "./pipeline";
import { useMarketing, verify } from "./store";

/** Signature vault: every signed agreement, its fingerprint check, and downloads. */
export function AgreementsPage() {
  const m = useMarketing();
  const param = useDealParam();
  const signedIds = Object.keys(m.signed);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const id = selectedId ?? (param && m.signed[param] ? param : signedIds[0]);
  const rec = id ? m.signed[id] : undefined;
  const deal = m.sweep.find((p) => p.id === id);
  const [check, setCheck] = useState<"idle" | "ok" | "bad">("idle");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => setCheck("idle"), [id]);

  const ready = m.rows.filter((r) => !r.f.blocked && m.stageOf(r.p) === "agreed");
  const total = signedIds.reduce((a, k) => a + m.signed[k].price, 0);

  return (
    <>
      <PageBar
        icon={FileSignature}
        accent="#ffc36b"
        title="Agreement vault"
        meta={`${signedIds.length} signed · ${money(total)} contracted`}
        actions={
          signedIds.length > 0 && (
            <Button size="sm" onClick={() => download("agreements.json", JSON.stringify(m.signed, null, 2), "application/json")}>
              <Download className="size-3.5" /> Export all
            </Button>
          )
        }
      />
      <Panes
        leftWidth={300}
        left={
          <>
            <PaneSection title={`Signed · ${signedIds.length}`}>
              <ul className="space-y-1">
                {signedIds.map((k) => {
                  const p = m.sweep.find((x) => x.id === k)!;
                  return (
                    <li key={k}>
                      <button type="button" onClick={() => setSelectedId(k)} className={cn("flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px]", k === id ? "bg-white/[0.08] text-white" : "text-white/70 hover:bg-white/[0.04]")}>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{p.brand}</span>
                          <span className="block text-[11px] text-white/40">{new Date(m.signed[k].at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                        </span>
                        <span className="shrink-0 tabular-nums">{money(m.signed[k].price)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!signedIds.length && <p className="text-[12px] text-white/40">Nothing signed yet. Approve deals in Proposals or below.</p>}
            </PaneSection>
            <PaneSection title={`Ready to sign · ${ready.length}`}>
              <Field label="Sign as">
                <input className={inputCls} value={m.signer} onChange={(e) => m.setSigner(e.target.value)} />
              </Field>
              <ul className="mt-2 space-y-1">
                {ready.map(({ p }) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="truncate text-white/80">{p.brand}</span>
                    <Button
                      size="sm"
                      disabled={!!busy || !m.signer.trim()}
                      onClick={async () => {
                        setBusy(p.id);
                        await m.sign(p);
                        setBusy(null);
                        setSelectedId(p.id);
                        toast.success(`Signed with ${p.brand}`);
                      }}
                    >
                      {busy === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <PenLine className="size-3.5" />} {money(p.negotiated)}
                    </Button>
                  </li>
                ))}
              </ul>
            </PaneSection>
          </>
        }
        right={
          rec && deal ? (
            <>
              <PaneSection title="Integrity">
                <p className="break-all font-mono text-[11px] leading-relaxed text-white/60">sha256 {rec.hash}</p>
                <p className="mt-1 text-[11.5px] text-white/45">
                  Signed by {rec.signer} · {rec.at.replace("T", " ").slice(0, 19)} UTC
                </p>
                <Button
                  size="sm"
                  className="mt-2.5 w-full"
                  onClick={async () => {
                    const ok = await verify(rec);
                    setCheck(ok ? "ok" : "bad");
                  }}
                >
                  <ShieldCheck className="size-3.5" /> Verify fingerprint
                </Button>
                {check === "ok" && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#9fd3a8]">
                    <Check className="size-3.5" /> Text matches the fingerprint: unchanged since signing.
                  </p>
                )}
                {check === "bad" && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#ff9d90]">
                    <ShieldAlert className="size-3.5" /> The text no longer matches its fingerprint.
                  </p>
                )}
              </PaneSection>
              <PaneSection title="Download">
                <Button variant="primary" className="w-full" onClick={() => download(`${deal.brand.toLowerCase()}-agreement.txt`, rec.text)}>
                  <Download className="size-3.5" /> Agreement (.txt)
                </Button>
                <p className="mt-2.5 text-[11px] text-white/35">No e-signature provider is connected: this is the signature-ready agreement with your typed signature and fingerprint. The brand&apos;s countersignature line is left open.</p>
              </PaneSection>
            </>
          ) : null
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#0b0a0e]/60 p-4">
          {rec ? (
            <pre className="mx-auto max-w-3xl whitespace-pre-wrap rounded-lg border border-white/[0.08] bg-[#f6f3ec] p-8 font-mono text-[12px] leading-relaxed text-[#1d1a14]">{rec.text}</pre>
          ) : (
            <p className="py-16 text-center text-[13px] text-white/40">Signed agreements open here.</p>
          )}
        </div>
      </Panes>
    </>
  );
}
