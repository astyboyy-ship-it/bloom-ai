import { cn } from "@/lib/utils";

const tones = {
  amber: { core: "#ffb347", ring: "rgb(255 179 71 / 0.55)", glow: "rgb(255 150 50 / 0.8)" },
  cyan: { core: "#5ee7ff", ring: "rgb(94 231 255 / 0.55)", glow: "rgb(94 231 255 / 0.8)" },
} as const;

/** A glowing SVG status light with a pulsing outer ring. */
export function StatusLed({ tone = "amber", className }: { tone?: keyof typeof tones; className?: string }) {
  const t = tones[tone];
  return (
    <span className={cn("relative inline-flex size-3.5 shrink-0 items-center justify-center", className)} aria-hidden>
      <span className="absolute inset-0 animate-ping rounded-full [animation-duration:1.8s]" style={{ background: t.ring }} />
      <svg viewBox="0 0 14 14" className="relative size-full" style={{ filter: `drop-shadow(0 0 4px ${t.glow})` }}>
        <circle cx="7" cy="7" r="6" fill="none" stroke={t.ring} strokeWidth="1" className="animate-pulse" />
        <circle cx="7" cy="7" r="3.4" fill={t.core} />
        <circle cx="6" cy="6" r="1.1" fill="#fff" fillOpacity="0.85" />
      </svg>
    </span>
  );
}
