"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Code2, Zap } from "lucide-react";
import { MACRO_DOMAINS, PROTOCOL_REGISTRY, type MacroDomain } from "@/lib/exchange/omni-adapter";
import { useOmniCopy } from "./omni-copy";
import { Panel } from "./ui";

export const BOOT_KEY = "bloom-exchange-booted";
const EASE = [0.22, 1, 0.36, 1] as const;
const HEX = "0123456789abcdef";

function KeyScramble({ until }: { until: number }) {
  const [text, setText] = useState("0".repeat(24));
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const locked = Math.floor(Math.min(1, (now - t0) / until) * 24);
      setText(Array.from({ length: 24 }, (_, i) => (i < locked ? "7a3f9c1e5b2d8064e7c19a3f"[i] : HEX[(Math.floor(now / 30) + i * 5) % 16])).join(""));
      if (now - t0 < until) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [until]);
  return <>{text}</>;
}

/**
 * The 1.2s opening: hairline grid lines snap into focus on a stagger (0–0.45s), the signing keys initialize
 * (0.25–0.7s), then the overlay springs away to the terminal (0.75–1.2s). Transform and opacity only. Once per session.
 */
export function IntroBoot({ onDone }: { onDone: () => void }) {
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
      {rows.map((y, i) => (
        <span key={`r${y}`} className="xch-snap-x absolute inset-x-0 h-px bg-[rgba(52,245,181,0.10)]" style={{ top: `${y}%`, animationDelay: `${i * 35}ms` }} />
      ))}
      {cols.map((x, i) => (
        <span key={`c${x}`} className="xch-snap-y absolute inset-y-0 w-px bg-[rgba(52,245,181,0.07)]" style={{ insetInlineStart: `${x}%`, animationDelay: `${60 + i * 25}ms` }} />
      ))}
      <motion.div className="absolute left-1/2 top-1/2 w-[min(440px,88vw)] -translate-x-1/2 -translate-y-1/2" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: [0.96, 1, 1.03], opacity: [0, 1, 0] }} transition={{ duration: 1.15, times: [0, 0.4, 1], ease: EASE }}>
        <div className="rounded-[14px] border border-[rgba(52,245,181,0.35)] bg-[#0c0c0f]/90 p-5 font-mono text-[11px] leading-6 shadow-[0_0_60px_-20px_rgba(52,245,181,0.5)]">
          <motion.p className="text-white/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12, duration: 0.15 }}>
            › {t.grid}
          </motion.p>
          <motion.p className="text-white/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.15 }} dir="ltr">
            › ed25519 <span className="text-[var(--xch-emerald,#34f5b5)]"><KeyScramble until={420} /></span>
          </motion.p>
          <motion.p className="text-white/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.15 }}>
            › {t.keys}
          </motion.p>
          <motion.p className="text-[var(--xch-emerald,#34f5b5)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.12 }}>
            ✓ {t.ready}
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function IntroHero({ onInject, onSdk, onDomain }: { onInject: () => void; onSdk: () => void; onDomain: (d: MacroDomain) => void }) {
  const t = useOmniCopy();
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Panel className="relative overflow-hidden xl:col-span-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden />
        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--xch-emerald)]">{t.hero.kicker}</p>
          <h1 className="mt-3 max-w-2xl text-[28px] font-medium leading-[1.12] tracking-[-0.025em] text-white sm:text-[38px]">{t.hero.title}</h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-white/55">{t.hero.sub}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={onInject} className="group flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--xch-emerald)_45%,transparent)] bg-[color-mix(in_srgb,var(--xch-emerald)_10%,transparent)] px-3.5 py-2 text-[13px] text-[var(--xch-emerald)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--xch-emerald)_16%,transparent)]">
              <Zap className="size-3.5" /> {t.hero.inject}
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 rtl:rotate-180" />
            </button>
            <button type="button" onClick={onSdk} className="flex items-center gap-2 rounded-lg border border-[var(--xch-line-strong)] px-3.5 py-2 text-[13px] text-white/75 transition-colors duration-150 hover:bg-white/[0.04] hover:text-white">
              <Code2 className="size-3.5" /> {t.hero.sdk}
            </button>
          </div>
        </div>
      </Panel>

      <Panel className="xl:col-span-5">
        <p className="text-[13.5px] font-medium text-white">{t.hero.registry}</p>
        <p className="mt-1 text-[12px] text-white/45">{t.hero.registrySub}</p>
        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {MACRO_DOMAINS.map((d) => {
            const presets = PROTOCOL_REGISTRY.filter((p) => p.domain === d);
            return (
              <li key={d}>
                <button type="button" onClick={() => onDomain(d)} className="w-full rounded-[10px] border border-[var(--xch-line)] bg-black/20 px-3 py-2 text-start transition-colors duration-150 hover:border-[var(--xch-line-strong)] hover:bg-white/[0.025]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-white/85">{t.domains[d]}</span>
                    <span className="tnum font-mono text-[10px] text-[var(--xch-emerald)]">{presets.length}</span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-white/35" dir="ltr">
                    {presets.map((p) => p.label).join(" · ")}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
