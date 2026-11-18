"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Boxes, Code2, Command, Crosshair, ExternalLink, Grid3x3, Info, KeyRound, Copy, Activity, LayoutDashboard, Network, RotateCcw, ScanSearch, Server, Swords, Target, Zap } from "lucide-react";
import { toast } from "sonner";


import { LanguageSwitcher } from "@/components/bloom/language-switcher";
import { cn } from "@/lib/utils";
import { CommandPalette, type PaletteItem } from "./command-palette";
import { useExchangeCopy, type ExchangeView } from "./copy";
import type { MacroDomain } from "@/lib/exchange/omni-adapter";
import { AgentGoalInspector } from "./AgentGoalInspector";
import { DesktopFrame } from "@/components/desktop/DesktopFrame";
import { BloomInfrastructureTheater } from "./BloomInfrastructureTheater";
import { BOOT_KEY, CinematicBootIntro } from "./CinematicBootIntro";
import { SovereignConsole, SovereignToggle, type ConsoleMode } from "./SovereignToggle";
import { GlobalPulse } from "./GlobalPulse";
import { IntroHero } from "./IntroHero";
import { useOmniCopy } from "./omni-copy";
import { InspectorView } from "./inspector-view";
import { Kpis } from "./kpis";
import { Ledger } from "./ledger";
import { MandateView } from "./mandate-view";
import { TrafficRadar } from "./radar";
import type { ScenarioId } from "./scenarios";
import { quickstart, SdkView } from "./sdk-view";
import { StressTest } from "./stress-test";
import { Badge, Kbd, SPRING } from "./ui";
import { useExchange } from "./use-exchange";

const VIEWS: { id: ExchangeView; icon: typeof Activity; key: string }[] = [
  { id: "overview", icon: LayoutDashboard, key: "1" },
  { id: "ledger", icon: Activity, key: "2" },
  { id: "intents", icon: Network, key: "3" },
  { id: "mandate", icon: Grid3x3, key: "4" },
  { id: "inspector", icon: ScanSearch, key: "5" },
  { id: "sdk", icon: Code2, key: "6" },
];
const SOVEREIGN_VIEW = { id: "sovereign" as ExchangeView, icon: Server, key: "7" };
const MODE_KEY = "bloom-exchange-mode";
const VIEW_KEY = "bloom-exchange-view";
const SCENARIO_ICONS: Record<ScenarioId, typeof Target> = { standard: Target, adversarial: Swords, swarm: Boxes, breach: Crosshair };

const typing = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
};

/** /exchange: the Bloom Exchange clearing terminal. A standalone product, not a desk tab. Keyboard-first: ⌘K, 1–4. */
export function ExchangeApp() {
  const t = useExchangeCopy();
  const o = useOmniCopy();
  const x = useExchange();
  const [injectOpen, setInjectOpen] = useState(false);
  const [domain, setDomain] = useState<MacroDomain | "all">("all");
  const [mode, setModeState] = useState<ConsoleMode>("cloud");
  const terminal = useAnimationControls();

  // The boot overlay is server-rendered; the layout's inline script hides it before paint when this session has seen it.
  const [boot, setBoot] = useState<number | null>(0);
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(BOOT_KEY) === "1";
    } catch {
      // No storage: play it.
    }
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) setBoot(null);
  }, []);
  const replay = useCallback(() => {
    try {
      sessionStorage.removeItem(BOOT_KEY);
    } catch {
      // Replays anyway.
    }
    delete document.documentElement.dataset.xchBooted;
    setBoot((b) => (b ?? 0) + 1);
  }, []);

  const [view, setViewState] = useState<ExchangeView>("overview");
  useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (m === "sovereign") setModeState("sovereign");
      const saved = localStorage.getItem(VIEW_KEY) as ExchangeView | null;
      if (saved && (VIEWS.some((v) => v.id === saved) || (saved === "sovereign" && m === "sovereign"))) setViewState(saved);
    } catch {
      // Starts on the overview.
    }
  }, []);

  // The terminal waits behind the boot and springs into place (150ms) the moment the boot starts its exit.
  // A skipped boot (repeat visit) lands on the final state at once instead of staying hidden.
  useEffect(() => {
    if (boot === null) return;
    terminal.set({ scale: 0.97, opacity: 0 });
    return () => terminal.set({ scale: 1, opacity: 1 });
  }, [boot, terminal]);
  const springIn = useCallback(() => void terminal.start({ scale: 1, opacity: 1, transition: SPRING }), [terminal]);
  const setView = useCallback((v: ExchangeView) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Not remembered; fine.
    }
  }, []);

  const setMode = useCallback(
    (m: ConsoleMode) => {
      setModeState(m);
      try {
        localStorage.setItem(MODE_KEY, m);
      } catch {
        // Not remembered; fine.
      }
      setView(m === "sovereign" ? "sovereign" : "overview");
    },
    [setView],
  );
  const views = useMemo(() => (mode === "sovereign" ? [...VIEWS, SOVEREIGN_VIEW] : VIEWS), [mode]);

  const [selected, setSelected] = useState<string | null>(null);
  const inspect = useCallback(
    (taskId: string) => {
      setSelected(taskId);
      setView("inspector");
    },
    [setView],
  );

  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (palette || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const v = views.find((x) => x.key === e.key);
      if (v) setView(v.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette, setView, views]);

  const items = useMemo<PaletteItem[]>(
    () => [
      ...views.map((v) => ({ id: `view-${v.id}`, group: "views" as const, label: t.views[v.id], hint: v.key, icon: v.icon, run: () => setView(v.id) })),
      { id: "mode-toggle", group: "actions" as const, label: mode === "sovereign" ? o.sovereign.cloud : o.sovereign.node, hint: "sovereign", icon: mode === "sovereign" ? ExternalLink : Server, run: () => setMode(mode === "sovereign" ? "cloud" : "sovereign") },
      ...(["standard", "adversarial", "swarm", "breach"] as ScenarioId[]).map((s) => ({
        id: `fire-${s}`,
        group: "actions" as const,
        label: `${t.palette.fire}: ${t.stress.scenarios[s].name}`,
        icon: SCENARIO_ICONS[s],
        run: () => {
          setView("ledger");
          void x.fire(s);
        },
      })),
      {
        id: "inject",
        group: "actions",
        label: o.hero.inject,
        hint: "omni",
        icon: Zap,
        run: () => {
          setView("intents");
          setInjectOpen(true);
        },
      },
      { id: "card", group: "actions", label: t.palette.card, hint: "/.well-known", icon: ExternalLink, run: () => window.open("/.well-known/agent-card.json", "_blank", "noopener") },
      { id: "copy", group: "actions", label: t.palette.copy, icon: Copy, run: () => void navigator.clipboard?.writeText(quickstart(window.location.origin)).then(() => toast.success(t.sdk.copied)) },
      { id: "replay", group: "actions", label: t.palette.replay, icon: RotateCcw, run: replay },
    ],
    [t, o, x, setView, replay, views, mode, setMode],
  );

  const s = x.status;
  return (
    <DesktopFrame title={t.header.product}>
      <div className="pointer-events-none fixed inset-0 opacity-60" aria-hidden>
        <div className="bloom-noise h-full w-full" />
      </div>

      <div className="relative">
        <header className="sticky top-0 z-40 border-b border-[var(--xch-line)] bg-[#0c0709]/75 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
            <button type="button" onClick={() => setPalette(true)} className="order-last flex h-8 w-full items-center gap-2 rounded-full border border-[var(--xch-line-strong)] bg-white/[0.02] px-3 text-[12px] text-white/40 transition-colors duration-150 hover:text-white/70 md:order-none md:w-72">
              <Command className="size-3.5" /> <span className="flex-1 truncate text-start">{t.header.search}</span>
              <Kbd>⌘K</Kbd>
            </button>
            <div className="ms-auto flex flex-wrap items-center gap-2">
              <SovereignToggle mode={mode} onChange={setMode} />
              {s && (
                <>
                  <Badge tone={s.source === "live" ? "emerald" : "solid"}>{s.source === "live" ? t.header.live : t.header.simulated}</Badge>
                  <Badge tone={s.operator ? "emerald" : "muted"}>{s.operator ? t.header.operator : s.licensed ? t.header.production : t.header.sandbox}</Badge>
                  <span className="tnum hidden items-center gap-1 font-mono text-[10px] text-white/35 xl:flex" title={t.header.key} dir="ltr">
                    <KeyRound className="size-3" /> {s.kid}
                  </span>
                </>
              )}
              <button type="button" onClick={replay} className="flex items-center gap-1 rounded-md border border-[var(--xch-line)] px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/50 hover:text-white" aria-label={t.header.replay}>
                <RotateCcw className="size-3" /> <span className="hidden sm:inline">{t.header.replay}</span>
              </button>
              <Link href="/desk" className="hidden rounded-md border border-[var(--xch-line)] px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/50 hover:text-white lg:block">
                {t.header.desk}
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
          <nav className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-3 pb-2 sm:px-5" role="tablist" aria-label="Views">
            {views.map((v) => {
              const Icon = v.icon;
              const active = view === v.id;
              return (
                <button key={v.id} type="button" role="tab" aria-selected={active} onClick={() => setView(v.id)} className={cn("relative flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] transition-colors duration-150", active ? "text-white" : "text-white/45 hover:text-white/80")}>
                  {active && <motion.span layoutId="xch-view" className="absolute inset-0 rounded-md bg-white/[0.07]" transition={SPRING} />}
                  <Icon className="relative size-3.5" strokeWidth={1.75} />
                  <span className="relative">{t.views[v.id]}</span>
                  <Kbd className="relative hidden lg:inline-flex">{v.key}</Kbd>
                </button>
              );
            })}
          </nav>
          <GlobalPulse tick={x.pulseTick} mode={mode} />
        </header>

        <motion.main animate={terminal} className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-6">
          {s && !s.licensed && (
            <p className="mb-4 flex items-start gap-2 rounded-[10px] border border-[var(--xch-line)] bg-white/[0.02] px-3.5 py-2.5 text-[12px] leading-relaxed text-white/55">
              <Info className="mt-0.5 size-3.5 shrink-0 text-white/40" /> {t.notice.sandbox}
            </p>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SPRING}>
              {view === "overview" && (
                <div className="space-y-4">
                  <IntroHero
                    onInject={() => {
                      setView("intents");
                      setInjectOpen(true);
                    }}
                    onSdk={() => setView("sdk")}
                    onDomain={(d) => {
                      setDomain(d);
                      setView("intents");
                    }}
                  />
                  <BloomInfrastructureTheater />
                </div>
              )}
              {view === "intents" && <AgentGoalInspector x={x} onOpenEnclave={inspect} injectOpen={injectOpen} setInjectOpen={setInjectOpen} domain={domain} setDomain={setDomain} />}
              {view === "ledger" && (
                <div className="space-y-4">
                  <Kpis rows={x.rows} />
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                    <TrafficRadar traffic={x.traffic} className="xl:col-span-7" />
                    <Ledger x={x} onInspect={inspect} className="xl:col-span-5" />
                    <StressTest x={x} onInspect={inspect} className="xl:col-span-12" />
                  </div>
                </div>
              )}
              {view === "mandate" && <MandateView x={x} />}
              {view === "inspector" && <InspectorView x={x} selected={selected} onSelect={setSelected} />}
              {view === "sdk" && <SdkView x={x} />}
              {view === "sovereign" && <SovereignConsole headers={x.headers} />}
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} items={items} />
      {boot !== null && <CinematicBootIntro key={boot} kid={x.status?.kid ?? null} onLeave={springIn} onDone={() => setBoot(null)} />}
    </DesktopFrame>
  );
}
