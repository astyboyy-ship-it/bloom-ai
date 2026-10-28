"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCardActive } from "./active-context";

const prospects = [
  { name: "Maya R.", role: "Founder · smart-ring wearables" },
  { name: "Daniel K.", role: "CEO · premium coffee DTC" },
  { name: "Sofia L.", role: "CMO · boutique hotel group" },
  { name: "Jonah P.", role: "Founder · B2B design studio" },
];

const stages = ["Researched", "Sent", "Opened", "Replied", "Meeting"] as const;
const stageStyle: Record<(typeof stages)[number], string> = {
  Researched: "border-white/10 text-white/40",
  Sent: "border-white/15 text-white/60",
  Opened: "border-rose/30 bg-rose/10 text-rose",
  Replied: "border-sun/35 bg-sun/10 text-sun",
  Meeting: "border-dusk/40 bg-dusk/15 text-dusk",
};

// Each prospect advances at its own pace and stops somewhere realistic.
const finalStage = [4, 3, 2, 4];

export function HunterVisual() {
  const active = useCardActive();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 9), active ? 450 : 900);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="absolute inset-0 p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
        <span>Outbound · tonight</span>
        <span className="flex items-center gap-1.5 text-rose/80">
          <span className="size-1.5 animate-pulse rounded-full bg-rose" /> sending
        </span>
      </div>
      <ul className="space-y-1.5">
        {prospects.map((p, i) => {
          const stage = stages[Math.max(0, Math.min(finalStage[i], tick - i))];
          return (
            <motion.li
              key={p.name}
              animate={{ x: active ? 4 : 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose/40 to-sun/30 text-[9px] font-semibold text-white">
                {p.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-white/85">{p.name}</p>
                <p className="truncate text-[9px] text-white/35">{p.role}</p>
              </div>
              <motion.span
                key={stage}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn("rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider", stageStyle[stage])}
              >
                {stage}
              </motion.span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
