"use client";

import { useEffect, useState } from "react";
import type { EngineKey } from "./engines";
import { deployedEngines } from "./storage";

/** "Workforce active" or "Ready to calibrate", from what this browser has saved. */
export function EngineStatus({ engine }: { engine: EngineKey }) {
  const [active, setActive] = useState<boolean | null>(null);
  useEffect(() => setActive(deployedEngines().includes(engine)), [engine]);
  if (active === null) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-c-edge/60 bg-black/55 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/75">
      <span className={active ? "size-1.5 animate-pulse rounded-full bg-c-1" : "size-1.5 rounded-full bg-white/35"} />
      {active ? "Workforce active" : "Ready to calibrate"}
    </span>
  );
}
