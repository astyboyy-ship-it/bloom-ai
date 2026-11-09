"use client";

import { CircleDollarSign } from "lucide-react";
import { useLicense } from "@/lib/license-context";
import { useAgencyClients } from "@/components/modes/role-decks";
import { Widget } from "@/components/control-plane/widget";
import { useExperienceCopy } from "../copy";

/** Pricing the revenue model assumes. Stated in the panel; change here to match the agency's own rate card. */
const SEAT_PRICE = 149;
const NODE_PRICE = 0.9;

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * Multi-Tenant Revenue Hub: modeled MRR per client workspace from the seats and nodes the provisioner allocated,
 * with ARR, average per client and node-pool use against the key's limit.
 */
export function AgencyRevenueHub() {
  const a = useExperienceCopy().agency;
  const [clients] = useAgencyClients();
  const { permissions } = useLicense();
  const maxNodes = permissions?.maxActiveNodes ?? 0;

  const rows = clients.map((c) => ({ ...c, mrr: c.seats * SEAT_PRICE + c.nodes * NODE_PRICE })).sort((x, y) => y.mrr - x.mrr);
  const mrr = rows.reduce((s, r) => s + r.mrr, 0);
  const nodes = clients.reduce((s, c) => s + c.nodes, 0);
  const top = rows[0]?.mrr || 1;

  return (
    <Widget icon={CircleDollarSign} title={a.title} sub={a.sub(usd(SEAT_PRICE), `$${NODE_PRICE.toFixed(2)}`)}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: a.mrr, value: usd(mrr) },
          { label: a.arr, value: usd(mrr * 12) },
          { label: a.avg, value: rows.length ? usd(mrr / rows.length) : "—" },
          { label: a.pool, value: maxNodes ? `${Math.round((nodes / maxNodes) * 100)}%` : "—" },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
            <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">{m.label}</dt>
            <dd className="bloom-glow mt-1 font-mono text-[19px] tabular-nums">{m.value}</dd>
          </div>
        ))}
      </dl>
      {!rows.length ? (
        <p className="mt-4 text-center font-mono text-[12px] text-white/40">{a.empty}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_6rem] items-center gap-3 font-mono text-[11.5px]">
              <span className="truncate text-white/80">{r.name}</span>
              <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <span className="block h-full rounded-full bg-os-cyan transition-[width] duration-700" style={{ width: `${(r.mrr / top) * 100}%`, boxShadow: "0 0 12px var(--tier-glow)" }} />
              </span>
              <span className="text-end tabular-nums text-os-cyan">{usd(r.mrr)}</span>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
