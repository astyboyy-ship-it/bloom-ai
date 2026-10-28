"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GardenLayout, GardenPaletteName } from "./rose-vines-3d";

// three.js is heavy: load it only in the browser, after the painting has painted.
const RoseVineScene = dynamic(() => import("./rose-vines-3d").then((m) => m.RoseVineScene), { ssr: false });

/**
 * A living 3D frame of rose vines around a painting. Renders `fallback` without WebGL2, pauses when
 * scrolled away, and draws a single still, fully bloomed frame for reduced motion.
 */
export function RoseFrame({ className, layout = "climb", palette = "crimson", fallback }: { className?: string; layout?: GardenLayout; palette?: GardenPaletteName; fallback?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const [supported, setSupported] = useState<boolean | null>(null);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      setSupported(!!gl);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      setSupported(false);
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 transition-opacity duration-1000", ready || supported === false ? "opacity-100" : "opacity-0", className)}
    >
      {supported && <RoseVineScene active={active} still={reduce} layout={layout} palette={palette} onReady={() => setReady(true)} />}
      {supported === false && fallback}
    </div>
  );
}
