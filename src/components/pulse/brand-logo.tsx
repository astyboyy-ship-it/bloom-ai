"use client";

import { cn } from "@/lib/utils";
import { brandOf, type Company } from "./companies";

/** A company's mark in a glass tile: its brand SVG in the private showcase, a monogram otherwise. */
export function BrandLogo({ company, size = 48, className }: { company: Company; size?: number; className?: string }) {
  const brand = brandOf(company);
  const mark = brand.mark ?? null;
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50", className)} style={{ width: size, height: size, boxShadow: `0 0 24px -10px ${brand.color}` }}>
      {mark ? (
        <svg viewBox="0 0 24 24" style={{ width: size * 0.58, height: size * 0.58 }} role="img" aria-label={mark.title}>
          <path d={mark.path} fill={mark.hex} />
        </svg>
      ) : (
        <span className="font-mono font-semibold tracking-tight" style={{ color: brand.color, fontSize: Math.round(size * 0.27) }}>
          {brand.monogram ?? brand.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
