"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloraField, type Bloom } from "../art/flora";
import { PaintingCanvas, PaintingCaption } from "../art/painting-canvas";
import { paintings, type PaintingKey } from "../art/paintings";
import { RoseFrame } from "../art/rose-frame";
import type { GardenPaletteName } from "../art/rose-vines-3d";
import { BloomWordmark } from "../logo";

export type StudioMeta = {
  index: "01" | "02" | "03";
  name: string;
  kicker: string;
  tagline: string;
  painting: PaintingKey;
  palette: GardenPaletteName;
  /** Accent used for active states in the app chrome. */
  accent: string;
};

const NAV = [
  { href: "/demo/engine-01", index: "01", label: "Aware Marketing" },
  { href: "/demo/engine-02", index: "02", label: "Infrastructure Architect" },
  { href: "/demo/engine-03", index: "03", label: "Shadow Workforce" },
  { href: "/demo/intentpulse", index: "04", label: "IntentPulse" },
];

export const HOLD_MS = 5600;
export const EXIT_S = 1.8;
const EASE = [0.65, 0, 0.35, 1] as const;

// Without WebGL2, eight SVG roses at the cascade's bloom points stand in for the 3D garden.
const FALLBACK: Bloom[] = [
  { kind: "rose", x: "30%", y: "15%", size: 88, delay: 0.6 },
  { kind: "rose", x: "70%", y: "15%", size: 88, delay: 0.75 },
  { kind: "rose", x: "9%", y: "20%", size: 116, delay: 0.4 },
  { kind: "rose", x: "91%", y: "22%", size: 116, delay: 0.5 },
  { kind: "rose", x: "5%", y: "52%", size: 104, delay: 1.2 },
  { kind: "rose", x: "95%", y: "54%", size: 104, delay: 1.35 },
  { kind: "rose", x: "16%", y: "90%", size: 116, delay: 2 },
  { kind: "rose", x: "84%", y: "90%", size: 116, delay: 2.15 },
];

/** The engine's painting alive under a top-down cascade of 3D roses in the engine's colourway. */
export function StudioIntro({ meta, leaving, onSkip, onExited }: { meta: StudioMeta; leaving: boolean; onSkip: () => void; onExited: () => void }) {
  const reduce = useReducedMotion() ?? false;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter" || e.key === " ") && onSkip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] cursor-pointer overflow-hidden bg-ink"
      onClick={onSkip}
      animate={leaving ? { scale: reduce ? 1 : 1.3, opacity: 0, filter: reduce ? "blur(0px)" : "blur(18px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: reduce ? 0.5 : EXIT_S, ease: EASE }}
      onAnimationComplete={() => leaving && onExited()}
      style={{ willChange: "transform, filter, opacity" }}
      role="presentation"
    >
      <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}>
        <PaintingCanvas painting={meta.painting} priority />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_50%,rgb(8_6_10/0.62),rgb(8_6_10/0.12)_80%)]" />
      </motion.div>
      <RoseFrame layout="cascade" palette={meta.palette} fallback={<FloraField blooms={FALLBACK} />} />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <motion.p className="font-mono text-[10px] uppercase tracking-[0.36em] text-white/70" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.6 }}>
          Engine Nº {meta.index} <span className="mx-2 text-white/30">—</span> {meta.kicker}
        </motion.p>
        <motion.div className="mt-6" initial={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 1.6, delay: 1, ease: [0.16, 1, 0.3, 1] }}>
          <p className="text-6xl drop-shadow-[0_8px_30px_rgb(0_0_0/0.85)] sm:text-8xl">
            <BloomWordmark />
          </p>
          <p className="mt-4 font-display text-lg italic text-white/85 drop-shadow-[0_2px_12px_rgb(0_0_0/0.8)] sm:text-2xl">{meta.name}</p>
        </motion.div>
        <motion.p className="mt-10 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: 0.8, delay: leaving ? 0 : 2.4 }}>
          Click or press Enter to skip
        </motion.p>
      </div>
      <PaintingCaption painting={meta.painting} className="absolute bottom-5 right-4 text-right sm:right-8" />
    </motion.div>
  );
}

/** The engine's painting as a quiet atmosphere under the obsidian app. */
export const Backdrop = memo(function Backdrop({ painting }: { painting: PaintingKey }) {
  return (
    <div className="fixed inset-0 -z-10 bg-[#0b0a0d]">
      <div className="absolute inset-0 opacity-[0.3]">
        <PaintingCanvas painting={painting} priority />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_10_13/0.55),rgb(11_10_13/0.25)_40%,rgb(11_10_13/0.75))]" />
    </div>
  );
});

export type Section = { href: string; label: string; hint: string; icon: LucideIcon };

/**
 * Persistent app shell for an engine's routes: painted backdrop, application bar, and a section
 * sidebar around the routed page. Lives in the engine's layout, so it (and the engine's state)
 * survives navigation between sections. The intro plays only when the engine's root URL is the
 * first page loaded; deep links and in-app navigation go straight to the workspace.
 */
export function EngineShell({ meta, base, sections, children }: { meta: StudioMeta; base: string; sections: Section[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const atRoot = pathname === base;
  const [phase, setPhase] = useState<"playing" | "leaving" | "done">(atRoot ? "playing" : "done");
  const [skipped, setSkipped] = useState(!atRoot);
  useEffect(() => {
    if (!atRoot) return;
    // ?intro=0 opens straight into the workspace (returning users).
    if (new URLSearchParams(window.location.search).get("intro") === "0") {
      setSkipped(true);
      return setPhase("done");
    }
    const t = setTimeout(() => setPhase((p) => (p === "playing" ? "leaving" : p)), HOLD_MS);
    return () => clearTimeout(t);
    // Decided once, on the first page loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skip = useCallback(() => setPhase((p) => (p === "playing" ? "leaving" : p)), []);
  const exited = useCallback(() => setPhase("done"), []);
  const p = paintings[meta.painting];
  const isActive = (s: Section, i: number) => pathname === s.href || pathname.startsWith(`${s.href}/`) || (i === 0 && pathname === base);

  return (
    <div className="bloom relative isolate min-h-dvh overflow-x-clip !bg-transparent" style={{ "--studio-accent": meta.accent } as React.CSSProperties}>
      <Backdrop painting={meta.painting} />
      {/* Remounted without an entrance when the intro is skipped: a reveal requested in the mount tick never plays. */}
      <motion.div
        key={skipped ? "skipped" : "revealed"}
        className="flex min-h-dvh flex-col lg:h-dvh"
        initial={skipped ? false : { opacity: 0, scale: 1.04, filter: "blur(10px)" }}
        animate={phase !== "playing" ? { opacity: 1, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none", transform: "none" } } : undefined}
        transition={{ duration: EXIT_S, ease: EASE }}
      >
        <header className="z-10 flex min-h-14 shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/[0.07] bg-[#0d0c10]/90 px-4 py-2 backdrop-blur-xl">
          <Link href="/" aria-label="Bloom AI home" className="flex items-center gap-2 text-white/60 hover:text-white">
            <ArrowLeft className="size-4" />
            <BloomWordmark className="text-[18px]" />
          </Link>
          <span className="hidden h-5 w-px bg-white/10 sm:block" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-white">{meta.name}</p>
            <p className="truncate text-[11.5px] text-white/40">Engine Nº {meta.index} · {meta.tagline}</p>
          </div>
          <nav className="ml-auto flex gap-0.5 overflow-x-auto rounded-md border border-white/[0.07] bg-black/20 p-0.5" aria-label="Engines">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={n.index === meta.index ? "page" : undefined}
                className={cn("flex h-7 shrink-0 items-center gap-1.5 rounded px-2.5 text-[12px] transition-colors", n.index === meta.index ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white")}
              >
                <span className="tabular-nums text-white/35">{n.index}</span>
                <span className="max-xl:hidden">{n.label}</span>
              </Link>
            ))}
          </nav>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[208px_minmax(0,1fr)]">
          <nav aria-label={`${meta.kicker} sections`} className="flex gap-1 overflow-x-auto border-white/[0.07] bg-[#0b0a0d]/92 p-2 backdrop-blur-xl max-lg:border-b lg:flex-col lg:overflow-y-auto lg:border-r lg:p-3">
            {sections.map((s, i) => {
              const active = isActive(s, i);
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex shrink-0 items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors", active ? "bg-white/[0.09] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white")}
                >
                  <s.icon className="mt-0.5 size-4 shrink-0" style={{ color: active ? meta.accent : undefined }} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium">{s.label}</span>
                    <span className="hidden text-[11px] leading-snug text-white/40 lg:block">{s.hint}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="flex min-h-0 min-w-0 flex-col">{children}</div>
        </div>

        <footer className="shrink-0 border-t border-white/[0.06] bg-[#0d0c10]/90 px-4 py-1.5 text-[11px] text-white/35">
          Background: {p.artist}, <em>{p.title}</em>, {p.year} · public domain
        </footer>
      </motion.div>
      {phase !== "done" && <StudioIntro meta={meta} leaving={phase === "leaving"} onSkip={skip} onExited={exited} />}
    </div>
  );
}

/** A page's working area: optional left and right side panes around the main surface. */
export function Panes({ left, right, children, leftWidth = 280, rightWidth = 360 }: { left?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; leftWidth?: number; rightWidth?: number }) {
  const cols = [left ? `${leftWidth}px` : "", "minmax(0,1fr)", right ? `${rightWidth}px` : ""].filter(Boolean).join(" ");
  return (
    <div className="grid min-h-0 flex-1 max-lg:!grid-cols-1" style={{ gridTemplateColumns: cols }}>
      {left && <aside className="min-h-0 overflow-y-auto border-white/[0.07] bg-[#0e0d11]/85 backdrop-blur-xl max-lg:border-b lg:border-r">{left}</aside>}
      <main className="flex min-h-0 min-w-0 flex-col">{children}</main>
      {right && <aside className="min-h-0 overflow-y-auto border-white/[0.07] bg-[#0e0d11]/85 backdrop-blur-xl max-lg:border-t lg:border-l">{right}</aside>}
    </div>
  );
}

/** A page title bar inside the content area. */
export function PageBar({ icon: Icon, title, meta, actions, accent }: { icon: LucideIcon; title: string; meta?: React.ReactNode; actions?: React.ReactNode; accent?: string }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-white/[0.07] bg-[#0d0c10]/80 px-4 py-2.5">
      <Icon className="size-4" style={{ color: accent }} />
      <h1 className="text-[13.5px] font-semibold text-white">{title}</h1>
      {meta && <span className="min-w-0 text-[12px] text-white/45">{meta}</span>}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/**
 * State that survives navigation (it lives in the engine layout) and, when `key` is set, reloads too.
 * Storage is read after mount so server and client render the same first frame.
 */
export function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {}
    loaded.current = true;
  }, [key]);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

/** A titled block inside a side pane. */
export function PaneSection({ title, right, children, className }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("border-b border-white/[0.07] p-4 last:border-0", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-[11.5px] font-medium uppercase tracking-wide text-white/45">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export const inputCls =
  "w-full rounded-md border border-white/[0.09] bg-black/25 px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] text-white/50">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-white/35">{hint}</span>}
    </label>
  );
}

/** Downloads a text file in the browser. */
export function download(filename: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
