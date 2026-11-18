"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { FloraField, type Bloom } from "@/components/bloom/art/flora";
import { BloomWordmark } from "@/components/bloom/logo";
import { useOmniCopy } from "./omni-copy";

export const BOOT_KEY = "bloom-exchange-booted";

/**
 * The Exchange's 4.5-second entrance, the ceremonial sibling of Bloom Desktop's intro and built from the same
 * layers: an obsidian-rose canvas with slow velvety crimson glows over a faint Venetian painting, rose-gold
 * hairlines drawing the clearing grid, the Bloom emblem blooming in (blur to sharp, like paint settling), SVG roses
 * unfurling at the frame, and live diagnostics that decode this deployment's real root key. At 3.7s it zooms
 * through into the workspace; Esc, Enter, a click or Skip leave at once. Shown once per session.
 */
const LEAVE_AT = 3700;
const EXIT_MS = 800;
const EASE = [0.65, 0, 0.35, 1] as const;
const BLOOM_EASE = [0.16, 1, 0.3, 1] as const;
const HEX = "0123456789abcdef";

const ROSES: Bloom[] = [
  { kind: "rose", x: "7%", y: "16%", size: 128, delay: 0.5, rotate: -16 },
  { kind: "rose", x: "90%", y: "84%", size: 132, delay: 0.9, rotate: -10 },
];

function Decode({ text, start, ms }: { text: string; start: number; ms: number }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + start;
    const tick = (now: number) => {
      if (now < t0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const locked = Math.floor(Math.min(1, (now - t0) / ms) * text.length);
      setShown(Array.from(text, (ch, i) => (i < locked || ch === "-" ? ch : HEX[(Math.floor(now / 30) + i * 5) % 16])).join(""));
      if (now - t0 < ms) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, start, ms]);
  return <>{shown}</>;
}

export function CinematicBootIntro({ kid, onLeave, onDone }: { kid: string | null; onLeave: () => void; onDone: () => void }) {
  const t = useOmniCopy().boot;
  const reduce = useReducedMotion() ?? false;
  const [leaving, setLeaving] = useState(false);
  // The roses unfurl petal by petal (many animated layers): worth it on a workstation, skipped on phones.
  const [wide, setWide] = useState(false);
  useEffect(() => setWide(window.matchMedia("(min-width: 768px)").matches), []);
  const left = useRef(false);

  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    setLeaving(true);
    onLeave();
    try {
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch {
      // Not remembered: it plays again next load.
    }
  }, [onLeave]);

  useEffect(() => {
    const timer = setTimeout(leave, reduce ? 600 : LEAVE_AT);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [leave, reduce]);

  // The hand-off runs on a timer matched to the exit, so a backgrounded window can't stall it.
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(onDone, reduce ? 200 : EXIT_MS);
    return () => clearTimeout(id);
  }, [leaving, onDone, reduce]);

  const diagnostics = [
    { text: t.enclave, at: 1.6 },
    { text: t.key, at: 2.05, decode: true },
    { text: t.noise, at: 2.5 },
    { text: t.online, at: 2.95, done: true },
  ];
  const rows = [14, 28, 42, 56, 70, 84];
  const cols = [10, 22, 34, 46, 58, 70, 82, 94];

  return (
    <motion.div
      className="xch-boot xch fixed inset-0 z-[100] cursor-pointer overflow-hidden"
      onClick={leave}
      role="presentation"
      initial={{ opacity: 1 }}
      // Scale and opacity only: a full-screen blur filter on the exit costs more than a frame on most hardware.
      animate={leaving ? { scale: reduce ? 1 : 1.1, opacity: 0 } : { scale: 1, opacity: 1 }}
      transition={{ duration: (reduce ? 200 : EXIT_MS) / 1000, ease: EASE }}
      style={{ willChange: "transform, opacity" }}
    >
      {/* Painterly depth: Canaletto's Venice, barely there, drifting in */}
      <motion.div className="absolute inset-0" initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 4.5, ease: BLOOM_EASE }}>
        <Image src="/paintings/venice-moonlight.jpg" alt="" fill priority sizes="100vw" quality={75} className="object-cover opacity-[0.17] saturate-[0.6]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(12,7,9,0.55),rgba(12,7,9,0.92))]" />
      </motion.div>

      {/* Velvety crimson glows, breathing */}
      <div className="xch-velvet pointer-events-none absolute -left-[15%] -top-[20%] h-[70vh] w-[70vw] rounded-full bg-[radial-gradient(closest-side,rgba(225,29,72,0.20),transparent)]" />
      <div className="xch-velvet pointer-events-none absolute -bottom-[25%] -right-[10%] h-[75vh] w-[65vw] rounded-full bg-[radial-gradient(closest-side,rgba(225,29,72,0.16),transparent)] [animation-delay:-3.5s]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(240,190,110,0.08),transparent)]" />

      {/* Rose-gold hairlines drawn across the canvas */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {rows.map((y, i) => (
          <line key={`r${y}`} x1={0} x2={100} y1={y} y2={y} pathLength={1} className="xch-draw" stroke="rgba(240,213,154,0.16)" strokeWidth={1} vectorEffect="non-scaling-stroke" style={{ animationDelay: `${0.2 + i * 0.09}s` }} />
        ))}
        {cols.map((x, i) => (
          <line key={`c${x}`} x1={x} x2={x} y1={0} y2={100} pathLength={1} className="xch-draw" stroke="rgba(240,213,154,0.10)" strokeWidth={1} vectorEffect="non-scaling-stroke" style={{ animationDelay: `${0.35 + i * 0.07}s` }} />
        ))}
      </svg>

      {wide && <FloraField blooms={ROSES} className="opacity-90" />}

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <motion.p className="font-mono text-[10px] uppercase tracking-[0.36em] text-[#f0d59a]/80" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.6 }}>
          {t.lab}
        </motion.p>
        {/* The emblem blooms in: soft and unfocused, then sharp, like paint settling */}
        <motion.div className="mt-6 text-6xl drop-shadow-[0_10px_34px_rgb(0_0_0/0.85)] sm:text-8xl" initial={{ opacity: 0, scale: 0.9, filter: "blur(14px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 1.5, delay: 0.9, ease: BLOOM_EASE }}>
          <BloomWordmark />
        </motion.div>
        <motion.p className="xch-gold-italic -mt-1 text-[40px] leading-none sm:text-[56px]" initial={{ opacity: 0, y: 10, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 1.2, delay: 1.35, ease: BLOOM_EASE }}>
          {t.product}
        </motion.p>
        <motion.p className="mt-3 font-mono text-[11px] uppercase tracking-[0.3em] text-[#f6ead2]/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.7 }}>
          {t.tagline}
        </motion.p>

        <div className="mt-8 w-[min(440px,88vw)] space-y-1.5 text-start font-mono text-[11.5px]" dir="ltr">
          {diagnostics.map((d) => (
            <motion.p key={d.text} className="flex items-baseline gap-2" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: d.at, ease: BLOOM_EASE }}>
              <span className={d.done ? "text-[#e9c77b]" : "text-[#e11d48]"}>{d.done ? "✓" : "›"}</span>
              <span className={d.done ? "text-[#e9c77b]" : "text-[#f1ede8]/75"}>{d.text}</span>
              {d.decode && (
                <span className="text-[#e9c77b]/90">
                  <Decode text={kid ?? "bxk-0000000000000000"} start={d.at * 1000} ms={380} />
                </span>
              )}
              {!d.done && (
                <motion.span className="ms-auto text-[#e9c77b]/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d.at + 0.38, duration: 0.2 }}>
                  ok
                </motion.span>
              )}
            </motion.p>
          ))}
        </div>

        {/* The hold, made visible: a rose-gold hairline across the boot */}
        <motion.span aria-hidden className="mt-7 block h-px w-48 origin-left bg-gradient-to-r from-transparent via-[#f0d59a]/80 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: LEAVE_AT / 1000, ease: "linear" }} />
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          leave();
        }}
        className="absolute bottom-5 end-5 rounded-full border border-[rgba(240,213,154,0.22)] bg-black/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#f1ede8]/70 transition-colors hover:text-[#f1ede8]"
      >
        {t.skip} · Esc
      </button>
    </motion.div>
  );
}
