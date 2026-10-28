"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { money, USAGE_RIGHTS } from "@/lib/aware-marketing/engine";
import { STAGE_LABEL, type Proposal, type Stage } from "@/lib/studio/deals";

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10.5px] font-medium",
        stage === "signed" ? "bg-[#2ea043]/15 text-[#9fd3a8]" : stage === "agreed" ? "bg-[#ffc36b]/15 text-[#ffd59a]" : stage === "declined" ? "bg-[#ff7b6b]/12 text-[#ff9d90]" : "bg-white/[0.07] text-white/60",
      )}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

/** One overnight proposal: offer vs negotiated fee, rate lines, fixed clauses, hooks, and the email exchange. */
export function DealCard({ p, fitScore, blocked, below, stage, active, onSelect }: { p: Proposal; fitScore: number; blocked: boolean; below: boolean; stage: Stage; active: boolean; onSelect: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={cn("rounded-lg border bg-[#121116]/90 transition-colors", active ? "border-[#ffc36b]/50" : "border-white/[0.08]", (blocked || below) && "opacity-55")}>
      <button type="button" onClick={onSelect} className="block w-full px-4 pt-3 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-white">{p.brand}</span>
          <span className="text-[12px] text-white/45">{p.product}</span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] text-white/60">{p.category}</span>
          <span className="text-[11px] text-white/35">received {p.receivedAt}</span>
          <span className="ml-auto flex items-center gap-2">
            <StageBadge stage={stage} />
            <span className="text-right">
              <span className="block text-[18px] font-semibold tabular-nums leading-none text-white">{blocked ? "—" : fitScore}</span>
              <span className="block text-[9.5px] uppercase tracking-wide text-white/35">match</span>
            </span>
          </span>
        </div>

        <div className="mt-2.5 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="flex items-center gap-2 text-[13px]">
              <span className="tabular-nums text-white/50">{money(p.budget)} offered</span>
              {p.negotiated > 0 && p.negotiated !== p.budget && (
                <>
                  <ArrowRight className="size-3.5 text-white/35" />
                  <span className="font-semibold tabular-nums text-[#ffd59a]">{money(p.negotiated)}</span>
                </>
              )}
              {p.negotiated === p.budget && <span className="text-[12px] text-white/45">at your floor or above</span>}
            </p>
            <p className="mt-0.5 text-[11.5px] text-white/45">
              {p.overnight.note} · {p.overnight.at}
            </p>
            <ul className="mt-2 space-y-0.5 text-[12px] text-white/70">
              {p.analysis.lines.map((l, i) => (
                <li key={i}>
                  {l.qty}× {l.label} <span className="text-white/35">@ {money(l.unitFloor)} floor</span>
                </li>
              ))}
              <li className="text-white/50">
                {USAGE_RIGHTS[p.usage].short}
                {p.analysis.markupPct > 0 && ` · +${Math.round(p.analysis.markupPct * 100)}% usage premium`}
              </li>
            </ul>
          </div>
          {p.analysis.flags.length > 0 && (
            <ul className="space-y-1">
              {p.analysis.flags.slice(0, 3).map((fl) => (
                <li key={fl.id} className="text-[11.5px] leading-snug">
                  <span className={fl.severity === "high" ? "text-[#ff9d90]" : "text-[#ffd59a]"}>{fl.label}</span>
                  <span className="text-white/50"> → {fl.term}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </button>

      {p.hooks.length > 0 && (
        <div className="mx-4 mt-2.5 rounded-md border border-white/[0.07] bg-black/20 px-3 py-2">
          <p className="mb-1 text-[10.5px] uppercase tracking-wide text-white/35">Campaign hooks</p>
          <ul className="space-y-1">
            {p.hooks.map((h) => (
              <li key={h.id} className="text-[12.5px] text-white/80">
                <span className="mr-1.5 text-[10.5px] text-[#ffc36b]">{h.label}</span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 px-4 py-2.5 text-[11.5px] text-white/45 hover:text-white">
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />} Overnight negotiation · what the brand wrote and what was sent back
      </button>
      {open && (
        <div className="grid gap-2 px-4 pb-3 md:grid-cols-2">
          <p className="rounded-md bg-white/[0.04] p-3 text-[12px] leading-relaxed text-white/65">
            <span className="mb-1 block text-[10.5px] uppercase tracking-wide text-white/35">From {p.contact}</span>
            {p.email}
          </p>
          <pre className="whitespace-pre-wrap rounded-md bg-white/[0.04] p-3 font-sans text-[12px] leading-relaxed text-white/75">
            <span className="mb-1 block text-[10.5px] uppercase tracking-wide text-white/35">Sent on your behalf</span>
            {p.result.counterEmailDraft}
          </pre>
        </div>
      )}
    </li>
  );
}
