"use client";

import { ArrowRight, Code2, Zap } from "lucide-react";
import { FloraField } from "@/components/bloom/art/flora";
import { MACRO_DOMAINS, PROTOCOL_REGISTRY, type MacroDomain } from "@/lib/exchange/omni-adapter";
import { useOmniCopy } from "./omni-copy";
import { Panel } from "./ui";

export function IntroHero({ onInject, onSdk, onDomain }: { onInject: () => void; onSdk: () => void; onDomain: (d: MacroDomain) => void }) {
  const t = useOmniCopy();
  // The homepage voice: the headline in Cormorant, its last clause in gold italic.
  const cut = t.hero.title.lastIndexOf(", ");
  const head = cut > 0 ? t.hero.title.slice(0, cut + 1) : "";
  const accent = cut > 0 ? t.hero.title.slice(cut + 2) : t.hero.title;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Panel className="relative overflow-hidden xl:col-span-7">
        <div className="xch-velvet pointer-events-none absolute -right-24 -top-28 size-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(225,29,72,0.16),transparent)]" aria-hidden />
        <FloraField blooms={[{ kind: "rose", x: "94%", y: "14%", size: 92, delay: 0.3, rotate: -14 }]} className="opacity-90" still />
        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--xch-gold)]/80">Nº 002 <span className="mx-2 text-white/25">—</span> {t.hero.kicker}</p>
          <h1 className="xch-display mt-4 max-w-3xl text-[38px] leading-[1.02] text-[var(--xch-cream)] sm:text-[54px]">
            {head} <span className="xch-gold-italic">{accent}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-white/55">{t.hero.sub}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={onInject} className="group flex items-center gap-2 rounded-full bg-[#f0d59a] px-4 py-2 text-[13px] font-medium text-[#1a0d0a] shadow-[0_10px_30px_-12px_rgba(240,213,154,0.6)] transition-transform duration-150 hover:-translate-y-px">
              <Zap className="size-3.5" /> {t.hero.inject}
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 rtl:rotate-180" />
            </button>
            <button type="button" onClick={onSdk} className="flex items-center gap-2 rounded-full border border-[var(--xch-line-strong)] px-4 py-2 text-[13px] text-white/80 transition-colors duration-150 hover:bg-white/[0.04] hover:text-white">
              <Code2 className="size-3.5" /> {t.hero.sdk}
            </button>
          </div>
        </div>
      </Panel>

      <Panel className="xl:col-span-5">
        <p className="text-[13.5px] font-medium text-white">{t.hero.registry}</p>
        <p className="mt-1 text-[12px] text-white/45">{t.hero.registrySub}</p>
        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {MACRO_DOMAINS.map((d) => {
            const presets = PROTOCOL_REGISTRY.filter((p) => p.domain === d);
            return (
              <li key={d}>
                <button type="button" onClick={() => onDomain(d)} className="w-full rounded-[10px] border border-[var(--xch-line)] bg-black/20 px-3 py-2 text-start transition-colors duration-150 hover:border-[var(--xch-line-strong)] hover:bg-white/[0.025]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-white/85">{t.domains[d]}</span>
                    <span className="tnum font-mono text-[10px] text-[var(--xch-verified)]">{presets.length}</span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-white/35" dir="ltr">
                    {presets.map((p) => p.label).join(" · ")}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
