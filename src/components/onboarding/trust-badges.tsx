"use client";

import { BadgeCheck, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useOnboardingCopy } from "./copy";

/**
 * Enterprise trust badges, each switched on by its own environment flag. They are claims about the product, so
 * every flag defaults OFF: set one to "true" only once the claim is actually true (the SOC 2 Type II report is
 * issued, the ZK enclave and AES-256-GCM encryption ship, PII scrubbing is in place). With no flag set, nothing
 * renders. NEXT_PUBLIC_ values are inlined at build time, so a change needs a rebuild / redeploy.
 *
 *   NEXT_PUBLIC_TRUST_SOC2_TYPE2=true
 *   NEXT_PUBLIC_TRUST_ZK_ENCLAVE=true
 *   NEXT_PUBLIC_TRUST_AES256_GCM=true
 *   NEXT_PUBLIC_TRUST_PII_SCRUBBED=true
 */
const FLAGS = {
  soc2: process.env.NEXT_PUBLIC_TRUST_SOC2_TYPE2 === "true",
  zk: process.env.NEXT_PUBLIC_TRUST_ZK_ENCLAVE === "true",
  aes: process.env.NEXT_PUBLIC_TRUST_AES256_GCM === "true",
  pii: process.env.NEXT_PUBLIC_TRUST_PII_SCRUBBED === "true",
};

const ICONS = { soc2: BadgeCheck, zk: ShieldCheck, aes: Lock, pii: EyeOff };

export function TrustBadges() {
  const t = useOnboardingCopy().trust;
  const on = (Object.keys(FLAGS) as (keyof typeof FLAGS)[]).filter((k) => FLAGS[k]);
  if (!on.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Trust">
      {on.map((k) => {
        const Icon = ICONS[k];
        return (
          <li key={k} className="flex items-center gap-1.5 rounded-full border border-os-cyan/30 bg-[var(--bloom-glass)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-os-cyan">
            <Icon className="size-3.5" /> {t[k]}
          </li>
        );
      })}
    </ul>
  );
}
