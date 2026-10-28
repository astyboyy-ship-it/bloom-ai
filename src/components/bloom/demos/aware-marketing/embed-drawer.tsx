"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Code2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealInput, DealResult } from "@/lib/aware-marketing/engine";
import { CopyButton } from "./copy-button";

const TABS = ["Script tag", "REST · cURL", "Webhook", "JSON payload"] as const;
type Tab = (typeof TABS)[number];

const EXAMPLE_RESULT: DealResult = {
  dealScore: 37,
  action: "COUNTER",
  suggestedCounterPrice: 12250,
  counterEmailDraft: "Subject: Re: Lumora Skincare × Ava Laurent: partnership proposal\n\nHi Lumora Skincare team, …",
  keyTermsAnalysis: ["Extended payment terms: Payment Net 30 with a 50% deposit on signature."],
  reasoning: "Offer of $5,500 covers 49% of the $11,125 floor …",
};

/** Slide-over with copy-ready integration snippets for talent managers and indie developers. */
export function EmbedDrawer({ open, onClose, sample, result }: { open: boolean; onClose: () => void; sample: DealInput; result: DealResult | null }) {
  const [tab, setTab] = useState<Tab>("Script tag");
  const [origin, setOrigin] = useState("https://workflow-architect-two.vercel.app");

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const payload = { ...sample, emailText: sample.emailText.slice(0, 140) + (sample.emailText.length > 140 ? "…" : "") };
  const body = JSON.stringify(payload, null, 2);

  const snippets: Record<Tab, { note: string; code: string }> = {
    "Script tag": {
      note: "Drop into any creator portal or CRM page. Exposes window.AwareMarketing.negotiate() and fires an aware:result DOM event.",
      code: `<script src="${origin}/embed/aware-marketing.js" defer></script>
<script>
  window.addEventListener("aware:result", (e) => {
    console.log(e.detail.action, e.detail.suggestedCounterPrice);
  });

  window.addEventListener("load", async () => {
    const verdict = await AwareMarketing.negotiate(${body.replace(/\n/g, "\n    ")});
    document.querySelector("#deal-status").textContent =
      verdict.action + " · $" + verdict.suggestedCounterPrice.toLocaleString();
  });
</script>`,
    },
    "REST · cURL": {
      note: "POST JSON to the serverless route. CORS is open, so browsers and backends can both call it (20 requests/min per IP).",
      code: `curl -X POST ${origin}/api/aware-marketing \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload).replace(/'/g, "'\\''")}'`,
    },
    Webhook: {
      note: "Add callbackUrl (public https only) and the engine POSTs each evaluated deal to your CRM.",
      code: `// Request
POST ${origin}/api/aware-marketing
${JSON.stringify({ ...payload, callbackUrl: "https://crm.example.com/hooks/aware-deal" }, null, 2)}

// Delivered to callbackUrl
{
  "event": "deal.evaluated",
  "evaluatedAt": "2026-10-24T12:00:00.000Z",
  "engine": "groq:llama-3.3-70b-versatile",
  "input": { …validated request… },
  "result": { …response contract… }
}`,
    },
    "JSON payload": {
      note: "Strict response contract. usageRights: organic | paid30 | paid90 | whitelist | perpetual. tone: warm | direct | playful.",
      code: `// Request body
${body}

// Response ${result ? "(from your last negotiation)" : "(example)"}
${JSON.stringify(result ?? EXAMPLE_RESULT, null, 2)}`,
    },
  };
  const current = snippets[tab];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[70] bg-ink/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="embed-title"
            className="glass fixed inset-y-0 right-0 z-[71] flex w-full max-w-xl flex-col gap-5 overflow-y-auto rounded-l-[28px] p-6 sm:p-8"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8ff0ff]">Developer export</p>
                <h2 id="embed-title" className="text-gold-metal mt-2 font-display text-4xl font-light">
                  Embed Engine
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close embed drawer"
                className="inline-flex size-10 items-center justify-center rounded-xl text-white/60 hover:bg-white/5 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div role="tablist" className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
                    tab === t ? "border-[#f0d59a]/60 bg-[#f0d59a]/15 text-[#f3e2b8]" : "border-white/10 text-white/55 hover:text-white",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <p className="text-[14px] leading-relaxed text-white/70">{current.note}</p>

            <div className="relative rounded-2xl border border-[#f0d59a]/15 bg-ink/80">
              <CopyButton text={current.code} className="absolute right-3 top-3" />
              <pre className="overflow-x-auto p-5 pt-14 font-mono text-[12px] leading-relaxed text-[#f3e2b8]/90">
                <code>{current.code}</code>
              </pre>
            </div>

            <div className="mt-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-[11px] text-white/60">
              <Code2 className="size-4 shrink-0 text-[#8ff0ff]" />
              <span className="break-all">POST {origin}/api/aware-marketing</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
