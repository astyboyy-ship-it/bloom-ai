"use client";

import { useEffect, useId, useRef } from "react";
import { motion, useAnimationControls, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type FlowerKind = "rose" | "sakura" | "goldDahlia" | "obsidianDahlia" | "lotus" | "orchid";

type FlowerProps = { uid: string };

// Outer guard petals to the furled heart. Each ring opens a beat after the one outside it.
const roseRings = [
  { n: 6, r: 46, w: 33, rot: 0, base: "#3a030c", mid: "#8c0820", tip: "#c8142f" },
  { n: 6, r: 37, w: 27, rot: 30, base: "#33030b", mid: "#9a0b25", tip: "#d11c38" },
  { n: 5, r: 28, w: 21, rot: 12, base: "#2a0209", mid: "#8e0a23", tip: "#c41731" },
  { n: 5, r: 19, w: 14, rot: 48, base: "#220207", mid: "#7a0820", tip: "#b0132c" },
  { n: 4, r: 11, w: 9, rot: 20, base: "#1a0105", mid: "#640619", tip: "#961026" },
];

const BUD_RADIUS = 9;
const OPEN_EASE = [0.22, 1, 0.36, 1] as const;

/** Broad petal with a softly notched, rolled-back lip; base at the origin, pointing up. */
function petalPath(r: number, w: number) {
  return `M0 0 C${-w * 0.55} ${-r * 0.12} ${-w} ${-r * 0.55} ${-w * 0.8} ${-r * 0.88} Q${-w * 0.38} ${-r * 1.1} 0 ${-r} Q${w * 0.38} ${-r * 1.1} ${w * 0.8} ${-r * 0.88} C${w} ${-r * 0.55} ${w * 0.55} ${-r * 0.12} 0 0 Z`;
}

/** The lit crescent where the petal edge curls back toward the viewer. */
function lipPath(r: number, w: number) {
  return `M${-w * 0.78} ${-r * 0.87} Q${-w * 0.36} ${-r * 1.08} 0 ${-r * 0.985} Q${w * 0.36} ${-r * 1.08} ${w * 0.78} ${-r * 0.87} Q${w * 0.34} ${-r * 0.95} 0 ${-r * 0.89} Q${-w * 0.34} ${-r * 0.95} ${-w * 0.78} ${-r * 0.87} Z`;
}

/** Deep red rose that unfurls from a tight bud, outer guard petals first, then breathes. */
function Rose({ uid, open, still }: FlowerProps & { open: boolean; still: boolean }) {
  const ringDelay = (ri: number) => 0.35 + ri * 0.32;
  const settled = ringDelay(roseRings.length) + 2;

  return (
    <>
      <defs>
        {roseRings.map((ring, ri) => (
          <radialGradient key={ri} id={`${uid}-r${ri}`} cx="0.5" cy="1" r="1.05">
            <stop offset="0" stopColor={ring.base} />
            <stop offset="0.55" stopColor={ring.mid} />
            <stop offset="1" stopColor={ring.tip} />
          </radialGradient>
        ))}
        <linearGradient id={`${uid}-lip`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff4d66" stopOpacity="0" />
          <stop offset="1" stopColor="#ff8a9c" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`${uid}-cast`}>
          <stop offset="0.35" stopColor="#12000a" stopOpacity="0.6" />
          <stop offset="1" stopColor="#12000a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-sheen`} cx="0.32" cy="0.25" r="0.6">
          <stop offset="0" stopColor="#ffd9de" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffd9de" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-sepal`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#14290f" />
          <stop offset="1" stopColor="#3f6b2e" />
        </linearGradient>
      </defs>

      {/* Leaves */}
      <path d="M-8 34 C-40 40 -58 62 -62 78 C-40 76 -18 60 -8 34 Z" fill="#1e3a1a" stroke="#4a7a3a" strokeWidth="0.8" />
      <path d="M10 34 C40 38 60 56 66 72 C42 74 20 58 10 34 Z" fill="#1a3417" stroke="#4a7a3a" strokeWidth="0.8" />

      {/* Sepals part first, peeling back from the bud */}
      {[18, 90, 162, 234, 306].map((a, i) => (
        <g key={a} transform={`rotate(${a})`}>
          <motion.path
            d="M0 0 C-7 -14 -5 -36 0 -50 C5 -36 7 -14 0 0 Z"
            fill={`url(#${uid}-sepal)`}
            stroke="#6f9a52"
            strokeOpacity={0.4}
            strokeWidth={0.5}
            style={{ originX: 0.5, originY: 1 }}
            initial={still ? false : { scaleY: 0.32, scaleX: 0.6 }}
            animate={open ? { scaleY: 1, scaleX: 1 } : undefined}
            transition={{ duration: 1.6, delay: 0.1 + i * 0.05, ease: OPEN_EASE }}
          />
        </g>
      ))}

      {roseRings.map((ring, ri) => {
        const bud = Math.min(1, BUD_RADIUS / ring.r);
        const twist = 28 + ri * 6;
        return (
          <motion.g
            key={ri}
            style={{ originX: 0.5, originY: 0.5 }}
            animate={
              open && !still
                ? { rotate: [0, ri % 2 ? 1.6 : -1.6, 0], scale: [1, 1.018 + ri * 0.004, 1] }
                : undefined
            }
            transition={{ duration: 6 + ri * 0.9, repeat: Infinity, ease: "easeInOut", delay: settled + ri * 0.4 }}
          >
            {/* Shadow cast by this ring onto the one beneath */}
            <motion.circle
              r={ring.r * 0.95}
              fill={`url(#${uid}-cast)`}
              initial={still ? false : { scale: bud }}
              animate={open ? { scale: 1 } : undefined}
              transition={{ duration: 2.6 - ri * 0.15, delay: ringDelay(ri), ease: OPEN_EASE }}
            />
            {Array.from({ length: ring.n }, (_, i) => (
              <g key={i} transform={`rotate(${(360 / ring.n) * i + ring.rot})`}>
                <motion.g
                  style={{ originX: 0.5, originY: 1 }}
                  initial={still ? false : { scaleX: bud * 0.75, scaleY: bud, rotate: -twist }}
                  animate={
                    open
                      ? { scaleX: ri === roseRings.length - 1 ? 0.92 : 1, scaleY: 1, rotate: 0 }
                      : undefined
                  }
                  transition={{ duration: 2.6 - ri * 0.15, delay: ringDelay(ri) + i * 0.07, ease: OPEN_EASE }}
                >
                  <path
                    d={petalPath(ring.r, ring.w)}
                    fill={`url(#${uid}-r${ri})`}
                    stroke="#1a0006"
                    strokeOpacity={0.45}
                    strokeWidth={0.6}
                  />
                  {/* Midrib crease */}
                  <path
                    d={`M0 ${-ring.r * 0.08} Q${ring.w * 0.08} ${-ring.r * 0.45} 0 ${-ring.r * 0.78}`}
                    fill="none"
                    stroke="#1a0006"
                    strokeOpacity={0.28}
                    strokeWidth={0.9}
                    strokeLinecap="round"
                  />
                  <path d={lipPath(ring.r, ring.w)} fill={`url(#${uid}-lip)`} />
                </motion.g>
              </g>
            ))}
          </motion.g>
        );
      })}

      {/* Furled heart */}
      <circle r="4.2" fill="#1c0106" />
      <path d="M0 -2.6 A2.6 2.6 0 1 1 -2.4 1 A1.6 1.6 0 1 1 0.8 -0.6" fill="none" stroke="#c4223e" strokeOpacity={0.55} strokeWidth={0.7} />
      {/* Soft top-left light over the whole bloom */}
      <circle r="34" fill={`url(#${uid}-sheen)`} />
    </>
  );
}

function Sakura({ uid }: FlowerProps) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-p`} cx="0" cy="0" r="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e86b8c" />
          <stop offset="0.45" stopColor="#f7b9c6" />
          <stop offset="1" stopColor="#ffe9d6" />
        </radialGradient>
      </defs>
      {[0, 72, 144, 216, 288].map((a) => (
        <path
          key={a}
          d="M0 0 C-15 -9 -20 -30 -8 -42 L0 -35 L8 -42 C20 -30 15 -9 0 0 Z"
          transform={`rotate(${a})`}
          fill={`url(#${uid}-p)`}
          stroke="#f3cf9a"
          strokeOpacity={0.55}
          strokeWidth={0.7}
        />
      ))}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <circle key={i} cx={Math.cos(a) * 11} cy={Math.sin(a) * 11} r={1.6} fill="#ffd27a" />;
      })}
      <circle r="4.5" fill="#c4385a" />
    </>
  );
}

// Outer ray florets to the heart; like the rose, each ring opens a beat after the one outside it.
const dahliaRings = [
  { n: 18, r: 46, w: 0.15 },
  { n: 14, r: 34, w: 0.17 },
  { n: 10, r: 22, w: 0.2 },
];

/**
 * Solar dahlia that unfurls from a closed bud ring by ring, then breathes. Each change of `flare`
 * replays a golden bloom: the florets swell open and a halo of light pulses from the heart.
 */
function Dahlia({ uid, obsidian, open, still, flare }: FlowerProps & { obsidian?: boolean; open: boolean; still: boolean; flare: number }) {
  const ringDelay = (ri: number) => 0.3 + ri * 0.34;
  const settled = ringDelay(dahliaRings.length) + 2;
  const swell = useAnimationControls();
  const halo = useAnimationControls();

  useEffect(() => {
    if (!flare || still) return;
    swell.start({ scale: [1, 1.13, 0.98, 1], rotate: [0, 7, -2, 0], transition: { duration: 1.8, ease: OPEN_EASE } });
    halo.start({ opacity: [0, 0.95, 0], scale: [0.5, 1.2, 1.45], transition: { duration: 1.8, ease: "easeOut" } });
  }, [flare, still, swell, halo]);

  return (
    <>
      <defs>
        <linearGradient id={`${uid}-d`} x1="0" y1="1" x2="0" y2="0">
          {obsidian ? (
            <>
              <stop offset="0" stopColor="#050308" />
              <stop offset="0.7" stopColor="#231a26" />
              <stop offset="1" stopColor="#e3b25a" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#7a4410" />
              <stop offset="0.6" stopColor="#e3b25a" />
              <stop offset="1" stopColor="#fff1c2" />
            </>
          )}
        </linearGradient>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0" stopColor="#fff1c2" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="#f3c46a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f3c46a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-dl`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#14290f" />
          <stop offset="1" stopColor={obsidian ? "#3a4a2a" : "#4f7a34"} />
        </linearGradient>
      </defs>

      {/* Leaves uncurl from beneath the bud */}
      {[200, 340].map((a, i) => (
        <g key={a} transform={`rotate(${a})`}>
          <motion.path
            d="M0 0 C-9 -16 -8 -40 0 -60 C8 -40 9 -16 0 0 Z"
            fill={`url(#${uid}-dl)`}
            stroke="#6f9a52"
            strokeOpacity={0.35}
            strokeWidth={0.6}
            style={{ originX: 0.5, originY: 1 }}
            initial={still ? false : { scaleY: 0.2, scaleX: 0.4, rotate: i ? 40 : -40 }}
            animate={open ? { scaleY: 1, scaleX: 1, rotate: 0 } : undefined}
            transition={{ duration: 1.8, delay: 0.1 + i * 0.12, ease: OPEN_EASE }}
          />
        </g>
      ))}

      <motion.circle r={58} fill={`url(#${uid}-halo)`} initial={{ opacity: 0 }} animate={halo} />

      <motion.g style={{ originX: 0.5, originY: 0.5 }} animate={swell}>
        {dahliaRings.map((ring, ri) => {
          const bud = Math.min(1, 7 / ring.r);
          const twist = 26 + ri * 8;
          return (
            <motion.g
              key={ri}
              style={{ originX: 0.5, originY: 0.5 }}
              animate={open && !still ? { rotate: [0, ri % 2 ? 2.2 : -2.2, 0], scale: [1, 1.02 + ri * 0.006, 1] } : undefined}
              transition={{ duration: 7 + ri, repeat: Infinity, ease: "easeInOut", delay: settled + ri * 0.4 }}
            >
              {Array.from({ length: ring.n }, (_, i) => (
                <g key={i} transform={`rotate(${(360 / ring.n) * i + ri * 9})`}>
                  <motion.path
                    d={`M0 0 C${-ring.r * ring.w} ${-ring.r * 0.4} ${-ring.r * ring.w * 0.7} ${-ring.r * 0.92} 0 ${-ring.r} C${ring.r * ring.w * 0.7} ${-ring.r * 0.92} ${ring.r * ring.w} ${-ring.r * 0.4} 0 0 Z`}
                    fill={`url(#${uid}-d)`}
                    stroke={obsidian ? "#e3b25a" : "#fff1c2"}
                    strokeOpacity={obsidian ? 0.55 : 0.35}
                    strokeWidth={0.6}
                    style={{ originX: 0.5, originY: 1 }}
                    initial={still ? false : { scaleX: bud * 0.6, scaleY: bud, rotate: -twist }}
                    animate={open ? { scaleX: 1, scaleY: 1, rotate: 0 } : undefined}
                    transition={{ duration: 2.5 - ri * 0.2, delay: ringDelay(ri) + i * 0.035, ease: OPEN_EASE }}
                  />
                </g>
              ))}
            </motion.g>
          );
        })}
        <circle r="7" fill={obsidian ? "#e3b25a" : "#5a3010"} />
        <circle r="3.5" fill={obsidian ? "#fff1c2" : "#2a1408"} />
      </motion.g>
    </>
  );
}

function Lotus({ uid }: FlowerProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-l`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#f7c6d4" />
          <stop offset="0.6" stopColor="#ffe9f0" />
          <stop offset="1" stopColor="#fffaf4" />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${uid}-glow)`}>
        {[-70, -46, -22, 22, 46, 70, 0].map((a) => (
          <path
            key={a}
            d="M0 0 C-14 -16 -12 -44 0 -58 C12 -44 14 -16 0 0 Z"
            transform={`rotate(${a})`}
            fill={`url(#${uid}-l)`}
            stroke="#ffffff"
            strokeOpacity={0.6}
            strokeWidth={0.7}
          />
        ))}
        <ellipse cy="2" rx="12" ry="5" fill="#ffd27a" />
      </g>
      <path d="M-46 8 C-20 18 20 18 46 8 C24 22 -24 22 -46 8 Z" fill="#2f5a2a" stroke="#7fae6a" strokeOpacity={0.5} />
    </>
  );
}

function Orchid({ uid }: FlowerProps) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-o`}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#d9a6ff" />
          <stop offset="1" stopColor="#3a0f7a" />
        </radialGradient>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${uid}-glow)`}>
        {[0, 120, 240].map((a) => (
          <ellipse key={`s${a}`} rx="10" ry="32" cy="-24" transform={`rotate(${a})`} fill={`url(#${uid}-o)`} opacity="0.9" />
        ))}
        {[60, 300].map((a) => (
          <ellipse key={`p${a}`} rx="17" ry="26" cy="-20" transform={`rotate(${a})`} fill={`url(#${uid}-o)`} />
        ))}
        <path d="M-12 6 Q0 32 12 6 Q0 14 -12 6 Z" fill="#ff7fd0" />
        <circle r="4" fill="#ffe6a8" />
      </g>
    </>
  );
}

function Flower({ kind, uid, open, still, flare }: { kind: FlowerKind; uid: string; open: boolean; still: boolean; flare: number }) {
  switch (kind) {
    case "rose":
      return <Rose uid={uid} open={open} still={still} />;
    case "sakura":
      return <Sakura uid={uid} />;
    case "goldDahlia":
      return <Dahlia uid={uid} open={open} still={still} flare={flare} />;
    case "obsidianDahlia":
      return <Dahlia uid={uid} obsidian open={open} still={still} flare={flare} />;
    case "lotus":
      return <Lotus uid={uid} />;
    case "orchid":
      return <Orchid uid={uid} />;
  }
}

export type Bloom = { kind: FlowerKind; x: string; y: string; size: number; delay?: number; rotate?: number };

function Blossom({ bloom: b, index: i, uid, flare }: { bloom: Bloom; index: number; uid: string; flare: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion() ?? false;
  const delay = 0.4 + (b.delay ?? i * 0.25);
  const rotate = b.rotate ?? 0;
  // Roses and dahlias unfurl petal by petal, so they only need to rise into place; other flowers keep the spin-in.
  const isRose = b.kind === "rose" || b.kind === "goldDahlia" || b.kind === "obsidianDahlia";

  return (
    <motion.div
      ref={ref}
      className="absolute"
      style={{ left: b.x, top: b.y, width: b.size, height: b.size, marginLeft: -b.size / 2, marginTop: -b.size / 2 }}
      initial={
        reduce
          ? { rotate, opacity: 1 }
          : isRose
            ? { scale: 0.55, rotate: rotate - 12, opacity: 0, y: 10 }
            : { scale: 0.1, rotate: rotate - 70, opacity: 0 }
      }
      animate={inView ? { scale: 1, rotate, opacity: 1, y: 0 } : undefined}
      transition={
        isRose
          ? { duration: 3.2, delay, ease: OPEN_EASE, opacity: { duration: 0.8, delay } }
          : { duration: 2.2, delay, ease: [0.16, 1, 0.3, 1] }
      }
    >
      <motion.svg
        viewBox="-70 -70 140 140"
        className="size-full overflow-visible drop-shadow-[0_10px_24px_rgb(0_0_0/0.55)]"
        style={{ originX: 0.5, originY: b.kind === "rose" ? 0.85 : 0.5 }}
        animate={reduce ? undefined : { rotate: [-3, 3, -3], scale: [1, 1.04, 1] }}
        transition={{ duration: 7 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
      >
        <Flower kind={b.kind} uid={`${uid}-${i}`} open={inView} still={reduce} flare={flare} />
      </motion.svg>
    </motion.div>
  );
}

/**
 * Flowers that open when scrolled into view, then sway gently, placed over a painting.
 * Incrementing `flare` makes the dahlias bloom again with golden light.
 */
export function FloraField({ blooms, className, flare = 0 }: { blooms: Bloom[]; className?: string; flare?: number }) {
  const uid = useId().replace(/:/g, "");

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      {blooms.map((b, i) => (
        <Blossom key={i} bloom={b} index={i} uid={uid} flare={flare} />
      ))}
    </div>
  );
}
