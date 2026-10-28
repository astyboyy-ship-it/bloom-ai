"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Snippet = { title: string; body: string; code: string };
type Tab = "embed" | "api" | "webhooks";

export function DeveloperDrawer({ open, onClose, mode }: { open: boolean; onClose: () => void; mode: "live" | "simulated" }) {
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [tab, setTab] = useState<Tab>("embed");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const api = `${origin}/api/intent-pulse`;
  const tabs: Record<Tab, { label: string; snippets: Snippet[] }> = {
    embed: {
      label: "Embed",
      snippets: [
        {
          title: "Drop-in script tag",
          body: "Scores any form on submit. Fields named name, company, budget and message are read automatically. VIPs can be redirected straight to your calendar.",
          code: `<script src="${origin}/embed/intentpulse.js"\n  data-form="#lead-form"\n  data-vip-redirect="https://cal.com/you/vip"\n  defer></script>`,
        },
        {
          title: "Listen for the verdict",
          body: "The form receives an intentpulse:scored event with the full result.",
          code: `document.querySelector("#lead-form")\n  .addEventListener("intentpulse:scored", (e) => {\n    const { score, tier, action } = e.detail;\n    console.log(score, tier, action.title);\n  });`,
        },
        {
          title: "Score from your own code",
          body: "The script also exposes a promise-based scorer.",
          code: `const result = await window.IntentPulse.score({\n  leadName: "Mara Ellison",\n  company: "Halvorsen Logistics",\n  budgetK: 320,\n  message: "Budget approved, need to go live this quarter.",\n});`,
        },
      ],
    },
    api: {
      label: "REST · cURL",
      snippets: [
        {
          title: "Score one lead",
          body: "Returns score, tier, the four-signal breakdown, routing action and reasoning.",
          code: `curl -X POST ${api} \\\n  -H "Content-Type: application/json" \\\n  -d '{"leadName":"Mara Ellison","company":"Halvorsen","budgetK":320,"message":"Budget approved, need to go live this quarter."}'`,
        },
        {
          title: "Trigger a global radar sweep",
          body: `Runs the Apify Actors when USE_LIVE_APIFY=true, else the simulator. This server is in ${mode} mode.`,
          code: `curl -X POST ${api}/sweep \\\n  -H "Content-Type: application/json" \\\n  -d '{"keywords":["lead routing","AI agency"],"platforms":["x","instagram","tiktok","reddit"],"perPlatform":25}'`,
        },
        {
          title: "Dispatch an action",
          body: "action is outreach, vip or quarantine. Returns the drafted message (Groq when configured, else template).",
          code: `curl -X POST ${api}/dispatch \\\n  -H "Content-Type: application/json" \\\n  -d '{"action":"vip","score":92,"tier":"VIP","persona":"buyer","channel":"Twitter/X","lead":{"leadName":"Mara Ellison","company":"Halvorsen","budgetK":320,"message":"Budget approved."}}'`,
        },
      ],
    },
    webhooks: {
      label: "Webhooks",
      snippets: [
        {
          title: "Push your own signals",
          body: "Forms, CRMs, Zapier, Make or n8n. Up to 100 signals per request, scored and returned.",
          code: `curl -X POST ${api}/webhook \\\n  -H "Content-Type: application/json" \\\n  -d '{"signals":[{"platform":"webhook","text":"Need a pilot next week, $120k budget approved.","author":{"name":"Leo Okafor","company":"Lumen Labs","title":"VP Sales"}}]}'`,
        },
        {
          title: "Apify run webhook · 1. server env",
          body: "Dataset reads need a shared secret so the public endpoint can't read your Apify datasets.",
          code: `APIFY_API_TOKEN="apify_api_…"\nINTENTPULSE_WEBHOOK_SECRET="a-long-random-string"\nUSE_LIVE_APIFY="true"`,
        },
        {
          title: "Apify run webhook · 2. Actor integration",
          body: "Apify Console → your Actor or task → Integrations → HTTP webhook. Event: ACTOR.RUN.SUCCEEDED. Keep the default payload template.",
          code: `${api}/webhook?platform=x&secret=a-long-random-string`,
        },
      ],
    },
  };

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
          <motion.div className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cc-dev-title"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-white/[0.08] bg-[#111015] p-5 sm:p-7"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/50">Embed & developer</p>
                <h2 id="cc-dev-title" className="mt-1 text-2xl font-semibold text-white">
                  Wire it into anything
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close developer drawer"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 flex gap-1 rounded-full border border-white/10 bg-ink/50 p-1" role="tablist">
              {(Object.keys(tabs) as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={t === tab}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                    t === tab ? "bg-[#f3e2b8] text-[#1a0f05]" : "text-white/55 hover:text-white",
                  )}
                >
                  {tabs[t].label}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-6">
              {tabs[tab].snippets.map((s) => (
                <div key={s.title}>
                  <p className="text-[15px] font-semibold text-white">{s.title}</p>
                  <p className="mt-1 text-[13px] text-white/55">{s.body}</p>
                  <div className="relative mt-3">
                    <pre className="overflow-x-auto rounded-lg border border-white/[0.08] bg-black/40 p-4 pr-12 font-mono text-[11.5px] leading-relaxed text-[#f3e2b8]">{s.code}</pre>
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
