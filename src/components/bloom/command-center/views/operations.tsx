"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInterval } from "../../demo/shared/sim";
import { Blueprint, NICHES, type Niche } from "../blueprint";
import { ActivityList, Bar, Surface, SurfaceHeader } from "../kit";
import { compact } from "../platform";
import type { ViewProps } from "./overview";

/** Hours since 06:00, as a position through the three 8-hour shifts. */
function shiftPosition(d = new Date()) {
  return ((d.getHours() + d.getMinutes() / 60 - 6 + 24) % 24) / 8;
}

export function Shifts({ e }: ViewProps) {
  const { hub } = e;
  const [pos, setPos] = useState(0);
  useEffect(() => setPos(shiftPosition()), []);
  useInterval(() => setPos(shiftPosition()), 30_000);
  const active = Math.min(2, Math.floor(pos));
  const progress = pos - active;

  const shifts = [
    {
      name: "Global Social Radar Sweep",
      window: "06:00 – 14:00",
      tasks: ["Sweep X, Instagram, TikTok & Reddit", "De-duplicate cross-posted signals", "Score every inbound in milliseconds", "Flag urgent VIP spikes to the AE lane"],
      output: `${compact(hub.total)} signals swept`,
    },
    {
      name: "High-Intent VIP Booking Dispatch",
      window: "14:00 – 22:00",
      tasks: ["Dispatch VIP calendar booking links", "Draft replies for qualified buyers", "Hold priority AE slots", "Sync booked meetings to the CRM"],
      output: `${compact(hub.routed.vip)} VIP · ${compact(hub.routed.outreach)} qualified`,
    },
    {
      name: "Overnight Competitor Quarantine & Nurture Sync",
      window: "22:00 – 06:00",
      tasks: ["Quarantine competitor recon (capped at 30)", "Sync capped students (≤ 45) to nurture", "Re-score dormant signals", "Stage the morning pipeline brief"],
      output: `${compact(hub.routed.quarantine)} quarantined · ${compact(hub.routed.nurture)} nurtured`,
    },
  ];

  return (
    <Surface>
      <SurfaceHeader title="Workforce shifts" meta="runs on your local clock" />
      <div className="grid divide-white/[0.07] lg:grid-cols-3 lg:divide-x max-lg:divide-y">
        {shifts.map((s, i) => {
          const state = i < active ? "done" : i === active ? "live" : "queued";
          const done = state === "done" ? s.tasks.length : state === "live" ? Math.floor(progress * (s.tasks.length + 0.999)) : 0;
          return (
            <section key={s.name} className="p-4">
              <div className="flex items-center justify-between gap-2 text-[11.5px]">
                <span className="tabular-nums text-white/45">
                  Shift 0{i + 1} · {s.window}
                </span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-medium",
                    state === "live" && "bg-[#e9cf98]/15 text-[#f0d9a8]",
                    state === "done" && "bg-white/[0.07] text-white/60",
                    state === "queued" && "text-white/35",
                  )}
                >
                  {state === "live" ? "Running" : state === "done" ? "Complete" : "Queued"}
                </span>
              </div>
              <h3 className="mt-2 text-[14px] font-semibold text-white/95">{s.name}</h3>
              <ul className="mt-3 space-y-1.5">
                {s.tasks.map((t, ti) => (
                  <li key={t} className={cn("flex gap-2 text-[12.5px]", ti < done ? "text-white/80" : "text-white/35")}>
                    <Check className={cn("mt-0.5 size-3.5 shrink-0", ti < done ? "text-[#e9cf98]" : "text-white/15")} /> {t}
                  </li>
                ))}
              </ul>
              <Bar value={state === "done" ? 100 : state === "live" ? progress * 100 : 0} className="mt-4" />
              <p className="mt-2 text-[11.5px] text-white/40">{s.output}</p>
            </section>
          );
        })}
      </div>
    </Surface>
  );
}

export function BlueprintView({ e }: ViewProps) {
  const [niche, setNiche] = useState<Niche>("saas");
  return (
    <Surface>
      <SurfaceHeader title="Workflow blueprint" meta={NICHES[niche].label} />
      <div className="p-4">
        <Blueprint niche={niche} onNiche={setNiche} perPlatform={e.hub.perPlatform} routed={e.hub.routed} total={e.hub.total} />
      </div>
    </Surface>
  );
}

export function ActivityLog({ e }: ViewProps) {
  return (
    <Surface>
      <SurfaceHeader title="Activity log" meta="automations, dispatches, sweeps and closes" />
      <ActivityList entries={e.hub.log} className="max-h-[calc(100dvh-200px)] overflow-y-auto" />
    </Surface>
  );
}
