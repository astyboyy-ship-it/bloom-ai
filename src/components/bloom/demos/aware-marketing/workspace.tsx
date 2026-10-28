"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BrainCircuit, Code2, Eye, Loader2, Mail, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  analyzeDeal,
  money,
  RATE_CARD,
  TONES,
  USAGE_RIGHTS,
  type DealAction,
  type DealAnalysis,
  type DealInput,
  type DealResult,
  type ToneKey,
  type UsageRightsKey,
} from "@/lib/aware-marketing/engine";
import { FloraField } from "../../art/flora";
import { PaintingCanvas, PaintingCaption } from "../../art/painting-canvas";
import { getEngine, type Engine } from "../../engines/data";
import { StatusLed } from "../../status-led";
import { CopyButton } from "./copy-button";
import { EmbedDrawer } from "./embed-drawer";
import { PRESETS } from "./presets";

const engine = getEngine("marketing") as Engine;

type Phase = "idle" | "perceive" | "reason" | "decide" | "error";
type FormState = Omit<DealInput, "budget"> & { budget: string };

const STAGES: { key: Exclude<Phase, "idle" | "error">; icon: LucideIcon; title: string; body: string }[] = [
  { key: "perceive", icon: Eye, title: "Perceive", body: engine.aware.perceive },
  { key: "reason", icon: BrainCircuit, title: "Reason", body: engine.aware.reason },
  { key: "decide", icon: Rocket, title: "Decide", body: engine.aware.execute },
];

const VERDICT: Record<DealAction, { label: string; className: string }> = {
  ACCEPT: { label: "Accept offer", className: "border-[#8ff0ff]/50 text-[#8ff0ff] shadow-[0_0_40px_-8px_rgb(94_231_255/0.6)]" },
  COUNTER: { label: "Counter-offer", className: "border-sun/70 text-sun shadow-[0_0_40px_-8px_rgb(255_189_110/0.7)]" },
  DECLINE: { label: "Reject", className: "border-rose/70 text-rose shadow-[0_0_40px_-8px_rgb(245_169_176/0.7)]" },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const toForm = (i: DealInput): FormState => ({ ...i, budget: String(i.budget) });
const toInput = (f: FormState): DealInput => ({ ...f, budget: Number(f.budget.replace(/[$,\s]/g, "")) || 0 });

const field =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white outline-none transition placeholder:text-white/30 focus:border-[#f0d59a]/50 focus:ring-2 focus:ring-[#f0d59a]/15 [&>option]:bg-ink";
const label = "font-mono text-[10px] uppercase tracking-[0.2em] text-white/45";
const kicker = "font-mono text-[10px] uppercase tracking-[0.28em]";

export function AwareMarketingWorkspace() {
  const reduce = useReducedMotion() ?? false;
  const [form, setForm] = useState<FormState>(() => toForm(PRESETS[0].input));
  const [preset, setPreset] = useState<string | null>(PRESETS[0].id);
  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState<{ input: DealInput; analysis: DealAnalysis } | null>(null);
  const [result, setResult] = useState<DealResult | null>(null);
  const [meta, setMeta] = useState<{ engine: string; server: number; roundTrip: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gauge, setGauge] = useState(0);
  const [email, setEmail] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [status, setStatus] = useState<{ inference: string; model: string | null } | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    fetch("/api/aware-marketing")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ inference: "offline", model: null }));
  }, []);

  const preview = useMemo(() => analyzeDeal(toInput(form)), [form]);
  const busy = phase === "perceive" || phase === "reason";

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setPreset(null);
  };

  function animateGauge(to: number) {
    if (reduce) return setGauge(to);
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 1100);
      setGauge(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async function negotiate(e: React.FormEvent) {
    e.preventDefault();
    const input = toInput(form);
    if (!input.brandName.trim() || !input.deliverables.trim()) {
      setError("Brand name and requested deliverables are required.");
      return;
    }
    const id = ++runId.current;
    setError(null);
    setResult(null);
    setMeta(null);
    setGauge(0);
    setRun({ input, analysis: analyzeDeal(input) });
    setPhase("perceive");

    const t0 = performance.now();
    const request = fetch("/api/aware-marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message ?? `Request failed (${r.status})`);
      return {
        data: data as DealResult,
        engine: r.headers.get("x-aware-engine") ?? "unknown",
        server: Number(r.headers.get("x-aware-latency-ms") ?? 0),
        roundTrip: Math.round(performance.now() - t0),
      };
    });

    try {
      // The stages are paced so each one is readable; the API call runs underneath them.
      await sleep(reduce ? 0 : 1300);
      if (id !== runId.current) return;
      setPhase("reason");
      const res = await request;
      if (id !== runId.current) return;
      setResult(res.data);
      setEmail(res.data.counterEmailDraft);
      setMeta({ engine: res.engine, server: res.server, roundTrip: res.roundTrip });
      animateGauge(res.data.dealScore);
      await sleep(reduce ? 0 : 1400);
      if (id !== runId.current) return;
      setPhase("decide");
    } catch (err) {
      if (id !== runId.current) return;
      setError(err instanceof Error ? err.message : "Negotiation failed.");
      setPhase("error");
    }
  }

  const stageState = (key: string) => {
    const order = ["perceive", "reason", "decide"];
    const cur = order.indexOf(phase);
    const idx = order.indexOf(key);
    if (cur < 0) return "idle";
    if (idx < cur || (idx === cur && phase === "decide")) return "done";
    return idx === cur ? "active" : "idle";
  };

  const decided = phase === "decide" && result && run;

  return (
    <>
      {/* Engine 01's living painting, exactly as on its engine page */}
      <div className="fixed inset-0 -z-10">
        <PaintingCanvas painting={engine.painting} priority />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_6_18/0.55)_0%,rgb(11_6_18/0.35)_35%,rgb(11_6_18/0.8)_100%)]" />
      </div>

      {/* Engine 01's sakura and gold dahlias; they glow while the engine perceives */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[5]"
        animate={
          phase === "perceive" && !reduce
            ? {
                filter: [
                  "drop-shadow(0 0 0px rgb(245 169 176 / 0)) brightness(1)",
                  "drop-shadow(0 0 22px rgb(245 169 176 / 0.95)) brightness(1.25)",
                  "drop-shadow(0 0 0px rgb(245 169 176 / 0)) brightness(1)",
                ],
              }
            : { filter: "drop-shadow(0 0 0px rgb(245 169 176 / 0)) brightness(1)" }
        }
        transition={phase === "perceive" ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6 }}
      >
        <FloraField blooms={engine.blooms} />
      </motion.div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-8 sm:pt-10">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <Link
              href={`/engines/${engine.slug}`}
              className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-white/60 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-3.5" /> Engine Nº {engine.index}
            </Link>
            <p className={cn(kicker, "text-[#f0d59a]/80")}>
              Engine Nº {engine.index} <span className="mx-2 text-white/30">—</span> Live demo
            </p>
            <h1 className="text-gold-metal mt-4 font-display text-5xl font-light leading-[0.95] sm:text-6xl lg:text-7xl">{engine.name}</h1>
            <p className="mt-4 font-display text-xl italic text-white/80 sm:text-2xl">{engine.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#5ee7ff]/25 bg-ink/60 py-1 pl-2 pr-3 backdrop-blur-md">
              <StatusLed tone={status?.inference === "groq" ? "cyan" : "amber"} className="size-3" />
              <span
                className={cn(
                  "font-mono text-[9px] font-semibold uppercase tracking-[0.18em]",
                  status?.inference === "groq" ? "text-[#8ff0ff]" : "text-[#ffc777]",
                )}
              >
                {!status
                  ? "Connecting…"
                  : status.inference === "groq"
                    ? `Live AI · Groq · ${status.model}`
                    : status.inference === "offline"
                      ? "API offline"
                      : "Rate-card engine · no Groq key"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-ink/40 px-5 text-sm font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
            >
              <Code2 className="size-4 text-[#8ff0ff]" /> Embed Engine
            </button>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* A · Prospect panel */}
          <section aria-labelledby="prospect-title" className="glass rounded-[28px] p-6 sm:p-7">
            <p className={cn(kicker, "text-[#8ff0ff]")}>A · Inbound prospect</p>
            <h2 id="prospect-title" className="mt-2 font-display text-3xl font-light text-white">
              Sponsor proposal
            </h2>

            <div className="mt-5 grid gap-2" role="group" aria-label="Scenario presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setForm(toForm(p.input));
                    setPreset(p.id);
                  }}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition-colors",
                    preset === p.id ? "border-[#f0d59a]/50 bg-[#f0d59a]/10" : "border-white/10 bg-white/[0.03] hover:border-white/25",
                  )}
                >
                  <span className="block font-display text-lg leading-tight text-white">{p.name}</span>
                  <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">{p.hint}</span>
                </button>
              ))}
            </div>

            <form onSubmit={negotiate} className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className={label}>Brand name</span>
                  <input className={field} value={form.brandName} onChange={(e) => update("brandName", e.target.value)} required />
                </label>
                <label className="grid gap-1.5">
                  <span className={label}>Offered budget ($)</span>
                  <input className={cn(field, "font-mono tabular-nums")} inputMode="decimal" value={form.budget} onChange={(e) => update("budget", e.target.value)} />
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className={label}>Requested deliverables</span>
                <input className={field} value={form.deliverables} onChange={(e) => update("deliverables", e.target.value)} placeholder="1x YouTube Integration + 2x IG Reels" required />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className={label}>Usage rights</span>
                  <select className={field} value={form.usageRights} onChange={(e) => update("usageRights", e.target.value as UsageRightsKey)}>
                    {Object.entries(USAGE_RIGHTS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.short} {v.markup ? `(+${Math.round(v.markup * 100)}%)` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className={label}>Creator tone</span>
                  <select className={field} value={form.tone} onChange={(e) => update("tone", e.target.value as ToneKey)}>
                    {Object.entries(TONES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className={label}>Creator / talent name</span>
                <input className={field} value={form.creatorName} onChange={(e) => update("creatorName", e.target.value)} />
              </label>
              <label className="grid gap-1.5">
                <span className={label}>Raw inbound email</span>
                <textarea className={cn(field, "min-h-40 resize-y leading-relaxed")} value={form.emailText} onChange={(e) => update("emailText", e.target.value)} />
              </label>

              <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/60">Floor {money(preview.floorTotal)}</span>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/60">Offer {money(preview.budget)}</span>
                <span className={cn("rounded-full border px-2.5 py-1", preview.coverage >= 1 ? "border-[#5ee7ff]/30 text-[#8ff0ff]" : "border-rose/30 text-rose")}>
                  {Math.round(preview.coverage * 100)}% of floor
                </span>
              </div>

              {error && (
                <p role="alert" className="text-sm text-rose">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="group relative inline-flex h-13 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#f3e2b8] px-7 text-sm font-semibold text-[#1a0f05] shadow-[0_0_60px_-12px_rgb(243_212_143/0.8)] disabled:cursor-progress disabled:opacity-80"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#fff4d6] via-[#e8c27a] to-[#c99446] transition-transform duration-700 group-hover:translate-x-0" />
                {busy ? <Loader2 className="relative size-4 animate-spin" /> : <Sparkles className="relative size-4" />}
                <span className="relative">{busy ? "Negotiating…" : "Run Deal Negotiation"}</span>
              </button>

              <details className="group/rc">
                <summary className={cn(label, "cursor-pointer hover:text-white/70")}>Floor rate card</summary>
                <ul className="mt-3 grid gap-1">
                  {RATE_CARD.map((r) => (
                    <li key={r.label} className="flex justify-between border-b border-dashed border-white/10 py-1 text-[13px] text-white/70">
                      <span>{r.label}</span>
                      <span className="font-mono tabular-nums">{money(r.floor)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </form>
          </section>

          <div className="grid min-w-0 gap-6">
            {/* B · Pipeline */}
            <section aria-labelledby="pipeline-title" aria-live="polite" className="glass rounded-[28px] p-6 sm:p-7">
              <p className={cn(kicker, "text-[#8ff0ff]")}>B · The Aware pipeline</p>
              <h2 id="pipeline-title" className="mt-2 font-display text-3xl font-light text-white sm:text-4xl">
                Perceive. <em className="text-gold-metal">Reason.</em> Decide.
              </h2>

              <ol className="mt-6 grid gap-px overflow-hidden rounded-[22px] border border-white/10 bg-white/10 md:grid-cols-3">
                {STAGES.map((s, i) => {
                  const st = stageState(s.key);
                  return (
                    <li key={s.key} className={cn("relative bg-ink/80 p-5 transition-colors duration-500", st === "active" && "bg-[#2a1426]/90")}>
                      {st === "active" && (
                        <motion.span
                          layoutId="stage-glow"
                          className="absolute inset-0 border border-rose/50 shadow-[inset_0_0_40px_-10px_rgb(245_169_176/0.6)]"
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gold-metal font-display text-4xl font-light leading-none">0{i + 1}</span>
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-xl border",
                            st === "done"
                              ? "border-[#f0d59a]/40 bg-[#f0d59a]/15 text-[#f0d59a]"
                              : st === "active"
                                ? "border-rose/50 bg-rose/15 text-rose"
                                : "border-[#5ee7ff]/20 bg-[#5ee7ff]/[0.06] text-[#8ff0ff]/70",
                          )}
                        >
                          {st === "active" ? <Loader2 className="size-4 animate-spin" /> : <s.icon className="size-4" />}
                        </span>
                      </div>
                      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                        Stage 0{i + 1} · {st === "done" ? "complete" : st === "active" ? "running" : "standby"}
                      </p>
                      <h3 className="mt-1 font-display text-2xl text-white">{s.title}</h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-white/60">{s.body}</p>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-6 min-h-52">
                <AnimatePresence mode="wait">
                  {phase === "idle" && (
                    <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-xl font-display text-xl italic text-white/65">
                      Load a scenario or compose a proposal, then run the negotiation. The engine senses the deal against your floor rates,
                      reasons a strategy, and decides.
                    </motion.p>
                  )}

                  {phase === "error" && (
                    <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[15px] text-rose">
                      The pipeline halted: {error}
                    </motion.p>
                  )}

                  {phase === "perceive" && run && (
                    <motion.ul key="perceive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-1.5 font-mono text-[12px]">
                      {[
                        ...run.analysis.lines.map((l) => ({ k: `${l.qty}× ${l.label}`, v: money(l.subtotal), tone: "" })),
                        { k: `Usage rights · ${USAGE_RIGHTS[run.input.usageRights].short}`, v: `+${Math.round(run.analysis.markupPct * 100)}%`, tone: "" },
                        ...run.analysis.flags.map((f) => ({
                          k: `⚑ ${f.label}`,
                          v: f.severity,
                          tone: f.severity === "high" ? "text-rose" : f.severity === "medium" ? "text-sun" : "text-white/60",
                        })),
                      ].map((row, i) => (
                        <motion.li
                          key={row.k}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.14 }}
                          className={cn("flex justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2 text-white/80", row.tone)}
                        >
                          <span>{row.k}</span>
                          <span className="uppercase tabular-nums">{row.v}</span>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}

                  {(phase === "reason" || phase === "decide") && run && (
                    <motion.div key="reason" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid items-center gap-8 sm:grid-cols-[220px_1fr]">
                      <AlignmentDial value={gauge} />
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Counter strategy</p>
                        {result ? (
                          <>
                            <p className="text-gold-metal mt-1 font-display text-6xl font-light tabular-nums">{money(result.suggestedCounterPrice)}</p>
                            <p className="mt-1 font-mono text-[11px] text-white/50">
                              offer {money(run.analysis.budget)} · floor {money(run.analysis.floorTotal)}
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 animate-pulse font-mono text-[12px] text-white/50">Synthesizing strategy…</p>
                        )}
                        <AnimatePresence>
                          {decided && (
                            <motion.div
                              initial={{ opacity: 0, scale: 1.6, rotate: -14 }}
                              animate={{ opacity: 1, scale: 1, rotate: -4 }}
                              transition={{ type: "spring", stiffness: 300, damping: 18 }}
                              className={cn(
                                "mt-5 inline-flex flex-col rounded-lg border-2 px-4 py-2 font-mono font-bold uppercase tracking-[0.2em]",
                                VERDICT[result.action].className,
                              )}
                            >
                              <span className="text-[9px] opacity-70">Decision · {result.action}</span>
                              <span className="text-[15px]">{VERDICT[result.action].label}</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {meta && (
                <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                  <span>Engine · {meta.engine}</span>
                  <span>Server · {meta.server}ms</span>
                  <span>Round-trip · {meta.roundTrip}ms</span>
                </p>
              )}
            </section>

            {/* C · Execution cards */}
            <AnimatePresence>
              {decided && (
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="grid gap-6 xl:grid-cols-2"
                >
                  <RateMatch analysis={run.analysis} brand={run.input.brandName} />
                  <TermSummary input={run.input} analysis={run.analysis} result={result} />

                  <section aria-labelledby="email-title" className="glass rounded-[28px] p-6 sm:p-7 xl:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className={cn(kicker, "text-[#8ff0ff]")}>C·2 · Autonomous dispatch</p>
                        <h3 id="email-title" className="mt-2 font-display text-3xl font-light text-white">
                          {result.action === "ACCEPT" ? "Acceptance" : result.action === "COUNTER" ? "Counter-email" : "Decline"} draft
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <CopyButton text={email} label="Copy draft" />
                        <a
                          href={`mailto:?subject=${encodeURIComponent(email.match(/^Subject:\s*(.*)$/m)?.[1] ?? "")}&body=${encodeURIComponent(email.replace(/^Subject:.*\n+/, ""))}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#f0d59a]/25 bg-ink/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f3e2b8] backdrop-blur-md transition-colors hover:border-[#f0d59a]/60 hover:text-white"
                        >
                          <Mail className="size-3.5" /> Open in mail
                        </a>
                      </div>
                    </div>
                    <textarea
                      aria-label="Editable email draft"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      rows={14}
                      className={cn(field, "mt-5 min-h-72 resize-y bg-ink/50 text-[14.5px] leading-relaxed")}
                    />
                    <p className="mt-4 text-[14px] leading-relaxed text-white/65">
                      <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.2em] text-rose/80">Reasoning</span>
                      {result.reasoning}
                    </p>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <PaintingCaption painting={engine.painting} className="mt-14 text-right" />
      </div>

      <EmbedDrawer open={drawer} onClose={() => setDrawer(false)} sample={run?.input ?? toInput(form)} result={result} />
    </>
  );
}

function AlignmentDial({ value }: { value: number }) {
  const r = 78;
  const len = Math.PI * r;
  return (
    <div className="relative">
      <svg viewBox="0 0 200 116" className="w-full" role="img" aria-label={`Deal alignment ${value} percent`}>
        <defs>
          <linearGradient id="aware-dial" x1="0" x2="1">
            <stop offset="0" stopColor="#f5a9b0" />
            <stop offset="0.5" stopColor="#ffbd6e" />
            <stop offset="1" stopColor="#f3d48f" />
          </linearGradient>
        </defs>
        <path d={`M22 100 A${r} ${r} 0 0 1 178 100`} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="10" strokeLinecap="round" />
        <path
          d={`M22 100 A${r} ${r} 0 0 1 178 100`}
          fill="none"
          stroke="url(#aware-dial)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - value / 100)}
          style={{ filter: "drop-shadow(0 0 6px rgb(255 189 110 / 0.6))" }}
        />
        {Array.from({ length: 11 }, (_, i) => {
          const a = Math.PI * (1 - i / 10);
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * 62}
              y1={100 - Math.sin(a) * 62}
              x2={100 + Math.cos(a) * 57}
              y2={100 - Math.sin(a) * 57}
              stroke="rgb(255 255 255 / 0.25)"
              strokeWidth="1.2"
            />
          );
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="font-display text-5xl font-light tabular-nums leading-none text-white">{value}</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">% deal alignment</p>
      </div>
    </div>
  );
}

function RateMatch({ analysis: a, brand }: { analysis: DealAnalysis; brand: string }) {
  const above = a.budget >= a.floorTotal;
  return (
    <section aria-labelledby="rate-title" className="glass rounded-[28px] p-6 sm:p-7">
      <p className={cn(kicker, "text-[#8ff0ff]")}>C·1 · Rate match</p>
      <h3 id="rate-title" className="mt-2 font-display text-3xl font-light text-white">
        Rate Match Breakdown
      </h3>
      <table className="mt-5 w-full text-[13.5px]">
        <tbody className="[&_td]:border-b [&_td]:border-dashed [&_td]:border-white/10 [&_td]:py-2">
          {a.lines.map((l, i) => (
            <tr key={i}>
              <td className="pr-3 text-white/85">
                {l.label}
                {!l.matched && <span className="ml-2 rounded-full bg-sun/15 px-1.5 font-mono text-[9px] uppercase text-sun">custom</span>}
              </td>
              <td className="whitespace-nowrap pr-3 font-mono text-[11px] text-white/45">
                {l.qty} × {money(l.unitFloor)}
              </td>
              <td className="text-right font-mono tabular-nums text-white/85">{money(l.subtotal)}</td>
            </tr>
          ))}
          <tr className="text-white/60">
            <td>Deliverable base</td>
            <td />
            <td className="text-right font-mono tabular-nums">{money(a.baseTotal)}</td>
          </tr>
          <tr className="text-white/60">
            <td>Usage rights markup</td>
            <td className="font-mono text-[11px]">+{Math.round(a.markupPct * 100)}%</td>
            <td className="text-right font-mono tabular-nums">{money(a.markupAmount)}</td>
          </tr>
          <tr className="font-semibold text-[#f3e2b8]">
            <td>Floor total</td>
            <td />
            <td className="text-right font-mono tabular-nums">{money(a.floorTotal)}</td>
          </tr>
          <tr className="text-white/85">
            <td>Offered by {brand}</td>
            <td />
            <td className="text-right font-mono tabular-nums">{money(a.budget)}</td>
          </tr>
          <tr className={above ? "text-[#8ff0ff]" : "text-rose"}>
            <td>Gap to floor</td>
            <td />
            <td className="text-right font-mono font-semibold tabular-nums">
              {above ? "+" : "−"}
              {money(Math.abs(a.budget - a.floorTotal))}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-5">
        <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
          <span>Offer coverage</span>
          <span className="tabular-nums text-white/80">{Math.round(a.coverage * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuenow={Math.round(a.coverage * 100)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#c99446] via-[#f3d48f] to-[#5ee7ff]"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, a.coverage * 100)}%` }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </section>
  );
}

function TermSummary({ input, analysis, result }: { input: DealInput; analysis: DealAnalysis; result: DealResult }) {
  const counterToPerpetual = input.usageRights === "perpetual" && result.action !== "ACCEPT";
  const terms: [string, string][] = [
    ["Parties", `${input.creatorName} (Creator) × ${input.brandName} (Brand)`],
    [
      result.action === "ACCEPT" ? "Agreed fee" : result.action === "COUNTER" ? "Proposed fee" : "Minimum to reopen",
      money(result.action === "ACCEPT" ? analysis.budget : result.suggestedCounterPrice),
    ],
    ["Deliverables", analysis.lines.map((l) => `${l.qty}× ${l.label}`).join(" · ")],
    ["Usage license", counterToPerpetual ? `${USAGE_RIGHTS.paid90.label} (counter to perpetual)` : USAGE_RIGHTS[input.usageRights].label],
    ["Payment", "50% on signature · balance Net 30 from go-live"],
    ["Revisions", "2 rounds included · additional at 10% of fee"],
    [
      "Exclusivity",
      input.usageRights === "whitelist"
        ? "60-day category exclusivity (priced into usage)"
        : analysis.flags.some((f) => f.id === "exclusivity")
          ? "Direct competitors only · 30 days max · priced separately"
          : "None",
    ],
    ["Disclosure", "#ad / Paid Partnership on every placement (FTC)"],
    ["Kill fee", "50% if cancelled after concept approval"],
  ];
  const staged = result.action !== "DECLINE";
  const json = JSON.stringify(
    { status: staged ? "STAGED" : "NOT_STAGED", action: result.action, dealScore: result.dealScore, terms: Object.fromEntries(terms), keyTermsAnalysis: result.keyTermsAnalysis },
    null,
    2,
  );

  return (
    <section aria-labelledby="terms-title" className="glass rounded-[28px] p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn(kicker, "text-[#8ff0ff]")}>C·3 · Staged agreement</p>
          <h3 id="terms-title" className="mt-2 font-display text-3xl font-light text-white">
            Executable Term Summary
          </h3>
        </div>
        <CopyButton text={json} label="JSON" />
      </div>
      <p
        className={cn(
          "mt-4 inline-flex rounded-lg border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em]",
          staged ? "border-[#5ee7ff]/40 text-[#8ff0ff]" : "border-rose/50 text-rose",
        )}
      >
        {staged ? "Staged · awaiting your single tap" : "Not staged · deal declined"}
      </p>
      <dl className="mt-4 grid text-[13.5px]">
        {terms.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_1fr] gap-3 border-b border-dashed border-white/10 py-2">
            <dt className="pt-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{k}</dt>
            <dd className="text-white/85">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mb-2 mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Key terms analysis</p>
      <ul className="grid gap-1.5 text-[13.5px] text-white/75">
        {result.keyTermsAnalysis.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-rose" />
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}
