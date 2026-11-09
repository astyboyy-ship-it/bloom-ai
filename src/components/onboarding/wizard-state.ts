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

/** Fired by the license context on an explicit activation of an access key (not on silent revalidation). */
export const UNLOCK_EVENT = "bloom:key-unlock";
