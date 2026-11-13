"use client";

import { motion } from "framer-motion";
import type { CompanyId } from "./companies";

/**
 * The cinematic intro's centerpiece, one per company: line art drawn in light in the brand's color, then Bloom's
 * agent nodes sparking to life in the same scene. All SVG on a 800×400 stage. `reduce` swaps the drawing for a
 * plain fade.
 */
type SceneProps = { color: string; reduce: boolean };

const EASE = [0.16, 1, 0.3, 1] as const;

/** A stroke that draws itself in. */
function Draw({ d, color, delay = 0, duration = 1.2, width = 2, reduce, opacity = 1, fill = "none" }: { d: string; color: string; delay?: number; duration?: number; width?: number; reduce: boolean; opacity?: number; fill?: string }) {
  return (
    <motion.path
      d={d}
      fill={fill}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={reduce ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
      animate={reduce ? { opacity } : { pathLength: 1, opacity }}
      transition={{ duration: reduce ? 0.3 : duration, delay: reduce ? 0 : delay, ease: EASE }}
      style={{ filter: `drop-shadow(0 0 6px ${color})` }}
    />
  );
}

/** Bloom agent nodes popping in along a line, joined by a light thread. */
function NodeSpark({ points, color, delay, reduce }: { points: [number, number][]; color: string; delay: number; reduce: boolean }) {
  const thread = `M${points.map(([x, y]) => `${x},${y}`).join(" L")}`;
  return (
    <g>
      <Draw d={thread} color={color} delay={delay} duration={0.9} width={1.2} reduce={reduce} opacity={0.6} />
      {points.map(([x, y], i) => (
        <motion.g key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduce ? 0 : delay + 0.15 + i * 0.12, duration: 0.4, ease: EASE }} style={{ transformOrigin: `${x}px ${y}px` }}>
          <circle cx={x} cy={y} r={7} fill="#07080c" stroke={color} strokeWidth={1.6} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
          <circle cx={x} cy={y} r={2.6} fill={color} />
        </motion.g>
      ))}
    </g>
  );
}

/* --------------------------------------------------------------------------------------- automotive */

function AutoScene({ color, reduce }: SceneProps) {
  const body =
    "M88 268 L148 268 C152 246 174 234 205 234 C236 234 256 246 261 268 L540 268 C544 246 566 234 596 234 C627 234 647 246 651 268 L706 268 C714 260 714 248 705 240 C690 229 662 222 624 214 C580 205 526 180 476 162 C434 147 384 141 326 143 C274 145 232 157 197 176 C167 192 141 205 116 214 C99 220 88 233 88 250 Z";
  const glass = "M246 186 C290 165 348 156 398 157 C444 158 474 170 505 187 Z";
  const wheel = (cx: number) => (
    <g key={cx}>
      <Draw d={`M${cx - 30},268 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0`} color={color} delay={0.9} duration={0.8} width={2.4} reduce={reduce} />
      <motion.g animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: `${cx}px 268px` }}>
        {[0, 60, 120].map((a) => (
          <line key={a} x1={cx} y1={268} x2={cx + Math.cos((a * Math.PI) / 180) * 22} y2={268 + Math.sin((a * Math.PI) / 180) * 22} stroke={color} strokeOpacity={0.7} strokeWidth={1.4} />
        ))}
      </motion.g>
    </g>
  );
  return (
    <svg viewBox="0 0 800 400" className="h-auto w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="beam" x1="0" x2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Speed streaks rushing past */}
      {!reduce &&
        [180, 205, 228, 252].map((y, i) => (
          <motion.line key={y} y1={y} y2={y} x1={0} x2={120} stroke={color} strokeOpacity={0.35} strokeWidth={1} initial={{ x: 800 }} animate={{ x: -200 }} transition={{ duration: 0.9 + i * 0.15, repeat: Infinity, delay: 0.8 + i * 0.1, ease: "linear" }} />
        ))}
      {/* Road */}
      <Draw d="M40 302 L760 302" color={color} delay={0.2} duration={1} width={1} reduce={reduce} opacity={0.5} />
      <Draw d={body} color={color} delay={0.1} duration={1.4} width={2.4} reduce={reduce} />
      <Draw d={glass} color="#ffffff" delay={0.7} duration={0.9} width={1.4} reduce={reduce} opacity={0.75} />
      {wheel(205)}
      {wheel(596)}
      {/* Headlight and beam */}
      <motion.ellipse cx={700} cy={244} rx={7} ry={4} fill="#fff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.2 }} style={{ filter: "drop-shadow(0 0 10px #fff)" }} />
      <motion.polygon points="704,244 800,214 800,276" fill="url(#beam)" initial={{ opacity: 0 }} animate={{ opacity: reduce ? 0.6 : [0, 0.9, 0.6] }} transition={{ delay: reduce ? 0 : 1.25, duration: 0.8 }} />
      <NodeSpark points={[[130, 345], [260, 335], [400, 345], [540, 335], [670, 345]]} color={color} delay={1.6} reduce={reduce} />
    </svg>
  );
}

/* --------------------------------------------------------------------------------------- streaming */

function StreamingScene({ color, reduce }: SceneProps) {
  const bars = Array.from({ length: 28 }, (_, i) => i);
  return (
    <svg viewBox="0 0 800 400" className="h-auto w-full overflow-visible" aria-hidden>
      {!reduce &&
        [0, 1, 2].map((i) => (
          <motion.circle key={i} cx={400} cy={200} fill="none" stroke={color} strokeWidth={1.2} initial={{ r: 40, opacity: 0.7 }} animate={{ r: 260, opacity: 0 }} transition={{ duration: 2.4, repeat: Infinity, delay: 0.6 + i * 0.8, ease: "easeOut" }} />
        ))}
      {bars.map((i) => {
        const x = 190 + i * 15.5;
        const peak = 40 + Math.abs(Math.sin(i * 0.7)) * 110;
        return (
          <motion.rect
            key={i}
            x={x}
            width={8}
            rx={4}
            fill={color}
            initial={{ height: 6, y: 197, opacity: 0 }}
            animate={reduce ? { height: peak / 2, y: 200 - peak / 4, opacity: 0.9 } : { height: [6, peak, peak * 0.4, peak * 0.8], y: [197, 200 - peak / 2, 200 - peak * 0.2, 200 - peak * 0.4], opacity: 0.95 }}
            transition={{ duration: 1.6, delay: reduce ? 0 : 0.1 + i * 0.03, repeat: reduce ? 0 : Infinity, repeatType: "mirror", ease: "easeInOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        );
      })}
      <NodeSpark points={[[160, 330], [280, 352], [400, 360], [520, 352], [640, 330]]} color={color} delay={1.7} reduce={reduce} />
    </svg>
  );
}

/* --------------------------------------------------------------------------------------- analytics */

function AnalyticsScene({ color, reduce }: SceneProps) {
  const ring = (tilt: number, i: number) => (
    <motion.g key={tilt} animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 14 + i * 4, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "400px 200px" }}>
      <g transform={`rotate(${tilt} 400 200)`}>
        <Draw d="M230 200 a170 52 0 1,0 340 0 a170 52 0 1,0 -340 0" color={color} delay={0.4 + i * 0.25} duration={1.4} width={1.2} reduce={reduce} opacity={0.7} />
        <circle cx={570} cy={200} r={4} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      </g>
    </motion.g>
  );
  const pts: [number, number][] = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return [400 + Math.cos(a) * 250, 200 + Math.sin(a) * 140];
  });
  return (
    <svg viewBox="0 0 800 400" className="h-auto w-full overflow-visible" aria-hidden>
      <defs>
        <radialGradient id="orb" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
          <stop offset="35%" stopColor={color} stopOpacity={0.55} />
          <stop offset="100%" stopColor="#07080c" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* The lattice between the outer points */}
      {pts.map(([x, y], i) => {
        const [nx, ny] = pts[(i + 3) % pts.length];
        return <Draw key={i} d={`M${x},${y} L${nx},${ny}`} color={color} delay={1.2 + i * 0.08} duration={0.8} width={0.8} reduce={reduce} opacity={0.35} />;
      })}
      <motion.circle cx={400} cy={200} r={86} fill="url(#orb)" initial={{ scale: 0.4, opacity: 0 }} animate={reduce ? { opacity: 1, scale: 1 } : { scale: [0.4, 1.06, 1], opacity: 1 }} transition={{ duration: 1.4, ease: EASE }} style={{ transformOrigin: "400px 200px", filter: `drop-shadow(0 0 30px ${color})` }} />
      {[-18, 22, 72].map(ring)}
      {pts.map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={5} fill="#07080c" stroke={color} strokeWidth={1.4} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduce ? 0 : 1.6 + i * 0.07 }} style={{ transformOrigin: `${x}px ${y}px` }} />
      ))}
    </svg>
  );
}

/* --------------------------------------------------------------------------------------- commerce */

function CommerceScene({ color, reduce }: SceneProps) {
  const nodes: [number, number][] = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return [400 + Math.cos(a) * 300, 215 + Math.sin(a) * 160];
  });
  return (
    <svg viewBox="0 0 800 400" className="h-auto w-full overflow-visible" aria-hidden>
      {nodes.map(([x, y], i) => {
        const d = `M400,235 L${x},${y}`;
        return (
          <g key={i}>
            <Draw d={d} color={color} delay={1.1 + i * 0.07} duration={0.7} width={1} reduce={reduce} opacity={0.45} />
            {!reduce && (
              <circle r={3} fill={color}>
                <animateMotion dur="1.6s" begin={`${1.8 + i * 0.12}s`} repeatCount="indefinite" path={d} />
              </circle>
            )}
            <motion.circle cx={x} cy={y} r={8} fill="#07080c" stroke={color} strokeWidth={1.6} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduce ? 0 : 1.5 + i * 0.07 }} style={{ transformOrigin: `${x}px ${y}px`, filter: `drop-shadow(0 0 8px ${color})` }} />
          </g>
        );
      })}
      <Draw d="M330 165 L470 165 L488 310 L312 310 Z" color={color} delay={0.1} duration={1.2} width={2.6} reduce={reduce} fill="rgba(7,8,12,0.92)" />
      <Draw d="M365 165 C365 108 435 108 435 165" color={color} delay={0.7} duration={0.8} width={2.4} reduce={reduce} />
      <Draw d="M372 225 C372 255 428 255 428 225" color="#ffffff" delay={1.0} duration={0.6} width={2} reduce={reduce} opacity={0.8} />
    </svg>
  );
}

/* --------------------------------------------------------------------------------------- building */

function BuildingScene({ color, reduce }: SceneProps) {
  const studs = Array.from({ length: 11 }, (_, i) => 200 + i * 40);
  return (
    <svg viewBox="0 0 800 400" className="h-auto w-full overflow-visible" aria-hidden>
      <Draw d="M150 320 L650 320" color={color} delay={0} duration={0.7} width={2.6} reduce={reduce} />
      {studs.map((x, i) => (
        <Draw key={x} d={`M${x} 320 L${x} 220`} color={color} delay={0.35 + i * 0.07} duration={0.45} width={2} reduce={reduce} />
      ))}
      <Draw d="M190 220 L610 220" color={color} delay={1.1} duration={0.5} width={2.4} reduce={reduce} />
      <Draw d="M180 220 L400 105 L620 220" color={color} delay={1.35} duration={0.7} width={2.6} reduce={reduce} />
      {[
        "M400 105 L400 220",
        "M400 105 L300 220",
        "M400 105 L500 220",
        "M290 163 L300 220",
        "M510 163 L500 220",
      ].map((d, i) => (
        <Draw key={d} d={d} color="#ffffff" delay={1.7 + i * 0.08} duration={0.4} width={1.2} reduce={reduce} opacity={0.6} />
      ))}
      <NodeSpark points={[[200, 360], [320, 368], [440, 368], [560, 360]]} color={color} delay={2.0} reduce={reduce} />
    </svg>
  );
}

/* --------------------------------------------------------------------------------------- games */

function GamesScene({ color, reduce }: SceneProps) {
  const rays = Array.from({ length: 13 }, (_, i) => -200 + i * 100);
  const floors = [250, 272, 300, 336, 382];
  return (
    <svg viewBox="0 0 800 400" className="h-auto w-full overflow-visible" aria-hidden>
      {/* Perspective grid floor */}
      {rays.map((x, i) => (
        <Draw key={x} d={`M400 230 L${x} 400`} color={color} delay={0.05 * i} duration={0.8} width={0.8} reduce={reduce} opacity={0.4} />
      ))}
      {floors.map((y, i) => (
        <Draw key={y} d={`M0 ${y} L800 ${y}`} color={color} delay={0.4 + i * 0.08} duration={0.8} width={0.8} reduce={reduce} opacity={0.35} />
      ))}
      {/* The arena rising */}
      <Draw d="M210 232 A190 140 0 0 1 590 232" color={color} delay={0.9} duration={1} width={2.6} reduce={reduce} />
      <Draw d="M270 232 A130 95 0 0 1 530 232" color={color} delay={1.15} duration={0.9} width={1.6} reduce={reduce} opacity={0.8} />
      {[250, 320, 400, 480, 550].map((x, i) => (
        <Draw key={x} d={`M${x} 232 L${400 + (x - 400) * 0.25} ${100 + Math.abs(x - 400) * 0.35}`} color="#ffffff" delay={1.35 + i * 0.07} duration={0.5} width={1} reduce={reduce} opacity={0.55} />
      ))}
      <motion.circle cx={400} cy={92} r={10} fill={color} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: reduce ? 1 : [0, 1.6, 1] }} transition={{ delay: reduce ? 0 : 1.75, duration: 0.6 }} style={{ transformOrigin: "400px 92px", filter: `drop-shadow(0 0 18px ${color})` }} />
      <NodeSpark points={[[210, 232], [305, 160], [400, 92], [495, 160], [590, 232]]} color={color} delay={1.9} reduce={reduce} />
    </svg>
  );
}

const SCENES: Record<CompanyId, (p: SceneProps) => React.ReactNode> = {
  auto: AutoScene,
  streaming: StreamingScene,
  analytics: AnalyticsScene,
  commerce: CommerceScene,
  building: BuildingScene,
  games: GamesScene,
};

export function CompanyScene({ id, color, reduce }: { id: CompanyId; color: string; reduce: boolean }) {
  const Scene = SCENES[id];
  return <Scene color={color} reduce={reduce} />;
}
