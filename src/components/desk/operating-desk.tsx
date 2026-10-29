"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CornerDownLeft, Loader2, Square, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { paintings } from "@/components/bloom/art/paintings";
import { ENGINES, isEngineKey, type EngineKey } from "@/components/bloom/command/engines";
import { localizeEngine, useCommandCopy } from "@/components/bloom/command/locale";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { clockShift, type ShiftMode } from "@/components/bloom/shift-plan";
import { DESK_COPY, PRESETS } from "./copy";
import { EngineRail } from "./engine-rail";
import { engineStatuses, STATUS_DOT } from "./engine-status";
import { ExecutionLog } from "./execution-log";
import { ResultCard } from "./result-card";
import { TopBar } from "./top-bar";
import { TopologyPanel } from "./topology-panel";
import { useRun } from "./use-run";
import { useTelemetry } from "./use-telemetry";

/**
 * The Sovereign Operating Desk: pick an engine, command it, and watch the multi-agent runtime execute live.
 * Left: engine rail with metric feeds. Center: command, active topology, execution log, result. Right: shift topology and run telemetry.
 */
export function OperatingDesk() {
  const { lang, dir, c: cc } = useCommandCopy();
  const c = DESK_COPY[lang];
  const [selected, setSelected] = useState<EngineKey>("sovereign");
  const [command, setCommand] = useState("");
  const [shift, setShift] = useState<ShiftMode>("prime");
  const [clock, setClock] = useState<ShiftMode | null>(null);
  const { state, run, abort } = useRun(c.networkError, c.aborted);
  const { manifest, latency, uptime, sla } = useTelemetry();
  const statuses = useMemo(() => engineStatuses(state.agents), [state.agents]);
  const running = state.status === "running";
  const elapsed = useElapsed(running, state.startedAt);

  // Engine from ?engine=, and the shift that's on the clock for this visitor, both resolved after mount.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("engine");
    if (q && isEngineKey(q)) setSelected(q);
    const m = clockShift(new Date().getHours());
    setClock(m);
    setShift(m);
  }, []);

  const select = (k: EngineKey) => {
    setSelected(k);
    const url = new URL(window.location.href);
    url.searchParams.set("engine", k);
    window.history.replaceState(null, "", url);
  };

  const execute = () => {
    const text = command.trim();
    if (text.length < 3 || running) return;
    // A command is an event: the grid surges for its duration, then returns to the shift on the clock.
    setShift("surge");
    run(selected, text, lang);
  };
  useEffect(() => {
    if (!running && clock && state.status !== "idle") setShift(clock);
  }, [running, clock, state.status]);

  const engine = localizeEngine(ENGINES[selected], lang);
  const painting = paintings[engine.painting];
  const agentList = Object.values(state.agents);
  const mode = state.mode ?? manifest?.mode ?? null;
  const model = state.model ?? manifest?.model ?? null;

  return (
    <div lang={lang} dir={dir} className="relative isolate flex min-h-dvh flex-col bg-ink font-sans text-white lg:h-dvh lg:overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgb(255_189_110/0.08),transparent_60%)]" />
      <TopBar
        c={c}
        statuses={statuses}
        selected={selected}
        onSelect={select}
        mode={mode}
        model={model}
        sla={sla}
        uptime={uptime}
        latency={latency}
        firstEvent={state.firstEventMs}
      />

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] lg:min-h-0 lg:grid-cols-[17rem_minmax(0,1fr)_19rem] xl:grid-cols-[18.5rem_minmax(0,1fr)_21rem]">
        <EngineRail c={c} lang={lang} selected={selected} onSelect={select} statuses={statuses} />

        <main style={paletteVars(PALETTES[selected])} className="relative flex min-h-0 flex-col overflow-hidden">
          {/* The selected engine's painting, far back, so each engine's desk carries its own light. */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={selected} aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 -z-10">
              <Image src={painting.src} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover opacity-[0.16]" style={{ objectPosition: painting.focus }} />
              <div className="absolute inset-0 bg-linear-to-b from-ink/60 via-ink/85 to-ink" />
            </motion.div>
          </AnimatePresence>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
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
              <Link
                href={`/command/${selected}`}
                className="flex items-center gap-1 rounded-full border border-white/12 px-3 py-1.5 text-[12px] text-white/65 transition-colors hover:border-c-edge hover:text-white focus-visible:outline-2 focus-visible:outline-c-2"
              >
                {c.guided} <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
              </Link>
            </div>

            {/* Command input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                execute();
              }}
              className="glass rounded-2xl p-3 sm:p-4"
            >
              <label htmlFor="desk-command" className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
                {c.command}
              </label>
              <textarea
                id="desk-command"
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
                placeholder={c.placeholder(engine.name)}
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/35 p-3 text-[14px] leading-relaxed text-white placeholder:text-white/30 focus:border-c-1/60 focus:outline-none"
              />
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCommand(PRESETS[lang][selected])}
                  className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11.5px] text-white/55 transition-colors hover:border-c-edge hover:text-white/90"
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
                    disabled={command.trim().length < 3}
                    className="flex items-center gap-2 rounded-full bg-linear-to-r from-c-1 to-c-2 px-5 py-2 text-[13px] font-semibold text-black shadow-[0_0_30px_-8px_var(--c-glow)] transition-opacity disabled:opacity-35"
                  >
                    {c.execute} <CornerDownLeft className="size-3.5 rtl:-scale-x-100" />
                  </button>
                )}
              </div>
            </form>

            {/* Active topology: every agent in this run, nested by who delegated to whom. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">{c.topology}</span>
              {agentList.length === 0 ? (
                <span className="text-[12px] text-white/35">{c.topologyIdle}</span>
              ) : (
                agentList.map((a) => (
                  <span
                    key={a.id}
                    style={paletteVars(PALETTES[a.engine])}
                    className="flex items-center gap-1.5 rounded-full border border-c-edge/70 bg-c-deep/70 px-2 py-0.5 font-mono text-[10.5px] text-c-2"
                  >
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

            <section aria-label={c.log} className="flex min-h-72 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-black/45 backdrop-blur-md">
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

            {state.status === "done" && <ResultCard c={c} output={state.output} />}
          </div>
        </main>

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
