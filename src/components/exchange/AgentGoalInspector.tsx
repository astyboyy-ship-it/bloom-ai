"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Loader2, Plug, Search, X, Zap } from "lucide-react";
import { MACRO_DOMAINS, normalize, PROTOCOL_REGISTRY, type AgentIntentNode, type IntentStage, type InvariantStatus, type MacroDomain } from "@/lib/exchange/omni-adapter";
import { RESOURCE_UNITS, type ResourceDimension } from "@/lib/exchange/types";
import { cn } from "@/lib/utils";
import { useOmniCopy } from "./omni-copy";
import { Badge, HashDecode, num, Panel, SPRING, usd, type Tone } from "./ui";
import type { Exchange } from "./use-exchange";

const STAGES: IntentStage[] = ["received", "normalized", "shielded", "vaulted", "cleared"];
const STATUS_TONE: Record<InvariantStatus, Tone> = { locked: "solid", clamped: "amber", settled: "emerald", quarantined: "rose" };
const DIMS: ResourceDimension[] = ["computeUnits", "energyKwh", "bandwidthGbps", "complianceToken"];

/** Replays a node's real stage trace at human speed: each recorded stage lights up 220ms after the previous one. */
function useReplay(node: AgentIntentNode | null) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setStep(STAGES.length);
    setStep(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setStep(i);
      if (i >= STAGES.length) clearInterval(id);
    }, 220);
    return () => clearInterval(id);
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return step;
}

function Pipeline({ node, step }: { node: AgentIntentNode; step: number }) {
  const t = useOmniCopy().intents;
  const reached = node.trace.filter((x) => (STAGES as string[]).includes(x.stage)).length;
  const shown = Math.min(step, reached);
  const final = step >= STAGES.length || shown >= reached;
  const progress = final ? 1 : shown / STAGES.length;
  const endTone = node.invariantStatus === "settled" ? "var(--xch-verified)" : node.invariantStatus === "quarantined" ? "var(--xch-threat)" : "var(--xch-clamp)";
  return (
    <div>
      <div className="relative h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
        <div className="xch-fill absolute inset-y-0 start-0 w-full rounded-full" style={{ transform: `scaleX(${progress})`, background: final ? endTone : "rgba(255,255,255,0.6)" }} />
      </div>
      <ol className="mt-3 grid grid-cols-5 gap-1.5">
        {STAGES.map((s, i) => {
          const on = i < shown;
          const blocked = node.invariantStatus === "quarantined" && s === "vaulted";
          return (
            <li key={s} className={cn("rounded-md border px-1.5 py-1.5 text-center transition-colors duration-200", on ? "border-[var(--xch-line-strong)] bg-white/[0.04] text-white/85" : blocked && final ? "border-[color-mix(in_srgb,var(--xch-threat)_40%,transparent)] text-[var(--xch-threat)]" : "border-[var(--xch-line)] text-white/30", on && s === "shielded" && node.shield.threats > 0 && "xch-intercept border-[color-mix(in_srgb,var(--xch-threat)_45%,transparent)] text-[var(--xch-threat)]")}>
              <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.1em]">{t.stages[s]}</span>
            </li>
          );
        })}
      </ol>
      {final && node.latencyMs !== null && (
        <p className="tnum mt-2 font-mono text-[10px] text-white/35">
          {t.replayed} {node.latencyMs} ms
        </p>
      )}
    </div>
  );
}

function VectorClamp({ node }: { node: AgentIntentNode }) {
  const t = useOmniCopy().intents;
  const rows = DIMS.filter((d) => node.resourceVector[d] > 0).map((d) => {
    const c = node.clamp.find((x) => x.dimension === d);
    return { d, requested: node.resourceVector[d], granted: c ? c.granted : null };
  });
  return (
    <div>
      {node.resourceVector.capitalUsd > 0 && (
        <p className="tnum mb-2 font-mono text-[11px] text-white/55" dir="ltr">
          {t.budget} <span className="text-white">{usd(node.resourceVector.capitalUsd)}</span>
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-[12px] text-white/40">{t.noVector}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const ratio = r.granted === null ? 0 : Math.min(1, r.granted / r.requested);
            const clamped = r.granted !== null && r.granted < r.requested;
            return (
              <li key={r.d}>
                <div className="flex items-baseline justify-between gap-2 font-mono text-[10.5px]" dir="ltr">
                  <span className="text-white/70">{r.d}</span>
                  <span className="tnum text-white/40">
                    {num(r.requested)} {RESOURCE_UNITS[r.d]} {t.requested}
                    {r.granted !== null && (
                      <>
                        {" · "}
                        <span className={clamped ? "text-[var(--xch-clamp)]" : "text-[var(--xch-verified)]"}>
                          {num(r.granted)} {t.granted}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="xch-fill absolute inset-y-0 start-0 w-full rounded-full" style={{ transform: `scaleX(${ratio})`, background: clamped ? "var(--xch-clamp)" : "var(--xch-verified)" }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Detail({ node, onOpenEnclave }: { node: AgentIntentNode; onOpenEnclave: (taskId: string) => void }) {
  const t = useOmniCopy();
  const step = useReplay(node);
  const preset = PROTOCOL_REGISTRY.find((p) => p.id === node.protocol);
  return (
    <Panel className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="solid">
          <Plug className="size-3" /> {node.protocolLabel}
        </Badge>
        <Badge>{t.domains[node.domain]}</Badge>
        {preset && (
          <span className="font-mono text-[10px] text-white/35" dir="ltr">
            {preset.transport}
          </span>
        )}
        <Badge tone={STATUS_TONE[node.invariantStatus]} className="ms-auto">
          {t.intents.status[node.invariantStatus]}
        </Badge>
      </div>
      <div>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{t.intents.coreGoal}</p>
        <p className={cn("mt-1.5 text-[16px] leading-snug tracking-[-0.01em]", node.invariantStatus === "quarantined" ? "text-[var(--xch-threat)]" : "text-white")}>{node.invariantStatus === "quarantined" ? t.intents.quarantinedGoal : node.coreGoal}</p>
        <p className="mt-1 text-[12px] text-white/45">{node.agentName}</p>
        {node.shield.threats > 0 && (
          <p className="mt-2 font-mono text-[10.5px] text-[var(--xch-threat)]" dir="ltr">
            {t.intents.shield}: {node.shield.verdict} · {node.shield.vectors.join(", ")}
          </p>
        )}
      </div>
      <div>
        <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{t.intents.trace}</p>
        <Pipeline node={node} step={step} />
      </div>
      <div>
        <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{t.intents.vector}</p>
        <VectorClamp node={node} />
      </div>
      {(node.certificateId || node.taskId) && step >= STAGES.length && (
        <div className={cn("flex flex-wrap items-center gap-3 rounded-[10px] border p-3", node.certificateId ? "xch-flash border-[color-mix(in_srgb,var(--xch-verified)_30%,transparent)]" : "border-[var(--xch-line)]")}>
          {node.certificateId ? (
            <span className="text-[13px] text-[var(--xch-verified)]">
              <HashDecode text={node.certificateId} />
            </span>
          ) : (
            <span className="font-mono text-[11px] text-white/50" dir="ltr">
              {node.taskId}
            </span>
          )}
          {node.priceUsd !== null && (
            <span className="tnum font-mono text-[12px] text-white/80" dir="ltr">
              {t.intents.settledAt} {usd(node.priceUsd)}
            </span>
          )}
          {node.taskId && (
            <button type="button" onClick={() => onOpenEnclave(node.taskId!)} className="ms-auto flex items-center gap-1 rounded-md border border-[var(--xch-line-strong)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.05] hover:text-white">
              {t.intents.open} <ArrowUpRight className="size-3 rtl:-scale-x-100" />
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}

function InjectDrawer({ open, onClose, x, initialDomain, onInjected }: { open: boolean; onClose: () => void; x: Exchange; initialDomain: MacroDomain | "custom"; onInjected: (n: AgentIntentNode) => void }) {
  const t = useOmniCopy();
  const [domain, setDomain] = useState<MacroDomain | "custom">(initialDomain);
  const [preset, setPreset] = useState<string | null>(null);
  const [payload, setPayload] = useState("");
  const [source, setSource] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AgentIntentNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const step = useReplay(result);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setDomain(initialDomain);
    setResult(null);
    setError(null);
    const first = initialDomain === "custom" ? null : PROTOCOL_REGISTRY.find((p) => p.domain === initialDomain);
    setPreset(first?.id ?? null);
    setPayload(first ? JSON.stringify(first.sample(), null, 2) : "");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, initialDomain]);

  const pick = (id: string) => {
    const p = PROTOCOL_REGISTRY.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setPayload(JSON.stringify(p.sample(), null, 2));
    setResult(null);
  };
  const parsed = useMemo(() => {
    if (!payload.trim()) return undefined;
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return payload;
    }
  }, [payload]);
  const input = domain === "custom" ? { protocol: "custom", source: source || undefined, goal: goal || undefined, payload: parsed } : { protocol: preset ?? "rest", payload: parsed, goal: goal || undefined };
  const preview = useMemo(() => normalize(input), [JSON.stringify(input)]); // eslint-disable-line react-hooks/exhaustive-deps
  const canFire = domain === "custom" ? Boolean(goal.trim() || parsed !== undefined) : Boolean(preset);

  const fire = async () => {
    setBusy(true);
    setError(null);
    const r = await x.inject(input);
    setBusy(false);
    if ("error" in r) setError(r.error);
    else {
      setResult(r);
      onInjected(r);
    }
  };

  const field = "w-full rounded-md border border-[var(--xch-line)] bg-black/40 px-2.5 py-1.5 text-[12.5px] text-white outline-none transition-colors duration-150 placeholder:text-white/25 focus:border-[color-mix(in_srgb,var(--xch-verified)_55%,transparent)]";
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" className="fixed inset-0 z-[80] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} onClick={onClose} />
          <motion.aside key="drawer" role="dialog" aria-modal="true" aria-label={t.inject.title} className="fixed inset-y-0 end-0 z-[90] flex w-full max-w-[520px] flex-col border-s border-[var(--xch-line-strong)] bg-[#170b0f] shadow-[-24px_0_80px_-24px_rgba(0,0,0,0.9)]" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={SPRING}>
            <header className="flex items-start gap-3 border-b border-[var(--xch-line)] px-5 py-4">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-[14px] font-medium text-white">
                  <Zap className="size-4 text-[var(--xch-verified)]" /> {t.inject.title}
                </h2>
                <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">{t.inject.sub}</p>
              </div>
              <button type="button" onClick={onClose} aria-label={t.inject.close} className="ms-auto rounded-md p-1 text-white/50 hover:text-white">
                <X className="size-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {[...MACRO_DOMAINS, "custom" as const].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDomain(d);
                      setResult(null);
                      if (d !== "custom") pick(PROTOCOL_REGISTRY.find((p) => p.domain === d)!.id);
                      else {
                        setPreset(null);
                        setPayload("");
                      }
                    }}
                    className={cn("shrink-0 rounded-md border px-2.5 py-1 text-[11.5px] transition-colors duration-150", domain === d ? "border-[var(--xch-line-strong)] bg-white/[0.07] text-white" : "border-transparent text-white/45 hover:text-white/80")}
                  >
                    {d === "custom" ? t.inject.custom : t.domains[d]}
                  </button>
                ))}
              </div>
              {domain !== "custom" ? (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {PROTOCOL_REGISTRY.filter((p) => p.domain === domain).map((p) => (
                    <button key={p.id} type="button" onClick={() => pick(p.id)} className={cn("rounded-lg border px-2.5 py-2 text-start transition-colors duration-150", preset === p.id ? "border-[color-mix(in_srgb,var(--xch-verified)_45%,transparent)] bg-[color-mix(in_srgb,var(--xch-verified)_6%,transparent)]" : "border-[var(--xch-line)] hover:border-[var(--xch-line-strong)]")}>
                      <span className="block truncate text-[12px] text-white/90">{p.label}</span>
                      <span className="block truncate font-mono text-[9.5px] text-white/35" dir="ltr">
                        {p.transport}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <label className="block">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/40">{t.inject.source}</span>
                  <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={60} placeholder={t.inject.sourcePh} className={cn(field, "mt-1")} />
                </label>
              )}
              <label className="block">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/40">{t.inject.goal}</span>
                <input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={600} placeholder={domain === "custom" ? t.inject.goalPh : preview.coreGoal} className={cn(field, "mt-1")} />
              </label>
              <label className="block">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/40">{t.inject.payload}</span>
                <textarea value={payload} onChange={(e) => setPayload(e.target.value)} rows={7} spellCheck={false} className={cn(field, "tnum mt-1 resize-y font-mono text-[11px] leading-relaxed")} dir="ltr" />
              </label>
              <div className="rounded-[10px] border border-[var(--xch-line)] bg-black/25 p-3">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/40">{t.inject.preview}</p>
                <p className="mt-1.5 text-[12px] text-white/85">{preview.coreGoal}</p>
                <p className="mt-1 text-[11px] text-white/40">
                  {preview.agentName} · {preview.protocolLabel}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5" dir="ltr">
                  {Object.entries(preview.resourceVector)
                    .filter(([, v]) => v > 0)
                    .map(([d, v]) => (
                      <Badge key={d} tone="solid">
                        {d} {d === "capitalUsd" ? usd(v) : num(v)}
                      </Badge>
                    ))}
                </div>
              </div>
              {result && (
                <div className="space-y-3 rounded-[10px] border border-[var(--xch-line)] p-3">
                  <Pipeline node={result} step={step} />
                  {step >= STAGES.length && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={STATUS_TONE[result.invariantStatus]}>{t.intents.status[result.invariantStatus]}</Badge>
                      {result.certificateId && (
                        <span className="text-[12px] text-[var(--xch-verified)]">
                          <HashDecode text={result.certificateId} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {error && <p className="text-[12px] text-[var(--xch-threat)]">{error}</p>}
            </div>
            <footer className="flex gap-2 border-t border-[var(--xch-line)] px-5 py-3">
              <button type="button" disabled={!canFire || busy} onClick={() => void fire()} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--xch-verified)_45%,transparent)] bg-[color-mix(in_srgb,var(--xch-verified)_10%,transparent)] px-3 py-2 text-[13px] text-[var(--xch-verified)] transition-opacity duration-150 disabled:opacity-40">
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />} {busy ? t.inject.firing : result ? t.inject.again : t.inject.fire}
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function AgentGoalInspector({ x, onOpenEnclave, injectOpen, setInjectOpen, domain, setDomain }: { x: Exchange; onOpenEnclave: (taskId: string) => void; injectOpen: boolean; setInjectOpen: (v: boolean) => void; domain: MacroDomain | "all"; setDomain: (d: MacroDomain | "all") => void }) {
  const t = useOmniCopy();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const counts = useMemo(() => Object.fromEntries(MACRO_DOMAINS.map((d) => [d, x.intents.filter((i) => i.domain === d).length])) as Record<MacroDomain, number>, [x.intents]);
  const list = x.intents.filter((i) => (domain === "all" || i.domain === domain) && (!query.trim() || `${i.agentName} ${i.coreGoal} ${i.protocolLabel}`.toLowerCase().includes(query.trim().toLowerCase())));
  const node = x.intents.find((i) => i.id === selected) ?? list[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <Panel className="flex min-h-[420px] flex-col p-3 sm:p-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-white">{t.intents.title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-white/40">{t.intents.sub}</p>
          </div>
          <button type="button" onClick={() => setInjectOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--xch-verified)_45%,transparent)] bg-[color-mix(in_srgb,var(--xch-verified)_10%,transparent)] px-2.5 py-1.5 text-[11.5px] text-[var(--xch-verified)]">
            <Zap className="size-3.5" /> {t.inject.short}
          </button>
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {(["all", ...MACRO_DOMAINS] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDomain(d)} className={cn("flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors duration-150", domain === d ? "border-[var(--xch-line-strong)] bg-white/[0.07] text-white" : "border-transparent text-white/45 hover:text-white/80")}>
              {d === "all" ? t.intents.all : t.domains[d]}
              <span className="tnum font-mono text-[9.5px] text-white/35">{d === "all" ? x.intents.length : counts[d]}</span>
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 rounded-md border border-[var(--xch-line)] bg-black/30 px-2.5">
          <Search className="size-3.5 text-white/35" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.intents.search} className="h-8 w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/25" />
        </label>
        <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {list.length === 0 && <li className="px-2 py-8 text-center text-[11.5px] leading-relaxed text-white/35">{t.intents.empty}</li>}
          {list.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => setSelected(i.id)} className={cn("xch-row-in w-full rounded-lg border px-2.5 py-2 text-start transition-colors duration-150", node?.id === i.id ? "border-[var(--xch-line-strong)] bg-white/[0.05]" : "border-transparent hover:bg-white/[0.025]", i.invariantStatus === "settled" && "xch-flash", i.invariantStatus === "quarantined" && "xch-intercept")}>
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-[10px] text-white/50">{i.protocolLabel}</span>
                  <Badge tone={STATUS_TONE[i.invariantStatus]} className="ms-auto">
                    {t.intents.status[i.invariantStatus]}
                  </Badge>
                </div>
                <p className={cn("mt-1 line-clamp-2 text-[12px] leading-snug", i.invariantStatus === "quarantined" ? "text-[var(--xch-threat)]/80" : "text-white/85")}>{i.invariantStatus === "quarantined" ? t.intents.quarantinedGoal : i.coreGoal}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="truncate text-[10.5px] text-white/40">{i.agentName}</span>
                  <span className="relative ms-auto h-[2px] w-16 shrink-0 overflow-hidden rounded-full bg-white/[0.08]">
                    <span className="xch-fill absolute inset-0 rounded-full" style={{ transform: `scaleX(${i.progress / 100})`, background: i.invariantStatus === "settled" ? "var(--xch-verified)" : i.invariantStatus === "quarantined" ? "var(--xch-threat)" : "var(--xch-clamp)" }} />
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <AnimatePresence mode="wait">
        <motion.div key={node?.id ?? "empty"} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={SPRING} className="min-w-0">
          {node ? (
            <Detail node={node} onOpenEnclave={onOpenEnclave} />
          ) : (
            <Panel className="flex min-h-[420px] items-center justify-center">
              <p className="max-w-sm text-center text-[12px] leading-relaxed text-white/40">{t.intents.select}</p>
            </Panel>
          )}
        </motion.div>
      </AnimatePresence>

      <InjectDrawer open={injectOpen} onClose={() => setInjectOpen(false)} x={x} initialDomain={domain === "all" ? "COMPUTE_INFRA" : domain} onInjected={(n) => setSelected(n.id)} />
    </div>
  );
}
