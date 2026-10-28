"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Code2, Handshake, Loader2, Send, ShieldCheck, Sparkles, Target, User, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { money, type DealResult } from "@/lib/aware-marketing/engine";
import type { StrategyRoadmap } from "@/lib/aware-marketing/strategy";
import { EmbedDrawer } from "../demos/aware-marketing/embed-drawer";
import { PRESETS } from "../demos/aware-marketing/presets";
import { advance, dealLabel, makeDeal, type InboxDeal, type Stage } from "./aware-marketing/inbox";
import { DemoShell } from "./shared/demo-shell";
import { clock, compact, fmt, rng, useInterval } from "./shared/sim";
import { Chip, DemoSection, LiveLog, Meter, Panel, ProcessDeepDive, ShiftSchedule, Stat, type LogEntry } from "./shared/ui";

const GREETING = "Let's structure your unstoppable growth architecture. Enter your handle, niche, or product...";
const SUGGESTIONS = [
  "@nova.tech · 240k subscriber YouTube tech reviewer, also on TikTok",
  "Fitness creator, 85k followers on Instagram and TikTok",
  "B2B SaaS product: an AI note-taker for sales teams",
];
const THINKING = ["Reading your positioning", "Pricing every platform format", "Matching 54 sponsors to your niche", "Writing negotiation guardrails"];

const STAGE_STYLE: Record<Stage, string> = {
  inbound: "border-white/15 text-white/60",
  triaged: "border-[#8ff0ff]/40 text-[#8ff0ff]",
  countering: "border-sun/50 text-sun",
  round2: "border-[#f5a9b0]/50 text-[#f5a9b0]",
  closed: "border-[#f3d48f]/60 bg-[#f3d48f]/10 text-[#f7e2a8]",
  declined: "border-ember/40 text-[#ff9b78]",
};
const STAGE_LABEL: Record<Stage, string> = {
  inbound: "Inbound",
  triaged: "Triaged",
  countering: "Countering",
  round2: "Round 2",
  closed: "Closed",
  declined: "Declined",
};

type ChatMsg = { id: string; role: "agent" | "user"; text: string };
type Totals = { closedRevenue: number; closedOffers: number; closedCount: number; declined: number };

const TICK_MS = 400;
const MAX_DEALS = 12;

export function AwareMarketingDemo() {
  // Chat + roadmap
  const [chat, setChat] = useState<ChatMsg[]>([{ id: "greet", role: "agent", text: GREETING }]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState<number | null>(null);
  const [roadmap, setRoadmap] = useState<StrategyRoadmap | null>(null);
  const [pitched, setPitched] = useState(0);
  const userMsgs = useRef<string[]>([]);
  const chatEnd = useRef<HTMLDivElement>(null);

  // Inbox
  const [deals, setDeals] = useState<InboxDeal[]>([]);
  const [totals, setTotals] = useState<Totals>({ closedRevenue: 0, closedOffers: 0, closedCount: 0, declined: 0 });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [selected, setSelected] = useState<InboxDeal | null>(null);
  const [negotiating, setNegotiating] = useState(false);
  const [apiResult, setApiResult] = useState<{ result: DealResult; engine: string; latency: string } | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  const tick = useRef(0);
  const seq = useRef(0);
  const r = useRef<(() => number) | null>(null);

  const creator = roadmap?.profile.handle ?? "The Creator";

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [chat, thinking]);

  // Seed a full inbox so 10+ deals are in flight from the first frame.
  useEffect(() => {
    const rand = (r.current ??= rng(Date.now() % 4093));
    setDeals(Array.from({ length: 10 }, () => makeDeal(rand, seq.current++, 0, "The Creator")));
  }, []);

  useInterval(() => {
    const rand = (r.current ??= rng(Date.now() % 4093));
    const t = ++tick.current;
    const events: LogEntry[] = [];
    const add: Partial<Totals> = {};

    let next = deals.map((d) => {
      const { deal, event } = advance(d, rand, t);
      if (event) events.push({ id: `${deal.id}-${t}`, time: clock(), text: event, tone: deal.stage === "closed" ? "gold" : deal.stage === "declined" ? "ember" : "cyan" });
      if (deal.stage === "closed" && d.stage !== "closed") {
        add.closedRevenue = (add.closedRevenue ?? 0) + (deal.final ?? 0);
        add.closedOffers = (add.closedOffers ?? 0) + deal.offer;
        add.closedCount = (add.closedCount ?? 0) + 1;
      }
      if (deal.stage === "declined" && d.stage !== "declined") add.declined = (add.declined ?? 0) + 1;
      return deal;
    });

    if (t % 3 === 0) {
      const fresh = makeDeal(rand, seq.current++, t, creator);
      events.push({ id: `${fresh.id}-in`, time: clock(), text: `Inbound: ${dealLabel(fresh)} from ${fresh.brand} (${fresh.input.deliverables})`, tone: "muted" });
      next = [fresh, ...next];
      // Retire the oldest finished deals first so active negotiations stay on screen.
      while (next.length > MAX_DEALS) {
        const idx = next.map((d) => d.stage === "closed" || d.stage === "declined").lastIndexOf(true);
        next.splice(idx === -1 ? next.length - 1 : idx, 1);
      }
    }

    setDeals(next);
    if (Object.keys(add).length)
      setTotals((p) => ({
        closedRevenue: p.closedRevenue + (add.closedRevenue ?? 0),
        closedOffers: p.closedOffers + (add.closedOffers ?? 0),
        closedCount: p.closedCount + (add.closedCount ?? 0),
        declined: p.declined + (add.declined ?? 0),
      }));
    if (events.length) setLog((l) => [...events.reverse(), ...l].slice(0, 40));
    if (selected) {
      const fresh = next.find((d) => d.id === selected.id);
      if (fresh && fresh.stage !== selected.stage) setSelected(fresh);
    }
    if (roadmap && pitched < roadmap.outreach.totalTargets && t % 2 === 0) setPitched((p) => Math.min(roadmap.outreach.totalTargets, p + 1));
  }, TICK_MS);

  const send = async (e?: FormEvent, preset?: string) => {
    e?.preventDefault();
    const text = (preset ?? draft).trim();
    if (!text || thinking !== null) return;
    setDraft("");
    userMsgs.current = [...userMsgs.current, text].slice(-12);
    setChat((c) => [...c, { id: `u-${Date.now()}`, role: "user", text }]);
    setThinking(0);
    const stepper = setInterval(() => setThinking((s) => (s === null ? s : Math.min(THINKING.length - 1, s + 1))), 450);
    try {
      const [res] = await Promise.all([
        fetch("/api/aware-marketing/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: userMsgs.current }),
        }),
        new Promise((ok) => setTimeout(ok, 1800)),
      ]);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "The agent could not build a strategy.");
      const plan = json as StrategyRoadmap;
      setRoadmap(plan);
      setPitched(0);
      setChat((c) => [...c, { id: `a-${Date.now()}`, role: "agent", text: plan.agentReply }]);
      setLog((l) => [{ id: `rm-${Date.now()}`, time: clock(), tone: "gold" as const, text: `Strategy roadmap built (${plan.source}): ${plan.outreach.totalTargets} sponsors queued, floor ${money(plan.packageFloor)}` }, ...l].slice(0, 40));
    } catch (err) {
      setChat((c) => [...c, { id: `e-${Date.now()}`, role: "agent", text: err instanceof Error ? err.message : "Something went wrong. Try again." }]);
    } finally {
      clearInterval(stepper);
      setThinking(null);
    }
  };

  const negotiate = async (d: InboxDeal) => {
    if (negotiating) return;
    setNegotiating(true);
    setApiResult(null);
    try {
      const res = await fetch("/api/aware-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d.input, creatorName: creator }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Negotiation failed.");
      setApiResult({ result: json as DealResult, engine: res.headers.get("x-aware-engine") ?? "unknown", latency: res.headers.get("x-aware-latency-ms") ?? "?" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Negotiation failed.");
    } finally {
      setNegotiating(false);
    }
  };

  const inFlight = deals.filter((d) => d.stage !== "closed" && d.stage !== "declined");
  const pipeline = inFlight.reduce((s, d) => s + d.counter, 0);
  const uplift = totals.closedOffers ? ((totals.closedRevenue - totals.closedOffers) / totals.closedOffers) * 100 : 0;

  return (
    <DemoShell
      slug="marketing"
      kicker="The Autonomous Creator Agent"
      title="Aware Marketing Deal Desk"
      pulse={thinking !== null}
      chips={
        <>
          <Chip>{inFlight.length} deals negotiating</Chip>
          <Chip tone="cyan">Simulated sponsor inbox · real rate-card engine</Chip>
        </>
      }
      actions={
        <button
          type="button"
          onClick={() => setEmbedOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#f0d59a]/30 bg-ink/50 px-4 text-[13px] font-medium text-[#f3e2b8] backdrop-blur-md transition-colors hover:border-[#f0d59a]/60 hover:text-white"
        >
          <Code2 className="size-4" /> Embed Engine
        </button>
      }
    >
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Pipeline value" value={`$${compact(pipeline)}`} sub="open counters" accent />
        <Stat label="Closed revenue" value={`$${compact(totals.closedRevenue)}`} sub={`${totals.closedCount} deals signed`} />
        <Stat label="Uplift vs. offers" value={`${uplift >= 0 ? "+" : ""}${uplift.toFixed(0)}%`} sub="negotiated over first offer" />
        <Stat label="Deals in flight" value={fmt(inFlight.length)} sub="triaged in parallel" />
        <Stat label="Lowballs declined" value={fmt(totals.declined)} sub="below-floor offers" />
        <Stat label="Sponsors pitched" value={roadmap ? `${pitched}/${roadmap.outreach.totalTargets}` : "—"} sub={roadmap ? "outreach waves running" : "build a roadmap"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        {/* Agent chat */}
        <Panel className="flex flex-col xl:col-span-5" kicker="Onboarding console" title="Your growth agent">
          <div className="flex max-h-[460px] min-h-[320px] flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {chat.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border",
                    m.role === "agent" ? "border-[#f0d59a]/40 bg-[#f0d59a]/10 text-[#f3e2b8]" : "border-white/15 bg-white/5 text-white/70",
                  )}
                >
                  {m.role === "agent" ? <Bot className="size-4" /> : <User className="size-4" />}
                </span>
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed",
                    m.role === "agent" ? "rounded-tl-sm border border-white/10 bg-ink/60 text-white/85" : "rounded-tr-sm bg-[#f3e2b8] text-[#1a0f05]",
                  )}
                >
                  {m.text}
                </p>
              </motion.div>
            ))}
            {thinking !== null && (
              <div className="ml-10 space-y-1.5 rounded-2xl border border-[#5ee7ff]/20 bg-[#5ee7ff]/[0.05] px-4 py-3">
                {THINKING.map((s, i) => (
                  <p key={s} className={cn("flex items-center gap-2 font-mono text-[11px]", i <= thinking ? "text-[#8ff0ff]" : "text-white/25")}>
                    {i < thinking ? "✓" : i === thinking ? <Loader2 className="size-3 animate-spin" /> : "·"} {s}
                  </p>
                ))}
              </div>
            )}
            <div ref={chatEnd} />
          </div>
          {chat.length === 1 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(undefined, s)}
                  className="rounded-full border border-white/10 bg-ink/40 px-3 py-1.5 text-left text-[11px] text-white/65 transition-colors hover:border-[#f0d59a]/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={send} className="mt-4 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              placeholder="@handle, niche, audience size, or your product…"
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-ink/60 px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:border-[#f0d59a]/50 focus:outline-none focus:ring-2 focus:ring-[#f0d59a]/15"
            />
            <button
              type="submit"
              disabled={thinking !== null || !draft.trim()}
              aria-label="Send to agent"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f3e2b8] text-[#1a0f05] disabled:opacity-50"
            >
              {thinking !== null ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </Panel>

        {/* Master strategy roadmap */}
        <Panel
          className="xl:col-span-7"
          kicker="Master strategy roadmap"
          title={roadmap ? (roadmap.profile.handle ?? `${roadmap.profile.nicheLabel} ${roadmap.profile.mode}`) : "Waiting for your positioning"}
          right={roadmap ? <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">{roadmap.source === "groq" ? `Groq ${roadmap.model}` : "planner"}</span> : undefined}
        >
          {roadmap ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {[roadmap.profile.tier, roadmap.profile.nicheLabel, `${compact(roadmap.profile.audience)} ${roadmap.profile.audienceSource === "stated" ? "audience" : "est. audience"}`, ...roadmap.profile.platforms].map((t) => (
                  <span key={t} className="rounded-full border border-[#5ee7ff]/20 bg-[#5ee7ff]/[0.06] px-3 py-1 text-[12px] text-white/85">
                    {t}
                  </span>
                ))}
              </div>
              <p className="font-display text-xl italic leading-snug text-white/85">{roadmap.positioning}</p>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f0d59a]/80">Floor rates</p>
                  <ul className="space-y-1.5">
                    {roadmap.floorRates.map((f) => (
                      <li key={f.platform + f.format} className="flex justify-between gap-3 border-b border-white/[0.06] pb-1.5 text-[13px]">
                        <span className="text-white/75">
                          <span className="text-white">{f.platform}</span> · {f.format}
                        </span>
                        <span className="font-mono tabular-nums text-[#f3e2b8]">{money(f.floor)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 flex justify-between font-mono text-[11px] text-white/55">
                    <span>Cross-platform package floor</span>
                    <span className="text-gold-metal text-base">{money(roadmap.packageFloor)}</span>
                  </p>
                </div>
                <div>
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f0d59a]/80">
                    Outreach · {roadmap.outreach.totalTargets} sponsors
                  </p>
                  <ul className="space-y-2">
                    {roadmap.outreach.waves.map((w, i) => {
                      const sent = Math.max(0, Math.min(w.count, pitched - i * 18));
                      return (
                        <li key={w.name}>
                          <div className="flex justify-between text-[12px]">
                            <span className="text-white/85">{w.name}</span>
                            <span className="font-mono text-white/45">
                              {w.day} · {sent}/{w.count}
                            </span>
                          </div>
                          <Meter value={(sent / w.count) * 100} className="mt-1.5" />
                          <p className="mt-1 text-[11px] text-white/40">{w.focus}</p>
                        </li>
                      );
                    })}
                  </ul>
                  <ul className="mt-4 grid grid-cols-2 gap-1.5">
                    {roadmap.outreach.targets.slice(0, 8).map((t, i) => (
                      <li
                        key={t.brand + i}
                        className={cn("truncate rounded-lg border px-2 py-1 font-mono text-[10px]", i < pitched ? "border-[#f0d59a]/30 text-[#f3e2b8]" : "border-white/10 text-white/45")}
                        title={`${t.brand} · ${t.category} · fit ${t.fit} · ask ${money(t.openingAsk)}`}
                      >
                        {t.brand} · {t.fit}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 font-mono text-[10px] text-white/35">+{roadmap.outreach.totalTargets - 8} more queued</p>
                </div>
              </div>

              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f0d59a]/80">Negotiation guardrails</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {roadmap.guardrails.map((g) => (
                    <li key={g.rule} className="flex gap-2.5 rounded-xl border border-white/[0.07] bg-ink/40 px-3 py-2">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#f3d48f]" />
                      <span className="min-w-0">
                        <span className="block text-[12px] text-white/90">{g.rule}</span>
                        <span className="block text-[11px] leading-snug text-white/50">{g.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
              <Sparkles className="size-8 text-[#f0d59a]/60" />
              <p className="max-w-sm text-[14px] text-white/55">
                Tell the agent who you are. It prices YouTube, Instagram, TikTok and X, queues 50+ sponsors, and sets the rules it negotiates by.
              </p>
            </div>
          )}
        </Panel>

        {/* Autonomous inbox */}
        <Panel className="xl:col-span-7" kicker="Autonomous inbox stream" title="Every offer, triaged at once">
          <ol className="space-y-2">
            <AnimatePresence initial={false}>
              {deals.map((d) => (
                <motion.li key={d.id} layout="position" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(d);
                      setApiResult(null);
                    }}
                    className={cn(
                      "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_auto_auto]",
                      selected?.id === d.id ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.08]" : "border-white/[0.07] bg-ink/40 hover:border-white/20",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-white/90">
                        {dealLabel(d)} <span className="font-normal text-white/45">· {d.brand}</span>
                      </span>
                      <span className="block truncate font-mono text-[10px] text-white/40">
                        {d.input.deliverables} · score {d.analysis.score}
                      </span>
                    </span>
                    <span className="hidden font-mono text-[11px] tabular-nums text-white/60 sm:block">
                      {money(d.offer)}
                      {d.stage !== "inbound" && d.stage !== "triaged" && d.analysis.action === "COUNTER" && <span className="text-sun"> → {money(d.counter)}</span>}
                      {d.final !== null && d.final !== d.offer && <span className="text-[#f7e2a8]"> ✓ {money(d.final)}</span>}
                    </span>
                    <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]", STAGE_STYLE[d.stage])}>{STAGE_LABEL[d.stage]}</span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </Panel>

        {/* Selected deal */}
        <Panel className="xl:col-span-5" kicker="Negotiation room" title={selected ? `${selected.brand} · ${dealLabel(selected)}` : "Pick a deal"}>
          {selected ? (
            <div className="space-y-4">
              <p className="text-[13px] italic text-white/65">“{selected.input.emailText}”</p>
              <ul className="space-y-1">
                {selected.analysis.lines.map((l) => (
                  <li key={l.label} className="flex justify-between font-mono text-[11px] text-white/60">
                    <span>
                      {l.qty}× {l.label}
                    </span>
                    <span className="tabular-nums">{money(l.subtotal)}</span>
                  </li>
                ))}
                {selected.analysis.markupPct > 0 && (
                  <li className="flex justify-between font-mono text-[11px] text-white/60">
                    <span>Usage rights +{Math.round(selected.analysis.markupPct * 100)}%</span>
                    <span className="tabular-nums">{money(selected.analysis.markupAmount)}</span>
                  </li>
                )}
                <li className="flex justify-between border-t border-white/10 pt-1 font-mono text-[12px] text-[#f3e2b8]">
                  <span>Floor</span>
                  <span className="tabular-nums">{money(selected.analysis.floorTotal)}</span>
                </li>
              </ul>
              {selected.analysis.flags.length > 0 && (
                <ul className="space-y-1">
                  {selected.analysis.flags.map((f) => (
                    <li key={f.id} className="flex gap-2 text-[12px] text-[#ffc2a8]">
                      <XCircle className="mt-0.5 size-3.5 shrink-0" /> {f.label}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-3">
                <span className={cn("rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]", STAGE_STYLE[selected.stage])}>{STAGE_LABEL[selected.stage]}</span>
                <span className="font-mono text-[11px] text-white/45">engine verdict: {selected.analysis.action}</span>
              </div>
              <button
                type="button"
                onClick={() => negotiate(selected)}
                disabled={negotiating}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f3e2b8] px-5 text-[13px] font-semibold text-[#1a0f05] shadow-[0_0_40px_-10px_rgb(243_212_143/0.8)] disabled:opacity-60"
              >
                {negotiating ? <Loader2 className="size-4 animate-spin" /> : <Handshake className="size-4" />} Draft the counter via engine API
              </button>
              {apiResult && (
                <div className="space-y-3 rounded-2xl border border-[#5ee7ff]/20 bg-[#5ee7ff]/[0.05] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8ff0ff]">
                    {apiResult.result.action} · {money(apiResult.result.suggestedCounterPrice)} · {apiResult.engine} · {apiResult.latency} ms
                  </p>
                  <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-white/80">{apiResult.result.counterEmailDraft}</pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-white/45">Click any deal in the inbox to see its floor breakdown, risk flags and the counter-email the engine would send.</p>
          )}
        </Panel>
      </div>

      <DemoSection eyebrow="The process" title="Three movements," accent="every offer, every hour.">
        <ProcessDeepDive
          steps={[
            {
              title: "Environmental Perception",
              body: "Every sponsor email is read against your floor rates, the usage rights requested, and risk language like perpetual rights, exposure-only pay and long payment terms.",
              stat: fmt(deals.length),
              statLabel: "deals perceived right now",
            },
            {
              title: "Autonomous Reasoning",
              body: "The rate card prices the exact scope, adds usage-rights premiums, and decides whether to accept, counter or walk. It never counters below your floor.",
              stat: `${uplift >= 0 ? "+" : ""}${uplift.toFixed(0)}%`,
              statLabel: "average uplift over first offers",
            },
            {
              title: "Self-Execution",
              body: "Counters go out in your voice, round-two pushback is held at the floor, and signed deals are staged for your single tap of approval.",
              stat: `$${compact(totals.closedRevenue)}`,
              statLabel: "closed this session",
            },
          ]}
        />
      </DemoSection>

      <DemoSection eyebrow="Automated shift schedule" title="Your deal desk," accent="around the clock.">
        <ShiftSchedule
          shifts={[
            {
              name: "Morning Sponsor Harvest",
              window: "06:00 – 12:00",
              tasks: ["Sweep the inbox and DMs for offers", "Price every scope against your floors", "Send outreach wave to queued sponsors", "Decline lowballs politely"],
              output: roadmap ? `${pitched}/${roadmap.outreach.totalTargets} sponsors pitched` : "Build a roadmap to queue sponsors",
            },
            {
              name: "Mid-Day Counter-Offer Execution",
              window: "12:00 – 20:00",
              tasks: ["Draft counters in your voice", "Hold the floor through round two", "Price usage rights & exclusivity", "Escalate only true edge cases"],
              output: `${inFlight.length} negotiations live`,
            },
            {
              name: "Night Contract Staging",
              window: "20:00 – 06:00",
              tasks: ["Assemble agreements for closed deals", "Attach deliverable calendars", "Set deposit & Net 30 invoices", "Stage everything for one-tap approval"],
              output: `${totals.closedCount} contracts staged · $${compact(totals.closedRevenue)}`,
            },
          ]}
        />
      </DemoSection>

      <DemoSection eyebrow="Automation log" title="Every decision," accent="on the record.">
        <Panel>
          <LiveLog entries={log.slice(0, 18)} className="max-h-[420px]" />
        </Panel>
        <p className="mt-4 flex items-start gap-2 text-xs text-white/40">
          <Target className="mt-0.5 size-3.5 shrink-0" />
          Sponsor offers and brand replies are simulated sample data. Each offer is triaged by the real Aware Marketing rate-card engine; the roadmap and drafted counters come from the live API.
        </p>
      </DemoSection>

      <EmbedDrawer open={embedOpen} onClose={() => setEmbedOpen(false)} sample={PRESETS[0].input} result={apiResult?.result ?? null} />
    </DemoShell>
  );
}
