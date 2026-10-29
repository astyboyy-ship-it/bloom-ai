"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Check, Cpu, FileSignature, Handshake, Moon, Send, Sparkles, Sun, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaintingCanvas, PaintingCaption } from "./art/painting-canvas";
import { useI18n } from "./i18n";
import { useSiteCopy } from "./site-copy";
import { Accent, SectionHeading } from "./section-heading";

// Times, icons and tones; engine tags, titles and bodies come from site-copy.ts in the same order.
const night = [
  {
    time: "22:00",
    icon: Moon,
    tone: "moon",
  },
  {
    time: "23:14",
    icon: Send,
    tone: "night",
  },
  {
    time: "01:47",
    icon: Handshake,
    tone: "night",
  },
  {
    time: "02:36",
    icon: FileSignature,
    tone: "night",
  },
  {
    time: "03:30",
    icon: Target,
    tone: "night",
  },
  {
    time: "04:20",
    icon: Cpu,
    tone: "night",
  },
  {
    time: "05:05",
    icon: Users,
    tone: "dawn",
  },
  {
    time: "07:00",
    icon: Sun,
    tone: "sun",
  },
] as const;

export function NightShift() {
  const { t } = useI18n();
  const { s } = useSiteCopy();
  const n = s.nightShift;
  const timelineRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: timelineRef, offset: ["start 70%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 24 });

  return (
    <section id="night-shift" className="relative isolate scroll-mt-16 overflow-hidden px-4 py-32 sm:py-44">
      {/* Aivazovsky's moonlit sea as the finale's living backdrop */}
      <div className="absolute inset-0 -z-10">
        <PaintingCanvas painting="moonlitSea" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_6_18)_0%,rgb(11_6_18/0.55)_18%,rgb(11_6_18/0.6)_70%,rgb(11_6_18)_100%)]" />
      </div>
      <PaintingCaption painting="moonlitSea" className="absolute bottom-6 end-6 hidden sm:block" />

      <SectionHeading
        kanji="夜勤"
        eyebrow={t.nightShift.eyebrow}
        title={
          <>
            {t.nightShift.titlePre}
            <Accent>{t.nightShift.titleAccent}</Accent>
          </>
        }
        description={t.nightShift.description}
      />

      <div className="mx-auto mt-20 grid max-w-6xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        {/* Parameters card */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="glass relative overflow-hidden rounded-3xl p-7"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-rose/15 blur-3xl" />
            <div className="mb-6 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">{n.brandParams}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dusk/30 bg-dusk/10 px-2.5 py-1 text-[10px] font-medium text-dusk">
                <Check className="size-3" /> {n.setOnce}
              </span>
            </div>
            <dl className="space-y-1">
              {n.parameters.map(([label, value], i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                  className="group flex items-baseline justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  <dt className="text-xs text-white/40">{label}</dt>
                  <dd className="text-end text-sm text-white/85">{value}</dd>
                </motion.div>
              ))}
            </dl>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/30 p-4">
              <Sparkles className="size-4 shrink-0 text-sun" />
              <p className="text-xs leading-relaxed text-white/55">
                {n.staysAware}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Timeline */}
        <div>
          <p className="mb-8 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">{n.sampleNight}</p>
          <ol ref={timelineRef} className="relative space-y-4">
            {/* Rail fills from moonlight to sunrise as you scroll */}
            <div className="absolute bottom-6 start-[27px] top-6 w-px bg-white/[0.07]" />
            <motion.div
              className="absolute bottom-6 start-[27px] top-6 w-px origin-top bg-gradient-to-b from-[#8b9cff] via-rose to-sun"
              style={{ scaleY: progress }}
            />
            {night.map((step, i) => (
              <motion.li
                key={step.time}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
                className="group relative flex gap-5"
              >
                <div
                  className={cn(
                    "relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl border bg-ink transition-all duration-500 group-hover:scale-105",
                    step.tone === "moon" && "border-[#8b9cff]/30 text-[#aab6ff]",
                    step.tone === "night" && "border-rose/25 text-rose",
                    step.tone === "dawn" && "border-sun/30 text-sun",
                    step.tone === "sun" && "border-sun/50 bg-sun/10 text-sun shadow-[0_0_40px_-6px_rgb(255_189_110/0.7)]",
                  )}
                >
                  <step.icon className="size-5" />
                </div>
                <div className="flex-1 rounded-2xl border border-transparent p-4 pt-2 transition-colors group-hover:border-white/[0.06] group-hover:bg-white/[0.02]">
                  <p className="flex items-center gap-2.5 font-mono text-xs tabular-nums text-white/35">
                    {step.time}
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/50">
                      {n.night[i].engine}
                    </span>
                  </p>
                  <h3
                    className={cn(
                      "mt-1 text-lg font-medium tracking-tight text-white",
                      step.tone === "sun" && "font-serif text-2xl italic text-sun",
                    )}
                  >
                    {n.night[i].title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/50">{n.night[i].body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
