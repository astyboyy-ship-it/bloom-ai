"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, FileDown, Loader2, Mail, PenLine, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { money, USAGE_RIGHTS, type DealFlag } from "@/lib/aware-marketing/engine";
import { PLATFORMS } from "@/lib/intentpulse/signal";
import { textPdf } from "@/lib/pdf";
import { agreement, CATEGORIES, CREATOR, DEAL_CHANNELS, DEFAULT_CRITERIA, fit, overnightSweep, USAGE_ORDER, type Category, type DealChannel, type Proposal } from "@/lib/studio/deals";
import { signatureBlock, signText } from "@/lib/studio/sign";
import { PLATFORM_ICON } from "../../command-center/platform";
import { usePersistent } from "../../studio/frame";
import { Hud, SpatialGraph, type Burst, type GraphEdge, type GraphNode } from "../graph";
import { CommandBar, glass, PanelHead, Segmented, Slider, Sprig, Toggle } from "../ui";
import { AwareMarketingShell } from "./shell";

// keyId is absent on agreements signed before device keys (hash-only fingerprints).
type Signed = { at: string; hash: string; keyId?: string; text: string; price: number };

const EXCL_STEPS = [0, 15, 30, 60, 90];

/** Days the brand wants you off their competitors, after the overnight clause fixer capped it at 30. */
function exclusivityDays(p: Proposal) {
  if (p.usage === "whitelist") return 60;
  if (!/exclusiv|non-compete/i.test(p.email)) return 0;
  const asked = Number(/(\d+)\s*days/i.exec(p.email)?.[1] ?? 30);
  return p.analysis.flags.some((f) => f.id === "exclusivity") ? Math.min(asked, 30) : asked;
}

const fileName = (p: Proposal) => `${p.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-agreement.pdf`;

function savePdf(p: Proposal, s: Signed) {
  const url = URL.createObjectURL(textPdf(`Creator Partnership Agreement - ${p.brand}`, s.text));
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName(p) });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads the signed PDF and opens an email to the brand, ready to attach it and send. */
function dispatch(p: Proposal, s: Signed) {
  savePdf(p, s);
  const body = `Hi ${p.brand} team,\n\nAttached is our signed partnership agreement for ${p.product} (${money(s.price)}). Please countersign and return.\n\nDocument SHA-256: ${s.hash}${s.keyId ? `\nSigner key ID: ${s.keyId}` : ""}\n\nThanks,\n${CREATOR.name}`;
  window.location.href = `mailto:${p.contact}?subject=${encodeURIComponent(`Signed agreement: ${p.brand} x ${CREATOR.name}`)}&body=${encodeURIComponent(body)}`;
  toast.success(`PDF saved. Attach ${fileName(p)} to the email.`);
}

const USAGE_PLAIN: Record<Proposal["usage"], string> = {
  organic: "no paid ads",
  paid30: "they can run it as an ad for 30 days",
  paid90: "they can run it as an ad for 90 days",
  whitelist: "ads from your account + 60 days exclusivity",
  perpetual: "they own it forever",
};

const VIA: Record<DealChannel, string> = { reddit: "Reddit chat", instagram: "Instagram DM", x: "X DM", tiktok: "TikTok message", linkedin: "LinkedIn InMail", email: "Email" };
const SEVERITY = { high: "text-[#ff9d84]", medium: "text-p-hi", low: "text-p-text/60" } as const;

/** What you'd actually make, in a sentence a person would say. */
function deliverables(p: Proposal) {
  const items = p.analysis.lines.map((l) => `${l.qty} ${l.label}${l.qty > 1 ? "s" : ""}`).join(" + ");
  return `${items} · ${USAGE_PLAIN[p.usage]}`;
}

/** The night's negotiation for one deal, in order. */
function nightLog(p: Proposal) {
  const out = [{ at: p.receivedAt, text: `${VIA[p.via]} from ${p.contact}: ${money(p.budget)} offered` }];
  if (p.analysis.flags.length) out.push({ at: p.receivedAt, text: `${p.analysis.flags.length} clause${p.analysis.flags.length > 1 ? "s" : ""} rewritten to your standard terms` });
  if (p.negotiated > p.budget) out.push({ at: p.overnight.at, text: `Countered at ${money(p.negotiated)}, backed by your rate card` });
  out.push({ at: p.overnight.at, text: p.overnight.note });
  return out;
}

// Campaign execution: what each channel's work looks like once a deal is live. n varies the figures.
const EXECUTION: Record<DealChannel, ((p: Proposal, n: number) => string)[]> = {
  instagram: [(p, n) => `${p.brand} Reel published · ${(18 + n * 7) % 90}.${n % 10}k views in the first hour`, (p) => `${p.brand} Story frames approved by the brand team`],
  x: [(p, n) => `${p.brand} thread live · ${120 + ((n * 37) % 400)} reposts, ${(2 + (n % 5)) / 10 + 1}% CTR`, (p) => `${p.brand} quote-post scheduled for 17:00 local`],
  tiktok: [(p, n) => `${p.brand} TikTok #${1 + (n % 3)} crossed ${40 + ((n * 13) % 160)}k views`, (p) => `${p.brand} Spark Ads authorization code sent`],
  reddit: [(p, n) => `${p.brand} AMA thread approved · ${200 + ((n * 23) % 800)} upvotes`, (p) => `${p.brand} disclosure flair verified by moderators`],
  linkedin: [(p, n) => `${p.brand} post live · ${8 + (n % 30)}k impressions, ${60 + ((n * 11) % 300)} comments`, (p) => `${p.brand} brand repost scheduled`],
  email: [(p, n) => `${p.brand} newsletter slot delivered · ${38 + (n % 20)}% open rate`, (p) => `${p.brand} deposit invoice paid · ${money(Math.round(p.negotiated / 2))}`],
};

type FeedEvent = { id: number; at: string; via: DealChannel; text: string };

/** Live campaign execution across the six channels, for deals already agreed. Simulated: no channels connected. */
function ExecutionFeed({ deals }: { deals: Proposal[] }) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  useEffect(() => {
    if (!deals.length) return;
    let n = 0;
    const make = (): FeedEvent => {
      const p = deals[n % deals.length];
      const via = DEAL_CHANNELS[(n * 5 + p.brand.length) % DEAL_CHANNELS.length];
      const pool = EXECUTION[via];
      const e = { id: n, at: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), via, text: pool[n % pool.length](p, n) };
      n++;
      return e;
    };
    setEvents(Array.from({ length: 6 }, make).reverse());
    const t = setInterval(() => setEvents((list) => [make(), ...list].slice(0, 8)), 2600);
    return () => clearInterval(t);
  }, [deals]);
  return (
    <ol className="mt-4 space-y-2" aria-live="polite">
      {events.map((e) => {
        const Icon = PLATFORM_ICON[e.via];
        return (
          <li key={e.id} className="animate-row-in flex items-start gap-3 text-[13px]">
            <span className="font-mono text-[11px] tabular-nums text-p-text/40">{e.at}</span>
            <Icon className="mt-0.5 size-3.5 shrink-0" style={{ color: PLATFORMS[e.via].color }} />
            <span className="text-p-text/80">{e.text}</span>
          </li>
        );
      })}
    </ol>
  );
}

type Decision = "rewrite" | "accept";
const AUTO_DEFAULT: Record<DealFlag["severity"], boolean> = { high: true, medium: true, low: true };
const FULL_PATH = ["intake", "risk", "rewrite", "yield", "counter", "vault"];

/**
 * Aware Marketing, the autonomous deal OS: a six-node negotiation swarm over the night's proposals,
 * your terms and policies, clause-by-clause control, batch signing, and Approve & Sign.
 */
export function AwareMarketingApp() {
  const sweep = useMemo(() => overnightSweep(), []);
  const [minFee, setMinFee] = usePersistent("bloom.s1.minFee", 2500);
  const [usageIdx, setUsageIdx] = usePersistent("bloom.s1.usage", 2);
  const [exclWindow, setExclWindow] = usePersistent("bloom.s1.exclDays", 30);
  const [cats, setCats] = usePersistent<{ allowed: Category[]; blocked: Category[] }>("bloom.s1.cats", { allowed: DEFAULT_CRITERIA.allowed, blocked: DEFAULT_CRITERIA.blocked });
  const [signed, setSigned] = usePersistent<Record<string, Signed>>("bloom.s1.signed", {});
  const [passed, setPassed] = usePersistent<Record<string, boolean>>("bloom.s1.passed", {});
  const [signer, setSigner] = usePersistent("bloom.s1.signer", CREATOR.name);
  const [autoRewrite, setAutoRewrite] = usePersistent<Record<DealFlag["severity"], boolean>>("bloom.s1.autoRewrite", AUTO_DEFAULT);
  const [aggression, setAggression] = usePersistent("bloom.s1.aggression", 50);
  const [decisions, setDecisions] = usePersistent<Record<string, Decision>>("bloom.s1.clauses", {});
  const [batchMin, setBatchMin] = usePersistent("bloom.s1.batchMin", 85);
  const [batchChannels, setBatchChannels] = usePersistent<DealChannel[]>("bloom.s1.batchChannels", DEAL_CHANNELS);
  const [channel, setChannel] = useState<DealChannel | "all">("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<Proposal | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [burst, setBurst] = useState<Burst | null>(null);
  const [batching, setBatching] = useState(false);
  const fire = (path: string[]) => setBurst({ key: Date.now(), path });

  // Yield aggression rescales each overnight counter: 50 is the engine's own counter, 0 takes the
  // opening offer, 100 asks for twice the uplift.
  const priced = useMemo(() => sweep.map((p) => (p.negotiated > p.budget ? { ...p, negotiated: Math.round((p.budget + (p.negotiated - p.budget) * (aggression / 50)) / 50) * 50 } : p)), [sweep, aggression]);
  const decisionOf = (p: Proposal, f: DealFlag): Decision | "review" => decisions[`${p.id}:${f.id}`] ?? (autoRewrite[f.severity] ? "rewrite" : "review");
  const pending = (p: Proposal) => p.analysis.flags.filter((f) => decisionOf(p, f) === "review").length;
  /** The deal as it will be signed: your price, and only the clauses you chose to rewrite. */
  const effective = (p: Proposal): Proposal => ({ ...p, analysis: { ...p.analysis, flags: p.analysis.flags.filter((f) => decisionOf(p, f) === "rewrite") } });

  // Exclusivity is judged here, in days, rather than by the core's yes/no switch.
  const criteria = { ...DEFAULT_CRITERIA, ...cats, minBudget: minFee, maxUsage: USAGE_ORDER[usageIdx], allowExclusivity: true, categoryFloors: {} };
  const live = priced.filter((p) => p.overnight.stage !== "declined");
  const rows = live
    .map((p) => {
      const f = fit(p, criteria);
      const days = exclusivityDays(p);
      const reasons = f.reasons.filter((r) => r.label !== "Exclusivity allowed");
      if (days) reasons.push({ label: `${days}-day exclusivity (you allow ${exclWindow ? `${exclWindow} days` : "none"})`, ok: days <= exclWindow });
      return { p, f: { ...f, reasons } };
    })
    .filter(({ f }) => !f.blocked)
    .sort((a, b) => b.f.score - a.f.score);
  const blockedCount = live.length - rows.length;
  const cycle = (c: Category) => {
    const state = cats.allowed.includes(c) ? "allowed" : cats.blocked.includes(c) ? "blocked" : "open";
    const allowed = cats.allowed.filter((x) => x !== c);
    const blocked = cats.blocked.filter((x) => x !== c);
    setCats(state === "allowed" ? { allowed, blocked: [...blocked, c] } : state === "blocked" ? { allowed, blocked } : { allowed: [...allowed, c], blocked });
  };
  const fits = (r: (typeof rows)[number]) => r.f.reasons.every((x) => x.ok || x.label.startsWith("Matches your niches"));
  const inChannel = rows.filter((r) => channel === "all" || r.p.via === channel);
  const shown = inChannel.filter((r) => !passed[r.p.id] && (showHidden || fits(r)));
  const ready = rows.filter((r) => fits(r) && r.p.overnight.stage === "agreed" && !signed[r.p.id] && !passed[r.p.id]);
  const hidden = inChannel.filter((r) => !fits(r) && !passed[r.p.id]).length;
  const declined = sweep.filter((p) => p.overnight.stage === "declined").length;
  const clauses = sweep.reduce((a, p) => a + p.analysis.flags.length, 0);
  const signedList = sweep.filter((p) => signed[p.id]);
  const agreed = useMemo(() => sweep.filter((p) => p.overnight.stage === "agreed"), [sweep]);
  const pipeline = live.reduce((a, p) => a + p.negotiated, 0);
  const countered = live.filter((p) => p.negotiated > p.budget);
  const uplift = countered.length ? countered.reduce((a, p) => a + p.negotiated - p.budget, 0) / countered.reduce((a, p) => a + p.budget, 0) : 0;
  const rewritten = priced.reduce((a, p) => a + p.analysis.flags.filter((f) => decisionOf(p, f) === "rewrite").length, 0);
  const reviews = priced.reduce((a, p) => a + pending(p), 0);
  const signedValue = signedList.reduce((a, p) => a + signed[p.id].price, 0);
  const batchable = ready.filter((r) => r.f.score >= batchMin && batchChannels.includes(r.p.via) && !pending(r.p));
  // The clause risk scan across the whole sweep: what was found, how often, how serious.
  const risks = useMemo(() => {
    const by = new Map<string, { label: string; severity: DealFlag["severity"]; count: number }>();
    for (const p of sweep) for (const f of p.analysis.flags) by.set(f.id, { label: f.label, severity: f.severity, count: (by.get(f.id)?.count ?? 0) + 1 });
    return [...by.values()].sort((a, b) => b.count - a.count);
  }, [sweep]);
  const highRisk = risks.filter((r) => r.severity === "high").reduce((a, r) => a + r.count, 0);

  const runBatch = async () => {
    if (!batchable.length || batching) return;
    setBatching(true);
    try {
      const next = { ...signed };
      for (const { p } of batchable) {
        const at = new Date();
        const body = agreement(effective(p), CREATOR, signer.trim() || CREATOR.name, at);
        const sig = await signText(body);
        next[p.id] = { at: at.toISOString(), hash: sig.hash, keyId: sig.keyId, text: body + signatureBlock(sig), price: p.negotiated };
      }
      setSigned(next);
      fire(FULL_PATH);
      toast.success(`Signed ${batchable.length} deal${batchable.length === 1 ? "" : "s"} with your device key`);
    } catch {
      toast.error("This browser can't create digital signatures.");
    }
    setBatching(false);
  };

  const nodes: GraphNode[] = [
    { id: "intake", label: "Channel intake", x: 90, y: 215, metric: `${sweep.length} proposals`, sub: "6 channels", state: "done" },
    { id: "risk", label: "Risk scanner", x: 262, y: 105, metric: `${clauses} risks`, sub: `${highRisk} high severity`, state: "done" },
    { id: "rewrite", label: "Clause rewriter", x: 452, y: 82, metric: `${rewritten} rewritten`, sub: reviews ? `${reviews} need review` : "fully automatic", state: reviews ? "warn" : "active" },
    { id: "yield", label: "Yield calculator", x: 620, y: 205, metric: `+${Math.round(uplift * 100)}% uplift`, sub: `aggression ${aggression}`, state: "active" },
    { id: "counter", label: "Counter-offer", x: 790, y: 305, metric: `${countered.length} countered`, sub: money(pipeline), state: "done" },
    { id: "vault", label: "ECDSA vault", x: 928, y: 172, r: 27, metric: `${signedList.length} signed`, sub: money(signedValue), state: signedList.length ? "active" : "idle" },
  ];
  const edges: GraphEdge[] = [
    { from: "intake", to: "risk", flow: 0.9 },
    { from: "risk", to: "rewrite", flow: clauses ? rewritten / clauses : 0 },
    { from: "rewrite", to: "yield", flow: 0.6 },
    { from: "yield", to: "counter", flow: aggression / 100 },
    { from: "counter", to: "vault", flow: 0.15 + (live.length ? ready.length / live.length : 0) },
  ];

  const find = (q: string) => priced.find((p) => p.brand.toLowerCase().startsWith(q.trim().toLowerCase()));
  const inspect = (p: Proposal) => {
    setOpen((o) => ({ ...o, [p.id]: true }));
    fire(["intake", "risk", "rewrite"]);
    setTimeout(() => document.getElementById(`deal-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };
  const onCommand = (cmd: string): string | undefined => {
    const [verb, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(" ");
    const num = (s: string) => Number(s.replace(/[$,\s]/g, "").replace(/k$/i, "000"));
    switch (verb.toLowerCase()) {
      case "sign": {
        const p = find(arg);
        if (!p) return `No proposal from “${arg}”.`;
        if (signed[p.id]) return `${p.brand} is already signed.`;
        if (p.overnight.stage !== "agreed") return `${p.brand} hasn't agreed terms yet.`;
        if (pending(p)) {
          inspect(p);
          return `${p.brand} has ${pending(p)} clause${pending(p) === 1 ? "" : "s"} to review first.`;
        }
        setModal(effective(p));
        return `Opening the ${p.brand} agreement at ${money(p.negotiated)}.`;
      }
      case "inspect": {
        const p = find(arg);
        if (!p) return `No proposal from “${arg}”.`;
        inspect(p);
        return `Inspecting ${p.brand}: ${p.analysis.flags.length} clause${p.analysis.flags.length === 1 ? "" : "s"}.`;
      }
      case "pass": {
        const p = find(arg);
        if (!p) return `No proposal from “${arg}”.`;
        setPassed({ ...passed, [p.id]: true });
        return `${p.brand} removed from the desk.`;
      }
      case "fee": {
        const n = num(arg);
        if (!Number.isFinite(n) || n < 0) return "Usage: fee 5000 (or 5k)";
        setMinFee(Math.min(15000, Math.round(n / 250) * 250));
        return `Minimum fee set to ${money(Math.min(15000, Math.round(n / 250) * 250))}.`;
      }
      case "aggression": {
        const n = num(arg);
        if (!Number.isFinite(n) || n < 0 || n > 100) return "Usage: aggression 0–100";
        setAggression(Math.round(n));
        return `Yield aggression ${Math.round(n)}: counters re-priced.`;
      }
      case "channel": {
        const c = DEAL_CHANNELS.find((x) => PLATFORMS[x].label.toLowerCase().startsWith(arg.toLowerCase()) || x === arg.toLowerCase());
        if (arg.toLowerCase() === "all") return setChannel("all"), "Showing every channel.";
        if (!c) return "Channels: reddit, instagram, x, tiktok, linkedin, email, all";
        setChannel(c);
        return `Showing ${PLATFORMS[c].label} only.`;
      }
      case "batch":
        if (!batchable.length) return "No deals match your batch rules.";
        runBatch();
        return `Batch-signing ${batchable.length} deal${batchable.length === 1 ? "" : "s"}…`;
      default:
        return undefined;
    }
  };

  return (
    <AwareMarketingShell
      title="The overnight deal desk."
      subtitle={
        <>
          {sweep.length} brand proposals were read, scored and negotiated across six channels overnight for {CREATOR.name} ({CREATOR.handle}). {clauses} unfair clauses were found, {declined} offers declined, and <span className="text-p-hi">{ready.length} deals worth {money(ready.reduce((a, r) => a + r.p.negotiated, 0))}</span> are ready to sign.
        </>
      }
      status={
        <span className="inline-flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-p-accent shadow-[0_0_8px_var(--p-accent)]" /> Swept 00:00–07:00
        </span>
      }
    >
      <section aria-label="Negotiation swarm" className="-mx-6 lg:-mx-10">
        <SpatialGraph nodes={nodes} edges={edges} burst={burst} onNode={(id) => id === "vault" && signedList.length && document.getElementById("signed")?.scrollIntoView({ behavior: "smooth" })}>
          <Hud className="left-6 top-3 lg:left-10" items={[{ label: "Negotiated pipeline", value: money(pipeline) }, { label: "Uplift over opening offers", value: `+${Math.round(uplift * 100)}%` }]} />
          <Hud className="right-6 top-3 text-right lg:right-10" items={[{ label: "Ready to sign", value: money(ready.reduce((a, r) => a + r.p.negotiated, 0)) }, { label: "Auto-declined", value: String(declined) }]} />
        </SpatialGraph>
      </section>

      <div className="-mx-6 grid lg:-mx-10 lg:grid-cols-3">
        <section className={cn(glass, "px-6 py-6 lg:px-8")}>
          <Sprig />
          <Sprig corner="br" />
          <PanelHead title="Your terms" hint="Every negotiation holds to these. Change them and the desk re-sorts instantly." />
          <div className="mt-5 space-y-5">
            <label className="block">
              <span className="flex justify-between text-[13px] text-p-text/70">
                Minimum fee <span className="prod-hud text-[13px]">{money(minFee)}</span>
              </span>
              <Slider min={0} max={15000} step={250} value={minFee} onChange={setMinFee} label="Minimum fee" className="mt-2" />
            </label>
            <label className="block">
              <span className="flex justify-between text-[13px] text-p-text/70">
                Ad usage I&apos;ll allow <span className="prod-hud text-[13px]">{USAGE_RIGHTS[USAGE_ORDER[usageIdx]].short}</span>
              </span>
              <Slider min={0} max={USAGE_ORDER.length - 1} value={usageIdx} onChange={setUsageIdx} label="Ad usage allowed" className="mt-2" />
            </label>
            <label className="block">
              <span className="flex justify-between text-[13px] text-p-text/70">
                Exclusivity window <span className="prod-hud text-[13px]">{exclWindow ? `≤ ${exclWindow} days` : "never"}</span>
              </span>
              <Slider min={0} max={EXCL_STEPS.length - 1} value={Math.max(0, EXCL_STEPS.indexOf(exclWindow))} onChange={(i) => setExclWindow(EXCL_STEPS[i])} label="Exclusivity window" className="mt-2" />
            </label>
          </div>
          <p className="mt-6 text-[13px] text-p-text/70">
            Categories <span className="text-p-text/40">· welcome → never → open</span>
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const state = cats.allowed.includes(c) ? "allowed" : cats.blocked.includes(c) ? "blocked" : "open";
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => cycle(c)}
                  aria-label={`${c}: ${state}`}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] transition-colors",
                    state === "allowed" && "border-p-second/60 bg-p-second/15 text-p-text",
                    state === "blocked" && "border-[#ff9d84]/40 bg-[#ff7b6b]/10 text-[#ffc2b5] line-through decoration-[#ff9d84]/60",
                    state === "open" && "border-p-edge/15 text-p-text/50",
                  )}
                >
                  {state === "allowed" && <Check className="size-3" />}
                  {state === "blocked" && <X className="size-3" />}
                  {c}
                </button>
              );
            })}
          </div>
          {blockedCount > 0 && <p className="mt-2 text-[12px] text-p-text/45">{blockedCount} offer{blockedCount === 1 ? "" : "s"} from blocked categories hidden.</p>}
        </section>

        <section className={cn(glass, "px-6 py-6 lg:px-8")}>
          <Sprig />
          <Sprig corner="br" />
          <PanelHead title="Risk & yield policy" hint="What the rewriter fixes on its own, and how hard the counter pushes." />
          <p className="mt-5 text-[13px] text-p-text/70">Auto-rewrite by severity</p>
          <div className="mt-2 space-y-2">
            {(["high", "medium", "low"] as const).map((s) => (
              <label key={s} className="flex items-center gap-3 text-[13px]">
                <Toggle on={autoRewrite[s]} onChange={(v) => setAutoRewrite({ ...autoRewrite, [s]: v })} label={`Auto-rewrite ${s} risk`} />
                <span className={cn("capitalize", SEVERITY[s])}>{s} risk</span>
                <span className="ml-auto prod-hud text-[12px]">{risks.filter((r) => r.severity === s).reduce((a, r) => a + r.count, 0)} found</span>
              </label>
            ))}
          </div>
          {reviews > 0 && <p className="mt-2 text-[12px] text-p-hi">{reviews} clause{reviews === 1 ? "" : "s"} now wait for your decision in the deals below.</p>}
          <label className="mt-6 block">
            <span className="flex justify-between text-[13px] text-p-text/70">
              Counter-offer yield aggression <span className="prod-hud text-[13px]">{aggression}</span>
            </span>
            <Slider min={0} max={100} step={5} value={aggression} onChange={setAggression} label="Counter-offer yield aggression" className="mt-2" />
            <span className="mt-1 flex justify-between text-[11px] text-p-text/40">
              <span>take the opening offer</span>
              <span>engine&apos;s counter at 50</span>
              <span>2× the uplift</span>
            </span>
          </label>
          <p className="mt-6 text-[13px] text-p-text/70">Clause risk scan</p>
          <ul className="mt-2 space-y-1.5">
            {risks.map((r) => (
              <li key={r.label} className="flex items-center gap-2.5 text-[12.5px]">
                <span className={cn("size-1.5 shrink-0 rounded-full", r.severity === "high" ? "bg-[#ff8a70] shadow-[0_0_8px_#ff8a70]" : r.severity === "medium" ? "bg-p-accent shadow-[0_0_8px_var(--p-accent)]" : "bg-p-text/40")} />
                <span className="flex-1 text-p-text/75">{r.label}</span>
                <span className="prod-hud text-[11.5px]">×{r.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={cn(glass, "px-6 py-6 lg:px-8")}>
          <Sprig />
          <Sprig corner="br" />
          <PanelHead title="Batch dispatch" hint="Sign every ready deal that meets these rules in one pass, each with its own signature." />
          <label className="mt-5 block">
            <span className="flex justify-between text-[13px] text-p-text/70">
              Minimum match <span className="prod-hud text-[13px]">{batchMin}%</span>
            </span>
            <Slider min={50} max={100} value={batchMin} onChange={setBatchMin} label="Minimum match for batch signing" className="mt-2" />
          </label>
          <p className="mt-4 text-[13px] text-p-text/70">From channels</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DEAL_CHANNELS.map((c) => {
              const Icon = PLATFORM_ICON[c];
              const on = batchChannels.includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} onClick={() => setBatchChannels(on ? batchChannels.filter((x) => x !== c) : [...batchChannels, c])} className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px]", on ? "border-p-accent/50 bg-p-accent/15 text-p-text" : "border-p-edge/15 text-p-text/45")}>
                  <Icon className="size-3" style={{ color: PLATFORMS[c].color }} /> {PLATFORMS[c].label}
                </button>
              );
            })}
          </div>
          <button type="button" disabled={!batchable.length || batching} onClick={runBatch} className="prod-btn mt-5 h-11 w-full text-[14px]">
            {batching ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />} Batch-sign {batchable.length} deal{batchable.length === 1 ? "" : "s"} · {money(batchable.reduce((a, r) => a + r.p.negotiated, 0))}
          </button>
          <p className="mt-6 text-[13px] text-p-text/70">Campaign execution</p>
          <p className="text-[11.5px] text-p-text/40">Agreed deals going live across six channels. Simulated: no channel accounts are connected.</p>
          <ExecutionFeed deals={agreed} />
        </section>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Channel"
          value={channel}
          onChange={setChannel}
          options={[
            { value: "all", label: `All · ${rows.length}` },
            ...DEAL_CHANNELS.map((c) => {
              const Icon = PLATFORM_ICON[c];
              return { value: c, label: <><Icon className="size-3.5" /> {PLATFORMS[c].label} <span className="opacity-60">{rows.filter((r) => r.p.via === c).length}</span></> };
            }),
          ]}
        />
      </div>

      <ul className="-mx-6 mt-4 lg:-mx-10">
        {shown.map(({ p, f }) => {
          const done = signed[p.id];
          const ok = fits({ p, f });
          const todo = pending(p);
          const Icon = PLATFORM_ICON[p.via];
          return (
            <li key={p.id} id={`deal-${p.id}`} className={cn(glass, "px-6 py-6 lg:px-10", !ok && "opacity-60")}>
              <div className="flex flex-wrap items-start gap-5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[12px] text-p-text/50">
                    <Icon className="size-3.5" style={{ color: PLATFORMS[p.via].color }} /> {VIA[p.via]} · {p.receivedAt}
                  </p>
                  <p className="mt-1.5 font-display text-[26px] font-medium leading-tight text-p-text">
                    {p.brand} <span className="font-sans text-[14px] font-normal text-p-text/45">· {p.product}</span>
                  </p>
                  <p className="mt-1 text-[14px] text-p-text/70">{deliverables(p)}</p>
                  {p.hooks[0] && <p className="mt-3 border-l-2 border-p-accent/50 pl-3 text-[14px] italic text-p-text/80">“{p.hooks[0].text}”</p>}
                  {!ok && <p className="mt-2 text-[12.5px] text-p-hi">Outside your terms: {f.reasons.filter((x) => !x.ok && !x.label.startsWith("Matches")).map((x) => x.label.toLowerCase()).join(", ")}.</p>}
                </div>
                <div className="text-right">
                  <p className="prod-hud text-[34px] font-semibold leading-none">{money(p.negotiated)}</p>
                  {p.negotiated > p.budget && (
                    <p className="mt-1.5 text-[12.5px] text-p-text/45">
                      offered {money(p.budget)} · <span className="text-p-hi">+{money(p.negotiated - p.budget)}</span>
                    </p>
                  )}
                  <p className="mt-2 inline-block rounded-full border border-p-accent/40 bg-p-accent/15 px-2.5 py-0.5 font-mono text-[12px] text-p-hi">{f.score}% match</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {done ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[14px] text-[#a8e0b0]">
                      <Check className="size-4" /> Signed {new Date(done.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <button type="button" onClick={() => savePdf(p, done)} className="prod-ghost ml-2 h-9 px-4 text-[13px]">
                      <FileDown className="size-4" /> PDF
                    </button>
                    <button type="button" onClick={() => dispatch(p, done)} className="prod-ghost h-9 px-4 text-[13px]">
                      <Mail className="size-4" /> Send to {p.brand}
                    </button>
                  </>
                ) : p.overnight.stage === "agreed" ? (
                  todo ? (
                    <button type="button" onClick={() => inspect(p)} className="prod-ghost h-11 px-5 text-[14px] text-p-hi">
                      <ShieldCheck className="size-4" /> Review {todo} clause{todo === 1 ? "" : "s"} to sign
                    </button>
                  ) : (
                    <button type="button" onClick={() => setModal(effective(p))} className="prod-btn h-11 px-6 text-[15px]">
                      <PenLine className="size-4" /> Approve & Sign
                    </button>
                  )
                ) : (
                  <span className="text-[13.5px] text-p-text/55">Waiting for {p.brand} to confirm {money(p.negotiated)}.</span>
                )}
                <button type="button" onClick={() => setOpen({ ...open, [p.id]: !open[p.id] })} aria-expanded={!!open[p.id]} className="prod-ghost h-11 px-4 text-[13.5px]">
                  <ShieldCheck className="size-4" /> {p.analysis.flags.length ? `Inspect ${p.analysis.flags.length} clause${p.analysis.flags.length > 1 ? "s" : ""}` : "Overnight log"}
                  <ChevronDown className={cn("size-4 transition-transform", open[p.id] && "rotate-180")} />
                </button>
                {!done && (
                  <button type="button" onClick={() => setPassed({ ...passed, [p.id]: true })} className="h-11 rounded-full px-4 text-[14px] text-p-text/45 hover:text-p-text">
                    Not for me
                  </button>
                )}
              </div>

              {open[p.id] && (
                <div className="mt-5 grid gap-6 border-t border-p-edge/10 pt-5 md:grid-cols-[1.4fr_1fr]">
                  <div>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-p-accent">Clause-by-clause inspection</p>
                    {p.analysis.flags.length ? (
                      <ul className="mt-3 space-y-4">
                        {p.analysis.flags.map((fl) => {
                          const d = decisionOf(p, fl);
                          return (
                            <li key={fl.id} className="text-[13.5px] leading-snug">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn("font-mono text-[10.5px] uppercase", SEVERITY[fl.severity])}>{fl.severity}</span>
                                <span className="flex-1 text-p-text/85">Their draft: {fl.label.toLowerCase()}</span>
                                <Segmented
                                  size="sm"
                                  label={`Decision for ${fl.label}`}
                                  value={d}
                                  onChange={(v) => setDecisions({ ...decisions, [`${p.id}:${fl.id}`]: v as Decision })}
                                  options={[
                                    { value: "rewrite", label: "Rewrite" },
                                    { value: "accept", label: "Accept theirs" },
                                  ]}
                                />
                              </div>
                              <span className={cn("mt-1 flex gap-1.5", d === "rewrite" ? "text-p-text/80" : "text-p-text/35 line-through")}>
                                <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-p-accent" /> {fl.term}
                              </span>
                              {d === "review" && <span className="mt-1 block text-[12px] text-p-hi">Not auto-rewritten at this severity: choose before signing.</span>}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-3 text-[13.5px] text-p-text/60">Their terms already match your standard contract. Nothing to fix.</p>
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-p-accent">Overnight log</p>
                    <ol className="mt-3 space-y-2 border-l border-p-edge/15 pl-4">
                      {nightLog(p).map((l, i) => (
                        <li key={i} className="relative text-[13px] text-p-text/75">
                          <span className="absolute -left-[21px] top-1.5 size-2 rounded-full border border-p-accent bg-[rgb(var(--p-glass))]" />
                          <span className="font-mono text-[11.5px] text-p-text/45">{l.at}</span> {l.text}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <button type="button" onClick={() => setShowHidden((v) => !v)} className="mt-4 text-[13px] text-p-text/50 hover:text-p-text">
          {showHidden ? "Hide" : "Show"} {hidden} deal{hidden === 1 ? "" : "s"} outside your terms
        </button>
      )}
      {!shown.length && <p className="mt-10 text-center font-display text-[22px] italic text-p-text/55">You&apos;re all caught up.</p>}

      {signedList.length > 0 && (
        <section id="signed" className={cn(glass, "-mx-6 mt-8 px-6 py-6 lg:-mx-10 lg:px-10")}>
          <Sprig />
          <Sprig corner="br" />
          <PanelHead title="ECDSA vault" hint="Each agreement is signed with your device key (ECDSA P-256), so the brand can verify it and any later edit is detectable." />
          <ul className="mt-4 divide-y divide-p-edge/10">
            {signedList.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-[14px]">
                <span className="font-medium text-p-text">{p.brand}</span>
                <span className="prod-hud text-[13px]">{money(signed[p.id].price)}</span>
                <span className="font-mono text-[11.5px] text-p-text/35">{signed[p.id].hash.slice(0, 16)}…</span>
                <span className="ml-auto flex gap-4">
                  <button type="button" onClick={() => savePdf(p, signed[p.id])} className="inline-flex items-center gap-1.5 text-[13px] text-p-text/60 hover:text-p-text">
                    <FileDown className="size-4" /> PDF
                  </button>
                  <button type="button" onClick={() => dispatch(p, signed[p.id])} className="inline-flex items-center gap-1.5 text-[13px] text-p-text/60 hover:text-p-text">
                    <Mail className="size-4" /> Send
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CommandBar placeholder="sign raycast · inspect linear · fee 5k · aggression 70 · batch" hints={["sign <brand>", "inspect <brand>", "pass <brand>", "fee <amount>", "aggression <0-100>", "channel <name>", "batch"]} onRun={onCommand} />

      {modal && (
        <SignModal
          p={modal}
          signer={signer}
          setSigner={setSigner}
          onClose={() => setModal(null)}
          onSigned={(rec) => {
            setSigned({ ...signed, [modal.id]: rec });
            fire(FULL_PATH);
          }}
        />
      )}
    </AwareMarketingShell>
  );
}

function SignModal({ p, signer, setSigner, onClose, onSigned }: { p: Proposal; signer: string; setSigner: (s: string) => void; onClose: () => void; onSigned: (r: Signed) => void }) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Signed | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sign = async () => {
    setBusy(true);
    const at = new Date();
    const body = agreement(p, CREATOR, signer.trim(), at);
    try {
      const sig = await signText(body);
      const rec = { at: at.toISOString(), hash: sig.hash, keyId: sig.keyId, text: body + signatureBlock(sig), price: p.negotiated };
      onSigned(rec);
      setDone(rec);
      toast.success(`Signed with ${p.brand}`);
    } catch {
      toast.error("This browser can't create a digital signature.");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="sign-title" className="prod-sheet w-full max-w-lg rounded-[1.25rem] p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="sign-title" className="font-display text-[28px] font-medium leading-tight text-p-text">
            {done ? `Signed with ${p.brand}` : `Sign with ${p.brand}?`}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-p-text/50 hover:text-p-text">
            <X className="size-5" />
          </button>
        </div>
        {done ? (
          <>
            <p className="mt-3 text-[14.5px] text-p-text/70">
              Signed with your device key <span className="font-mono text-[12px] text-p-text/50">{done.keyId}</span>. {p.brand} can verify the signature, and any change to the text breaks it.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => dispatch(p, done)} className="prod-btn h-11 px-5 text-[14px]">
                <Mail className="size-4" /> Send to {p.brand}
              </button>
              <button type="button" onClick={() => savePdf(p, done)} className="prod-ghost h-11 px-5 text-[14px]">
                <FileDown className="size-4" /> PDF
              </button>
              <button type="button" onClick={onClose} className="h-11 rounded-full px-5 text-[14px] text-p-text/70 hover:text-p-text">
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="prod-hairline mt-4 opacity-50" />
            <ul className="mt-4 space-y-2 text-[14.5px] text-p-text/80">
              <li>
                <span className="text-p-text/45">You make:</span> {deliverables(p)}
              </li>
              <li>
                <span className="text-p-text/45">You get:</span> <span className="font-semibold text-p-text">{money(p.negotiated)}</span>, half on signing, the rest 30 days after it goes live
              </li>
              {p.analysis.flags.length > 0 && (
                <li>
                  <span className="text-p-text/45">Terms we fixed:</span> {p.analysis.flags.map((f) => f.term.split(":")[0]).join(" ")}
                </li>
              )}
              <li>
                <span className="text-p-text/45">Also:</span> two rounds of edits, #ad disclosure on every post
              </li>
            </ul>
            <label className="mt-5 block">
              <span className="text-[13px] text-p-text/60">Type your name to sign</span>
              <input value={signer} onChange={(e) => setSigner(e.target.value)} className="prod-field mt-1.5 w-full px-4 py-3 font-display text-[20px] italic" />
            </label>
            <label className="mt-3 flex items-center gap-2.5 text-[13.5px] text-p-text/70">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="size-4 accent-[var(--p-accent)]" /> I agree to these terms
            </label>
            <button type="button" disabled={!agree || !signer.trim() || busy} onClick={sign} className="prod-btn mt-5 h-12 w-full text-[15px]">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />} Sign · {money(p.negotiated)}
            </button>
            <p className="mt-3 text-center text-[12px] text-p-text/40">Signed with a key kept on this device; no third-party e-signature service is involved.</p>
          </>
        )}
      </div>
    </div>
  );
}
