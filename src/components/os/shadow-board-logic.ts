import type { BoardSession, BoardVote } from "@/components/desk/settings";

/**
 * The Shadow Board's deliberation. Three adversarial agents read the same proposal and score it on their own
 * criteria; Compliance can veto. It's rule-based and runs locally, so it's instant, deterministic and auditable:
 * the same proposal always gets the same verdict, and each agent's timing is its measured compute time.
 */

export const BOARD_AGENTS = {
  advocate: { name: "Devil's Advocate Agent", short: "Devil's Advocate", role: "Challenges risk, security and reversibility", color: "#ff6b8b" },
  optimizer: { name: "Financial Optimizer Agent", short: "Financial Optimizer", role: "Stress-tests ROI and budget bounds", color: "#f0d59a" },
  compliance: { name: "Compliance Gate Agent", short: "Compliance Gate", role: "Verifies regulatory alignment; holds a veto", color: "#34f5b5" },
} as const;

export const CRITERIA = ["Risk", "Reversibility", "ROI", "Budget fit", "Compliance"] as const;
const WEIGHTS = { advocate: 0.35, optimizer: 0.35, compliance: 0.3 };

export type Proposal = { subject: string; detail: string; budgetUsd: number; amountOverride?: number | null };

const has = (t: string, ...words: string[]) => words.filter((w) => new RegExp(`\\b${w}`, "i").test(t));
const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** The largest dollar figure in the text ("$48,000", "$1.2M", "250k USD"). */
export function amountIn(text: string): number | null {
  let best: number | null = null;
  for (const m of text.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)\s?([kKmMbB])?|(\d[\d,]*(?:\.\d+)?)\s?([kKmM])?\s?(?:usd|dollars)/g)) {
    const n = parseFloat((m[1] ?? m[3]).replace(/,/g, ""));
    const unit = (m[2] ?? m[4] ?? "").toLowerCase();
    const v = n * (unit === "k" ? 1e3 : unit === "m" ? 1e6 : unit === "b" ? 1e9 : 1);
    if (best === null || v > best) best = v;
  }
  return best;
}

function timed(fn: () => Omit<BoardVote, "ms">): BoardVote {
  const t0 = performance.now();
  const v = fn();
  return { ...v, ms: Math.max(0.001, performance.now() - t0) };
}

function stanceOf(score: number): BoardVote["stance"] {
  return score >= 0.66 ? "support" : score >= 0.42 ? "conditional" : "oppose";
}

export function deliberate(p: Proposal): Omit<BoardSession, "id" | "at" | "hash" | "approvalId" | "runId"> {
  const text = `${p.subject}\n${p.detail}`;
  // The spend is the figure in the proposal itself; context figures (pipeline, savings) are upside, not cost.
  const amount = p.amountOverride ?? amountIn(p.subject) ?? amountIn(p.detail);
  const budget = Math.max(1, p.budgetUsd);
  const t0 = performance.now();

  const advocate = timed(() => {
    const irreversible = has(text, "delete", "drop", "terminat", "wipe", "purge", "irreversib", "wire", "transfer", "sign");
    const blast = has(text, "production", "prod", "all customers", "every", "global", "mass", "entire");
    const access = has(text, "credential", "password", "access", "admin", "root", "permission", "api key", "token");
    const safety = has(text, "rollback", "pilot", "staged", "canary", "test", "sandbox", "dry run", "reversible", "trial");
    const risk = clamp(0.25 + irreversible.length * 0.14 + blast.length * 0.12 + access.length * 0.16 + (amount && amount > budget ? 0.15 : 0) - safety.length * 0.12);
    const reversibility = clamp(0.75 - irreversible.length * 0.2 + safety.length * 0.15);
    const score = clamp(1 - risk * 0.7 - (1 - reversibility) * 0.3);
    const points = [
      irreversible.length ? `Irreversible step detected (${irreversible.join(", ")}). Once executed there is no automatic undo.` : "No irreversible operation named; the action can be unwound.",
      blast.length ? `Blast radius is wide (${blast.join(", ")}); a fault propagates beyond a single account.` : "Scope is contained to a single target.",
      access.length ? `Touches privileged access (${access.join(", ")}). Treat as a security-sensitive change.` : "No privileged access or credentials involved.",
      safety.length ? `Mitigation present: ${safety.join(", ")}.` : "No staged rollout, pilot or rollback plan is stated.",
    ];
    const conditions = [...(!safety.length && irreversible.length ? ["Stage it: pilot on one account before the full change"] : []), ...(access.length ? ["Use a scoped, expiring credential"] : [])];
    return { agent: "advocate", stance: stanceOf(score), score, criteria: { Risk: 1 - risk, Reversibility: reversibility }, points, conditions };
  });

  const optimizer = timed(() => {
    const upside = has(text, "revenue", "renewal", "upsell", "save", "saving", "reduce cost", "roi", "margin", "retain", "pipeline", "close");
    const discount = Number(text.match(/(\d{1,2})\s?%\s?(?:discount|off)/i)?.[1] ?? 0);
    const ratio = amount ? amount / budget : 0;
    const budgetFit = amount === null ? 0.6 : ratio <= 0.25 ? 0.95 : ratio <= 1 ? 0.8 - ratio * 0.2 : clamp(0.55 - (ratio - 1) * 0.25);
    const roi = clamp(0.45 + upside.length * 0.12 - (discount > 20 ? 0.25 : discount > 10 ? 0.08 : 0));
    const score = clamp(budgetFit * 0.55 + roi * 0.45);
    const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
    const points = [
      amount === null ? "No dollar figure stated; budget impact assessed as unknown." : `${fmt(amount)} against a ${fmt(budget)} approval budget (${(ratio * 100).toFixed(0)}% of bound).`,
      upside.length ? `Upside signals: ${upside.join(", ")}.` : "No measurable return is stated in the proposal.",
      discount ? `Concedes ${discount}% ${discount > 20 ? "(below the margin floor)" : discount > 10 ? "(within band, but watch margin)" : "(within band)"}.` : "No price concession involved.",
      ratio > 1 ? "Exceeds the budget bound: needs re-allocation or a split into tranches." : "Fits within the current budget envelope.",
    ];
    const conditions = [...(ratio > 1 ? [`Split into tranches under ${fmt(budget)}`] : []), ...(discount > 20 ? ["Cap the discount at 20%"] : []), ...(!upside.length ? ["Attach the expected return before execution"] : [])];
    return { agent: "optimizer", stance: stanceOf(score), score, criteria: { ROI: roi, "Budget fit": budgetFit }, points, conditions };
  });

  const compliance = timed(() => {
    const data = has(text, "personal data", "pii", "email list", "customer data", "health", "medical", "biometric", "export", "scrape", "share data");
    const safeguards = has(text, "consent", "dpa", "anonymi", "pseudonym", "encrypted", "opt-in", "legal review", "gdpr", "hipaa", "soc ?2");
    const finance = has(text, "wire", "payment", "invoice", "transfer", "contract", "agreement", "sign");
    const regulated = has(text, "gdpr", "hipaa", "sox", "pci", "ccpa", "sec ", "aml", "kyc");
    const veto = data.length > 0 && safeguards.length === 0;
    const overBudgetFinance = finance.length > 0 && amount !== null && amount > budget * 2;
    const score = veto ? 0.1 : clamp(0.82 - (overBudgetFinance ? 0.3 : 0) - (finance.length && !safeguards.length ? 0.08 : 0) + safeguards.length * 0.04);
    const points = [
      data.length ? `Processes regulated data (${data.join(", ")}).` : "No personal or regulated data in scope.",
      safeguards.length ? `Safeguards stated: ${safeguards.join(", ")}.` : data.length ? "No lawful basis, consent or DPA referenced: blocking." : "No additional safeguards required.",
      finance.length ? `Financial/contractual commitment (${finance.join(", ")}): human signature required by policy.` : "No binding commitment created.",
      regulated.length ? `Frameworks in scope: ${regulated.join(", ").toUpperCase()}.` : "No named regulatory framework triggered.",
    ];
    const conditions = [...(veto ? ["Document consent / DPA before any data leaves the workspace"] : []), ...(finance.length ? ["Named human signs off (HITL)"] : []), ...(overBudgetFinance ? ["Second approver for spend over 2x budget"] : [])];
    return { agent: "compliance", stance: veto ? "veto" : stanceOf(score), score, criteria: { Compliance: score }, points, conditions };
  });

  const votes = [advocate, optimizer, compliance];
  const score = votes.reduce((s, v) => s + v.score * WEIGHTS[v.agent], 0);
  const verdict = compliance.stance === "veto" || score < 0.42 ? "rejected" : score >= 0.62 && !votes.some((v) => v.stance === "oppose") ? "approved" : "escalate";
  return { subject: p.subject, detail: p.detail, amountUsd: amount, verdict, score, votes, ms: performance.now() - t0 };
}

/** The rebuttal round: each agent answers the agent it disagrees with most. */
export function rebuttals(votes: BoardVote[]) {
  return votes.map((v) => {
    const rival = votes.filter((o) => o !== v).sort((a, b) => Math.abs(b.score - v.score) - Math.abs(a.score - v.score))[0];
    const gap = Math.abs(rival.score - v.score);
    const self = BOARD_AGENTS[v.agent].short;
    const them = BOARD_AGENTS[rival.agent].short;
    const line =
      gap < 0.12
        ? `${self}: aligned with ${them} within ${(gap * 100).toFixed(0)} points; no objection to its reading.`
        : v.score < rival.score
          ? `${self}: ${them} is overweighting the upside. ${v.conditions[0] ? `My condition stands: ${v.conditions[0].toLowerCase()}.` : "The downside case is not priced in."}`
          : `${self}: ${them}'s concerns are addressable${rival.conditions[0] ? ` (${rival.conditions[0].toLowerCase()})` : ""}; that does not justify blocking.`;
    return { agent: v.agent, line };
  });
}
