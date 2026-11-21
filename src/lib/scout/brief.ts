import type { GapKind, GapNote, Proof, ScoutRun } from "./types";

/**
 * The Surprise Negotiation Brief: what the owner reads when a counterpart could not close on its own. It is built
 * from the run alone (no model, no free text), so it can't say anything the record doesn't show. Four sections:
 *   happened   the rounds, from the opening offer to the outcome
 *   admission  the exact point the counterpart reached its ceiling, and the transcript hash it is bound to
 *   proof      a public receipt, a participant-only transcript reference, or (illustrative) example values
 *   decision   the opening left for the owner, with options inside the owner's own sealed ceiling
 * The UI words each part in the reader's language (components/scout/copy.ts).
 */

export type DecisionOption =
  /** Authorize the counterpart's owner path at no more than the standing price. */
  | { id: "approve_extended"; priceAtomic: string }
  /** Ask for a lower price, halfway between the owner's last offer and the standing price. */
  | { id: "counter_lower"; priceAtomic: string }
  /** Share a sealed range so the counterpart has a policy to work from. */
  | { id: "supply_policy"; maxAtomic: string }
  /** Reopen at a given price once the counterpart has a policy. */
  | { id: "reopen_at"; priceAtomic: string }
  | { id: "decline" }
  | { id: "walk_away" };

export type Brief = {
  runId: string;
  mode: ScoutRun["mode"];
  happened: { counters: number; openingAtomic: string; standingAtomic: string; outcome: ScoutRun["outcome"]; durationMs: number };
  admission: { kind: GapKind; note: GapNote; signed: boolean };
  proof: Proof;
  decision: { kind: GapKind; ownerLimitAtomic: string; options: DecisionOption[] };
};

const mid = (a: string, b: string) => ((BigInt(a) + BigInt(b)) / 2n).toString();

export function buildBrief(run: ScoutRun): Brief {
  const offers = run.moves.filter((m) => m.priceAtomic);
  const opening = offers[0]?.priceAtomic ?? run.standingPriceAtomic;
  const ownerLast = offers.filter((m) => m.by === "owner").at(-1)?.priceAtomic ?? opening;
  const kind = run.gap.note.kind;
  const options: DecisionOption[] =
    kind === "AUTHORITY_CEILING"
      ? [{ id: "approve_extended", priceAtomic: run.standingPriceAtomic }, { id: "counter_lower", priceAtomic: mid(ownerLast, run.standingPriceAtomic) }, { id: "decline" }]
      : [{ id: "supply_policy", maxAtomic: run.ownerLimitAtomic }, { id: "reopen_at", priceAtomic: ownerLast }, { id: "walk_away" }];
  return {
    runId: run.id,
    mode: run.mode,
    happened: { counters: run.moves.filter((m) => m.type === "COUNTER").length, openingAtomic: opening, standingAtomic: run.standingPriceAtomic, outcome: run.outcome, durationMs: Date.parse(run.finishedAt) - Date.parse(run.startedAt) },
    admission: { kind, note: run.gap.note, signed: Boolean(run.gap.signature) },
    proof: run.proof,
    decision: { kind, ownerLimitAtomic: run.ownerLimitAtomic, options },
  };
}

/** Atomic US cents as dollars: "72" → "$0.72", "360000" → "$3,600". */
export function usdFromCents(atomic: string): string {
  const cents = Number(atomic);
  if (!Number.isFinite(cents)) return atomic;
  const d = cents / 100;
  return d >= 100 ? `$${Math.round(d).toLocaleString("en-US")}` : `$${d.toFixed(2)}`;
}
