"use client";

import { motion } from "framer-motion";
import { useDeskUi } from "./desk-ui-copy";
import { Check, Cpu, FileText, Route, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RunPhase } from "@/lib/engines/events";
import { fmtMs } from "./format";
import { PHASES, type PhaseState } from "./use-run";

const STEP: Record<RunPhase, { n: string; icon: typeof Cpu }> = {
  parse: { n: "01", icon: Cpu },
  route: { n: "02", icon: Route },
  compose: { n: "03", icon: FileText },
};

/** The run's three stages, each with its live detail line and how long it took. */
export function RunStepper({ phases, now }: { phases: Record<RunPhase, PhaseState>; now: number }) {
  const u = useDeskUi();
  return (
    <ol className="grid gap-2 sm:grid-cols-3" aria-label={u.steps.progress}>
      {PHASES.map((p) => {
        const ph = phases[p];
        const s = STEP[p];
        const Icon = ph.status === "done" ? Check : ph.status === "failed" ? X : s.icon;
        const elapsed = ph.ms ?? (ph.startedAt ? now - ph.startedAt : null);
        return (
          <li
            key={p}
            aria-current={ph.status === "active" ? "step" : undefined}
            className={cn(
              "relative overflow-hidden rounded-xl border p-3 transition-colors",
              ph.status === "active" && "border-c-1/60 bg-c-deep/60",
              ph.status === "done" && "border-emerald-400/30 bg-emerald-400/[0.04]",
              ph.status === "failed" && "border-red-400/40 bg-red-500/[0.06]",
              ph.status === "pending" && "border-white/[0.07] opacity-55",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  ph.status === "done" ? "border-emerald-400/60 text-emerald-300" : ph.status === "failed" ? "border-red-400/60 text-red-300" : ph.status === "active" ? "border-c-1 text-c-2" : "border-white/20 text-white/40",
                )}
              >
                <Icon className={cn("size-3.5", ph.status === "active" && "animate-pulse")} />
              </span>
              <span className="font-mono text-[10px] tracking-[0.18em] text-white/40">{s.n}</span>
              <span className="ms-auto font-mono text-[10.5px] tabular-nums text-white/45">{elapsed !== null ? fmtMs(elapsed) : ""}</span>
            </div>
            <p className="mt-2 text-[12.5px] font-medium leading-snug text-white/90">{u.steps[p]}</p>
            <p className="mt-1 line-clamp-2 min-h-[2.4em] text-[11.5px] leading-snug text-white/45">{ph.detail}</p>
            {ph.status === "active" && (
              <motion.span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 bg-linear-to-r from-transparent via-c-1 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
