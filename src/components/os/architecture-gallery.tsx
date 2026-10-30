"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { paintings } from "@/components/bloom/art/paintings";
import { ENGINES } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { useDeskSettings } from "@/components/desk/settings";
import { ARCHITECTURES } from "@/lib/architectures";
import { useLicense } from "@/lib/license-context";
import { TIER_INFO } from "@/lib/license/tiers";
import { tierFor } from "./architecture-workspace";
import { OsPage } from "./os-shell";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/** All ten architecture products. Each opens its own full-screen workspace; locked ones show the tier they need. */
export function ArchitectureGallery() {
  const { engines } = useLicense();
  const { settings } = useDeskSettings();
  const open = ARCHITECTURES.filter((a) => a.engines.every((k) => engines.includes(k))).length;
  return (
    <OsPage kicker="Architectures · 10 products" title="Flagship architecture products" lede={`Each architecture is a multi-agent product with its own topology, simulation testbed, governance and audit history. ${open} of 10 are available on your license.`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ARCHITECTURES.map((a, i) => {
          const unlocked = a.engines.every((k) => engines.includes(k));
          const lead = a.engines.at(-1)!;
          const p = paintings[ENGINES[lead].painting];
          const runs = settings.runs.filter((r) => r.target === a.id).length;
          return (
            <Link
              key={a.id}
              href={`/desk/architectures/${a.slug}`}
              style={paletteVars(PALETTES[lead])}
              className={cn("group relative isolate flex min-h-64 flex-col overflow-hidden rounded-2xl border border-os-line bg-os-panel/80 p-5 transition-[border-color,box-shadow] hover:border-os-cyan/40 hover:shadow-[0_0_50px_-20px_rgb(0_240_255/0.5)]", a.id === "os" && "sm:col-span-2 xl:col-span-1")}
            >
              <Image src={p.src} alt="" fill sizes="(min-width: 1280px) 33vw, 50vw" className={cn("-z-10 object-cover opacity-20 transition-[opacity,transform] duration-700 group-hover:scale-105 group-hover:opacity-30", !unlocked && "grayscale")} style={{ objectPosition: p.focus }} />
              <div className="absolute inset-0 -z-10 bg-linear-to-t from-os-bg via-os-bg/80 to-os-bg/30" />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] tracking-[0.22em] text-os-cyan/80">ARCH Nº {String(i + 1).padStart(2, "0")}</span>
                {unlocked ? (
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-os-emerald">● Deployable{runs ? ` · ${runs} runs` : ""}</span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/70">
                    <Lock className="size-3" /> {TIER_INFO[tierFor(a.engines)].short}
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-white">{a.name}</h2>
              <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug text-white/55">{a.tagline}</p>
              <p className="mt-3 flex flex-wrap gap-1">
                {a.engines.map((k) => (
                  <span key={k} style={paletteVars(PALETTES[k])} className="rounded-full border border-c-edge/60 bg-black/40 px-1.5 py-px font-mono text-[9.5px] text-c-2">
                    {ENGINES[k].name}
                  </span>
                ))}
              </p>
              <div className="mt-auto flex items-end justify-between pt-4">
                <span className="font-mono text-[11px] text-white/45">
                  {usd(a.setup)} · {usd(a.retainer)}/mo
                </span>
                <span className="flex items-center gap-1 text-[12.5px] text-os-cyan">
                  Open workspace <ArrowUpRight className="size-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </OsPage>
  );
}
