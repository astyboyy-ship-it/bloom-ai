"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ENGINE_ORDER, type EngineKey } from "@/components/bloom/command/engines";

/** Starting points for each engine's headline metric feed. Sample data, labeled as such wherever it shows. */
export const METRIC_BASE: Record<EngineKey, number> = {
  sovereign: 1_840_000,
  apex: 642_000,
  coreops: 118_000,
  intentpulse: 386_000,
  vanguard: 512_000,
  cortex: 274_000,
  shield: 931_000,
  aether: 208_000,
};

const NONE: Partial<Record<EngineKey, string>> = {};

/** Each feed drifts upward in small steps, faster for engines running in the current run. */
export function useMetricFeed(active: Partial<Record<EngineKey, string>> = NONE) {
  const [values, setValues] = useState(METRIC_BASE);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      setValues((v) => {
        const out = { ...v };
        for (const k of ENGINE_ORDER) out[k] = v[k] * (1 + (Math.random() - 0.3) * (active[k] === "running" ? 0.012 : 0.0025));
        return out;
      });
    }, 2400);
    return () => clearInterval(t);
  }, [reduce, active]);
  return values;
}
