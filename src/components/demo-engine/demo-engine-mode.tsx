"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AudioLines, Boxes, CandlestickChart, Fingerprint, Pause, Play, Radar, ScrollText, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, isEngineKey } from "@/components/bloom/command/engines";
import { createDemoGenerator, DEMO_TARGETS, type DemoFrame, type DemoLogLine, type DemoMetric, type DemoTargetId } from "@/lib/demo/demoGenerator";
import { useLicense } from "@/lib/license-context";
import { fill, useLicensingCopy, type LicensingCopy } from "@/components/control-plane/copy";
import { CpButton, Widget } from "@/components/control-plane/widget";
import { ProvisionCta } from "./provision-cta";

const TICK_MS = 1000;
const LOG_KEEP = 80;
const TARGET_ICON: Record<DemoTargetId, typeof Activity> = { music: AudioLines, trading: CandlestickChart, coreops: Workflow, intentpulse: Radar };
const STORE = "bloom-demo-target";

function formatMetric(m: DemoMetric) {
  const n = (d = 0) => m.value.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  switch (m.unit) {
    case "ms":
      return `${n(m.value < 10 ? (m.value < 1 ? 2 : 1) : 0)}ms`;
    case "pct":
      return `${n(m.value % 1 ? (m.value > 99 ? 2 : 1) : 0)}%`;
    case "usd":
      return `${m.value < 0 ? "−" : ""}$${Math.abs(m.value).toLocaleString("en-US")}`;
    case "lufs":
      return `${n(1)} LUFS`;
    case "score":
      return n(m.value % 1 ? 1 : 0);
    default:
      return n();
  }
}

/** Renders a log line in the current language, translating domain words (stems, queues, checks…). */
function renderLog(l: DemoLogLine, d: LicensingCopy["demo"]) {
  const vars: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(l.vars)) {
    const dict = d.words[k === "winner" ? "_" : k];
    vars[k] = typeof v === "string" && dict?.[v] ? dict[v] : k === "winner" && typeof v === "string" && isEngineKey(v) ? ENGINES[v].name : v;
  }
  return fill(d.logs[l.code] ?? l.code, vars);
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - lo) / span) * 28 - 1}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-16 w-full" aria-hidden>
      <polyline points={`0,30 ${pts} 100,30`} fill="color-mix(in srgb, var(--tier-accent) 8%, transparent)" stroke="none" />
      <polyline points={pts} fill="none" stroke="var(--bloom-accent)" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Demo Engine Mode: what a Tier 5 demo partner key opens instead of the operating desk. A target switcher picks
 * the architecture (music, trading, CoreOps, IntentPulse); the domain generator streams synthesized telemetry
 * into metric tiles, a domain panel, a shadow-consensus readout and a live log. Every surface is labeled as
 * simulated, and the floating CTA turns the demo into a production key request carrying the partner referral.
 */
export function DemoEngineMode() {
  const d = useLicensingCopy().demo;
  const { access } = useLicense();
  const [target, setTarget] = useState<DemoTargetId>("music");
  const [frame, setFrame] = useState<DemoFrame | null>(null);
  const [logs, setLogs] = useState<DemoLogLine[]>([]);
  const [paused, setPaused] = useState(false);
  const gen = useRef(createDemoGenerator(target));

  // A domain-specific demo key opens on its architecture; otherwise the partner's last one is restored.
  const pinned = access?.permissions.demoTarget;
  useEffect(() => {
    if (pinned) {
      setTarget(pinned);
      return;
    }
    try {
      const saved = localStorage.getItem(STORE) as DemoTargetId | null;
      if (saved && DEMO_TARGETS.some((t) => t.id === saved)) setTarget(saved);
    } catch {
      // Storage blocked: start on the default target.
    }
  }, [pinned]);

  // A new target gets a fresh, primed stream so the charts open with history.
  useEffect(() => {
    gen.current = createDemoGenerator(target);
    const start = Date.now() - 30 * TICK_MS;
    let f: DemoFrame | null = null;
    const primed: DemoLogLine[] = [];
    for (let i = 0; i < 30; i++) {
      f = gen.current.next(start + i * TICK_MS);
      primed.push(...f.logs);
    }
    setFrame(f);
    setLogs(primed.slice(-LOG_KEEP));
    try {
      localStorage.setItem(STORE, target);
    } catch {
      // Not persisted; fine.
    }
  }, [target]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const f = gen.current.next();
      setFrame(f);
      if (f.logs.length) setLogs((prev) => [...prev, ...f.logs].slice(-LOG_KEEP));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [paused, target]);

  const meta = DEMO_TARGETS.find((t) => t.id === target)!;
  const headline = frame?.metrics.find((m) => m.key === meta.headline);
  const referral = access?.permissions.partnerReferralId ?? "—";
  const partner = access?.holderName ?? "BLOOM";
  const logList = useMemo(() => logs.slice().reverse(), [logs]);

  return (
    <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="os-label bloom-glow">{d.kicker}</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[36px]">{d.title}</h1>
          <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-white/55">{d.lede}</p>
          <p className="mt-2 font-mono text-[11px] text-white/40">{d.presented(partner, referral)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-300/40 bg-amber-300/[0.06] px-2.5 py-1 font-mono text-[10px] tracking-[0.18em] text-amber-200">{d.simulated}</span>
          <CpButton tone="quiet" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />} {paused ? d.resume : d.pause}
          </CpButton>
        </div>
      </div>

      {/* Architecture selector */}
      <div role="tablist" aria-label={d.architecture} className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {DEMO_TARGETS.map((t) => {
          const Icon = TARGET_ICON[t.id];
          const on = t.id === target;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTarget(t.id)}
              className={cn("bloom-glass rounded-xl p-3 text-start transition-colors", on ? "bloom-edge-glow" : "opacity-70 hover:opacity-100")}
            >
              <span className={cn("flex items-center gap-2 text-[13px] font-medium", on ? "text-os-cyan" : "text-white/80")}>
                <Icon className="size-4 shrink-0" /> {d.targets[t.id].name}
              </span>
              <span className="mt-1 block text-[11.5px] leading-snug text-white/45">{d.targets[t.id].blurb}</span>
            </button>
          );
        })}
      </div>

      {frame && (
        <>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" style={{ gap: "var(--bloom-gap)" }}>
            {frame.metrics.map((m) => (
              <div key={m.key} className={cn("bloom-glass rounded-xl px-3 py-2.5", m.tone === "warn" && "border-amber-300/40", m.tone === "alert" && "border-red-400/50")}>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{d.metrics[m.key] ?? m.key}</p>
                <p className={cn("mt-1 font-mono text-[20px] tabular-nums", m.tone === "ok" ? "text-white" : m.tone === "warn" ? "text-amber-200" : "text-red-300")}>{formatMetric(m)}</p>
                <p className={cn("font-mono text-[10px] tabular-nums", m.delta > 0 ? "text-os-emerald/80" : m.delta < 0 ? "text-os-cyan/70" : "text-white/30")}>
                  {m.delta > 0 ? "▲" : m.delta < 0 ? "▼" : "·"} {Math.abs(m.delta).toLocaleString("en-US")}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3" style={{ gap: "var(--bloom-gap)" }}>
            <Widget icon={Activity} title={headline ? (d.metrics[headline.key] ?? headline.key) : ""} className="lg:col-span-2">
              <Sparkline values={frame.series} />
              <DomainPanel frame={frame} d={d} />
            </Widget>

            <Widget icon={Fingerprint} title={d.panels.consensus}>
              <ul className="space-y-2">
                {frame.consensus.map((cand) => (
                  <li key={cand.engine} className={cn("rounded-lg border px-3 py-2", cand.chosen ? "bloom-edge-glow" : "border-white/[0.06] bg-black/30")}>
                    <span className="flex items-center justify-between font-mono text-[11.5px]">
                      <span className={cand.chosen ? "text-os-cyan" : "text-white/75"}>{isEngineKey(cand.engine) ? ENGINES[cand.engine].name : cand.engine}</span>
                      <span className="tabular-nums text-white/80">{(cand.score * 100).toFixed(1)}</span>
                    </span>
                    <span className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-white/35">
                      <span className="truncate">sha256 {cand.sig}</span>
                      <span className="tabular-nums">{cand.latencyMs}ms</span>
                    </span>
                    {cand.chosen && <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.16em] text-os-cyan/80">{d.winner}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{d.engines}</p>
              <p className="mt-1 flex flex-wrap gap-1.5">
                {meta.engines.map((e) => (
                  <span key={e} className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10.5px] text-white/65">
                    {isEngineKey(e) ? ENGINES[e].name : e}
                  </span>
                ))}
              </p>
            </Widget>
          </div>

          <div className="mt-4">
            <Widget icon={ScrollText} title={d.panels.log}>
              <ol className="max-h-64 space-y-0.5 overflow-y-auto font-mono text-[11.5px]">
                {logList.map((l) => (
                  <li key={l.id} className="flex gap-2">
                    <span className="shrink-0 tabular-nums text-white/30">{new Date(l.at).toLocaleTimeString()}</span>
                    <span className={cn("shrink-0", l.level === "ok" ? "text-os-emerald" : l.level === "warn" ? "text-amber-300" : "text-os-cyan/70")}>●</span>
                    <span className="text-white/70">{renderLog(l, d)}</span>
                  </li>
                ))}
              </ol>
            </Widget>
          </div>
        </>
      )}

      <ProvisionCta target={target} />
    </main>
  );
}

function DomainPanel({ frame, d }: { frame: DemoFrame; d: LicensingCopy["demo"] }) {
  if (frame.buffer)
    return (
      <div className="mt-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{d.panels.buffer}</p>
        <div className="mt-1.5 flex h-16 items-end gap-0.5">
          {frame.buffer.map((b, i) => (
            <span key={i} className={cn("flex-1 rounded-t-sm transition-[height] duration-500", b < 0.3 ? "bg-red-400/80" : b < 0.45 ? "bg-amber-300/80" : "bg-os-cyan/70")} style={{ height: `${b * 100}%` }} />
          ))}
        </div>
      </div>
    );
  if (frame.ticker)
    return (
      <div className="mt-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{d.panels.ticker}</p>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {frame.ticker.map((t) => (
            <div key={t.symbol} className="flex items-center justify-between rounded bg-black/30 px-2 py-1.5 font-mono text-[11.5px]" dir="ltr">
              <span className="text-white/80">{t.symbol}</span>
              <span className="tabular-nums text-white/70">{t.price.toFixed(2)}</span>
              <span className={cn("tabular-nums", t.changePct >= 0 ? "text-os-emerald" : "text-red-300")}>
                {t.changePct >= 0 ? "+" : ""}
                {t.changePct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  if (frame.queues) {
    const top = Math.max(1, ...frame.queues.map((q) => q.depth));
    return (
      <div className="mt-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{d.panels.queues}</p>
        <ul className="mt-1.5 space-y-1">
          {frame.queues.map((q) => (
            <li key={q.name} className="grid grid-cols-[90px_minmax(0,1fr)_120px] items-center gap-2 font-mono text-[11px]">
              <span className="text-white/70">{d.words.queue[q.name] ?? q.name}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <span className="block h-full rounded-full bg-os-cyan/80 transition-[width] duration-500" style={{ width: `${(q.depth / top) * 100}%` }} />
              </span>
              <span className="text-end tabular-nums text-white/50">
                {q.depth} {d.panels.depth} · {q.workers} {d.panels.workers}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (frame.channels)
    return (
      <div className="mt-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{d.panels.channels}</p>
        <div className="mt-1.5 flex h-3 overflow-hidden rounded-full">
          {frame.channels.map((ch, i) => (
            <span key={ch.channel} className="h-full transition-[width] duration-500" style={{ width: `${ch.share * 100}%`, background: ["var(--bloom-accent)", "#00FF88", "#FFB000", "#FF007A", "#a78bfa"][i % 5], opacity: 0.8 }} title={`${ch.channel} ${(ch.share * 100).toFixed(1)}%`} />
          ))}
        </div>
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] text-white/55">
          {frame.channels.map((ch) => (
            <li key={ch.channel}>
              {ch.channel} <span className="tabular-nums text-white/80">{(ch.share * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <p className="mt-3 flex items-center gap-2 text-white/40">
      <Boxes className="size-4" />
    </p>
  );
}
