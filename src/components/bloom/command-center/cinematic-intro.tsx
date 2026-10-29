"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FloraField, type Bloom } from "../art/flora";
import { PaintingCanvas, PaintingCaption } from "../art/painting-canvas";
import { Particles } from "../art/particles";
import { RoseFrame } from "../art/rose-frame";
import { BloomWordmark } from "../logo";

/** Long enough for the cascade to reach the bottom corners and all eight roses to open. */
export const INTRO_HOLD_MS = 6400;
export const INTRO_EXIT_S = 1.8;

const EASE = [0.65, 0, 0.35, 1] as const;
const v = (vars: Record<string, string>) => vars as CSSProperties;

// Without WebGL2, the same eight roses as SVG at the cascade's bloom points, opening top to bottom.
const FALLBACK_ROSES: Bloom[] = [
  { kind: "rose", x: "30%", y: "16%", size: 92, delay: 0.6, rotate: -10 },
  { kind: "rose", x: "70%", y: "16%", size: 92, delay: 0.75, rotate: 10 },
  { kind: "rose", x: "9%", y: "20%", size: 120, delay: 0.4, rotate: -16 },
  { kind: "rose", x: "91%", y: "22%", size: 120, delay: 0.5, rotate: 16 },
  { kind: "rose", x: "5%", y: "52%", size: 110, delay: 1.2, rotate: -6 },
  { kind: "rose", x: "95%", y: "54%", size: 110, delay: 1.35, rotate: 6 },
  { kind: "rose", x: "16%", y: "90%", size: 120, delay: 2.0, rotate: 12 },
  { kind: "rose", x: "84%", y: "90%", size: 120, delay: 2.15, rotate: -12 },
];

type Bolt = { k: number; x: number; y: number };

/** Lightning at randomized intervals, striking somewhere in the storm clouds. */
function useLightning(enabled: boolean) {
  const [bolt, setBolt] = useState<Bolt | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout>;
    let k = 0;
    const schedule = (first = false) => {
      t = setTimeout(() => {
        setBolt({ k: ++k, x: 18 + Math.random() * 68, y: 8 + Math.random() * 26 });
        schedule();
      }, first ? 700 + Math.random() * 900 : 1600 + Math.random() * 3600);
    };
    schedule(true);
    return () => clearTimeout(t);
  }, [enabled]);
  return bolt;
}

/**
 * The opening: Vernet's Shipwreck in full weather (random lightning, rain, fog banks, wind-blown spray,
 * the canvas riding the swell) while the homepage's 3D rose garden grows down from the top edge in
 * heavy canes and opens eight roses around the frame. Then the camera zooms through and blurs out.
 */
export function CinematicIntro({ leaving, onSkip, onExited }: { leaving: boolean; onSkip: () => void; onExited: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const bolt = useLightning(!reduce && !leaving);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter" || e.key === " ") && onSkip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] cursor-pointer overflow-hidden bg-ink"
      onClick={onSkip}
      initial={{ opacity: 1 }}
      animate={leaving ? { scale: reduce ? 1 : 1.32, opacity: 0, filter: reduce ? "blur(0px)" : "blur(18px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: reduce ? 0.5 : INTRO_EXIT_S, ease: EASE }}
      onAnimationComplete={() => leaving && onExited()}
      style={{ willChange: "transform, filter, opacity" }}
      role="presentation"
    >
      {/* The painting and its weather */}
      <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}>
        <PaintingCanvas painting="storm" priority />
        {bolt && (
          <div key={bolt.k} aria-hidden className="pointer-events-none absolute inset-0">
            <div className="animate-cc-flash absolute inset-0 mix-blend-screen" style={{ background: `radial-gradient(38% 42% at ${bolt.x}% ${bolt.y}%, rgb(255 226 180 / 0.95), rgb(200 210 255 / 0.25) 45%, transparent 72%)` }} />
            <div className="animate-cc-flash absolute inset-0 bg-[#c8d2ff]/10 mix-blend-screen" />
          </div>
        )}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { top: "6%", h: "30%", speed: "44s", delay: "-6s", o: 0.18 },
            { top: "52%", h: "20%", speed: "36s", delay: "-18s", o: 0.2 },
            { top: "70%", h: "26%", speed: "30s", delay: "-3s", o: 0.24 },
          ].map((m, i) => (
            <div
              key={i}
              className="animate-art-mist absolute -left-1/4 w-[150%] blur-2xl"
              style={v({ top: m.top, height: m.h, "--mist-speed": m.speed, "--mist-delay": m.delay, background: `radial-gradient(50% 50% at 50% 50%, rgb(214 222 228 / ${m.o}), transparent 70%)` })}
            />
          ))}
        </div>
        <Particles mode="spray" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgb(8_4_12/0.6),rgb(8_4_12/0.1)_80%)]" />
      </motion.div>

      {/* The cascade: canes anchored above the top edge, eight roses framing the canvas */}
      <RoseFrame layout="cascade" fallback={<FloraField blooms={FALLBACK_ROSES} />} />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
        <motion.p
          className="font-mono text-[10px] uppercase tracking-[0.36em] text-[#f0d59a]/80"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.6 }}
        >
          Engine Nº 04 <span className="mx-2 text-white/30">—</span> IntentPulse
        </motion.p>
        <motion.div
          className="mt-6 flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-6xl drop-shadow-[0_8px_30px_rgb(0_0_0/0.85)] sm:text-8xl">
            <BloomWordmark />
          </p>
          <p className="mt-4 font-display text-lg italic text-[#f6ead2]/85 drop-shadow-[0_2px_12px_rgb(0_0_0/0.8)] sm:text-2xl">The IntentPulse Command Center</p>
        </motion.div>
        <motion.p
          className="mt-10 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: leaving ? 0 : 1 }}
          transition={{ duration: 0.8, delay: leaving ? 0 : 2.4 }}
        >
          Click or press Enter to skip
        </motion.p>
      </div>

      <PaintingCaption painting="storm" className="absolute bottom-5 right-4 text-right sm:right-8" />
    </motion.div>
  );
}
