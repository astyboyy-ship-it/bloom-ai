"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useOmniCopy } from "./omni-copy";

export const BOOT_KEY = "bloom-exchange-booted";
const EASE = [0.22, 1, 0.36, 1] as const;
const GLYPHS = "0123456789abcdef";

/** Monospaced decode: each position cycles hex glyphs and locks left to right onto the real value. */
function Decode({ text, ms }: { text: string; ms: number }) {
  const [shown, setShown] = useState(() => "·".repeat(text.length));
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const locked = Math.floor(Math.min(1, (now - t0) / ms) * text.length);
      setShown(Array.from(text, (ch, i) => (i < locked || ch === "-" ? ch : GLYPHS[(Math.floor(now / 28) + i * 5) % 16])).join(""));
      if (now - t0 < ms) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, ms]);
  return <>{shown}</>;
}

/**
 * The 1.2s cinematic entry. 0–0.45s: hairline grid lines snap into focus on a stagger. 0.25–0.7s: the signing key
 * initializes, decoding this deployment's real root key id. 0.75–1.2s: the overlay dissolves while the terminal
 * springs into place (150ms tension-damped spring, driven by the parent). Transform and opacity only.
 */
export function CinematicIntro({ kid, onDone }: { kid: string | null; onDone: () => void }) {
  const t = useOmniCopy().boot;
  const finish = () => {
    try {
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch {
      // Not remembered: it plays again next load.
    }
    onDone();
  };
  const rows = [12.5, 25, 37.5, 50, 62.5, 75, 87.5];
  const cols = [8.33, 16.67, 25, 33.33, 41.67, 50, 58.33, 66.67, 75, 83.33, 91.67];
  return (
    <motion.div className="xch-boot fixed inset-0 z-[100] overflow-hidden bg-[#09090b]" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.75, duration: 0.45, ease: EASE }} onAnimationComplete={finish} aria-hidden>
      <div className="absolute inset-0 [background:radial-gradient(60%_50%_at_50%_45%,rgba(52,245,181,0.07),transparent)]" />
      {rows.map((y, i) => (
        <span key={`r${y}`} className="xch-snap-x absolute inset-x-0 h-px bg-[rgba(52,245,181,0.10)]" style={{ top: `${y}%`, animationDelay: `${i * 35}ms` }} />
      ))}
      {cols.map((x, i) => (
        <span key={`c${x}`} className="xch-snap-y absolute inset-y-0 w-px bg-[rgba(52,245,181,0.07)]" style={{ insetInlineStart: `${x}%`, animationDelay: `${60 + i * 25}ms` }} />
      ))}
      <motion.div className="absolute left-1/2 top-1/2 w-[min(460px,88vw)] -translate-x-1/2 -translate-y-1/2" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: [0.96, 1, 1.03], opacity: [0, 1, 0] }} transition={{ duration: 1.15, times: [0, 0.4, 1], ease: EASE }}>
        <div className="rounded-[14px] border border-[rgba(52,245,181,0.35)] bg-[#0c0c0f]/90 p-5 font-mono text-[11px] leading-6 shadow-[0_0_60px_-20px_rgba(52,245,181,0.5)]" dir="ltr">
          <motion.p className="text-white/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12, duration: 0.15 }}>
            › {t.grid}
          </motion.p>
          <motion.p className="text-white/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.15 }}>
            › ed25519{" "}
            <span className="text-[#34f5b5]">
              <Decode text={kid ?? "bxk-0000000000000000"} ms={420} />
            </span>
          </motion.p>
          <motion.p className="text-white/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.15 }}>
            › {t.keys}
          </motion.p>
          <motion.p className="text-[#34f5b5]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.12 }}>
            ✓ {t.ready}
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}
