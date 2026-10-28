"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Moon, PenLine, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { money, USAGE_RIGHTS } from "@/lib/aware-marketing/engine";
import { STAGE_LABEL, type Stage } from "@/lib/studio/deals";
import { Button } from "../../command-center/kit";
import { Field, inputCls, PageBar, Panes, PaneSection } from "../frame";
import { DealCard } from "./deal-card";
import { BASE, useMarketing } from "./store";

/** Morning review room: everything swept overnight, best match first, with one-click signing. */
export function ProposalsPage() {
  const m = useMarketing();
  const [filter, setFilter] = useState<Stage | "all">("all");
  const [selectedId, setSelectedId] = useState("");
  const [showBlocked, setShowBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  const visible = m.rows.filter(({ p, f }) => (showBlocked || !f.blocked) && (filter === "all" || m.stageOf(p) === filter));
  const blockedCount = m.rows.filter((r) => r.f.blocked).length;
  const selected = m.rows.find((r) => r.p.id === selectedId) ?? m.rows.find((r) => !r.f.blocked && m.stageOf(r.p) === "agreed") ?? m.rows[0];
  const batch = m.rows.filter(({ p, f }) => !f.blocked && m.stageOf(p) === "agreed" && f.score >= m.criteria.minMatch);

  const approve = async () => {
    if (!selected) return;
    if (!m.signer.trim()) return toast.error("Type your name to sign.");
    setBusy(true);
    await m.sign(selected.p);
    setBusy(false);
    toast.success(`Signed with ${selected.p.brand} · ${money(selected.p.negotiated)}`);
  };
  const approveBatch = async () => {
    if (!m.signer.trim()) return toast.error("Type your name to sign.");
    setBusy(true);
    for (const { p } of batch) await m.sign(p);
    setBusy(false);
    toast.success(`${batch.length} deals signed · ${money(batch.reduce((a, r) => a + r.p.negotiated, 0))}`);
  };

  const sel = selected?.p;
  const stage = sel ? m.stageOf(sel) : "agreed";

  return (
    <>
      <PageBar
        icon={Moon}
        accent="#ffc36b"
        title="Overnight sweep results"
        meta={`${m.sweep.length} proposals swept 00:00–06:00 · each negotiated against your rate card`}
        actions={
          <>
            {(["all", "agreed", "awaiting", "signed", "declined"] as const).map((st) => (
              <button key={st} type="button" onClick={() => setFilter(st)} className={cn("h-7 rounded-md px-2.5 text-[12px]", filter === st ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white")}>
                {st === "all" ? "All" : STAGE_LABEL[st]}
              </button>
            ))}
            {blockedCount > 0 && (
              <button type="button" onClick={() => setShowBlocked((v) => !v)} className="ml-1 text-[11.5px] text-white/40 hover:text-white">
                {showBlocked ? "Hide" : "Show"} {blockedCount} blocked
              </button>
            )}
          </>
        }
      />
      <Panes
        right={
          <>
            <div className="border-b border-white/[0.07] p-4">
              <Field label="Sign as">
                <input className={cn(inputCls, "font-medium")} value={m.signer} onChange={(e) => m.setSigner(e.target.value)} />
              </Field>
            </div>
            {sel && selected && (
              <PaneSection title={`${sel.brand} · ${sel.product}`}>
                <dl className="space-y-1.5 text-[12.5px]">
                  <div className="flex justify-between">
                    <dt className="text-white/50">Fee</dt>
                    <dd className="tabular-nums text-white">
                      {sel.negotiated ? money(sel.negotiated) : "—"}
                      {sel.negotiated > sel.budget && <span className="ml-1.5 text-[11px] text-[#9fd3a8]">+{money(sel.negotiated - sel.budget)} vs offer</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-white/50">Usage</dt>
                    <dd className="text-white/85">{USAGE_RIGHTS[sel.usage].short}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-white/50">Match</dt>
                    <dd className="tabular-nums text-white">{selected.f.score}</dd>
                  </div>
                </dl>
                <ul className="mt-3 space-y-1">
                  {selected.f.reasons.map((r) => (
                    <li key={r.label} className="flex items-center gap-2 text-[12px]">
                      {r.ok ? <Check className="size-3.5 text-[#9fd3a8]" /> : <X className="size-3.5 text-[#ff9d90]" />}
                      <span className={r.ok ? "text-white/75" : "text-white/45"}>{r.label}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {stage === "signed" ? (
                    <Link href={`${BASE}/agreements?deal=${sel.id}`} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#2ea043]/30 bg-[#2ea043]/10 text-[13px] text-[#9fd3a8]">
                      <Check className="size-4" /> Signed · open in the vault
                    </Link>
                  ) : stage === "agreed" ? (
                    <Button variant="primary" className="h-11 w-full text-[14px]" disabled={busy || selected.f.blocked} onClick={approve}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />} Approve & Sign · {money(sel.negotiated)}
                    </Button>
                  ) : stage === "awaiting" ? (
                    <Button className="h-11 w-full" disabled={!!m.preApproved[sel.id]} onClick={() => { m.preApprove(sel); toast.success(`Will sign if ${sel.brand} accepts ${money(sel.negotiated)}`); }}>
                      {m.preApproved[sel.id] ? <Check className="size-4" /> : <ShieldCheck className="size-4" />} {m.preApproved[sel.id] ? "Pre-approved" : `Pre-approve at ${money(sel.negotiated)}`}
                    </Button>
                  ) : (
                    <p className="rounded-md bg-white/[0.04] px-3 py-2 text-[12px] text-white/55">Declined overnight: {sel.result.reasoning}</p>
                  )}
                  <Link href={`${BASE}/pipeline?deal=${sel.id}`} className="mt-2 block text-center text-[12px] text-white/45 hover:text-white">
                    Change the terms in the pipeline →
                  </Link>
                </div>
              </PaneSection>
            )}
            <PaneSection title="Batch">
              <p className="text-[12.5px] text-white/65">
                {batch.length} agreed deal{batch.length === 1 ? "" : "s"} at match ≥ {m.criteria.minMatch} · {money(batch.reduce((a, r) => a + r.p.negotiated, 0))}
              </p>
              <Button variant="primary" className="mt-2 w-full" disabled={busy || !batch.length} onClick={approveBatch}>
                <PenLine className="size-3.5" /> Approve & sign all {batch.length}
              </Button>
              <p className="mt-3 text-[11px] text-white/35">No e-signature provider is connected: signing generates the signature-ready agreement with your typed signature and a SHA-256 fingerprint, for the brand to countersign.</p>
            </PaneSection>
          </>
        }
      >
        <ol className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-[#0b0a0e]/60 p-3">
          {visible.map(({ p, f }) => (
            <DealCard key={p.id} p={p} fitScore={f.score} blocked={f.blocked} below={f.score < m.criteria.minMatch} stage={m.stageOf(p)} active={selected?.p.id === p.id} onSelect={() => setSelectedId(p.id)} />
          ))}
          {visible.length === 0 && <p className="py-12 text-center text-[13px] text-white/40">Nothing here.</p>}
        </ol>
      </Panes>
    </>
  );
}
