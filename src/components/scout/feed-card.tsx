"use client";

import { Fragment } from "react";
import { BellRing, ChevronRight, FlaskConical, Hand, Radio, ScrollText, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/pulse/brand-logo";
import { companyById } from "@/components/pulse/companies";
import { useShowcase } from "@/components/pulse/use-desktop";
import { usdFromCents } from "@/lib/scout/brief";
import type { GapKind, ScoutRun, ScoutState } from "@/lib/scout/types";
import { counterpartName, gapPrice, short } from "./brief-text";
import { useScoutCopy } from "./copy";
import { ReceiptPanel } from "./receipt-panel";

/** Gold for an authority ceiling, violet for a knowledge or policy gap: the two ways a counterpart stops. */
export const GAP_TONE: Record<GapKind, { text: string; border: string; bg: string; Icon: typeof Hand }> = {
  AUTHORITY_CEILING: { text: "text-os-gold", border: "border-os-gold/40", bg: "bg-os-gold/[0.06]", Icon: Hand },
  KNOWLEDGE_OR_POLICY_GAP: { text: "text-os-violet", border: "border-os-violet/40", bg: "bg-os-violet/[0.06]", Icon: ShieldQuestion },
};

function StateTrack({ gap }: { gap: GapKind }) {
  const c = useScoutCopy();
  const states: ScoutState[] = ["NEGOTIATING", gap, "PARTIAL_WITH_RECEIPT"];
  return (
    <ol className="flex flex-wrap items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em]">
      {states.map((s, i) => (
        <Fragment key={s}>
          {i > 0 && <ChevronRight aria-hidden className="size-3 text-white/25 rtl:-scale-x-100" />}
          <li className={cn("rounded-full border px-2 py-0.5", s === gap ? `${GAP_TONE[gap].border} ${GAP_TONE[gap].text}` : s === "PARTIAL_WITH_RECEIPT" ? "border-os-emerald/35 text-os-emerald" : "border-white/15 text-white/50")}>{c.states[s]}</li>
        </Fragment>
      ))}
    </ol>
  );
}

export function GapCallout({ run }: { run: ScoutRun }) {
  const c = useScoutCopy();
  const { note, signature } = run.gap;
  const tone = GAP_TONE[note.kind];
  const reason = c.reasons[note.reason];
  return (
    <div className={cn("rounded-lg border p-3", tone.border, tone.bg)}>
      <div className="flex flex-wrap items-center gap-2">
        <tone.Icon className={cn("size-4", tone.text)} />
        <span className={cn("font-mono text-[11px] font-semibold uppercase tracking-[0.14em]", tone.text)}>{c.states[note.kind]}</span>
        <span className="font-mono text-[10.5px] text-white/45">{c.gap.round(note.round)}</span>
        <span className="ms-auto rounded-full border border-white/15 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/55">{c.gap.record}</span>
      </div>
      <blockquote className="mt-2 border-s-2 border-white/15 ps-3 font-serif text-[15px] leading-snug text-white/85">“{reason.quote(usdFromCents(gapPrice(run)))}”</blockquote>
      <p className="mt-2 text-[12px] text-white/60">
        <span className="text-white/40">{c.gap.missing}:</span> {reason.missing}
      </p>
      <p className="mt-1.5 font-mono text-[10.5px] text-white/40" dir="auto">
        {c.gap.bound(note.afterSeq)} · <span dir="ltr">{short(note.transcriptHash)}</span> · {signature ? c.gap.signed : c.gap.unsigned}
      </p>
    </div>
  );
}

function Ladder({ run }: { run: ScoutRun }) {
  const c = useScoutCopy();
  const unit = c.scenario[run.scenario].unit;
  return (
    <ol className="grid gap-1.5">
      {run.moves.map((m) => (
        <Fragment key={m.seq}>
          <li className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12.5px]">
            <span className="w-7 font-mono text-[10.5px] tabular-nums text-white/35">#{m.seq}</span>
            <span className={cn("w-24 truncate", m.by === "owner" ? "text-os-cyan" : "text-white/75")}>{c.by[m.by]}</span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/55">{c.moves[m.type]}</span>
            {m.priceAtomic && (
              <span className="tabular-nums text-white">
                {usdFromCents(m.priceAtomic)} <span className="text-[11px] text-white/40">{unit}</span>
              </span>
            )}
            <span className="ms-auto font-mono text-[10px] text-white/30" dir="ltr" title={m.eventHash}>
              {short(m.eventHash)}
            </span>
          </li>
          {m.seq === run.gap.note.afterSeq && <GapCallout run={run} />}
        </Fragment>
      ))}
    </ol>
  );
}

/** One feed entry: who, what state, every round, where the counterpart stopped, the outcome, its proof, and the owner preview. */
export function FeedCard({ run, onOpenBrief }: { run: ScoutRun; onOpenBrief: (run: ScoutRun) => void }) {
  const c = useScoutCopy();
  const s = c.scenario[run.scenario];
  const company = companyById(run.company);
  const live = run.mode === "live";
  const name = counterpartName(run, c, useShowcase());
  const cleared = run.outcome === "CLEARED";
  return (
    <article className={cn("os-panel overflow-hidden rounded-2xl", !live && "relative")}>
      {!live && (
        <div className="flex items-center gap-2 border-b border-amber-300/25 bg-amber-300/[0.06] px-4 py-1.5 text-[11.5px] text-amber-100/85">
          <FlaskConical className="size-3.5 shrink-0 text-amber-300" /> {c.badges.illustrative}
        </div>
      )}
      <div className="p-4 sm:p-5">
        <header className="flex flex-wrap items-start gap-3">
          {live || !company ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-os-emerald/30 bg-black/50 font-mono text-[11px] text-os-emerald">SB</span>
          ) : (
            <BrandLogo company={company} size={40} />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold leading-tight text-white">
              {live ? s.title : `${name} · ${s.title}`}
            </h3>
            <p className="mt-0.5 text-[12.5px] text-white/50">
              {s.counterpart} · {s.vertical}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {live && (
              <span className="inline-flex items-center gap-1 rounded-full border border-os-emerald/40 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-os-emerald">
                <Radio className="size-3" /> {c.badges.live}
              </span>
            )}
            <span className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/55">{c.badges.sandbox}</span>
          </div>
        </header>

        <div className="mt-3">
          <StateTrack gap={run.gap.note.kind} />
        </div>

        <div className="mt-3">
          <Ladder run={run} />
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn("font-mono text-[11px] uppercase tracking-[0.14em]", cleared ? "text-os-emerald" : "text-white/60")}>{c.outcome[run.outcome]}</span>
          <span className="text-[12.5px] text-white/50">{cleared ? c.terms.cleared : c.terms.standing}:</span>
          <span className="tabular-nums text-white">
            {usdFromCents(run.standingPriceAtomic)} <span className="text-[11px] text-white/40">{s.unit}</span>
          </span>
        </div>

        <div className="mt-3">
          <ReceiptPanel proof={run.proof} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-os-line bg-os-raise/60 px-3 py-2.5">
          <BellRing className="size-4 shrink-0 text-os-cyan" />
          <div className="min-w-0 flex-1">
            <p className="os-label">{c.brief.preview}</p>
            <p className="mt-0.5 text-[13px] text-white/80">{c.brief.notify[run.gap.note.kind](name, usdFromCents(gapPrice(run)))}</p>
          </div>
          <button type="button" onClick={() => onOpenBrief(run)} className="inline-flex items-center gap-1.5 rounded-full border border-os-cyan/40 px-3 py-1.5 text-[12px] text-os-cyan hover:bg-os-cyan/10">
            <ScrollText className="size-3.5" /> {c.brief.open}
          </button>
        </div>
      </div>
    </article>
  );
}
