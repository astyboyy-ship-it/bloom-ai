"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Cpu, Gauge, ShieldBan } from "lucide-react";
import { useDeskSettings } from "@/components/desk/settings";
import { useOsTelemetry } from "@/components/os/telemetry-context";
import { useLicense } from "@/lib/license-context";
import { useSampleMode } from "@/components/onboarding/sample-data";
import { useLicensingCopy } from "./copy";
import { LiveDot, Sparkline, SourceTag, Trend, type Source } from "./ops-ui";

const BUCKET_MS = 5 * 60_000;
const BUCKETS = 12;
const CLUSTERS_KEY = "bloom-enterprise-clusters";

/** Deterministic sample curve for an empty workspace (tagged "sample" wherever it shows). */
const sampleSeries = (base: number, swing: number, seed: number) => Array.from({ length: BUCKETS }, (_, i) => Math.max(0, Math.round(base + Math.sin(i * 0.9 + seed) * swing + Math.cos(i * 0.37 + seed * 2) * swing * 0.4)));

function readCordons(): number {
  try {
    const state = JSON.parse(localStorage.getItem(CLUSTERS_KEY) ?? "{}") as Record<string, { cordoned?: boolean; drained?: boolean }>;
    return Object.values(state).filter((x) => x.cordoned || x.drained).length;
  } catch {
    return 0;
  }
}

type Kpi = { key: string; icon: typeof Gauge; label: string; value: string; series: number[]; source: Source; goodWhen: "up" | "down" };

/**
 * The operations room's headline strip: four live KPIs, each with a sparkline, a trend against the first half of
 * its window and a source tag. Latency samples the live probe; throughput and active engines come from the run
 * ledger in 5-minute buckets over the last hour (sample curves, tagged, until the first run); cordons are read
 * from the cluster manager's state.
 */
export function OpsKpis() {
  const o = useLicensingCopy().ops;
  const { settings } = useDeskSettings();
  const { latency } = useOsTelemetry();
  const { engines } = useLicense();
  const sample = useSampleMode();
  const [latencies, setLatencies] = useState<number[]>([]);
  const [cordons, setCordons] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (latency === null) return;
    setLatencies((xs) => [...xs, latency].slice(-40));
  }, [latency]);

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      setCordons((xs) => [...xs, readCordons()].slice(-30));
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);

  const ledger = useMemo(() => {
    const start = now - BUCKETS * BUCKET_MS;
    const tokens = new Array<number>(BUCKETS).fill(0);
    const active = Array.from({ length: BUCKETS }, () => new Set<string>());
    for (const r of settings.runs) {
      if (r.at < start) continue;
      const b = Math.min(BUCKETS - 1, Math.floor((r.at - start) / BUCKET_MS));
      tokens[b] += (r.tokens?.input ?? 0) + (r.tokens?.output ?? 0);
      if (r.kind === "engine") active[b].add(r.target);
    }
    const recent = new Set(settings.runs.filter((r) => r.kind === "engine" && now - r.at < 15 * 60_000).map((r) => r.target));
    return { tokensPerMin: tokens.map((t) => Math.round(t / 5)), active: active.map((s) => s.size), recent: recent.size };
  }, [settings.runs, now]);

  const useSample = sample && settings.runs.length === 0;
  const throughput = useSample ? sampleSeries(1840, 620, 1.3) : ledger.tokensPerMin;
  const activeSeries = useSample ? sampleSeries(5, 2, 0.4).map((x) => Math.min(engines.length, x)) : ledger.active;
  const tag = (measured: boolean): Source => (measured ? "measured" : "sample");

  const kpis: Kpi[] = [
    { key: "latency", icon: Gauge, label: o.kpi.latency, value: latency === null ? "—" : `${latency}ms`, series: latencies, source: "measured", goodWhen: "down" },
    { key: "throughput", icon: Activity, label: o.kpi.throughput, value: `${(throughput.at(-1) ?? 0).toLocaleString("en-US")} ${o.kpi.perMin}`, series: throughput, source: tag(!useSample), goodWhen: "up" },
    { key: "agents", icon: Cpu, label: o.kpi.agents, value: o.kpi.of(useSample ? (activeSeries.at(-1) ?? 0) : ledger.recent, engines.length), series: activeSeries, source: tag(!useSample), goodWhen: "up" },
    { key: "cordons", icon: ShieldBan, label: o.kpi.cordons, value: String(cordons.at(-1) ?? 0), series: cordons, source: "measured", goodWhen: "down" },
  ];
  const label = (s: Source) => (s === "measured" ? o.measured : s === "sample" ? o.sample : s === "simulated" ? o.simulated : o.illustrative);

  return (
    <div className="grid grid-cols-1 gap-[var(--bloom-gap)] sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map(({ key, icon: Icon, label: name, value, series, source, goodWhen }) => (
        <section key={key} className="bloom-glass bloom-noise group rounded-2xl p-3.5 hover:border-os-cyan/30 hover:shadow-[0_0_40px_-24px_var(--tier-glow)]">
          <header className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/45">
              <Icon className="size-3.5 shrink-0 text-os-cyan" />
              <span className="truncate">{name}</span>
            </span>
            <SourceTag source={source} label={label(source)} />
          </header>
          <div className="mt-2 flex items-end justify-between gap-2">
            <span className="bloom-glow font-mono text-[22px] leading-none tabular-nums">{value}</span>
            {series.length >= 4 ? <Trend values={series} goodWhen={goodWhen} /> : <span className="flex items-center gap-1 font-mono text-[9.5px] text-white/35"><LiveDot /> {o.collecting}</span>}
          </div>
          <Sparkline values={series} className="mt-2 transition-opacity group-hover:opacity-100" />
        </section>
      ))}
    </div>
  );
}
