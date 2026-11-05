"use client";

import { useLicense } from "@/lib/license-context";
import { OsHome } from "@/components/os/os-home";
import { DemoEngineMode } from "@/components/demo-engine/demo-engine-mode";
import { AgencyDeck, EnterpriseDeck, OperatorDeck } from "./role-decks";

/**
 * /desk morphs with the access key's role:
 *  - operator      live telemetry console + Control Plane entry above the desk (setup wizard bypassed)
 *  - agency        multi-tenant client switcher and seat / node allocation above the desk
 *  - enterprise    three-engine domain wizard with an industry-tailored feed above the desk
 *  - demo_partner  Demo Engine Mode replaces the desk entirely (sandbox only)
 *  - eval          the standard desk; the shell shows the read-only banner and the server refuses runs
 * Tier keys and Evaluation get the standard desk.
 */
export function DeskHome() {
  const { role } = useLicense();
  if (role === "demo_partner") return <DemoEngineMode />;
  return (
    <>
      {role === "operator" && <OperatorDeck />}
      {role === "agency" && <AgencyDeck />}
      {role === "enterprise" && <EnterpriseDeck />}
      <OsHome />
    </>
  );
}
