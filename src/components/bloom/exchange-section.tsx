"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, FileCheck2, Handshake, ShieldCheck } from "lucide-react";
import { useExchangeScoutCopy } from "./exchange-scout-copy";
import { useI18n } from "./i18n";
import { IntegrationExplorer } from "./integration-explorer";
import { Accent, SectionHeading } from "./section-heading";

const reveal = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } };
const MECHANIC_ICONS = [Handshake, FileCheck2, ShieldCheck];

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-white/45">{children}</p>;
}

/** #exchange: what Bloom Exchange is, what's free today, where it sits in the AI arc, why it lasts, and where it's incorporated. */
export function ExchangeSection() {
  const { lang, dir } = useI18n();
  const c = useExchangeScoutCopy().exchange;
  return (
    <section id="exchange" className="relative scroll-mt-16 px-4 py-32 sm:px-8 sm:py-44">
      <SectionHeading
        kanji={c.kanji}
        eyebrow={c.eyebrow}
        title={
          <>
            {c.titlePre}
            <Accent>{c.titleAccent}</Accent>
          </>
        }
        description={c.description}
      />

      <div lang={lang} dir={dir} className="mx-auto mt-16 grid max-w-6xl gap-5">
        <motion.div {...reveal} className="glass rounded-[28px] p-6 sm:p-8">
          <Label>{c.plain.label}</Label>
          <p className="mt-3 max-w-3xl text-pretty text-lg leading-relaxed text-white/85 sm:text-xl">{c.plain.body}</p>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {c.mechanics.map((m, i) => {
              const Icon = MECHANIC_ICONS[i];
              return (
                <div key={m.title} className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
                  <Icon className="size-5 text-rose" />
                  <h3 className="mt-3 text-[15.5px] font-medium text-white">{m.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{m.body}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div {...reveal} className="glass rounded-[28px] p-6 sm:p-8">
          <Label>{c.free.label}</Label>
          <h3 className="mt-2 text-2xl font-medium tracking-[-0.02em] text-white">{c.free.title}</h3>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.free.items.map((f) => (
              <li key={f.name}>
                <a href={f.href} target="_blank" rel="noreferrer" className="group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-black/25 p-4 transition-colors hover:border-sun/40">
                  <span className="flex items-center justify-between gap-2 text-[15px] font-medium text-white">
                    {f.name}
                    <ArrowUpRight className="size-4 text-white/40 transition-colors group-hover:text-sun rtl:-scale-x-100" />
                  </span>
                  <span className="mt-1.5 text-[13px] leading-relaxed text-white/60">{f.body}</span>
                </a>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...reveal} className="glass rounded-[28px] p-6 sm:p-8">
          <Label>{c.arc.label}</Label>
          <ol className="relative mt-6 grid gap-6 md:grid-cols-4 md:gap-4">
            <span aria-hidden className="absolute inset-x-0 top-[11px] hidden h-px bg-gradient-to-r from-white/5 via-rose/40 to-sun/60 md:block rtl:bg-gradient-to-l" />
            {c.arc.steps.map((s, i) => (
              <li key={s.title} className="relative">
                <span className={`relative flex size-[23px] items-center justify-center rounded-full border ${i === c.arc.steps.length - 1 ? "border-sun/70 bg-sun/20" : "border-white/25 bg-ink"}`}>
                  <span className={`size-1.5 rounded-full ${i >= 2 ? "bg-sun" : "bg-white/50"}`} />
                </span>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-rose/80">{s.era}</p>
                <h3 className="mt-1 text-[16px] font-medium text-white">{s.title}</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-white/60">{s.body}</p>
              </li>
            ))}
          </ol>
        </motion.div>

        <motion.div {...reveal} className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-3">
            <Label>{c.lasts.label}</Label>
          </div>
          {c.lasts.items.map((l) => (
            <div key={l.title} className="glass rounded-[24px] p-5">
              <h3 className="text-[16px] font-medium text-white">{l.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">{l.body}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <IntegrationExplorer product="exchange" />
    </section>
  );
}
