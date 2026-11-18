"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Diamond, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOmniCopy } from "./omni-copy";
import { Badge, SPRING } from "./ui";

/**
 * The Problem-Solver theater: a three-part walkthrough on the overview surface. Parts 1 and 2 illustrate the problem
 * and the clearing path; part 3 shows sovereign nodes and is honest about which of it ships today. Packets ride SVG
 * <animateMotion> (native, no React re-renders); the step timer is a CSS animation whose end advances the step, so
 * hover/focus pause it with animation-play-state. Reduced motion freezes scenes and disables auto-advance.
 */
const STEP_SECONDS = 10;
const EMERALD = "#34f5b5";
const ROSE = "#fb7185";
const AMBER = "#f5b544";
const FRAMEWORKS = ["LangGraph", "MCP", "CrewAI", "AutoGen", "Custom API", "Slack bot", "ERP", "Wallet"];
const sy = (i: number) => 38 + i * 35;

function Sources() {
  return (
    <>
      {FRAMEWORKS.map((s, i) => (
        <g key={s}>
          <rect x={18} y={sy(i) - 11} width={92} height={22} rx={5} fill="#111114" stroke="rgba(255,255,255,0.12)" />
          <text x={64} y={sy(i) + 3.5} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={10} className="font-mono">
            {s}
          </text>
        </g>
      ))}
    </>
  );
}

const AGENTS = [
  { x: 420, y: 70 },
  { x: 560, y: 120 },
  { x: 470, y: 215 },
  { x: 650, y: 60 },
  { x: 690, y: 240 },
];
const CHAOS = FRAMEWORKS.map((_, i) => {
  const a = AGENTS[(i * 3) % AGENTS.length];
  const midX = 230 + ((i * 47) % 120);
  const midY = sy((i + 3) % FRAMEWORKS.length);
  return { d: `M110 ${sy(i)} L${midX} ${midY} L${(midX + a.x) / 2} ${(midY + a.y) / 2 + (i % 2 ? 30 : -30)} L${a.x} ${a.y}`, crash: i % 3 === 1, tone: i % 4 === 0 ? AMBER : ROSE };
});
const FAILS = [
  { x: 330, y: 52, label: "schema mismatch" },
  { x: 600, y: 178, label: "prompt injection" },
  { x: 735, y: 120, label: "proprietary data leaked" },
  { x: 380, y: 285, label: "no receipt" },
];

function NightmareScene() {
  return (
    <svg viewBox="0 0 800 320" className="block h-auto w-full" role="img" aria-label="Agent connectivity nightmare">
      <Sources />
      {CHAOS.map((c, i) => (
        <path key={i} d={c.d} fill="none" stroke={c.tone} strokeOpacity={0.22} strokeDasharray="3 5" />
      ))}
      {AGENTS.map((a, i) => (
        <g key={i}>
          <circle cx={a.x} cy={a.y} r={13} fill="#111114" stroke="rgba(255,255,255,0.18)" />
          <text x={a.x} y={a.y + 3.5} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.6)" className="font-mono">
            A{i + 1}
          </text>
        </g>
      ))}
      {CHAOS.map((c, i) => (
        <circle key={`p${i}`} r={3.2} fill={c.tone}>
          <animateMotion dur={`${2.2 + (i % 3) * 0.45}s`} begin={`${i * 0.27}s`} repeatCount="indefinite" path={c.d} keyPoints={c.crash ? "0;0.62;0.62" : "0;1;1"} keyTimes="0;0.8;1" calcMode="linear" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.75;1" dur={`${2.2 + (i % 3) * 0.45}s`} begin={`${i * 0.27}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {FAILS.map((f, i) => (
        <g key={f.label}>
          <text x={f.x} y={f.y} textAnchor="middle" fontSize={15} fill={ROSE}>
            ×
            <animate attributeName="opacity" values="0;1;0.2;1;0" dur="2.4s" begin={`${0.6 + i * 0.55}s`} repeatCount="indefinite" />
          </text>
          <text x={f.x} y={f.y + 14} textAnchor="middle" fontSize={8.5} fill="rgba(251,113,133,0.8)" className="font-mono">
            {f.label}
            <animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin={`${0.6 + i * 0.55}s`} repeatCount="indefinite" />
          </text>
        </g>
      ))}
    </svg>
  );
}

const STAGES = [
  { label: "Omni-Bridge", x: 268, tone: EMERALD },
  { label: "Shield", x: 395, tone: ROSE },
  { label: "Vault", x: 515, tone: EMERALD },
  { label: "Sovereign", x: 635, tone: EMERALD },
];

function ClearingScene() {
  return (
    <svg viewBox="0 0 800 320" className="block h-auto w-full" role="img" aria-label="Bloom Exchange clearing path">
      <Sources />
      {FRAMEWORKS.map((_, i) => (
        <path key={i} d={`M110 ${sy(i)} C190 ${sy(i)} 205 160 268 160`} fill="none" stroke={EMERALD} strokeOpacity={0.18} />
      ))}
      <line x1={268} y1={160} x2={752} y2={160} stroke={EMERALD} strokeOpacity={0.25} />
      {STAGES.map((s) => (
        <g key={s.label}>
          <rect x={s.x - 42} y={140} width={84} height={40} rx={7} fill="#0c0c0f" stroke={s.tone} strokeOpacity={0.45} />
          <text x={s.x} y={164} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.85)" className="font-mono">
            {s.label}
          </text>
        </g>
      ))}
      <rect x={712} y={137} width={80} height={46} rx={7} fill="rgba(52,245,181,0.08)" stroke={EMERALD} />
      <text x={752} y={157} textAnchor="middle" fontSize={9.5} fill={EMERALD} className="font-mono">
        BLOOM-XCH
      </text>
      <text x={752} y={171} textAnchor="middle" fontSize={8} fill="rgba(52,245,181,0.7)" className="font-mono">
        Ed25519 ✓
      </text>
      <circle cx={395} cy={160} r={22} fill="none" stroke={ROSE} strokeOpacity={0}>
        <animate attributeName="r" values="20;34" dur="1.6s" begin="0.9s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.7;0" dur="1.6s" begin="0.9s" repeatCount="indefinite" />
      </circle>
      {FRAMEWORKS.map((_, i) => {
        const hostile = i === 2 || i === 5;
        const dur = hostile ? 1.5 : 2.6;
        const path = `M110 ${sy(i)} C190 ${sy(i)} 205 160 268 160 L${hostile ? 395 : 752} 160`;
        return (
          <circle key={`p${i}`} r={3.2} fill={hostile ? ROSE : EMERALD}>
            <animateMotion dur={`${dur}s`} begin={`${i * 0.32}s`} repeatCount="indefinite" path={path} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.9;1" dur={`${dur}s`} begin={`${i * 0.32}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
    </svg>
  );
}

const NODES = [
  { x: 170, y: 82, kid: "bxk-7a3f9c1e" },
  { x: 630, y: 82, kid: "bxk-cc0b5656" },
  { x: 170, y: 240, kid: "bxk-515ed62c" },
  { x: 630, y: 240, kid: "bxk-2e9b04d1" },
];
const LINKS: [number, number][] = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
];

function FederationScene({ orgs, noCloud, handshake }: { orgs: string[]; noCloud: string; handshake: string }) {
  return (
    <svg viewBox="0 0 800 320" className="block h-auto w-full" role="img" aria-label="Sovereign nodes exchanging signed certificates">
      {LINKS.map(([a, b], i) => {
        const A = NODES[a];
        const B = NODES[b];
        const d = `M${A.x} ${A.y} L${B.x} ${B.y}`;
        const back = `M${B.x} ${B.y} L${A.x} ${A.y}`;
        return (
          <g key={i}>
            <path d={d} stroke={EMERALD} strokeOpacity={0.16} strokeDasharray="2 6" fill="none" />
            <rect width={7} height={5} x={-3.5} y={-2.5} rx={1} fill={EMERALD}>
              <animateMotion dur="3.2s" begin={`${i * 0.5}s`} repeatCount="indefinite" path={d} />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="3.2s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
            </rect>
            <rect width={7} height={5} x={-3.5} y={-2.5} rx={1} fill="rgba(255,255,255,0.8)">
              <animateMotion dur="3.2s" begin={`${i * 0.5 + 1.6}s`} repeatCount="indefinite" path={back} />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="3.2s" begin={`${i * 0.5 + 1.6}s`} repeatCount="indefinite" />
            </rect>
          </g>
        );
      })}
      {NODES.map((n, i) => (
        <g key={n.kid}>
          {/* The air gap: each organization's perimeter. */}
          <rect x={n.x - 118} y={n.y - 52} width={236} height={104} rx={14} fill="rgba(9,9,11,0.9)" stroke="rgba(255,255,255,0.14)" strokeDasharray="5 5" />
          <text x={n.x - 104} y={n.y - 34} fontSize={9} fill="rgba(255,255,255,0.45)" className="font-mono" letterSpacing="0.14em">
            {orgs[i].toUpperCase()}
          </text>
          <rect x={n.x - 74} y={n.y - 18} width={148} height={40} rx={8} fill="#111114" stroke={EMERALD} strokeOpacity={0.55} />
          <circle cx={n.x - 58} cy={n.y + 2} r={3.5} fill={EMERALD}>
            <animate attributeName="opacity" values="0.45;1;0.45" dur="2s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
          </circle>
          <text x={n.x - 48} y={n.y - 1} fontSize={9.5} fill="rgba(255,255,255,0.85)" className="font-mono">
            sovereign node
          </text>
          <text x={n.x - 48} y={n.y + 12} fontSize={8.5} fill="rgba(52,245,181,0.8)" className="font-mono">
            {n.kid}…
          </text>
        </g>
      ))}
      <g transform="translate(400 160)">
        <path d="M-24 8 a12 12 0 0 1 2-23 a16 16 0 0 1 30-4 a11 11 0 0 1 16 15 a9 9 0 0 1-4 12 z" fill="#0c0c0f" stroke="rgba(255,255,255,0.3)" />
        <line x1={-30} y1={14} x2={30} y2={-24} stroke={ROSE} strokeWidth={2} />
        <text y={34} textAnchor="middle" fontSize={9} fill="rgba(251,113,133,0.85)" className="font-mono">
          {noCloud}
        </text>
      </g>
      <text x={400} y={308} textAnchor="middle" fontSize={8.5} fill="rgba(255,255,255,0.4)" className="font-mono">
        {handshake}
      </text>
    </svg>
  );
}

export function ProblemSolverDemo() {
  const t = useOmniCopy().theater;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const [still, setStill] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(reduce);
    if (reduce) setPlaying(false);
  }, []);
  useEffect(() => {
    if (!still) return;
    const id = setTimeout(() => stage.current?.querySelectorAll("svg").forEach((s) => (s.setCurrentTime(1.4), s.pauseAnimations())), 40);
    return () => clearTimeout(id);
  }, [step, still]);

  const go = (n: number) => setStep((n + 3) % 3);
  const part = t.parts[step];
  const running = playing && !hover;

  return (
    <section
      className="xch-card relative overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-[var(--xch-emerald)]"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label={t.title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(step + (document.dir === "rtl" ? -1 : 1));
        if (e.key === "ArrowLeft") go(step + (document.dir === "rtl" ? 1 : -1));
        if (e.key === " ") {
          e.preventDefault();
          setPlaying((p) => !p);
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.3] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden />
      <div className="relative flex flex-wrap items-center gap-3 border-b border-[var(--xch-line)] px-4 py-3 sm:px-5">
        <p className="text-[13.5px] font-medium text-white">{t.title}</p>
        <Badge className="ms-auto">{t.illustrative}</Badge>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? t.pause : t.play} className="rounded-md border border-[var(--xch-line)] p-1.5 text-white/60 hover:text-white">
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
      </div>

      <div role="tablist" className="relative grid grid-cols-3 gap-px border-b border-[var(--xch-line)] bg-[var(--xch-line)]">
        {t.parts.map((p, i) => (
          <button key={p.kicker} type="button" role="tab" aria-selected={step === i} onClick={() => (go(i), setPlaying(false))} className={cn("relative bg-[#111114] px-3 py-2.5 text-start transition-colors duration-150 sm:px-4", step === i ? "text-white" : "text-white/45 hover:text-white/75")}>
            <span className={cn("block font-mono text-[9.5px] uppercase tracking-[0.16em]", i === 0 ? "text-[var(--xch-rose)]" : "text-[var(--xch-emerald)]", step !== i && "opacity-60")}>{p.kicker}</span>
            <span className="mt-0.5 hidden truncate text-[12.5px] sm:block">{p.title}</span>
            <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.04]">
              {step === i && (
                <span
                  key={step}
                  className="xch-step-progress absolute inset-0 block origin-left bg-[var(--xch-emerald)] rtl:origin-right"
                  style={{ animationDuration: `${STEP_SECONDS}s`, animationPlayState: running ? "running" : "paused" }}
                  onAnimationEnd={() => running && go(step + 1)}
                />
              )}
              {step > i && <span className="absolute inset-0 block bg-[var(--xch-emerald)]/40" />}
            </span>
          </button>
        ))}
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div ref={stage} className="min-w-0 border-[var(--xch-line)] p-3 sm:p-4 lg:border-e" dir="ltr">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.01 }} transition={SPRING} className={cn("overflow-hidden rounded-[10px] border bg-black/30", step === 0 ? "border-[color-mix(in_srgb,var(--xch-rose)_20%,transparent)]" : "border-[color-mix(in_srgb,var(--xch-emerald)_22%,transparent)]")}>
              {step === 0 && <NightmareScene />}
              {step === 1 && <ClearingScene />}
              {step === 2 && <FederationScene orgs={t.orgs} noCloud={t.noCloud} handshake={t.handshake} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={SPRING} className="min-w-0 p-4 sm:p-5">
            <p className={cn("font-mono text-[10px] uppercase tracking-[0.2em]", step === 0 ? "text-[var(--xch-rose)]" : "text-[var(--xch-emerald)]")}>{part.kicker}</p>
            <h3 className="mt-2 text-[22px] font-medium leading-tight tracking-[-0.02em] text-white">{part.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/55">{part.sub}</p>
            <ul className="mt-4 space-y-2">
              {part.bullets.map((b, i) => {
                const roadmap = step === 2 && i >= t.todayCount[2];
                return (
                  <li key={b} className="xch-row-in flex items-start gap-2.5 text-[12.5px] leading-snug text-white/80" style={{ animationDelay: `${80 + i * 70}ms` }}>
                    {step === 0 ? (
                      <span className="mt-[3px] text-[var(--xch-rose)]">×</span>
                    ) : roadmap ? (
                      <Diamond className="mt-[3px] size-3 shrink-0 text-[var(--xch-amber)]" />
                    ) : (
                      <Check className="mt-[3px] size-3 shrink-0 text-[var(--xch-emerald)]" />
                    )}
                    <span>
                      {b}
                      {step === 2 && <span className={cn("ms-2 font-mono text-[9px] uppercase tracking-[0.12em]", roadmap ? "text-[var(--xch-amber)]" : "text-[var(--xch-emerald)]/70")}>{roadmap ? t.roadmap : t.today}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
