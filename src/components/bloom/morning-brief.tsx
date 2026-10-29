"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView } from "framer-motion";
import { ArrowRight, Check, Coffee, FileSignature, Handshake, PenLine, Send, Sun, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Enso } from "./motifs/enso";
import { useI18n } from "./i18n";
import { useSiteCopy } from "./site-copy";
import { Accent, SectionHeading } from "./section-heading";

// Numbers and names; labels come from site-copy.ts in the same order.
const tiles = [
  { icon: Handshake, value: 3 },
  { icon: Send, value: 142 },
  { icon: Target, value: 27 },
  { icon: Users, value: 3 },
];

const approvals = [
  { id: "lumen", who: "Lumen Labs", amount: 9200 },
  { id: "aster", who: "Aster & Co.", amount: 12500 },
  { id: "kaze", who: "Studio Kaze × You", amount: 5700 },
];

const pipeline = approvals.reduce((sum, a) => sum + a.amount, 0);

function CountUp({ to, prefix = "" }: { to: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration: 2, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref}>
      {prefix}
      {n.toLocaleString("en-US")}
    </span>
  );
}

export function MorningBrief() {
  const { t } = useI18n();
  const { s } = useSiteCopy();
  const m = s.morning;
  const [signed, setSigned] = useState<Set<string>>(new Set());
  const signedTotal = approvals.filter((a) => signed.has(a.id)).reduce((s, a) => s + a.amount, 0);

  const toggle = (id: string) =>
    setSigned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="morning" className="relative scroll-mt-16 overflow-hidden px-4 py-32 sm:py-44">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[700px] bg-[radial-gradient(ellipse_at_bottom,rgb(255_189_110/0.12),transparent_65%)]" />
      <Enso className="absolute left-1/2 top-24 -z-10 w-[min(720px,110vw)] -translate-x-1/2 opacity-30" />

      <SectionHeading
        kanji="朝"
        eyebrow={t.morning.eyebrow}
        title={
          <>
            {t.morning.titlePre}
            <Accent>{t.morning.titleAccent}</Accent>
          </>
        }
        description={t.morning.description}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="glass relative mx-auto mt-20 max-w-4xl overflow-hidden rounded-[32px] p-6 sm:p-10"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-sun/15 blur-3xl" />

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-sun/30 bg-sun/10 text-sun">
              <Sun className="size-5" />
            </span>
            <div>
              <p className="font-serif text-xl italic text-white">{m.briefTitle}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">{m.briefMeta}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
            <Coffee className="size-3" /> {m.sample}
          </span>
        </div>

        {/* Revenue headline */}
        <div className="flex flex-col gap-2 border-b border-white/[0.06] py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">{m.negotiated}</p>
            <p className="mt-2 bg-gradient-to-r from-sun via-ember to-rose bg-clip-text font-serif text-6xl italic leading-none tabular-nums text-transparent sm:text-7xl">
              <CountUp to={pipeline} prefix="$" />
            </p>
          </div>
          <p className="text-sm text-white/55">
            {m.signedSoFar}{" "}
            <motion.span key={signedTotal} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-semibold text-sun tabular-nums">
              ${signedTotal.toLocaleString("en-US")}
            </motion.span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 py-6 sm:grid-cols-4">
          {tiles.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.7 }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-rose/25 hover:bg-rose/[0.04]"
            >
              <t.icon className="size-4 text-white/35 transition-colors group-hover:text-rose" />
              <p className="mt-4 font-serif text-5xl italic leading-none tabular-nums text-white">
                <CountUp to={t.value} />
              </p>
              <p className="mt-2 text-xs text-white/70">{m.tiles[i][0]}</p>
              <p className="mt-1 text-[10px] text-white/35">{m.tiles[i][1]}</p>
            </motion.div>
          ))}
        </div>

        {/* One-click approvals */}
        <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-sun/80">
          <FileSignature className="size-3.5" /> {m.awaiting}
        </p>
        <ul className="space-y-2.5">
          {approvals.map((a, i) => {
            const done = signed.has(a.id);
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
                  done ? "border-dusk/30 bg-dusk/[0.07]" : "border-sun/20 bg-sun/[0.05]",
                )}
              >
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">{m.approvals[i].engine}</p>
                  <p className="mt-0.5 text-sm text-white">
                    {a.who} · <span className="font-semibold text-sun">${a.amount.toLocaleString("en-US")}</span>
                  </p>
                  <p className="text-xs text-white/45">{m.approvals[i].what}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
                  aria-pressed={done}
                  className={cn(
                    "relative inline-flex h-11 min-w-44 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-sm font-semibold transition-all active:scale-95",
                    done ? "bg-dusk/20 text-dusk" : "bg-gradient-to-r from-sun to-ember text-black hover:shadow-[0_0_30px_-6px_rgb(255_123_74/0.8)]",
                  )}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {done ? (
                      <motion.span key="done" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} className="flex items-center gap-2">
                        <Check className="size-4" /> {m.signed}
                      </motion.span>
                    ) : (
                      <motion.span key="approve" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} className="flex items-center gap-2">
                        <PenLine className="size-4" /> {m.approve}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </motion.div>

      <div className="mt-12 text-center">
        <a href="#waitlist" className="group inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white">
          {m.wantThis}
          <ArrowRight className="size-4 text-rose transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
        </a>
      </div>
    </section>
  );
}
