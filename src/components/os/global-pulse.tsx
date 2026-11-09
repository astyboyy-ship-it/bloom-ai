"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANIES, ENGINE_ORDER, ENGINES, usdFmt, type EngineKey } from "@/components/bloom/command/engines";
import { PALETTES } from "@/components/bloom/command/theme";
import { activeEnv, useDeskSettings } from "@/components/desk/settings";
import { OsPage } from "./os-shell";
import { firehoseEvent } from "./pulse-firehose";
import { CITY_TEXT } from "./pulse-firehose-text";
import { AGENT_LABEL } from "@/components/bloom/command/engine-work-text";
import { localizeEngine, useCommandCopy } from "@/components/bloom/command/locale";
import type { Lang } from "@/components/bloom/i18n";
import { LAND_DOTS, MAP_H, MAP_W, project, PULSE_NODES, type PulseNode } from "./world";
import { ArchitectureFeed } from "@/components/pulse/architecture-feed";
import { useOnboardingCopy } from "@/components/onboarding/copy";

type Pulse = { id: number; at: number; from: PulseNode; to: PulseNode; engine: EngineKey; text: string; mine?: boolean };

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

const COPY = {
  en: {
    pause: "Pause stream",
    resume: "Resume stream",
    stats: { perMinute: "Actions / minute", regions: "Active regions", nodes: "Nodes online", mine: "Your runs on the map" },
    map: "Global node map",
    node: (c: string) => `${c} node`,
    home: "home",
    clear: "Clear node filter",
    inStream: "Actions in stream",
    enginesSeen: "Engines seen",
    filtered: "The feed is filtered to this node.",
    feed: "Live execution feed",
    yourRun: "your run",
  },
  es: {
    pause: "Pausar flujo",
    resume: "Reanudar flujo",
    stats: { perMinute: "Acciones / minuto", regions: "Regiones activas", nodes: "Nodos en línea", mine: "Tus ejecuciones en el mapa" },
    map: "Mapa global de nodos",
    node: (c: string) => `Nodo de ${c}`,
    home: "base",
    clear: "Quitar filtro de nodo",
    inStream: "Acciones en el flujo",
    enginesSeen: "Motores vistos",
    filtered: "El flujo está filtrado por este nodo.",
    feed: "Flujo de ejecución en vivo",
    yourRun: "tu ejecución",
  },
  he: {
    pause: "השהיית הזרם",
    resume: "חידוש הזרם",
    stats: { perMinute: "פעולות / דקה", regions: "אזורים פעילים", nodes: "צמתים מחוברים", mine: "ההרצות שלכם במפה" },
    map: "מפת הצמתים העולמית",
    node: (c: string) => `צומת ${c}`,
    home: "בית",
    clear: "ניקוי סינון הצומת",
    inStream: "פעולות בזרם",
    enginesSeen: "מנועים שנראו",
    filtered: "הזרם מסונן לצומת הזה.",
    feed: "זרם ביצוע חי",
    yourRun: "ההרצה שלכם",
  },
} satisfies Record<Lang, unknown>;

/** A pulse node's city in the given language. */
const cityOf = (n: PulseNode, lang: Lang) => (lang === "en" ? n.city : CITY_TEXT[lang][n.id] ?? n.city);

/**
 * One simulated global agent action: mostly the multi-domain firehose (music, software, freight, security…),
 * with the engines' own activity templates mixed in.
 */
function synth(seq: number, lang: Lang): Pulse {
  const from = pick(PULSE_NODES);
  let to = pick(PULSE_NODES);
  if (to.id === from.id) to = PULSE_NODES[(PULSE_NODES.indexOf(from) + 3) % PULSE_NODES.length];
  if (Math.random() < 0.7) {
    const f = firehoseEvent(lang);
    return { id: seq, at: Date.now(), from, to, engine: f.engine, text: f.text };
  }
  const engine = pick(ENGINE_ORDER);
  const card = pick(localizeEngine(ENGINES[engine], lang).cards);
  const ev = pick(card.events);
  const amt = ev.amt ? Math.round((ev.amt[0] + Math.random() * (ev.amt[1] - ev.amt[0])) / 100) * 100 : 0;
  const text = ev.text
    .replace("{agent}", `${AGENT_LABEL[lang]} #${String(1 + Math.floor(Math.random() * card.agents)).padStart(2, "0")}`)
    .replace("{co}", pick(COMPANIES))
    .replace("{amt}", usdFmt(amt))
    .replace("{ch}", pick(["LinkedIn", "Reddit", "X", "Instagram"]));
  return { id: seq, at: Date.now(), from, to, engine, text };
}

/** Full-screen global operations monitor: node map with live arcs, node detail, and an auto-scrolling feed. */
export function GlobalPulse() {
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const { settings } = useDeskSettings();
  const reduce = useReducedMotion();
  const tabs = useOnboardingCopy().pulse.tabs;
  const [tab, setTab] = useState<"world" | "feed">("world");
  const env = activeEnv(settings);
  const home = PULSE_NODES.find((n) => n.region === env.region) ?? PULSE_NODES[0];
  const [feed, setFeed] = useState<Pulse[]>([]);
  const [paused, setPaused] = useState(false);
  const [focus, setFocus] = useState<PulseNode | null>(null);
  const seq = useRef(0);
  const box = useRef<HTMLOListElement>(null);

  // Your workspace's own recent runs join the stream, routed from your active environment's node.
  const mine = useMemo<Pulse[]>(
    () =>
      settings.runs.slice(-12).map((r, i) => ({
        id: -1 - i,
        at: r.at,
        from: home,
        to: home,
        engine: (r.kind === "engine" ? r.target : "sovereign") as EngineKey,
        text: `${r.label}: ${r.summary || r.command}`.slice(0, 160),
        mine: true,
      })),
    [settings.runs, home],
  );

  // The simulated stream is regenerated in the new language when it changes, so it never mixes languages.
  useEffect(() => {
    setFeed(Array.from({ length: 24 }, () => synth(++seq.current, lang)));
  }, [lang]);
  useEffect(() => {
    if (paused || reduce) return;
    // High-frequency firehose: a burst of one to three actions every ~0.45s.
    const iv = setInterval(() => setFeed((f) => [...f, ...Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => synth(++seq.current, lang))].slice(-160)), 380 + Math.random() * 160);
    return () => clearInterval(iv);
  }, [paused, reduce, lang]);

  const stream = useMemo(() => [...feed, ...mine].sort((a, b) => a.at - b.at).filter((p) => !focus || p.from.id === focus.id || p.to.id === focus.id), [feed, mine, focus]);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [stream.length]);

  const live = feed.slice(-10);
  const perMinute = feed.filter((p) => Date.now() - p.at < 60_000).length;
  const nodeLoad = (n: PulseNode) => feed.filter((p) => p.from.id === n.id || p.to.id === n.id).length;

  return (
    <OsPage
      route="/desk/global-pulse"
      vars={{ city: cityOf(home, lang) }}
      actions={
        <>
          <div role="tablist" className="flex rounded-full border border-os-line p-0.5">
            {(["world", "feed"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-full px-3.5 py-1 text-[12.5px] transition-colors", tab === k ? "bg-os-cyan/15 text-os-cyan" : "text-white/60 hover:text-white")}>
                {tabs[k]}
              </button>
            ))}
          </div>
          {tab === "world" && (
            <button type="button" onClick={() => setPaused((p) => !p)} className="flex items-center gap-1.5 rounded-full border border-os-line px-3.5 py-1.5 text-[12.5px] text-white/75 hover:text-white">
              {paused ? <Play className="size-3.5 rtl:-scale-x-100" /> : <Pause className="size-3.5" />} {paused ? t.resume : t.pause}
            </button>
          )}
        </>
      }
    >
      {tab === "feed" ? (
        <ArchitectureFeed />
      ) : (
        <>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [t.stats.perMinute, String(perMinute)],
          [t.stats.regions, String(new Set(feed.flatMap((p) => [p.from.region, p.to.region])).size)],
          [t.stats.nodes, `${PULSE_NODES.length}/${PULSE_NODES.length}`],
          [t.stats.mine, String(mine.length)],
        ].map(([k, v]) => (
          <div key={k} className="os-panel rounded-xl px-4 py-3">
            <dt className="os-label">{k}</dt>
            <dd className="mt-1 font-mono text-[22px] tabular-nums text-os-cyan">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_24rem]">
        <section className="os-panel relative overflow-hidden rounded-2xl p-2">
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-auto w-full" style={{ direction: "ltr" }} role="group" aria-label={t.map}>
            {LAND_DOTS.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={1.6} fill="#00f0ff" opacity={0.18} />
            ))}
            {live.map((p) => {
              const a = project(p.from.lon, p.from.lat);
              const b = project(p.to.lon, p.to.lat);
              const mx = (a.x + b.x) / 2;
              const my = Math.min(a.y, b.y) - Math.hypot(b.x - a.x, b.y - a.y) * 0.28;
              return <path key={p.id} d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`} fill="none" stroke={PALETTES[p.engine].c1} strokeWidth={1.3} strokeOpacity={0.75} strokeDasharray="4 6" className="animate-[net-flow_1s_linear_infinite]" />;
            })}
            {PULSE_NODES.map((n) => {
              const p = project(n.lon, n.lat);
              const isHome = n.id === home.id;
              const on = focus?.id === n.id;
              return (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={t.node(cityOf(n, lang))}
                  onClick={() => setFocus(on ? null : n)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setFocus(on ? null : n);
                  }}
                  className="cursor-pointer outline-none"
                >
                  <circle cx={p.x} cy={p.y} r={2} fill={isHome ? "#34f5b5" : "#00f0ff"} className="animate-[os-ping_2.4s_ease-out_infinite]" style={{ animationDelay: `${(n.lon + 180) * 5}ms` }} />
                  <circle cx={p.x} cy={p.y} r={on ? 6 : isHome ? 5 : 3.5} fill={isHome ? "#34f5b5" : "#00f0ff"} stroke="#07080c" strokeWidth={1.5} />
                  {(on || isHome) && (
                    <text x={p.x + 8} y={p.y - 6} fontSize={11} fill="white" fontFamily="var(--font-geist-mono)">
                      {cityOf(n, lang)}
                      {isHome ? ` · ${t.home}` : ""}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {focus && (
            <div className="absolute start-4 top-4 w-64 rounded-xl border border-os-line bg-os-bg/90 p-3 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-medium text-white">{cityOf(focus, lang)}</p>
                <button type="button" onClick={() => setFocus(null)} aria-label={t.clear} className="text-white/40 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
              <p className="font-mono text-[10.5px] text-white/45">{focus.region}</p>
              <dl className="mt-2 grid grid-cols-2 gap-1.5 text-[11.5px]">
                <dt className="text-white/45">{t.inStream}</dt>
                <dd className="text-end font-mono text-os-cyan">{nodeLoad(focus)}</dd>
                <dt className="text-white/45">{t.enginesSeen}</dt>
                <dd className="text-end font-mono text-os-cyan">{new Set(feed.filter((p) => p.from.id === focus.id || p.to.id === focus.id).map((p) => p.engine)).size}</dd>
              </dl>
              <p className="mt-2 text-[11px] text-white/40">{t.filtered}</p>
            </div>
          )}
        </section>

        <section className="os-panel flex max-h-[34rem] flex-col rounded-2xl">
          <p className="os-label flex items-center justify-between border-b border-os-line px-4 py-2.5">
            {t.feed} {focus && <span className="normal-case tracking-normal text-os-cyan">· {cityOf(focus, lang)}</span>}
          </p>
          <ol ref={box} className="flex-1 space-y-1.5 overflow-y-auto p-3 text-[12px]">
            {stream.map((p) => (
              <li key={p.id} className={cn("rounded-lg border px-2.5 py-2", p.mine ? "border-os-emerald/40 bg-os-emerald/[0.05]" : "border-os-line/60 bg-black/20")}>
                <p className="flex items-center gap-1.5 font-mono text-[10px] text-white/40">
                  <span className="size-1.5 rounded-full" style={{ background: PALETTES[p.engine].c1 }} />
                  {new Date(p.at).toLocaleTimeString(lang, { hour12: false })} · {ENGINES[p.engine].name} · {cityOf(p.from, lang)}
                  {p.from.id !== p.to.id && ` ${lang === "he" ? "←" : "→"} ${cityOf(p.to, lang)}`}
                  {p.mine && <span className="ms-auto text-os-emerald">{t.yourRun}</span>}
                </p>
                <p dir="auto" className="mt-0.5 text-white/75">{p.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
        </>
      )}
    </OsPage>
  );
}
