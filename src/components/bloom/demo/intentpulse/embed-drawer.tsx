"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, X } from "lucide-react";
import { toast } from "sonner";

export function EmbedDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [origin, setOrigin] = useState("https://workflow-architect-two.vercel.app");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const endpoint = `${origin}/api/intent-pulse`;
  const snippets = [
    {
      title: "1 · Drop-in script tag",
      body: "Scores any form on submit. Fields named name, company, budget and message are read automatically.",
      code: `<script src="${origin}/embed/intentpulse.js"\n  data-form="#lead-form"\n  data-vip-redirect="https://cal.com/you/vip"\n  defer></script>`,
    },
    {
      title: "2 · Listen for the verdict",
      body: "The form receives an intentpulse:scored event with the full result.",
      code: `document.querySelector("#lead-form")\n  .addEventListener("intentpulse:scored", (e) => {\n    const { score, tier, action } = e.detail;\n    console.log(score, tier, action.title);\n  });`,
    },
    {
      title: "3 · Scoring webhook",
      body: "POST JSON from Zapier, Make, n8n or your backend. CORS is open.",
      code: endpoint,
    },
    {
      title: "4 · Dispatch webhook",
      body: "Act on a scored lead: action is outreach, vip or quarantine. Returns the drafted message.",
      code: `${endpoint}/dispatch`,
    },
    {
      title: "5 · cURL",
      body: "Returns score, tier, signal breakdown, routing action and reasoning.",
      code: `curl -X POST ${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '{"leadName":"Mara Ellison","company":"Halvorsen","budgetK":320,"message":"Budget approved, need to go live this quarter."}'`,
    },
  ];

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed. Select the text manually.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="ip-embed-title"
            className="glass fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto rounded-l-[28px] p-6 sm:p-8"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8ff0ff]">For indie developers</p>
                <h2 id="ip-embed-title" className="text-gold-metal mt-2 font-display text-4xl font-light">
                  Embed Engine
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close embed drawer"
                className="flex size-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-8 space-y-6">
              {snippets.map((s) => (
                <div key={s.title}>
                  <p className="font-display text-xl text-white">{s.title}</p>
                  <p className="mt-1 text-[13px] text-white/55">{s.body}</p>
                  <div className="relative mt-3">
                    <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-ink/80 p-4 pr-12 font-mono text-[11.5px] leading-relaxed text-[#f3e2b8]">
                      {s.code}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copy(s.code)}
                      aria-label={`Copy ${s.title}`}
                      className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-lg border border-white/10 bg-ink/80 text-white/60 transition-colors hover:text-white"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
