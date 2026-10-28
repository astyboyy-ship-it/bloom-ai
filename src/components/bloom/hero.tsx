"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PaintingCanvas, PaintingCaption } from "./art/painting-canvas";
import { RoseFrame } from "./art/rose-frame";
import { ENGINE_ORDER, ENGINES } from "./command/engines";
import { useI18n } from "./i18n";
import { BloomWordmark } from "./logo";
import { StatusLed } from "./status-led";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.16, delayChildren: 0.6 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.3, ease: [0.16, 1, 0.3, 1] } },
};

export function Hero() {
  const { t, lang, dir } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden px-4 pb-10 pt-28 sm:px-8">
      {/* Vernet's storm, alive: the canvas pitches, the sea ripples, rain falls, lightning flickers */}
      <div className="absolute inset-0 -z-20">
        <PaintingCanvas painting="storm" priority />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgb(8_4_12/0.55),rgb(8_4_12/0.15)_70%)]" />
        {/* 3D rose vines framing the canvas, casting their shadows onto it */}
        <RoseFrame />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ y: contentY, opacity: contentOpacity }}
        lang={lang}
        dir={dir}
        className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center text-center"
      >
        {/* Masthead metadata */}
        <motion.p
          variants={item}
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.32em] text-[#f0d59a]/80"
        >
          <span>Nº 001</span>
          <span className="h-px w-8 bg-[#f0d59a]/40" />
          <span>The Bloom AI Laboratory</span>
          <span className="h-px w-8 bg-[#f0d59a]/40" />
          <span>Est. MMXXVI</span>
        </motion.p>

        <motion.p variants={item} className="mt-8 text-6xl drop-shadow-[0_6px_24px_rgb(0_0_0/0.7)] sm:text-7xl">
          <BloomWordmark />
        </motion.p>

        {/* The editorial cover line, on low-opacity glass */}
        <motion.div
          variants={item}
          className="relative mt-6 max-w-5xl rounded-[36px] border border-[#f0d59a]/20 bg-[#0b0612]/35 px-6 py-8 shadow-[inset_0_1px_0_rgb(255_240_210/0.12),0_40px_120px_-40px_rgb(0_0_0/0.9)] backdrop-blur-md sm:px-12 sm:py-10"
        >
          <p className="mb-5 flex items-center justify-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.26em] text-white/60">
            <StatusLed className="size-3" /> {t.hero.status}
            <span className="text-white/25">·</span>
            {t.hero.badge}
          </p>
          <h1 className="font-display text-[2.6rem] font-light leading-[1.02] tracking-[0.01em] text-[#f6ead2] sm:text-6xl lg:text-[5.2rem]">
            {t.hero.titlePre}
            <em className="text-gold-metal font-normal">{t.hero.titleAccent}</em>
            {t.hero.titlePost}
          </h1>
          <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[#f0d59a]/60 to-transparent" />
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-[15px] leading-relaxed text-white/75 sm:text-base">{t.hero.sub}</p>
        </motion.div>

        <motion.div variants={item} className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/command"
            className="group relative inline-flex h-13 items-center gap-2 overflow-hidden rounded-full bg-[#f3e2b8] px-8 text-sm font-semibold text-[#1a0f05] shadow-[0_0_60px_-12px_rgb(243_212_143/0.8)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#fff4d6] via-[#e8c27a] to-[#c99446] transition-transform duration-700 group-hover:translate-x-0" />
            <span className="relative">{t.hero.ctaPrimary}</span>
            <ArrowRight className="relative size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
          </Link>
          <a
            href="#engines"
            className="inline-flex h-13 items-center gap-2 rounded-full border border-white/25 bg-ink/40 px-8 text-sm font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/45 hover:text-white"
          >
            {t.hero.ctaSecondary}
          </a>
        </motion.div>

        <motion.ul variants={item} className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
          {ENGINE_ORDER.map((k) => (
            <li key={k}>
              <Link href={`/command/${k}`} className="flex items-center gap-2 transition-colors hover:text-white">
                <span className="text-[#f0d59a]/70">{ENGINES[k].index}</span>
                {ENGINES[k].name}
              </Link>
            </li>
          ))}
        </motion.ul>
      </motion.div>

      <PaintingCaption painting="storm" className="relative mx-auto mt-10 w-full max-w-6xl text-right" />
    </section>
  );
}
