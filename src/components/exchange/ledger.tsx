"use client";

import { useState } from "react";
import { AlertTriangle, BookCheck, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useExchangeCopy } from "./copy";
import { Badge, HashDecode, Panel, PanelHeader, usd } from "./ui";
import type { Exchange, Row } from "./use-exchange";

/** Exceptions with no counter terms to settle on (or capacity that doesn't exist) can only be rejected. */
const REJECT_ONLY = new Set(["sla_infeasible", "resource_bounds"]);

export function Ledger({ x, onInspect, className }: { x: Exchange; onInspect: (taskId: string) => void; className?: string }) {
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
    <Panel className={className}>
      <PanelHeader icon={BookCheck} title={t.title} />
      <div role="tablist" className="mt-3 inline-flex rounded-lg border border-[var(--xch-line)] bg-black/30 p-0.5">
        {(["settled", "exceptions"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-150", tab === k ? "bg-white/[0.07] text-white" : "text-white/45 hover:text-white")}
          >
            {k === "exceptions" && exceptions.length > 0 && <span className="size-1.5 rounded-full bg-[var(--xch-amber)]" />}
            {t[k]} <span className="tnum text-white/40">{k === "settled" ? settled.length : exceptions.length}</span>
          </button>
        ))}
      </div>

      <ul className="mt-3 max-h-[460px] space-y-1.5 overflow-y-auto pe-1">
        {rows.length === 0 && <li className="py-8 text-center text-[11.5px] leading-relaxed text-white/35">{tab === "settled" ? t.empty : t.noExceptions}</li>}
        {rows.map((r) => (
          <li key={r.taskId} className={cn("xch-row-in rounded-[10px] border p-2.5", r.state === "input_required" ? "border-[color-mix(in_srgb,var(--xch-amber)_25%,transparent)] bg-[color-mix(in_srgb,var(--xch-amber)_3%,transparent)]" : "xch-flash border-[var(--xch-line)] bg-black/20")}>
            <button type="button" onClick={() => onInspect(r.taskId)} className="block w-full text-start">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("truncate text-[11px]", r.certificateId ? "text-[var(--xch-emerald)]" : "font-mono text-[var(--xch-amber)]")} dir="ltr">
                  {r.certificateId ? <HashDecode text={r.certificateId} ms={520} /> : r.taskId}
                </span>
                <span className="tnum shrink-0 font-mono text-[12px] text-white" dir="ltr">
                  {usd(r.priceUsd)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-white/45">
                <span className="max-w-[140px] truncate">{r.peer.name}</span>
                <span className="text-white/20">·</span>
                <span className="tnum">
                  {r.rounds} {t.rounds}
                </span>
                <span className="text-white/20">·</span>
                <span className={cn("tnum", r.trust < 40 && "text-[var(--xch-rose)]")}>
                  {t.trust} {r.trust}
                </span>
                <Badge className="ms-auto">{t.env[r.environment]}</Badge>
                <Badge tone={r.source === "live" ? "emerald" : "muted"}>{r.source}</Badge>
              </div>
            </button>
            {r.state === "input_required" && r.exception && (
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--xch-line)] pt-2">
                <span className="flex items-center gap-1 text-[10.5px] text-[var(--xch-amber)]">
                  <AlertTriangle className="size-3" /> {t.kinds[r.exception]}
                </span>
                <span className="ms-auto flex gap-1.5">
                  {!REJECT_ONLY.has(r.exception) && (
                    <button type="button" disabled={pending === r.taskId} onClick={() => void decide(r, "override")} className="flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--xch-emerald)_40%,transparent)] px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--xch-emerald)] hover:bg-white/[0.04] disabled:opacity-40">
                      <Check className="size-3" /> {t.override}
                    </button>
                  )}
                  <button type="button" disabled={pending === r.taskId} onClick={() => void decide(r, "reject")} className="flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--xch-rose)_35%,transparent)] px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--xch-rose)] hover:bg-white/[0.04] disabled:opacity-40">
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
