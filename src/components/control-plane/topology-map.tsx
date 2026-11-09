"use client";

import { useEffect, useMemo, useState } from "react";
import { Network } from "lucide-react";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { useDeskSettings } from "@/components/desk/settings";
import { useOsTelemetry } from "@/components/os/telemetry-context";
import { modelInfo } from "@/lib/engines/models";
import { readCalibration } from "@/lib/engines/calibration";
import { useLicense } from "@/lib/license-context";
import { useLicensingCopy } from "./copy";
import { SourceTag } from "./ops-ui";
import { Widget } from "./widget";

type Status = "running" | "idle" | "locked" | "degraded";
type NodeKind = "gateway" | "orchestrator" | "executor" | "illustrative";
type MapNode = { id: string; label: string; kind: NodeKind; x: number; y: number; r: number; engine?: EngineKey };

const W = 960;
const H = 380;
const SUBS = ENGINE_ORDER.filter((k) => k !== "sovereign");

/** Fixed layout: the real pipeline on the left two thirds, the illustrative cluster framed on the right. */
const NODES: MapNode[] = [
  { id: "gateway", label: "", kind: "gateway", x: 80, y: 190, r: 30 },
  { id: "sovereign", label: "Sovereign", kind: "orchestrator", x: 255, y: 190, r: 34, engine: "sovereign" },
  ...SUBS.map((k, i): MapNode => ({ id: k, label: ENGINES[k].name, kind: "executor", x: 470 + (i % 2) * 70, y: 40 + i * 50, r: 22, engine: k })),
  { id: "usnavi", label: "Usnavi", kind: "illustrative", x: 735, y: 85, r: 26 },
  { id: "lilapi", label: "Lil API", kind: "illustrative", x: 735, y: 190, r: 26 },
  { id: "vijay", label: "Vijay", kind: "illustrative", x: 735, y: 295, r: 26 },
  ...["usnavi", "lilapi", "vijay"].flatMap((p, i) => [0, 1].map((j): MapNode => ({ id: `${p}-x${j + 1}`, label: `exec-${i + 1}.${j + 1}`, kind: "illustrative", x: 885, y: 85 + i * 105 + (j ? 30 : -30), r: 15 }))),
];
const EDGES: [string, string][] = [
  ["gateway", "sovereign"],
  ...SUBS.map((k): [string, string] => ["sovereign", k]),
  ["usnavi", "lilapi"],
  ["lilapi", "vijay"],
  ...["usnavi", "lilapi", "vijay"].flatMap((p): [string, string][] => [[p, `${p}-x1`], [p, `${p}-x2`]]),
];
const at = (id: string) => NODES.find((n) => n.id === id)!;

/**
 * Agent topology: the real pipeline (model gateway → Sovereign → the seven sub-executor engines) with node status
 * and edge glow from the run ledger and license, and, framed apart and tagged "Illustrative", the Usnavi / Lil API
 * / Vijay cluster whose status is simulated. Select any node for its details.
 */
export function TopologyMap() {
  const o = useLicensingCopy().ops;
  const t = o.topology;
  const { settings } = useDeskSettings();
  const { isUnlocked } = useLicense();
  const { manifest } = useOsTelemetry();
  const [sim, setSim] = useState<Record<string, Status>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // The illustrative cluster's simulated status drifts; the real nodes re-read the ledger on the same beat.
  useEffect(() => {
    const roll = () => {
      setNow(Date.now());
      setSim(Object.fromEntries(NODES.filter((n) => n.kind === "illustrative").map((n) => {
        const r = Math.random();
        return [n.id, r < 0.68 ? "running" : r < 0.9 ? "idle" : "degraded"];
      })));
    };
    roll();
    const id = setInterval(roll, 2600);
    return () => clearInterval(id);
  }, []);

  const real = useMemo(() => {
    const out: Record<string, { status: Status; runs: number; lastMs: number | null; lastAt: number | null }> = {};
    for (const k of ENGINE_ORDER) {
      const runs = settings.runs.filter((r) => r.target === k);
      const last = runs.at(-1);
      out[k] = { status: !isUnlocked(k) ? "locked" : last && now - last.at < 5 * 60_000 ? "running" : "idle", runs: runs.length, lastMs: last?.ms ?? null, lastAt: last?.at ?? null };
    }
    const anyHot = Object.values(out).some((x) => x.status === "running");
    out.gateway = { status: anyHot ? "running" : "idle", runs: settings.runs.length, lastMs: null, lastAt: settings.runs.at(-1)?.at ?? null };
    return out;
  }, [settings.runs, isUnlocked, now]);

  const statusOf = (n: MapNode): Status => (n.kind === "illustrative" ? (sim[n.id] ?? "idle") : (real[n.id]?.status ?? "idle"));
  const tone = (s: Status) => (s === "running" ? "var(--tier-accent)" : s === "degraded" ? "#FFB000" : s === "locked" ? "rgb(255 255 255 / 0.18)" : "rgb(255 255 255 / 0.45)");
  const label = (n: MapNode) => (n.kind === "gateway" ? t.gateway : n.label);
  const sel = selected ? at(selected) : null;

  return (
    <Widget icon={Network} title={t.title} sub={t.sub} className="xl:col-span-2">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[720px]" role="img" aria-label={t.title}>
          {/* The illustrative cluster is framed apart so it is never read as part of the real pipeline. */}
          <rect x={655} y={18} width={290} height={H - 36} rx={18} fill="rgb(255 255 255 / 0.015)" stroke="rgb(255 176 0 / 0.35)" strokeDasharray="6 6" />
          <text x={670} y={40} fill="rgb(255 176 0 / 0.85)" fontSize={10.5} fontFamily="var(--font-mono)" letterSpacing="0.14em">
            {o.illustrative.toUpperCase()}
          </text>

          {EDGES.map(([a, b]) => {
            const p = at(a);
            const q = at(b);
            const live = statusOf(q) === "running" && statusOf(p) !== "locked";
            const d = `M${p.x},${p.y} C${(p.x + q.x) / 2},${p.y} ${(p.x + q.x) / 2},${q.y} ${q.x},${q.y}`;
            return (
              <g key={`${a}-${b}`}>
                <path d={d} fill="none" stroke={live ? "color-mix(in srgb, var(--tier-accent) 55%, transparent)" : "rgb(255 255 255 / 0.08)"} strokeWidth={live ? 1.6 : 1} style={live ? { filter: "drop-shadow(0 0 4px var(--tier-glow))", transition: "stroke 600ms" } : { transition: "stroke 600ms" }} />
                {live &&
                  [0, 1].map((k) => (
                    <circle key={k} r={2.6} fill="var(--tier-accent)">
                      <animateMotion dur="1.8s" begin={`${k * 0.9}s`} repeatCount="indefinite" path={d} />
                    </circle>
                  ))}
              </g>
            );
          })}

          {NODES.map((n) => {
            const s = statusOf(n);
            const on = selected === n.id;
            return (
              <g key={n.id} role="button" tabIndex={0} aria-label={label(n)} onClick={() => setSelected(on ? null : n.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(on ? null : n.id)} className="cursor-pointer outline-none">
                {s === "running" && (
                  <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke={tone(s)} strokeOpacity={0.5}>
                    <animate attributeName="r" values={`${n.r};${n.r + 10}`} dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.5;0" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={n.x} cy={n.y} r={n.r} fill="rgba(7, 8, 12, 0.92)" stroke={tone(s)} strokeWidth={on ? 2.4 : 1.4} style={{ transition: "stroke 600ms" }} />
                <text x={n.x} y={n.y + (n.r > 20 ? 3.5 : 3)} textAnchor="middle" fill={s === "locked" ? "rgb(255 255 255 / 0.35)" : "rgb(255 255 255 / 0.9)"} fontSize={n.r > 20 ? 10 : 8.5} fontFamily="var(--font-mono)">
                  {n.kind === "gateway" ? "GW" : label(n).length > 9 ? `${label(n).slice(0, 8)}…` : label(n)}
                </text>
                <circle cx={n.x + n.r * 0.72} cy={n.y - n.r * 0.72} r={3.4} fill={tone(s)} />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 min-h-12 rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 text-[12px]">
        {!sel ? (
          <span className="text-white/40">{t.select}</span>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="flex items-center gap-2 text-white/90">
              {label(sel)}
              {sel.kind === "illustrative" && <SourceTag source="illustrative" label={o.illustrative} />}
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/50">{sel.kind === "gateway" ? t.gateway : sel.kind === "orchestrator" ? t.orchestrator : sel.kind === "executor" ? t.executor : t.executor}</span>
            <span className="font-mono text-[11px]" style={{ color: tone(statusOf(sel)) }}>
              ● {t.status[statusOf(sel)]}
            </span>
            {sel.engine && (
              <>
                <span className="text-white/55">
                  {t.model}: <span className="text-white/85">{modelInfo(readCalibration(settings.calibrations[sel.engine]).model).label}</span>
                </span>
                <span className="text-white/55">
                  {t.runs}: <span className="tabular-nums text-white/85">{real[sel.engine]?.runs ?? 0}</span>
                </span>
                <span className="text-white/55">
                  {t.lastRun}: <span className="tabular-nums text-white/85">{real[sel.engine]?.lastAt ? `${new Date(real[sel.engine].lastAt!).toLocaleTimeString()} · ${real[sel.engine].lastMs}ms` : t.noRuns}</span>
                </span>
              </>
            )}
            {sel.kind === "gateway" && manifest && (
              <span className="text-white/55">
                {manifest.provider} · {manifest.model} · {manifest.mode}
              </span>
            )}
          </div>
        )}
      </div>
    </Widget>
  );
}
