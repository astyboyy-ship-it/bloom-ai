"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildBrief, usdFromCents } from "@/lib/scout/brief";
import type { ScoutRun } from "@/lib/scout/types";
import { counterpartName, gapPrice } from "./brief-text";
import { useScoutCopy } from "./copy";
import { GapCallout, GAP_TONE } from "./feed-card";
import { ReceiptPanel } from "./receipt-panel";

/** The Surprise Negotiation Brief, as a dialog: four numbered sections, built from the run's record alone. */
export function BriefView({ run, onClose }: { run: ScoutRun; onClose: () => void }) {
  const c = useScoutCopy();
  const brief = buildBrief(run);
  const close = useRef<HTMLButtonElement>(null);
  const h = brief.happened;
  const tone = GAP_TONE[brief.decision.kind];

  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="scout-brief-title" className="os-panel w-full max-w-2xl rounded-2xl p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="os-label text-os-cyan/80">{counterpartName(run, c)} · {c.scenario[run.scenario].title}</p>
            <h2 id="scout-brief-title" className="mt-1 text-[24px] font-semibold tracking-[-0.01em] text-white">
              {c.brief.title}
            </h2>
            <p className="mt-1 text-[12px] text-white/45">{run.mode === "live" ? c.badges.live : c.badges.illustrative} · {c.badges.sandbox}</p>
          </div>
          <button ref={close} type="button" onClick={onClose} aria-label={c.brief.close} className="rounded-full border border-white/15 p-1.5 text-white/60 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        <section className="mt-5">
          <h3 className="os-label">{c.brief.sections.happened}</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/80">{c.brief.happened(h.counters, usdFromCents(h.openingAtomic), usdFromCents(h.standingAtomic), c.outcome[h.outcome], Math.max(1, Math.round(h.durationMs / 1000)))}</p>
        </section>

        <section className="mt-5">
          <h3 className="os-label">{c.brief.sections.admission}</h3>
          <div className="mt-1.5">
            <GapCallout run={run} />
          </div>
        </section>

        <section className="mt-5">
          <h3 className="os-label">{c.brief.sections.proof}</h3>
          <div className="mt-1.5">
            <ReceiptPanel proof={run.proof} />
          </div>
        </section>

        <section className="mt-5">
          <h3 className="os-label">{c.brief.sections.decision}</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/80">{c.brief.lead[brief.decision.kind]}</p>
          <ul className="mt-2 grid gap-1.5">
            {brief.decision.options.map((o) => (
              <li key={o.id} className={cn("rounded-lg border px-3 py-2 text-[13px] text-white/85", tone.border, tone.bg)}>
                {c.brief.options[o.id]("priceAtomic" in o ? usdFromCents(o.priceAtomic) : "maxAtomic" in o ? usdFromCents(o.maxAtomic) : "")}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-white/50">{c.brief.ceiling(usdFromCents(brief.decision.ownerLimitAtomic))}</p>
          <p className="mt-1 text-[12px] text-white/50">{c.brief.notify[brief.decision.kind](counterpartName(run, c), usdFromCents(gapPrice(run)))}</p>
          <p className="mt-3 border-t border-white/10 pt-3 text-[11.5px] text-white/40">{c.brief.sandbox}</p>
        </section>
      </div>
    </div>
  );
}
