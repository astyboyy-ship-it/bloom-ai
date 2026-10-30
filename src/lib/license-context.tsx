"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { EngineKey } from "@/components/bloom/command/engines";
import { audit, updateSettings, useDeskSettings, type LicenseInfo } from "@/components/desk/settings";
import { TIER_ENGINES, TIER_INFO, type Tier } from "@/lib/license/tiers";

/**
 * The workspace's Client License. The key lives in the persisted desk settings; the server verifies it on
 * activation, again whenever the desk loads (so a revoked or expired key falls back to Evaluation), and on
 * every engine run. Gating in the UI follows this context; enforcement is the run API's.
 */

type ActivateResult = { ok: true; info: LicenseInfo } | { ok: false; message: string };

type LicenseContextValue = {
  tier: Tier;
  info: LicenseInfo | null;
  engines: EngineKey[];
  isUnlocked: (engine: EngineKey) => boolean;
  /** Validates a key with the server and, if it's good, makes it the workspace's license. */
  activate: (key: string) => Promise<ActivateResult>;
  deactivate: () => void;
  /** Development-only tier switcher: the server mints a key for the tier, which is then activated. */
  devIssue: (tier: Exclude<Tier, "evaluation">) => Promise<ActivateResult>;
  devAvailable: boolean;
  checking: boolean;
};

const LicenseContext = createContext<LicenseContextValue | null>(null);

type LicenseResponse = { key: string; tier: LicenseInfo["tier"]; org: string; expiresAt: string | null; issuedAt: string; dev: boolean };

async function postLicense(body: unknown): Promise<{ ok: true; data: LicenseResponse } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/license", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as (LicenseResponse & { error?: { message?: string } }) | null;
    if (!res.ok || !json || json.error) return { ok: false, message: json?.error?.message ?? `License server returned ${res.status}.` };
    return { ok: true, data: json };
  } catch {
    return { ok: false, message: "Couldn't reach the license server." };
  }
}

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useDeskSettings();
  const [devAvailable, setDevAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const revalidated = useRef(false);

  const apply = useCallback((d: LicenseResponse): LicenseInfo => {
    const info: LicenseInfo = { tier: d.tier, org: d.org, expiresAt: d.expiresAt, issuedAt: d.issuedAt, dev: d.dev, verifiedAt: Date.now() };
    updateSettings({ licenseKey: d.key, license: info });
    return info;
  }, []);

  const activate = useCallback(
    async (key: string): Promise<ActivateResult> => {
      setChecking(true);
      const r = await postLicense({ key: key.trim() });
      setChecking(false);
      if (!r.ok) {
        audit("security", `License key rejected at activation: ${r.message}`);
        return r;
      }
      const info = apply(r.data);
      audit("license", `Activated ${TIER_INFO[info.tier].label} for ${info.org}${info.dev ? " (development key)" : ""}`);
      return { ok: true, info };
    },
    [apply],
  );

  const devIssue = useCallback(
    async (tier: Exclude<Tier, "evaluation">): Promise<ActivateResult> => {
      setChecking(true);
      const r = await postLicense({ dev: tier, org: settings.branding.orgName || "Development Workspace" });
      setChecking(false);
      if (!r.ok) return r;
      const info = apply(r.data);
      audit("license", `Switched to ${TIER_INFO[tier].label} with the development tier switcher`);
      return { ok: true, info };
    },
    [apply, settings.branding.orgName],
  );

  const deactivate = useCallback(() => {
    updateSettings({ licenseKey: "", license: null });
    audit("license", "Removed the license; the workspace is back in Evaluation");
  }, []);

  // Once per load: is the dev switcher available, and is the stored key still good?
  useEffect(() => {
    fetch("/api/license", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ devLicenses: boolean }>) : null))
      .then((d) => setDevAvailable(Boolean(d?.devLicenses)))
      .catch(() => setDevAvailable(false));
  }, []);
  useEffect(() => {
    if (revalidated.current || !settings.licenseKey) return;
    revalidated.current = true;
    postLicense({ key: settings.licenseKey }).then((r) => {
      if (r.ok) apply(r.data);
      // Only a definite rejection clears the license; a network blip keeps the last verified state.
      else if (!/reach/.test(r.message)) {
        updateSettings({ licenseKey: "", license: null });
        audit("license", `License no longer valid: ${r.message}`);
      }
    });
  }, [settings.licenseKey, apply]);

  const value = useMemo<LicenseContextValue>(() => {
    const tier: Tier = settings.license?.tier ?? "evaluation";
    const engines = TIER_ENGINES[tier];
    return { tier, info: settings.license, engines, isUnlocked: (k) => engines.includes(k), activate, deactivate, devIssue, devAvailable, checking };
  }, [settings.license, activate, deactivate, devIssue, devAvailable, checking]);

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error("useLicense must be used inside <LicenseProvider>");
  return ctx;
}
