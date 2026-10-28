"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  Code2,
  LayoutTemplate,
  MonitorPlay,
  Palette,
  Rocket,
  Timer,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "./i18n";
import { Accent, SectionHeading } from "./section-heading";

type Pillar = {
  step: string;
  icon: LucideIcon;
  title: string;
  body: string;
  points: { icon: LucideIcon; text: string }[];
  accent: string;
};

const pillars: Pillar[] = [
  {
    step: "01",
    icon: BadgeDollarSign,
    title: "Lowest-Cost Entry",
    body: "Bootstrapped developers pay one ultra-affordable baseline software fee for the whole toolkit.",
    points: [
      { icon: MonitorPlay, text: "Live demo environments for all 4 engines" },
      { icon: LayoutTemplate, text: "Customizable client-facing templates" },
      { icon: Wand2, text: "Interactive staging tools" },
    ],
    accent: "text-[#f0c879] border-[#e3b25a]/30 bg-[#e3b25a]/10",
  },
  {
    step: "02",
    icon: Timer,
    title: "Instant Client Demos",
    body: "Generate a tailored, branded demo for any prospect in seconds: their logo, their data story, their use case.",
    points: [
      { icon: Palette, text: "Branded to each client in seconds" },
      { icon: MonitorPlay, text: "Live, interactive, and shareable" },
      { icon: Code2, text: "No backend code to write" },
    ],
    accent: "text-[#8ff0ff] border-[#5ee7ff]/25 bg-[#5ee7ff]/10",
  },
  {
    step: "03",
    icon: Rocket,
    title: "Close the Retainer",
    body: "Walk into the meeting with a working demo and close $3k–$5k retainers, while the Bloom engines do the heavy lifting.",
    points: [
      { icon: BadgeDollarSign, text: "$3k–$5k retainer opportunities" },
      { icon: Rocket, text: "Hand off to a live engine after the yes" },
      { icon: Code2, text: "Zero infrastructure to maintain" },
    ],
    accent: "text-rose border-rose/25 bg-rose/10",
  },
];

const terms = [
  { value: "Low", label: "Baseline software fee" },
  { value: "Seconds", label: "To a branded client demo" },
  { value: "$3k–$5k", label: "Retainers to close" },
  { value: "0", label: "Lines of backend code" },
];

/** The Bloom Demo Creator Suite: a low-cost sandbox portal for indie developers. */
export function PartnerProgram() {
  const { t } = useI18n();

  return (
    <section id="developers" className="relative scroll-mt-16 px-4 py-32 sm:py-44">
      <SectionHeading
        kanji="共創"
        eyebrow={t.partner.eyebrow}
        title={
          <>
            {t.partner.titlePre}
            <Accent>{t.partner.titleAccent}</Accent>
          </>
        }
        description={t.partner.subtitle}
      />

      <div className="relative mx-auto mt-20 max-w-6xl">
        {/* Mock of the portal itself */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="glass mb-6 overflow-hidden rounded-[28px]"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3">
            {["#ff6b6b", "#ffbd6e", "#5ee7ff"].map((c) => (
              <span key={c} className="size-2.5 rounded-full" style={{ background: c, opacity: 0.7 }} />
            ))}
            <span className="ml-3 truncate font-mono text-[11px] text-white/40">demo-suite.bloom.ai / new-demo</span>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-[1fr_1.4fr] sm:p-6">
            <div className="space-y-2.5">
              {[
                ["Client", "Harbor & Pine Dental Group"],
                ["Engine", "Aware IntentPulse Lead Engine"],
                ["Template", "Local services · inbound booking"],
                ["Brand", "Logo + palette imported"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2 text-[12px]">
                  <span className="text-white/40">{k}</span>
                  <span className="truncate text-white/85">{v}</span>
                </div>
              ))}
            </div>
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e3b25a]/25 bg-gradient-to-br from-[#e3b25a]/10 via-transparent to-[#5ee7ff]/10 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#f0c879]">Live branded demo · ready</p>
              <p className="mt-3 font-serif text-2xl italic text-white">“Every new-patient inquiry, scored and booked overnight.”</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] text-white/55">
                  <Timer className="size-4 text-[#8ff0ff]" /> Generated in 8 seconds
                </span>
                <span className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-black">Share with client</span>
              </div>
            </div>
          </div>
        </motion.div>

        <ol className="grid gap-6 lg:grid-cols-3">
          {pillars.map((m, i) => (
            <motion.li
              key={m.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6 }}
              className="glass group relative flex flex-col overflow-hidden rounded-[28px] p-7"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 -top-6 select-none font-serif text-[8rem] italic leading-none text-transparent opacity-60 [-webkit-text-stroke:1px_rgb(255_255_255/0.07)]"
              >
                {m.step}
              </span>
              <span className={`relative z-10 flex size-12 items-center justify-center rounded-2xl border bg-ink ${m.accent}`}>
                <m.icon className="size-5" />
              </span>
              <h3 className="mt-6 font-serif text-2xl italic text-white">{m.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{m.body}</p>
              <ul className="mt-6 space-y-2 border-t border-white/[0.06] pt-5">
                {m.points.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5 text-[13px] text-white/80">
                    <Icon aria-hidden className="size-4 shrink-0 text-white/40" />
                    {text}
                  </li>
                ))}
              </ul>
            </motion.li>
          ))}
        </ol>

        <motion.dl
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass mt-6 grid grid-cols-2 overflow-hidden rounded-[28px] lg:grid-cols-4"
        >
          {terms.map((term, i) => (
            <div
              key={term.label}
              className={`p-6 sm:p-7 ${i % 2 === 1 ? "border-l border-white/[0.06]" : ""} ${i > 1 ? "border-t border-white/[0.06] lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <dt className="text-xs text-white/45">{term.label}</dt>
              <dd className="mt-2 bg-gradient-to-r from-[#f0c879] via-ember to-rose bg-clip-text font-serif text-4xl italic text-transparent sm:text-5xl">
                {term.value}
              </dd>
            </div>
          ))}
        </motion.dl>

        <div className="mt-8 flex flex-col items-center gap-5 text-center">
          <p className="max-w-2xl text-sm leading-relaxed text-white/55">
            Built for bootstrapped indie developers and technical founders who want to sell high-end AI automation
            without building the infrastructure underneath it.
          </p>
          <a
            href="#waitlist"
            data-engine="developer-partner"
            data-role="developer"
            data-intent="access"
            className="group relative inline-flex h-14 items-center gap-2.5 overflow-hidden rounded-2xl bg-white px-8 text-sm font-semibold text-black shadow-[0_0_70px_-10px_rgb(227_178_90/0.85)] transition-shadow hover:shadow-[0_0_90px_-6px_rgb(227_178_90/0.95)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#e3b25a] via-ember to-rose transition-transform duration-700 ease-out group-hover:translate-x-0" />
            <MonitorPlay className="relative size-4" />
            <span className="relative">{t.partner.cta}</span>
            <ArrowRight className="relative size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
