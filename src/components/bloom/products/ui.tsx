"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CornerDownLeft, TerminalSquare } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The executive command bar: one floating, recessed optical field anchored at the bottom of the
 * workspace. `/` focuses it, ↑/↓ walk the history, and each command answers on the line above.
 */
export function CommandBar({ placeholder, hints, onRun }: { placeholder: string; hints: string[]; onRun: (cmd: string) => string | void | Promise<string | void> }) {
  const [value, setValue] = useState("");
  const [reply, setReply] = useState<{ text: string; ok: boolean } | null>(null);
  const [focused, setFocused] = useState(false);
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const run = async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    history.current = [cmd, ...history.current.filter((h) => h !== cmd)].slice(0, 30);
    cursor.current = -1;
    setValue("");
    const out = await onRun(cmd);
    setReply(out === undefined ? { text: `Unknown command. Try: ${hints.slice(0, 3).join(" · ")}`, ok: false } : { text: out, ok: true });
  };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-3xl">
        {(reply || focused) && (
          <div className="mb-2 flex flex-wrap items-center gap-2 px-2 text-[12px]">
            {reply && <span className={cn("prod-hud text-[12px]", !reply.ok && "text-[#ffb3a3] [text-shadow:none]")}>{reply.text}</span>}
            {focused &&
              hints.map((h) => (
                <button key={h} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setValue(h.replace(/<[^>]+>/g, "").trimEnd() + " ")} className="rounded-full bg-black/40 px-2.5 py-0.5 font-mono text-[11px] text-p-text/60 backdrop-blur-md hover:text-p-text">
                  {h}
                </button>
              ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(value);
          }}
          className="flex items-center gap-3 rounded-2xl border border-p-edge/15 bg-[rgb(var(--p-glass)/0.72)] px-4 shadow-[inset_0_2px_8px_rgb(0_0_0/0.55),inset_0_-1px_0_rgb(255_255_255/0.08),0_20px_60px_-20px_rgb(0_0_0/0.9),0_0_40px_-16px_rgb(var(--p-glow)/0.6)] backdrop-blur-3xl backdrop-saturate-150"
        >
          <TerminalSquare className="size-4 shrink-0 text-p-accent" />
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                const h = history.current;
                cursor.current = Math.max(-1, Math.min(h.length - 1, cursor.current + (e.key === "ArrowUp" ? 1 : -1)));
                setValue(cursor.current < 0 ? "" : h[cursor.current]);
              }
            }}
            placeholder={placeholder}
            aria-label="Command"
            className="h-13 min-w-0 flex-1 bg-transparent font-mono text-[14px] text-p-text placeholder:text-p-text/35 focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-p-edge/20 px-1.5 font-mono text-[11px] text-p-text/40 sm:block">/</kbd>
          <button type="submit" aria-label="Run command" className="text-p-text/50 hover:text-p-text">
            <CornerDownLeft className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Plain controls styled from whichever product's palette they sit in. No layout, no navigation.

export type SprigSpecies = "jasmine" | "laurel" | "lotus";

/** Which botanical a product draws in its panels, and a counter that ticks on every action. */
export const ProductContext = createContext<{ species: SprigSpecies; pulse: number }>({ species: "jasmine", pulse: 0 });

/** Selector for the controls whose use makes the product's sprigs flare. */
export const ACTION_TARGETS = ".prod-btn, .prod-ghost, [role=switch], [role=radio], .prod-range";

// Line-art blossoms, drawn around (0,0) in the product's rim light.
const BLOSSOM: Record<SprigSpecies, React.ReactNode> = {
  jasmine: (
    <>
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} d="M0 0 C-3 -3.5 -2.6 -9 0 -11 C2.6 -9 3 -3.5 0 0 Z" transform={`rotate(${r})`} />
      ))}
      <circle r={1.6} />
    </>
  ),
  laurel: (
    <>
      <ellipse rx={2.6} ry={3.4} cx={3} cy={1} />
      <ellipse rx={2.4} ry={3.1} cx={-3} cy={2} />
      <path d="M3 -2.4 L3 -6 M-3 -1.1 L-3 -5" />
    </>
  ),
  lotus: (
    <>
      <path d="M0 4 C-3 0 -3 -6 0 -10 C3 -6 3 0 0 4 Z" />
      <path d="M0 4 C-6 2 -9 -3 -9 -7 C-5 -5 -2 -2 0 4 Z" />
      <path d="M0 4 C6 2 9 -3 9 -7 C5 -5 2 -2 0 4 Z" />
      <path d="M-11 6 Q0 10 11 6" />
    </>
  ),
};

const LEAF: Record<SprigSpecies, string> = {
  jasmine: "M0 0 C3 -4 9 -4 12 0 C9 4 3 4 0 0 Z",
  laurel: "M0 0 C4 -3 12 -3 17 0 C12 3 4 3 0 0 Z",
  lotus: "M0 0 m-5 0 a5 3.6 0 1 0 10 0 a5 3.6 0 1 0 -10 0",
};

/**
 * Glowing botanical line art tucked into a panel's inner margin: a tendril along the top edge and down
 * the side, with leaves and a blossom. It breathes quietly and flares each time something is done.
 */
export function Sprig({ corner = "tl" }: { corner?: "tl" | "br" }) {
  const { species, pulse } = useContext(ProductContext);
  return (
    // Kept small and tight to the edge so the tendril stays inside the panel's padding, clear of its text.
    <div aria-hidden className={cn("pointer-events-none absolute -z-[1] size-[92px]", corner === "tl" ? "left-1 top-1" : "bottom-1 right-1 rotate-180")}>
      <div key={pulse} className={cn("size-full", pulse > 0 && "animate-sprig-flash")}>
        <svg viewBox="0 0 128 128" className="animate-sprig-breathe size-full overflow-visible" fill="none" stroke="rgb(var(--p-rim))" strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round">
          <path d="M124 7 C 86 3, 40 6, 18 16 S 6 58, 7 124" strokeWidth={1.1} />
          <path d="M70 6 c -4 -6 -12 -6 -14 0 c 2 3 6 3 6 0" />
          {[
            { x: 100, y: 5, r: 196 },
            { x: 54, y: 7, r: 160 },
            { x: 9, y: 52, r: 250 },
            { x: 7, y: 92, r: 110 },
          ].map((l, i) => (
            <path key={i} d={LEAF[species]} transform={`translate(${l.x} ${l.y}) rotate(${l.r})`} />
          ))}
          <g transform="translate(18 18)">{BLOSSOM[species]}</g>
        </svg>
      </div>
    </div>
  );
}

/** A big, friendly switch. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors", on ? "border-transparent bg-p-accent" : "border-p-edge/20 bg-p-text/10")}>
      <span className={cn("absolute left-0 top-[2px] size-[18px] rounded-full shadow transition-transform", on ? "translate-x-[21px] bg-p-ink" : "translate-x-[2px] bg-p-text/80")} />
    </button>
  );
}

/** A range input with a glowing light trail up to the thumb (see prod-range in globals.css). */
export function Slider({ value, min, max, step = 1, onChange, label, disabled, className }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; disabled?: boolean; className?: string }) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      className={cn("prod-range w-full", className)}
      style={{ "--fill": `${fill}%` } as React.CSSProperties}
    />
  );
}

/** Pill options in a row: one choice. */
export function Segmented<T extends string>({ value, options, onChange, label, size = "md" }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; label: string; size?: "sm" | "md" }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-full border border-p-edge/15 bg-black/25 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("inline-flex items-center gap-1.5 rounded-full transition-colors", size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]", value === o.value ? "bg-p-accent font-medium text-p-ink" : "text-p-text/60 hover:text-p-text")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Section heading inside a glass panel. */
export function PanelHead({ title, hint, children }: { title: string; hint?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[22px] font-medium leading-tight text-p-text">{title}</h2>
        {hint && <p className="mt-1 text-[13.5px] text-p-text/55">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export const glass = "prod-glass";
