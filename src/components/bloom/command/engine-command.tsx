"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Eye, FileText, Hand, Info, Loader2, Pause, Play, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloraField, type Bloom } from "../art/flora";
import { PaintingCanvas, PaintingCaption } from "../art/painting-canvas";
import { RoseFrame } from "../art/rose-frame";
import { BloomWordmark } from "../logo";
import { CHANNELS, ENGINES, defaultAnswers, usdFmt, type Answers, type Channel, type Engine, type EngineKey, type Stance, type Step } from "./engines";
import { Inspector, type InspectTarget } from "./inspect";
import { useCommandCopy, useCommandLocale } from "./locale";
import { clearSnapshot, loadSnapshot, saveSnapshot, type WorkforceSnapshot } from "./storage";
import { PALETTES, paletteVars } from "./theme";
import { NeuralChat, NeuralNotice } from "./tutorial";
import { taskOf, useWorkforce, type CardState, type FeedItem, type FlowState, type Workforce } from "./use-workforce";

/** "boot" covers the first client frame, before saved state has been read. */
type Phase = "boot" | "intro" | "setup" | "deploying" | "command";

const EASE = [0.16, 1, 0.3, 1] as const;
const DEPLOY_MS = 2000;

// Without WebGL2: a few low-key roses in the corners, well clear of the panel.
const ROSES: Bloom[] = [
  { kind: "rose", x: "4%", y: "88%", size: 110, rotate: -12 },
  { kind: "rose", x: "11%", y: "96%", size: 76, delay: 0.4, rotate: 18 },
  { kind: "rose", x: "96%", y: "86%", size: 104, delay: 0.6, rotate: 10 },
  { kind: "rose", x: "94%", y: "10%", size: 64, delay: 1, rotate: -20 },
];

/**
 * Overlays (drawers, the brief) render into a layer outside the glass panel: the panel's backdrop blur
 * would otherwise become the containing block for anything `fixed` inside it.
 */
const LayerCtx = createContext<HTMLElement | null>(null);
function Layer({ children }: { children: React.ReactNode }) {
  const el = useContext(LayerCtx);
  return el ? createPortal(children, el) : null;
}

/**
 * One Bloom AI engine, standing on its own: its painting, palette and rose framing in the background, a
 * cinematic intro, then a single frosted glass panel that carries the 3-step setup, the deploy pulse and
 * the live command view. A calibrated engine is saved in this browser and reopens into its command view.
 */
export function EngineCommand({ engineKey }: { engineKey: EngineKey }) {
  // Saved state and the workforce run on the base engine; `engine` only swaps in the visitor's language,
  // so switching language never restarts the intro or the workforce.
  const base = ENGINES[engineKey];
  const { engine, lang, dir } = useCommandLocale(engineKey);
  const palette = PALETTES[engineKey];
  const [phase, setPhase] = useState<Phase>("boot");
  const [answers, setAnswers] = useState<Answers>(() => defaultAnswers(base));
  const [saved, setSaved] = useState<WorkforceSnapshot | undefined>(undefined);
  // Whether this engine was already calibrated and deployed: the intro then hands over to the command view.
  const [resume, setResume] = useState(false);
  const [neural, setNeural] = useState(false);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const afterIntro = useCallback(() => setPhase((p) => (p === "intro" ? (resume ? "command" : "setup") : p)), [resume]);
  const openNeural = useCallback(() => setNeural(true), []);
  const closeNeural = useCallback(() => setNeural(false), []);

  // Every visit opens on the painting intro. Afterwards, an engine whose setup was completed with its
  // ENGAGE button resumes its command view with the saved choices; any other goes to the 3-step setup.
  // ?intro=1 or ?setup=1 run setup again regardless (the saved deployment stays until a new ENGAGE
  // replaces it); ?intro=0 skips the intro.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const snap = loadSnapshot(base);
    if (snap) setAnswers(snap.answers);
    const forced = q.get("intro") === "1" || q.get("setup") === "1";
    const resumable = Boolean(snap?.deployed) && !forced;
    setSaved(resumable ? snap?.workforce : undefined);
    setResume(resumable);
    if (q.get("intro") === "0") return setPhase(resumable ? "command" : "setup");
    setPhase("intro");
  }, [base]);

  const engage = () => {
    saveSnapshot(engine.key, { answers, deployed: true });
    setSaved(undefined);
    setPhase("deploying");
  };
  // Back to the very beginning: the saved deployment is cleared, then the intro and setup run again.
  const recalibrate = () => {
    clearSnapshot(engine.key);
    setSaved(undefined);
    setResume(false);
    setPhase("intro");
  };

  useEffect(() => {
    if (phase !== "deploying") return;
    const t = setTimeout(() => setPhase("command"), DEPLOY_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div lang={lang} dir={dir} className="relative isolate min-h-dvh overflow-x-clip bg-ink font-sans text-white" style={paletteVars(palette)}>
      <Backdrop engine={engine} vivid={phase === "intro"} />

      <LayerCtx.Provider value={layer}>
        <div className="relative z-20 flex min-h-dvh flex-col">
          <header className="px-4 pt-4 sm:px-6">
            <Link href="/command" aria-label="Bloom AI engines" className="inline-block text-[20px]">
              <BloomWordmark />
            </Link>
          </header>
          <main className="flex flex-1 flex-col px-4 pb-16 pt-4 sm:px-6">
            <AnimatePresence mode="wait">
              {phase === "boot" ? null : phase === "intro" ? (
                <Intro key="intro" engine={engine} resuming={resume} onDone={afterIntro} />
              ) : (
                <Glass key="panel" wide={phase === "command"}>
                  <AnimatePresence mode="wait" initial={false}>
                    {phase === "setup" && <Setup key="setup" engine={engine} answers={answers} setAnswers={setAnswers} onEngage={engage} onNeural={openNeural} />}
                    {phase === "deploying" && <Deploying key="deploying" engine={engine} />}
                    {phase === "command" && <CommandView key="command" engine={engine} answers={answers} saved={saved} onRecalibrate={recalibrate} onNeural={openNeural} />}
                  </AnimatePresence>
                </Glass>
              )}
            </AnimatePresence>
          </main>
          <PaintingCaption painting={engine.painting} className="pointer-events-auto px-4 pb-5 text-end sm:px-6" />
        </div>
        <NeuralChat engine={engine} open={neural} onClose={closeNeural} />
      </LayerCtx.Provider>
      <div ref={setLayer} className="relative z-40" />
    </div>
  );
}

/* ───────────────────────────── Shared shell ───────────────────────────── */

/** The engine's masterpiece, tinted toward its palette, then its rose & vine framing at z-10, both behind the UI. */
function Backdrop({ engine, vivid }: { engine: Engine; vivid: boolean }) {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: vivid ? 1 : 0.8, scale: 1 }} transition={{ duration: 2.2, ease: EASE }}>
          <PaintingCanvas painting={engine.painting} priority />
        </motion.div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,rgb(8_4_10/0.2),rgb(8_4_10/0.75))]" />
        <div className="absolute inset-0 bg-linear-to-b from-[var(--c-tint)] via-transparent to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,var(--c-glow-soft),transparent_70%)] mix-blend-screen" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_85%_100%,var(--c-3-glow),transparent_70%)] mix-blend-screen" />
      </div>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-10 opacity-55">
        <RoseFrame layout="climb" palette={PALETTES[engine.key].rose} fallback={<FloraField blooms={ROSES} />} />
      </div>
    </>
  );
}

/** Dark frosted glass with optical quartz accents in the engine's palette: a lit edge, a gem, corner glints. */
function Glass({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: EASE, layout: { duration: 0.7, ease: EASE } }}
      className={cn(
        "relative mx-auto my-auto w-full rounded-2xl border border-c-edge/50 bg-black/50 backdrop-blur-md",
        "shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9),0_0_60px_-30px_var(--c-glow),inset_0_1px_0_rgb(255_255_255/0.06)]",
        wide ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-12 -top-px h-px bg-linear-to-r from-transparent via-c-2/80 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute -top-[4px] left-1/2 size-2 -translate-x-1/2 rotate-45 border border-c-2/90 bg-c-1/40 shadow-[0_0_14px_3px_var(--c-glow)]" />
      {(["left-3 top-3 border-l border-t", "right-3 top-3 border-r border-t", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"] as const).map((c) => (
        <span key={c} aria-hidden className={cn("pointer-events-none absolute size-3 border-c-3/60", c)} />
      ))}
      <div className="relative p-5 sm:p-8">{children}</div>
    </motion.section>
  );
}

/** The panel's header, identical in setup and command: identity and the Neural Breakdown prompt left, status right. */
function PanelHeader({ engine, status, right, onNeural }: { engine: Engine; status: React.ReactNode; right?: React.ReactNode; onNeural: () => void }) {
  const { c } = useCommandCopy();
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-3 border-b border-c-edge/40 pb-5">
      <div className="min-w-0">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-c-2/85">
          {c.engineNo} {engine.index} <span className="mx-1.5 text-white/25">—</span> {engine.role}
        </p>
        <h1 className="mt-1.5 font-logo text-[28px] font-medium leading-none tracking-[-0.03em] sm:text-[34px]">{engine.name}</h1>
        <NeuralNotice onLaunch={onNeural} />
      </div>
      <div className="ms-auto flex flex-wrap items-center justify-end gap-3">
        {status}
        {right}
      </div>
    </div>
  );
}

function StatusPill({ live, children }: { live?: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-c-edge/60 bg-black/40 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/80">
      <span className="relative flex size-2">
        {live && <span className="absolute inset-0 animate-ping rounded-full bg-c-1/70" />}
        <span className={cn("relative size-2 rounded-full", live ? "bg-c-1 shadow-[0_0_10px_var(--c-glow)]" : "bg-white/35")} />
      </span>
      {children}
    </span>
  );
}

/** The bracketed, razor-sharp call to action: [ ENGAGE SOVEREIGN PROTOCOL ]. */
function BracketButton({ children, onClick, disabled, size = "lg" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; size?: "lg" | "sm" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 rounded-md border border-c-1/55 bg-linear-to-b from-c-edge/60 to-c-deep/90 font-mono uppercase text-white transition-all",
        "shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_10px_40px_-10px_var(--c-glow),inset_0_1px_0_rgb(255_255_255/0.18)] hover:border-c-2/80 hover:shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_10px_50px_-6px_var(--c-glow),inset_0_1px_0_rgb(255_255_255/0.28)]",
        "disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-2",
        size === "lg" ? "h-12 px-6 text-[12px] tracking-[0.24em]" : "h-9 px-3.5 text-[10.5px] tracking-[0.18em]",
      )}
    >
      <span className="text-c-2/70">[</span>
      {children}
      <span className="text-c-2/70">]</span>
    </button>
  );
}

function GhostButton({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[12.5px] transition-colors focus-visible:outline-2 focus-visible:outline-c-2",
        active ? "border-c-1/60 bg-c-1/15 text-white" : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.4, ease: EASE } };

/* ───────────────────────────── Intro ───────────────────────────── */

function useTyped(text: string, cps = 38) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return setN(text.length);
    const t = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 1000 / cps);
    return () => clearInterval(t);
  }, [text, cps, reduce]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

function Intro({ engine, resuming, onDone }: { engine: Engine; resuming: boolean; onDone: () => void }) {
  const { c } = useCommandCopy();
  const { shown, done } = useTyped(engine.greeting);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [done, onDone]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter" || e.key === " ") && onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  return (
    <motion.div className="m-auto flex w-full max-w-3xl cursor-pointer flex-col items-center text-center" onClick={onDone} exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)" }} transition={{ duration: 0.8, ease: EASE }}>
      <motion.p className="font-mono text-[10.5px] uppercase tracking-[0.36em] text-c-2/90" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }}>
        {c.engineNo} {engine.index} <span className="mx-2 text-white/30">—</span> {engine.name}
      </motion.p>
      <motion.div className="mt-6 text-6xl drop-shadow-[0_8px_30px_rgb(0_0_0/0.85)] sm:text-8xl" initial={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 1.4, delay: 0.5, ease: EASE }}>
        <BloomWordmark />
      </motion.div>
      <motion.div className="mt-10 w-full rounded-xl border border-c-edge/50 bg-black/50 px-5 py-4 text-start backdrop-blur-md" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1 }}>
        <p className="min-h-[3.2em] font-mono text-[12.5px] leading-relaxed text-white/90 sm:text-[13.5px]" aria-live="polite">
          {shown}
          <span className="ms-0.5 inline-block h-[1.05em] w-[0.5em] translate-y-[0.15em] animate-pulse bg-c-2/80" />
        </p>
      </motion.div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
        className="mt-8 inline-flex h-10 items-center gap-2 rounded-full border border-c-edge/60 bg-black/50 px-5 font-mono text-[10.5px] uppercase tracking-[0.24em] text-white/80 backdrop-blur-md transition-colors hover:border-c-2/80 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-2"
      >
        {c.skipIntro} <ArrowRight className="size-3.5 rtl:-scale-x-100" />
      </button>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">{c.skipHint}</p>
      {resuming && (
        <p className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-c-2/85">
          <span className="size-1.5 animate-pulse rounded-full bg-c-1" /> {c.resuming}
        </p>
      )}
    </motion.div>
  );
}

/* ───────────────────────────── Setup ───────────────────────────── */

function Setup({ engine, answers, setAnswers, onEngage, onNeural }: { engine: Engine; answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>>; onEngage: () => void; onNeural: () => void }) {
  const { c } = useCommandCopy();
  const [i, setI] = useState(0);
  const step = engine.steps[i];
  const last = i === engine.steps.length - 1;
  const value = answers[step.id];
  const ready = Array.isArray(value) ? value.length > 0 : Boolean(value);

  return (
    <motion.div {...fade}>
      <PanelHeader engine={engine} status={<StatusPill>{c.setupStep(i + 1)}</StatusPill>} onNeural={onNeural} />
      <div className="mt-5 flex gap-1.5" aria-hidden>
        {engine.steps.map((s, k) => (
          <span key={s.id} className={cn("h-[3px] flex-1 rounded-full transition-colors duration-500", k <= i ? "bg-linear-to-r from-c-1 to-c-2 shadow-[0_0_8px_var(--c-glow)]" : "bg-white/10")} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step.id} {...fade} className="mt-7">
          <h2 className="font-display text-[28px] font-medium leading-tight text-white sm:text-[34px]">{step.title}</h2>
          <p className="mt-1.5 text-[14px] text-white/60">{step.hint}</p>
          <div className="mt-6">
            <StepBody step={step} value={value} onChange={(v) => setAnswers((a) => ({ ...a, [step.id]: v }))} />
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-c-edge/40 pt-5">
        {i > 0 && (
          <GhostButton onClick={() => setI(i - 1)}>
            <ArrowLeft className="size-3.5 rtl:-scale-x-100" /> {c.back}
          </GhostButton>
        )}
        <div className="ms-auto">
          {last ? (
            <BracketButton onClick={onEngage} disabled={!ready}>
              {engine.cta}
            </BracketButton>
          ) : (
            <BracketButton onClick={() => setI(i + 1)} disabled={!ready} size="sm">
              {c.next} <ArrowRight className="size-3.5 rtl:-scale-x-100" />
            </BracketButton>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StepBody({ step, value, onChange }: { step: Step; value: Answers[string]; onChange: (v: string | string[]) => void }) {
  if (step.kind === "level") {
    const idx = Math.max(0, step.options.findIndex((o) => o.value === value));
    const cur = step.options[idx];
    return (
      <div>
        <input
          type="range"
          min={0}
          max={step.options.length - 1}
          step={1}
          value={idx}
          onChange={(e) => onChange(step.options[Number(e.target.value)].value)}
          aria-label={step.title}
          aria-valuetext={`${cur.label}: ${cur.detail}`}
          className="cmd-range w-full"
          style={{ "--fill": `${(idx / (step.options.length - 1)) * 100}%` } as React.CSSProperties}
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {step.options.map((o, k) => {
            const [level, name] = o.label.split(" · ");
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(o.value)}
                className={cn("transition-colors", k === 0 ? "text-start" : k === step.options.length - 1 ? "text-end" : "text-center", k === idx ? "text-c-2" : "text-white/45 hover:text-white/75")}
              >
                <span className="block font-mono text-[11px] uppercase tracking-[0.14em]">{level}</span>
                {name && <span className="mt-0.5 block text-[12px] leading-snug">{name}</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-5 rounded-xl border border-c-1/35 bg-c-deep/50 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-c-2/90">{cur.label}</p>
          <p className="mt-1 text-[15px] text-white/85">{cur.detail}</p>
        </div>
      </div>
    );
  }

  const multi = step.kind === "multi";
  const selected = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v);
  const toggle = (v: string) => {
    if (!multi) return onChange(v);
    const cur = Array.isArray(value) ? value : [];
    onChange(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };

  return (
    <div role={multi ? "group" : "radiogroup"} aria-label={step.title} className={cn("grid gap-3", step.options.length % 2 === 0 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
      {step.options.map((o) => {
        const on = selected(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => toggle(o.value)}
            className={cn(
              "group relative flex flex-col items-start rounded-xl border p-4 text-start transition-all focus-visible:outline-2 focus-visible:outline-c-2",
              on ? "border-c-1/60 bg-c-deep/60 shadow-[0_0_30px_-8px_var(--c-glow),inset_0_1px_0_rgb(255_255_255/0.08)]" : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]",
            )}
          >
            <span className={cn("mb-3 flex size-5 items-center justify-center border transition-colors", multi ? "rounded-[5px]" : "rounded-full", on ? "border-c-2 bg-c-1 text-black" : "border-white/30")}>
              {on && (multi ? <Check className="size-3.5" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-black" />)}
            </span>
            <span className="text-[15px] font-medium text-white">{o.label}</span>
            <span className="mt-1 text-[13px] leading-snug text-white/60">{o.detail}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── Deploying ───────────────────────────── */

function Deploying({ engine }: { engine: Engine }) {
  const { c } = useCommandCopy();
  const total = engine.cards.reduce((s, card) => s + card.agents, 0);
  const lines = c.deployLines(total);
  const [k, setK] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setK((v) => Math.min(v + 1, lines.length - 1)), DEPLOY_MS / lines.length);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <motion.div {...fade} className="flex flex-col items-center py-14 text-center" role="status">
      <div className="relative flex size-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full border border-c-1/50" />
        <span className="absolute inset-3 animate-pulse rounded-full bg-c-1/15 blur-md" />
        <span className="relative size-5 rotate-45 border border-c-2/90 bg-c-1/50 shadow-[0_0_24px_6px_var(--c-glow)]" />
      </div>
      <p className="mt-8 font-mono text-[12px] uppercase tracking-[0.32em] text-white">{c.deploying}</p>
      <p className="mt-2 text-[13.5px] text-white/60">{lines[k]}</p>
      <div className="mt-6 h-[3px] w-64 max-w-full overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full bg-linear-to-r from-c-1 to-c-2 shadow-[0_0_10px_var(--c-glow)]" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: DEPLOY_MS / 1000, ease: "easeInOut" }} />
      </div>
      <p className="sr-only">{c.deployingSr(engine.index)}</p>
    </motion.div>
  );
}

/* ───────────────────────────── Command view ───────────────────────────── */

function CommandView({ engine, answers, saved, onRecalibrate, onNeural }: { engine: Engine; answers: Answers; saved?: WorkforceSnapshot; onRecalibrate: () => void; onNeural: () => void }) {
  const { c } = useCommandCopy();
  // The base engine: the workforce must not restart when only the display language changes.
  const w = useWorkforce(ENGINES[engine.key], answers, saved);
  const [open, setOpen] = useState<string | null>(null);
  const [brief, setBrief] = useState<"closed" | "compiling" | "open">("closed");
  const [confirming, setConfirming] = useState(false);
  const [inspect, setInspect] = useState<InspectTarget | null>(null);
  const closeInspect = useCallback(() => setInspect(null), []);

  // The confirmation step quietly lapses if it isn't taken.
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(t);
  }, [confirming]);

  useEffect(() => {
    if (brief !== "compiling") return;
    const t = setTimeout(() => setBrief("open"), 1100);
    return () => clearTimeout(t);
  }, [brief]);

  const summary = engine.steps.map((s) => {
    const v = answers[s.id];
    return s.options.filter((o) => (Array.isArray(v) ? v.includes(o.value) : v === o.value)).map((o) => o.label).join(" · ");
  });

  // A card opens its most recent piece of work, so the drawer shows something that actually just happened.
  const inspectCard = (id: string) => setInspect({ card: id, item: w.feed.find((f) => f.card === id), seed: Date.now() });
  const inspectItem = (f: FeedItem) => f.card && setInspect({ card: f.card, item: f, seed: f.id * 7919 + f.at });

  return (
    <motion.div {...fade}>
      <PanelHeader
        engine={engine}
        onNeural={onNeural}
        status={
          <>
            <StatusPill live={w.deployed > 0}>{c.workforceStatus(w.deployed > 0)}</StatusPill>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] tabular-nums text-white/60">
              {c.deployed(w.deployed, w.total)}
            </span>
          </>
        }
        right={
          <>
            <button
              type="button"
              onClick={() => {
                if (!confirming) return setConfirming(true);
                w.retire();
                onRecalibrate();
              }}
              aria-live="polite"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors focus-visible:outline-2 focus-visible:outline-c-2",
                confirming ? "border border-c-1/60 bg-c-deep/70 text-white" : "text-white/55 hover:text-white",
              )}
            >
              <RotateCcw className="size-3.5" />
              {confirming ? c.confirmRestart : c.recalibrate}
            </button>
            <BracketButton size="sm" onClick={() => setBrief("compiling")} disabled={brief === "compiling"}>
              {brief === "compiling" ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
              {c.generateBrief}
            </BracketButton>
          </>
        }
      />

      <p className="mt-4 flex gap-2.5 rounded-lg border border-c-edge/40 bg-c-deep/40 px-3 py-2 text-[11.5px] leading-relaxed text-white/60">
        <Info className="mt-0.5 size-3.5 shrink-0 text-c-2/80" />
        <span>
          <span className="font-mono uppercase tracking-[0.16em] text-c-2/90">{c.demoLabel}</span> {c.demoNote}
        </span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label={c.calibration}>
        {summary.map((s, k) => (
          <span key={k} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-white/65">
            {s}
          </span>
        ))}
      </div>

      <Flows engine={engine} flows={w.flows} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(300px,0.8fr)]">
        <section aria-label={c.workforce} className="min-w-0">
          <h2 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.26em] text-white/50">{c.workforce}</h2>
          <motion.div layout className="grid gap-3 sm:grid-cols-2">
            {w.cards.map((c) => (
              <WorkforceCard key={c.id} engine={engine} card={c} w={w} open={open === c.id} onToggle={() => setOpen((o) => (o === c.id ? null : c.id))} onInspect={() => inspectCard(c.id)} />
            ))}
          </motion.div>
          {w.reserve > 0 && (
            <p className="mt-3 text-[12px] text-white/50">
              {c.reserve(w.reserve)}
            </p>
          )}
        </section>
        <Ticker engine={engine} feed={w.feed} onOpen={inspectItem} setFocus={w.setFocus} />
      </div>

      <Layer>
        <AnimatePresence>
          {brief === "open" && <BriefSheet key="brief" engine={engine} w={w} onClose={() => setBrief("closed")} />}
          {inspect && <Inspector key="inspect" engine={ENGINES[engine.key]} answers={answers} target={inspect} onClose={closeInspect} />}
        </AnimatePresence>
      </Layer>
    </motion.div>
  );
}

/**
 * Live hand-offs between engines. Each badge opens the other engine in the hand-off, which resumes its
 * running command view if it has been calibrated, or starts its intro if not.
 */
function Flows({ engine, flows }: { engine: Engine; flows: FlowState[] }) {
  if (!flows.length) return null;
  return (
    <section aria-label="Cross-engine hand-offs" className="mt-5 flex flex-wrap gap-2">
      {flows.map((f) => {
        const target = f.to === engine.key ? f.from : f.to;
        const cls = "relative flex min-w-0 max-w-full flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-2xl border border-c-edge/50 bg-black/40 py-1.5 pl-1.5 pr-3.5 text-[12.5px] backdrop-blur-md sm:rounded-full";
        const body = (
          <>
            {f.flash > 0 && (
              <motion.span
                key={f.flash}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[0_0_22px_2px_var(--c-glow)] ring-1 ring-c-1/60"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.6 }}
              />
            )}
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-c-1/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-c-2">
              {ENGINES[f.from].name} <span className="text-c-3">→</span> <span className="text-c-3">{f.to ? ENGINES[f.to].name : f.toLabel}</span>
            </span>
            <span className="min-w-0 flex-1 basis-[14rem] pl-1 text-white/80 sm:basis-auto sm:pl-0">{f.text(f.live)}</span>
            {target ? <ArrowRight className="size-3.5 shrink-0 text-c-2 transition-transform group-hover:translate-x-0.5" /> : <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-c-1" />}
          </>
        );
        return target ? (
          <Link
            key={flowKeyOf(f)}
            href={`/command/${target}`}
            aria-label={`Open ${ENGINES[target].name}: ${f.text(f.live)}`}
            className={cn(cls, "group transition-colors hover:border-c-1/60 hover:bg-c-deep/60 focus-visible:outline-2 focus-visible:outline-c-2")}
          >
            {body}
          </Link>
        ) : (
          <div key={flowKeyOf(f)} className={cls}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

const flowKeyOf = (f: FlowState) => `${f.from}-${f.to ?? f.toLabel}`;

const STANCES: Stance[] = ["stealth", "aggressive", "balanced"];

function WorkforceCard({ engine, card, w, open, onToggle, onInspect }: { engine: Engine; card: CardState; w: Workforce; open: boolean; onToggle: () => void; onInspect: () => void }) {
  const { c } = useCommandCopy();
  const inspectLabel = c.inspect[engine.key];
  const def = engine.cards.find((d) => d.id === card.id)!;
  const Icon = def.icon;
  const max = card.agents + w.reserve;
  const state = card.human ? c.withTeam : card.paused ? c.paused : card.agents === 0 ? c.unstaffed : c.stances[card.stance];
  const title = def.title(card.agents, card.count);

  return (
    <motion.article layout transition={{ layout: { duration: 0.45, ease: EASE } }} className={cn("min-w-0 rounded-xl border bg-white/[0.03] transition-colors", open ? "border-c-1/50 sm:col-span-2" : "border-white/10 hover:border-white/25", (card.paused || card.human) && "opacity-80")}>
      <div className="flex items-start gap-1 p-2">
        <button type="button" onClick={onInspect} aria-label={`${inspectLabel}: ${title}`} className="group flex min-w-0 flex-1 items-start gap-3 rounded-lg p-2 text-start transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-c-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-c-edge/60 bg-c-deep/70 text-c-2">
            <Icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <motion.span layout="position" className="block text-[15px] font-medium leading-snug text-white">
              {title}
            </motion.span>
            <span className="mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
              <span className={cn("size-1.5 rounded-full", card.human ? "bg-amber-300" : card.paused || card.agents === 0 ? "bg-white/35" : "animate-pulse bg-c-1")} />
              {state}
            </span>
            <span className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-c-2/90 group-hover:text-c-2">
              <Eye className="size-3" /> {inspectLabel}
            </span>
          </span>
        </button>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`Controls: ${title}`} className={cn("mt-1 rounded-md p-2 transition-colors focus-visible:outline-2 focus-visible:outline-c-2", open ? "bg-c-1/15 text-c-2" : "text-white/45 hover:bg-white/5 hover:text-white")}>
          <SlidersHorizontal className="size-4" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <div className="grid gap-5 border-t border-c-edge/40 p-4 sm:grid-cols-2">
              <div>
                <p className="flex items-baseline justify-between font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
                  {c.agentAllocation}
                  <span className="tabular-nums text-c-2">
                    {card.agents} <span className="text-white/40">{c.available(max)}</span>
                  </span>
                </p>
                <input
                  type="range"
                  min={0}
                  max={max}
                  value={card.agents}
                  onChange={(e) => w.setAgents(card.id, Number(e.target.value))}
                  aria-label={`Agents ${taskOf(title)}`}
                  className="cmd-range mt-4 w-full"
                  style={{ "--fill": `${max ? (card.agents / max) * 100 : 0}%` } as React.CSSProperties}
                />
                <p className="mt-2 text-[12px] text-white/50">{c.allocationHint}</p>
              </div>
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">{c.stance}</p>
                <div role="radiogroup" aria-label={c.stance} className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
                  {STANCES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={card.stance === s}
                      onClick={() => card.stance !== s && w.setStance(card.id, s)}
                      className={cn("h-8 rounded-md text-[12.5px] transition-colors", card.stance === s ? "bg-c-1/25 text-white shadow-[inset_0_0_0_1px_var(--c-glow)]" : "text-white/55 hover:text-white")}
                    >
                      {c.stances[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <GhostButton onClick={() => w.togglePause(card.id)} active={card.paused}>
                  {card.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                  {card.paused ? c.resumeAgents : c.pauseAgents}
                </GhostButton>
                <GhostButton onClick={() => w.toggleHuman(card.id)} active={card.human}>
                  <Hand className="size-3.5" />
                  {card.human ? c.returnToAgents : c.handOff}
                </GhostButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function Ticker({ engine, feed, onOpen, setFocus }: { engine: Engine; feed: FeedItem[]; onOpen: (f: FeedItem) => void; setFocus: (c: Channel | null) => void }) {
  const { c: copy } = useCommandCopy();
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<Channel | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => setFocus(null), [setFocus]);
  const ago = (at: number) => {
    const s = Math.max(0, Math.round((now - at) / 1000));
    return s < 3 ? "now" : s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
  };
  const choose = (c: Channel | null) => {
    setFilter(c);
    setFocus(c);
  };
  const shown = (filter ? feed.filter((f) => f.ch === filter) : feed).slice(0, 12);
  const chName = (c?: Channel) => CHANNELS.find((x) => x.id === c)?.label;

  return (
    <section aria-label={copy.liveFeed} className="flex min-w-0 flex-col">
      <h2 className="mb-3 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.26em] text-white/50">
        <span className="size-1.5 animate-pulse rounded-full bg-c-1" /> {copy.liveFeed}
        <span className="ms-auto normal-case tracking-normal text-white/40">{copy.tapToInspect}</span>
      </h2>
      {engine.channels && (
        <div role="tablist" aria-label="Filter by channel" className="mb-2 flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-1 [scrollbar-width:none]">
          {[null, ...CHANNELS.map((c) => c.id)].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              role="tab"
              aria-selected={filter === c}
              onClick={() => choose(c)}
              className={cn("h-7 shrink-0 rounded-md px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors", filter === c ? "bg-c-1/25 text-white shadow-[inset_0_0_0_1px_var(--c-glow)]" : "text-white/50 hover:text-white")}
            >
              {c ? chName(c) : copy.all}
            </button>
          ))}
        </div>
      )}
      <ol className="relative max-h-[460px] space-y-1 overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2 [mask-image:linear-gradient(180deg,#000_75%,transparent)]" aria-live="polite" aria-relevant="additions">
        <AnimatePresence initial={false}>
          {shown.map((f) => {
            const content = (
              <>
                <span className="w-7 shrink-0 pt-px font-mono text-[10.5px] tabular-nums text-white/40">{ago(f.at)}</span>
                <span className={cn("min-w-0 flex-1 text-[13px] leading-snug", f.system ? "text-white/90" : "text-white/80")}>
                  {f.ch && <span className="me-1.5 inline-block rounded border border-c-edge/60 px-1 py-px align-[1px] font-mono text-[9px] uppercase tracking-[0.12em] text-c-2">{chName(f.ch)}</span>}
                  {f.system ? <span className="me-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-c-2">{copy.you}</span> : <AgentText text={f.text} />}
                  {f.system && f.text}
                </span>
              </>
            );
            return (
              <motion.li key={f.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                {f.card && !f.system ? (
                  <button type="button" onClick={() => onOpen(f)} className="flex w-full gap-3 rounded-lg px-2.5 py-2 text-start transition-colors hover:bg-c-1/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-2">
                    {content}
                  </button>
                ) : (
                  <div className="flex gap-3 rounded-lg px-2.5 py-2">{content}</div>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
        {!shown.length && <li className="px-2.5 py-6 text-center text-[12.5px] text-white/50">{copy.listening(chName(filter ?? undefined))}</li>}
      </ol>
    </section>
  );
}

function AgentText({ text }: { text: string }) {
  const m = /^(Agent #\d+) (.*)$/.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className="font-medium text-c-3">{m[1]}</span> {m[2]}
    </>
  );
}

function BriefSheet({ engine, w, onClose }: { engine: Engine; w: Workforce; onClose: () => void }) {
  const { c } = useCommandCopy();
  const b = w.brief;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stats = [
    { label: c.stats[0], value: b.leads.toLocaleString("en-US") },
    { label: c.stats[1], value: usdFmt(b.pipeline) },
    { label: c.stats[2], value: `${Math.round(b.hours)} ${c.hrs}` },
  ];

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="brief-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-c-edge/50 bg-black/75 p-6 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9),0_0_60px_-30px_var(--c-glow)] backdrop-blur-md sm:p-8"
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-12 -top-px h-px bg-linear-to-r from-transparent via-c-2/80 to-transparent" />
        <div className="flex items-start gap-4">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-c-2/85">
              Bloom AI · {c.engineNo} {engine.index} {engine.name}
            </p>
            <h2 id="brief-title" className="mt-2 font-display text-[32px] font-medium leading-tight">
              {c.briefTitle}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label={c.closeBrief} className="ms-auto rounded-md p-1.5 text-white/50 hover:bg-white/5 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">{s.label}</dt>
              <dd className="mt-2 font-logo text-[26px] font-medium tabular-nums tracking-[-0.02em] text-c-2">{s.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-6 space-y-3">
          {engine.brief.lines(b).map((l) => (
            <li key={l} className="flex gap-3 text-[15px] leading-relaxed text-white/80">
              <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 rotate-45 bg-c-1" />
              {l}
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-c-edge/40 pt-4 text-[12px] text-white/45">
          {c.briefFoot(w.deployed, w.total)}
        </p>
      </motion.div>
    </motion.div>
  );
}
