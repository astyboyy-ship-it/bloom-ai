"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked: leave the label unchanged */
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[#f0d59a]/25 bg-ink/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f3e2b8] backdrop-blur-md transition-colors hover:border-[#f0d59a]/60 hover:text-white",
        className,
      )}
    >
      {done ? <Check className="size-3.5 text-[#8ff0ff]" /> : <Copy className="size-3.5" />}
      {done ? "Copied" : label}
    </button>
  );
}
