"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Plus, RotateCcw, Scissors, Sparkles, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compress, DEFAULT_STEPS, levers, MODEL_IDS, MODELS, optimized, PRICING_NOTE, stepCost, TASKS, tokens, type ModelId, type Step, type Task } from "@/lib/studio/shift";
import { Button } from "../../command-center/kit";
import { Field, inputCls, PageBar } from "../frame";
import { usd, useInfra } from "./store";

/** Visual exact-AI router: every step priced, every saving itemised and applicable on its own. */
export function OptimizerPage() {
  const s = useInfra();
  const { steps, setSteps, before, best } = s;
  const [selId, setSelId] = useState(steps[0]?.id);
  const [showStrip, setShowStrip] = useState(false);
  const sel = steps.find((x) => x.id === selId) ?? steps[0];
  const strip = useMemo(() => compress(sel.system), [sel.system]);
  const selLevers = levers(sel);

  const patch = (id: string, p: Partial<Step>, audit?: string) => {
    setSteps(steps.map((x) => (x.id === id ? { ...x, ...p } : x)));
    if (audit) s.record(audit, steps.find((x) => x.id === id)?.name ?? id);
  };

  return (
    <>
      <PageBar
        icon={Zap}
        accent="#c9d6e6"
        title="Exact-AI prompt & cost optimizer"
        meta={
          <>
            Workflow costs <span className="tabular-nums text-white">{usd(before)}/day</span>
            {best < before - 0.005 && (
              <>
                {" "}· <span className="tabular-nums text-[#9fd3a8]">{usd(best)}/day</span> fully optimized (−{Math.round((1 - best / before) * 100)}%, −{usd((before - best) * 30)}/month)
              </>
            )}
          </>
        }
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => { setSteps(DEFAULT_STEPS); setSelId(DEFAULT_STEPS[0].id); s.record("Workflow reset", "Restored the sample support workflow"); }}>
              <RotateCcw className="size-3.5" /> Reset
            </Button>
            <Button size="sm" variant="primary" disabled={best >= before - 0.005} onClick={() => { setSteps(steps.map(optimized)); s.record("Apply all optimizations", `${usd(before)}/day → ${usd(best)}/day`); toast.success("All optimizations applied"); }}>
              <Sparkles className="size-3.5" /> Apply all
            </Button>
          </>
        }
      />

      <div className="shrink-0 overflow-x-auto border-b border-white/[0.07] bg-[#0b0a0e]/70 px-4 py-4">
        <ol className="flex min-w-max items-stretch gap-2">
          {steps.map((x, i) => {
            const c = stepCost(x).perDay;
            const o = stepCost(optimized(x)).perDay;
            return (
              <li key={x.id} className="flex items-center gap-2">
                <button type="button" onClick={() => setSelId(x.id)} className={cn("w-48 rounded-lg border bg-[#121116] p-3 text-left transition-colors", x.id === sel.id ? "border-[#c9d6e6]/60" : "border-white/[0.09] hover:border-white/25")}>
                  <span className="block text-[10.5px] uppercase tracking-wide text-white/35">
                    {i + 1} · {TASKS[x.task].label}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] font-medium text-white">{x.name}</span>
                  <span className="mt-1.5 block truncate text-[11.5px] text-white/55">
                    {MODELS[x.model].label}
                    {x.cache && " · cached"}
                    {x.batch && " · batch"}
                  </span>
                  <span className="mt-1 flex items-baseline justify-between text-[12px]">
                    <span className="tabular-nums text-white">{usd(c)}/day</span>
                    {o < c - 0.005 && <span className="tabular-nums text-[11px] text-[#9fd3a8]">→ {usd(o)}</span>}
                  </span>
                  <span className="mt-1 block text-[10.5px] tabular-nums text-white/35">{x.callsPerDay.toLocaleString("en-US")} calls/day</span>
                </button>
                {i < steps.length - 1 && <ArrowRight className="size-4 shrink-0 text-white/25" />}
              </li>
            );
          })}
          <li className="flex items-center">
            <button
              type="button"
              onClick={() => {
                const n: Step = { id: `st${Date.now()}`, name: "New step", task: "generate", model: "claude-opus-5-5", system: "Describe exactly what this step must do.", inputTokens: 500, outputTokens: 200, callsPerDay: 500, realtime: true, cache: false, batch: false };
                setSteps([...steps, n]);
                setSelId(n.id);
                s.record("Step added", n.name);
              }}
              className="flex h-full w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 text-[12px] text-white/45 hover:border-white/30 hover:text-white"
            >
              <Plus className="size-4" /> Add step
            </button>
          </li>
        </ol>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#0b0a0e]/60 p-4">
        <div className="mx-auto grid max-w-6xl gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input className={cn(inputCls, "text-[14px] font-semibold")} value={sel.name} onChange={(e) => patch(sel.id, { name: e.target.value })} aria-label="Step name" />
              {steps.length > 1 && (
                <Button size="sm" variant="danger" aria-label="Delete step" onClick={() => { setSteps(steps.filter((x) => x.id !== sel.id)); setSelId(steps.find((x) => x.id !== sel.id)!.id); s.record("Step removed", sel.name); }}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <Field label="Task">
                <select className={inputCls} value={sel.task} onChange={(e) => patch(sel.id, { task: e.target.value as Task }, `Task → ${TASKS[e.target.value as Task].label}`)}>
                  {(Object.keys(TASKS) as Task[]).map((t) => (
                    <option key={t} value={t} className="bg-[#16141b]">
                      {TASKS[t].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Model">
                <select className={inputCls} value={sel.model} onChange={(e) => patch(sel.id, { model: e.target.value as ModelId }, `Model → ${MODELS[e.target.value as ModelId].label}`)}>
                  {MODEL_IDS.map((m) => (
                    <option key={m} value={m} className="bg-[#16141b]">
                      {MODELS[m].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Calls / day">
                <input type="number" min={1} className={inputCls} value={sel.callsPerDay} onChange={(e) => patch(sel.id, { callsPerDay: Math.max(1, Number(e.target.value) || 1) })} />
              </Field>
              <Field label="Input tok / call">
                <input type="number" min={0} className={inputCls} value={sel.inputTokens} onChange={(e) => patch(sel.id, { inputTokens: Math.max(0, Number(e.target.value) || 0) })} />
              </Field>
              <Field label="Output tok / call">
                <input type="number" min={1} className={inputCls} value={sel.outputTokens} onChange={(e) => patch(sel.id, { outputTokens: Math.max(1, Number(e.target.value) || 1) })} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-4 text-[12.5px] text-white/70">
              {(
                [
                  ["realtime", "Someone waits on the answer"],
                  ["cache", "Cache the system prompt"],
                  ["batch", "Batch API (50% off)"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={sel[k]} disabled={k === "batch" && sel.realtime} onChange={(e) => patch(sel.id, { [k]: e.target.checked, ...(k === "realtime" && e.target.checked ? { batch: false } : {}) }, `${label}: ${e.target.checked ? "on" : "off"}`)} className="accent-[#c9d6e6]" />
                  {label}
                </label>
              ))}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11.5px] text-white/50">System prompt · {tokens(sel.system).toLocaleString("en-US")} tokens (≈ 4 chars/token)</span>
                {tokens(strip.text) < tokens(sel.system) && (
                  <button type="button" onClick={() => setShowStrip((v) => !v)} className="flex items-center gap-1 text-[11.5px] text-[#c9d6e6] hover:text-white">
                    <Scissors className="size-3.5" /> {showStrip ? "Hide" : "Review"} bloat ({tokens(sel.system) - tokens(strip.text)} tokens)
                  </button>
                )}
              </div>
              <textarea className={cn(inputCls, "min-h-40 resize-y font-mono text-[12px] leading-relaxed")} value={sel.system} onChange={(e) => patch(sel.id, { system: e.target.value })} />
              {showStrip && tokens(strip.text) < tokens(sel.system) && (
                <div className="mt-2 rounded-md border border-[#c9d6e6]/25 bg-[#c9d6e6]/[0.05] p-3">
                  <p className="text-[11.5px] text-white/50">Exact prompt · {tokens(strip.text)} tokens</p>
                  <pre className="mt-1 whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-white/85">{strip.text}</pre>
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {strip.removed.map((r, i) => (
                      <li key={i} className="rounded bg-[#ff7b6b]/10 px-1.5 py-0.5 text-[10.5px] text-[#ffb3a8] line-through decoration-[#ff7b6b]/50">
                        {r}
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="primary" className="mt-2.5" onClick={() => { patch(sel.id, { system: strip.text }, `Prompt trimmed −${tokens(sel.system) - tokens(strip.text)} tokens`); setShowStrip(false); }}>
                    <Scissors className="size-3.5" /> Use the exact prompt
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-white/[0.08] bg-[#121116] p-3">
              <p className="text-[11.5px] uppercase tracking-wide text-white/40">Cost per day</p>
              <ul className="mt-2 space-y-1 text-[12px]">
                {stepCost(sel).lines.map((l) => (
                  <li key={l.label} className="flex justify-between gap-2">
                    <span className="text-white/55">{l.label}</span>
                    <span className="tabular-nums text-white/85">{usd(l.usd)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-white/[0.08] pt-1.5 font-medium">
                  <span className="text-white/85">{MODELS[sel.model].label}</span>
                  <span className="tabular-nums text-white">{usd(stepCost(sel).perDay)}</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-[#121116] p-3">
              <p className="text-[11.5px] uppercase tracking-wide text-white/40">Optimizations for this step</p>
              {selLevers.length ? (
                <ul className="mt-2 space-y-2.5">
                  {selLevers.map((l) => {
                    const save = stepCost(sel).perDay - stepCost(l.apply(sel)).perDay;
                    return (
                      <li key={l.id}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[12.5px] text-white/85">{l.label}</span>
                          <span className="shrink-0 tabular-nums text-[12px] text-[#9fd3a8]">−{usd(save)}/day</span>
                        </div>
                        <p className="text-[11.5px] text-white/45">{l.detail}</p>
                        <Button size="sm" className="mt-1" onClick={() => patch(sel.id, l.apply(sel), `${l.label} (−${usd(save)}/day)`)}>
                          <Check className="size-3.5" /> Apply
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-[12px] text-[#9fd3a8]">Already exact: right model, lean prompt, nothing left to cut.</p>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-white/35">{PRICING_NOTE} Cache writes 1.25× input (5-minute TTL), cache reads ≈ 0.1× input, Batch API 50% off.</p>
          </div>
        </div>
      </div>
    </>
  );
}
