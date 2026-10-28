"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Lightweight canvas particles over a painting: slanted rain streaks, slow sunlit dust motes, or
 * wind-blown sea spray skimming the lower water. Pauses when off-screen or when the tab is hidden;
 * disabled for reduced motion.
 */
export function Particles({ mode, className }: { mode: "rain" | "motes" | "spray"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduce) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = mode === "rain" ? Math.round((w * h) / 9000) : mode === "spray" ? Math.round((w * h) / 16000) : Math.round((w * h) / 28000);
    // Spray lives on the water: the lower ~45% of the canvas.
    const sprayTop = () => h * (0.55 + Math.random() * 0.45);
    const parts = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: mode === "spray" ? sprayTop() : Math.random() * h,
      v: mode === "rain" ? 9 + Math.random() * 9 : mode === "spray" ? 1.2 + Math.random() * 2.6 : 0.15 + Math.random() * 0.35,
      len: mode === "rain" ? 10 + Math.random() * 18 : mode === "spray" ? 0.6 + Math.random() * 2.2 : 0.8 + Math.random() * 1.8,
      a: mode === "rain" ? 0.12 + Math.random() * 0.25 : mode === "spray" ? 0.08 + Math.random() * 0.3 : 0.25 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const onVisibility = () => {
      if (!document.hidden && visible && !raf) raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVisibility);

    function tick(t: number) {
      raf = 0;
      if (!visible || document.hidden || !ctx) return;
      ctx.clearRect(0, 0, w, h);
      if (mode === "rain") {
        ctx.lineCap = "round";
        for (const p of parts) {
          p.x -= p.v * 0.28;
          p.y += p.v;
          if (p.y > h + 20) {
            p.y = -20;
            p.x = Math.random() * (w + 200);
          }
          ctx.strokeStyle = `rgba(210,220,235,${p.a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.len * 0.28, p.y - p.len);
          ctx.stroke();
        }
      } else if (mode === "spray") {
        // Blown off the crests by the gale: fast leftward drift, a lift-and-fall arc, fading as it goes.
        for (const p of parts) {
          p.x -= p.v;
          p.y += Math.sin(t / 700 + p.phase) * 0.35 - 0.12;
          if (p.x < -20) {
            p.x = w + Math.random() * 60;
            p.y = sprayTop();
          }
          ctx.fillStyle = `rgba(226,234,236,${p.a * (0.55 + 0.45 * Math.sin(t / 500 + p.phase))})`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.len * 2.2, p.len, -0.15, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        for (const p of parts) {
          p.y -= p.v;
          p.x += Math.sin(t / 2400 + p.phase) * 0.25;
          if (p.y < -10) {
            p.y = h + 10;
            p.x = Math.random() * w;
          }
          const tw = 0.6 + 0.4 * Math.sin(t / 900 + p.phase);
          ctx.fillStyle = `rgba(255,226,170,${p.a * tw})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.len, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode, reduce]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 size-full", className)} />;
}
