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
import { LAND_DOTS, MAP_H, MAP_W, project, PULSE_NODES, type PulseNode } from "./world";

type Pulse = { id: number; at: number; from: PulseNode; to: PulseNode; engine: EngineKey; text: string; mine?: boolean };

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/**
 * One simulated global agent action: mostly the multi-domain firehose (music, software, freight, security…),
 * with the engines' own activity templates mixed in.
 */
function synth(seq: number): Pulse {
  const from = pick(PULSE_NODES);
  let to = pick(PULSE_NODES);
  if (to.id === from.id) to = PULSE_NODES[(PULSE_NODES.indexOf(from) + 3) % PULSE_NODES.length];
  if (Math.random() < 0.7) {
    const f = firehoseEvent();
    return { id: seq, at: Date.now(), from, to, engine: f.engine, text: f.text };
  }
  const engine = pick(ENGINE_ORDER);
  const card = pick(ENGINES[engine].cards);
  const ev = pick(card.events);
  const amt = ev.amt ? Math.round((ev.amt[0] + Math.random() * (ev.amt[1] - ev.amt[0])) / 100) * 100 : 0;
  const text = ev.text
    .replace("{agent}", `Agent #${String(1 + Math.floor(Math.random() * card.agents)).padStart(2, "0")}`)
    .replace("{co}", pick(COMPANIES))
    .replace("{amt}", usdFmt(amt))
    .replace("{ch}", pick(["LinkedIn", "Reddit", "X", "Instagram"]));
  return { id: seq, at: Date.now(), from, to, engine, text };
}

/** Full-screen global operations monitor: node map with live arcs, node detail, and an auto-scrolling feed. */
export function GlobalPulse() {
  const { settings } = useDeskSettings();
  const reduce = useReducedMotion();
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

  useEffect(() => {
    setFeed(Array.from({ length: 24 }, () => synth(++seq.current)));
  }, []);
  useEffect(() => {
    if (paused || reduce) return;
    // High-frequency firehose: a burst of one to three actions every ~0.45s.
    const t = setInterval(() => setFeed((f) => [...f, ...Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => synth(++seq.current))].slice(-160)), 380 + Math.random() * 160);
    return () => clearInterval(t);
  }, [paused, reduce]);

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
      kicker={`Global pulse · home node ${home.city} (${env.name})`}
      title="Worldwide operations monitor"
      lede="Agent actions moving between regions in real time. The global stream is simulated telemetry built from each engine's activity; your own workspace's runs are marked."
      actions={
        <button type="button" onClick={() => setPaused((p) => !p)} className="flex items-center gap-1.5 rounded-full border border-os-line px-3.5 py-1.5 text-[12.5px] text-white/75 hover:text-white">
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />} {paused ? "Resume stream" : "Pause stream"}
        </button>
      }
    >
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Actions / minute", String(perMinute)],
          ["Active regions", String(new Set(feed.flatMap((p) => [p.from.region, p.to.region])).size)],
          ["Nodes online", `${PULSE_NODES.length}/${PULSE_NODES.length}`],
          ["Your runs on the map", String(mine.length)],
        ].map(([k, v]) => (
          <div key={k} className="os-panel rounded-xl px-4 py-3">
            <dt className="os-label">{k}</dt>
            <dd className="mt-1 font-mono text-[22px] tabular-nums text-os-cyan">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_24rem]">
        <section className="os-panel relative overflow-hidden rounded-2xl p-2">
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-auto w-full" style={{ direction: "ltr" }} role="group" aria-label="Global node map">
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
                  aria-label={`${n.city} node`}
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
                      {n.city}
                      {isHome ? " · home" : ""}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {focus && (
            <div className="absolute start-4 top-4 w-64 rounded-xl border border-os-line bg-os-bg/90 p-3 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-medium text-white">{focus.city}</p>
                <button type="button" onClick={() => setFocus(null)} aria-label="Clear node filter" className="text-white/40 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
              <p className="font-mono text-[10.5px] text-white/45">{focus.region}</p>
              <dl className="mt-2 grid grid-cols-2 gap-1.5 text-[11.5px]">
                <dt className="text-white/45">Actions in stream</dt>
                <dd className="text-end font-mono text-os-cyan">{nodeLoad(focus)}</dd>
                <dt className="text-white/45">Engines seen</dt>
                <dd className="text-end font-mono text-os-cyan">{new Set(feed.filter((p) => p.from.id === focus.id || p.to.id === focus.id).map((p) => p.engine)).size}</dd>
              </dl>
              <p className="mt-2 text-[11px] text-white/40">The feed is filtered to this node.</p>
            </div>
          )}
        </section>

        <section className="os-panel flex max-h-[34rem] flex-col rounded-2xl">
          <p className="os-label flex items-center justify-between border-b border-os-line px-4 py-2.5">
            Live execution feed {focus && <span className="normal-case tracking-normal text-os-cyan">· {focus.city}</span>}
          </p>
          <ol ref={box} className="flex-1 space-y-1.5 overflow-y-auto p-3 text-[12px]">
            {stream.map((p) => (
              <li key={p.id} className={cn("rounded-lg border px-2.5 py-2", p.mine ? "border-os-emerald/40 bg-os-emerald/[0.05]" : "border-os-line/60 bg-black/20")}>
                <p className="flex items-center gap-1.5 font-mono text-[10px] text-white/40">
                  <span className="size-1.5 rounded-full" style={{ background: PALETTES[p.engine].c1 }} />
                  {new Date(p.at).toLocaleTimeString([], { hour12: false })} · {ENGINES[p.engine].name} · {p.from.city}
                  {p.from.id !== p.to.id && ` → ${p.to.city}`}
                  {p.mine && <span className="ms-auto text-os-emerald">your run</span>}
                </p>
                <p dir="auto" className="mt-0.5 text-white/75">{p.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </OsPage>
  );
}
