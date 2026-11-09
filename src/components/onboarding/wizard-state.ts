import type { BloomLicensePayload } from "@/lib/licensing/types";

/** Which guided setup a key gets after its unlock reveal; eval keys have the in-desk guided tour instead. */
export type WizardKind = "operator" | "agency" | "enterprise" | "demo";

export function wizardFor(access: BloomLicensePayload | null): WizardKind | null {
  switch (access?.role) {
    case "operator":
    case "agency":
    case "enterprise":
      return access.role;
    case "demo_partner":
      return "demo";
    default:
      return null;
  }
}

const KEY = "bloom-tier-wizard-done";

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

/** Setup is per key: a new key (even of the same role) gets its own guided setup once. */
export const isWizardDone = (keyId: string) => read().includes(keyId);

export function markWizardDone(keyId: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...read().filter((k) => k !== keyId), keyId].slice(-50)));
  } catch {
    // Not remembered: the wizard may show again, which is harmless.
  }
}

/**
 * UI state that belongs to one key, not to the workspace. When a different key is activated it is cleared so
 * the new key starts clean: the enterprise domain choice, cluster cordon/drain state, the eval tour position and
 * the demo's last architecture. Agency client workspaces are tenant data and are kept; per-key setup completion
 * is tracked by keyId, so a new key always gets its own guided setup.
 */
const KEY_SCOPED = ["bloom-enterprise-domain", "bloom-enterprise-clusters", "bloom-eval-tour", "bloom-demo-target"];
const LAST_KEY = "bloom-last-access-key";

/** Call on every explicit key activation. Returns true when the key differs from the last one activated. */
export function onKeyActivated(keyId: string | null): boolean {
  try {
    const last = localStorage.getItem(LAST_KEY);
    if (last === (keyId ?? "")) return false;
    for (const k of KEY_SCOPED) localStorage.removeItem(k);
    localStorage.setItem(LAST_KEY, keyId ?? "");
    return true;
  } catch {
    return false;
  }
}

/** Fired by the license context on an explicit activation of an access key (not on silent revalidation). */
export const UNLOCK_EVENT = "bloom:key-unlock";
