"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Particles } from "./particles";
import { paintings, type Painting, type PaintingKey } from "./paintings";

/**
 * A full-bleed historical painting brought to life with restrained micro-animations: a slow camera
 * drift, rippling water (an animated displacement map masked to the water only), rain, mist, motes,
 * breathing light, and lightning, depending on the painting.
 */
export function PaintingCanvas({
  painting,
  priority = false,
  className,
  children,
}: {
  painting: PaintingKey;
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const p: Painting = paintings[painting];
  const fx = p.effects;
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();

  // The water ripple filter is the expensive effect: only run it on larger screens with a fine pointer.
  const [rich, setRich] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    const update = () => setRich(mq.matches && !reduce);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduce]);

  const img = (extra?: React.CSSProperties) => (
    <Image
      src={p.src}
      alt={`${p.title} by ${p.artist}, ${p.year}`}
      fill
      priority={priority}
      sizes="100vw"
      quality={78}
      className="object-cover"
      style={{ objectPosition: p.focus, ...extra }}
    />
  );

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-ink", className)}>
      {/* Water ripple filter */}
      {fx.waterline !== undefined && rich && (
        <svg aria-hidden className="absolute size-0">
          <filter id={`${uid}-ripple`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.05" numOctaves="2" seed="4">
              <animate attributeName="baseFrequency" dur="16s" values="0.006 0.05;0.008 0.065;0.006 0.05" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}

      <div className="animate-art-drift absolute inset-[-5%]">
        <div className={cn("absolute inset-0", fx.rock && "animate-art-rock origin-[55%_75%]")}>
          {img()}
          {fx.waterline !== undefined && rich && (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                maskImage: `linear-gradient(180deg, transparent ${fx.waterline - 4}%, #000 ${fx.waterline + 6}%)`,
                WebkitMaskImage: `linear-gradient(180deg, transparent ${fx.waterline - 4}%, #000 ${fx.waterline + 6}%)`,
              }}
            >
              {img({ filter: `url(#${uid}-ripple)` })}
            </div>
          )}
        </div>
      </div>

      {fx.glow && (
        <div
          aria-hidden
          className="animate-art-breathe pointer-events-none absolute inset-0 mix-blend-screen"
          style={{
            background: `radial-gradient(${fx.glow.size} ${fx.glow.size} at ${fx.glow.x} ${fx.glow.y}, rgb(${fx.glow.color} / 0.35), transparent 60%)`,
          }}
        />
      )}

      {fx.lightning && (
        <div
          aria-hidden
          className="animate-art-lightning pointer-events-none absolute inset-0 mix-blend-screen"
          style={{ background: `radial-gradient(40% 50% at ${fx.lightning.x} ${fx.lightning.y}, rgb(255 210 150 / 0.9), transparent 70%)` }}
        />
      )}

      {fx.mist && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { top: "18%", h: "26%", speed: "52s", delay: "0s", o: 0.22 },
            { top: "38%", h: "22%", speed: "64s", delay: "-24s", o: 0.16 },
          ].map((m, i) => (
            <div
              key={i}
              className="animate-art-mist absolute -left-1/4 w-[150%] blur-2xl"
              style={
                {
                  top: m.top,
                  height: m.h,
                  "--mist-speed": m.speed,
                  "--mist-delay": m.delay,
                  background: `radial-gradient(50% 50% at 50% 50%, rgb(255 245 230 / ${m.o}), transparent 70%)`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {fx.rain && <Particles mode="rain" />}
      {fx.motes && <Particles mode="motes" />}

      {children}
    </div>
  );
}

/** Museum-style wall caption for a painting. */
export function PaintingCaption({ painting, className }: { painting: PaintingKey; className?: string }) {
  const p = paintings[painting];
  return (
    <p className={cn("font-mono text-[10px] uppercase tracking-[0.18em] text-white/45", className)}>
      <a href={p.source} target="_blank" rel="noreferrer" className="transition-colors hover:text-white/80">
        <span className="font-display text-[13px] normal-case italic tracking-normal text-white/70">{p.title}</span>
        <span className="mx-2 text-white/25">·</span>
        {p.artist}, {p.year}
        <span className="mx-2 text-white/25">·</span>
        Public domain
      </a>
    </p>
  );
}
