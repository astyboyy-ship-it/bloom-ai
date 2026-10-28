"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Zap } from "lucide-react";
import { useCardActive } from "./active-context";

const leads = [
  { who: "Series A founder", signal: "Asked for pricing on a 6-month retainer", score: 94, x: 64, y: 30 },
  { who: "Creator · 240k subscribers", signal: "Booked a call after reading the case study", score: 88, x: 30, y: 60 },
  { who: "Ops lead, logistics", signal: "Budget approved, wants a start date", score: 91, x: 70, y: 68 },
  { who: "Agency owner", signal: "Requested a white-label proposal", score: 86, x: 38, y: 26 },
];

export function GatekeeperVisual() {
  const active = useCardActive();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % leads.length), active ? 1300 : 2600);
    return () => clearInterval(id);
  }, [active]);

  const lead = leads[idx];

  return (
    <div className="absolute inset-0 flex items-center px-5 sm:px-6">
      {/* Radar */}
      <div className="relative aspect-square h-[78%] shrink-0">
        {[1, 0.72, 0.44].map((s) => (
          <div key={s} className="absolute rounded-full border border-dusk/15" style={{ inset: `${((1 - s) / 2) * 100}%` }} />
        ))}
        <div className="absolute inset-0 m-auto h-px w-full bg-dusk/10" />
        <div className="absolute inset-0 m-auto h-full w-px bg-dusk/10" />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "conic-gradient(from 0deg, rgb(180 155 255 / 0.35), rgb(180 155 255 / 0) 70deg, transparent 360deg)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: active ? 1.6 : 3.6, repeat: Infinity, ease: "linear" }}
        />
        {leads.map((l, i) => (
          <motion.span
            key={l.who}
            className="absolute -ml-1 -mt-1 size-2 rounded-full"
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
            animate={{
              backgroundColor: i === idx ? "#ffbd6e" : "#b49bff",
              scale: i === idx ? [1, 1.7, 1] : 1,
              opacity: i === idx ? 1 : 0.4,
              boxShadow: i === idx ? "0 0 14px 3px rgb(255 189 110 / 0.6)" : "0 0 0 0 rgb(0 0 0 / 0)",
            }}
            transition={{ duration: 0.6 }}
          />
        ))}
        <span className="absolute inset-0 m-auto size-1.5 rounded-full bg-dusk" />
      </div>

      {/* Qualification feed */}
      <div className="relative ml-4 h-[78%] min-w-0 flex-1">
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-white/40">
          <span className="size-1.5 animate-pulse rounded-full bg-sun" /> Inbound · scored live
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="rounded-xl border border-sun/25 bg-sun/[0.06] p-3 shadow-[0_0_30px_-10px_rgb(255_189_110/0.5)]"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] font-medium text-sun">
                <Zap className="size-3 fill-sun text-sun" /> Qualified buyer
              </span>
              <span className="font-mono text-[10px] text-white/50">{lead.score}/100</span>
            </div>
            <p className="mt-1.5 text-xs text-white">{lead.who}</p>
            <p className="text-[11px] text-white/50">{lead.signal}</p>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-dusk">
              <CalendarCheck className="size-3" /> Routed to your calendar
            </p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-2 space-y-1.5">
          {[1, 2].map((o) => {
            const l = leads[(idx - o + leads.length) % leads.length];
            return (
              <div
                key={o}
                className="truncate rounded-lg border border-white/[0.06] px-3 py-1.5 text-[10px] text-white/30"
                style={{ opacity: 1 - o * 0.3 }}
              >
                {l.who} · {l.score}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
