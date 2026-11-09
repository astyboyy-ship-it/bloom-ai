"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioWaveform, Pause, Play } from "lucide-react";
import { createDemoGenerator } from "@/lib/demo/demoGenerator";
import { useLicensingCopy } from "@/components/control-plane/copy";
import { CpButton, Widget } from "@/components/control-plane/widget";
import { useExperienceCopy } from "../copy";

const STEMS = ["vocals", "drums", "bass", "keys", "fx"] as const;
const COLORS = ["var(--tier-accent)", "#FFB000", "#00FF88", "#a78bfa", "#8ff8ff"];
const BPM = 124;
const BARS = 16;
const POINTS = 220;
const LOOP_MS = ((BARS * 4) / BPM) * 60_000;

/** A deterministic waveform envelope per stem: drums transient-heavy, bass slow, vocals phrased. */
function waveform(stem: (typeof STEMS)[number], seed: number): number[] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: POINTS }, (_, i) => {
    const beat = (i / POINTS) * BARS * 4;
    const phase = beat % 1;
    switch (stem) {
      case "drums":
        return Math.max(0.08, Math.exp(-phase * 7) * (0.7 + rand() * 0.3));
      case "bass":
        return 0.35 + 0.25 * Math.sin(beat * Math.PI * 0.5) + rand() * 0.1;
      case "vocals":
        return Math.floor(beat / 8) % 2 === 0 ? 0.25 + rand() * 0.55 : 0.04 + rand() * 0.05;
      case "keys":
        return 0.3 + 0.2 * Math.sin(beat * 0.9) + rand() * 0.15;
      default:
        return beat % 16 > 14 ? 0.5 + rand() * 0.4 : 0.05 + rand() * 0.08;
    }
  });
}

/**
 * DAW Audio Ops & Waveform Visualizer for the music demo key: five stem lanes with synthesized waveforms, a
 * transport and playhead looping at 124 BPM, per-stem meters and master loudness driven by the music telemetry
 * stream. All audio data is synthetic; nothing plays sound.
 */
export function DawAudioOps() {
  const m = useExperienceCopy().music;
  const words = useLicensingCopy().demo.words.stem;
  const waves = useMemo(() => STEMS.map((s, i) => waveform(s, 1000 + i * 97)), []);
  const [playing, setPlaying] = useState(true);
  const [meters, setMeters] = useState<number[]>(() => STEMS.map(() => 0.4));
  const [lufs, setLufs] = useState(-14);
  const [bar, setBar] = useState(1);
  const head = useRef<HTMLDivElement>(null);
  const start = useRef(performance.now());
  const pausedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (pausedAt.current !== null) {
      start.current += performance.now() - pausedAt.current;
      pausedAt.current = null;
    }
    let raf = 0;
    const frame = () => {
      const p = ((performance.now() - start.current) % LOOP_MS) / LOOP_MS;
      if (head.current) head.current.style.insetInlineStart = `${p * 100}%`;
      setBar((b) => {
        const next = 1 + Math.floor(p * BARS);
        return b === next ? b : next;
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      pausedAt.current = performance.now();
    };
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    const gen = createDemoGenerator("music");
    const id = setInterval(() => {
      const f = gen.next();
      const fill = (f.metrics.find((x) => x.key === "buffer_fill")?.value ?? 70) / 100;
      setLufs(f.metrics.find((x) => x.key === "loudness")?.value ?? -14);
      setMeters(STEMS.map((_, i) => Math.min(1, Math.max(0.05, fill * (0.55 + ((f.buffer?.[i * 4] ?? 0.5) - 0.3)) + (Math.random() - 0.5) * 0.15))));
    }, 220);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <Widget
      icon={AudioWaveform}
      title={m.title}
      sub={m.sub}
      actions={
        <span className="flex items-center gap-3 font-mono text-[11px] text-white/60">
          <span>
            {m.bpm} <span className="text-os-cyan tabular-nums">{BPM}</span>
          </span>
          <span>
            {m.bar} <span className="text-os-cyan tabular-nums">{bar}</span>/{BARS}
          </span>
          <span>
            {m.master} <span className="text-os-cyan tabular-nums">{lufs.toFixed(1)}</span> LUFS
          </span>
          <CpButton onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="size-3" /> : <Play className="size-3" />} {playing ? m.pause : m.play}
          </CpButton>
        </span>
      }
    >
      <div className="relative space-y-1.5" dir="ltr">
        {/* The playhead spans every lane: an overlay over the waveform column (5.5rem label + 0.5rem gap). */}
        <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: "6rem", right: "1rem" }}>
          <div ref={head} className="absolute inset-y-0 w-px bg-white shadow-[0_0_10px_var(--tier-glow)]" style={{ insetInlineStart: "0%" }} />
        </div>
        {STEMS.map((s, i) => {
          const w = waves[i];
          const d = `M0,30 ${w.map((v, x) => `L${(x / (POINTS - 1)) * 1000},${30 - v * 26}`).join(" ")} L1000,30 ${w
            .slice()
            .reverse()
            .map((v, x) => `L${((POINTS - 1 - x) / (POINTS - 1)) * 1000},${30 + v * 26}`)
            .join(" ")} Z`;
          return (
            <div key={s} className="grid grid-cols-[5.5rem_minmax(0,1fr)_0.5rem] items-center gap-2">
              <span className="truncate font-mono text-[11px] text-white/70">{words[s] ?? s}</span>
              <div className="relative h-12 overflow-hidden rounded-md border border-white/[0.06] bg-black/40">
                <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                  <path d={d} fill={COLORS[i]} fillOpacity={0.55} />
                </svg>
              </div>
              <span className="relative h-12 w-2 overflow-hidden rounded-full bg-white/[0.06]">
                <span className="absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-200" style={{ height: `${meters[i] * 100}%`, background: meters[i] > 0.9 ? "#f87171" : COLORS[i] }} />
              </span>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}
