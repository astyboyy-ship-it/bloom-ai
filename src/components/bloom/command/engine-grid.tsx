"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CornerDownLeft, KeyRound, Settings2, Terminal } from "lucide-react";
import { EngineLock } from "@/components/desk/engine-lock";
import { fmtUsdCompact } from "@/components/desk/format";
import { useMetricFeed } from "@/components/desk/metrics";
import { can } from "@/components/desk/rbac";
import { RunConsoleDrawer } from "@/components/desk/run-console-drawer";
import { activeMember, useDeskSettings } from "@/components/desk/settings";
import { PRESETS } from "@/components/desk/copy";
import { useLicense } from "@/lib/license-context";
import { TIER_INFO } from "@/lib/license/tiers";
import type { Lang } from "../i18n";
import { LanguageSwitcher } from "../language-switcher";
import { paintings } from "../art/paintings";
import { BloomWordmark } from "../logo";
import { EngineStatus } from "./engine-status";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "./engines";
import { localizeEngine, useCommandCopy } from "./locale";
import { PALETTES, paletteVars } from "./theme";
import { EngineBadge } from "./tutorial";
import { UTILITY } from "./utility";

const COPY: Record<Lang, { title: string; sub: string; enter: string; guided: string; metricNote: string; desk: string }> = {
  en: {
    title: "Command Center",
    sub: "Eight engines, one operating system. Enter any engine's desk to command it live, or run its guided setup.",
    enter: "Enter Engine Desk",
    guided: "Guided setup",
    metricNote: "Metric previews are sample data.",
    desk: "Open the full desk",
  },
  es: {
    title: "Centro de Mando",
    sub: "Ocho motores, un sistema operativo. Entra en la mesa de cualquier motor para darle órdenes en vivo, o usa su configuración guiada.",
    enter: "Entrar a la mesa del motor",
    guided: "Configuración guiada",
    metricNote: "Las métricas mostradas son datos de muestra.",
    desk: "Abrir la mesa completa",
  },
  he: {
    title: "מרכז הפיקוד",
    sub: "שמונה מנועים, מערכת הפעלה אחת. היכנסו לשולחן של כל מנוע כדי לפקד עליו בזמן אמת, או הריצו את ההגדרה המודרכת שלו.",
    enter: "כניסה לשולחן המנוע",
    guided: "הגדרה מודרכת",
    metricNote: "המדדים המוצגים הם נתוני דוגמה.",
    desk: "פתיחת השולחן המלא",
  },
};

/** The classic Command Center: all eight engines as painted cards, each opening its own desk. */
export function EngineGrid() {
  const { lang, dir, c } = useCommandCopy();
  const g = COPY[lang];
  const metrics = useMetricFeed();
  const { engines: licensed, isUnlocked, tier } = useLicense();
  const { settings } = useDeskSettings();
  const mayRun = can(activeMember(settings).role, "run");
  const [engine, setEngine] = useState<EngineKey | null>(null);
  const [text, setText] = useState("");
  const [request, setRequest] = useState<{ engine: EngineKey; command: string; id: number } | null>(null);
  const target = engine && isUnlocked(engine) ? engine : licensed[0];
  const submit = () => {
    if (text.trim().length < 3 || !mayRun) return;
    setRequest({ engine: target, command: text.trim(), id: Date.now() });
  };
  return (
    <div lang={lang} dir={dir} className="relative isolate min-h-dvh bg-ink px-4 py-10 font-sans text-white sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgb(255_189_110/0.09),transparent_55%)]" />
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="rounded focus-visible:outline-2 focus-visible:outline-[#f0d59a]">
            <BloomWordmark className="text-[26px]" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/desk"
              className="hidden items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-[12.5px] text-white/75 transition-colors hover:border-[#f0d59a]/50 hover:text-white sm:inline-flex"
            >
              {g.desk} <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.32em] text-[#f0d59a]/80">{c.pickerTitle}</p>
        <h1 className="mt-2 font-display text-[44px] font-light leading-tight sm:text-[60px]">{g.title}</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-white/55">{g.sub}</p>

        {/* Quick command: run any licensed engine from here, in a slide-over console. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="glass mt-8 flex flex-col gap-2 rounded-2xl p-3 sm:flex-row sm:items-center"
        >
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[13px]">
            <Terminal className="size-4 shrink-0 text-[#f3e2b8]" />
            <span className="sr-only">Engine</span>
            <select value={target} onChange={(e) => setEngine(e.target.value as EngineKey)} className="bg-transparent text-white focus:outline-none">
              {licensed.map((k) => (
                <option key={k} value={k} className="bg-ink">
                  {ENGINES[k].index} {ENGINES[k].name}
                </option>
              ))}
            </select>
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!mayRun}
            placeholder={mayRun ? `Command ${ENGINES[target].name}…` : "Your role can't run engines"}
            aria-label="Command"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[14px] text-white placeholder:text-white/30 focus:border-[#f0d59a]/50 focus:outline-none disabled:opacity-50"
          />
          <div className="flex gap-2">
            <button type="button" disabled={!mayRun} onClick={() => setText(PRESETS[lang][target])} className="rounded-xl border border-white/10 px-3 py-2 text-[12px] text-white/60 hover:text-white disabled:opacity-40">
              Sample
            </button>
            <button type="submit" disabled={text.trim().length < 3 || !mayRun} className="flex items-center gap-2 rounded-xl bg-[#f3e2b8] px-5 py-2 text-[13px] font-semibold text-[#1a0f05] disabled:opacity-40">
              Execute <CornerDownLeft className="size-3.5 rtl:-scale-x-100" />
            </button>
          </div>
        </form>
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-white/40">
          <KeyRound className="size-3" /> {TIER_INFO[tier].label}: {licensed.length} of 8 architectures unlocked.
          <Link href="/desk/settings#license" className="text-[#f3e2b8]/70 hover:text-[#f3e2b8]">
            Manage license
          </Link>
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {ENGINE_ORDER.map((k) => {
            const e = localizeEngine(ENGINES[k], lang);
            const p = paintings[e.painting];
            return (
              <EngineLock key={k} engine={k} lang={lang} compact className="rounded-2xl">
              <article style={paletteVars(PALETTES[k])} className="group relative flex min-h-[27rem] flex-col overflow-hidden rounded-2xl border border-c-edge/60 shadow-[0_0_60px_-30px_var(--c-glow)]">
                <Image src={p.src} alt={`${p.title} by ${p.artist}, ${p.year}`} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-105" style={{ objectPosition: p.focus }} />
                <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/45 to-black/10" />
                <div className="relative flex items-start justify-between gap-2 p-4">
                  <p className="rounded-full border border-c-edge/60 bg-black/60 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.24em] text-c-2 backdrop-blur-md" dir="ltr">
                    {e.index} {e.name}
                  </p>
                  <EngineStatus engine={k} />
                </div>
                <div className="relative mt-auto p-3">
                  <div className="rounded-xl border border-c-edge/50 bg-black/60 p-4 backdrop-blur-md">
                    <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-c-2/90">
                      {c.engineNo} {e.index}
                      {e.badge && <EngineBadge>{e.badge}</EngineBadge>}
                    </p>
                    <h2 className="mt-1 font-logo text-[26px] font-medium leading-none tracking-[-0.03em]">{e.name}</h2>
                    <p className="mt-1 text-[13px] text-white/65">{e.role}</p>
                    <p className="mt-2 text-[12.5px] leading-snug text-white/50">{UTILITY[lang][k]}</p>
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.08] pt-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/45">{e.metric}</p>
                        <p className="font-mono text-[18px] tabular-nums text-c-2">{fmtUsdCompact(metrics[k])}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href="/setup"
                          aria-label={`${g.guided}: ${e.name}`}
                          title={g.guided}
                          className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white/65 transition-colors hover:border-c-edge hover:text-white focus-visible:outline-2 focus-visible:outline-c-2"
                        >
                          <Settings2 className="size-4" />
                        </Link>
                        <Link
                          href={`/desk/engines/${k}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-c-1 to-c-2 px-4 py-2 text-[12.5px] font-semibold text-black shadow-[0_0_30px_-8px_var(--c-glow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-2"
                        >
                          {g.enter} <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
              </EngineLock>
            );
          })}
        </div>
        <p className="mt-6 text-center text-[11.5px] text-white/35">{g.metricNote}</p>
      </div>
      <RunConsoleDrawer request={request} lang={lang} onClose={() => setRequest(null)} />
    </div>
  );
}
