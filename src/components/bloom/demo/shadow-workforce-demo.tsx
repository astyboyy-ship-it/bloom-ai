"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightLeft, Check, FileText, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AGENTS, getAgent, type AgentId } from "@/lib/shadow-workforce/agents";
import type { Deliverable, MorningBrief } from "@/lib/shadow-workforce/brief";
import { DemoShell } from "./shared/demo-shell";
import { clock, fmt, rng, useInterval } from "./shared/sim";
import { Chip, DemoSection, LiveLog, Meter, Panel, ProcessDeepDive, ShiftSchedule, Stat, type LogEntry } from "./shared/ui";

const NIGHT_MINUTES = 480; // 22:00 → 06:00
const SIM_MINUTES_PER_TICK = 2;
const TICK_MS = 500;
const MORNING_HOLD_MS = 9000;

type AgentState = { taskIdx: number; progress: number; done: number; lines: string[] };

const simTime = (minute: number) => {
  const total = (22 * 60 + minute) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const freshAgents = (): Record<AgentId, AgentState> =>
  Object.fromEntries(
    AGENTS.map((a, i) => [a.id, { taskIdx: i % a.tasks.length, progress: 0, done: 0, lines: [`22:00 · started: ${a.tasks[i % a.tasks.length].title}`] }]),
  ) as Record<AgentId, AgentState>;

export function ShadowWorkforceDemo() {
  const [minute, setMinute] = useState(0);
  const [agents, setAgents] = useState(freshAgents);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [handoffs, setHandoffs] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [morning, setMorning] = useState(false);
  const [nights, setNights] = useState(0);
  const r = useRef(rng(Date.now() % 7919));
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const compile = async (items = deliverables, h = handoffs) => {
    setCompiling(true);
    try {
      const res = await fetch("/api/shadow-workforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverables: items.slice(-500), handoffs: h }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Brief compiler unavailable.");
      setBrief(json as MorningBrief);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Brief compiler unavailable.");
    } finally {
      setCompiling(false);
    }
  };

  useInterval(() => {
    const rand = r.current;
    const nextMinute = Math.min(NIGHT_MINUTES, minute + SIM_MINUTES_PER_TICK);
    const at = simTime(nextMinute);
    const newDeliverables: Deliverable[] = [];
    const newLog: LogEntry[] = [];
    let newHandoffs = 0;

    const next = { ...agents };
    for (const a of AGENTS) {
      const s = agents[a.id];
      const progress = s.progress + a.speed * (0.6 + rand() * 0.8);
      if (progress < 100) {
        next[a.id] = { ...s, progress };
        continue;
      }
      const task = a.tasks[s.taskIdx];
      const nextIdx = (s.taskIdx + 1) % a.tasks.length;
      newDeliverables.push({ agentId: a.id, title: task.title, output: task.output, at, humanMinutes: task.humanMinutes });
      newLog.push({ id: `${a.id}-${nextMinute}-${s.done}`, time: at, tone: "gold", text: `${a.name} ✓ ${task.output}` });
      const lines = [`${at} · ✓ ${task.output}`, `${at} · started: ${a.tasks[nextIdx].title}`];
      if (task.handoff) {
        newHandoffs += 1;
        const to = getAgent(task.handoff);
        newLog.push({ id: `${a.id}-h-${nextMinute}-${s.done}`, time: at, tone: "cyan", text: `Handoff · ${a.name} → ${to.name}` });
        lines.push(`${at} · ⇄ handed off to ${to.name}`);
      }
      next[a.id] = { taskIdx: nextIdx, progress: progress - 100, done: s.done + 1, lines: [...lines.reverse(), ...s.lines].slice(0, 3) };
    }

    setMinute(nextMinute);
    setAgents(next);
    if (newDeliverables.length) setDeliverables((d) => [...d, ...newDeliverables]);
    if (newHandoffs) setHandoffs((h) => h + newHandoffs);
    if (newLog.length) setLog((l) => [...newLog.reverse(), ...l].slice(0, 40));

    if (nextMinute >= NIGHT_MINUTES) {
      const all = [...deliverables, ...newDeliverables];
      setMorning(true);
      setNights((n) => n + 1);
      setLog((l) => [{ id: `morning-${Date.now()}`, time: "06:00", tone: "cyan" as const, text: `Night shift complete: ${all.length} deliverables, compiling the morning brief` }, ...l].slice(0, 40));
      compile(all, handoffs + newHandoffs);
      resetTimer.current = setTimeout(() => {
        setMinute(0);
        setAgents(freshAgents());
        setDeliverables([]);
        setHandoffs(0);
        setMorning(false);
      }, MORNING_HOLD_MS);
    }
  }, morning ? null : TICK_MS);

  const hoursSaved = deliverables.reduce((s, d) => s + d.humanMinutes, 0) / 60;
  const nightPct = (minute / NIGHT_MINUTES) * 100;

  return (
    <DemoShell
      slug="workforce"
      kicker="The 24/7 Autonomous Operating System"
      title="Shadow Workforce Night Console"
      pulse={morning}
      chips={
        <>
          <Chip>{morning ? "Morning brief ready" : `Night shift · ${simTime(minute)}`}</Chip>
          <Chip tone="cyan">Simulated agents · live brief compiler API</Chip>
        </>
      }
      actions={
        <button
          type="button"
          onClick={() => compile()}
          disabled={compiling || !deliverables.length}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f3e2b8] px-4 text-[13px] font-semibold text-[#1a0f05] shadow-[0_0_40px_-10px_rgb(243_212_143/0.8)] disabled:opacity-50"
        >
          {compiling ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Compile morning brief now
        </button>
      }
    >
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Night clock" value={simTime(minute)} sub="1 s = 4 min" accent />
        <Stat label="Deliverables" value={fmt(deliverables.length)} sub="shipped tonight" />
        <Stat label="Human hours saved" value={hoursSaved.toFixed(1)} sub="vs. doing it by hand" />
        <Stat label="Agent handoffs" value={fmt(handoffs)} sub="work passed between agents" />
        <Stat label="Agents active" value={`${morning ? 0 : AGENTS.length}/${AGENTS.length}`} sub="in parallel" />
        <Stat label="Nights completed" value={fmt(nights)} sub="this session" />
      </div>

      {/* Night timeline */}
      <div className="glass mt-6 rounded-[24px] px-5 py-4">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
          <span className="flex items-center gap-1.5">
            <Moon className="size-3.5 text-[#b49bff]" /> 22:00
          </span>
          <span>Intake & Extraction · Build & Reconcile · Distribute & Brief</span>
          <span className="flex items-center gap-1.5">
            06:00 <Sun className="size-3.5 text-[#f3d48f]" />
          </span>
        </div>
        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#3a2a7a] via-[#b49bff] to-[#f3d48f] transition-[width] duration-500" style={{ width: `${nightPct}%` }} />
          {[33.33, 66.66].map((m) => (
            <span key={m} className="absolute inset-y-0 w-px bg-white/30" style={{ left: `${m}%` }} />
          ))}
        </div>
      </div>

      {/* Agent swarm */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {AGENTS.map((a) => {
          const s = agents[a.id];
          return (
            <section key={a.id} className="glass flex min-w-0 flex-col rounded-[24px] p-5">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  {!morning && <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: a.color }} />}
                  <span className="relative size-2.5 rounded-full" style={{ background: a.color }} />
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">{morning ? "Shift complete" : "Running"}</span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-light leading-tight text-white">{a.name}</h3>
              <p className="text-[12px] text-white/45">{a.role}</p>
              <p className="mt-4 min-h-10 text-[13px] leading-snug text-white/80">{a.tasks[s.taskIdx].title}</p>
              <Meter value={morning ? 100 : s.progress} className="mt-3" />
              <div className="mt-2 flex justify-between font-mono text-[10px] text-white/45">
                <span>{fmt(s.done)} done</span>
                <span>{Math.round(morning ? 100 : s.progress)}%</span>
              </div>
              <ol className="mt-4 space-y-1 border-t border-white/10 pt-3 font-mono text-[10px] leading-relaxed text-white/50">
                {s.lines.map((l, i) => (
                  <li key={`${l}-${i}`} className={cn("truncate", i === 0 && "text-white/75")} title={l}>
                    {l}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-7" kicker="Night shift log" title="Delivered while you sleep">
          <ol className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {[...deliverables].reverse().slice(0, 30).map((d, i) => {
                const agent = getAgent(d.agentId);
                return (
                  <motion.li
                    key={`${d.agentId}-${d.at}-${deliverables.length - i}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-ink/40 px-3 py-2"
                  >
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color: agent.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2 text-[13px]">
                        <span className="text-white/85">{d.output}</span>
                        <span className="shrink-0 font-mono text-[10px] text-white/35">{d.at}</span>
                      </span>
                      <span className="block truncate font-mono text-[10px] text-white/40">
                        {agent.name} · saved ~{Math.round(d.humanMinutes / 60 * 10) / 10} h
                      </span>
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {!deliverables.length && <li className="text-[13px] text-white/40">The agents are mid-task. The first deliverables land in a few seconds.</li>}
          </ol>
        </Panel>

        <Panel
          className="xl:col-span-5"
          kicker="Morning brief"
          title={brief ? "Good morning." : "Compiled at 06:00"}
          right={compiling ? <Loader2 className="size-4 animate-spin text-[#8ff0ff]" /> : undefined}
        >
          {brief ? (
            <div className="space-y-4">
              <p className="font-display text-xl italic leading-snug text-white/90">{brief.headline}</p>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc777]">Needs you first</p>
                <ul className="mt-2 space-y-1.5">
                  {brief.firstThing.map((f) => (
                    <li key={f} className="text-[13px] text-white/80">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="space-y-3 border-t border-white/10 pt-4">
                {brief.sections.map((s) => (
                  <li key={s.agentId}>
                    <p className="flex justify-between text-[13px]">
                      <span className="text-white/85">{s.agent}</span>
                      <span className="font-mono text-[11px] text-white/45">{s.count} shipped</span>
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-white/45" title={s.highlights.join(" · ")}>
                      {s.highlights[s.highlights.length - 1]}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-1.5 font-mono text-[10px] text-white/35">
                <ArrowRightLeft className="size-3" /> {brief.totals.handoffs} handoffs · {brief.totals.hoursSaved} h saved · {clock(new Date(brief.generatedAt))}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-white/45">
              At 06:00 the swarm hands its work to /api/shadow-workforce, which compiles the brief you read first thing. Compile one early from the button above.
            </p>
          )}
        </Panel>
      </div>

      <DemoSection eyebrow="The process" title="Five agents," accent="one synchronized night.">
        <ProcessDeepDive
          steps={[
            {
              title: "Environmental Perception",
              body: "Inboxes, repos, ticket queues, ledgers and content calendars are watched all night. Each agent picks up exactly the work that appeared since you logged off.",
              stat: fmt(AGENTS.length),
              statLabel: "agents perceiving in parallel",
            },
            {
              title: "Autonomous Reasoning",
              body: "Agents decide what to do next and who should do it, passing work along when it belongs to another specialist: invoices to finance, bugs to engineering.",
              stat: fmt(handoffs),
              statLabel: "handoffs tonight",
            },
            {
              title: "Self-Execution",
              body: "Code is refactored and tested, content is cut and scheduled, tickets are cleared and books are closed. Anything that needs a human is flagged at the top of the brief.",
              stat: fmt(deliverables.length),
              statLabel: "deliverables shipped tonight",
            },
          ]}
        />
      </DemoSection>

      <DemoSection eyebrow="Shift management" title="The night shift," accent="hour by hour.">
        <ShiftSchedule
          position={(minute / NIGHT_MINUTES) * 3}
          shifts={[
            {
              name: "Intake & Extraction",
              window: "22:00 – 00:40",
              tasks: ["Parse invoices and contracts", "Pull CRM deltas", "Triage the overnight ticket queue", "Scrape competitor pricing"],
              output: "Raw work structured and routed",
            },
            {
              name: "Build & Reconcile",
              window: "00:40 – 03:20",
              tasks: ["Refactor and test flagged modules", "Patch dependency CVEs", "Match payouts to invoices", "Close the daily ledger"],
              output: "Code merged, books balanced",
            },
            {
              name: "Distribute & Brief",
              window: "03:20 – 06:00",
              tasks: ["Cut and schedule content", "Localise the newsletter", "Draft replies for approval", "Compile the morning brief"],
              output: `${fmt(deliverables.length)} deliverables waiting at 06:00`,
            },
          ]}
        />
      </DemoSection>

      <DemoSection eyebrow="Automation log" title="Every decision," accent="on the record.">
        <Panel>
          <LiveLog entries={log.slice(0, 18)} className="max-h-[420px]" />
        </Panel>
        <p className="mt-4 text-xs text-white/40">
          The agents and their tasks are a live simulation running on an accelerated clock. The morning brief is compiled by the real /api/shadow-workforce endpoint.
        </p>
      </DemoSection>
    </DemoShell>
  );
}
