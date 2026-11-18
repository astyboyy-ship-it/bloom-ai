"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FloraField, type Bloom } from "@/components/bloom/art/flora";
import { BloomWordmark } from "@/components/bloom/logo";
import { useDeskCopy } from "./desk-copy";

export const INTRO_KEY = "bloom-exchange-intro";

/**
 * The garden at twilight, then dawn. A painterly Garden of Eden (deep greens over a graded garden painting),
 * fireflies drifting on a canvas, vines drawing themselves up from the corners, roses unfurling, and the Bloom
 * wordmark with the line "Intent, not noise." At ~3.9s a dawn of white light opens from the centre and becomes
 * the luminous desk underneath. Esc, Enter, a click or Skip go straight to dawn. Once per session; reduced
 * motion skips it entirely.
 */
const DAWN_AT = 3900;
const DAWN_MS = 750;
const EASE = [0.16, 1, 0.3, 1] as const;

const ROSES: Bloom[] = [
  { kind: "rose", x: "9%", y: "82%", size: 120, delay: 0.7, rotate: -14 },
  { kind: "rose", x: "91%", y: "18%", size: 104, delay: 1.0, rotate: 12 },
  { kind: "rose", x: "84%", y: "88%", size: 76, delay: 1.3, rotate: -24 },
];

// Vines rise from the lower corners; leaves open along them once the stroke has passed.
const VINES = [
  { d: "M-20 1010 C 120 860 60 720 190 600 S 320 380 250 220", delay: 0.15 },
  { d: "M60 1030 C 220 900 300 820 360 690 S 420 520 520 470", delay: 0.45 },
  { d: "M1460 1030 C 1300 880 1380 740 1250 620 S 1120 420 1190 260", delay: 0.3 },
  { d: "M1380 1040 C 1240 930 1160 840 1100 720 S 1020 560 930 520", delay: 0.6 },
];
const LEAVES = [
  { x: 150, y: 690, r: -40, d: 1.1 },
  { x: 205, y: 560, r: 30, d: 1.35 },
  { x: 268, y: 330, r: -20, d: 1.6 },
  { x: 345, y: 720, r: 40, d: 1.3 },
  { x: 450, y: 495, r: -10, d: 1.7 },
  { x: 1300, y: 700, r: 35, d: 1.2 },
  { x: 1235, y: 520, r: -30, d: 1.45 },
  { x: 1180, y: 330, r: 20, d: 1.7 },
  { x: 1110, y: 740, r: -40, d: 1.4 },
  { x: 990, y: 545, r: 15, d: 1.8 },
];

/** Gold fireflies on a canvas: a few dozen soft points drifting and twinkling, capped DPR, paused when hidden. */
function Fireflies() {
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
    const n = w < 640 ? 22 : 42;
    const flies = Array.from({ length: n }, (_, i) => ({ x: Math.random() * w, y: h * (0.25 + Math.random() * 0.75), vx: (Math.random() - 0.5) * 0.25, vy: -0.08 - Math.random() * 0.22, r: 1 + Math.random() * 1.8, ph: (i / n) * Math.PI * 2, sp: 0.6 + Math.random() * 1.4 }));
    // One soft glow, rendered once; every firefly is a scaled, faded copy of it.
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const s = sprite.getContext("2d")!;
    const g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255, 226, 150, 0.95)");
    g.addColorStop(0.35, "rgba(240, 200, 110, 0.38)");
    g.addColorStop(1, "rgba(240, 200, 110, 0)");
    s.fillStyle = g;
    s.fillRect(0, 0, 64, 64);
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const f of flies) {
        f.x += f.vx + Math.sin(t * 0.7 + f.ph) * 0.15;
        f.y += f.vy;
        if (f.y < -10) {
          f.y = h + 10;
          f.x = Math.random() * w;
        }
        ctx.globalAlpha = 0.25 + 0.75 * Math.max(0, Math.sin(t * f.sp + f.ph));
        const size = f.r * 12;
        ctx.drawImage(sprite, f.x - size / 2, f.y - size / 2, size, size);
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
  const [wide, setWide] = useState(false);
  const done = useRef(false);

  useEffect(() => setWide(window.matchMedia("(min-width: 768px)").matches), []);

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
    <div className="xch-intro fixed inset-0 z-[130] cursor-pointer overflow-hidden bg-[#0b1a12]" onClick={toDawn} role="presentation" dir="ltr">
      {/* Twilight over the garden painting */}
      <motion.div className="absolute inset-0 will-change-[opacity]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.8, ease: EASE }}>
        <Image src="/paintings/villa-deste.jpg" alt="" fill priority sizes="100vw" quality={75} className="object-cover opacity-[0.42] saturate-[0.35]" />
        <div className="absolute inset-0 bg-[radial-gradient(85%_70%_at_50%_45%,rgba(37,72,48,0.35),rgba(11,26,18,0.88)_70%,#07120c)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_35%_at_50%_42%,rgba(226,191,120,0.16),transparent_70%)]" />
      </motion.div>

      <Fireflies />

      {/* Vines and leaves */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {VINES.map((v) => (
          <path key={v.d} d={v.d} pathLength={1} className="xch-draw" fill="none" stroke="rgba(150,184,128,0.55)" strokeWidth={2.2} strokeLinecap="round" style={{ animationDelay: `${v.delay}s`, animationDuration: "2.2s" }} />
        ))}
        {LEAVES.map((l) => (
          <motion.ellipse key={`${l.x}-${l.y}`} cx={l.x} cy={l.y} rx={15} ry={6} fill="rgba(122,160,104,0.6)" transform={`rotate(${l.r} ${l.x} ${l.y})`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, delay: l.d, ease: EASE }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
        ))}
      </svg>

      {/* Roses arrive fully open: the petal-by-petal unfurl costs too many frames at full screen. */}
      <motion.div className="pointer-events-none absolute inset-0" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.6, delay: 0.6, ease: EASE }}>
        <FloraField blooms={wide ? ROSES : ROSES.slice(0, 2)} className="opacity-95" still />
      </motion.div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <motion.div className="text-6xl sm:text-8xl" initial={{ opacity: 0, scale: 0.92, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.7, ease: EASE }}>
          <BloomWordmark />
        </motion.div>
        <motion.p className="xch-gold-italic mt-1 text-[44px] leading-none sm:text-[60px] [background:linear-gradient(100deg,#f6e3b4,#e2bf78_45%,#c9954a)] [-webkit-background-clip:text] [background-clip:text]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 1.15, ease: EASE }}>
          Exchange
        </motion.p>
        <motion.p className="xch-display mt-6 text-[26px] text-[#f0ece0] sm:text-[34px]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.9, ease: EASE }}>
          {t.line}
        </motion.p>
        <motion.p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.3em] text-[rgba(240,236,224,0.6)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 2.4 }}>
          {t.sub}
        </motion.p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toDawn();
        }}
        className="absolute bottom-5 end-5 rounded-full border border-[rgba(226,191,120,0.3)] bg-black/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(240,236,224,0.75)] transition-colors hover:text-white"
      >
        {t.skip} · Esc
      </button>

      {/* Dawn: white light opens from the centre and becomes the desk */}
      {dawn && <motion.div className="pointer-events-none absolute left-1/2 top-1/2 size-[260vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,#fdfcfa_62%,rgba(253,252,250,0.6)_80%,rgba(253,252,250,0))]" initial={{ scale: 0, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: DAWN_MS / 1000, ease: [0.65, 0, 0.35, 1] }} aria-hidden />}
    </div>
  );
}
