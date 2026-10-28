"use client";

import { useEffect, useMemo, useState } from "react";
import { GitPullRequestArrow, RotateCcw, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { analyzeDeal, money, USAGE_RIGHTS, type UsageRightsKey } from "@/lib/aware-marketing/engine";
import { CREATOR, STAGE_LABEL, USAGE_ORDER, type Proposal, type Stage } from "@/lib/studio/deals";
import { Button } from "../../command-center/kit";
import { Field, inputCls, PageBar, Panes, PaneSection } from "../frame";
import { StageBadge } from "./deal-card";
import { useMarketing } from "./store";

const COLUMNS: Stage[] = ["awaiting", "agreed", "signed", "declined"];

/** Reads ?deal= after mount, so the page can stay statically rendered. */
export function useDealParam() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(new URLSearchParams(window.location.search).get("deal")), []);
  return id;
}

/** Multi-stage negotiation tracker with a counter-offer editor and each deal's clause log. */
export function PipelinePage() {
  const m = useMarketing();
  const param = useDealParam();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const id = selectedId ?? param ?? m.rows.find((r) => m.stageOf(r.p) === "awaiting")?.p.id ?? m.rows[0]?.p.id;
  const row = m.rows.find((r) => r.p.id === id);

  return (
    <>
      <PageBar icon={GitPullRequestArrow} accent="#ffc36b" title="Negotiation pipeline" meta="Move deals by countering, recording the brand's reply, or signing" />
      <Panes right={row ? <CounterEditor key={row.p.id} p={row.p} /> : null} rightWidth={400}>
        <div className="grid min-h-0 flex-1 auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3 overflow-x-auto bg-[#0b0a0e]/60 p-3">
          {COLUMNS.map((stage) => {
            const list = m.rows.filter((r) => !r.f.blocked && m.stageOf(r.p) === stage);
            return (
              <section key={stage} className="flex min-h-0 flex-col rounded-lg border border-white/[0.07] bg-black/20">
                <header className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2">
                  <span className="text-[12.5px] font-semibold text-white/90">{STAGE_LABEL[stage]}</span>
                  <span className="text-[11.5px] tabular-nums text-white/45">
                    {list.length}
                    {stage !== "declined" && list.length > 0 && ` · ${money(list.reduce((a, r) => a + r.p.negotiated, 0))}`}
                  </span>
                </header>
                <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
                  {list.map(({ p, f }) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={cn("w-full rounded-md border px-3 py-2 text-left transition-colors", p.id === id ? "border-[#ffc36b]/50 bg-white/[0.06]" : "border-white/[0.06] bg-[#121116]/80 hover:border-white/20")}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-white">{p.brand}</span>
                          <span className="shrink-0 text-[11px] tabular-nums text-white/45">match {f.score}</span>
                        </span>
                        <span className="mt-0.5 block text-[12px] tabular-nums text-white/60">
                          {money(p.budget)} → <span className="text-[#ffd59a]">{p.negotiated ? money(p.negotiated) : "—"}</span>
                        </span>
                        <span className="block truncate text-[11px] text-white/40">{p.deliverables}</span>
                        {m.preApproved[p.id] && stage === "awaiting" && <span className="mt-1 inline-block rounded bg-[#ffc36b]/12 px-1.5 text-[10.5px] text-[#ffd59a]">pre-approved</span>}
                      </button>
                    </li>
                  ))}
                  {!list.length && <li className="px-2 py-6 text-center text-[12px] text-white/35">Empty</li>}
                </ol>
              </section>
            );
          })}
        </div>
      </Panes>
    </>
  );
}

function CounterEditor({ p }: { p: Proposal }) {
  const m = useMarketing();
  const stage = m.stageOf(p);
  const [usage, setUsage] = useState<UsageRightsKey>(p.usage);
  const [price, setPrice] = useState(p.negotiated || p.result.suggestedCounterPrice);
  // The floor moves with usage rights: recompute it through the deal core, exactly as overnight.
  const a = useMemo(() => analyzeDeal({ brandName: p.brand, creatorName: CREATOR.name, budget: p.budget, deliverables: p.deliverables, usageRights: usage, tone: "warm", emailText: p.email }), [p, usage]);
  const below = price < a.floorTotal;
  const locked = stage === "signed";
  const draft = `Hi ${p.brand} team,\n\nThanks for the proposal. For ${p.analysis.lines.map((l) => `${l.qty}× ${l.label.toLowerCase()}`).join(", ")} with ${USAGE_RIGHTS[usage].label.toLowerCase()}, my rate is ${money(price)}.${a.flags.length ? `\n\nA few terms I'd adjust:\n${a.flags.map((f) => `  • ${f.term}`).join("\n")}` : ""}\n\n50% on signature, balance Net 30. Happy to lock dates as soon as you confirm.\n\n${CREATOR.name}`;

  return (
    <>
      <PaneSection title={`${p.brand} · ${p.product}`} right={<StageBadge stage={stage} />}>
        <dl className="grid grid-cols-3 gap-2 text-[12px]">
          <div>
            <dt className="text-white/45">Offer</dt>
            <dd className="tabular-nums text-white">{money(p.budget)}</dd>
          </div>
          <div>
            <dt className="text-white/45">Floor</dt>
            <dd className="tabular-nums text-white">{money(a.floorTotal)}</dd>
          </div>
          <div>
            <dt className="text-white/45">Coverage</dt>
            <dd className="tabular-nums text-white">{Math.round((p.budget / a.floorTotal) * 100)}%</dd>
          </div>
        </dl>
      </PaneSection>

      <PaneSection title="Counter-offer">
        <fieldset disabled={locked} className="space-y-2.5 disabled:opacity-50">
          <Field label="Usage rights" hint={`Floor ${money(a.baseTotal)} base + ${Math.round(a.markupPct * 100)}% usage premium`}>
            <select className={inputCls} value={usage} onChange={(e) => setUsage(e.target.value as UsageRightsKey)}>
              {USAGE_ORDER.map((u) => (
                <option key={u} value={u} className="bg-[#16141b]">
                  {USAGE_RIGHTS[u].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Your price">
            <input type="number" step={250} min={0} className={cn(inputCls, "text-[15px] font-semibold tabular-nums", below && "border-[#ff7b6b]/50")} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <div className="flex flex-wrap gap-1">
            {[
              ["Floor", a.floorTotal],
              ["+10%", a.floorTotal * 1.1],
              ["+20%", a.floorTotal * 1.2],
              ["Their offer", p.budget],
            ].map(([label, v]) => (
              <button key={label as string} type="button" onClick={() => setPrice(Math.ceil((v as number) / 250) * 250)} className="rounded bg-white/[0.06] px-2 py-1 text-[11.5px] text-white/70 hover:bg-white/[0.1]">
                {label} · {money(Math.ceil((v as number) / 250) * 250)}
              </button>
            ))}
          </div>
          {below && <p className="text-[11.5px] text-[#ff9d90]">{money(a.floorTotal - price)} under your floor for this scope.</p>}
          <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-black/25 p-2.5 font-sans text-[12px] leading-relaxed text-white/70">{draft}</pre>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              m.sendCounter(p, { price, usage });
              toast.success(`Counter sent to ${p.brand}: ${money(price)}`);
            }}
          >
            <Send className="size-3.5" /> Send counter
          </Button>
        </fieldset>
        {stage === "awaiting" && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11.5px] text-white/45">Record the brand&apos;s reply</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" onClick={() => m.recordReply(p, true)}>
                <ThumbsUp className="size-3.5" /> Accepted
              </Button>
              <Button size="sm" variant="danger" onClick={() => m.recordReply(p, false)}>
                <ThumbsDown className="size-3.5" /> Walked away
              </Button>
            </div>
          </div>
        )}
        {stage === "declined" && (
          <Button size="sm" className="mt-3 w-full" onClick={() => m.reopen(p)}>
            <RotateCcw className="size-3.5" /> Reopen negotiation
          </Button>
        )}
        {locked && <p className="mt-2 text-[11.5px] text-white/45">Signed deals are locked. See the agreement in the vault.</p>}
      </PaneSection>

      <PaneSection title="Clause log">
        <ol className="space-y-2 border-l border-white/10 pl-3">
          {m.logOf(p).map((l, i) => (
            <li key={i} className="relative text-[12px] leading-snug">
              <span className={cn("absolute -left-[17px] top-1 size-2 rounded-full", l.tone === "warn" ? "bg-[#ffc36b]" : l.tone === "ok" ? "bg-[#7ee0a1]" : "bg-white/30")} />
              <span className="mr-1.5 tabular-nums text-white/35">{l.at}</span>
              <span className="text-white/75">{l.text}</span>
            </li>
          ))}
        </ol>
      </PaneSection>
    </>
  );
}
