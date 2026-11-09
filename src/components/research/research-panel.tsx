"use client";

import { useMemo, useState } from "react";
import { FlaskConical, MapPin, Search, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandCopy } from "@/components/bloom/command/locale";
import { ENGINES, isEngineKey } from "@/components/bloom/command/engines";
import { researchTarget, type RefinementQuestion, type ResearchResult } from "@/lib/research/mockResearchEngine";
import { CpButton } from "@/components/control-plane/widget";
import { useOnboardingCopy } from "@/components/onboarding/copy";

/**
 * Client research on the mock intelligence engine: instant, and labeled as simulated on every result. Low-data
 * mode drops the confidence and asks five refinement questions; once all are answered the diagnostic sharpens.
 */
export function ResearchPanel({ initialTarget = "", onResult }: { initialTarget?: string; onResult?: (r: ResearchResult) => void }) {
  const r = useOnboardingCopy().research;
  const { lang } = useCommandCopy();
  const [target, setTarget] = useState(initialTarget);
  const [ran, setRan] = useState(initialTarget.trim() !== "");
  const [lowData, setLowData] = useState(false);
  const [answers, setAnswers] = useState<Partial<Record<RefinementQuestion["id"], string>>>({});

  const result = useMemo(() => (ran && target.trim() ? researchTarget(target, { lang, lowData, answers }) : null), [ran, target, lang, lowData, answers]);
  const questions = lowData && result ? (result.refinement.length ? result.refinement : researchTarget(target, { lang, lowData: true }).refinement) : [];
  const answeredCount = questions.filter((q) => answers[q.id]).length;

  const run = () => {
    if (!target.trim()) return;
    setRan(true);
    const res = researchTarget(target, { lang, lowData, answers });
    onResult?.(res);
  };

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <input
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            setRan(false);
            setAnswers({});
          }}
          maxLength={120}
          placeholder={r.placeholder}
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none"
        />
        <CpButton type="submit" disabled={!target.trim()}>
          <Search className="size-3" /> {r.run}
        </CpButton>
      </form>
      <label className="mt-2 flex w-fit items-center gap-2 text-[11.5px] text-white/55">
        <input
          type="checkbox"
          checked={lowData}
          onChange={(e) => {
            setLowData(e.target.checked);
            setAnswers({});
          }}
          className="accent-[var(--tier-accent)]"
        />
        {r.lowData}
      </label>

      {result && (
        <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/30 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/[0.06] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-amber-200">
              <FlaskConical className="size-3" /> {r.simulated}
            </span>
            <span className="rounded-full border border-white/12 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/55">{result.source === "preset" ? r.preset : r.generated}</span>
            <span className="ms-auto font-mono text-[10.5px] text-white/50">
              {r.confidence} <span className={cn("tabular-nums", result.lowConfidence ? "text-amber-200" : "text-os-cyan")}>{result.confidence.toFixed(1)}%</span>
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <span className={cn("block h-full rounded-full transition-[width] duration-500", result.lowConfidence ? "bg-amber-300" : "bg-os-cyan")} style={{ width: `${result.confidence}%` }} />
          </div>
          <p className="mt-3 text-[15px] font-medium text-white">{result.target}</p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/60">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 text-os-cyan" /> {result.location}
            </span>
            <span className="flex items-center gap-1">
              <Tag className="size-3.5 text-os-cyan" /> {result.niche}
            </span>
          </p>
          <ol className="mt-3 space-y-1.5">
            {result.vectors.map((v, i) => (
              <li key={v.id} className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] text-white/85">
                    <span className="me-1.5 font-mono text-white/35">{i + 1}.</span>
                    {v.title}
                  </span>
                  <span className={cn("shrink-0 font-mono text-[11px] tabular-nums", v.severity === "high" ? "text-os-cyan" : "text-white/55")}>{v.metric}</span>
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-white/50">{v.detail}</span>
                {isEngineKey(v.engine) && <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">→ {ENGINES[v.engine].name}</span>}
              </li>
            ))}
          </ol>

          {lowData && (
            <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/[0.04] p-3">
              <p className="flex items-center justify-between gap-2 text-[12px] text-amber-100/80">
                <span>{r.lowDataHint}</span>
                <span className="shrink-0 font-mono text-[10.5px] text-amber-200/80">{r.answered(answeredCount, questions.length)}</span>
              </p>
              <ol className="mt-2 space-y-2">
                {questions.map((q, i) => (
                  <li key={q.id}>
                    <p className="text-[12px] text-white/75">
                      <span className="me-1 font-mono text-white/35">{i + 1}.</span>
                      {q.question}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {q.options.map((o) => (
                        <button key={o.id} type="button" aria-pressed={answers[q.id] === o.id} onClick={() => setAnswers({ ...answers, [q.id]: o.id })} className={cn("rounded-md border px-2 py-0.5 text-[11.5px] transition-colors", answers[q.id] === o.id ? "border-os-cyan/50 bg-os-cyan/10 text-os-cyan" : "border-white/10 text-white/55 hover:text-white")}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
              {answeredCount === questions.length && (
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-os-cyan">
                  <Sparkles className="size-3.5" /> {r.refine}
                </p>
              )}
            </div>
          )}
          <p className="mt-2 text-[10.5px] leading-snug text-white/35">{r.simulatedNote}</p>
        </div>
      )}
    </div>
  );
}
