"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Hand } from "lucide-react";
import { VERIFIER_URL } from "@/lib/integrations";
import { useExchangeScoutCopy } from "./exchange-scout-copy";
import { useI18n } from "./i18n";
import { IntegrationExplorer } from "./integration-explorer";
import { Accent, SectionHeading } from "./section-heading";

const reveal = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } };

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-white/45">{children}</p>;
}

/**
 * #scout: how Bloom Scout runs a sandbox negotiation, a real run on the public relay (neutral sandbox names only), the
 * rules that keep it honest, the owner brief, and where it's incorporated.
 */
export function ScoutSection() {
  const { lang, dir } = useI18n();
  const c = useExchangeScoutCopy().scout;
  const s = c.sample;
  return (
    <section id="scout" className="relative scroll-mt-16 px-4 py-32 sm:px-8 sm:py-44">
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
        <motion.ol {...reveal} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.steps.map((step, i) => (
            <li key={step.title} className="glass rounded-[24px] p-5">
              <span className="font-mono text-[11px] tabular-nums text-rose">0{i + 1}</span>
              <h3 className="mt-2 text-[17px] font-medium text-white">{step.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{step.body}</p>
            </li>
          ))}
        </motion.ol>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <motion.div {...reveal} className="glass rounded-[28px] p-6 sm:p-7">
            <Label>{s.label}</Label>
            <p className="mt-2 text-[15px] font-medium text-white">{s.counterpart}</p>
            <ol className="mt-4 grid gap-1.5">
              {s.rounds.map((r, i) => (
                <li key={r} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-[13.5px] text-white/80">
                  <span className="font-mono text-[10.5px] tabular-nums text-white/35">#{i + 1}</span>
                  {r}
                </li>
              ))}
            </ol>
            <div className="mt-3 rounded-xl border border-sun/40 bg-sun/[0.06] p-4">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-sun">
                <Hand className="size-4" /> {s.state}
              </p>
              <blockquote className="mt-2 border-s-2 border-white/15 ps-3 font-serif text-[16px] italic leading-snug text-white/85">{s.admission}</blockquote>
              <p className="mt-2 text-[12px] leading-relaxed text-white/50">{s.note}</p>
            </div>
            <p className="mt-3 text-[13.5px] text-white/75">{s.outcome}</p>
            <a href={`${VERIFIER_URL}/r/${s.receipt}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-rose/40 px-3 py-1.5 text-[12.5px] text-rose hover:bg-rose/10">
              {s.verify}
              <code className="truncate font-mono text-[11px] text-white/50" dir="ltr">
                {s.receipt.slice(0, 10)}…{s.receipt.slice(-6)}
              </code>
              <ArrowUpRight className="size-3.5 shrink-0 rtl:-scale-x-100" />
            </a>
          </motion.div>

          <motion.div {...reveal} className="glass rounded-[28px] p-6 sm:p-7">
            <Label>{c.brief.label}</Label>
            <ol className="mt-4 grid gap-2">
              {c.brief.sections.map((b, i) => (
                <li key={b} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-[14px] text-white/85">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-rose/50 font-mono text-[11px] text-rose">{i + 1}</span>
                  {b}
                </li>
              ))}
            </ol>
            <div className="mt-6">
              <Label>{c.honesty.label}</Label>
              <ul className="mt-3 grid gap-3">
                {c.honesty.items.map((h) => (
                  <li key={h.title}>
                    <p className="text-[14.5px] font-medium text-white">{h.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-white/60">{h.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>

      <IntegrationExplorer product="scout" />
    </section>
  );
}
