/**
 * Aware Marketing deal core: floor rate card, usage-rights markup, risk-signal detection, scoring,
 * and the deterministic fallback draft. Pure and dependency-free so the demo UI can show the same
 * Rate Match breakdown the API reasons over.
 */

export const USAGE_RIGHTS = {
  organic: { label: "Organic only — no paid usage", short: "Organic", markup: 0 },
  paid30: { label: "Paid usage / ads · 30 days", short: "Paid 30d", markup: 0.25 },
  paid90: { label: "Paid usage / ads · 90 days", short: "Paid 90d", markup: 0.5 },
  whitelist: { label: "Whitelisting + 60-day category exclusivity", short: "Whitelist + excl.", markup: 0.75 },
  perpetual: { label: "Perpetual rights · all media, worldwide", short: "Perpetual", markup: 2 },
} as const;

export const TONES = {
  warm: "Warm & gracious",
  direct: "Direct & concise",
  playful: "Playful & personable",
} as const;

export type UsageRightsKey = keyof typeof USAGE_RIGHTS;
export type ToneKey = keyof typeof TONES;
export type DealAction = "ACCEPT" | "COUNTER" | "DECLINE";

export type DealInput = {
  brandName: string;
  creatorName: string;
  budget: number;
  deliverables: string;
  usageRights: UsageRightsKey;
  tone: ToneKey;
  emailText: string;
};

/** The strict response contract of /api/aware-marketing. */
export type DealResult = {
  dealScore: number;
  action: DealAction;
  suggestedCounterPrice: number;
  counterEmailDraft: string;
  keyTermsAnalysis: string[];
  reasoning: string;
};

export type RateLine = { label: string; qty: number; unitFloor: number; subtotal: number; matched: boolean };
export type DealFlag = { id: string; label: string; severity: "low" | "medium" | "high"; penalty: number; term: string };

export type DealAnalysis = {
  lines: RateLine[];
  baseTotal: number;
  markupPct: number;
  markupAmount: number;
  floorTotal: number;
  budget: number;
  coverage: number;
  flags: DealFlag[];
  score: number;
  action: DealAction;
  counterPrice: number;
};

// Order matters: the first pattern that matches a deliverable wins.
export const RATE_CARD = [
  { label: "YouTube Dedicated Video", floor: 9000, pattern: /dedicated/ },
  { label: "YouTube Short", floor: 1200, pattern: /\bshorts?\b/ },
  { label: "YouTube Integration", floor: 4500, pattern: /youtube|\byt\b/ },
  { label: "Instagram Reel", floor: 2200, pattern: /reels?/ },
  { label: "Instagram Story Frame", floor: 650, pattern: /stor(y|ies)/ },
  { label: "TikTok Video", floor: 1800, pattern: /tik\s*tok/ },
  { label: "Instagram Feed Post", floor: 1500, pattern: /posts?|carousel/ },
  { label: "Newsletter Feature", floor: 900, pattern: /newsletter/ },
  { label: "Podcast Ad Read", floor: 2800, pattern: /podcast/ },
];

const CUSTOM_FLOOR = 1000;

const FLAG_RULES: (DealFlag & { re: RegExp })[] = [
  { id: "perpetual", re: /perpetu|forever|all media|irrevocable/i, label: "Perpetual / irrevocable rights language", severity: "high", penalty: 10, term: "Strike perpetual language: license capped at 12 months, digital only, renewal at 50% of fee." },
  { id: "exposure", re: /exposure|gifted|free product|in exchange for (the )?product|no budget|unpaid/i, label: "Compensation in exposure or product", severity: "high", penalty: 20, term: "Product gifting is not compensation: a cash fee is required for every placement." },
  { id: "netlong", re: /net[\s-]?(60|75|90|120)/i, label: "Extended payment terms", severity: "medium", penalty: 5, term: "Payment Net 30 with a 50% deposit on signature." },
  { id: "exclusivity", re: /exclusiv|non-compete|competitor/i, label: "Exclusivity / non-compete clause", severity: "medium", penalty: 5, term: "Exclusivity limited to direct category competitors, 30 days max, priced separately." },
  { id: "revisions", re: /unlimited (revisions|edits|changes)|as many (revisions|changes)/i, label: "Unlimited revisions", severity: "medium", penalty: 5, term: "Two revision rounds included; additional rounds billed at 10% of fee." },
  { id: "approval", re: /final (cut|approval)|full creative control|script (will be )?provided/i, label: "Brand creative control", severity: "low", penalty: 3, term: "Creator keeps creative voice; brand approval limited to factual and legal accuracy." },
  { id: "rush", re: /asap|urgent|by tomorrow|48 hours|rush/i, label: "Rush timeline", severity: "low", penalty: 2, term: "Delivery under 7 days carries a 25% rush fee." },
  { id: "amplify", re: /whitelist|spark ads|dark post|boost(ed)?|paid (social|amplification)/i, label: "Paid amplification requested", severity: "low", penalty: 2, term: "Paid amplification needs explicit flight dates and a usage-rights fee." },
];

export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const roundUp250 = (n: number) => Math.ceil(n / 250) * 250;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function parseDeliverables(text: string): RateLine[] {
  return text
    .split(/\+|,|;|\n|&|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const lower = seg.toLowerCase();
      const m = lower.match(/(\d+)\s*x\b|\bx\s*(\d+)|^(\d+)\b/);
      const qty = clamp(parseInt(m?.[1] ?? m?.[2] ?? m?.[3] ?? "1", 10) || 1, 1, 50);
      const item = RATE_CARD.find((r) => r.pattern.test(lower));
      const unitFloor = item?.floor ?? CUSTOM_FLOOR;
      return {
        label: item?.label ?? `Custom · ${seg.replace(/^\d+\s*x?\s*/i, "")}`,
        qty,
        unitFloor,
        subtotal: qty * unitFloor,
        matched: !!item,
      };
    });
}

export function analyzeDeal(input: DealInput): DealAnalysis {
  const lines = parseDeliverables(input.deliverables);
  const baseTotal = lines.reduce((s, l) => s + l.subtotal, 0);
  const markupPct = USAGE_RIGHTS[input.usageRights].markup;
  const markupAmount = baseTotal * markupPct;
  const floorTotal = baseTotal + markupAmount;
  const budget = Math.max(0, input.budget);
  const coverage = floorTotal > 0 ? budget / floorTotal : 0;

  const haystack = `${input.emailText}\n${input.deliverables}`;
  const toFlag = ({ id, label, severity, penalty, term }: DealFlag): DealFlag => ({ id, label, severity, penalty, term });
  const flags: DealFlag[] = FLAG_RULES.filter((r) => r.re.test(haystack)).map(toFlag);
  if (budget === 0 && !flags.some((f) => f.id === "exposure")) flags.push(toFlag(FLAG_RULES.find((r) => r.id === "exposure")!));

  let score = Math.min(coverage, 1) * 88 + Math.min(Math.max(coverage - 1, 0) * 40, 12);
  score -= flags.reduce((s, f) => s + f.penalty, 0);
  score = Math.round(clamp(score, 0, 100));

  const action: DealAction = coverage >= 1 && score >= 80 ? "ACCEPT" : coverage < 0.4 || score < 30 ? "DECLINE" : "COUNTER";
  const counterPrice =
    action === "ACCEPT" ? budget : action === "COUNTER" ? roundUp250(Math.max(floorTotal * 1.1, budget)) : roundUp250(floorTotal);

  return { lines, baseTotal, markupPct, markupAmount, floorTotal, budget, coverage, flags, score, action, counterPrice };
}

const TONE_COPY: Record<ToneKey, { greet: (b: string) => string; thanks: (b: string) => string; close: string }> = {
  warm: {
    greet: (b) => `Hi ${b} team,`,
    thanks: (b) => `Thank you so much for thinking of me. I've admired how ${b} shows up for its community, and I'd love to find a way to make this partnership work.`,
    close: "Warmly,",
  },
  direct: {
    greet: (b) => `Hi ${b} team,`,
    thanks: () => "Thanks for the proposal. I've reviewed the scope against my current rate card.",
    close: "Best,",
  },
  playful: {
    greet: (b) => `Hey ${b} team!`,
    thanks: () => "Thanks for reaching out. This one genuinely made my day, and I already have a few ideas brewing.",
    close: "Cheers,",
  },
};

/** Deterministic result used when no LLM key is configured, and as the field-level fallback for LLM output. */
export function buildLocalResult(input: DealInput, a: DealAnalysis): DealResult {
  const usage = USAGE_RIGHTS[input.usageRights];
  const tone = TONE_COPY[input.tone];
  const list = a.lines.map((l) => `  • ${l.qty}× ${l.label}`).join("\n");
  const termFixes = a.flags.map((f) => `  • ${f.term}`).join("\n");
  const pct = Math.round(a.markupPct * 100);

  let body: string;
  if (a.action === "ACCEPT") {
    body = `I'm happy to confirm the partnership at the proposed ${money(a.budget)} for:\n${list}\n\nUsage: ${usage.label}. To keep things moving, I'll send over my standard agreement: 50% deposit on signature, balance Net 30, two revision rounds, and FTC-compliant disclosure on every placement.`;
  } else if (a.action === "COUNTER") {
    const cheapest = [...a.lines].sort((x, y) => x.subtotal - y.subtotal)[0];
    const rescope =
      a.lines.length > 1 && cheapest
        ? cheapest.qty > 1
          ? `dropping one of the ${cheapest.label.toLowerCase()}s`
          : `removing the ${cheapest.label.toLowerCase()}`
        : a.markupPct > 0
          ? "shifting to organic-only usage"
          : "trimming the deliverable count";
    body = `Based on the scope below${pct ? " and the usage rights requested" : ""}, my rate for this package is ${money(a.counterPrice)}:\n${list}\n${pct ? `\nThat figure includes a ${pct}% usage-rights premium (${usage.label.toLowerCase()}).\n` : ""}${termFixes ? `\nA few adjustments to the terms:\n${termFixes}\n` : ""}\nIf ${money(a.counterPrice)} sits outside the current budget, I'm glad to rescope, for example by ${rescope}, so we land somewhere that works for both sides.`;
  } else {
    const exposure = a.flags.some((f) => f.id === "exposure");
    body = `Unfortunately, the current offer of ${money(a.budget)} sits well below my floor for this scope (${money(a.floorTotal)}), so I'm not able to take it on as structured.${exposure ? " I only take on partnerships with a cash fee." : ""}${a.flags.length && !exposure ? `\n\nThe proposed terms would also need to change:\n${termFixes}` : ""}\n\nIf the budget opens up to ${money(a.counterPrice)} or the scope changes, I'd genuinely love to revisit.`;
  }

  const counterEmailDraft = `Subject: Re: ${input.brandName} × ${input.creatorName}: partnership proposal\n\n${tone.greet(input.brandName)}\n\n${tone.thanks(input.brandName)}\n\n${body}\n\n${tone.close}\n${input.creatorName}`;

  const keyTermsAnalysis = [
    `Floor rate: ${a.lines.map((l) => `${l.qty}× ${l.label} @ ${money(l.unitFloor)}`).join(", ")} = ${money(a.baseTotal)} base.`,
    `Usage rights: ${usage.label}, ${pct ? `+${pct}% premium (${money(a.markupAmount)})` : "no premium"}.`,
    ...a.flags.map((f) => `${f.label}: ${f.term}`),
    "Payment: 50% deposit on signature, balance Net 30 from go-live.",
    "Disclosure: #ad / Paid Partnership label required on every placement.",
  ].slice(0, 8);

  const reasoning = `Offer of ${money(a.budget)} covers ${Math.round(a.coverage * 100)}% of the ${money(a.floorTotal)} floor (${money(a.baseTotal)} base + ${pct}% usage). ${a.flags.length ? `${a.flags.length} risk signal${a.flags.length > 1 ? "s" : ""}: ${a.flags.map((f) => f.label.toLowerCase()).join("; ")}.` : "No risk signals in the proposal language."} Classified ${a.action}.`;

  return { dealScore: a.score, action: a.action, suggestedCounterPrice: a.counterPrice, counterEmailDraft, keyTermsAnalysis, reasoning };
}

/** Enforces the business rules on an LLM's answer: valid action, clamped score, never a counter below floor. */
export function reconcile(raw: Partial<DealResult>, a: DealAnalysis, fallback: DealResult): DealResult {
  const action = raw.action ?? fallback.action;
  let price = raw.suggestedCounterPrice ?? fallback.suggestedCounterPrice;
  if (action === "ACCEPT") price = a.budget;
  if (action === "COUNTER" && price < a.floorTotal) price = roundUp250(a.floorTotal);
  return {
    dealScore: raw.dealScore === undefined ? fallback.dealScore : Math.round(clamp(raw.dealScore, 0, 100)),
    action,
    suggestedCounterPrice: Math.round(price),
    counterEmailDraft: raw.counterEmailDraft || fallback.counterEmailDraft,
    keyTermsAnalysis: raw.keyTermsAnalysis?.length ? raw.keyTermsAnalysis : fallback.keyTermsAnalysis,
    reasoning: raw.reasoning || fallback.reasoning,
  };
}
