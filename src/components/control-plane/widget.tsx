"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A control-plane pane: key-tinted obsidian glass with a mono kicker, title and an optional action slot. */
export function Widget({ icon: Icon, title, sub, actions, className, children }: { icon: LucideIcon; title: string; sub?: string; actions?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("bloom-glass bloom-noise group/widget flex min-w-0 flex-col rounded-2xl p-4 hover:border-os-cyan/30 hover:shadow-[0_0_48px_-26px_var(--tier-glow)]", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-os-cyan">
            <Icon className="size-3.5" />
            <span className="bloom-glow">{title}</span>
          </h2>
          {sub && <p className="bloom-detail mt-1.5 max-w-3xl text-[12px] leading-relaxed text-white/45">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="mt-3 min-h-0 flex-1">{children}</div>
    </section>
  );
}

/** A compact button in the control plane's style. */
export function CpButton({ className, tone = "accent", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "accent" | "quiet" | "warn" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-[color,background-color,border-color,box-shadow,transform] duration-200 enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-os-cyan",
        tone === "accent" && "border-os-cyan/40 text-os-cyan hover:bg-os-cyan/10 enabled:hover:bloom-edge-glow",
        tone === "quiet" && "border-white/15 text-white/65 hover:border-white/30 hover:text-white",
        tone === "warn" && "border-amber-300/40 text-amber-200 hover:bg-amber-300/10",
        className,
      )}
    />
  );
}
