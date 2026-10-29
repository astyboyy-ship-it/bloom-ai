"use client";

import { useSyncExternalStore } from "react";
import type { EngineKey } from "@/components/bloom/command/engines";
import type { ShiftMode } from "@/components/bloom/shift-plan";
import type { CalibrationInput } from "@/lib/engines/calibration";

/**
 * The desk's local settings: provider keys, shift defaults, persistence, and per-engine calibrations.
 * Nothing here reaches the server except as headers/body on the requests that use it.
 *
 * Persistence: "device" keeps settings in localStorage across restarts; "session" keeps them in sessionStorage
 * so closing the window (or the desktop app) forgets them, keys included. The choice itself always lives in
 * localStorage, since it isn't sensitive.
 */

export type Persistence = "device" | "session";
export type ShiftDefault = "clock" | ShiftMode;

export type DeskSettings = {
  keys: { anthropic: string; openrouter: string };
  shiftDefault: ShiftDefault;
  /** Light the Surge shift for the duration of every run, then return to the default. */
  surgeOnRun: boolean;
  calibrations: Partial<Record<EngineKey, CalibrationInput>>;
};

export const DEFAULT_SETTINGS: DeskSettings = { keys: { anthropic: "", openrouter: "" }, shiftDefault: "clock", surgeOnRun: true, calibrations: {} };

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
    cache = { ...DEFAULT_SETTINGS, ...parsed, keys: { ...DEFAULT_SETTINGS.keys, ...parsed.keys }, calibrations: parsed.calibrations ?? {} };
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

/** Request headers carrying the operator's own keys; empty when none are set. */
export function keyHeaders(keys: DeskSettings["keys"]): Record<string, string> {
  return {
    ...(keys.anthropic.trim() && { "x-anthropic-key": keys.anthropic.trim() }),
    ...(keys.openrouter.trim() && { "x-openrouter-key": keys.openrouter.trim() }),
  };
}
