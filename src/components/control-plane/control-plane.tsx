"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useLicense } from "@/lib/license-context";
import { useLicensingCopy } from "./copy";
import { ConsensusTerminal } from "./consensus-terminal";
import { DatasetMonitor } from "./dataset-monitor";
import { EngineMatrix } from "./engine-matrix";
import { VectorTree } from "./vector-tree";

/**
 * /desk/control-plane: the Neural Control Plane. The middleware has already verified the key's signature and its
 * accessNeuralControlPlane grant before this renders; this guard only covers a key removed in another tab.
 */
export function ControlPlane() {
  const c = useLicensingCopy().cp;
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

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2" style={{ gap: "var(--bloom-gap)" }}>
        <EngineMatrix />
        <ConsensusTerminal />
        <VectorTree />
        <div className="xl:col-span-2">
          <DatasetMonitor />
        </div>
      </div>
    </main>
  );
}
