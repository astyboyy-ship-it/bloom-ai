"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Check, Cpu, FileSignature, Handshake, Moon, Send, Sparkles, Sun, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaintingCanvas, PaintingCaption } from "./art/painting-canvas";
import { useI18n } from "./i18n";
import { Accent, SectionHeading } from "./section-heading";

const parameters = [
  { label: "Brand voice", value: "Bold, warm, unapologetic" },
  { label: "Partnership floor", value: "$8,500 per deal" },
  { label: "Ideal partners", value: "Premium wellness · design-led tech" },
  { label: "Outbound targets", value: "Founders at $1M+ ARR" },
  { label: "Red lines", value: "No gambling · no crypto" },
];

const night = [
  {
    time: "22:00",
    icon: Moon,
    engine: "All engines",
    title: "You set it and go to sleep.",
    body: "Your parameters are locked in. The engines take the night shift.",
    tone: "moon",
  },
  {
    time: "23:14",
    icon: Send,
    engine: "Shadow Workforce",
    title: "The outbound wave launches.",
    body: "142 high-ticket pitches go out to premium brands and PR agencies, each with a custom deck and written in your voice.",
    tone: "night",
  },
  {
    time: "01:47",
    icon: Handshake,
    engine: "Marketing Engine",
    title: "A brand deal gets negotiated up.",
    body: "An inbound $4,000 offer is countered to $9,200 using your live rate card, inside your floor and your terms.",
    tone: "night",
  },
  {
    time: "02:36",
    icon: FileSignature,
    engine: "Shadow Workforce",
    title: "The contract is drafted and staged.",
    body: "Usage rights, exclusivity, and deliverables are written into the agreement and staged for e-signature.",
    tone: "night",
  },
  {
    time: "03:30",
    icon: Target,
    engine: "IntentPulse",
    title: "Inbound leads are scored.",
    body: "IntentPulse scores 27 inbound leads for intent, budget, and fit. The 6 VIP buyers are locked into your calendar.",
    tone: "night",
  },
  {
    time: "04:20",
    icon: Cpu,
    engine: "Infrastructure Architect",
    title: "Operations run themselves.",
    body: "Invoices are reconciled, the CRM is synced, and fulfilment is triggered across 14 autonomous workflows.",
    tone: "night",
  },
  {
    time: "05:05",
    icon: Users,
    engine: "Marketing Engine",
    title: "Collaborations are architected.",
    body: "Two creator pairings and one co-branded deal are matched by audience overlap, with intros drafted.",
    tone: "dawn",
  },
  {
    time: "07:00",
    icon: Sun,
    engine: "Morning Brief",
    title: "You wake up in full bloom.",
    body: "One brief. Everything handled, and only the approvals worth your time are waiting.",
    tone: "sun",
  },
] as const;

export function NightShift() {
  const { t } = useI18n();
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
      <PaintingCaption painting="moonlitSea" className="absolute bottom-6 right-6 hidden sm:block" />

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
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Brand parameters</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dusk/30 bg-dusk/10 px-2.5 py-1 text-[10px] font-medium text-dusk">
                <Check className="size-3" /> Set once
              </span>
            </div>
            <dl className="space-y-1">
              {parameters.map((p, i) => (
                <motion.div
                  key={p.label}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                  className="group flex items-baseline justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  <dt className="text-xs text-white/40">{p.label}</dt>
                  <dd className="text-right text-sm text-white/85">{p.value}</dd>
                </motion.div>
              ))}
            </dl>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/30 p-4">
              <Sparkles className="size-4 shrink-0 text-sun" />
              <p className="text-xs leading-relaxed text-white/55">
                Bloom stays aware of these every time it acts. Nothing goes out off-brand, and no deal closes
                below your floor.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Timeline */}
        <div>
          <p className="mb-8 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">A sample night</p>
          <ol ref={timelineRef} className="relative space-y-4">
            {/* Rail fills from moonlight to sunrise as you scroll */}
            <div className="absolute bottom-6 left-[27px] top-6 w-px bg-white/[0.07]" />
            <motion.div
              className="absolute bottom-6 left-[27px] top-6 w-px origin-top bg-gradient-to-b from-[#8b9cff] via-rose to-sun"
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
                      {step.engine}
                    </span>
                  </p>
                  <h3
                    className={cn(
                      "mt-1 text-lg font-medium tracking-tight text-white",
                      step.tone === "sun" && "font-serif text-2xl italic text-sun",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/50">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
