"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { FloraField, type Bloom } from "@/components/bloom/art/flora";
import { PaintingCanvas, PaintingCaption } from "@/components/bloom/art/painting-canvas";
import { Particles } from "@/components/bloom/art/particles";
import { RoseFrame } from "@/components/bloom/art/rose-frame";
import { BloomWordmark } from "@/components/bloom/logo";
import { markDesktopApp } from "./desktop-env";

/** The entrance holds for three seconds, then zooms through into the workspace. */
const HOLD_MS = 3000;
const EXIT_S = 1.1;
const EASE = [0.65, 0, 0.35, 1] as const;

// Without WebGL2, SVG roses at the cascade's bloom points, timed to open inside the three-second hold.
const FALLBACK_ROSES: Bloom[] = [
  { kind: "rose", x: "9%", y: "20%", size: 120, delay: 0.2, rotate: -16 },
  { kind: "rose", x: "91%", y: "22%", size: 120, delay: 0.3, rotate: 16 },
  { kind: "rose", x: "30%", y: "14%", size: 90, delay: 0.5, rotate: -10 },
  { kind: "rose", x: "70%", y: "14%", size: 90, delay: 0.6, rotate: 10 },
  { kind: "rose", x: "5%", y: "54%", size: 110, delay: 0.9, rotate: -6 },
  { kind: "rose", x: "95%", y: "54%", size: 110, delay: 1.0, rotate: 6 },
  { kind: "rose", x: "16%", y: "90%", size: 120, delay: 1.4, rotate: 12 },
  { kind: "rose", x: "84%", y: "90%", size: 120, delay: 1.5, rotate: -12 },
];

/**
 * The desktop app's launch sequence, built from the homepage hero's own layers: Vernet's storm on the
 * living canvas, wind-blown spray, the 3D rose cascade blooming around the frame, and the silver Bloom
 * emblem in the wordmark. Three seconds in, it zooms through into the unified workspace at /desk.
 */
export function CinematicIntro() {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  const leave = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    // The desktop shell opens /launch?app=desktop; remember that for the session so the site hides its download CTAs.
    if (new URLSearchParams(window.location.search).get("app") === "desktop") markDesktopApp();
    router.prefetch("/desk");
    const t = setTimeout(leave, HOLD_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [router, leave]);

  // The handoff runs on a timer matched to the exit, not on the animation callback, so it can't stall
  // (reduced motion, a backgrounded window, an interrupted animation).
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      router.replace("/desk");
    }, (reduce ? 0.4 : EXIT_S) * 1000);
    return () => clearTimeout(t);
  }, [leaving, reduce, router]);

  return (
    <motion.div
      className="fixed inset-0 cursor-pointer overflow-hidden bg-ink"
      onClick={leave}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={leaving ? { scale: reduce ? 1 : 1.25, opacity: 0, filter: reduce ? "blur(0px)" : "blur(16px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: leaving ? (reduce ? 0.4 : EXIT_S) : 0.6, ease: EASE }}
      style={{ willChange: "transform, filter, opacity" }}
    >
      {/* Vernet's storm, alive, exactly as the homepage hero paints it */}
      <motion.div className="absolute inset-0" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 2.6, ease: [0.16, 1, 0.3, 1] }}>
        <PaintingCanvas painting="storm" priority />
        <Particles mode="spray" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgb(8_4_12/0.6),rgb(8_4_12/0.12)_80%)]" />
      </motion.div>

      {/* The homepage's 3D rose cascade, blooming around the frame */}
      <RoseFrame layout="cascade" fallback={<FloraField blooms={FALLBACK_ROSES} />} />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <motion.p
          className="font-mono text-[10px] uppercase tracking-[0.36em] text-[#f0d59a]/80"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
        >
          Nº 001 <span className="mx-2 text-white/30">—</span> The Bloom AI Laboratory
        </motion.p>
        <motion.p
          className="mt-6 text-7xl drop-shadow-[0_8px_30px_rgb(0_0_0/0.85)] sm:text-8xl"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.3, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <BloomWordmark />
        </motion.p>
        <motion.p
          className="mt-4 font-display text-xl italic text-[#f6ead2]/85 drop-shadow-[0_2px_12px_rgb(0_0_0/0.8)] sm:text-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
        >
          Sovereign Operating Desk
        </motion.p>
        {/* A three-second hairline: the hold, made visible */}
        <motion.span
          aria-hidden
          className="mt-8 block h-px w-40 origin-left bg-gradient-to-r from-transparent via-[#f0d59a]/80 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: HOLD_MS / 1000, ease: "linear" }}
        />
      </div>

      <PaintingCaption painting="storm" className="absolute bottom-5 right-4 text-right sm:right-8" />
    </motion.div>
  );
}
