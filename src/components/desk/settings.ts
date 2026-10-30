"use client";

import { useSyncExternalStore } from "react";
import type { EngineKey } from "@/components/bloom/command/engines";
import type { ShiftMode } from "@/components/bloom/shift-plan";
import type { CalibrationInput } from "@/lib/engines/calibration";
import type { Tier } from "@/lib/license/tiers";
import type { Role } from "./rbac";

/**
 * The workspace's local state: license, gateway credentials, branding, team and roles, shift defaults,
 * per-engine calibrations, the audit log and onboarding progress. Persists across reloads (and desktop app
 * restarts). Nothing here reaches the server except as headers/body on the requests that use it.
 *
 * Persistence: "device" keeps settings in localStorage across restarts; "session" keeps them in sessionStorage
 * so closing the window (or the desktop app) forgets them, keys included. The choice itself always lives in
 * localStorage, since it isn't sensitive.
 */

export type Persistence = "device" | "session";
export type ShiftDefault = "clock" | ShiftMode;

/** Gateway credentials. Anthropic and OpenRouter drive the engine runtime; the rest are stored for integrations. */
export type Credentials = {
  anthropic: string;
  openrouter: string;
  openai: string;
  vectorDbUrl: string;
  vectorDbKey: string;
  customUrl: string;
  customKey: string;
};

/** A license the server has verified: what the desk shows and gates on (the server re-verifies every run). */
export type LicenseInfo = { tier: Exclude<Tier, "evaluation">; org: string; expiresAt: string | null; issuedAt: string; dev: boolean; verifiedAt: number };

export type Member = { id: string; name: string; email: string; role: Role };

export type AuditKind = "license" | "settings" | "credentials" | "run" | "approval" | "member" | "calibration" | "system";
export type AuditEntry = { id: number; at: number; kind: AuditKind; actor: string; message: string };

export type DeskSettings = {
  keys: Credentials;
  licenseKey: string;
  license: LicenseInfo | null;
  branding: { orgName: string; logo: string | null };
  members: Member[];
  activeMemberId: string;
  onboarded: boolean;
  shiftDefault: ShiftDefault;
  /** Light the Surge shift for the duration of every run, then return to the default. */
  surgeOnRun: boolean;
  calibrations: Partial<Record<EngineKey, CalibrationInput>>;
  audit: AuditEntry[];
};

const OWNER: Member = { id: "owner", name: "Workspace Owner", email: "", role: "owner" };

export const DEFAULT_SETTINGS: DeskSettings = {
  keys: { anthropic: "", openrouter: "", openai: "", vectorDbUrl: "", vectorDbKey: "", customUrl: "", customKey: "" },
  licenseKey: "",
  license: null,
  branding: { orgName: "", logo: null },
  members: [OWNER],
  activeMemberId: OWNER.id,
  onboarded: false,
  shiftDefault: "clock",
  surgeOnRun: true,
  calibrations: {},
  audit: [],
};

const AUDIT_CAP = 400;

const DATA_KEY = "bloom-desk-settings";
const MODE_KEY = "bloom-desk-persistence";

let cache: DeskSettings | null = null;
let modeCache: Persistence | null = null;
const listeners = new Set<() => void>();

// Storage can throw (private mode, blocked site data); the desk then runs on defaults for this page view.
function storage(kind: Persistence): Storage | null {
  try {
    return kind === "device" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readMode(): Persistence {
  if (modeCache) return modeCache;
  try {
    modeCache = window.localStorage.getItem(MODE_KEY) === "session" ? "session" : "device";
  } catch {
    modeCache = "device";
  }
  return modeCache;
}

function read(): DeskSettings {
  if (cache) return cache;
  try {
    const raw = storage(readMode())?.getItem(DATA_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<DeskSettings>) : {};
    const members = Array.isArray(parsed.members) && parsed.members.length ? parsed.members : DEFAULT_SETTINGS.members;
    cache = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keys: { ...DEFAULT_SETTINGS.keys, ...parsed.keys },
      branding: { ...DEFAULT_SETTINGS.branding, ...parsed.branding },
      members,
      activeMemberId: members.some((m) => m.id === parsed.activeMemberId) ? parsed.activeMemberId! : members[0].id,
      calibrations: parsed.calibrations ?? {},
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
    };
  } catch {
    cache = DEFAULT_SETTINGS;
  }
  return cache;
}

function write(next: DeskSettings) {
  cache = next;
  try {
    storage(readMode())?.setItem(DATA_KEY, JSON.stringify(next));
  } catch {
    // Kept in memory for this session.
  }
  listeners.forEach((l) => l());
}

export function updateSettings(patch: Partial<DeskSettings> | ((s: DeskSettings) => Partial<DeskSettings>)) {
  const cur = read();
  write({ ...cur, ...(typeof patch === "function" ? patch(cur) : patch) });
}

export function setCalibration(engine: EngineKey, c: CalibrationInput | null) {
  updateSettings((s) => {
    const calibrations = { ...s.calibrations };
    if (c) calibrations[engine] = c;
    else delete calibrations[engine];
    return { calibrations };
  });
}

/** Moves the settings to the other storage and wipes them from the old one. */
export function setPersistence(mode: Persistence) {
  const cur = read();
  const old = readMode();
  if (old === mode) return;
  try {
    storage(old)?.removeItem(DATA_KEY);
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Falls through to the in-memory mode below.
  }
  modeCache = mode;
  write(cur);
}

export function clearSettings() {
  for (const kind of ["device", "session"] as const) {
    try {
      storage(kind)?.removeItem(DATA_KEY);
    } catch {
      // Nothing stored there.
    }
  }
  write(DEFAULT_SETTINGS);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useDeskSettings() {
  const settings = useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS);
  const persistence = useSyncExternalStore(subscribe, readMode, () => "device" as Persistence);
  return { settings, persistence };
}

/** Request headers carrying the operator's own runtime keys; empty when none are set. */
export function keyHeaders(keys: Pick<Credentials, "anthropic" | "openrouter">): Record<string, string> {
  return {
    ...(keys.anthropic.trim() && { "x-anthropic-key": keys.anthropic.trim() }),
    ...(keys.openrouter.trim() && { "x-openrouter-key": keys.openrouter.trim() }),
  };
}

/** Everything a run request carries: own keys plus the license the server verifies. */
export function requestHeaders(s: DeskSettings): Record<string, string> {
  return { ...keyHeaders(s.keys), ...(s.licenseKey && { "x-bloom-license": s.licenseKey }) };
}

export const activeMember = (s: DeskSettings) => s.members.find((m) => m.id === s.activeMemberId) ?? s.members[0];

/** Appends to the workspace audit log, attributed to the member currently acting. */
export function audit(kind: AuditKind, message: string) {
  updateSettings((s) => {
    const last = s.audit.at(-1);
    return { audit: [...s.audit, { id: (last?.id ?? 0) + 1, at: Date.now(), kind, actor: activeMember(s).name, message }].slice(-AUDIT_CAP) };
  });
}
