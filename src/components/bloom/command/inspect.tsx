"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, CircleSlash, FileText, Lock, Mail, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHANNELS, COMPANIES, ENGINES, usdFmt, type Answers, type Channel, type Engine, type EngineKey } from "./engines";
import { FADE, SNAP } from "../motion";
import type { FeedItem } from "./use-workforce";

const EASE = [0.16, 1, 0.3, 1] as const;

export type InspectTarget = { card: string; item?: FeedItem; seed: number };

/* ───────────────────────────── Sample data ───────────────────────────── */

/** Deterministic randomness, so an inspected item always shows the same proof. */
function rng(seed: number) {
  let s = seed | 0;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, pick: <T,>(xs: T[]) => xs[Math.floor(next() * xs.length)], int: (a: number, b: number) => Math.round(a + next() * (b - a)) };
}

const FIRST = ["Maya", "Daniel", "Priya", "Lucas", "Sofia", "Ethan", "Amara", "Jonah", "Elena", "Marcus", "Noa", "Theo"];
const LAST = ["Chen", "Okafor", "Levi", "Romero", "Hart", "Nakamura", "Bauer", "Silva", "Morgan", "Reyes"];
const ROLES = ["Head of Growth", "VP Operations", "Founder", "COO", "Marketing Director", "Procurement Lead"];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const clock = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function person(r: ReturnType<typeof rng>, co?: string) {
  const first = r.pick(FIRST);
  const last = r.pick(LAST);
  const company = co ?? r.pick(COMPANIES);
  return { first, last, name: `${first} ${last}`, role: r.pick(ROLES), company, email: `${first.toLowerCase()}@${slug(company)}.com` };
}

/* ───────────────────────────── Drawer ───────────────────────────── */

/** A frosted glass side sheet (bottom-to-top on phones) for watching agents work. Read-only by design. */
export function Drawer({ kicker, title, onClose, children }: { kicker: string; title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50" exit={{ transition: { duration: 0.25 } }}>
      <motion.div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE} />
      <motion.aside
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={SNAP}
        className="absolute inset-y-0 right-0 flex will-change-transform w-full flex-col border-l border-c-edge/50 bg-black/80 shadow-[-30px_0_80px_-20px_rgb(0_0_0/0.9)] outline-none backdrop-blur-md sm:max-w-[540px]"
      >
        <span aria-hidden className="pointer-events-none absolute inset-y-16 left-0 w-px bg-linear-to-b from-transparent via-c-2/60 to-transparent" />
        <header className="flex items-start gap-3 border-b border-c-edge/40 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-c-2/85">{kicker}</p>
            <h2 className="mt-1 font-display text-[26px] font-medium leading-tight">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto rounded-md p-1.5 text-white/50 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-c-2">
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        <p className="flex items-center gap-2 border-t border-c-edge/40 px-5 py-3 text-[11.5px] text-white/50">
          <span className="size-1.5 animate-pulse rounded-full bg-c-1" />
          Passive monitoring. Agents are doing this on their own; nothing here needs your input. Sample data.
        </p>
      </motion.aside>
    </motion.div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-c-2/80">{children}</p>;
const Panel = ({ className, children }: { className?: string; children: React.ReactNode }) => <div className={cn("rounded-xl border border-white/10 bg-white/[0.03] p-4", className)}>{children}</div>;

/** One drawer for whatever was clicked, in the form that suits the engine. */
export function Inspector({ engine, answers, target, onClose }: { engine: Engine; answers: Answers; target: InspectTarget; onClose: () => void }) {
  const title: Record<EngineKey, string> = {
    intentpulse: "Signal Sheet",
    apex: "Live Deal Simulator",
    coreops: "Automation Proof Window",
    sovereign: "System Decision Tree",
    vanguard: "Outreach Trace",
    cortex: "Deal Brief",
    shield: "Account Health Trace",
    aether: "Pricing Trace",
  };
  return (
    <Drawer kicker={`Engine Nº ${engine.index} · ${engine.name}`} title={title[engine.key]} onClose={onClose}>
      {engine.key === "intentpulse" && <SignalSheet answers={answers} target={target} />}
      {engine.key === "apex" && <DealSimulator answers={answers} target={target} />}
      {engine.key === "coreops" && <ProofWindow target={target} />}
      {engine.key === "sovereign" && <DecisionTree answers={answers} target={target} />}
      {engine.key in TRACE && <ActionTrace engine={engine} target={target} />}
    </Drawer>
  );
}

/* ───────────────────────────── Engines 05–08 · Action Trace ───────────────────────────── */

/** How each of engines 05–08 got from a signal to the action that was clicked: what it saw, weighed and did. */
const TRACE: Partial<Record<EngineKey, { signal: string[]; decision: string[]; action: string[]; value: string }>> = {
  vanguard: {
    signal: ["Hiring three account executives", "Closed a funding round last week", "Publicly asked for vendor recommendations", "Visited the pricing page twice"],
    decision: ["Fits the ideal account profile and has budget now", "Decision-maker identified and email verified", "Timing beats every competitor still waiting for inbound"],
    action: ["Personal first touch written in the founder's voice", "Meeting slot offered for this week", "Research pack attached for Apex"],
    value: "Projected pipeline",
  },
  cortex: {
    signal: ["Raised price three times on the last call", "Asked who else uses the product", "Went quiet nine days after the demo", "Mentioned a cheaper competitor by name"],
    decision: ["The real objection is risk, not price", "The economic buyer hasn't been on a call yet", "A side-by-side beats a discount here"],
    action: ["Closing brief sent to the closer before the call", "Value-first reply drafted to the objection", "Decision call proposed with the economic buyer"],
    value: "Deal velocity recovered",
  },
  shield: {
    signal: ["Active users down 30% in two weeks", "Internal champion left the company", "Two support tickets unanswered for 48 hours", "Renewal due in 45 days"],
    decision: ["Churn risk high: act before the renewal conversation", "The fix is onboarding, not a discount", "Healthy usage elsewhere supports an expansion later"],
    action: ["Personal check-in from the account lead", "Fix plan sent with dates", "Executive save call booked"],
    value: "Revenue protected",
  },
  aether: {
    signal: ["Buyers in this segment accept 22% higher annual prices", "Discount requests up 40% this month", "Heavy users hitting plan limits", "Competitor raised prices last quarter"],
    decision: ["Package the most-used feature into the higher tier", "Trade discount for term length, never for nothing", "Price the upgrade at the value metric, not per seat"],
    action: ["New price sheet sent to Apex", "Discount replaced with a two-year term", "Upgrade offer queued for Shield"],
    value: "Contract value unlocked",
  },
};

function ActionTrace({ engine, target }: { engine: Engine; target: InspectTarget }) {
  const t = TRACE[engine.key]!;
  const r = rng(target.seed);
  const p = person(r, target.item?.co);
  const value = target.item?.amt ?? r.int(40, 320) * 100;
  const stages: [string, string][] = [
    ["Signal", r.pick(t.signal)],
    ["Decision", r.pick(t.decision)],
    ["Action", r.pick(t.action)],
  ];
  return (
    <div className="space-y-4">
      {target.item && <p className="text-[13.5px] text-white/70">{target.item.text.replace(/^Agent #\d+ /, "")}</p>}
      <Panel>
        <Label>Account</Label>
        <p className="mt-1.5 text-[15px] text-white">{p.company}</p>
        <p className="text-[12.5px] text-white/55">
          {p.name}, {p.role}
        </p>
      </Panel>
      <ol className="space-y-2">
        {stages.map(([k, v], i) => (
          <motion.li key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.3, duration: 0.4, ease: EASE }} className="flex gap-3 rounded-xl border border-white/10 bg-black/40 p-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-c-1/50 font-mono text-[10px] text-c-2">{i + 1}</span>
            <span className="min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-c-2/80">{k}</span>
              <span className="mt-0.5 block text-[13.5px] text-white/85">{v}</span>
            </span>
          </motion.li>
        ))}
      </ol>
      <Panel className="text-center">
        <p className="font-logo text-[26px] font-medium tabular-nums tracking-[-0.02em] text-c-2">{usdFmt(value)}</p>
        <p className="text-[12px] text-white/60">{t.value}</p>
        <p className="mt-1 text-[10.5px] text-white/40">Simulated sample data for this demo.</p>
      </Panel>
    </div>
  );
}

/* ───────────────────────────── IntentPulse · Signal Sheet ───────────────────────────── */

const SNIPPETS: Record<string, string[]> = {
  tech: [
    "Anyone know a tool that can take our inbound leads and actually qualify them? Our sales team is drowning.",
    "We're dropping our current vendor at the end of the quarter. Budget is approved, we need something that works with our CRM.",
    "Looking for recommendations: an automated workflow for our ops team, 40 people, needs to be live in 30 days.",
    "Honestly ready to pay for anything that stops us losing leads over the weekend.",
  ],
  luxury: [
    "Where do you buy pieces like this? Price isn't the issue, quality is.",
    "Need a statement gift under $5k, something that feels rare. Ideas?",
    "Done with fast fashion. Looking for a brand I can buy from for years.",
    "Has anyone ordered custom from a small atelier? Want something for an event next month.",
  ],
  finance: [
    "Looking to buy two rental units this quarter. Who's a good agent for investors?",
    "Pre-approved and ready to move. I just need someone who actually picks up the phone.",
    "Our fund is looking at mid-size commercial properties. Any advisors you'd recommend?",
    "Selling in the spring and want a valuation from someone serious.",
  ],
};
const COMMUNITY: Record<string, string> = { tech: "r/SaaS", luxury: "r/BuyItForLife", finance: "r/realestateinvesting" };
const TELLS = ["Asked for a recommendation", "Mentioned an approved budget", "Has a deadline this quarter", "Comparing two competitors", "Unhappy with current provider", "Decision-maker at the company"];

function SignalSheet({ answers, target }: { answers: Answers; target: InspectTarget }) {
  const { item, seed } = target;
  const r = rng(seed);
  const vector = String(answers.vector);
  const pool = vector === "custom" ? Object.values(SNIPPETS).flat() : (SNIPPETS[vector] ?? SNIPPETS.tech);
  const ch: Channel = item?.ch ?? r.pick(CHANNELS).id;
  const chLabel = CHANNELS.find((c) => c.id === ch)!.label;
  const p = person(r, item?.co);
  const handle = { instagram: `@${p.first.toLowerCase()}.${slug(p.last)}`, tiktok: `@${p.first.toLowerCase()}${r.int(10, 99)}`, x: `@${p.first[0].toLowerCase()}${slug(p.last)}`, reddit: `u/${slug(p.company).slice(0, 8)}_${p.first.toLowerCase()}`, linkedin: `${p.name} · ${p.role}` }[ch];
  const score = item?.lead === false ? r.int(72, 86) : r.int(88, 99);
  const value = item?.amt ?? r.int(90, 480) * 100;
  const snippet = r.pick(pool);
  const tells = [...TELLS].sort(() => r.next() - 0.5).slice(0, 3);
  const at = item?.at ?? Date.now();
  const toApex = answers.route === "apex";
  const reduce = useReducedMotion();

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-c-edge/60 bg-c-deep font-logo text-[15px] text-c-2">
            {p.first[0]}
            {p.last[0]}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-white">{ch === "linkedin" ? p.name : handle}</p>
            <p className="truncate text-[12.5px] text-white/55">
              {p.role} · {p.company}
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full border border-c-edge/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-c-2">{chLabel}</span>
        </div>
      </Panel>

      <div className="grid grid-cols-[auto_1fr] items-center gap-4">
        <div className="relative size-28">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
            <motion.circle cx="50" cy="50" r="42" fill="none" stroke="var(--c-1)" strokeWidth="8" strokeLinecap="round" pathLength={100} strokeDasharray="100" initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 100 - score }} transition={{ duration: reduce ? 0 : 1.4, ease: EASE }} style={{ filter: "drop-shadow(0 0 6px var(--c-glow))" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-logo text-[28px] font-medium tabular-nums leading-none text-white">{score}%</span>
            <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/50">Intent</span>
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <div>
            <Label>Estimated contract value</Label>
            <p className="mt-1 font-logo text-[24px] font-medium tabular-nums text-c-2">{usdFmt(value)}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tells.map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/70">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Panel>
        <Label>
          Captured post · {chLabel}
          {ch === "reddit" ? ` · ${COMMUNITY[vector] ?? "r/Entrepreneur"}` : ""}
        </Label>
        <blockquote className="mt-2 border-l-2 border-c-1/60 pl-3 text-[14px] italic leading-relaxed text-white/85">&ldquo;{snippet}&rdquo;</blockquote>
        <p className="mt-2 text-[11.5px] text-white/45">Posted {clock(at - 4 * 60_000)} · captured {clock(at - 50_000)}</p>
      </Panel>

      <Panel className={toApex ? "border-c-1/40" : undefined}>
        <Label>Instant hand-off destination</Label>
        {toApex ? (
          <>
            <p className="mt-1.5 text-[15px] font-medium text-white">Engine Nº 02 · Apex (closing)</p>
            <p className="text-[12.5px] text-white/60">Dispatched with a summary of what they need. Apex opened the conversation 4 seconds later.</p>
            <Link href="/command/apex" className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-c-2 hover:text-white">
              Watch Apex close it <ArrowRight className="size-3.5" />
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-[15px] font-medium text-white">IntentPulse dashboard</p>
            <p className="text-[12.5px] text-white/60">Logged and ranked for your review, as your routing protocol asks.</p>
          </>
        )}
      </Panel>

      <div>
        <Label>Signal trail</Label>
        <ol className="mt-2 space-y-2">
          {[
            ["Detected on " + chLabel, at - 50_000],
            ["Scored at " + score + "% intent", at - 38_000],
            ["Enriched: role, company, likely budget", at - 20_000],
            [toApex ? "Handed to Apex" : "Logged to dashboard", at],
          ].map(([label, t], i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.25 }} className="flex items-center gap-3 text-[13px] text-white/80">
              <span className="flex size-5 items-center justify-center rounded-full bg-c-1/20 text-c-2">
                <Check className="size-3" />
              </span>
              {label}
              <span className="ml-auto font-mono text-[10.5px] tabular-nums text-white/40">{clock(t as number)}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ───────────────────────────── Apex · Live Deal Simulator ───────────────────────────── */

const STAGES = ["Objection Handled", "Contract Dispatched", "Closed Won"];

function DealSimulator({ answers, target }: { answers: Answers; target: InspectTarget }) {
  const [round, setRound] = useState(0);
  const r = rng(target.seed + round * 7919);
  const p = person(r, round === 0 ? target.item?.co : undefined);
  const peer = r.pick(COMPANIES.filter((c) => c !== p.company));
  const chans = Array.isArray(answers.channels) && answers.channels.length ? answers.channels : ["linkedin"];
  const ch = r.pick(chans);
  const chLabel = { instagram: "Instagram DM", linkedin: "LinkedIn message", voice: "Email" }[ch] ?? "Email";
  const caliber = String(answers.caliber);
  const value = round === 0 && target.item?.amt ? target.item.amt : caliber === "d2c" ? r.int(4, 24) * 100 : caliber === "retainer" ? r.int(40, 120) * 100 : r.int(120, 420) * 100;
  const need = { b2b: "help scaling outbound for our sales team", d2c: "a gift for a client, ideally by next week", retainer: "ongoing support every month" }[caliber] ?? "help with this";
  const reply = {
    elite: `Fair question. Most teams that come to us have already tried the cheaper route. ${peer} had the same concern and doubled qualified meetings in 60 days. I'd rather show you that than discount it.`,
    urgency: "Understood. I can hold this quarter's rate until Friday. After that, onboarding moves to next month and the price goes up.",
    stack: "Totally fair. I'll include onboarding support and a 30-day performance review at no extra cost, so you can see the full value before you commit.",
  }[String(answers.tone)] ?? "Fair question. Let me show you where the value is.";

  const script = useMemo(() => {
    const agent = `Apex agent #${String(r.int(1, 42)).padStart(2, "0")}`;
    return [
      { from: "them", text: `Hi, we saw your work with ${peer}. We need ${need}, but honestly your pricing looks high.` },
      { from: "apex", agent, text: reply },
      { from: "them", text: "Okay, that actually helps. What would next steps look like?", stage: 0 },
      { from: "apex", agent, text: `I've sent the agreement for ${usdFmt(value)} to ${p.email}. It covers scope, timeline and everything we discussed.`, attach: `Agreement_${slug(p.company)}.pdf`, stage: 1 },
      { from: "them", text: "Reviewing it with our COO now." },
      { from: "them", text: "Signed. Looking forward to getting started." },
      { from: "apex", agent, text: "Welcome aboard. CoreOps is sending your onboarding pack now.", stage: 2 },
    ];
  },
    // Rebuilt per round; the inputs are derived from the round's seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round],
  );

  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= script.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), reduce ? 200 : shown === 0 ? 500 : 1700);
    return () => clearTimeout(t);
  }, [shown, script.length, reduce]);

  const reached = Math.max(-1, ...script.slice(0, shown).map((m) => m.stage ?? -1));
  const won = reached === 2;
  const thread = useRef<HTMLDivElement>(null);
  // Braces matter: scrollTo returns a Promise in current browsers, and an effect may only return a cleanup.
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [shown]);

  return (
    <div className="space-y-4">
      <Panel className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-c-edge/60 bg-c-deep font-logo text-c-2">
          {p.first[0]}
          {p.last[0]}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium">{p.name}</p>
          <p className="truncate text-[12px] text-white/55">
            {p.role} · {p.company}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-logo text-[18px] font-medium tabular-nums text-c-2">{usdFmt(value)}</p>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/45">{chLabel}</p>
        </div>
      </Panel>

      <ol className="grid grid-cols-3 gap-1.5" aria-label="Closing stages">
        {STAGES.map((s, i) => (
          <li key={s} className={cn("rounded-lg border px-2 py-2 text-center transition-colors duration-500", i <= reached ? "border-c-1/60 bg-c-1/15 text-white shadow-[0_0_20px_-6px_var(--c-glow)]" : "border-white/10 text-white/40")}>
            <span className="mx-auto mb-1 flex size-4 items-center justify-center rounded-full border border-current">{i <= reached && <Check className="size-2.5" />}</span>
            <span className="block text-[11px] leading-tight">{s}</span>
          </li>
        ))}
      </ol>

      <div ref={thread} className="max-h-[46dvh] space-y-2.5 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-3" aria-live="polite">
        <AnimatePresence initial={false}>
          {script.slice(0, shown).map((m, i) => (
            <motion.div key={`${round}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={cn("max-w-[86%]", m.from === "apex" ? "ml-auto" : "")}>
              <p className={cn("mb-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em]", m.from === "apex" ? "text-right text-c-2/80" : "text-white/40")}>{m.from === "apex" ? m.agent : p.first}</p>
              <p className={cn("rounded-2xl px-3.5 py-2 text-[13px] leading-snug", m.from === "apex" ? "rounded-br-sm border border-c-1/30 bg-c-1/15 text-white" : "rounded-bl-sm border border-white/10 bg-white/[0.05] text-white/85")}>{m.text}</p>
              {m.attach && (
                <span className="mt-1.5 ml-auto flex w-fit items-center gap-1.5 rounded-md border border-c-edge/60 bg-c-deep/60 px-2 py-1 text-[11.5px] text-c-2">
                  <FileText className="size-3.5" /> {m.attach}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {shown < script.length && <p className="text-[11.5px] text-white/40">{script[shown].from === "apex" ? "Apex is writing…" : `${p.first} is typing…`}</p>}
      </div>

      <AnimatePresence>
        {won && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-wrap items-center gap-3 rounded-xl border border-c-1/60 bg-c-1/15 p-4 shadow-[0_0_50px_-12px_var(--c-glow)]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-c-2">Closed won</p>
              <p className="font-logo text-[24px] font-medium tabular-nums">{usdFmt(value)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRound((n) => n + 1);
                setShown(0);
              }}
              className="ml-auto h-9 rounded-md border border-white/15 px-3 text-[12.5px] text-white/80 hover:border-c-1/60 hover:text-white"
            >
              Watch another deal
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────── CoreOps · Automation Proof Window ───────────────────────────── */

const PROOF_TITLE: Record<string, string> = { onboarding: "New client onboarding", sync: "Client record sync", invoicing: "Invoice run", routing: "Inbound request handled" };

function ProofWindow({ target }: { target: InspectTarget }) {
  const r = rng(target.seed);
  const p = person(r, target.item?.co);
  const plan = r.pick(["Growth retainer", "Enterprise plan", "Quarterly program"]);
  const fee = target.item?.amt ?? r.int(24, 180) * 100;
  const start = new Date(Date.now() + r.int(2, 9) * 86_400_000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fields: [string, string][] = [
    ["Company", p.company],
    ["Primary contact", `${p.name}, ${p.role}`],
    ["Email", p.email],
    ["Billing address", `${r.int(12, 980)} ${r.pick(["Harbor", "Market", "King", "Mercer"])} St, ${r.pick(["Austin", "London", "Tel Aviv", "Toronto"])}`],
    ["Plan", plan],
    ["Start date", start],
  ];
  const total = fields.reduce((s, [, v]) => s + v.length, 0);
  const reduce = useReducedMotion();
  const [chars, setChars] = useState(reduce ? total : 0);
  const [phase, setPhase] = useState(reduce ? 3 : 0);

  useEffect(() => {
    if (chars < total) {
      const t = setTimeout(() => setChars((c) => Math.min(total, c + 2)), 28);
      return () => clearTimeout(t);
    }
    if (phase < 3) {
      const t = setTimeout(() => setPhase((s) => s + 1), phase === 0 ? 500 : 1400);
      return () => clearTimeout(t);
    }
  }, [chars, total, phase]);

  let left = chars;
  const invoice = `INV-${r.int(2400, 9800)}`;

  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-white/70">
        {PROOF_TITLE[target.card] ?? "Automation run"} for <span className="text-white">{p.company}</span>, start to finish with no one touching it.
      </p>
      <ol className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
        {["Form auto-filled", "Contract generated", "Invoice dispatched"].map((s, i) => {
          const done = (i === 0 && chars >= total) || phase > i;
          return (
            <li key={s} className={cn("rounded-lg border px-2 py-2 transition-colors duration-500", done ? "border-c-1/60 bg-c-1/15 text-white" : "border-white/10 text-white/40")}>
              <span className="mx-auto mb-1 flex size-4 items-center justify-center rounded-full border border-current">{done && <Check className="size-2.5" />}</span>
              {s}
            </li>
          );
        })}
      </ol>

      <Panel>
        <Label>Client onboarding form</Label>
        <dl className="mt-3 space-y-2">
          {fields.map(([k, v]) => {
            const n = Math.max(0, Math.min(v.length, left));
            left -= v.length;
            return (
              <div key={k} className="grid grid-cols-[110px_1fr] items-center gap-2 text-[12.5px] max-[400px]:grid-cols-1 max-[400px]:gap-0.5">
                <dt className="text-white/45">{k}</dt>
                <dd className={cn("min-h-8 rounded-md border px-2.5 py-1.5 text-white transition-colors", n > 0 && n < v.length ? "border-c-1/60 bg-c-1/10" : "border-white/10 bg-black/30")}>
                  {v.slice(0, n)}
                  {n > 0 && n < v.length && <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-c-2" />}
                </dd>
              </div>
            );
          })}
        </dl>
      </Panel>

      <AnimatePresence>
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <Label>Generated contract</Label>
            <div className="relative mt-2 overflow-hidden rounded-lg bg-[#f4efe6] p-5 text-[#2a2420] shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)]">
              <p className="text-center font-display text-[18px] font-semibold">Master Services Agreement</p>
              <p className="mt-1 text-center text-[10.5px] uppercase tracking-[0.18em] text-[#2a2420]/60">PDF · 4 pages · generated in 0.8s</p>
              <div className="mt-4 space-y-1.5 text-[11.5px] leading-relaxed">
                <p>
                  <b>Between</b> your company and <b>{p.company}</b>, represented by {p.name}.
                </p>
                <p>
                  <b>Scope:</b> {plan}, starting {start}.
                </p>
                <p>
                  <b>Fee:</b> {usdFmt(fee)}, payable within 14 days of invoice.
                </p>
                {[92, 78, 85, 60].map((w, i) => (
                  <span key={i} className="block h-1.5 rounded-full bg-[#2a2420]/15" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#2a2420]/15 pt-3 text-[11px]">
                <span>
                  Signed: <span className="font-display text-[15px] italic">{p.name}</span>
                </span>
                {phase >= 2 && (
                  <motion.span initial={{ scale: 1.6, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -8 }} className="rounded border-2 border-[#1d6b4a] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#1d6b4a]">
                    Signed electronically
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <Panel className="border-c-1/40">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-c-1/20 text-c-2">
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">
                    Invoice {invoice} sent · {usdFmt(fee)}
                  </p>
                  <p className="truncate text-[12px] text-white/55">
                    To billing@{slug(p.company)}.com · due in 14 days · payment link included
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-[12.5px] text-white/75">
                {["Delivered to inbox", "Opened by " + p.first, "Payment link visited"].map((s, i) => (
                  <motion.li key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.6 }} className="flex items-center gap-2">
                    <Check className="size-3.5 text-c-2" /> {s}
                  </motion.li>
                ))}
              </ul>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────── Sovereign · System Decision Tree ───────────────────────────── */

type PolicyCheck = { label: string; ok: boolean; note: string };

function decisionFor(card: string, threshold: string, co: string): { trigger: string; checks: PolicyCheck[]; outcome: string; tone: "ok" | "stop" | "wait" } {
  const level = { "1": "Level 1 · Require Approval", "2": "Level 2 · Supervised", "3": "Level 3 · Zero-Human Interception" }[threshold] ?? "Level 2 · Supervised";
  if (card === "policy")
    return {
      trigger: `Vendor payment request: $12,400 to ${co}`,
      checks: [
        { label: "Inside monthly spend cap", ok: true, note: "62% of cap used" },
        { label: "Vendor and invoice verified", ok: false, note: "Same invoice number paid on the 3rd" },
        { label: `Authorization: ${level}`, ok: true, note: "Within limit" },
        { label: "Anomaly scan", ok: false, note: "Duplicate pattern detected" },
      ],
      outcome: "Blocked · duplicate invoice. Vendor notified, finance copied.",
      tone: "stop",
    };
  if (card === "risk")
    return {
      trigger: "Login to finance tools from a new country",
      checks: [
        { label: "Known device", ok: false, note: "First time seen" },
        { label: "Matches travel calendar", ok: false, note: "No travel booked" },
        { label: "Two-factor passed", ok: true, note: "Code accepted" },
        { label: "Normal working hours", ok: false, note: "03:12 local time" },
      ],
      outcome: "Locked first, explained second. Account owner asked to confirm.",
      tone: "stop",
    };
  if (card === "directives")
    return {
      trigger: "Proposed order: focus every engine on enterprise buyers this week",
      checks: [
        { label: "Pipeline supports it", ok: true, note: "41% of value is enterprise" },
        { label: "Apex has capacity", ok: true, note: "14 agents free" },
        { label: "Budget headroom", ok: true, note: "$18,000 available" },
        { label: "Risk exposure", ok: true, note: "Low" },
      ],
      outcome: threshold === "1" ? "Ready · waiting for your approval (Level 1)." : "Issued to all engines. Review scheduled for Friday.",
      tone: threshold === "1" ? "wait" : "ok",
    };
  return {
    trigger: "Apex requests $8,400 for a LinkedIn closing push",
    checks: [
      { label: "Inside monthly spend cap", ok: true, note: "71% of cap after move" },
      { label: "Return on last dollar", ok: true, note: "3.1× in 14 days" },
      { label: `Authorization: ${level}`, ok: threshold !== "1", note: threshold === "1" ? "Needs your sign-off" : "Auto-approved under $10,000" },
      { label: "Cash reserve after move", ok: true, note: "Above 90-day floor" },
    ],
    outcome: threshold === "1" ? "Queued for your approval, with the recommendation to approve." : "Approved · $8,400 released to Apex.",
    tone: threshold === "1" ? "wait" : "ok",
  };
}

const LINES = ["Paid search", "LinkedIn retargeting", "Cold prospecting", "Partner referrals", "Software seats", "Apex closing push", "Content production"];

function DecisionTree({ answers, target }: { answers: Answers; target: InspectTarget }) {
  const r = rng(target.seed);
  const d = decisionFor(target.card, String(answers.threshold), target.item?.co ?? r.pick(COMPANIES));
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? d.checks.length + 1 : 0);
  useEffect(() => {
    if (step > d.checks.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 400 : 650);
    return () => clearTimeout(t);
  }, [step, d.checks.length]);

  const [log, setLog] = useState(() =>
    Array.from({ length: 4 }, (_, i) => {
      const from = r.pick(LINES);
      return { id: i, at: Date.now() - (4 - i) * 47_000, from, to: r.pick(LINES.filter((l) => l !== from)), amt: r.int(6, 90) * 100 };
    }).reverse(),
  );
  useEffect(() => {
    const t = setInterval(() => {
      const from = LINES[Math.floor(Math.random() * LINES.length)];
      const to = LINES.filter((l) => l !== from)[Math.floor(Math.random() * (LINES.length - 1))];
      setLog((l) => [{ id: Date.now(), at: Date.now(), from, to, amt: Math.round(6 + Math.random() * 84) * 100 }, ...l].slice(0, 6));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const OutcomeIcon = d.tone === "stop" ? CircleSlash : d.tone === "wait" ? Lock : ShieldCheck;

  return (
    <div className="space-y-5">
      <div>
        <Label>Decision in progress</Label>
        <div className="mt-2 rounded-xl border border-c-1/40 bg-c-deep/50 p-3.5 text-[14px] font-medium text-white">{d.trigger}</div>
        <div className="ml-5 border-l border-dashed border-c-edge/70 py-1 pl-5">
          {d.checks.map((c, i) => (
            <motion.div key={c.label} initial={false} animate={{ opacity: i < step ? 1 : 0.25 }} className="relative my-2 flex items-start gap-2.5 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
              <span aria-hidden className="absolute -left-5 top-1/2 h-px w-5 bg-c-edge/70" />
              <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full", i >= step ? "border border-white/25" : c.ok ? "bg-c-1/25 text-c-2" : "bg-red-500/25 text-red-300")}>{i < step && (c.ok ? <Check className="size-2.5" /> : <X className="size-2.5" />)}</span>
              <span className="min-w-0 text-[13px] text-white/85">
                {c.label}
                <span className="block text-[11.5px] text-white/50">{i < step ? c.note : "Checking…"}</span>
              </span>
            </motion.div>
          ))}
        </div>
        <AnimatePresence>
          {step > d.checks.length && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex items-start gap-3 rounded-xl border p-3.5", d.tone === "stop" ? "border-red-400/40 bg-red-950/30" : "border-c-1/60 bg-c-1/15 shadow-[0_0_30px_-10px_var(--c-glow)]")}>
              <OutcomeIcon className={cn("mt-0.5 size-4 shrink-0", d.tone === "stop" ? "text-red-300" : "text-c-2")} />
              <p className="text-[13.5px] text-white">{d.outcome}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <Label>Budget allocation log · live</Label>
        <ul className="mt-2 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <AnimatePresence initial={false}>
            {log.map((l) => (
              <motion.li key={l.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 text-[12.5px]">
                <span className="font-mono text-[10.5px] tabular-nums text-white/40">{clock(l.at)}</span>
                <span className="min-w-0 truncate text-white/80">
                  {l.from} <span className="text-c-2">→</span> {l.to}
                </span>
                <span className="tabular-nums text-white">{usdFmt(l.amt)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <div>
        <Label>Risk mitigation overrides</Label>
        <ul className="mt-2 space-y-1.5">
          {[
            ["Paused a campaign spending 3× its daily average", "Stealth"],
            ["Held a refund above $2,000 for a second check", "Balanced"],
            [`Kept ${ENGINES.apex.name}'s discount at 12% instead of 18%`, "Policy"],
          ].map(([t, tag]) => (
            <li key={t} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/80">
              <ShieldCheck className="size-3.5 shrink-0 text-c-2" />
              <span className="min-w-0 flex-1">{t}</span>
              <span className="shrink-0 rounded-full border border-c-edge/60 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.12em] text-c-2">{tag}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
