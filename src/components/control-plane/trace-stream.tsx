"use client";

import { useEffect, useRef, useState } from "react";
import { Braces, Pause, Play, ScrollText, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, isEngineKey } from "@/components/bloom/command/engines";
import { MODELS } from "@/lib/engines/models";
import type { DatasetsResponse } from "@/lib/datasets/summary";
import { useLicensingCopy } from "./copy";
import { CpButton, Widget } from "./widget";
import { LiveDot } from "./ops-ui";

type Row = { id: string; at: number; source: "real" | "sim"; agent: string; span: string; status: "ok" | "error" | "retry"; ms: number; tokens: number; payload: unknown };

const KEEP = 80;
const SPANS = ["model.response", "tool.call", "tool.result", "delegate", "policy.check", "memory.write"] as const;
const AGENTS = ["Usnavi", "Lil API", "Vijay", ...ENGINE_ORDER.map((k) => ENGINES[k].name)];
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");

/** A simulated production payload. Its JSON says so itself (`simulated: true`), so the label survives copy-paste. */
function simulatedRow(): Row {
  const span = pick(SPANS);
  const model = pick(MODELS);
  const ms = Math.round(span === "model.response" ? 380 + Math.random() * 2600 : 12 + Math.random() * 420);
  const tokens = span === "model.response" ? Math.round(300 + Math.random() * 3800) : 0;
  const r = Math.random();
  const status = r < 0.9 ? "ok" : r < 0.97 ? "retry" : "error";
  const agent = pick(AGENTS);
  const traceId = `tr_${hex(16)}`;
  return {
    id: traceId,
    at: Date.now(),
    source: "sim",
    agent,
    span,
    status,
    ms,
    tokens,
    payload: {
      simulated: true,
      traceId,
      spanId: `sp_${hex(8)}`,
      agent,
      span,
      model: span === "model.response" ? model.id : undefined,
      latencyMs: ms,
      usage: tokens ? { input: Math.round(tokens * 0.62), output: Math.round(tokens * 0.38) } : undefined,
      status,
      attributes: span === "tool.call" ? { tool: pick(["crm.lookup", "ledger.reconcile", "docs.search", "risk.check"]), args: { limit: 25, region: pick(["us-east", "eu-west", "ap-south"]) } } : span === "policy.check" ? { rule: pick(["spend.threshold", "pii.redaction", "approval.required"]), result: status === "ok" ? "pass" : "hold" } : undefined,
    },
  };
}

/**
 * Live trace stream: real run traces polled from the dataset pipeline (the same store the dataset monitor tails),
 * interleaved with simulated production payloads. Every row is tagged real or sim; selecting one opens its JSON
 * in the inspector drawer. New rows flash in the tier accent.
 */
export function TraceStream() {
  const o = useLicensingCopy().ops;
  const t = o.trace;
  const [rows, setRows] = useState<Row[]>([]);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState<Row | null>(null);
  const cursor = useRef(0);

  // Simulated payloads.
  useEffect(() => {
    if (paused) return;
    setRows((r) => (r.length ? r : Array.from({ length: 8 }, simulatedRow)));
    const id = setInterval(() => setRows((r) => [simulatedRow(), ...r].slice(0, KEEP)), 1600);
    return () => clearInterval(id);
  }, [paused]);

  // Real traces from the dataset pipeline.
  useEffect(() => {
    if (paused) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/control-plane/datasets?from=${cursor.current}`, { cache: "no-store" });
        if (!res.ok || !alive) return;
        const d = (await res.json()) as DatasetsResponse;
        cursor.current = d.next;
        if (!d.rows.length) return;
        const real: Row[] = d.rows.map((r) => ({
          id: `${r.runId}-${r.ts}`,
          at: Date.parse(r.ts),
          source: "real",
          agent: isEngineKey(r.target) ? ENGINES[r.target].name : r.target,
          span: r.kind === "pipeline" ? "pipeline.run" : "engine.run",
          status: r.ok ? "ok" : "error",
          ms: r.ms,
          tokens: (r.tokens?.input ?? 0) + (r.tokens?.output ?? 0),
          payload: r,
        }));
        if (alive) setRows((cur) => [...real.reverse(), ...cur.filter((x) => !real.some((y) => y.id === x.id))].slice(0, KEEP));
      } catch {
        // Offline for a moment: the next poll catches up from the same cursor.
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [paused]);

  return (
    <Widget
      icon={ScrollText}
      title={t.title}
      sub={t.sub}
      actions={
        <>
          <span className={cn("flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]", paused ? "text-white/40" : "text-os-cyan")}>
            <LiveDot on={!paused} /> {paused ? t.paused : t.live}
          </span>
          <CpButton tone="quiet" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />} {paused ? t.resume : t.pause}
          </CpButton>
        </>
      }
    >
      <ol className="max-h-[380px] space-y-0.5 overflow-y-auto pe-1 font-mono text-[11px]" dir="ltr">
        {rows.map((r) => (
          <li key={r.id} style={{ animation: "bloom-row-in 900ms ease-out" }}>
            <button type="button" onClick={() => setOpen(r)} className={cn("grid w-full grid-cols-[4.6rem_2.6rem_minmax(0,7rem)_minmax(0,1fr)_3.6rem_3.6rem] items-center gap-2 rounded px-2 py-1 text-start transition-colors hover:bg-white/[0.05]", open?.id === r.id && "bg-os-cyan/[0.08]")}>
              <span className="tabular-nums text-white/35">{new Date(r.at).toLocaleTimeString()}</span>
              <span className={cn("rounded px-1 text-center text-[9px] uppercase", r.source === "real" ? "bg-os-emerald/12 text-os-emerald" : "bg-amber-300/10 text-amber-200/90")}>{r.source === "real" ? t.real : t.sim}</span>
              <span className="truncate text-white/80">{r.agent}</span>
              <span className="truncate text-white/55">{r.span}</span>
              <span className={cn("text-end tabular-nums", r.status === "ok" ? "text-white/60" : r.status === "retry" ? "text-amber-300" : "text-red-300")}>{r.ms}ms</span>
              <span className="text-end tabular-nums text-os-cyan/80">{r.tokens ? r.tokens.toLocaleString("en-US") : "—"}</span>
            </button>
          </li>
        ))}
      </ol>

      <AnimatePresence>
        {open && (
          <motion.aside
            key="drawer"
            role="dialog"
            aria-label={t.inspect}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="bloom-glass bloom-noise fixed inset-y-0 end-0 z-50 flex w-[min(480px,100vw)] flex-col rounded-s-2xl p-4"
          >
            <header className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-os-cyan">
                <Braces className="size-4" /> {t.inspect}
              </h3>
              <button type="button" onClick={() => setOpen(null)} aria-label={t.close} className="rounded p-1 text-white/50 transition-colors hover:text-white">
                <X className="size-4" />
              </button>
            </header>
            <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-white/60">
              <span className={cn("rounded px-1.5 text-[9.5px] uppercase", open.source === "real" ? "bg-os-emerald/12 text-os-emerald" : "bg-amber-300/10 text-amber-200/90")}>{open.source === "real" ? t.real : t.sim}</span>
              {open.agent} · {open.span} · {open.ms}ms
            </p>
            <pre className="mt-3 flex-1 overflow-auto rounded-lg border border-white/[0.06] bg-black/50 p-3 text-[11.5px] leading-relaxed text-os-cyan/90" dir="ltr">
              {JSON.stringify(open.payload, null, 2)}
            </pre>
          </motion.aside>
        )}
      </AnimatePresence>
    </Widget>
  );
}
