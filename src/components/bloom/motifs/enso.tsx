"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** An ensō (円相) brush circle that paints itself when scrolled into view, leaving the traditional open gap. */
export function Enso({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 200 200" className={cn("pointer-events-none overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-ink`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5a9b0" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#ffbd6e" stopOpacity="0.6" />
          <stop offset="1" stopColor="#b49bff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <motion.path
        d="M 128 22 C 178 38, 196 98, 170 140 C 146 180, 86 194, 48 166 C 12 140, 6 84, 34 50 C 54 26, 86 16, 112 20"
        fill="none"
        stroke={`url(#${uid}-ink)`}
        strokeWidth={7}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 2.4, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}
