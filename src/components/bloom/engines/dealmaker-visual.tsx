"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCardActive } from "./active-context";

const thread = [
  { from: "brand", text: "We'd love to partner. Our budget is $4,000." },
  { from: "bloom", text: "Comparable creators in this category book at $11k. We can do $9,800 with usage rights." },
  { from: "brand", text: "Could we meet at $6,500?" },
  { from: "bloom", text: "$9,200, with a 30-day exclusivity window. Final offer." },
  { from: "brand", text: "Deal. Sending the contract." },
] as const;

const offers = [4000, 4000, 6500, 9200, 9200];

export function DealmakerVisual() {
  const active = useCardActive();
  const [step, setStep] = useState(1);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s >= thread.length + 1 ? 1 : s + 1)), active ? 1100 : 2200);
    return () => clearInterval(id);
  }, [active]);

  const shown = thread.slice(0, Math.min(step, thread.length));
  const offer = offers[Math.min(step, thread.length) - 1];
  const closed = step >= thread.length;

  return (
    <div className="absolute inset-0 flex flex-col p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Negotiation · Lumen Labs</span>
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-widest text-white/35">Current offer</p>
          <motion.p
            key={offer}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn("font-serif text-2xl italic tabular-nums", offer >= 9000 ? "text-sun" : "text-white")}
          >
            ${offer.toLocaleString("en-US")}
          </motion.p>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col justify-end gap-2 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_25%)]">
        <AnimatePresence initial={false}>
          {shown.map((m, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className={cn(
                "max-w-[82%] rounded-2xl px-3.5 py-2 text-[11px] leading-snug",
                m.from === "brand"
                  ? "self-start rounded-bl-md border border-white/[0.07] bg-white/[0.04] text-white/65"
                  : "self-end rounded-br-md border border-rose/25 bg-rose/10 text-white",
              )}
            >
              {m.from === "bloom" && <span className="mb-0.5 block font-mono text-[8px] uppercase tracking-widest text-rose/80">Bloom · on your behalf</span>}
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {closed && (
          <motion.div
            initial={{ opacity: 0, scale: 1.6, rotate: -14 }}
            animate={{ opacity: 1, scale: 1, rotate: -8 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="absolute right-6 top-16 rounded-lg border-2 border-sun/70 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-sun shadow-[0_0_30px_-6px_rgb(255_189_110/0.7)]"
          >
            +130% · Agreed
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
