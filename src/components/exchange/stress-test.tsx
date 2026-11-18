"use client";

import { Crosshair, FileCheck2, Loader2, Swords, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicRound } from "@/lib/exchange/types";
import { useExchangeCopy } from "./copy";
import { SCENARIOS, type ScenarioId } from "./scenarios";
import { Badge, ENGINE_TONE, Panel, PanelHeader, usd, type Tone } from "./ui";
import type { Exchange } from "./use-exchange";

const ICONS = { standard: Target, adversarial: Swords, breach: Crosshair };
const OUTCOME_TONE: Record<string, Tone> = { completed: "emerald", input_required: "amber", failed: "red", canceled: "muted", working: "cyan", submitted: "cyan" };

function Convergence({ rounds }: { rounds: PublicRound[] }) {
  if (rounds.length < 2) return <div className="h-28" />;
  const prices = rounds.map((r) => r.terms.priceUsd);
  const lo = Math.min(...prices) * 0.97;
  const hi = Math.max(...prices) * 1.02;
  const x = (i: number) => 4 + (i / Math.max(1, rounds.length - 1)) * 92;
  const y = (p: number) => 96 - ((p - lo) / (hi - lo || 1)) * 88;
  const line = (side: PublicRound["by"]) =>
    rounds
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.by === side)
      .map(({ r, i }) => `${x(i).toFixed(2)},${y(r.terms.priceUsd).toFixed(2)}`)
      .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-28 w-full overflow-visible" aria-hidden>
      {[25, 50, 75].map((g) => (
        <line key={g} x1={0} x2={100} y1={g} y2={g} stroke="rgb(255 255 255 / 0.05)" vectorEffect="non-scaling-stroke" />
      ))}
      <polyline points={line("initiator")} fill="none" stroke="var(--tier-accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <polyline points={line("counterparty")} fill="none" stroke="#fbbf24" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {rounds.map((r, i) => (
        <circle key={r.n} cx={x(i)} cy={y(r.terms.priceUsd)} r={1.4} fill={r.by === "initiator" ? "var(--tier-accent)" : "#fbbf24"} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function StressTest({ x, onInspect }: { x: Exchange; onInspect: (taskId: string) => void }) {
  const t = useExchangeCopy().stress;
  const run = x.run;
  const busy = run !== null && (run.state === "submitted" || run.state === "working") && !run.error;

  return (
    <Panel className="xl:col-span-7">
      <PanelHeader icon={Zap} title={t.title} sub={t.sub} />

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => {
          const Icon = ICONS[id];
          const s = SCENARIOS[id];
          const active = run?.scenario === id;
          return (
            <button
              key={id}
              type="button"
              disabled={busy}
              onClick={() => void x.fire(id)}
              className={cn(
                "group rounded-xl border p-3 text-start transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
                active ? "bloom-edge-glow bg-os-cyan/[0.05]" : "border-white/[0.08] bg-black/20 hover:border-white/20",
                id === "adversarial" && !active && "hover:border-amber-300/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-white">
                  <Icon className={cn("size-3.5", id === "adversarial" ? "text-amber-200" : id === "breach" ? "text-orange-200" : "text-os-cyan")} /> {t.scenarios[id].name}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40 group-hover:text-os-cyan">{busy && active ? <Loader2 className="size-3 animate-spin" /> : t.fire}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-white/45">{t.scenarios[id].body}</p>
              <p className="mt-2 font-mono text-[10px] tabular-nums text-white/35" dir="ltr">
                ≤ {usd(Math.min(s.mandate.ceilingPriceUsd, s.mandate.maxBudgetUsd))} · {s.mandate.requiredSlaTier} · net {s.mandate.targetNetDays}
              </p>
            </button>
          );
        })}
      </div>

      {!run ? (
        <p className="mt-6 py-10 text-center font-mono text-[11px] text-white/35">{t.idle}</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="min-w-0 rounded-xl border border-white/[0.06] bg-black/25 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
                {t.rounds} · <span className="text-white/60" dir="ltr">{run.taskId ?? "…"}</span>
              </p>
              <div className="flex items-center gap-2">
                <Badge tone={OUTCOME_TONE[run.state] ?? "muted"}>
                  {busy && <Loader2 className="size-3 animate-spin" />} {busy ? t.running : t.outcome[run.state]}
                </Badge>
                {run.certificateId && run.taskId && (
                  <button type="button" onClick={() => onInspect(run.taskId!)} className="flex items-center gap-1 rounded-full border border-os-emerald/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-os-emerald hover:bg-os-emerald/10">
                    <FileCheck2 className="size-3" /> {t.inspect}
                  </button>
                )}
                {run.state === "input_required" && run.taskId && (
                  <button type="button" onClick={() => onInspect(run.taskId!)} className="rounded-full border border-amber-300/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-200 hover:bg-amber-300/10">
                    {t.outcome.input_required} →
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 flex gap-3 font-mono text-[9px] uppercase tracking-[0.14em]">
              <span className="text-os-cyan">● {t.you}</span>
              <span className="text-amber-200">● {t.them}</span>
            </div>
            <Convergence rounds={run.rounds} />
            <div className="mt-2 max-h-52 overflow-y-auto">
              <table className="w-full font-mono text-[10.5px] tabular-nums">
                <tbody>
                  {run.rounds.map((r) => (
                    <tr key={r.n} className="animate-row-in border-t border-white/[0.04] align-top">
                      <td className="py-1 pe-2 text-white/35">R{r.n}</td>
                      <td className={cn("py-1 pe-2", r.by === "initiator" ? "text-os-cyan" : "text-amber-200")}>{r.by === "initiator" ? t.you : t.them}</td>
                      <td className="py-1 pe-2 text-end text-white/90" dir="ltr">
                        {usd(r.terms.priceUsd)}
                      </td>
                      <td className="py-1 pe-2 text-white/45" dir="ltr">
                        n{r.terms.netDays}
                      </td>
                      <td className="max-w-0 truncate py-1 text-white/40" title={r.message} dir="ltr">
                        {r.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-white/[0.06] bg-black/25 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">{t.log}</p>
            <ol className="mt-2 max-h-[340px] space-y-1.5 overflow-y-auto font-mono text-[10.5px] leading-snug">
              {run.error && <li className="text-red-300">{run.error}</li>}
              {run.log.map((l) => (
                <li key={l.id} className="animate-row-in grid grid-cols-[66px_1fr] gap-2">
                  <span className={cn("uppercase tracking-[0.1em]", ENGINE_TONE[l.source] ?? "text-white/50")}>{l.source}</span>
                  <span className={cn(l.tone === "good" ? "text-os-emerald/90" : l.tone === "bad" ? "text-orange-200" : l.tone === "warn" ? "text-white/75" : "text-white/55")} dir="ltr">
                    {l.text}
                  </span>
                </li>
              ))}
            </ol>
            {run.scenario === "adversarial" && (
              <details className="mt-3 border-t border-white/[0.06] pt-2">
                <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.18em] text-amber-200/80">{t.payload}</summary>
                <pre className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-black/40 p-2 text-[10px] text-white/45" dir="ltr">
                  {SCENARIOS.adversarial.message.replace(/[\u{E0000}-\u{E007F}]+/gu, "⟨invisible tag payload⟩")}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
