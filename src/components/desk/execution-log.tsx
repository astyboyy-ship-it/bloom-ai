"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowDownRight, Info, BrainCircuit, Check, CircleDot, Loader2, MessageSquareText, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import type { DESK_COPY } from "./copy";
import { STATUS_DOT } from "./engine-status";
import { fmtMs, fmtOffset } from "./format";
import type { AgentState, LogEntry } from "./use-run";

type Props = { c: (typeof DESK_COPY)["en"]; log: LogEntry[]; agents: Record<string, AgentState> };

/** The live stream: each agent's reasoning, tool calls and hand-offs, indented by delegation depth. */
export function ExecutionLog({ c, log, agents }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Follow the stream unless the operator has scrolled up to read.
  useEffect(() => {
    const el = box.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <div
      ref={box}
      role="log"
      aria-live="polite"
      aria-label={c.log}
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      }}
      className="min-h-64 flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed"
    >
      {log.length === 0 ? (
        <p className="py-10 text-center font-sans text-[13px] text-white/40">{c.logEmpty}</p>
      ) : (
        <ol className="space-y-1">
          {log.map((l) => {
            const agent = l.agentId ? agents[l.agentId] : undefined;
            const engine = agent?.engine;
            return (
              <li key={l.id} style={engine ? paletteVars(PALETTES[engine]) : undefined} className="grid grid-cols-[3.6rem_1fr] gap-2">
                <span className="pt-px text-[10.5px] tabular-nums text-white/30">{fmtOffset(l.at)}</span>
                <div className="min-w-0" style={{ paddingInlineStart: `${(agent?.depth ?? 0) * 18}px` }}>
                  <Line c={c} entry={l} engine={engine} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Tag({ engine }: { engine?: EngineKey }) {
  if (!engine) return null;
  return <span className="me-2 rounded border border-c-edge/70 bg-c-deep/70 px-1.5 py-px text-[9.5px] uppercase tracking-[0.14em] text-c-2">{ENGINES[engine].name}</span>;
}

function Line({ c, entry: l, engine }: { c: Props["c"]; entry: LogEntry; engine?: EngineKey }) {
  const name = engine ? ENGINES[engine].name : "";
  switch (l.kind) {
    case "agent":
      return (
        <p className={cn("flex items-center gap-1.5", l.phase === "failed" ? "text-red-300" : "text-c-2")}>
          {l.phase === "start" ? <CircleDot className="size-3.5 shrink-0" /> : l.phase === "end" ? <Check className="size-3.5 shrink-0" /> : <X className="size-3.5 shrink-0" />}
          <span className="font-sans text-[12.5px] font-medium">{l.phase === "start" ? c.agentStart(name) : l.phase === "end" ? c.agentEnd(name, fmtMs(l.ms ?? 0)) : c.agentFailed(name)}</span>
        </p>
      );
    case "reasoning":
      return (
        <p className="flex gap-1.5 font-sans text-[12.5px] italic text-white/55">
          <BrainCircuit className="mt-0.5 size-3.5 shrink-0 text-c-3/70" />
          <span dir="auto" className="whitespace-pre-wrap break-words">{l.text}</span>
        </p>
      );
    case "text":
      return (
        <p className="flex gap-1.5 font-sans text-[13px] text-white/85">
          <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-c-1/80" />
          <span dir="auto" className="whitespace-pre-wrap break-words">{l.text}</span>
        </p>
      );
    case "delegate":
      return (
        <p className="flex items-center gap-1.5 text-[#f3e2b8]" style={paletteVars(PALETTES[l.to])}>
          <ArrowDownRight className="size-3.5 shrink-0" />
          <span className="font-sans text-[12.5px]">{c.delegatedTo(ENGINES[l.to].name)}</span>
          <span className={cn("size-1.5 rounded-full", STATUS_DOT.running)} />
        </p>
      );
    case "notice":
      return (
        <p className="flex gap-1.5 font-sans text-[12px] text-[#f3e2b8]/80">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span dir="auto" className="break-words">{l.text}</span>
        </p>
      );
    case "error":
      return (
        <p className="flex gap-1.5 font-sans text-[12.5px] text-red-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span dir="auto" className="break-words">{l.text}</span>
        </p>
      );
    case "tool": {
      const pending = l.ok === undefined;
      return (
        <details className="group rounded-md border border-white/[0.06] bg-white/[0.02] open:bg-black/30">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2 py-1 marker:hidden">
            <Tag engine={engine} />
            <Wrench className="size-3 shrink-0 text-white/40" />
            <span className="truncate text-white/80">{l.tool}</span>
            <span className="ms-auto flex shrink-0 items-center gap-1.5 text-[10.5px] tabular-nums text-white/40">
              {pending ? <Loader2 className="size-3 animate-spin text-c-1" /> : l.ok ? <Check className="size-3 text-emerald-400" /> : <X className="size-3 text-red-400" />}
              {l.ms !== undefined && fmtMs(l.ms)}
            </span>
          </summary>
          <div className="grid gap-2 border-t border-white/[0.06] p-2 text-[11px] sm:grid-cols-2">
            <Json label="in" value={l.input} />
            {!pending && <Json label="out" value={l.output} bad={!l.ok} />}
          </div>
        </details>
      );
    }
  }
}

function Json({ label, value, bad }: { label: string; value: unknown; bad?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[9px] uppercase tracking-[0.2em] text-white/35">{label}</p>
      <pre dir="ltr" className={cn("max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-black/40 p-2 text-start", bad ? "text-red-300" : "text-white/70")}>
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
