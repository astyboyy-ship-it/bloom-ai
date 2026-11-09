"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLicense } from "@/lib/license-context";
import { OsHome } from "@/components/os/os-home";
import { DemoEngineMode } from "@/components/demo-engine/demo-engine-mode";
import { EngineMatrix } from "@/components/control-plane/engine-matrix";
import { AgencyDeck, EnterpriseDeck, OperatorDeck } from "@/components/modes/role-decks";
import { useExperienceCopy } from "./copy";
import { resolveExperience, type ExperienceId } from "./experiences";
import { AgencyRevenueHub } from "./views/agency-revenue";
import { ClusterNodeManager, Soc2Board } from "./views/enterprise-ops";
import { SovereignSandbox } from "./views/eval-sandbox";
import { ClientDiagnostic } from "./views/demo-diagnostic";
import { DawAudioOps } from "./views/demo-music";
import { QuantRiskTerminal } from "./views/demo-trading";
import { AutomationCanvas } from "./views/demo-coreops";

/** Page-width wrapper for an experience's own panels, above the shared desk or demo surface. */
function Section({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto grid w-full max-w-[1500px] gap-[var(--bloom-gap)] px-4 pt-6 sm:px-6">{children}</div>;
}

/** Each experience: its tailored workspace on top, then the surface it shares (the desk, or the demo engine). */
const VIEWS: Record<ExperienceId, () => React.ReactNode> = {
  standard: () => <OsHome />,
  operator: () => (
    <>
      <OperatorDeck />
      <Section>
        <EngineMatrix />
      </Section>
      <OsHome />
    </>
  ),
  agency: () => (
    <>
      <AgencyDeck />
      <Section>
        <AgencyRevenueHub />
      </Section>
      <OsHome />
    </>
  ),
  enterprise: () => (
    <>
      <Section>
        <div className="grid gap-[var(--bloom-gap)] xl:grid-cols-2">
          <ClusterNodeManager />
          <Soc2Board />
        </div>
      </Section>
      <EnterpriseDeck />
      <OsHome />
    </>
  ),
  eval: () => (
    <>
      <Section>
        <SovereignSandbox />
      </Section>
      <OsHome />
    </>
  ),
  demo_general: () => (
    <>
      <Section>
        <ClientDiagnostic />
      </Section>
      <DemoEngineMode />
    </>
  ),
  demo_music: () => (
    <>
      <Section>
        <DawAudioOps />
      </Section>
      <DemoEngineMode />
    </>
  ),
  demo_trading: () => (
    <>
      <Section>
        <QuantRiskTerminal />
      </Section>
      <DemoEngineMode />
    </>
  ),
  demo_coreops: () => (
    <>
      <Section>
        <AutomationCanvas />
      </Section>
      <DemoEngineMode />
    </>
  ),
};

/**
 * /desk's experience router: resolves the active key (role + demoTarget) to one workspace experience and renders
 * it, cross-fading between experiences when the key changes. TierThemeProvider morphs the colors in the same
 * beat, so a key switch reads as one transition. The first render after load is not animated (settings hydrate
 * from storage after the server render), only real switches are.
 */
export function ExperienceRouter() {
  const { access } = useLicense();
  const experience = resolveExperience(access);
  const names = useExperienceCopy();
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) return <div className="min-h-[60vh] flex-1" aria-busy="true" />;

  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
    : {
        initial: { opacity: 0, y: 14, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -10, filter: "blur(4px)" },
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={experience} data-experience={experience} className="flex min-w-0 flex-1 flex-col" {...motionProps}>
        {experience !== "standard" && (
          <div className="mx-auto w-full max-w-[1500px] px-4 pt-5 sm:px-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-os-cyan/30 bg-[var(--bloom-glass)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
              <span className="size-1.5 rounded-full bg-os-cyan" style={{ boxShadow: "0 0 10px var(--tier-glow)" }} />
              {names.experience} <span className="bloom-glow">{names.names[experience]}</span>
            </span>
          </div>
        )}
        {VIEWS[experience]()}
      </motion.div>
    </AnimatePresence>
  );
}
