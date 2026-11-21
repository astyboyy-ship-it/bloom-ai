import { brandOf, companyById } from "@/components/pulse/companies";
import { buildBrief, usdFromCents, type Brief } from "@/lib/scout/brief";
import type { ScoutRun } from "@/lib/scout/types";
import type { ScoutCopy } from "./copy";

/** A hash shortened for display: first 8 and last 6 characters. */
export const short = (h: string) => (h.length > 20 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h);

/**
 * Who the counterpart is, as the desk names it. Illustrative blueprints show the company through the brand gate
 * (Tesla or Epic Games only in the private showcase, fictional names otherwise). Live runs never show a company:
 * they ran between two Bloom-owned sandbox agents, so they name the sandbox persona instead.
 */
export function counterpartName(run: ScoutRun, c: ScoutCopy): string {
  if (run.mode === "live") return c.scenario[run.scenario].counterpart;
  const company = companyById(run.company);
  return company ? brandOf(company).name : c.scenario[run.scenario].counterpart;
}

/** The price the counterpart stopped at: the offer the gap note follows. */
export const gapPrice = (run: ScoutRun) => run.moves.find((m) => m.seq === run.gap.note.afterSeq)?.priceAtomic ?? run.standingPriceAtomic;

/** The brief's four sections as plain text, in the reader's language. Used for the approval queue entry. */
export function briefSections(run: ScoutRun, c: ScoutCopy, brief: Brief = buildBrief(run)) {
  const h = brief.happened;
  const reason = c.reasons[brief.admission.note.reason];
  const proof =
    brief.proof.kind === "receipt"
      ? `${c.proof.receipt}: receipt_hash ${brief.proof.receiptHash}, transcript_head ${brief.proof.transcriptHead}, ledger_root ${brief.proof.ledgerRoot}. ${brief.proof.verifyUrl}`
      : brief.proof.kind === "transcript"
        ? `${c.proof.transcript}: room_id ${brief.proof.roomId}, transcript_hash ${brief.proof.transcriptHash}. ${c.proof.impasse}`
        : `${c.badges.example}. ${c.proof.example}`;
  return {
    happened: c.brief.happened(h.counters, usdFromCents(h.openingAtomic), usdFromCents(h.standingAtomic), c.outcome[h.outcome], Math.max(1, Math.round(h.durationMs / 1000))),
    admission: `${c.states[brief.admission.kind]} · ${c.gap.round(brief.admission.note.round)} · “${reason.quote(usdFromCents(gapPrice(run)))}” ${c.gap.missing}: ${reason.missing}. ${c.gap.record}, ${c.gap.bound(brief.admission.note.afterSeq)} (${brief.admission.note.transcriptHash}).`,
    proof,
    decision: [c.brief.lead[brief.decision.kind], ...brief.decision.options.map((o) => `• ${c.brief.options[o.id]("priceAtomic" in o ? usdFromCents(o.priceAtomic) : "maxAtomic" in o ? usdFromCents(o.maxAtomic) : "")}`), c.brief.ceiling(usdFromCents(brief.decision.ownerLimitAtomic)), c.brief.sandbox].join("\n"),
  };
}

export function briefText(run: ScoutRun, c: ScoutCopy): string {
  const s = briefSections(run, c);
  return [`${c.brief.sections.happened}\n${s.happened}`, `${c.brief.sections.admission}\n${s.admission}`, `${c.brief.sections.proof}\n${s.proof}`, `${c.brief.sections.decision}\n${s.decision}`].join("\n\n");
}
