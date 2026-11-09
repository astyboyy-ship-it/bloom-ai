"use client";

import { useEffect, useState } from "react";
import { CandlestickChart, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { createDemoGenerator, type DemoFrame } from "@/lib/demo/demoGenerator";
import { Widget } from "@/components/control-plane/widget";
import { useExperienceCopy } from "../copy";

const TICKS_PER_CANDLE = 5;
const CANDLES = 40;
const SYMBOL = "BLMX";
const BOOK_USD = 4_200_000;

type Candle = { o: number; h: number; l: number; c: number };

/**
 * Quantitative Candlestick & Risk Terminal for the trading demo key. One synthetic instrument from the trading
 * telemetry stream, aggregated into 5-tick candles, next to a risk terminal: parametric 95% one-day VaR from the
 * stream's own return volatility, gross exposure scaled by risk utilization, limit use, execution latency and
 * intraday drawdown. Synthetic data only.
 */
type Series = { candles: Candle[]; prices: number[]; pending: number[] };
const EMPTY: Series = { candles: [], prices: [], pending: [] };

/** Folds one telemetry frame into the series: the instrument's price joins the tick buffer and closes a candle every 5 ticks. */
function fold(s: Series, f: DemoFrame): Series {
  const p = f.ticker?.find((x) => x.symbol === SYMBOL)?.price;
  if (p === undefined) return s;
  const prices = [...s.prices, p].slice(-400);
  const pending = [...s.pending, p];
  if (pending.length < TICKS_PER_CANDLE) return { ...s, prices, pending };
  const candle = { o: pending[0], h: Math.max(...pending), l: Math.min(...pending), c: pending[pending.length - 1] };
  return { candles: [...s.candles, candle].slice(-CANDLES), prices, pending: [] };
}

export function QuantRiskTerminal() {
  const t = useExperienceCopy().trading;
  const [series, setSeries] = useState<Series>(EMPTY);
  const [frame, setFrame] = useState<DemoFrame | null>(null);

  useEffect(() => {
    const g = createDemoGenerator("trading");
    // Prime a full chart, then stream.
    let s = EMPTY;
    let f: DemoFrame | null = null;
    const n = CANDLES * TICKS_PER_CANDLE;
    for (let i = 0; i < n; i++) {
      f = g.next(Date.now() - (n - i) * 1000);
      s = fold(s, f);
    }
    setSeries(s);
    setFrame(f);
    const id = setInterval(() => {
      const next = g.next();
      setFrame(next);
      setSeries((cur) => fold(cur, next));
    }, 700);
    return () => clearInterval(id);
  }, []);

  const { candles, prices } = series;
  const lo = Math.min(...candles.map((c) => c.l));
  const hi = Math.max(...candles.map((c) => c.h));
  const span = hi - lo || 1;
  const y = (v: number) => 190 - ((v - lo) / span) * 180;
  const W = 600 / CANDLES;
  const last = candles.at(-1);

  const metric = (k: string) => frame?.metrics.find((m) => m.key === k)?.value ?? 0;
  const rets = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
  const mean = rets.reduce((s, r) => s + r, 0) / (rets.length || 1);
  const sd = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length || 1));
  const util = metric("risk_utilization");
  const exposure = BOOK_USD * (0.4 + util / 100);
  // 86,400 one-second ticks a day: scale the tick volatility to one day.
  const varUsd = 1.65 * sd * Math.sqrt(86_400) * exposure * 0.01;
  const peak = Math.max(...candles.map((c) => c.h));
  const drawdown = last ? ((peak - last.c) / peak) * 100 : 0;
  const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

  const rows = [
    { label: t.var, value: usd(varUsd), tone: util > 75 ? "warn" : "ok" },
    { label: t.exposure, value: usd(exposure), tone: "ok" },
    { label: t.limit, value: `${Math.round(util)}%`, tone: util > 90 ? "alert" : util > 75 ? "warn" : "ok", bar: util },
    { label: t.latency, value: `${metric("exec_latency_ms").toFixed(2)}ms`, tone: metric("exec_latency_ms") > 0.9 ? "warn" : "ok" },
    { label: t.drawdown, value: `${drawdown.toFixed(2)}%`, tone: drawdown > 1.5 ? "warn" : "ok" },
  ];

  return (
    <div className="grid gap-[var(--bloom-gap)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Widget
        icon={CandlestickChart}
        title={t.title}
        sub={t.sub}
        actions={
          last && (
            <span className="font-mono text-[11px] text-white/55" dir="ltr">
              {SYMBOL} {t.open} {last.o.toFixed(2)} {t.high} {last.h.toFixed(2)} {t.low} {last.l.toFixed(2)} {t.close} <span className={last.c >= last.o ? "text-os-emerald" : "text-red-300"}>{last.c.toFixed(2)}</span>
            </span>
          )
        }
      >
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{t.candles}</p>
        <svg viewBox="0 0 600 200" className="mt-1 h-56 w-full" preserveAspectRatio="none" aria-hidden>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={600} y1={200 * f} y2={200 * f} stroke="color-mix(in srgb, var(--tier-accent) 8%, transparent)" />
          ))}
          {candles.map((c, i) => {
            const up = c.c >= c.o;
            const color = up ? "#00FF88" : "#f87171";
            const x = i * W + W / 2;
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <rect x={x - W * 0.32} width={W * 0.64} y={Math.min(y(c.o), y(c.c))} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={color} fillOpacity={up ? 0.75 : 0.9} />
              </g>
            );
          })}
          {last && <line x1={0} x2={600} y1={y(last.c)} y2={y(last.c)} stroke="var(--tier-accent)" strokeDasharray="4 4" strokeOpacity={0.7} vectorEffect="non-scaling-stroke" />}
        </svg>
      </Widget>

      <Widget icon={ShieldAlert} title={t.risk}>
        <dl className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{r.label}</dt>
              <dd className={cn("mt-0.5 font-mono text-[17px] tabular-nums", r.tone === "ok" ? "text-white/90" : r.tone === "warn" ? "text-amber-200" : "text-red-300")}>{r.value}</dd>
              {r.bar !== undefined && (
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <span className={cn("block h-full rounded-full transition-[width] duration-500", r.tone === "ok" ? "bg-os-cyan" : r.tone === "warn" ? "bg-amber-300" : "bg-red-400")} style={{ width: `${r.bar}%` }} />
                </span>
              )}
            </div>
          ))}
        </dl>
      </Widget>
    </div>
  );
}
