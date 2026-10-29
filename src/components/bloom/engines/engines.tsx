"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Sparkles, Zap } from "lucide-react";
import { paintings, type PaintingKey } from "../art/paintings";
import { ENGINES, type EngineKey } from "../command/engines";
import { PALETTES, paletteVars, type Palette } from "../command/theme";
import { useI18n } from "../i18n";
import { Accent, SectionHeading } from "../section-heading";
import { cn } from "@/lib/utils";
import { StatusLed } from "../status-led";
import { AwarenessCore } from "./awareness-core";
import { localizeSiteEngine, useSiteCopy } from "../site-copy";
import { engines } from "./data";

type GalleryCard = { id: string; index: string; name: string; teaser: string; autonomy: number; painting: PaintingKey; href: string; command: EngineKey; palette?: Palette };

/** Engines 05–08 open straight into their command pages and wear their own palettes. */
const NEWER: { key: EngineKey; autonomy: number }[] = [
  { key: "vanguard", autonomy: 70 },
  { key: "cortex", autonomy: 65 },
  { key: "shield", autonomy: 72 },
  { key: "aether", autonomy: 60 },
];

/** All eight engines as a gallery of living paintings; 01–04 open their full-screen view, 05–08 their command page. */
export function Engines() {
  const { t, lang, dir } = useI18n();
  const { s } = useSiteCopy();
  const cards: GalleryCard[] = [
    ...engines.map((base) => {
      const e = localizeSiteEngine(base, lang);
      return { id: e.slug, index: e.index, name: e.name, teaser: e.teaser, autonomy: e.autonomy, painting: e.painting, href: `/engines/${e.slug}`, command: e.command };
    }),
    ...NEWER.map(({ key, autonomy }) => {
      const c = ENGINES[key];
      return { id: key, index: c.index, name: c.name, teaser: s.galleryTeasers[key] ?? c.role, autonomy, painting: c.painting, href: `/command/${key}`, command: key, palette: PALETTES[key] };
    }),
  ];

  return (
    <section id="engines" className="relative scroll-mt-16 px-4 py-32 sm:px-8 sm:py-44">
      <SectionHeading
        kanji="原動力"
        eyebrow={t.engines.eyebrow}
        title={
          <>
            {t.engines.titlePre}
            <Accent>{t.engines.titleAccent}</Accent>
          </>
        }
        description={t.engines.description}
      >
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="relative rounded-2xl p-px shadow-[0_0_60px_-12px_rgb(243_212_143/0.6)] sm:rounded-full">
            <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-full">
              <div className="animate-spin-slow absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,#fff4d6,#c99446,#f3d48f,#8a5a22,#fff4d6)] [animation-duration:6s]" />
            </div>
            <div className="relative flex items-center gap-3 rounded-2xl bg-ink/95 px-5 py-3 text-left text-[13px] font-medium leading-snug text-white sm:rounded-full sm:px-6 sm:text-[15px]">
              <Sparkles className="size-4 shrink-0 text-[#f0d59a]" />
              <span>
                {t.engines.badgePre}
                <span className="text-gold-metal">{t.engines.badgeAccent}</span>
              </span>
            </div>
          </div>
          <p className="flex items-center gap-2.5 rounded-full border border-[#ffb347]/25 bg-ink/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc777] backdrop-blur-md [text-shadow:none]">
            <StatusLed />
            <Zap className="size-3.5 fill-[#ffb347] text-[#ffb347]" />
            {t.engines.devBanner}
          </p>
        </div>
      </SectionHeading>

      <AwarenessCore />

      <ul lang={lang} dir={dir} className="mx-auto mt-6 grid max-w-6xl gap-6 md:grid-cols-2">
        {cards.map((e, i) => {
          const art = paintings[e.painting];
          const themed = Boolean(e.palette);
          return (
            <motion.li
              key={e.id}
              style={e.palette && paletteVars(e.palette)}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.9, delay: (i % 2) * 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* The card is a stretched link so the demo button can be a separate link inside it. */}
              <div
                className={cn(
                  "group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[32px] border has-[a:focus-visible]:ring-2 sm:aspect-[5/6]",
                  themed
                    ? "border-c-edge/60 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9),0_0_70px_-30px_var(--c-glow)] transition-shadow duration-700 hover:shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9),0_0_90px_-20px_var(--c-glow)] has-[a:focus-visible]:ring-c-2/60"
                    : "border-[#f0d59a]/15 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] has-[a:focus-visible]:ring-[#f0d59a]/60",
                )}
              >
                <Image
                  src={art.src}
                  alt={`${art.title} by ${art.artist}, ${art.year}`}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[1.8s] ease-out group-hover:scale-[1.06]"
                  style={{ objectPosition: art.focus }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_6_18/0.15)_0%,rgb(11_6_18/0.25)_40%,rgb(11_6_18/0.92)_100%)] transition-opacity duration-700 group-hover:opacity-90" />
                <Link href={e.href} aria-label={`${t.engineCard.enter}: ${e.name}`} className="absolute inset-0 z-[1] outline-none" />

                <div className="pointer-events-none relative z-[2] p-7 sm:p-9">
                  <p className={cn("font-mono text-[10px] uppercase tracking-[0.3em]", themed ? "text-c-2/90" : "text-[#f0d59a]/80")}>{t.engineCard.index} {e.index}</p>
                  <h3 className={cn("mt-3 font-display text-4xl font-light leading-[1.02] sm:text-5xl", themed ? "text-white [text-shadow:0_0_40px_var(--c-glow)]" : "text-gold-metal")}>{e.name}</h3>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/75">{e.teaser}</p>

                  <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                    <span className="inline-flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#ffc777]">
                      <StatusLed /> {t.engineCard.status}
                    </span>
                    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                      <span className="relative h-1 w-16 overflow-hidden rounded-full bg-white/15">
                        <span className={cn("absolute inset-y-0 start-0 rounded-full bg-gradient-to-r", themed ? "from-c-1 to-c-2" : "from-[#c99446] to-[#5ee7ff]")} style={{ width: `${e.autonomy}%` }} />
                      </span>
                      {e.autonomy}% {t.engineCard.autonomous}
                    </span>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
                    <Link
                      href={`/command/${e.command}`}
                      className={cn(
                        "pointer-events-auto relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-full px-5 text-sm font-semibold transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2",
                        themed
                          ? "border border-c-1/60 bg-c-deep/80 text-white shadow-[0_0_50px_-12px_var(--c-glow)] hover:shadow-[0_0_60px_-8px_var(--c-glow)] focus-visible:outline-c-2"
                          : "bg-[#f3e2b8] text-[#1a0f05] shadow-[0_0_50px_-12px_rgb(243_212_143/0.85)] hover:shadow-[0_0_60px_-8px_rgb(243_212_143/0.95)] focus-visible:outline-[#f0d59a]",
                      )}
                    >
                      {t.engineCard.command} <ArrowRight className="size-4 rtl:-scale-x-100" />
                    </Link>
                    <span className={cn("inline-flex items-center gap-2 border-b pb-1 text-sm font-medium transition-colors", themed ? "border-c-2/40 text-c-2 group-hover:border-c-2" : "border-[#f0d59a]/40 text-[#f3e2b8] group-hover:border-[#f0d59a]")}>
                      {t.engineCard.enter}
                      <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                  <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
                    <span className="font-display text-[12px] normal-case italic tracking-normal text-white/55">{art.title}</span> · {art.artist}, {art.year}
                  </p>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
