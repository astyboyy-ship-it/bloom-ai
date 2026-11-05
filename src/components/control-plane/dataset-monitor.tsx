"use client";

import { useEffect, useRef, useState } from "react";
import { Database, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, isEngineKey } from "@/components/bloom/command/engines";
import { addToSummary, emptySummary, type DatasetsResponse, type TraceRow, type TraceSummary } from "@/lib/datasets/summary";
import { useLicensingCopy } from "./copy";
import { CpButton, Widget } from "./widget";

const POLL_MS = 2000;
const KEEP = 60;

/**
 * Autonomous Dataset Pipeline Monitor: tails .bloom/datasets/trace_log.jsonl through /api/control-plane/datasets.
 * The first poll brings a whole-file summary; every poll after it brings only the lines appended since, which
 * are folded into the counters and the live trace list.
 */
export function DatasetMonitor() {
  const c = useLicensingCopy().cp.data;
  const [summary, setSummary] = useState<TraceSummary>(emptySummary);
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [state, setState] = useState<{ available: boolean; exists: boolean; file: string; size: number } | null>(null);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState(0);
  const offset = useRef(0);

  useEffect(() => {
    if (paused) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/control-plane/datasets?from=${offset.current}`, { cache: "no-store" });
        if (res.ok) {
          const d = (await res.json()) as DatasetsResponse;
          if (!alive) return;
          setState({ available: d.available, exists: d.exists, file: d.file, size: d.size });
          // The file shrank (rotated or truncated): start over with a fresh summary.
          const restart = d.next < offset.current;
          if (d.summary || restart) setSummary(d.summary ?? emptySummary());
          else if (d.rows.length)
            setSummary((s) => {
              const next = { ...s, byEngine: { ...s.byEngine } };
              d.rows.forEach((r) => addToSummary(next, r));
              return next;
            });
          if (d.rows.length) {
            setRows((prev) => [...(d.summary || restart ? [] : prev), ...d.rows].slice(-KEEP));
            if (offset.current > 0) setFlash((f) => f + 1);
          }
          offset.current = d.next;
        }
      } catch {
        // Offline for a moment: the next poll catches up from the same offset.
      }
      if (alive) timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [paused]);

  const yieldPct = summary.traces ? (summary.samples / summary.traces) * 100 : 0;
  const avg = summary.traces ? Math.round(summary.ms / summary.traces) : 0;
  const engines = Object.entries(summary.byEngine).sort((a, b) => b[1] - a[1]);
  const top = engines[0]?.[1] ?? 1;

  return (
    <Widget
      icon={Database}
      title={c.title}
      sub={c.sub}
      actions={
        <>
          <span className={cn("flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]", paused ? "text-white/40" : "text-os-emerald")}>
            <span className={cn("size-1.5 rounded-full", paused ? "bg-white/30" : "bg-os-emerald shadow-[0_0_8px_#34f5b5]")} style={paused ? undefined : { animation: "bloom-pulse 1.6s ease-in-out infinite" }} />
            {paused ? c.paused : c.live}
          </span>
          <CpButton tone="quiet" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />} {paused ? c.resume : c.pause}
          </CpButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: c.traces, value: summary.traces.toLocaleString("en-US") },
          { label: c.samples, value: summary.samples.toLocaleString("en-US"), hi: true },
          { label: c.rate, value: `${yieldPct.toFixed(1)}%` },
          { label: c.latency, value: summary.traces ? `${avg.toLocaleString("en-US")}ms` : "—" },
          { label: c.tokens, value: summary.tokens.toLocaleString("en-US") },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">{m.label}</p>
            <p key={m.hi ? flash : undefined} className={cn("mt-1 font-mono text-[18px] tabular-nums", m.hi ? "bloom-glow" : "text-white/85")} style={m.hi && flash ? { animation: "bloom-pulse 0.6s ease-out 2" } : undefined}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-2 truncate font-mono text-[10px] text-white/35" dir="ltr">
        {state?.file ?? ".bloom/datasets/trace_log.jsonl"}
        {state?.exists ? ` · ${(state.size / 1024).toFixed(1)} KB` : ""}
      </p>

      {state && !state.available ? (
        <p className="mt-4 text-center font-mono text-[12px] text-amber-200/70">{c.unavailable}</p>
      ) : !rows.length && !summary.traces ? (
        <p className="mt-4 text-center font-mono text-[12px] text-white/40">{c.waiting}</p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px]">
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{c.recent}</p>
            <ol className="mt-1 max-h-60 space-y-1 overflow-y-auto font-mono text-[11px]">
              {rows
                .slice()
                .reverse()
                .map((r) => (
                  <li key={`${r.runId}-${r.ts}`} className="flex min-w-0 items-center gap-2 rounded bg-white/[0.02] px-2 py-1">
                    <span className="shrink-0 text-white/35 tabular-nums">{new Date(r.ts).toLocaleTimeString()}</span>
                    <span className={cn("shrink-0 rounded px-1 text-[9.5px] uppercase", r.ok ? "bg-os-emerald/10 text-os-emerald" : "bg-red-400/10 text-red-300")}>{r.ok ? c.ok : c.failed}</span>
                    {r.sample && <span className="shrink-0 rounded bg-os-cyan/10 px-1 text-[9.5px] uppercase text-os-cyan">{c.sample}</span>}
                    <span className="shrink-0 text-white/70">{isEngineKey(r.target) ? ENGINES[r.target].name : r.target}</span>
                    <span className="min-w-0 flex-1 truncate font-sans text-white/45" title={r.preview}>
                      {r.preview}
                    </span>
                    <span className="bloom-detail shrink-0 tabular-nums text-white/35">{r.ms}ms</span>
                  </li>
                ))}
            </ol>
          </div>
          <div className="bloom-detail">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{c.byEngine}</p>
            <ul className="mt-1 space-y-1.5">
              {engines.map(([k, n]) => (
                <li key={k} className="font-mono text-[10.5px]">
                  <span className="flex justify-between text-white/60">
                    <span>{isEngineKey(k) ? ENGINES[k].name : k}</span>
                    <span className="tabular-nums text-os-cyan">{n}</span>
                  </span>
                  <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <span className="block h-full rounded-full bg-os-cyan" style={{ width: `${(n / top) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Widget>
  );
}
