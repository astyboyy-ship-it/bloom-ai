"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { BloomWordmark } from "@/components/bloom/logo";
import { useDeskCopy } from "./desk-copy";

export const INTRO_KEY = "bloom-exchange-intro";

/**
 * The garden at twilight, then dawn. A real oil painting of a garden, graded to twilight olive and settling slowly
 * into place (one compositor transform), fine gold filigree drawing itself up from the corners, a few points of
 * luminescence drifting on a canvas, a varnish-deep vignette, and the Bloom wordmark with "Intent, not noise."
 * At ~3.9s a dawn of parchment light opens from the centre and becomes the desk underneath. Esc, Enter, a click or
 * Skip go straight to dawn. Once per session; reduced motion skips it entirely (see exchange-app).
 */
const DAWN_AT = 3900;
const DAWN_MS = 850;
const EASE = [0.16, 1, 0.3, 1] as const;

// Filigree: hairline gold tendrils rising from the lower corners, each with a curl.
const FILIGREE = [
  { d: "M-20 1010 C 120 860 60 720 190 600 S 320 380 250 220 C 232 180 270 160 284 190", delay: 0.2 },
  { d: "M60 1030 C 220 900 300 820 360 690 S 420 520 520 470 C 552 456 560 488 538 494", delay: 0.55 },
  { d: "M1460 1030 C 1300 880 1380 740 1250 620 S 1120 420 1190 260 C 1206 222 1170 206 1158 234", delay: 0.35 },
  { d: "M1380 1040 C 1240 930 1160 840 1100 720 S 1020 560 930 520 C 900 508 892 538 914 546", delay: 0.7 },
];

/** Luminescence on a canvas: a few soft points drifting upward and breathing; one pre-rendered glow, capped DPR. */
function Luminescence() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const n = w < 640 ? 14 : 26;
    const motes = Array.from({ length: n }, (_, i) => ({ x: Math.random() * w, y: h * (0.3 + Math.random() * 0.7), vx: (Math.random() - 0.5) * 0.12, vy: -0.04 - Math.random() * 0.12, r: 0.8 + Math.random() * 1.3, ph: (i / n) * Math.PI * 2, sp: 0.35 + Math.random() * 0.7 }));
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const s = sprite.getContext("2d")!;
    const g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(246, 224, 170, 0.85)");
    g.addColorStop(0.3, "rgba(214, 180, 112, 0.3)");
    g.addColorStop(1, "rgba(214, 180, 112, 0)");
    s.fillStyle = g;
    s.fillRect(0, 0, 64, 64);
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      // Fade the whole field in over the first second and a half.
      const fade = Math.min(1, t / 1.5);
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx + Math.sin(t * 0.45 + m.ph) * 0.08;
        m.y += m.vy;
        if (m.y < -10) {
          m.y = h + 10;
          m.x = Math.random() * w;
        }
        ctx.globalAlpha = fade * (0.15 + 0.6 * (0.5 + 0.5 * Math.sin(t * m.sp + m.ph)));
        const size = m.r * 12;
        ctx.drawImage(sprite, m.x - size / 2, m.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}

export function GardenIntro({ onDone }: { onDone: () => void }) {
  const t = useDeskCopy().intro;
  const [dawn, setDawn] = useState(false);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Plays again next load.
    }
    onDone();
  }, [onDone]);

  const toDawn = useCallback(() => setDawn(true), []);
  useEffect(() => {
    const timer = setTimeout(toDawn, DAWN_AT);
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter") && toDawn();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [toDawn]);
  useEffect(() => {
    if (!dawn) return;
    const id = setTimeout(finish, DAWN_MS);
    return () => clearTimeout(id);
  }, [dawn, finish]);

  return (
    <div className="xch-intro fixed inset-0 z-[130] cursor-pointer overflow-hidden bg-[#12150c]" onClick={toDawn} role="presentation" dir="ltr">
      {/* The painting, graded to twilight olive, settling into place */}
      <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2, ease: EASE }}>
        <div className="xch-settle absolute inset-0">
          <Image src="/paintings/villa-deste.jpg" alt="" fill priority sizes="100vw" quality={75} className="object-cover opacity-[0.55] saturate-[0.45] sepia-[0.35]" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(80%_65%_at_50%_42%,rgba(58,66,41,0.25),rgba(24,28,16,0.78)_68%,#0d0f08)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40%_32%_at_50%_44%,rgba(214,180,112,0.14),transparent_72%)]" />
      </motion.div>

      <Luminescence />

      {/* Filigree */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {FILIGREE.map((v) => (
          <path key={v.d} d={v.d} pathLength={1} className="xch-draw" fill="none" stroke="rgba(214,180,112,0.38)" strokeWidth={0.9} strokeLinecap="round" style={{ animationDelay: `${v.delay}s` }} />
        ))}
      </svg>

      {/* Varnish */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_220px_60px_rgba(0,0,0,0.55)]" aria-hidden />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <motion.span className="block h-px w-40 origin-center bg-[linear-gradient(90deg,transparent,rgba(214,180,112,0.7),transparent)]" initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 1.6, delay: 0.4, ease: EASE }} aria-hidden />
        <motion.div className="mt-7 text-6xl sm:text-8xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.6, delay: 0.7, ease: EASE }}>
          <BloomWordmark />
        </motion.div>
        <motion.p className="xch-display mt-1 text-[44px] font-normal italic leading-none text-[#d9c08a] sm:text-[60px]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.3, delay: 1.15, ease: EASE }}>
          Exchange
        </motion.p>
        <motion.p className="xch-display mt-8 text-[28px] text-[#efe8d6] sm:text-[38px]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.3, delay: 1.9, ease: EASE }}>
          {t.line}
        </motion.p>
        <motion.p className="mt-3 font-mono text-[10px] uppercase tracking-[0.32em] text-[rgba(239,232,214,0.5)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 2.4 }}>
          {t.sub}
        </motion.p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toDawn();
        }}
        className="absolute bottom-5 end-5 rounded-[7px] border border-[rgba(214,180,112,0.28)] bg-black/25 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(239,232,214,0.7)] backdrop-blur-sm transition-colors hover:text-white"
      >
        {t.skip} · Esc
      </button>

      {/* Dawn: parchment light opens from the centre and becomes the desk */}
      {dawn && <motion.div className="pointer-events-none absolute left-1/2 top-1/2 size-[260vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,#f7f3ea_60%,rgba(247,243,234,0.6)_80%,rgba(247,243,234,0))]" initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: DAWN_MS / 1000, ease: [0.65, 0, 0.35, 1] }} aria-hidden />}
    </div>
  );
}
