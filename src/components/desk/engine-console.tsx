"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Layers3, Loader2, Lock, Square, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { paintings } from "@/components/bloom/art/paintings";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { localizeEngine, useCommandCopy } from "@/components/bloom/command/locale";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { clockShift, type ShiftMode } from "@/components/bloom/shift-plan";
import { readCalibration } from "@/lib/engines/calibration";
import { useLicense } from "@/lib/license-context";
import { useOsTelemetry } from "@/components/os/telemetry-context";
import { BriefPanel } from "./brief-panel";
import { DESK_COPY, PRESETS } from "./copy";
import { EngineDrawer } from "./engine-drawer";
import { EngineLock } from "./engine-lock";
import { EngineRail } from "./engine-rail";
import { engineStatuses, STATUS_DOT } from "./engine-status";
import { ExecutionLog } from "./execution-log";
import { HUB_COPY } from "./hub-copy";
import { NetworkView } from "./network-view";
import { can } from "./rbac";
import { ResultCard } from "./result-card";
import { RunStepper } from "./run-stepper";
import { activeMember, audit, recordRun, requestHeaders, updateSettings, useDeskSettings } from "./settings";
import { TopologyPanel } from "./topology-panel";
import { useRun } from "./use-run";

/**
 * One engine's live run console inside the Operating Desk (/desk/engines/:engine): engine rail with metric
 * feeds; command, run stages, network view, execution log and the executive output; shift topology and run
 * telemetry; and the deep drawer for the architecture. What the license and the acting member's role allow is
 * applied throughout; the run API enforces the license again on the server.
 */
export function EngineConsole({ engine: selected }: { engine: EngineKey }) {
  const { lang, c: cc } = useCommandCopy();
  const c = DESK_COPY[lang];
  const h = HUB_COPY[lang];
  const router = useRouter();
  const { settings } = useDeskSettings();
  const { isUnlocked } = useLicense();
  const member = activeMember(settings);
  const mayRun = can(member.role, "run");
  const [drawer, setDrawer] = useState<EngineKey | null>(null);
  const [command, setCommand] = useState("");
  const [shift, setShift] = useState<ShiftMode>("prime");
  const [clock, setClock] = useState<ShiftMode | null>(null);
  const { state, run, abort } = useRun(c.networkError, c.aborted);
  const { manifest } = useOsTelemetry();
  const statuses = useMemo(() => engineStatuses(state.agents), [state.agents]);
  const running = state.status === "running";
  const elapsed = useElapsed(running, state.startedAt);
  const unlocked = isUnlocked(selected);
  const commandRef = useRef<HTMLTextAreaElement>(null);

  // The shift on the clock for this visitor, resolved after mount.
  useEffect(() => setClock(clockShift(new Date().getHours())), []);

  // The shift at rest: the operator's default from App Settings, or the clock's.
  const restShift: ShiftMode | null = settings.shiftDefault === "clock" ? clock : settings.shiftDefault;
  useEffect(() => {
    if (restShift && !running) setShift(restShift);
  }, [restShift, running]);

  // When a run finishes: audit it, and keep its summary as the engine's memory for the next run.
  const settled = useRef<string | null>(null);
  useEffect(() => {
    if (!state.runId || settled.current === state.runId || (state.status !== "done" && state.status !== "failed") || !state.engine) return;
    settled.current = state.runId;
    const name = ENGINES[state.engine].name;
    const summary = (state.output as { summary?: string } | null)?.summary;
    recordRun({ runId: state.runId, at: Date.now(), kind: "engine", target: state.engine, label: name, command: state.command, ok: state.status === "done", ms: state.ms ?? 0, tokens: state.usage, summary: summary ?? "" });
    if (state.status === "failed") return audit("run", `${name} run ${state.runId} failed`);
    audit("run", `${name} run ${state.runId} completed in ${((state.ms ?? 0) / 1000).toFixed(1)}s`);
    const engine = state.engine;
    if (summary)
      updateSettings((s) => {
        const prev = s.calibrations[engine] ?? {};
        const memory = [...(prev.memory ?? []), summary.slice(0, 800)].slice(-10);
        return { calibrations: { ...s.calibrations, [engine]: { ...prev, memory } } };
      });
  }, [state.runId, state.status, state.engine, state.ms, state.output, state.command, state.usage]);

  const select = (k: EngineKey) => router.push(`/desk/engines/${k}`);
  /** Network nodes open an unlocked engine's deep drawer; locked ones go to their page (and its tier lock). */
  const inspect = (k: EngineKey) => (isUnlocked(k) ? setDrawer(k) : select(k));

  const execute = () => {
    const text = command.trim();
    if (text.length < 3 || running || !mayRun || !unlocked) return;
    // A command is an event: the grid surges for its duration, then returns to the shift at rest.
    if (settings.surgeOnRun) setShift("surge");
    // Calibrations go out as the runtime will read them, so stale or hand-edited storage can't fail the request.
    const calibrations = Object.fromEntries(Object.entries(settings.calibrations).map(([k, v]) => [k, readCalibration(v)]));
    audit("run", `Executed ${ENGINES[selected].name}: "${text.slice(0, 90)}${text.length > 90 ? "…" : ""}"`);
    run(selected, text, lang, { headers: requestHeaders(settings), calibrations });
  };

  const engine = localizeEngine(ENGINES[selected], lang);
  const painting = paintings[engine.painting];
  const agentList = Object.values(state.agents);
  const mode = state.mode ?? manifest?.mode ?? null;

  return (
    <div className="relative isolate flex flex-1 flex-col">
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)_19rem] xl:grid-cols-[18.5rem_minmax(0,1fr)_21rem]">
        <EngineRail c={c} lang={lang} selected={selected} onSelect={select} statuses={statuses} />

        <section aria-label={`${ENGINES[selected].name} console`} style={paletteVars(PALETTES[selected])} className="relative flex min-h-0 flex-col overflow-hidden">
          {/* The selected engine's painting, far back, so each engine's desk carries its own light. */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={selected} aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 -z-10">
              <Image src={painting.src} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover opacity-[0.16]" style={{ objectPosition: painting.focus }} />
              <div className="absolute inset-0 bg-linear-to-b from-ink/60 via-ink/85 to-ink" />
            </motion.div>
          </AnimatePresence>

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-c-2/90">
                  {cc.engineNo} {engine.index}
                  {engine.badge && <span className="rounded-full border border-c-edge/70 px-1.5 py-px text-[9px] tracking-[0.16em]">{engine.badge}</span>}
                  {manifest && <span className="font-normal normal-case tracking-normal text-white/35">{manifest.engines.find((x) => x.key === selected)?.codename}</span>}
                </p>
                <h1 className="mt-1 font-logo text-[38px] font-medium leading-none tracking-[-0.04em] sm:text-[48px]">{engine.name}</h1>
                <p className="mt-1.5 text-[14px] text-white/60">{engine.role}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {unlocked && (
                  <button
                    type="button"
                    onClick={() => setDrawer(selected)}
                    className="flex items-center gap-1.5 rounded-full border border-c-edge/60 bg-c-deep/50 px-3 py-1.5 text-[12px] text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-c-2"
                  >
                    <Layers3 className="size-3.5" /> Open architecture
                  </button>
                )}
              </div>
            </div>

            {/* Command input: behind the tier lock when the license doesn't cover this engine. */}
            <EngineLock engine={selected} lang={lang} className="rounded-2xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  execute();
                }}
                className="os-panel rounded-2xl p-3 sm:p-4"
              >
                <label htmlFor="desk-command" className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
                  {c.command}
                  {!mayRun && (
                    <span className="flex items-center gap-1 normal-case tracking-normal text-white/50">
                      <Lock className="size-3" /> {member.name} is a Viewer: running engines needs Operator or above.
                    </span>
                  )}
                </label>
                <textarea
                  id="desk-command"
                  ref={commandRef}
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      execute();
                    }
                  }}
                  rows={3}
                  maxLength={4000}
                  disabled={!mayRun}
                  placeholder={c.placeholder(engine.name)}
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/35 p-3 text-[14px] leading-relaxed text-white placeholder:text-white/30 focus:border-c-1/60 focus:outline-none disabled:opacity-50"
                />
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!mayRun}
                    onClick={() => setCommand(PRESETS[lang][selected])}
                    className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11.5px] text-white/55 transition-colors hover:border-c-edge hover:text-white/90 disabled:opacity-40"
                  >
                    <Zap className="size-3 shrink-0 text-c-2" />
                    <span className="truncate">{c.presets}</span>
                  </button>
                  <span className="ms-auto hidden font-mono text-[10px] text-white/30 sm:inline">{c.shortcut}</span>
                  {running ? (
                    <button type="button" onClick={abort} className="flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-[13px] font-medium text-red-100 transition-colors hover:bg-red-500/20">
                      <Square className="size-3.5" /> {c.abort}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={command.trim().length < 3 || !mayRun}
                      className="flex items-center gap-2 rounded-full bg-linear-to-r from-c-1 to-c-2 px-5 py-2 text-[13px] font-semibold text-black shadow-[0_0_30px_-8px_var(--c-glow)] transition-opacity disabled:opacity-35"
                    >
                      {c.execute} <CornerDownLeft className="size-3.5 rtl:-scale-x-100" />
                    </button>
                  )}
                </div>
              </form>
            </EngineLock>

            {state.status !== "idle" && state.engine && <RunStepper phases={state.phases} now={state.startedAt + elapsed} />}

            <NetworkView unlocked={isUnlocked} label={h.network} hint={h.networkHint} engines={manifest?.engines} agents={state.agents} statuses={statuses} selected={selected} onSelect={inspect} />

            {/* Active topology: every agent in this run, nested by who delegated to whom. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">{c.topology}</span>
              {agentList.length === 0 ? (
                <span className="text-[12px] text-white/35">{c.topologyIdle}</span>
              ) : (
                agentList.map((a) => (
                  <span key={a.id} style={paletteVars(PALETTES[a.engine])} className="flex items-center gap-1.5 rounded-full border border-c-edge/70 bg-c-deep/70 px-2 py-0.5 font-mono text-[10.5px] text-c-2">
                    {a.depth > 0 && <span className="text-white/30">{"↳".repeat(a.depth)}</span>}
                    <span className={cn("size-1.5 rounded-full", STATUS_DOT[a.status])} />
                    {ENGINES[a.engine].name}
                  </span>
                ))
              )}
              {running && (
                <span className="ms-auto flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-c-2">
                  <Loader2 className="size-3.5 animate-spin" /> {c.executing} · {(elapsed / 1000).toFixed(1)}s
                </span>
              )}
            </div>

            <section aria-label={c.log} className="demo-hide flex min-h-72 flex-1 flex-col overflow-hidden rounded-2xl border border-os-line bg-os-panel/70 backdrop-blur-md">
              <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">{c.log}</p>
                {state.engine && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                    {state.status === "failed" ? <span className="text-red-300">{c.runFailed}</span> : c.status[state.status === "idle" ? "idle" : state.status]}
                  </span>
                )}
              </header>
              <ExecutionLog c={c} log={state.log} agents={state.agents} />
            </section>

            {state.status === "done" && state.engine && (state.brief ? <BriefPanel key={state.runId} engine={state.engine} runId={state.runId} output={state.output} brief={state.brief} /> : <ResultCard c={c} output={state.output} />)}
          </div>
        </section>

        <TopologyPanel
          c={c}
          shift={shift}
          clock={clock}
          onShift={setShift}
          statuses={statuses}
          running={running}
          stats={{ ms: running ? elapsed : state.ms, agents: agentList.length, tools: state.toolCalls, usage: state.usage, mode }}
        />
      </div>

      <EngineDrawer
        engine={drawer}
        lang={lang}
        onClose={() => setDrawer(null)}
        onCommand={(k) => {
          setDrawer(null);
          if (k === selected) setTimeout(() => commandRef.current?.focus(), 50);
          else select(k);
        }}
        onCalibrate={(k) => {
          setDrawer(null);
          router.push(`/desk/engines/${k}?tab=calibration`);
        }}
      />
    </div>
  );
}

/** Milliseconds since `since`, ticking while `on`. */
function useElapsed(on: boolean, since: number) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!on) return;
    const tick = () => setNow(Date.now() - since);
    tick();
    const t = setInterval(tick, 100);
    return () => clearInterval(t);
  }, [on, since]);
  return now;
}
