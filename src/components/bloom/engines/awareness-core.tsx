"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Check, Eye, GitBranch, Radar, Repeat, X, type LucideIcon } from "lucide-react";
import { useI18n } from "../i18n";
import { StatusLed } from "../status-led";

// Icons for the three steps of the awareness loop; the copy comes from the dictionary.
const loopIcons: LucideIcon[] = [Eye, BrainCircuit, GitBranch];

/** Explains Bloom's core architecture: every engine perceives, reasons, and decides on its own. */
export function AwarenessCore() {
  const { t, lang, dir } = useI18n();
  const c = t.core;
  return (
    <motion.div
      lang={lang}
      dir={dir}
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
            <StatusLed tone="cyan" /> {c.eyebrow}
          </p>
          <h3 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-white sm:text-4xl">
            {c.titlePre}<span className="font-serif italic text-bloom-gradient">{c.titleAccent}</span>
          </h3>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            {c.body}
          </p>

          <ol className="relative mt-8 space-y-3">
            {c.loop.map((step, i) => {
              const Icon = loopIcons[i];
              return (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }}
                className="flex gap-4 rounded-2xl border border-white/[0.06] bg-black/20 p-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#5ee7ff]/25 bg-[#5ee7ff]/10 text-[#8ff0ff]">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">{c.step} {i + 1}</p>
                  <p className="text-[15px] font-medium text-white">{step.title}</p>
                  <p className="mt-1 text-[13px] leading-snug text-white/55">{step.body}</p>
                </div>
              </motion.li>
              );
            })}
          </ol>
          <p className="mt-3 flex items-center gap-2 ps-4 text-[12px] text-white/45">
            <Repeat className="size-3.5 text-[#8ff0ff]" /> {c.loops}
          </p>
        </div>

        <div className="flex flex-col">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            <Radar className="size-3.5" /> {c.difference}
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07]">
            <div className="grid grid-cols-2 bg-white/[0.04] text-[11px] font-medium uppercase tracking-[0.14em]">
              <p className="px-4 py-3 text-white/40">{c.colTemplate}</p>
              <p className="border-s border-white/[0.07] px-4 py-3 text-[#8ff0ff]">{c.colAware}</p>
            </div>
            <ul>
              {c.contrast.map((row, i) => (
                <li key={i} className="grid grid-cols-2 border-t border-white/[0.06] text-[13px]">
                  <p className="flex items-start gap-2 px-4 py-3 text-white/45">
                    <X aria-hidden className="mt-0.5 size-3.5 shrink-0 text-white/30" />
                    {row.template}
                  </p>
                  <p className="flex items-start gap-2 border-s border-white/[0.07] bg-[#5ee7ff]/[0.03] px-4 py-3 text-white/85">
                    <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-[#8ff0ff]" />
                    {row.aware}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-5 rounded-2xl border border-white/[0.06] bg-black/20 p-4 text-[13px] leading-relaxed text-white/60">
            <span className="text-white">{c.closingLead}</span>
            {c.closing}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
