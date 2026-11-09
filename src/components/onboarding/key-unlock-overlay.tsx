"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import type { BloomLicensePayload } from "@/lib/licensing/types";
import { sanitizeTheme } from "@/lib/licensing/codec";
import { KeyRoleBadge } from "@/components/control-plane/key-badge";
import { useOnboardingCopy } from "./copy";
import { isWizardDone, UNLOCK_EVENT, wizardFor } from "./wizard-state";

const DURATION_MS = 900;

/** A burst of particles sweeping across the screen in the key's accent, drawn on a canvas for 0.9 s. */
function ParticleSweep({ color }: { color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);
    const parts = Array.from({ length: 220 }, () => ({ y: Math.random() * h, speed: 0.6 + Math.random() * 1.4, size: (0.6 + Math.random() * 2.2) * dpr, lag: Math.random() * 0.35, tail: 30 + Math.random() * 140 }));
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12 * dpr;
      for (const p of parts) {
        const local = Math.max(0, (t - p.lag) / (1 - p.lag));
        const x = -p.tail * dpr + local * p.speed * (w + p.tail * dpr * 2);
        ctx.globalAlpha = Math.sin(local * Math.PI) * 0.9;
        ctx.fillRect(x - p.tail * dpr, p.y, p.tail * dpr, p.size);
      }
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

/**
 * The key unlock reveal. Mounted once in the root layout; plays for 0.9 s whenever an access key is activated
 * (setup, Settings, anywhere): a particle sweep and a glass morph across the whole screen, a high-energy border
 * glow in the key's tier accent, and the role badge revealed in the centre. The tier theme morphs underneath in
 * the same beat. Afterwards a key that has not finished its guided setup is taken to it.
 */
export function KeyUnlockOverlay() {
  const c = useOnboardingCopy().unlock;
  const reduce = useReducedMotion();
  const router = useRouter();
  const path = usePathname();
  const [key, setKey] = useState<BloomLicensePayload | null>(null);
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    const onUnlock = (e: Event) => {
      const access = (e as CustomEvent<BloomLicensePayload>).detail;
      setKey(access);
      setTimeout(() => {
        setKey(null);
        if (wizardFor(access) && !isWizardDone(access.keyId) && pathRef.current !== "/setup") router.push("/setup");
      }, DURATION_MS);
    };
    window.addEventListener(UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(UNLOCK_EVENT, onUnlock);
  }, [router]);

  const accent = key ? sanitizeTheme(key.themeConfig).accentColor : "#00F0FF";

  return (
    <AnimatePresence>
      {key && (
        <motion.div
          key={key.keyId}
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(22px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: reduce ? 0.15 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: "radial-gradient(ellipse at center, rgba(7, 8, 12, 0.72), rgba(7, 8, 12, 0.92))" }}
        >
          {!reduce && <ParticleSweep color={accent} />}
          {/* High-energy border glow in the tier accent. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ boxShadow: `inset 0 0 0 0 ${accent}00` }}
            animate={{ boxShadow: [`inset 0 0 0 0 ${accent}00`, `inset 0 0 0 3px ${accent}, inset 0 0 120px 10px ${accent}88`, `inset 0 0 0 1px ${accent}aa, inset 0 0 60px 0 ${accent}44`] }}
            transition={{ duration: DURATION_MS / 1000, times: [0, 0.4, 1] }}
          />
          <motion.div
            className="relative flex flex-col items-center gap-3 text-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.86, filter: "blur(10px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: reduce ? 0 : 0.18, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: accent, textShadow: `0 0 16px ${accent}` }}>
              <ShieldCheck className="size-4" /> {c.granted}
            </span>
            <KeyRoleBadge role={key.role} size="lg" className="text-[15px]" />
            <span className="text-[13px] text-white/60">{c.welcome(key.holderName)}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
