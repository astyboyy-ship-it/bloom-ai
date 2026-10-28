"use client";

import { memo, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { DispatchResult } from "@/lib/intentpulse/outreach";
import { PLATFORM_KEYS, PLATFORMS, routeOf, signalScore, type Platform, type PulseSignal } from "@/lib/intentpulse/signal";
import type { IntentTier } from "@/lib/intentpulse/types";
import { ActivityList, ChannelSalesTable, Empty, money, pct, StatStrip, Surface, SurfaceHeader, TierBadge } from "../kit";
import { ago, clock, compact, fmt, PLATFORM_ICON, ROUTE_LABEL } from "../platform";
import type { PulseEngine } from "../use-pulse-engine";

export type ViewProps = { e: PulseEngine; now: number; selectedId?: string; onOpen: (s: PulseSignal) => void };

type Filter = "all" | IntentTier | "QUARANTINE";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "VIP", label: "VIP" },
  { id: "QUALIFIED", label: "Qualified" },
  { id: "NURTURE", label: "Nurture" },
  { id: "QUARANTINE", label: "Quarantined" },
];

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-md border border-white/[0.08] bg-black/20 p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("h-6 rounded px-2.5 text-[11.5px] transition-colors", value === o.id ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white/85")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Per-platform [total, urgent] counts over the rolling 60-second window. */
export function useRolling(e: PulseEngine) {
  const win = e.hub.window;
  return useMemo(() => {
    const out = Object.fromEntries(PLATFORM_KEYS.map((k) => [k, [0, 0]])) as Record<Platform, [number, number]>;
    for (const w of win)
      for (const k of PLATFORM_KEYS) {
        out[k][0] += w.per[k][0];
        out[k][1] += w.per[k][1];
      }
    return out;
  }, [win]);
}

export function velocityOf(e: PulseEngine) {
  return e.hub.window.filter((w) => e.now - w.t < 3000).reduce((s, w) => s + w.n, 0) / 3;
}

const LedgerRow = memo(function LedgerRow({ s, now, active, outcome, onOpen }: { s: PulseSignal; now: number; active: boolean; outcome?: DispatchResult; onOpen: (s: PulseSignal) => void }) {
  const Icon = PLATFORM_ICON[s.platform];
  return (
    <tr onClick={() => onOpen(s)} className={cn("cursor-pointer border-b border-white/[0.05] transition-colors", active ? "bg-[#e9cf98]/[0.07]" : "hover:bg-white/[0.03]")}>
      <td className="whitespace-nowrap py-2 pl-4 pr-2 tabular-nums text-white/40">{ago(s.postedAt, now || undefined)}</td>
      <td className="px-2 py-2">
        <Icon className="size-3.5" style={{ color: PLATFORMS[s.platform].color }} aria-label={PLATFORMS[s.platform].label} />
      </td>
      <td className="max-w-[180px] px-2 py-2">
        <p className="truncate font-medium text-white/90">{s.author.name}</p>
        <p className="truncate text-[11px] text-white/40">{s.author.company || s.author.handle}</p>
      </td>
      <td className="max-w-0 px-2 py-2 text-white/60">
        <p className="truncate">{s.text}</p>
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-white/60">{s.budgetK === null ? "—" : `$${fmt(s.budgetK)}k`}</td>
      <td className="px-2 py-2 text-right tabular-nums text-white/60">{signalScore(s, "urgency")}</td>
      <td className="px-2 py-2">
        <TierBadge s={s} outcome={outcome} />
      </td>
      <td className="whitespace-nowrap py-2 pl-2 pr-4 text-white/45">{outcome ? (outcome.action === "vip" ? "Booked" : outcome.action === "outreach" ? "Messaged" : "Quarantined") : ROUTE_LABEL[routeOf(s)]}</td>
    </tr>
  );
});

/** The live, filterable table of notable signals across every channel. Pauses while hovered. */
export function LiveSignals({ e, now, selectedId, onOpen, height = "h-[520px]", channel }: ViewProps & { height?: string; channel?: Platform }) {
  const [filter, setFilter] = useState<Filter>("all");
  const rows = e.hub.ledger.filter(
    (s) =>
      (!channel || s.platform === channel) &&
      (filter === "all" ? true : filter === "QUARANTINE" ? routeOf(s) === "quarantine" || e.outcomes[s.id]?.action === "quarantine" : s.result.tier === filter && routeOf(s) !== "quarantine"),
  );
  return (
    <Surface className="flex flex-col" onPointerEnter={() => (e.hovering.current = true)} onPointerLeave={() => (e.hovering.current = false)}>
      <SurfaceHeader title="Live signals" meta={`${fmt(rows.length)} shown · pauses while hovered`} right={<Segmented value={filter} options={FILTERS} onChange={setFilter} />} />
      <div className={cn(height, "overflow-auto")}>
        <table className="w-full table-fixed text-left text-[12.5px]">
          <colgroup>
            <col className="w-[76px]" />
            <col className="w-[36px]" />
            <col className="w-[180px]" />
            <col />
            <col className="w-[80px]" />
            <col className="w-[52px]" />
            <col className="w-[118px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[#141318]">
            <tr className="border-b border-white/[0.07] text-[11px] text-white/40">
              <th className="py-2 pl-4 pr-2 font-normal">Time</th>
              <th className="px-2 py-2 font-normal" aria-label="Channel" />
              <th className="px-2 py-2 font-normal">Lead</th>
              <th className="px-2 py-2 font-normal">Signal</th>
              <th className="px-2 py-2 text-right font-normal">Budget</th>
              <th className="px-2 py-2 text-right font-normal">Urg.</th>
              <th className="px-2 py-2 font-normal">Score</th>
              <th className="py-2 pl-2 pr-4 font-normal">Route</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 150).map((s) => (
              <LedgerRow key={s.id} s={s} now={now} active={selectedId === s.id} outcome={e.outcomes[s.id]} onOpen={onOpen} />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No signals in this segment yet.</Empty>}
      </div>
    </Surface>
  );
}

export function Overview({ e, now, selectedId, onOpen }: ViewProps) {
  const { hub } = e;
  const revenue = PLATFORM_KEYS.reduce((s, k) => s + hub.sales[k].revenue, 0);
  const deals = PLATFORM_KEYS.reduce((s, k) => s + hub.sales[k].deals, 0);
  const engaged = PLATFORM_KEYS.reduce((s, k) => s + hub.sales[k].engaged, 0);

  return (
    <div className="space-y-4">
      <StatStrip
        items={[
          { label: "Revenue attributed", value: money(revenue), sub: "simulated attribution" },
          { label: "Deals closed", value: fmt(deals), sub: `${fmt(engaged)} engaged leads` },
          { label: "Conversion", value: pct(deals, engaged), sub: "engaged → closed" },
          { label: "Signals / sec", value: fmt(velocityOf(e)), sub: `${compact(hub.total)} this session` },
          { label: "VIP routed", value: fmt(hub.routed.vip), sub: "calendar bookings" },
          { label: "Quarantined", value: fmt(hub.routed.quarantine), sub: "competitor recon" },
        ]}
      />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <LiveSignals e={e} now={now} selectedId={selectedId} onOpen={onOpen} />

        <div className="grid gap-4 max-2xl:md:grid-cols-2">
          <Surface>
            <SurfaceHeader title="Closed deals" meta="most recent" />
            <ul className="divide-y divide-white/[0.05]">
              {hub.closes.slice(0, 7).map((c) => {
                const Icon = PLATFORM_ICON[c.platform];
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12.5px]">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon className="size-3.5 shrink-0" style={{ color: PLATFORMS[c.platform].color }} />
                      <span className="truncate text-white/85">{c.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-medium text-white">{money(c.amount)}</span>
                      <span className="ml-2 text-white/35">{clock(new Date(c.t)).slice(0, 5)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {hub.closes.length === 0 && <Empty>No deals closed yet.</Empty>}
          </Surface>
          <Surface className="flex flex-col">
            <SurfaceHeader title="Activity" meta="automations & dispatches" />
            <ActivityList entries={hub.log.slice(0, 30)} className="max-h-[300px] overflow-y-auto" />
          </Surface>
        </div>
      </div>

      <Surface>
        <SurfaceHeader title="Sales & conversion by channel" meta="simulated attribution" />
        <div className="overflow-x-auto">
          <ChannelSalesTable sales={hub.sales} perPlatform={hub.perPlatform} />
        </div>
      </Surface>
    </div>
  );
}
