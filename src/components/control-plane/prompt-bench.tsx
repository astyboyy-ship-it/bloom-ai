"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Circle, FlaskConical, Loader2, Play, Square, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandCopy } from "@/components/bloom/command/locale";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { audit, recordRun, requestHeaders, useDeskSettings } from "@/components/desk/settings";
import { PHASES, useRun } from "@/components/desk/use-run";
import { DESK_COPY } from "@/components/desk/copy";
import { readCalibration } from "@/lib/engines/calibration";
import { modelInfo } from "@/lib/engines/models";
import { useLicense } from "@/lib/license-context";
import { useLicensingCopy } from "./copy";
import { CpButton, Widget } from "./widget";

/**
 * Prompt test bench: runs a real command against one engine with its current routing (calibration), streaming
 * the three run phases, then reports mode, model, latency and tokens. Finished runs are recorded to the run
 * ledger like any other, so they feed the KPIs, the topology and the trace stream. Read-only keys are refused
 * by the server and the refusal is shown.
 */
export function PromptBench() {
  const b = useLicensingCopy().ops.bench;
  const { lang } = useCommandCopy();
  const { settings } = useDeskSettings();
  const { isUnlocked } = useLicense();
  const choices = useMemo(() => ENGINE_ORDER.filter(isUnlocked), [isUnlocked]);
  const [engine, setEngine] = useState<EngineKey | null>(null);
  const [prompt, setPrompt] = useState("");
  const { state, run, abort } = useRun(DESK_COPY[lang].networkError, DESK_COPY[lang].aborted);
  const target = engine ?? choices[0] ?? null;

  const go = () => {
    if (!target || prompt.trim().length < 3) return;
    const calibrations = Object.fromEntries(Object.entries(settings.calibrations).map(([k, v]) => [k, readCalibration(v)]));
    audit("run", `Executed ${ENGINES[target].name} from the prompt test bench: "${prompt.trim().slice(0, 90)}"`);
    run(target, prompt.trim(), lang, { headers: requestHeaders(settings), calibrations });
  };

  // Finished runs join the ledger, exactly as the run console records them.
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (!state.runId || recorded.current === state.runId || !state.engine || (state.status !== "done" && state.status !== "failed")) return;
    recorded.current = state.runId;
    const summary = (state.output as { summary?: string } | null)?.summary ?? "";
    recordRun({ runId: state.runId, at: Date.now(), kind: "engine", target: state.engine, label: ENGINES[state.engine].name, command: state.command, ok: state.status === "done", ms: state.ms ?? 0, tokens: state.usage, summary, brief: state.brief?.markdown });
  }, [state.runId, state.status, state.engine, state.output, state.command, state.ms, state.usage, state.brief]);

  const running = state.status === "running";
  const summary = (state.output as { summary?: string } | null)?.summary;
  const lastError = state.log.filter((l) => l.kind === "error").at(-1);
  const error = state.status === "failed" && lastError && "text" in lastError ? lastError.text : null;
  const tokens = state.usage.input + state.usage.output || state.liveUsage.input + state.liveUsage.output;

  return (
    <Widget icon={FlaskConical} title={b.title} sub={b.sub}>
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (running) abort();
          else go();
        }}
      >
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
            {b.engine}
            <select value={target ?? ""} onChange={(e) => setEngine(e.target.value as EngineKey)} disabled={running} className="rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[12px] normal-case tracking-normal text-white focus:outline-none">
              {choices.map((k) => (
                <option key={k} value={k} className="bg-os-panel">
                  {ENGINES[k].name} · {modelInfo(readCalibration(settings.calibrations[k]).model).label}
                </option>
              ))}
            </select>
          </label>
          <CpButton type="submit" className="ms-auto" disabled={!target || (!running && prompt.trim().length < 3)} tone={running ? "warn" : "accent"}>
            {running ? <Square className="size-3" /> : <Play className="size-3" />} {running ? b.stop : b.run}
          </CpButton>
        </div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} maxLength={4000} placeholder={b.placeholder} className="w-full resize-y rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[12.5px] text-white placeholder:text-white/30 transition-colors focus:border-os-cyan/50 focus:outline-none" />
      </form>

      {state.status === "idle" ? (
        <p className="mt-3 text-center font-mono text-[11.5px] text-white/35">{b.idle}</p>
      ) : (
        <div className="mt-3 grid gap-2">
          <ol className="grid grid-cols-3 gap-1.5">
            {PHASES.map((p) => {
              const ph = state.phases[p];
              const Icon = ph.status === "done" ? CheckCircle2 : ph.status === "active" ? Loader2 : ph.status === "failed" ? XCircle : Circle;
              return (
                <li key={p} className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10.5px] transition-colors duration-500", ph.status === "active" ? "bloom-edge-glow text-os-cyan" : ph.status === "done" ? "border-os-cyan/25 text-white/75" : ph.status === "failed" ? "border-red-400/40 text-red-300" : "border-white/[0.07] text-white/40")}>
                  <Icon className={cn("size-3.5 shrink-0", ph.status === "active" && "animate-spin")} />
                  <span className="truncate">{b.phases[p]}</span>
                  {ph.ms !== null && <span className="ms-auto tabular-nums text-white/40">{Math.round(ph.ms)}ms</span>}
                </li>
              );
            })}
          </ol>
          <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {[
              [b.mode, state.mode ?? "—"],
              [b.model, state.model ?? "—"],
              [b.latency, state.ms !== null ? `${Math.round(state.ms).toLocaleString("en-US")}ms` : running ? "…" : "—"],
              [b.tokens, tokens ? tokens.toLocaleString("en-US") : "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-white/[0.06] bg-black/30 px-2 py-1.5">
                <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">{k}</dt>
                <dd className="truncate font-mono text-[12px] tabular-nums text-white/85">{v}</dd>
              </div>
            ))}
          </dl>
          {(summary || error) && (
            <div className={cn("rounded-md border px-3 py-2 text-[12px] leading-relaxed", error ? "border-red-400/30 bg-red-400/[0.05] text-red-200" : "border-white/[0.06] bg-black/30 text-white/75")}>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">{b.output}</p>
              <p className="mt-1 whitespace-pre-wrap">{error ?? summary}</p>
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}
