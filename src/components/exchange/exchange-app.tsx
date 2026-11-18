"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Info, KeyRound, RotateCcw } from "lucide-react";
import { BloomWordmark } from "@/components/bloom/logo";
import { LanguageSwitcher } from "@/components/bloom/language-switcher";
import type { OperatorView } from "@/lib/exchange/types";
import { CertificateInspector } from "./certificate-inspector";
import { useExchangeCopy } from "./copy";
import { BOOT_KEY, ExchangeBootSequence } from "./ExchangeBootSequence";
import { Ledger } from "./ledger";
import { MandatePanel } from "./mandate-panel";
import { TrafficRadar } from "./radar";
import { StressTest } from "./stress-test";
import { Badge } from "./ui";
import { useExchange } from "./use-exchange";

/** /exchange: the Bloom Exchange command surface. A standalone product, not a desk tab. */
export function ExchangeApp() {
  const t = useExchangeCopy();
  const x = useExchange();
  // The boot overlay is server-rendered; the layout's inline script hides it before paint when this session has seen it.
  const [boot, setBoot] = useState<number | null>(0);
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(BOOT_KEY) === "1";
    } catch {
      // No storage: play it.
    }
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) setBoot(null);
  }, []);
  const replay = () => {
    try {
      sessionStorage.removeItem(BOOT_KEY);
    } catch {
      // Replays anyway.
    }
    delete document.documentElement.dataset.xchBooted;
    setBoot((b) => (b ?? 0) + 1);
  };

  const [inspect, setInspect] = useState<OperatorView | null>(null);
  const open = useCallback(
    async (taskId: string) => {
      const v = await x.loadView(taskId);
      if (v) setInspect(v);
    },
    [x],
  );
  // Keep an open inspector in step with a decision taken from it.
  useEffect(() => {
    if (inspect && x.views[inspect.taskId] && x.views[inspect.taskId] !== inspect) setInspect(x.views[inspect.taskId]);
  }, [x.views, inspect]);

  const s = x.status;
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#07080c] text-white">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="bloom-noise h-full w-full" />
      </div>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-60" style={{ background: "radial-gradient(60% 100% at 50% 0%, color-mix(in srgb, var(--tier-accent) 10%, transparent), transparent)" }} aria-hidden />

      <div className="relative">
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07080c]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
            <Link href="/exchange" className="flex items-baseline gap-2.5">
              <BloomWordmark className="text-[22px]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-os-cyan">{t.header.product}</span>
            </Link>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-white/35 md:inline">{t.header.tagline}</span>
            <div className="ms-auto flex flex-wrap items-center gap-2">
              {s && (
                <>
                  <Badge tone={s.source === "live" ? "emerald" : "amber"}>{s.source === "live" ? t.header.live : t.header.simulated}</Badge>
                  <Badge tone={s.operator ? "cyan" : "muted"}>{s.operator ? t.header.operator : s.licensed ? t.header.production : t.header.sandbox}</Badge>
                  <span className="hidden items-center gap-1 font-mono text-[10px] text-white/35 lg:flex" title={t.header.key} dir="ltr">
                    <KeyRound className="size-3" /> {s.kid}
                  </span>
                </>
              )}
              <button type="button" onClick={replay} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/50 hover:text-white">
                <RotateCcw className="size-3" /> {t.header.replay}
              </button>
              <Link href="/desk" className="hidden rounded-md border border-white/10 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/50 hover:text-white sm:block">
                {t.header.desk}
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-6">
          {s && !s.licensed && (
            <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-100/80">
              <Info className="mt-0.5 size-3.5 shrink-0 text-amber-200" /> {t.notice.sandbox}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <TrafficRadar traffic={x.traffic} />
            <MandatePanel x={x} />
            <StressTest x={x} onInspect={open} />
            <Ledger x={x} onInspect={open} />
          </div>
        </main>
      </div>

      <CertificateInspector view={inspect} keys={x.card?.keys ?? []} onClose={() => setInspect(null)} />
      {boot !== null && <ExchangeBootSequence key={boot} onDone={() => setBoot(null)} />}
    </div>
  );
}
