"use client";

import { useSyncExternalStore } from "react";
import { Activity, CircleDollarSign, Server, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeskSettings } from "@/components/desk/settings";
import { useOnboardingCopy } from "./copy";

/**
 * Labeled sample data for empty dashboards. While a workspace has no runs, dashboards show realistic sample
 * figures instead of zeros, always tagged "Sample data". The first real run switches them to real numbers;
 * the operator can also hide samples (remembered on this device).
 */

const KEY = "bloom-sample-data";
const listeners = new Set<() => void>();
const readPref = () => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
};
export function setSampleData(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Not remembered beyond this page view.
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** True while the workspace has no real runs and the operator hasn't hidden sample data. */
export function useSampleMode(): boolean {
  const { settings } = useDeskSettings();
  const enabled = useSyncExternalStore(subscribe, readPref, () => false);
  return enabled && settings.runs.length === 0;
}

export function SampleTag({ className }: { className?: string }) {
  const s = useOnboardingCopy().sample;
  return <span className={cn("inline-flex items-center rounded-full border border-amber-300/40 bg-amber-300/[0.07] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-200", className)}>{s.tag}</span>;
}

/** The sample figures used across dashboards; one source so every panel tells the same story. */
export const SAMPLE = {
  nodes: 14_289,
  lossPreventedUsd: 1_400_000,
  uptime: 99.98,
  executions: 422,
  threats: { injection: 37, exfil: 12, refused: 64, mitigations: 113 },
  audit: { run: 422, approval: 58, security: 113, license: 6, calibration: 31 },
};

/** Home: the four headline sample figures, tagged, with a switch to hide them. Renders nothing outside sample mode. */
export function SampleTelemetryStrip() {
  const s = useOnboardingCopy().sample;
  const on = useSampleMode();
  if (!on) return null;
  const tiles = [
    { icon: Server, label: s.nodes, value: SAMPLE.nodes.toLocaleString("en-US") },
    { icon: CircleDollarSign, label: s.loss, value: `$${(SAMPLE.lossPreventedUsd / 1_000_000).toFixed(1)}M` },
    { icon: Activity, label: s.uptime, value: `${SAMPLE.uptime}%` },
    { icon: Zap, label: s.executions, value: SAMPLE.executions.toLocaleString("en-US") },
  ];
  return (
    <section className="rounded-2xl border border-amber-300/20 bg-[var(--bloom-glass)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SampleTag />
        <span className="text-[11.5px] text-white/45">{s.note}</span>
        <button type="button" onClick={() => setSampleData(false)} className="ms-auto font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 hover:text-white/80">
          {s.hide}
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {tiles.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
            <dt className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/40">
              <Icon className="size-3 text-os-cyan" /> {label}
            </dt>
            <dd className="bloom-glow mt-1 font-mono text-[20px] tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
