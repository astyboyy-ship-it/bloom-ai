"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Compass, Crown, Loader2, Lock, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { CpButton, Widget } from "@/components/control-plane/widget";
import { useExperienceCopy } from "../copy";

const STEP_MS = 1100;
const TOUR_KEY = "bloom-eval-tour";

/**
 * Sovereign Sandbox: a read-only preview for evaluation keys. A scripted run walks Sovereign's stages locally
 * (nothing reaches the server, which refuses live runs from eval keys anyway), next to a guided tour of the desk
 * that remembers where the evaluator left off.
 */
export function SovereignSandbox() {
  const t = useExperienceCopy().eval;
  const [stage, setStage] = useState(-1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = stage >= 0 && stage < t.steps.length;
  const done = stage >= t.steps.length;

  const play = () => {
    if (timer.current) clearInterval(timer.current);
    setStage(0);
    timer.current = setInterval(() => {
      setStage((s) => {
        if (s + 1 >= t.steps.length && timer.current) clearInterval(timer.current);
        return s + 1;
      });
    }, STEP_MS);
  };
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  return (
    <div className="grid gap-[var(--bloom-gap)] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Widget
        icon={Crown}
        title={t.title}
        sub={t.sub}
        actions={
          <span className="flex items-center gap-1.5 rounded-full border border-amber-300/30 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-amber-200/80">
            <Lock className="size-3" /> {t.readOnly}
          </span>
        }
      >
        <p className="text-[13px] leading-relaxed text-white/65">{t.mandate}</p>
        <ol className="mt-4 space-y-2">
          {t.steps.map((label, i) => {
            const state = stage > i ? "done" : stage === i ? "active" : "pending";
            return (
              <li key={label} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors duration-500", state === "active" ? "bloom-edge-glow" : state === "done" ? "border-os-cyan/20 bg-os-cyan/[0.04]" : "border-white/[0.06] bg-black/30")}>
                {state === "done" ? <CheckCircle2 className="size-4 text-os-cyan" /> : state === "active" ? <Loader2 className="size-4 animate-spin text-os-cyan" /> : <Circle className="size-4 text-white/25" />}
                <span className={cn("text-[12.5px]", state === "pending" ? "text-white/45" : "text-white/85")}>{label}</span>
              </li>
            );
          })}
        </ol>
        {done && <p className="mt-3 text-[12px] text-os-cyan/90">{t.done}</p>}
        <CpButton className="mt-4" onClick={play} disabled={running}>
          {done ? <RotateCcw className="size-3" /> : <Play className="size-3" />} {done ? t.replay : t.play}
        </CpButton>
      </Widget>
      <GuidedTour />
    </div>
  );
}

function GuidedTour() {
  const t = useExperienceCopy().eval;
  const [i, setI] = useState(0);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(TOUR_KEY));
      if (Number.isInteger(saved) && saved >= 0 && saved < t.tour.length) setI(saved);
    } catch {
      // Starts at the first step.
    }
  }, [t.tour.length]);
  const go = (n: number) => {
    setI(n);
    try {
      localStorage.setItem(TOUR_KEY, String(n));
    } catch {
      // Not remembered; fine.
    }
  };
  const step = t.tour[i];
  const last = i === t.tour.length - 1;

  return (
    <Widget icon={Compass} title={t.tourTitle} actions={<span className="font-mono text-[10px] text-white/45">{t.step(i + 1, t.tour.length)}</span>}>
      <div className="flex gap-1">
        {t.tour.map((s, n) => (
          <button key={s.title} type="button" aria-label={s.title} onClick={() => go(n)} className={cn("h-1 flex-1 rounded-full transition-colors duration-500", n <= i ? "bg-os-cyan" : "bg-white/10")} />
        ))}
      </div>
      <h3 className="mt-4 text-[16px] font-medium text-white">{step.title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{step.body}</p>
      <Link href={step.href} className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-os-cyan hover:underline">
        {t.open} →
      </Link>
      <div className="mt-5 flex items-center gap-2">
        <CpButton tone="quiet" disabled={i === 0} onClick={() => go(i - 1)}>
          {t.prev}
        </CpButton>
        {last ? (
          <CpButton tone="quiet" className="ms-auto" onClick={() => go(0)}>
            <RotateCcw className="size-3" /> {t.restart}
          </CpButton>
        ) : (
          <CpButton className="ms-auto" onClick={() => go(i + 1)}>
            {t.next}
          </CpButton>
        )}
      </div>
    </Widget>
  );
}
