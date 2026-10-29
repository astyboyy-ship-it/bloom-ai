"use client";

import { useEffect, useState } from "react";
import type { CommandManifest } from "@/lib/engines/events";

export type Sla = "nominal" | "degraded" | "offline";

/** Last N probes kept for the SLA window. */
const WINDOW = 12;

/**
 * Probes GET /api/command every 10s: the round trip is the desk's latency telemetry, the body is the runtime
 * manifest (live or simulation), and the success ratio over the window is the SLA state.
 */
export function useTelemetry(headers: Record<string, string> = {}) {
  // Own keys change which runtime the server reports, so the probe re-runs when they change.
  const headerKey = JSON.stringify(headers);
  const [manifest, setManifest] = useState<CommandManifest | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [probes, setProbes] = useState<boolean[]>([]);

  useEffect(() => {
    let alive = true;
    const probe = async () => {
      const t0 = performance.now();
      let ok = false;
      try {
        const res = await fetch("/api/command", { cache: "no-store", headers: JSON.parse(headerKey) as Record<string, string> });
        if (res.ok) {
          const m = (await res.json()) as CommandManifest;
          if (!alive) return;
          setManifest(m);
          setLatency(Math.round(performance.now() - t0));
          ok = true;
        }
      } catch {
        // Counted as a failed probe below.
      }
      if (alive) setProbes((p) => [...p, ok].slice(-WINDOW));
    };
    probe();
    const t = setInterval(probe, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [headerKey]);

  const uptime = probes.length ? probes.filter(Boolean).length / probes.length : null;
  const sla: Sla = uptime === null || probes.at(-1) === false ? (probes.length ? "offline" : "nominal") : uptime >= 0.99 && (latency ?? 0) < 1500 ? "nominal" : "degraded";
  return { manifest, latency, uptime, sla };
}
