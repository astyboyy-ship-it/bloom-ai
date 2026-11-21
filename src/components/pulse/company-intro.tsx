"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PaintingCanvas, PaintingCaption } from "@/components/bloom/art/painting-canvas";
import { Particles } from "@/components/bloom/art/particles";
import { BloomWordmark } from "@/components/bloom/logo";
import { useOnboardingCopy } from "@/components/onboarding/copy";
import { BrandLogo } from "./brand-logo";
import { brandOf, type Company } from "./companies";
import { useShowcase } from "./use-desktop";
import { CompanyScene } from "./company-scenes";

const HOLD_MS = 4200;
const EXIT_S = 1.0;
const EASE = [0.65, 0, 0.35, 1] as const;

/**
 * A company's cinematic entrance, in the same language as the Bloom AI launch intro: the company's painting alive
 * on the canvas, its scene drawn in light in the brand's color, then the lockup (the Bloom wordmark × the
 * company's mark). It holds a few seconds and zooms through into the page. Click or any key skips it.
 */
export function CompanyIntro({ company, onDone }: { company: Company; onDone: () => void }) {
  const c = useOnboardingCopy().pulse.company;
  const reduce = useReducedMotion() ?? false;
  const brand = brandOf(company, useShowcase());
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const leave = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    const t = setTimeout(leave, reduce ? 1600 : HOLD_MS);
    const onKey = () => leave();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [leave, reduce]);

  // The handoff runs on a timer matched to the exit, so it can't stall on an interrupted animation.
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      onDone();
    }, (reduce ? 0.35 : EXIT_S) * 1000);
    return () => clearTimeout(t);
  }, [leaving, reduce, onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[90] cursor-pointer overflow-hidden bg-ink"
      onClick={leave}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={leaving ? { scale: reduce ? 1 : 1.22, opacity: 0, filter: reduce ? "blur(0px)" : "blur(14px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: leaving ? (reduce ? 0.35 : EXIT_S) : 0.5, ease: EASE }}
      style={{ willChange: "transform, filter, opacity" }}
    >
      {/* The company's painting, alive */}
      <motion.div className="absolute inset-0" initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}>
        <PaintingCanvas painting={company.painting} priority />
        <Particles mode="spray" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgb(7_8_12/0.72),rgb(7_8_12/0.35)_70%,rgb(7_8_12/0.85))]" />
      </motion.div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <motion.p className="font-mono text-[10px] uppercase tracking-[0.36em] text-[#f0d59a]/85" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
          {c.presents}
        </motion.p>

        {/* The company's scene, drawn in light */}
        <div className="mt-4 w-[min(760px,92vw)]">
          <CompanyScene id={company.id} color={brand.color} reduce={reduce} />
        </div>

        {/* The lockup */}
        <motion.div className="mt-2 flex items-center gap-4 sm:gap-6" initial={{ opacity: 0, y: 14, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, delay: reduce ? 0.2 : 2.2, ease: [0.16, 1, 0.3, 1] }}>
          <span className="text-5xl drop-shadow-[0_6px_24px_rgb(0_0_0/0.85)] sm:text-6xl">
            <BloomWordmark />
          </span>
          <span className="font-mono text-2xl text-white/45">×</span>
          <span className="flex items-center gap-3">
            <BrandLogo company={company} size={56} />
            <span className="text-2xl font-semibold tracking-tight text-white drop-shadow-[0_4px_18px_rgb(0_0_0/0.9)] sm:text-3xl">{brand.name}</span>
          </span>
        </motion.div>
        <motion.p className="mt-4 font-mono text-[12px] uppercase tracking-[0.3em] text-[#f6ead2]/85 drop-shadow-[0_2px_12px_rgb(0_0_0/0.8)] sm:text-[13px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: reduce ? 0.3 : 2.6 }}>
          {c.operations(brand.name)}
        </motion.p>
        <motion.span aria-hidden className="mt-6 block h-px w-44 origin-left bg-gradient-to-r from-transparent via-[#f0d59a]/80 to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: (reduce ? 1600 : HOLD_MS) / 1000, ease: "linear" }} />
        <motion.p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.24em] text-white/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          {c.skip}
        </motion.p>
      </div>

      <PaintingCaption painting={company.painting} className="absolute bottom-5 right-4 text-right sm:right-8" />
    </motion.div>
  );
}
