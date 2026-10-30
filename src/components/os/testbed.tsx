"use client";

import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, Loader2, Lock, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { useCommandCopy } from "@/components/bloom/command/locale";
import { BriefPanel } from "@/components/desk/brief-panel";
import { DESK_COPY } from "@/components/desk/copy";
import { ExecutionLog } from "@/components/desk/execution-log";
import { fmtMs } from "@/components/desk/format";
import { can } from "@/components/desk/rbac";
import { RunStepper } from "@/components/desk/run-stepper";
import { activeMember, audit, recordRun, requestHeaders, useDeskSettings, type ArchitectureRules } from "@/components/desk/settings";
import type { useRun } from "@/components/desk/use-run";
import { costOf, modelInfo, MODEL_IDS, type ModelId } from "@/lib/engines/models";
import { rateWindow, rulesToCalibrations } from "./architecture-rules";

type Run = ReturnType<typeof useRun>;
export type StackSpec = { id: string; label: string; engines: EngineKey[] };

/**
 * The Autonomous Simulation Testbed for an architecture or a builder pipeline: one command through the whole
 * stack, with live stages, token and latency meters, an estimated cost on the governed model, the log, and the
 * executive brief with JSON/Markdown export. Runs are rate-limited by the product's own governance.
 */
export function Testbed({ r, spec, rules, sample, kind }: { r: Run; spec: StackSpec; rules: ArchitectureRules; sample: string; kind: "architecture" | "pipeline" }) {
  const { lang } = useCommandCopy();
  const c = DESK_COPY[lang];
  const { settings } = useDeskSettings();
  const [command, setCommand] = useState("");
  const { state, runPipeline, abort } = r;
  const running = state.status === "running";
  const mayRun = can(activeMember(settings).role, "run");
  const quota = rateWindow(settings.runs, spec.id, rules);
  const model: ModelId = (MODEL_IDS as string[]).includes(rules.model) ? (rules.model as ModelId) : "claude-opus-5-5";
  const elapsed = useTicker(running, state.startedAt);
  const usage = running ? state.liveUsage : state.usage.input || state.usage.output ? state.usage : state.liveUsage;

  // Finished runs are recorded once in the workspace history and the audit log.
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (!state.runId || recorded.current === state.runId || (state.status !== "done" && state.status !== "failed")) return;
    recorded.current = state.runId;
    const summary = (state.output as { summary?: string } | null)?.summary ?? "";
    recordRun({ runId: state.runId, at: Date.now(), kind, target: spec.id, label: spec.label, command: state.command, ok: state.status === "done", ms: state.ms ?? 0, tokens: state.usage, summary });
    audit("run", `${spec.label} run ${state.runId} ${state.status === "done" ? `completed in ${((state.ms ?? 0) / 1000).toFixed(1)}s` : "failed"}`);
  }, [state.runId, state.status, state.output, state.command, state.ms, state.usage, kind, spec.id, spec.label]);

  const execute = () => {
    const text = command.trim();
    if (text.length < 3 || running || !mayRun || quota.blocked) return;
    audit("run", `Executed ${spec.label}: "${text.slice(0, 90)}${text.length > 90 ? "…" : ""}"`);
    runPipeline(spec, text, lang, { headers: requestHeaders(settings), calibrations: rulesToCalibrations(rules, spec.engines, settings.calibrations) });
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          execute();
        }}
        className="os-panel rounded-2xl p-3"
      >
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              execute();
            }
          }}
          rows={3}
          disabled={!mayRun}
          maxLength={3500}
          aria-label={`Command for ${spec.label}`}
          placeholder={`Command the ${spec.label}: ${spec.engines.map((k) => ENGINES[k].name).join(" → ")}`}
          className="w-full resize-none rounded-xl border border-os-line bg-black/40 p-3 text-[14px] leading-relaxed text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none disabled:opacity-50"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" disabled={!mayRun} onClick={() => setCommand(sample)} className="rounded-full border border-os-line px-3 py-1 text-[11.5px] text-white/60 hover:text-white disabled:opacity-40">
            Load sample
          </button>
          <span className={cn("font-mono text-[10.5px]", quota.blocked ? "text-red-300" : "text-white/40")}>
            {quota.used}/{rules.runsPerHour} runs this hour
          </span>
          {!mayRun && (
            <span className="flex items-center gap-1 text-[11.5px] text-white/50">
              <Lock className="size-3" /> Your role can&apos;t run architectures.
            </span>
          )}
          {running ? (
            <button type="button" onClick={abort} className="ms-auto flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-[13px] text-red-100">
              <Square className="size-3.5" /> Abort
            </button>
          ) : (
            <button
              type="submit"
              disabled={command.trim().length < 3 || !mayRun || quota.blocked}
              title={quota.blocked ? "This product's hourly run limit is reached (Rules & Governance)." : undefined}
              className="ms-auto flex items-center gap-2 rounded-full bg-os-cyan px-5 py-2 text-[13px] font-semibold text-black shadow-[0_0_30px_-8px_rgb(0_240_255/0.8)] disabled:opacity-35"
            >
              Run simulation <CornerDownLeft className="size-3.5 rtl:-scale-x-100" />
            </button>
          )}
        </div>
      </form>

      {state.status !== "idle" && (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Elapsed", running ? fmtMs(elapsed) : state.ms !== null ? fmtMs(state.ms) : "—"],
              [state.mode === "simulation" ? "Tokens (est.)" : "Tokens", `${usage.input.toLocaleString("en-US")} / ${usage.output.toLocaleString("en-US")}`],
              ["Est. cost", `$${costOf(model, usage).toFixed(4)}`],
              ["Model", `${modelInfo(model).label}${state.mode === "simulation" ? " (sim)" : ""}`],
            ].map(([k, v]) => (
              <div key={k} className="os-panel rounded-xl px-3 py-2">
                <dt className="os-label">{k}</dt>
                <dd className="mt-0.5 truncate font-mono text-[14px] tabular-nums text-os-cyan">{v}</dd>
              </div>
            ))}
          </dl>
          <RunStepper phases={state.phases} now={state.startedAt + elapsed} />
          <section className="demo-hide os-panel flex max-h-80 min-h-40 flex-col overflow-hidden rounded-2xl">
            <p className="os-label border-b border-os-line px-4 py-2">Execution log {running && <Loader2 className="ms-2 inline size-3 animate-spin text-os-cyan" />}</p>
            <ExecutionLog c={c} log={state.log} agents={state.agents} />
          </section>
          {state.status === "done" && state.engine && state.brief && <BriefPanel key={state.runId} engine={state.engine} runId={state.runId} output={state.output} brief={state.brief} />}
        </>
      )}
    </div>
  );
}

function useTicker(on: boolean, since: number) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now() - since), 100);
    return () => clearInterval(t);
  }, [on, since]);
  return now;
}
