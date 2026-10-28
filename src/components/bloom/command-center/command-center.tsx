"use client";

import { createContext, useCallback, useContext, useEffect, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, Code2, Inbox, LayoutGrid, ListChecks, Loader2, Pause, Play, Radar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DispatchAction } from "@/lib/intentpulse/outreach";
import { PLATFORMS, SWEEPABLE, type Platform, type PulseSignal } from "@/lib/intentpulse/signal";
import { BloomWordmark } from "../logo";
import { Atmosphere, DahliaGarland } from "./atmosphere";
import { CinematicIntro, INTRO_EXIT_S, INTRO_HOLD_MS } from "./cinematic-intro";
import { DeveloperDrawer } from "./developer-drawer";
import { InspectionDrawer } from "./inspection-drawer";
import { Button } from "./kit";
import { fmt } from "./platform";
import { usePulseEngine, type PulseEngine } from "./use-pulse-engine";
import { useRolling, velocityOf, type ViewProps } from "./views/overview";

export const BASE = "/demo/intentpulse";

const NAV = [
  { href: BASE, label: "Overview", hint: "Revenue, live signals, closes", icon: LayoutGrid },
  { href: `${BASE}/radar`, label: "Radar", hint: "Live signals by channel", icon: Radar },
  { href: `${BASE}/inbox`, label: "Inbox", hint: "DM interceptor and drafts", icon: Inbox },
  { href: `${BASE}/rules`, label: "Rules", hint: "Keyword triggers and auto-replies", icon: ListChecks },
  { href: `${BASE}/analytics`, label: "Analytics", hint: "Funnels, attribution, deals", icon: BarChart3 },
];
const TITLES: Record<string, string> = { [BASE]: "Overview", [`${BASE}/radar`]: "Lead radar", [`${BASE}/inbox`]: "DM inbox", [`${BASE}/rules`]: "Rules & automations", [`${BASE}/analytics`]: "Analytics" };

type Pulse = ViewProps & { setSweepChannel: (p?: Platform) => void };
const Ctx = createContext<Pulse | null>(null);

/** The running engine plus inspector access, for IntentPulse's routed pages. */
export function usePulse() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePulse must be used inside the IntentPulse layout");
  return v;
}

/**
 * IntentPulse's persistent layout. The engine (live stream, sweeps, dispatches) lives here, so it
 * keeps running across Overview, Radar, Inbox, Rules and Analytics. The Vernet → Lorrain intro plays
 * only when /demo/intentpulse is the first page loaded.
 */
export function IntentPulseApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const atRoot = pathname === BASE;
  const [phase, setPhase] = useState<"playing" | "leaving" | "done">(atRoot ? "playing" : "done");
  const [skipped, setSkipped] = useState(!atRoot);
  const [selected, setSelected] = useState<PulseSignal | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [sweepChannel, setSweepChannel] = useState<Platform | undefined>(undefined);
  const e = usePulseEngine();
  const rolling = useRolling(e);

  // Row timestamps only need 5-second resolution; this keeps memoized rows from re-rendering every tick.
  const coarseNow = Math.floor(e.now / 5000) * 5000;

  useEffect(() => {
    if (!atRoot) return;
    if (new URLSearchParams(window.location.search).get("intro") === "0") {
      setSkipped(true);
      return setPhase("done");
    }
    const t = setTimeout(() => setPhase((p) => (p === "playing" ? "leaving" : p)), INTRO_HOLD_MS);
    return () => clearTimeout(t);
    // Decided once, on the first page loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skipIntro = useCallback(() => setPhase((p) => (p === "playing" ? "leaving" : p)), []);
  const introExited = useCallback(() => setPhase("done"), []);

  const open = useCallback((s: PulseSignal) => setSelected(s), []);
  const closeDrawer = useCallback(() => setSelected(null), []);
  const closeDev = useCallback(() => setDevOpen(false), []);
  const act = (kind: DispatchAction) => selected && e.dispatch(selected, kind);
  const rescore = async () => {
    if (!selected) return;
    const next = await e.rescore(selected);
    if (next) setSelected(next);
  };

  const value: Pulse = { e, now: coarseNow, selectedId: selected?.id, onOpen: open, setSweepChannel };
  const active = (href: string) => (href === BASE ? pathname === BASE : pathname.startsWith(href));

  return (
    <div className="bloom relative isolate min-h-dvh overflow-x-clip !bg-transparent">
      <Atmosphere />

      <motion.div
        key={skipped ? "skipped" : "revealed"}
        initial={skipped ? false : { opacity: 0, scale: 1.04, filter: "blur(10px)" }}
        animate={phase !== "playing" ? { opacity: 1, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none", transform: "none" } } : undefined}
        transition={{ duration: INTRO_EXIT_S, ease: [0.65, 0, 0.35, 1] }}
      >
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-white/[0.07] bg-[#0d0c10]/90 backdrop-blur-xl lg:flex">
          <div className="px-4 pb-4 pt-[76px]">
            <BloomWordmark className="text-[19px]" />
            <p className="mt-1 text-[12px] text-white/45">IntentPulse · Engine Nº 04</p>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-2" aria-label="IntentPulse">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={cn("flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors", active(n.href) ? "bg-white/[0.08] text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white")}
              >
                <n.icon className="mt-0.5 size-4 shrink-0" style={{ color: active(n.href) ? "#e9cf98" : undefined }} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{n.label}</span>
                  <span className="block text-[11px] text-white/40">{n.hint}</span>
                </span>
                {n.href === `${BASE}/radar` && <span className="ml-auto mt-0.5 text-[11px] tabular-nums text-white/40">{fmt(SWEEPABLE.reduce((s, k) => s + rolling[k][1], 0))}</span>}
              </Link>
            ))}
            <p className="px-2 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-wide text-white/35">Developers</p>
            <button type="button" onClick={() => setDevOpen(true)} className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] text-white/60 hover:bg-white/[0.04] hover:text-white">
              <Code2 className="size-4" /> Embed & API
            </button>
            <p className="px-2 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-wide text-white/35">Engines</p>
            {[
              ["/demo/engine-01", "01 · Aware Marketing"],
              ["/demo/engine-02", "02 · Infrastructure Architect"],
              ["/demo/engine-03", "03 · Shadow Workforce"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="block rounded-md px-2 py-1.5 text-[12.5px] text-white/50 hover:bg-white/[0.04] hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
          <div className="space-y-2 border-t border-white/[0.07] p-3 text-[12px]">
            <p className="flex items-center justify-between text-white/50">
              <span className="flex items-center gap-2">
                <span className={cn("size-1.5 rounded-full", e.running ? "bg-[#7ee0a1]" : "bg-white/30")} />
                {e.mode === "live" ? "Live · Apify sweeps" : "Simulated data"}
              </span>
              <span className="tabular-nums">{fmt(velocityOf(e))}/s</span>
            </p>
            <Link href="/engines/intentpulse" className="flex items-center gap-2 text-white/45 hover:text-white">
              <ArrowLeft className="size-3.5" /> Back to Engine 04
            </Link>
          </div>
        </aside>

        <div className="lg:pl-60">
          <header className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#0d0c10]/85 backdrop-blur-xl">
            <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:pr-24">
              <h1 className="text-[15px] font-semibold text-white">{TITLES[pathname] ?? "IntentPulse"}</h1>
              <SweepBar e={e} channel={sweepChannel} />
              <div className="ml-auto flex items-center gap-1.5">
                <span className="hidden items-center gap-1.5 rounded-md border border-white/[0.08] px-2 py-1 text-[11.5px] text-white/55 md:inline-flex" title={e.mode === "live" ? "Sweeps run live Apify Actors; the ambient stream is simulated." : "USE_LIVE_APIFY=false: all data is simulated."}>
                  <span className={cn("size-1.5 rounded-full", e.mode === "live" ? "bg-[#7cc4ff]" : "bg-[#e9cf98]")} />
                  {e.mode === "live" ? "Live Apify" : "Simulated"}
                </span>
                <Button size="sm" variant="ghost" onClick={() => e.setRunning((v) => !v)} aria-label={e.running ? "Pause stream" : "Resume stream"}>
                  {e.running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  <span className="max-sm:hidden">{e.running ? "Pause" : "Resume"}</span>
                </Button>
                <Button size="sm" className="lg:hidden" onClick={() => setDevOpen(true)}>
                  <Code2 className="size-3.5" /> API
                </Button>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto border-t border-white/[0.06] px-2 py-1.5 lg:hidden" aria-label="IntentPulse sections">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={cn("h-7 shrink-0 rounded-md px-2.5 text-[12px] leading-7", active(n.href) ? "bg-white/[0.1] text-white" : "text-white/50")}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="p-4 sm:p-5">
            <Ctx.Provider value={value}>
              <div key={pathname} className="animate-view-in">
                {children}
              </div>
            </Ctx.Provider>
            <p className="mt-6 max-w-3xl text-[11.5px] leading-relaxed text-white/35">
              The ambient stream and sales attribution are simulated sample data, each signal scored by the real IntentPulse engine.{" "}
              {e.mode === "live" ? "Sweeps run live Apify Actors." : "Set USE_LIVE_APIFY=true to run sweeps through live Apify Actors."} DMs and bookings call the dispatch API; comments and quotes are staged because no social accounts are connected. Background: Claude Lorrain, Landscape with the Adoration of the Golden Calf, 1653.
            </p>
          </main>
        </div>
      </motion.div>

      <DahliaGarland flare={e.flare} glowing={e.glowing} />
      <InspectionDrawer signal={selected} outcome={selected ? e.outcomes[selected.id] : undefined} busy={e.busy?.kind ?? null} onClose={closeDrawer} onAction={act} onRescore={rescore} />
      <DeveloperDrawer open={devOpen} onClose={closeDev} mode={e.mode} />
      {phase !== "done" && <CinematicIntro leaving={phase === "leaving"} onSkip={skipIntro} onExited={introExited} />}
    </div>
  );
}

/** Keyword sweep in the application bar; scoped to the channel a page has focused, or every channel. */
function SweepBar({ e, channel }: { e: PulseEngine; channel?: Platform }) {
  const [draft, setDraft] = useState("");
  const { keywords, setKeywords, sweep } = e;
  const add = () => {
    const k = draft.trim().replace(/\s+/g, " ").slice(0, 60);
    if (k) setKeywords((ks) => (ks.includes(k) || ks.length >= 6 ? ks : [...ks, k]));
    setDraft("");
  };
  const run = () => {
    const extra = draft;
    if (extra.trim()) add();
    e.triggerSweep(channel ? [channel] : undefined, extra);
  };
  const onKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      if (draft.trim()) add();
      else run();
    } else if (ev.key === "Backspace" && !draft && keywords.length) setKeywords((ks) => ks.slice(0, -1));
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 max-md:order-last max-md:basis-full">
      <label className="flex h-8 min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-md border border-white/[0.08] bg-black/25 px-2 focus-within:border-white/20 md:max-w-[560px]">
        <Radar className="size-3.5 shrink-0 text-white/40" />
        {keywords.map((k) => (
          <span key={k} className="inline-flex shrink-0 items-center gap-0.5 rounded bg-white/[0.08] py-0.5 pl-1.5 pr-0.5 text-[11.5px] text-white/80">
            {k}
            <button type="button" onClick={() => setKeywords((ks) => ks.filter((x) => x !== k))} aria-label={`Remove ${k}`} className="rounded p-0.5 text-white/40 hover:text-white">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          onKeyDown={onKey}
          placeholder={keywords.length ? "Add keyword" : "Keywords to sweep"}
          aria-label="Sweep keywords"
          className="h-full min-w-[90px] flex-1 bg-transparent text-[12.5px] text-white placeholder:text-white/30 focus:outline-none"
        />
      </label>
      <Button size="sm" variant="primary" onClick={run} disabled={sweep.busy}>
        {sweep.busy ? <Loader2 className="size-3.5 animate-spin" /> : <Radar className="size-3.5" />}
        {sweep.busy ? (e.mode === "live" ? "Running Actors…" : "Sweeping…") : channel ? `Sweep ${PLATFORMS[channel].label}` : "Sweep all channels"}
      </Button>
      {sweep.last && !sweep.busy && (
        <span className="hidden truncate text-[11.5px] text-white/40 2xl:inline" title={sweep.last.notice}>
          Last: {sweep.last.count} {sweep.last.mode} · {fmt(sweep.last.ms)} ms
        </span>
      )}
    </div>
  );
}
