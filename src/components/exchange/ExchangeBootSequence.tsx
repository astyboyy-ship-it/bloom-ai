"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useExchangeCopy } from "./copy";

/**
 * The 1.6s opening: a key-pair handshake pulse (0–0.55s), Party A and Party B converging on a meridian and locking
 * into the double-blind enclave (0.3–0.95s), then a 0.9s glass dissolve into the command surface (0.7–1.6s).
 * Only transform, opacity and filter animate, so it stays on the compositor. The page shows it once per session.
 */
export const BOOT_KEY = "bloom-exchange-booted";
const EASE = [0.22, 1, 0.36, 1] as const;
const HEX = "0123456789abcdef";

function Scramble({ length, until }: { length: number; until: number }) {
  const [text, setText] = useState(() => "·".repeat(length));
  useEffect(() => {
    let seed = 0x2f6b;
    const started = performance.now();
    const id = setInterval(() => {
      const done = performance.now() - started > until;
      setText(
        Array.from({ length }, (_, i) => {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          return done ? "9f3c7e1a5b2d8064e7c19a3f5d2b8e60"[i % 32] : HEX[seed % 16];
        }).join(""),
      );
      if (done) clearInterval(id);
    }, 38);
    return () => clearInterval(id);
  }, [length, until]);
  return <>{text}</>;
}

function Node({ side, label }: { side: "a" | "b"; label: string }) {
  const from = side === "a" ? -190 : 190;
  const to = side === "a" ? -44 : 44;
  return (
    <motion.div className="absolute left-1/2 top-1/2" initial={{ x: from, y: "-50%", opacity: 0 }} animate={{ x: to, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6, ease: EASE }}>
      <div className="relative -translate-x-1/2">
        <span className="block size-3.5 rounded-full border border-white/70 bg-[#09090b]" style={{ boxShadow: "0 0 18px rgba(52,245,181,0.45)" }} />
        <span className={`absolute top-6 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.2em] text-white/45 ${side === "a" ? "right-0" : "left-0"}`}>{label}</span>
      </div>
    </motion.div>
  );
}

export function ExchangeBootSequence({ onDone }: { onDone: () => void }) {
  const t = useExchangeCopy().boot;
  const finish = () => {
    try {
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch {
      // Not remembered: it plays again on the next load, nothing else changes.
    }
    onDone();
  };

  return (
    <motion.div
      className="xch-boot fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      initial={{ backgroundColor: "rgba(9,9,11,1)", backdropFilter: "blur(28px)", opacity: 1 }}
      animate={{ backgroundColor: "rgba(9,9,11,0)", backdropFilter: "blur(0px)", opacity: 0 }}
      transition={{ delay: 0.7, duration: 0.9, ease: EASE }}
      onAnimationComplete={finish}
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="bloom-noise h-full w-full" />
      </div>
      <motion.div className="relative h-[260px] w-[min(560px,92vw)]" initial={{ scale: 1 }} animate={{ scale: 1.06 }} transition={{ delay: 0.7, duration: 0.9, ease: EASE }}>
        {/* Handshake pulse */}
        {[0, 0.12, 0.24].map((d) => (
          <motion.span
            key={d}
            className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ borderColor: "color-mix(in srgb, var(--xch-emerald, #34f5b5) 55%, transparent)" }}
            initial={{ scale: 0.15, opacity: 0.8 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ delay: d, duration: 0.75, ease: "easeOut" }}
          />
        ))}

        {/* Meridian between the two parties */}
        <motion.span className="absolute left-1/2 top-1/2 h-px w-[88px] -translate-x-1/2 origin-center" style={{ background: "linear-gradient(90deg, transparent, var(--xch-emerald, #34f5b5), transparent)" }} initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ delay: 0.55, duration: 0.35, ease: EASE }} />
        <Node side="a" label={t.partyA} />
        <Node side="b" label={t.partyB} />

        {/* Enclave lock */}
        <svg viewBox="-60 -60 120 120" className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 overflow-visible">
          <motion.path d="M0 -52 L45 -26 L45 26 L0 52 L-45 26 L-45 -26 Z" fill="none" stroke="#34f5b5" strokeWidth={1} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 0.75] }} transition={{ delay: 0.62, duration: 0.38, ease: EASE }} style={{ filter: "drop-shadow(0 0 6px rgba(52,245,181,0.6))" }} />
        </svg>

        <div className="absolute inset-x-0 top-2 text-center">
          <motion.p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {t.handshake}
          </motion.p>
          <motion.p className="mt-1.5 text-[var(--xch-emerald,#34f5b5)] font-mono text-[12.5px] tracking-[0.22em]" initial={{ opacity: 0, letterSpacing: "0.5em" }} animate={{ opacity: 1, letterSpacing: "0.22em" }} transition={{ delay: 0.05, duration: 0.45, ease: EASE }}>
            {t.protocol}
          </motion.p>
          <p className="mt-1 font-mono text-[9px] tracking-[0.12em] text-white/25" dir="ltr">
            ed25519 · <Scramble length={32} until={520} />
          </p>
        </div>
        <motion.p className="absolute inset-x-0 bottom-0 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-os-emerald/85" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.78, duration: 0.2 }}>
          {t.enclave}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
