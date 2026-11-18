"use client";

import { useState } from "react";
import { AlertTriangle, BookCheck, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useExchangeCopy } from "./copy";
import { Badge, Panel, PanelHeader, usd } from "./ui";
import type { Exchange, Row } from "./use-exchange";

export function Ledger({ x, onInspect }: { x: Exchange; onInspect: (taskId: string) => void }) {
  const t = useExchangeCopy().ledger;
  const [tab, setTab] = useState<"settled" | "exceptions">("settled");
  const [pending, setPending] = useState<string | null>(null);
  const settled = x.rows.filter((r) => r.state === "completed");
  const exceptions = x.rows.filter((r) => r.state === "input_required");
  const rows = tab === "settled" ? settled : exceptions;

  const decide = async (r: Row, action: "override" | "reject") => {
    setPending(r.taskId);
    const v = await x.decide(r.taskId, action);
    setPending(null);
    if (!v) toast.error(action === "override" ? t.override : t.reject);
    else if (v.certificate) {
      toast.success(v.certificate.certificateId);
      onInspect(v.taskId);
    }
  };

  return (
    <Panel className="xl:col-span-5">
      <PanelHeader icon={BookCheck} title={t.title} />
      <div role="tablist" className="mt-3 inline-flex rounded-lg border border-white/[0.07] bg-black/30 p-0.5">
        {(["settled", "exceptions"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors", tab === k ? "bg-white/[0.07] text-white" : "text-white/45 hover:text-white")}
          >
            {k === "exceptions" && exceptions.length > 0 && <span className="size-1.5 animate-pulse rounded-full bg-amber-300" />}
            {t[k]} <span className="tabular-nums text-white/40">{k === "settled" ? settled.length : exceptions.length}</span>
          </button>
        ))}
      </div>

      <ul className="mt-3 max-h-[440px] space-y-1.5 overflow-y-auto pe-1">
        {rows.length === 0 && <li className="py-8 text-center text-[11.5px] leading-relaxed text-white/35">{tab === "settled" ? t.empty : t.noExceptions}</li>}
        {rows.map((r) => (
          <li key={r.taskId} className={cn("animate-row-in rounded-lg border p-2.5", r.state === "input_required" ? "border-amber-300/20 bg-amber-300/[0.03]" : "border-white/[0.06] bg-black/20")}>
            <button type="button" onClick={() => onInspect(r.taskId)} className="block w-full text-start">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("truncate font-mono text-[11px]", r.certificateId ? "text-os-emerald" : "text-amber-200")} dir="ltr">
                  {r.certificateId ?? r.taskId}
                </span>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-white" dir="ltr">
                  {usd(r.priceUsd)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-white/45">
                <span className="max-w-[140px] truncate">{r.peer.name}</span>
                <span className="text-white/20">·</span>
                <span className="tabular-nums">
                  {r.rounds} {t.rounds}
                </span>
                <span className="text-white/20">·</span>
                <span className={cn("tabular-nums", r.trust < 40 ? "text-amber-200" : "")}>
                  {t.trust} {r.trust}
                </span>
                <Badge className="ms-auto">{t.env[r.environment]}</Badge>
                <Badge tone={r.source === "live" ? "emerald" : "muted"}>{r.source}</Badge>
              </div>
            </button>
            {r.state === "input_required" && r.exception && (
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-2">
                <span className="flex items-center gap-1 text-[10.5px] text-amber-200">
                  <AlertTriangle className="size-3" /> {t.kinds[r.exception]}
                </span>
                <span className="ms-auto flex gap-1.5">
                  {r.exception !== "sla_infeasible" && (
                    <button type="button" disabled={pending === r.taskId} onClick={() => void decide(r, "override")} className="flex items-center gap-1 rounded-md border border-os-emerald/40 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-os-emerald hover:bg-os-emerald/10 disabled:opacity-40">
                      <Check className="size-3" /> {t.override}
                    </button>
                  )}
                  <button type="button" disabled={pending === r.taskId} onClick={() => void decide(r, "reject")} className="flex items-center gap-1 rounded-md border border-red-300/35 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-red-200 hover:bg-red-400/10 disabled:opacity-40">
                    <X className="size-3" /> {t.reject}
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
