"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { FileSignature, GitPullRequestArrow, Moon, SlidersHorizontal } from "lucide-react";
import { analyzeDeal, money, USAGE_RIGHTS, type UsageRightsKey } from "@/lib/aware-marketing/engine";
import { agreement, CREATOR, DEFAULT_CRITERIA, fit, overnightSweep, type Criteria, type Fit, type Proposal, type Stage } from "@/lib/studio/deals";
import { EngineShell, usePersistent, type Section, type StudioMeta } from "../frame";

export const META: StudioMeta = {
  index: "01",
  name: "Aware Marketing · Deal Synthesizer",
  kicker: "Aware Marketing",
  tagline: "brand deals negotiated while you sleep",
  painting: "temeraire",
  palette: "solar",
  accent: "#ffc36b",
};

export const BASE = "/demo/engine-01";
const SECTIONS: Section[] = [
  { href: `${BASE}/proposals`, label: "Proposals", hint: "Morning review of the overnight sweep", icon: Moon },
  { href: `${BASE}/pipeline`, label: "Pipeline", hint: "Counter-offers and clause logs", icon: GitPullRequestArrow },
  { href: `${BASE}/rules`, label: "Rules", hint: "Fee floors, usage, exclusivity, bans", icon: SlidersHorizontal },
  { href: `${BASE}/agreements`, label: "Agreements", hint: "Signature vault and downloads", icon: FileSignature },
];

export type Terms = { price: number; usage: UsageRightsKey };
export type Signed = { at: string; hash: string; text: string; signer: string; price: number };
export type LogEntry = { at: string; text: string; tone?: "ok" | "warn" | "info" };

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Splits a stored agreement into its body and the fingerprint line, and checks they still match. */
export async function verify(rec: Signed) {
  const body = rec.text.replace(/\nDocument SHA-256: [0-9a-f]+\n$/, "");
  return (await sha256(body)) === rec.hash;
}

const now = () => new Date().toTimeString().slice(0, 5);

function overnightLog(p: Proposal): LogEntry[] {
  return [
    { at: p.receivedAt, text: `Proposal received from ${p.contact}: ${money(p.budget)} for ${p.deliverables}`, tone: "info" },
    { at: p.receivedAt, text: `Floor computed: ${money(p.analysis.floorTotal)} (${money(p.analysis.baseTotal)} base + ${Math.round(p.analysis.markupPct * 100)}% ${USAGE_RIGHTS[p.usage].short} usage). Offer covers ${Math.round(p.analysis.coverage * 100)}%.` },
    ...p.analysis.flags.map((f) => ({ at: p.receivedAt, text: `Clause flagged · ${f.label} → ${f.term}`, tone: "warn" as const })),
    {
      at: p.overnight.at,
      text:
        p.result.action === "ACCEPT"
          ? `Accepted at ${money(p.budget)}; terms tightened`
          : p.result.action === "COUNTER"
            ? `Counter sent at ${money(p.result.suggestedCounterPrice)}${p.overnight.stage === "agreed" ? "; brand accepted" : "; awaiting reply"}`
            : `Declined politely; reopen at ${money(p.result.suggestedCounterPrice)}`,
      tone: p.overnight.stage === "declined" ? "warn" : "ok",
    },
  ];
}

function useMarketingState() {
  const sweep = useMemo(() => overnightSweep(), []);
  const [criteria, setCriteria] = usePersistent<Criteria>("bloom.e1.criteria", DEFAULT_CRITERIA);
  const [stages, setStages] = usePersistent<Record<string, Stage>>("bloom.e1.stages", {});
  const [terms, setTerms] = usePersistent<Record<string, Terms>>("bloom.e1.terms", {});
  const [logs, setLogs] = usePersistent<Record<string, LogEntry[]>>("bloom.e1.logs", {});
  const [signed, setSigned] = usePersistent<Record<string, Signed>>("bloom.e1.signed", {});
  const [preApproved, setPreApproved] = usePersistent<Record<string, boolean>>("bloom.e1.pre", {});
  const [signer, setSigner] = usePersistent("bloom.e1.signer", CREATOR.name);

  /** The deal as it stands now: overnight result, or the terms you've set since. */
  const effective = useCallback(
    (p: Proposal): Proposal => {
      const t = terms[p.id];
      if (!t) return p;
      const analysis = analyzeDeal({ brandName: p.brand, creatorName: CREATOR.name, budget: p.budget, deliverables: p.deliverables, usageRights: t.usage, tone: "warm", emailText: p.email });
      return { ...p, usage: t.usage, analysis, negotiated: t.price };
    },
    [terms],
  );
  const stageOf = useCallback((p: Proposal): Stage => stages[p.id] ?? p.overnight.stage, [stages]);
  const rows = useMemo(
    () =>
      sweep
        .map((raw) => {
          const p = effective(raw);
          return { p, f: fit(p, criteria) as Fit };
        })
        .sort((a, b) => b.f.score - a.f.score),
    [sweep, criteria, effective],
  );
  const log = (id: string, text: string, tone?: LogEntry["tone"]) => setLogs((l) => ({ ...l, [id]: [...(l[id] ?? []), { at: now(), text, tone }] }));
  const logOf = (p: Proposal) => [...overnightLog(sweep.find((x) => x.id === p.id) ?? p), ...(logs[p.id] ?? [])];

  const sendCounter = (p: Proposal, t: Terms) => {
    setTerms((x) => ({ ...x, [p.id]: t }));
    setStages((s) => ({ ...s, [p.id]: "awaiting" }));
    log(p.id, `You countered at ${money(t.price)} with ${USAGE_RIGHTS[t.usage].short} usage`, "info");
  };
  const recordReply = (p: Proposal, accepted: boolean) => {
    setStages((s) => ({ ...s, [p.id]: accepted ? "agreed" : "declined" }));
    log(p.id, accepted ? `Brand accepted ${money(effective(p).negotiated)}` : "Brand walked away", accepted ? "ok" : "warn");
  };
  const reopen = (p: Proposal) => {
    setStages((s) => ({ ...s, [p.id]: "awaiting" }));
    log(p.id, "Reopened for negotiation", "info");
  };

  const sign = async (raw: Proposal) => {
    const p = effective(raw);
    const name = signer.trim();
    if (!name) return null;
    const at = new Date();
    const body = agreement(p, CREATOR, name, at);
    const hash = await sha256(body);
    setSigned((s) => ({ ...s, [p.id]: { at: at.toISOString(), hash, text: `${body}\nDocument SHA-256: ${hash}\n`, signer: name, price: p.negotiated } }));
    setStages((s) => ({ ...s, [p.id]: "signed" }));
    log(p.id, `Signed by ${name} · sha256 ${hash.slice(0, 12)}…`, "ok");
    return hash;
  };
  const preApprove = (p: Proposal) => {
    setPreApproved((a) => ({ ...a, [p.id]: true }));
    log(p.id, `Pre-approved: signs automatically if the brand accepts ${money(effective(p).negotiated)}`, "info");
  };

  const reset = () => {
    setCriteria(DEFAULT_CRITERIA);
    setStages({});
    setTerms({});
    setLogs({});
    setSigned({});
    setPreApproved({});
  };

  return { sweep, rows, criteria, setCriteria, stageOf, effective, logOf, sendCounter, recordReply, reopen, sign, signed, signer, setSigner, preApproved, preApprove, reset };
}

export type MarketingState = ReturnType<typeof useMarketingState>;
const Ctx = createContext<MarketingState | null>(null);

export function useMarketing() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMarketing must be used inside the Engine 01 layout");
  return v;
}

/** Engine 01's persistent layout: shared deal state plus the app shell. */
export function MarketingApp({ children }: { children: React.ReactNode }) {
  const state = useMarketingState();
  return (
    <Ctx.Provider value={state}>
      <EngineShell meta={META} base={BASE} sections={SECTIONS}>
        {children}
      </EngineShell>
    </Ctx.Provider>
  );
}
