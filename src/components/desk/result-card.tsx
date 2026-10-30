"use client";

import { cn } from "@/lib/utils";
import { ENGINES, isEngineKey } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import type { DESK_COPY } from "./copy";

type Action = { title: string; owner: string; priority: "p0" | "p1" | "p2"; detail: string };
type Output = { summary?: string; confidence?: number; actions?: Action[] } & Record<string, unknown>;

const PRIORITY: Record<Action["priority"], string> = {
  p0: "border-red-400/50 text-red-200",
  p1: "border-[#f0d59a]/50 text-[#f3e2b8]",
  p2: "border-white/15 text-white/55",
};

/** The engine's validated final output: summary, confidence, owned actions, and its domain fields. */
export function ResultCard({ c, output }: { c: (typeof DESK_COPY)["en"]; output: unknown }) {
  if (!output || typeof output !== "object") return null;
  const { summary, confidence, actions = [], ...rest } = output as Output;
  return (
    <section aria-label={c.result} className="os-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#f0d59a]/85">{c.result}</p>
        {typeof confidence === "number" && (
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
            {c.confidence}
            <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
              <span className="absolute inset-y-0 start-0 rounded-full bg-linear-to-r from-[#f0d59a] to-[#ffbd6e]" style={{ width: `${Math.round(confidence * 100)}%` }} />
            </span>
            <span className="tabular-nums text-white/80">{Math.round(confidence * 100)}%</span>
          </span>
        )}
      </div>
      {summary && <p dir="auto" className="mt-3 font-display text-[21px] font-light leading-snug text-white sm:text-[23px]">{summary}</p>}

      {actions.length > 0 && (
        <>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">{c.actions}</p>
          <ul className="mt-2 space-y-2">
            {actions.map((a, i) => {
              const engine = isEngineKey(a.owner) ? a.owner : null;
              return (
                <li key={i} className="flex gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-3">
                  <span className={cn("h-fit shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em]", PRIORITY[a.priority])}>{a.priority}</span>
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium text-white">
                      {a.title}
                      <span
                        style={engine ? paletteVars(PALETTES[engine]) : undefined}
                        className={cn("rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.14em]", engine ? "border-c-edge text-c-2" : "border-white/20 text-white/60")}
                      >
                        {engine ? ENGINES[engine].name : c.human}
                      </span>
                    </p>
                    <p dir="auto" className="mt-1 text-[12.5px] text-white/55">{a.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {Object.keys(rest).length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 hover:text-white/70">{c.structured}</summary>
          <pre dir="ltr" className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-3 text-start font-mono text-[11px] text-white/70">{JSON.stringify(rest, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
