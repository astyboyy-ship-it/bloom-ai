"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Loader2, Square, X } from "lucide-react";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import type { Lang } from "@/components/bloom/i18n";
import { readCalibration } from "@/lib/engines/calibration";
import { BriefPanel } from "./brief-panel";
import { DESK_COPY } from "./copy";
import { ExecutionLog } from "./execution-log";
import { RunStepper } from "./run-stepper";
import { audit, recordRun, requestHeaders, useDeskSettings } from "./settings";
import { useRun } from "./use-run";

/** A slide-over run console for the Command Center: one command, its live stages and log, and the brief. */
export function RunConsoleDrawer({ request, lang, onClose }: { request: { engine: EngineKey; command: string; id: number } | null; lang: Lang; onClose: () => void }) {
  const c = DESK_COPY[lang];
  const { settings } = useDeskSettings();
  const { state, run, abort } = useRun(c.networkError, c.aborted);
  const started = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Each new request starts exactly one run.
  useEffect(() => {
    if (!request || started.current === request.id) return;
    started.current = request.id;
    const s = settingsRef.current;
    const calibrations = Object.fromEntries(Object.entries(s.calibrations).map(([k, v]) => [k, readCalibration(v)]));
    audit("run", `Executed ${ENGINES[request.engine].name} from the Command Center: "${request.command.slice(0, 90)}"`);
    run(request.engine, request.command, lang, { headers: requestHeaders(s), calibrations });
  }, [request, run, lang]);

  // Finished runs join the workspace history.
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (!state.runId || recorded.current === state.runId || !state.engine || (state.status !== "done" && state.status !== "failed")) return;
    recorded.current = state.runId;
    const summary = (state.output as { summary?: string } | null)?.summary ?? "";
    recordRun({ runId: state.runId, at: Date.now(), kind: "engine", target: state.engine, label: ENGINES[state.engine].name, command: state.command, ok: state.status === "done", ms: state.ms ?? 0, tokens: state.usage, summary });
  }, [state.runId, state.status, state.engine, state.output, state.command, state.ms, state.usage]);

  const close = () => {
    if (state.status === "running") abort();
    onClose();
  };

  return (
    <AnimatePresence>
      {request && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.aside
            key="console"
            role="dialog"
            aria-modal="true"
            aria-label={`${ENGINES[request.engine].name} run`}
            style={paletteVars(PALETTES[request.engine])}
            className="fixed inset-y-0 end-0 z-50 flex w-full max-w-3xl flex-col border-s border-c-edge/50 bg-ink/95 backdrop-blur-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-c-2/90">Run console · Engine Nº {ENGINES[request.engine].index}</p>
                <h2 className="mt-1 font-logo text-[28px] font-medium leading-none tracking-[-0.04em]">{ENGINES[request.engine].name}</h2>
                <p dir="auto" className="mt-2 line-clamp-2 text-[12.5px] text-white/55">{request.command}</p>
              </div>
              <div className="flex items-center gap-2">
                {state.status === "running" ? (
                  <button type="button" onClick={abort} className="flex items-center gap-1.5 rounded-full border border-red-400/40 px-3 py-1.5 text-[12px] text-red-100 hover:bg-red-500/10">
                    <Square className="size-3" /> {c.abort}
                  </button>
                ) : (
                  <Link href={`/desk/engines/${request.engine}`} className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/70 hover:text-white">
                    Open in desk <ArrowUpRight className="size-3.5" />
                  </Link>
                )}
                <button type="button" onClick={close} aria-label="Close" className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white">
                  <X className="size-5" />
                </button>
              </div>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {state.engine ? <RunStepper phases={state.phases} now={Date.now()} /> : <Loader2 className="size-5 animate-spin text-c-2" />}
              <section className="demo-hide flex max-h-80 min-h-48 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-black/45">
                <ExecutionLog c={c} log={state.log} agents={state.agents} />
              </section>
              {state.status === "done" && state.engine && state.brief && <BriefPanel key={state.runId} engine={state.engine} runId={state.runId} output={state.output} brief={state.brief} />}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
