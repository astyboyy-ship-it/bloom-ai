"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radar as RadarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PARLIAMENT_NODES, Panel, PanelHeader } from "./ui";
import { useExchangeCopy } from "./copy";
import type { TrafficItem, TrafficKind } from "./use-exchange";

const W = 720;
const H = 300;
const ENCLAVE = { x: 360, y: 150 };
const engineY = (i: number) => 46 + i * 52;
const ENGINE_X = 628;
const PEER_X = 92;

const COLOR: Record<TrafficKind, string> = { handshake: "var(--tier-accent)", round: "var(--tier-accent)", blocked: "#fbbf24", exception: "#fb923c", settled: "#34f5b5", rejected: "#f87171" };
export const KIND_CLASS: Record<TrafficKind, string> = {
  handshake: "border-os-cyan/40 text-os-cyan",
  round: "border-white/15 text-white/60",
  blocked: "border-amber-300/45 text-amber-200",
  exception: "border-orange-300/45 text-orange-200",
  settled: "border-os-emerald/45 text-os-emerald",
  rejected: "border-red-300/45 text-red-200",
};

type Packet = { id: string; from: { x: number; y: number }; to: { x: number; y: number }; color: string };

export function TrafficRadar({ traffic }: { traffic: TrafficItem[] }) {
  const t = useExchangeCopy().radar;
  const peers = useMemo(() => [...new Set(traffic.map((x) => x.peer))].slice(0, 5), [traffic]);
  const peerY = (name: string) => {
    const i = Math.max(0, peers.indexOf(name));
    const n = Math.max(1, peers.length);
    return n === 1 ? ENCLAVE.y : 60 + (i * (H - 120)) / (n - 1);
  };
  const engine = (key: string) => ({ x: ENGINE_X, y: engineY(PARLIAMENT_NODES.findIndex((e) => e.engine === key)) });

  const [packets, setPackets] = useState<Packet[]>([]);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const fresh = traffic.filter((x) => !seen.current.has(x.id)).slice(0, 6);
    if (!fresh.length) return;
    fresh.forEach((x) => seen.current.add(x.id));
    const made: Packet[] = fresh.map((x) => {
      const peer = { x: PEER_X, y: peerY(x.peer) };
      const route =
        x.kind === "blocked" ? [peer, engine("shield")] : x.kind === "settled" || x.kind === "exception" || x.kind === "rejected" ? [ENCLAVE, engine("sovereign")] : x.kind === "round" && /provider/.test(x.detail) ? [engine("apex"), ENCLAVE] : [peer, ENCLAVE];
      return { id: x.id, from: route[0], to: route[1], color: COLOR[x.kind] };
    });
    setPackets((p) => [...p, ...made].slice(-14));
    const ids = new Set(made.map((m) => m.id));
    const timer = setTimeout(() => setPackets((p) => p.filter((x) => !ids.has(x.id))), 1300);
    return () => clearTimeout(timer);
    // peerY/engine derive from `peers`, which only changes with `traffic`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traffic]);

  return (
    <Panel className="xl:col-span-8">
      <PanelHeader icon={RadarIcon} title={t.title} sub={t.sub} />
      <div className="relative mt-3 overflow-hidden rounded-lg border border-white/[0.06] bg-black/30">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t.title}>
          <defs>
            <radialGradient id="xch-sweep" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="var(--tier-accent)" stopOpacity="0.16" />
              <stop offset="1" stopColor="var(--tier-accent)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[46, 92, 138].map((r) => (
            <circle key={r} cx={ENCLAVE.x} cy={ENCLAVE.y} r={r} fill="none" stroke="rgb(255 255 255 / 0.05)" strokeDasharray="2 5" />
          ))}
          <g className="xch-sweep" style={{ transformOrigin: `${ENCLAVE.x}px ${ENCLAVE.y}px` }}>
            <path d={`M${ENCLAVE.x} ${ENCLAVE.y} L${ENCLAVE.x + 138} ${ENCLAVE.y} A138 138 0 0 0 ${ENCLAVE.x + 138 * Math.cos(-0.6)} ${ENCLAVE.y + 138 * Math.sin(-0.6)} Z`} fill="url(#xch-sweep)" />
          </g>

          {peers.map((p) => (
            <line key={p} x1={PEER_X} y1={peerY(p)} x2={ENCLAVE.x - 30} y2={ENCLAVE.y} stroke="rgb(255 255 255 / 0.09)" strokeWidth={1} />
          ))}
          {PARLIAMENT_NODES.map((e, i) => (
            <line key={e.engine} x1={ENCLAVE.x + 30} y1={ENCLAVE.y} x2={ENGINE_X} y2={engineY(i)} stroke="rgb(255 255 255 / 0.07)" strokeWidth={1} />
          ))}

          <path d={hexPath(ENCLAVE.x, ENCLAVE.y, 30)} fill="rgb(7 8 12 / 0.9)" stroke="#34f5b5" strokeOpacity={0.7} strokeWidth={1} />
          <text x={ENCLAVE.x} y={ENCLAVE.y + 3} textAnchor="middle" className="fill-os-emerald font-mono" fontSize={8} letterSpacing="0.12em">
            ENCLAVE
          </text>
          <text x={ENCLAVE.x} y={ENCLAVE.y + 50} textAnchor="middle" className="fill-white/35 font-mono uppercase" fontSize={8} letterSpacing="0.18em">
            {t.enclave}
          </text>

          <text x={PEER_X} y={20} textAnchor="middle" className="fill-white/35 font-mono uppercase" fontSize={8} letterSpacing="0.18em">
            {t.peers}
          </text>
          {peers.map((p) => (
            <g key={p}>
              <circle cx={PEER_X} cy={peerY(p)} r={5} fill="#07080c" stroke="var(--tier-accent)" strokeWidth={1} />
              <text x={PEER_X} y={peerY(p) + 17} textAnchor="middle" className="fill-white/55 font-mono" fontSize={8}>
                {p.length > 20 ? `${p.slice(0, 19)}…` : p}
              </text>
            </g>
          ))}
          {peers.length === 0 && (
            <text x={PEER_X} y={ENCLAVE.y + 3} textAnchor="middle" className="fill-white/25 font-mono" fontSize={8}>
              —
            </text>
          )}

          <text x={ENGINE_X} y={20} textAnchor="middle" className="fill-white/35 font-mono uppercase" fontSize={8} letterSpacing="0.18em">
            {t.parliament}
          </text>
          {PARLIAMENT_NODES.map((e, i) => (
            <g key={e.engine}>
              <rect x={ENGINE_X - 34} y={engineY(i) - 9} width={68} height={18} rx={4} fill="#07080c" stroke="rgb(255 255 255 / 0.14)" />
              <text x={ENGINE_X} y={engineY(i) + 3} textAnchor="middle" className="fill-white/75 font-mono uppercase" fontSize={8} letterSpacing="0.14em">
                {e.label}
              </text>
            </g>
          ))}

          <AnimatePresence>
            {packets.map((p) => (
              <motion.circle key={p.id} r={3.2} fill={p.color} initial={{ cx: p.from.x, cy: p.from.y, opacity: 0 }} animate={{ cx: p.to.x, cy: p.to.y, opacity: [0, 1, 1, 0] }} exit={{ opacity: 0 }} transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }} style={{ filter: `drop-shadow(0 0 5px ${p.color})` }} />
            ))}
          </AnimatePresence>
        </svg>
      </div>

      <ol className="mt-3 max-h-[188px] space-y-px overflow-y-auto pe-1 font-mono text-[10.5px]" aria-live="polite">
        {traffic.length === 0 && <li className="py-3 text-center text-white/35">{t.empty}</li>}
        {traffic.slice(0, 30).map((x) => (
          <li key={x.id} className="animate-row-in grid grid-cols-[64px_84px_minmax(0,140px)_1fr] items-center gap-2 rounded px-1.5 py-1 hover:bg-white/[0.03]">
            <span className="tabular-nums text-white/35" dir="ltr">
              {new Date(x.at).toLocaleTimeString([], { hour12: false })}
            </span>
            <span className={cn("w-fit rounded-full border px-1.5 py-px text-[8.5px] uppercase tracking-[0.12em]", KIND_CLASS[x.kind])}>{t.kinds[x.kind]}</span>
            <span className="truncate text-white/70">{x.peer}</span>
            <span className="truncate text-white/45" dir="ltr">
              {x.detail}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function hexPath(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ") + " Z";
}
