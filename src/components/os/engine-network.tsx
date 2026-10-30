"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Gauge, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { paintings } from "@/components/bloom/art/paintings";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { localizeEngine, useCommandCopy } from "@/components/bloom/command/locale";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { UTILITY } from "@/components/bloom/command/utility";
import { LockBadge } from "@/components/desk/engine-lock";
import { fmtUsdCompact } from "@/components/desk/format";
import { HUB_COPY } from "@/components/desk/hub-copy";
import { useMetricFeed } from "@/components/desk/metrics";
import { NetworkView } from "@/components/desk/network-view";
import { useLicense } from "@/lib/license-context";
import { useOsTelemetry } from "./telemetry-context";
import { OsPage } from "./os-shell";

/** The complete engine network: the live hand-off graph, then all eight engines as bento cards. */
export function EngineNetwork() {
  const { lang } = useCommandCopy();
  const router = useRouter();
  const { isUnlocked, engines } = useLicense();
  const { manifest } = useOsTelemetry();
  const metrics = useMetricFeed();
  const go = (k: EngineKey) => router.push(`/desk/engines/${k}`);

  return (
    <OsPage kicker="Engine network · 8 engines" title="Every engine, one network" lede={`Each engine is a full command center with its own live console and calibration. ${engines.length} of 8 are unlocked by your license; lines show who may hand work to whom.`}>
      <div className="grid items-start gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div className="os-panel rounded-2xl p-2">
          <NetworkView unlocked={isUnlocked} label={HUB_COPY[lang].network} hint={HUB_COPY[lang].networkHint} engines={manifest?.engines} agents={{}} statuses={{}} selected="sovereign" onSelect={go} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ENGINE_ORDER.slice(0, 4).map((k) => (
            <EngineCard key={k} k={k} lang={lang} value={metrics[k]} unlocked={isUnlocked(k)} />
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ENGINE_ORDER.slice(4).map((k) => (
          <EngineCard key={k} k={k} lang={lang} value={metrics[k]} unlocked={isUnlocked(k)} />
        ))}
      </div>
      <p className="mt-4 text-[11.5px] text-white/35">Metric previews are sample data.</p>
    </OsPage>
  );
}

function EngineCard({ k, lang, value, unlocked }: { k: EngineKey; lang: "en" | "es" | "he"; value: number; unlocked: boolean }) {
  const e = localizeEngine(ENGINES[k], lang);
  const p = paintings[e.painting];
  return (
    <article style={paletteVars(PALETTES[k])} className="group relative isolate overflow-hidden rounded-2xl border border-os-line bg-os-panel/80 transition-[border-color,box-shadow] hover:border-c-1/50 hover:shadow-[0_0_40px_-16px_var(--c-glow)]">
      <Image src={p.src} alt="" fill sizes="(min-width: 1280px) 25vw, 50vw" className={cn("-z-10 object-cover opacity-25 transition-[opacity,transform] duration-700 group-hover:scale-105 group-hover:opacity-35", !unlocked && "grayscale")} style={{ objectPosition: p.focus }} />
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-os-bg via-os-bg/85 to-os-bg/40" />
      <div className="flex h-full flex-col p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] tracking-[0.2em] text-c-2">
            {e.index} · {e.badge}
          </span>
          {unlocked ? <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-os-emerald"><span className="size-1.5 rounded-full bg-os-emerald shadow-[0_0_6px_#34f5b5]" /> Online</span> : <LockBadge engine={k} />}
        </div>
        <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-white">{e.name}</h2>
        <p className="text-[12.5px] text-white/55">{e.role}</p>
        <p className="mt-2 line-clamp-3 text-[12px] leading-snug text-white/45">{UTILITY[lang][k]}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div className="min-w-0">
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-white/40">{e.metric}</p>
            <p className="font-mono text-[16px] tabular-nums text-c-2">{fmtUsdCompact(value)}</p>
          </div>
          <div className="flex gap-1.5">
            <Link href={`/desk/engines/${k}?tab=command`} title="Command center" aria-label={`${e.name} command center`} className="flex size-8 items-center justify-center rounded-lg border border-os-line text-white/60 hover:border-c-1/50 hover:text-white">
              <Gauge className="size-4" />
            </Link>
            <Link href={`/desk/engines/${k}`} className="flex items-center gap-1 rounded-lg bg-linear-to-r from-c-1 to-c-2 px-3 py-1.5 text-[12px] font-semibold text-black">
              <Terminal className="size-3.5" /> Console <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
