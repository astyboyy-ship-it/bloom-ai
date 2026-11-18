"use client";

import { useEffect, useState } from "react";
import { Grid3x3, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { effectiveFloor, InitiatorMandateSchema, RESOURCE_DIMENSIONS, RESOURCE_UNITS, SLA_TIERS, type InitiatorMandate, type ResourceDimension } from "@/lib/exchange/types";
import { useExchangeCopy } from "./copy";
import { Badge, num, Panel, PanelHeader, usd } from "./ui";
import type { Exchange } from "./use-exchange";

const NUMERIC = ["anchorPriceUsd", "floorPriceUsd", "costBasisUsd", "minMarginPct", "maxNetDays", "autoSettleCeilingUsd"] as const;
const DEFAULT_OFFER: Record<ResourceDimension, { capacity: number; floorUnitPriceUsd: number }> = {
  computeUnits: { capacity: 100_000, floorUnitPriceUsd: 0.18 },
  energyKwh: { capacity: 40_000, floorUnitPriceUsd: 0.07 },
  capitalUsd: { capacity: 250_000, floorUnitPriceUsd: 0.02 },
  complianceToken: { capacity: 12, floorUnitPriceUsd: 250 },
  bandwidthGbps: { capacity: 40, floorUnitPriceUsd: 95 },
};

const input = "tnum w-full rounded-md border border-[var(--xch-line)] bg-black/40 px-2.5 py-1.5 font-mono text-[12.5px] text-white outline-none transition-colors duration-150 focus:border-[color-mix(in_srgb,var(--xch-verified)_55%,transparent)]";
const label = "block truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/40";

export function MandateView({ x }: { x: Exchange }) {
  const t = useExchangeCopy();
  const [draft, setDraft] = useState<InitiatorMandate>(x.mandate);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(x.mandate), [x.mandate]);

  const valid = InitiatorMandateSchema.safeParse(draft).success;
  const dirty = JSON.stringify(draft) !== JSON.stringify(x.mandate);
  const floor = effectiveFloor(draft);
  const resources = draft.resources ?? {};
  const setRes = (d: ResourceDimension, patch: Partial<{ capacity: number; floorUnitPriceUsd: number }> | null) =>
    setDraft((m) => {
      const next = { ...(m.resources ?? {}) };
      if (patch === null) delete next[d];
      else next[d] = { ...(next[d] ?? DEFAULT_OFFER[d]), ...patch };
      return { ...m, resources: Object.keys(next).length ? next : undefined };
    });

  const save = async () => {
    setSaving(true);
    const ok = await x.saveMandate(draft);
    setSaving(false);
    if (ok) toast.success(t.mandate.saved);
    else toast.error(t.mandate.invalid);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-7">
        <Panel>
          <PanelHeader icon={Lock} title={t.mandate.title} sub={x.status?.operator ? t.mandate.subOperator : t.mandate.subSandbox} />
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {NUMERIC.map((k) => (
              <label key={k} className="block min-w-0">
                <span className={label}>{t.mandate.fields[k]}</span>
                <input type="number" inputMode="decimal" min={0} step={k === "minMarginPct" ? 0.5 : 1} value={draft[k]} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value === "" ? 0 : Number(e.target.value) }))} className={cn(input, "mt-1")} dir="ltr" />
              </label>
            ))}
            <label className="block min-w-0">
              <span className={label}>{t.mandate.fields.maxSlaTier}</span>
              <select value={draft.maxSlaTier} onChange={(e) => setDraft((d) => ({ ...d, maxSlaTier: e.target.value as InitiatorMandate["maxSlaTier"] }))} className={cn(input, "mt-1 capitalize")}>
                {SLA_TIERS.map((s) => (
                  <option key={s} value={s} className="bg-[#170b0f]">
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex min-w-0 flex-col justify-end">
              <span className={label}>{t.mandate.effectiveFloor}</span>
              <span className={cn("tnum mt-1 rounded-md border border-dashed px-2.5 py-1.5 font-mono text-[12.5px]", valid ? "border-[color-mix(in_srgb,var(--xch-verified)_35%,transparent)] text-[var(--xch-verified)]" : "border-[color-mix(in_srgb,var(--xch-clamp)_45%,transparent)] text-[var(--xch-clamp)]")} dir="ltr">
                {Number.isFinite(floor) ? usd(floor) : "—"}
              </span>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader icon={Grid3x3} title={t.matrix.title} sub={t.matrix.sub} />
          <div className="mt-4 overflow-x-auto">
            <table className="tnum w-full min-w-[560px] text-[12px]">
              <thead>
                <tr className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                  <th className="pb-2 text-start font-normal">{t.matrix.dimension}</th>
                  <th className="pb-2 text-start font-normal">{t.matrix.offered}</th>
                  <th className="pb-2 pe-2 text-start font-normal">{t.matrix.capacity}</th>
                  <th className="pb-2 pe-2 text-start font-normal">{t.matrix.unitFloor}</th>
                  <th className="pb-2 text-end font-normal">{t.matrix.maxFloor}</th>
                </tr>
              </thead>
              <tbody>
                {RESOURCE_DIMENSIONS.map((d) => {
                  const r = resources[d];
                  return (
                    <tr key={d} className="border-t border-[var(--xch-line)]">
                      <td className="py-2 pe-3">
                        <span className="text-white/85">{t.matrix.dims[d]}</span>
                        <span className="ms-1.5 font-mono text-[10px] text-white/35" dir="ltr">
                          {d} · {RESOURCE_UNITS[d]}
                        </span>
                      </td>
                      <td className="py-2 pe-3">
                        <button type="button" role="switch" aria-checked={Boolean(r)} aria-label={t.matrix.dims[d]} onClick={() => setRes(d, r ? null : {})} className={cn("relative h-4 w-7 rounded-full border transition-colors duration-150", r ? "border-[color-mix(in_srgb,var(--xch-verified)_50%,transparent)] bg-[color-mix(in_srgb,var(--xch-verified)_25%,transparent)]" : "border-[var(--xch-line-strong)] bg-white/[0.03]")}>
                          <span className={cn("absolute top-[1px] size-3 rounded-full bg-white transition-[inset-inline-start] duration-150", r ? "start-[13px]" : "start-[1px]")} />
                        </button>
                      </td>
                      <td className="py-2 pe-2">
                        <input type="number" min={0} disabled={!r} value={r?.capacity ?? ""} placeholder="—" onChange={(e) => setRes(d, { capacity: Number(e.target.value) })} className={cn(input, "w-28 disabled:opacity-30")} dir="ltr" />
                      </td>
                      <td className="py-2 pe-2">
                        <input type="number" min={0} step={0.01} disabled={!r} value={r?.floorUnitPriceUsd ?? ""} placeholder="—" onChange={(e) => setRes(d, { floorUnitPriceUsd: Number(e.target.value) })} className={cn(input, "w-24 disabled:opacity-30")} dir="ltr" />
                      </td>
                      <td className="py-2 text-end font-mono text-white/70" dir="ltr">
                        {r ? usd(r.capacity * r.floorUnitPriceUsd) : <span className="text-white/25">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!valid && <p className="mt-3 text-[11.5px] text-[var(--xch-clamp)]">{t.mandate.invalid}</p>}
          <button type="button" onClick={() => void save()} disabled={!valid || !dirty || saving} className="mt-4 w-full rounded-lg border border-[color-mix(in_srgb,var(--xch-verified)_40%,transparent)] bg-[color-mix(in_srgb,var(--xch-verified)_8%,transparent)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--xch-verified)] transition-opacity duration-150 disabled:opacity-35">
            {t.mandate.save}
          </button>
        </Panel>
      </div>

      <Panel className="xl:col-span-5">
        <PanelHeader icon={ShieldCheck} title={t.invariants.title} sub={t.invariants.sub} />
        <ol className="mt-4 space-y-2">
          {t.invariants.items.map((inv, i) => (
            <li key={i} className="grid grid-cols-[22px_1fr] gap-2 rounded-[10px] border border-[var(--xch-line)] bg-black/20 p-2.5">
              <span className="tnum font-mono text-[10px] text-white/30">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <p className="text-[12px] leading-relaxed text-white/80">{inv.rule}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Badge tone="solid">{inv.engine}</Badge>
                  <Badge tone="emerald">{t.invariants.enforced}</Badge>
                  {i === 0 && (
                    <span className="tnum ms-auto font-mono text-[10px] text-white/40" dir="ltr">
                      ≥ {usd(floor)}
                    </span>
                  )}
                  {i === 1 && Object.keys(resources).length > 0 && (
                    <span className="tnum ms-auto truncate font-mono text-[10px] text-white/40" dir="ltr">
                      {Object.entries(resources)
                        .map(([d, r]) => `${num(r.capacity)} ${RESOURCE_UNITS[d as ResourceDimension]}`)
                        .join(" · ")}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
