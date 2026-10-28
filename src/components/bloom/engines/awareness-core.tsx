"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Check, Eye, GitBranch, Radar, Repeat, X, type LucideIcon } from "lucide-react";
import { StatusLed } from "../status-led";

const loop: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Eye,
    title: "Real-Time Environmental Perception",
    body: "Every engine continuously senses live data from its environment: markets, inboxes, systems, and buyer behavior.",
  },
  {
    icon: BrainCircuit,
    title: "Context Auto-Diagnosis",
    body: "It reasons about what that data means right now for your business, your floors, and your goals.",
  },
  {
    icon: GitBranch,
    title: "Autonomous Decision-Making",
    body: "It constructs its own execution path, acts on it, and adapts the moment the situation changes.",
  },
];

const contrast = [
  { template: "You design the workflow", aware: "The engine designs its own path" },
  { template: "Static templates and hardcoded rules", aware: "Dynamic reasoning over live data" },
  { template: "Breaks when conditions change", aware: "Re-diagnoses and adapts in real time" },
  { template: "Needs a human to configure and maintain", aware: "Zero configuration, self-maintaining" },
];

/** Explains Bloom's core architecture: every engine perceives, reasons, and decides on its own. */
export function AwarenessCore() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="glass relative mx-auto mt-20 max-w-6xl overflow-hidden rounded-[32px] p-7 sm:p-10"
    >
      <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-[#5ee7ff]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 size-80 rounded-full bg-dusk/15 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#8ff0ff]">
            <StatusLed tone="cyan" /> Bloom&apos;s core architecture
          </p>
          <h3 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-white sm:text-4xl">
            Not automation. <span className="font-serif italic text-bloom-gradient">Dynamic Awareness.</span>
          </h3>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            None of our engines run on static templates or hardcoded rules. Each one perceives its environment in
            real time, diagnoses the context on its own, and decides what to do next, with no human configuration.
          </p>

          <ol className="relative mt-8 space-y-3">
            {loop.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }}
                className="flex gap-4 rounded-2xl border border-white/[0.06] bg-black/20 p-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#5ee7ff]/25 bg-[#5ee7ff]/10 text-[#8ff0ff]">
                  <step.icon className="size-5" />
                </span>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Step {i + 1}</p>
                  <p className="text-[15px] font-medium text-white">{step.title}</p>
                  <p className="mt-1 text-[13px] leading-snug text-white/55">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
          <p className="mt-3 flex items-center gap-2 ps-4 text-[12px] text-white/45">
            <Repeat className="size-3.5 text-[#8ff0ff]" /> Then it loops, continuously, 24/7.
          </p>
        </div>

        <div className="flex flex-col">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            <Radar className="size-3.5" /> The difference
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07]">
            <div className="grid grid-cols-2 bg-white/[0.04] text-[11px] font-medium uppercase tracking-[0.14em]">
              <p className="px-4 py-3 text-white/40">Template automation</p>
              <p className="border-l border-white/[0.07] px-4 py-3 text-[#8ff0ff]">Bloom aware engines</p>
            </div>
            <ul>
              {contrast.map((row) => (
                <li key={row.template} className="grid grid-cols-2 border-t border-white/[0.06] text-[13px]">
                  <p className="flex items-start gap-2 px-4 py-3 text-white/45">
                    <X aria-hidden className="mt-0.5 size-3.5 shrink-0 text-white/30" />
                    {row.template}
                  </p>
                  <p className="flex items-start gap-2 border-l border-white/[0.07] bg-[#5ee7ff]/[0.03] px-4 py-3 text-white/85">
                    <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-[#8ff0ff]" />
                    {row.aware}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-5 rounded-2xl border border-white/[0.06] bg-black/20 p-4 text-[13px] leading-relaxed text-white/60">
            <span className="text-white">You never build or configure a workflow.</span> You tell an engine what
            matters (your goals, your limits, your voice), and it is aware enough to build and run everything else
            itself.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
