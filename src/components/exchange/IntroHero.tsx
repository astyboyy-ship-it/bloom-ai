"use client";

import { ArrowRight, Code2, Zap } from "lucide-react";
import { MACRO_DOMAINS, PROTOCOL_REGISTRY, type MacroDomain } from "@/lib/exchange/omni-adapter";
import { useOmniCopy } from "./omni-copy";
import { Panel } from "./ui";

export function IntroHero({ onInject, onSdk, onDomain }: { onInject: () => void; onSdk: () => void; onDomain: (d: MacroDomain) => void }) {
  const t = useOmniCopy();
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Panel className="relative overflow-hidden xl:col-span-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden />
        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--xch-emerald)]">{t.hero.kicker}</p>
          <h1 className="mt-3 max-w-2xl text-[28px] font-medium leading-[1.12] tracking-[-0.025em] text-white sm:text-[38px]">{t.hero.title}</h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-white/55">{t.hero.sub}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={onInject} className="group flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--xch-emerald)_45%,transparent)] bg-[color-mix(in_srgb,var(--xch-emerald)_10%,transparent)] px-3.5 py-2 text-[13px] text-[var(--xch-emerald)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--xch-emerald)_16%,transparent)]">
              <Zap className="size-3.5" /> {t.hero.inject}
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 rtl:rotate-180" />
            </button>
            <button type="button" onClick={onSdk} className="flex items-center gap-2 rounded-lg border border-[var(--xch-line-strong)] px-3.5 py-2 text-[13px] text-white/75 transition-colors duration-150 hover:bg-white/[0.04] hover:text-white">
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
                    <span className="tnum font-mono text-[10px] text-[var(--xch-emerald)]">{presets.length}</span>
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
