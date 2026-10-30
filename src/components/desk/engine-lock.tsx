"use client";

import Link from "next/link";
import { Check, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { UTILITY } from "@/components/bloom/command/utility";
import type { Lang } from "@/components/bloom/i18n";
import { useLicense } from "@/lib/license-context";
import { TIER_ENGINES, TIER_INFO, upgradeTierFor } from "@/lib/license/tiers";

/** The small tier-lock badge for rails, cards and nodes. */
export function LockBadge({ engine, className }: { engine: EngineKey; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-1.5 py-px font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/70", className)}>
      <Lock className="size-2.5" /> {TIER_INFO[upgradeTierFor(engine)].short}
    </span>
  );
}

/**
 * Wraps an engine surface. When the license doesn't include the engine, the surface is blurred behind a
 * tier-lock panel: what the engine does, what the upgrade tier adds, and the Upgrade Architecture License CTA.
 */
export function EngineLock({ engine, lang, children, compact = false, className }: { engine: EngineKey; lang: Lang; children: React.ReactNode; compact?: boolean; className?: string }) {
  const { isUnlocked, tier } = useLicense();
  if (isUnlocked(engine)) return <>{children}</>;
  const e = ENGINES[engine];
  const need = upgradeTierFor(engine);
  const adds = TIER_ENGINES[need].filter((k) => !TIER_ENGINES[tier].includes(k));
  return (
    // The full lock panel is taller than some surfaces it covers (a command box), so it reserves room for itself.
    <div style={paletteVars(PALETTES[engine])} className={cn("relative isolate overflow-hidden", !compact && "min-h-[26rem]", className)}>
      <div aria-hidden inert className="pointer-events-none select-none blur-[6px] saturate-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-[2px]">
        <div role="region" aria-label={`${e.name} is locked`} className={cn("os-panel w-full rounded-2xl text-start", compact ? "max-w-sm p-4" : "max-w-lg p-6")}>
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-c-2">
            <Lock className="size-3.5" /> Tier lock · Engine Nº {e.index}
          </p>
          <h3 className={cn("mt-2 font-logo font-medium tracking-[-0.03em] text-white", compact ? "text-[20px]" : "text-[26px]")}>{e.name} requires {TIER_INFO[need].label}</h3>
          <p className="mt-1.5 text-[12.5px] leading-snug text-white/60">{UTILITY[lang][engine]}</p>
          {!compact && (
            <>
              <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/45">What you unlock</p>
              <ul className="mt-2 space-y-1.5">
                {e.cards.slice(0, 3).map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-[12.5px] text-white/75">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-c-1" /> {c.title(c.agents, c.count)}
                  </li>
                ))}
                {adds.length > 1 && (
                  <li className="flex items-start gap-2 text-[12.5px] text-white/75">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-c-1" /> Also unlocks {adds.filter((k) => k !== engine).map((k) => ENGINES[k].name).join(", ")}
                  </li>
                )}
              </ul>
            </>
          )}
          <Link
            href="/desk/settings#license"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-c-1 to-c-2 px-4 py-2 text-[12.5px] font-semibold text-black shadow-[0_0_30px_-8px_var(--c-glow)]"
          >
            <Lock className="size-3.5" /> Upgrade Architecture License
          </Link>
          <p className="mt-2 text-[11px] text-white/40">Current: {TIER_INFO[tier].label}</p>
        </div>
      </div>
    </div>
  );
}
