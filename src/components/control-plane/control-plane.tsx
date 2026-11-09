"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Activity, Brain, KeyRound, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLicense } from "@/lib/license-context";
import { useLicensingCopy } from "./copy";
import { ConsensusTerminal } from "./consensus-terminal";
import { DatasetMonitor } from "./dataset-monitor";
import { EngineMatrix } from "./engine-matrix";
import { VectorTree } from "./vector-tree";
import { OpsKpis } from "./ops-kpis";
import { TopologyMap } from "./topology-map";
import { TraceStream } from "./trace-stream";
import { RoutingRules } from "./routing-rules";
import { PromptBench } from "./prompt-bench";
import { WorkspaceContext } from "./workspace-context";
import { ClusterNodeManager } from "@/components/experience/views/enterprise-ops";

type Tab = "operations" | "controls" | "intelligence";
const TAB_KEY = "bloom-control-plane-tab";
const TAB_ICONS = { operations: Activity, controls: SlidersHorizontal, intelligence: Brain };

/**
 * /desk/control-plane: the Neural Control Plane. The middleware has already verified the key's signature and its
 * accessNeuralControlPlane grant before this renders; this guard only covers a key removed in another tab.
 */
export function ControlPlane() {
  const c = useLicensingCopy().cp;
  const o = useLicensingCopy().ops;
  const [tab, setTab] = useState<Tab>("operations");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY) as Tab | null;
      if (saved === "operations" || saved === "controls" || saved === "intelligence") setTab(saved);
    } catch {
      // Starts on Operations.
    }
  }, []);
  const choose = (t: Tab) => {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      // Not remembered; fine.
    }
  };
  const { access, canAccessControlPlane } = useLicense();
  const router = useRouter();
  // Settings hydrate from local storage after the first render; judge access only once they have.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (ready && !canAccessControlPlane) router.replace("/desk");
  }, [ready, canAccessControlPlane, router]);

  if (!ready || !canAccessControlPlane || !access) return <main className="flex-1" aria-busy="true" />;

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="os-label bloom-glow">{c.kicker}</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[36px]">{c.title}</h1>
          <p className="bloom-detail mt-1.5 max-w-3xl text-[14px] leading-relaxed text-white/55">{c.lede}</p>
        </div>
        <dl className="bloom-glass grid grid-cols-2 gap-x-5 gap-y-1.5 rounded-xl px-4 py-3 font-mono text-[10.5px] sm:grid-cols-4">
          <div>
            <dt className="text-[9px] uppercase tracking-[0.18em] text-white/35">{c.key.holder}</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-white/85">
              <KeyRound className="size-3 text-os-cyan" /> {access.holderName}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-[0.18em] text-white/35">{c.key.keyId}</dt>
            <dd className="mt-0.5 max-w-40 truncate text-white/70" title={access.keyId}>
              {access.keyId}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-[0.18em] text-white/35">{c.key.expires}</dt>
            <dd className="mt-0.5 text-white/70">{access.expiresAt ? new Date(access.expiresAt).toLocaleDateString() : c.key.lifetime}</dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-[0.18em] text-white/35">{c.key.theme}</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-white/70">
              <span className="size-2.5 rounded-full" style={{ background: access.themeConfig.accentColor, boxShadow: `0 0 10px ${access.themeConfig.accentColor}` }} />
              {access.themeConfig.accentColor} · {access.themeConfig.density}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <dt className="sr-only">{c.key.signature}</dt>
            <dd className="flex min-w-0 items-center gap-1.5 text-os-emerald/80" title={access.signature}>
              <ShieldCheck className="size-3 shrink-0" />
              <span className="shrink-0">{c.key.edge}</span>
              <span className="truncate text-white/35">{access.signature}</span>
            </dd>
          </div>
        </dl>
      </div>

      <div role="tablist" aria-label={c.title} className="bloom-glass mt-6 inline-flex rounded-xl p-1">
        {(["operations", "controls", "intelligence"] as const).map((t) => {
          const Icon = TAB_ICONS[t];
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => choose(t)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-all duration-300", tab === t ? "bloom-edge-glow bg-os-cyan/[0.08] text-os-cyan" : "border border-transparent text-white/50 hover:text-white")}
            >
              <Icon className="size-3.5" /> {o.tabs[t]}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="mt-4 grid grid-cols-1 xl:grid-cols-2" style={{ gap: "var(--bloom-gap)" }}>
          {tab === "operations" && (
            <>
              <div className="xl:col-span-2">
                <OpsKpis />
              </div>
              <TopologyMap />
              <div className="xl:col-span-2">
                <TraceStream />
              </div>
              <EngineMatrix />
            </>
          )}
          {tab === "controls" && (
            <>
              <RoutingRules />
              <PromptBench />
              <ClusterNodeManager />
              <WorkspaceContext />
            </>
          )}
          {tab === "intelligence" && (
            <>
              <ConsensusTerminal />
              <VectorTree />
              <div className="xl:col-span-2">
                <DatasetMonitor />
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
