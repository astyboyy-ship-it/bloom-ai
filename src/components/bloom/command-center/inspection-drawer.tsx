"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, BrainCircuit, CalendarCheck, ExternalLink, Eye, Loader2, Rocket, ScanSearch, Send, ShieldAlert, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { templateMessage, type DispatchAction, type DispatchResult } from "@/lib/intentpulse/outreach";
import { PLATFORMS, routeOf, type PulseSignal } from "@/lib/intentpulse/signal";
import { TIER_BANDS, type SignalKey } from "@/lib/intentpulse/types";
import { Bar } from "./kit";
import { ago, compact, PLATFORM_ICON, QUARANTINE_COLOR, TIER_COLOR, TIER_PILL } from "./platform";

export type DrawerBusy = DispatchAction | "rescore" | null;

const CAPS = { competitor: 30, student: 45 } as const;

const CUES: { key: SignalKey; title: string; empty: string }[] = [
  { key: "budget", title: "Budget indicators", empty: "No budget language" },
  { key: "techFit", title: "Tech stack match", empty: "No named tools" },
  { key: "authority", title: "Decision-maker authority", empty: "No title or headcount" },
  { key: "urgency", title: "Urgency rating", empty: "No timeline cues" },
];

export function InspectionDrawer({
  signal,
  outcome,
  busy,
  onClose,
  onAction,
  onRescore,
}: {
  signal: PulseSignal | null;
  outcome?: DispatchResult;
  busy: DrawerBusy;
  onClose: () => void;
  onAction: (kind: DispatchAction) => void;
  onRescore: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = !!signal;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {signal && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cc-inspect-title"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-white/[0.08] bg-[#111015] p-5 sm:p-7"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
          >
            <Body signal={signal} outcome={outcome} busy={busy} onAction={onAction} onRescore={onRescore} closeRef={closeRef} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Body({
  signal: s,
  outcome,
  busy,
  onAction,
  onRescore,
  onClose,
  closeRef,
}: {
  signal: PulseSignal;
  outcome?: DispatchResult;
  busy: DrawerBusy;
  onAction: (kind: DispatchAction) => void;
  onRescore: () => void;
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const r = s.result;
  const Icon = PLATFORM_ICON[s.platform];
  const route = routeOf(s);
  const raw = r.signals.reduce((sum, x) => sum + x.score * x.weight, 0);
  const cap = r.persona === "competitor" || r.persona === "student" ? CAPS[r.persona] : undefined;
  const capped = cap !== undefined && raw > cap;
  const band = TIER_BANDS.find((b) => b.tier === r.tier)!;
  const platform = PLATFORMS[s.platform];
  const draftAction: DispatchAction = route === "vip" ? "vip" : route === "quarantine" ? "quarantine" : "outreach";
  const draft = outcome?.message ?? templateMessage(draftAction, r.lead, r.tier, r.persona, platform.label);
  const dialColor = route === "quarantine" ? QUARANTINE_COLOR : TIER_COLOR[r.tier];

  return (
    <>
      {/* Author header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            <Icon className="size-3.5" style={{ color: platform.color }} /> {platform.label} · {s.kind}
            <span className={cn("rounded-full border px-2 py-px tracking-[0.14em]", s.origin === "apify" ? "border-[#7cc4ff]/40 text-[#9fd3ff]" : "border-white/15 text-white/45")}>
              {s.origin === "apify" ? `live · ${s.actor}` : s.origin}
            </span>
          </p>
          <h2 id="cc-inspect-title" className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
            <span className="truncate">{s.author.name}</span>
            {s.author.verified && <BadgeCheck className="size-5 shrink-0 text-[#7cc4ff]" aria-label="Verified" />}
          </h2>
          <p className="mt-1 font-mono text-[11px] text-white/55">
            {s.author.handle}
            {s.author.followers > 0 && <> · {compact(s.author.followers)} followers</>}
            {(s.author.title || s.author.company) && <> · {[s.author.title, s.author.company].filter(Boolean).join(", ")}</>}
            {" · "}
            {ago(s.postedAt)}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close inspection"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <blockquote className="mt-5 rounded-lg border border-white/[0.08] bg-black/25 p-4 text-[14px] leading-relaxed text-white/85">“{s.text}”</blockquote>
      {s.url && (
        <p className="mt-2 flex items-center gap-1.5 truncate font-mono text-[10px] text-white/40">
          {s.origin === "simulated" ? (
            <span className="truncate" title="Simulated source; not a real post">
              {s.url} <span className="text-white/25">(simulated)</span>
            </span>
          ) : (
            <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 truncate hover:text-white/80">
              <ExternalLink className="size-3 shrink-0" /> <span className="truncate">{s.url}</span>
            </a>
          )}
        </p>
      )}

      {/* 01 · Perceive */}
      <Step n="01" icon={Eye} title="Perceive" sub="Micro-intent cues lifted from the signal">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {CUES.map((c) => {
            const sig = r.signals.find((x) => x.key === c.key)!;
            return (
              <div key={c.key} className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">{c.title}</p>
                  <p className="text-xl font-semibold tabular-nums text-white">{sig.score}</p>
                </div>
                <Bar value={sig.score} className="mt-1.5" color="#cdb27a" />
                <p className="mt-2 line-clamp-2 font-mono text-[10px] leading-relaxed text-white/50">{sig.evidence.length ? sig.evidence.join(" · ") : c.empty}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.microSignals.map((m) => (
            <span key={m} className="rounded-full border border-[#f0d59a]/20 bg-[#f0d59a]/[0.06] px-2.5 py-1 font-mono text-[10px] text-[#f3e2b8]/85">
              {m}
            </span>
          ))}
        </div>
      </Step>

      {/* 02 · Reason */}
      <Step n="02" icon={BrainCircuit} title="Reason" sub="Weighted fusion, then persona caps">
        <div className="grid items-center gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
          <ScoreDial score={r.score} cap={capped ? cap : undefined} color={dialColor} />
          <ul className="space-y-2.5">
            {r.signals.map((x) => (
              <li key={x.key}>
                <div className="flex justify-between gap-2 text-[12px]">
                  <span className="text-white/80">{x.label}</span>
                  <span className="font-mono tabular-nums text-white/55">
                    {x.score} × {x.weight.toFixed(2)} = <span className="text-[#f3e2b8]">{(x.score * x.weight).toFixed(1)}</span>
                  </span>
                </div>
                <Bar value={x.score} className="mt-1.5" color="#cdb27a" />
              </li>
            ))}
            <li className="flex justify-between border-t border-white/10 pt-2 font-mono text-[11px]">
              <span className="text-white/50">Raw composite</span>
              <span className="tabular-nums text-white/80">{raw.toFixed(1)}</span>
            </li>
          </ul>
        </div>
        {cap !== undefined && (
          <div className="mt-4 flex gap-3 rounded-2xl border border-[#ff9b78]/30 bg-[#ff9b78]/[0.07] p-3.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#ff9b78]" />
            <p className="text-[12.5px] leading-relaxed text-white/80">
              <span className="font-semibold text-[#ffc2a8]">{r.persona === "competitor" ? "Quarantined Signal" : "Student / intern cap"}</span> ·{" "}
              {r.persona === "competitor" ? "Competitors" : "Students and interns"} are capped at {cap}.{" "}
              {capped ? `Raw ${raw.toFixed(1)} was held to ${r.score}.` : `Raw ${raw.toFixed(1)} was already under the cap.`}
            </p>
          </div>
        )}
      </Step>

      {/* 03 · Decide */}
      <Step n="03" icon={Rocket} title="Decide" sub="Tier, route and the autonomous reply">
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("rounded-full border px-4 py-1.5 font-mono text-xs font-semibold tracking-[0.24em]", TIER_PILL[r.tier])}>{r.tier}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">band {band.label}</span>
          {route === "quarantine" && <span className="rounded-full border border-[#ff9b78]/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ff9b78]">Quarantine</span>}
        </div>
        <p className="mt-3 text-[15px] font-semibold text-white">{r.action.title}</p>
        <p className="font-mono text-[10px] text-white/45">
          {r.action.channel} · SLA {r.action.sla} · {r.action.owner}
        </p>

        <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/25 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
            {outcome
              ? `${outcome.dispatchId} · ${outcome.status} · ${outcome.source === "groq" ? `Groq ${outcome.model}` : "template"}`
              : route === "quarantine"
                ? "No outreach · intel log only"
                : "Autonomous draft · ready to send"}
          </p>
          <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-white/85">
            {draft ?? "Outreach is suppressed for this signal. The questions asked are logged to the competitive-intel feed."}
          </p>
          {outcome?.notice && <p className="mt-2 text-[11px] text-[#ffc777]">{outcome.notice}</p>}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Action icon={Send} label="Send Custom Message" busy={busy === "outreach"} disabled={!!busy || route === "quarantine"} primary={route === "outreach"} onClick={() => onAction("outreach")} />
          <Action icon={CalendarCheck} label="Dispatch VIP Calendar Booking" busy={busy === "vip"} disabled={!!busy || route === "quarantine"} primary={route === "vip"} onClick={() => onAction("vip")} />
          <Action icon={ShieldAlert} label="Quarantine Signal" busy={busy === "quarantine"} disabled={!!busy} primary={route === "quarantine"} onClick={() => onAction("quarantine")} />
          <Action icon={ScanSearch} label="Deep re-score" busy={busy === "rescore"} disabled={!!busy} onClick={onRescore} />
        </div>
        <ol className="mt-5 space-y-1.5 font-mono text-[10.5px] leading-relaxed text-white/45">
          {r.reasoning.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ol>
      </Step>
    </>
  );
}

function Step({ n, icon: Icon, title, sub, children }: { n: string; icon: LucideIcon; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-white/10 pt-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-[13px] font-semibold tabular-nums text-white/35">{n}</span>
        <span className="flex size-9 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] text-white/70">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-[15px] font-semibold leading-none text-white">{title}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** 0–100 dial with the tier thresholds marked, and the persona cap when one applied. */
function ScoreDial({ score, cap, color }: { score: number; cap?: number; color: string }) {
  const R = 70;
  const C = 2 * Math.PI * R;
  const arc = 0.75; // a 270° gauge
  const at = (v: number) => {
    const a = ((135 + (v / 100) * 270) * Math.PI) / 180;
    return { x: 90 + Math.cos(a) * R, y: 90 + Math.sin(a) * R };
  };
  return (
    <div className="relative mx-auto size-[180px]">
      <svg viewBox="0 0 180 180" className="size-full" aria-label={`Score ${score} of 100`}>
        <defs>
          <linearGradient id="cc-dial" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#c99446" />
            <stop offset="0.6" stopColor="#f3d48f" />
            <stop offset="1" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={R} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${C * arc} ${C}`} transform="rotate(135 90 90)" />
        <motion.circle
          cx="90"
          cy="90"
          r={R}
          fill="none"
          stroke="url(#cc-dial)"
          strokeWidth="10"
          strokeLinecap="round"
          transform="rotate(135 90 90)"
          initial={{ strokeDasharray: `0 ${C}` }}
          animate={{ strokeDasharray: `${C * arc * (score / 100)} ${C}` }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
       />
        {[60, 85].map((t) => {
          const p = at(t);
          return <circle key={t} cx={p.x} cy={p.y} r="2.6" fill="#0b0612" stroke="#f3e2b8" strokeWidth="1" />;
        })}
        {cap !== undefined && (() => {
          const p = at(cap);
          return <circle cx={p.x} cy={p.y} r="4" fill={QUARANTINE_COLOR} />;
        })()}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tabular-nums leading-none text-white">{score}</span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">of 100</span>
      </div>
    </div>
  );
}

function Action({ icon: Icon, label, onClick, busy, disabled, primary }: { icon: LucideIcon; label: string; onClick: () => void; busy?: boolean; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12px] font-medium transition-colors disabled:opacity-45",
        primary ? "bg-[#f3e2b8] text-[#1a0f05]" : "border border-white/15 bg-ink/50 text-white/85 hover:border-white/35 hover:text-white",
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />} {label}
    </button>
  );
}
