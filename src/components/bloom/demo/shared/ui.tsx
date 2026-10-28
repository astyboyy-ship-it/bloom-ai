"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Check, Eye, Rocket, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusLed } from "../../status-led";
import { useInterval } from "./sim";

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
};

export function Chip({ tone = "amber", children }: { tone?: "amber" | "cyan"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-ink/60 py-1 pl-2 pr-3 backdrop-blur-md",
        tone === "amber" ? "border-[#ffb347]/30" : "border-[#5ee7ff]/25",
      )}
    >
      <StatusLed tone={tone} className={tone === "cyan" ? "size-3" : undefined} />
      <span
        className={cn(
          "font-mono text-[9px] font-semibold uppercase tracking-[0.18em]",
          tone === "amber" ? "text-[#ffc777]" : "text-[#8ff0ff]",
        )}
      >
        {children}
      </span>
    </span>
  );
}

export function Panel({ title, kicker, right, className, children }: {
  title?: string;
  kicker?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("glass min-w-0 rounded-[24px] p-5", className)}>
      {(title || kicker || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {kicker && <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#8ff0ff]">{kicker}</p>}
            {title && <h2 className="mt-1 font-display text-2xl font-light leading-tight text-white">{title}</h2>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, accent = false }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="glass min-w-0 rounded-2xl px-4 py-3">
      <p className="truncate font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className={cn("mt-1 font-display text-3xl font-light tabular-nums leading-none", accent ? "text-gold-metal" : "text-white")}>{value}</p>
      {sub && <p className="mt-1 truncate font-mono text-[10px] text-white/45">{sub}</p>}
    </div>
  );
}

export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("relative h-1.5 overflow-hidden rounded-full bg-white/[0.08]", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#c99446] via-[#f3d48f] to-[#5ee7ff] transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export type LogEntry = { id: string; time: string; text: string; tone?: "gold" | "cyan" | "ember" | "muted" };

const LOG_TONE = { gold: "text-[#f3d48f]", cyan: "text-[#8ff0ff]", ember: "text-[#ff9b78]", muted: "text-white/45" };

/** A bounded, newest-first automation log. */
export function LiveLog({ entries, className }: { entries: LogEntry[]; className?: string }) {
  return (
    <ol className={cn("space-y-1.5 overflow-hidden font-mono text-[11px] leading-relaxed", className)}>
      <AnimatePresence initial={false}>
        {entries.map((e) => (
          <motion.li
            key={e.id}
            layout="position"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex gap-3"
          >
            <span className="shrink-0 text-white/30">{e.time}</span>
            <span className={cn("min-w-0 [overflow-wrap:anywhere]", LOG_TONE[e.tone ?? "muted"])}>{e.text}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

export function DemoSection({ id, eyebrow, title, accent, children }: {
  id?: string;
  eyebrow: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-28 scroll-mt-20 sm:mt-36">
      <motion.div {...reveal} className="mb-10 max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#f0d59a]/80">{eyebrow}</p>
        <h2 className="mt-4 font-display text-4xl font-light text-white sm:text-6xl">
          {title} <em className="text-gold-metal">{accent}</em>
        </h2>
      </motion.div>
      {children}
    </section>
  );
}

/** Perceive → Reason → Decide, each with a live stat from the running simulation. */
export function ProcessDeepDive({ steps }: { steps: { title: string; body: string; stat: string; statLabel: string }[] }) {
  const icons: LucideIcon[] = [Eye, BrainCircuit, Rocket];
  const kickers = ["Perceive", "Reason", "Decide"];
  return (
    <ol className="grid gap-px overflow-hidden rounded-[32px] border border-white/10 bg-white/10 lg:grid-cols-3">
      {steps.map((s, i) => {
        const Icon = icons[i];
        return (
          <motion.li
            key={s.title}
            {...reveal}
            transition={{ ...reveal.transition, delay: i * 0.15 }}
            className="relative flex flex-col bg-ink/80 p-8 backdrop-blur-xl sm:p-10"
          >
            <span className="text-gold-metal font-display text-7xl font-light leading-none">0{i + 1}</span>
            <span className="mt-8 flex size-11 items-center justify-center rounded-2xl border border-[#5ee7ff]/25 bg-[#5ee7ff]/10 text-[#8ff0ff]">
              <Icon className="size-5" />
            </span>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Step 0{i + 1} · {kickers[i]}</p>
            <h3 className="mt-2 font-display text-3xl text-white">{s.title}</h3>
            <p className="mt-3 flex-1 text-[15px] leading-relaxed text-white/70">{s.body}</p>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="font-display text-4xl font-light tabular-nums text-white">{s.stat}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">{s.statLabel}</p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

export type Shift = { name: string; window: string; tasks: string[]; output: string };

/**
 * Three automated shifts that run one after another, each with its own task checklist. Loops on
 * its own timer unless `position` (0…shifts.length) drives it from an external clock.
 */
export function ShiftSchedule({ shifts, cycleMs = 9000, position }: { shifts: Shift[]; cycleMs?: number; position?: number }) {
  const [elapsed, setElapsed] = useState(0);
  const tick = 200;
  useInterval(() => setElapsed((e) => (e + tick) % (cycleMs * shifts.length)), position === undefined ? tick : null);

  const pos = position ?? elapsed / cycleMs;
  const active = Math.min(shifts.length - 1, Math.floor(pos));
  const progress = pos >= shifts.length ? 1 : pos - Math.floor(pos);

  return (
    <ol className="grid gap-4 lg:grid-cols-3">
      {shifts.map((s, i) => {
        const state = i < active ? "done" : i === active ? "live" : "queued";
        const tasksDone = state === "done" ? s.tasks.length : state === "live" ? Math.floor(progress * (s.tasks.length + 0.999)) : 0;
        return (
          <li
            key={s.name}
            className={cn(
              "glass relative overflow-hidden rounded-[24px] p-6 transition-shadow duration-700",
              state === "live" && "shadow-[0_0_80px_-20px_rgb(243_212_143/0.6)]",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Shift 0{i + 1} · {s.window}</span>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
                  state === "live" && "border-[#f3d48f]/50 text-[#f3d48f]",
                  state === "done" && "border-[#5ee7ff]/30 text-[#8ff0ff]",
                  state === "queued" && "border-white/10 text-white/35",
                )}
              >
                {state === "live" ? "Running" : state === "done" ? "Complete" : "Queued"}
              </span>
            </div>
            <h3 className="text-gold-metal mt-4 font-display text-3xl font-light leading-tight">{s.name}</h3>
            <ul className="mt-5 space-y-2">
              {s.tasks.map((t, ti) => (
                <li key={t} className={cn("flex gap-2.5 text-[13px] transition-colors", ti < tasksDone ? "text-white/85" : "text-white/35")}>
                  <Check className={cn("mt-0.5 size-3.5 shrink-0", ti < tasksDone ? "text-[#f3d48f]" : "text-white/15")} /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-white/10 pt-4">
              <Meter value={state === "done" ? 100 : state === "live" ? progress * 100 : 0} />
              <p className="mt-2 font-mono text-[10px] text-white/45">{s.output}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
