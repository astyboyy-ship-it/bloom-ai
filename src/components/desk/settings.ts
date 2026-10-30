"use client";

import { useSyncExternalStore } from "react";
import type { EngineKey } from "@/components/bloom/command/engines";
import type { ShiftMode } from "@/components/bloom/shift-plan";
import type { CalibrationInput } from "@/lib/engines/calibration";
import type { Tier } from "@/lib/license/tiers";
import { redactSecrets } from "@/lib/security/injection";
import { sha256 } from "@/lib/sha256";
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

export type AuditKind = "license" | "settings" | "credentials" | "run" | "approval" | "member" | "calibration" | "system" | "security";
/**
 * An audit entry. `hash` chains it to the entry before (SHA-256 over the previous hash and this entry's fields),
 * so editing or deleting any past entry breaks verification from that point on. Entries written before the
 * chain existed have no hash and are reported as unchained.
 */
export type AuditEntry = { id: number; at: number; kind: AuditKind; actor: string; message: string; env?: string; hash?: string };

/** A deployment environment the workspace operates in; runs and audit entries are tagged with it. */
export type Environment = { id: string; name: string; region: string };

/** A custom pipeline from the builder: engines chained left to right between an input and an output. */
export type PipelineNode = { id: string; kind: "input" | "engine" | "output"; engine?: EngineKey; x: number; y: number };
export type Pipeline = { id: string; name: string; nodes: PipelineNode[]; edges: [string, string][]; updatedAt: number };

/** Governance for one architecture product, applied to every engine in its stack when it runs. */
export type ArchitectureRules = {
  runsPerHour: number;
  budgetTokens: number;
  model: string;
  fallbackModel: string;
  approvalThresholdUsd: number;
  memoryRuns: number;
  requireApprovalAlways: boolean;
};

export type RunRecord = {
  runId: string;
  at: number;
  kind: "engine" | "architecture" | "pipeline";
  /** Engine key, architecture id or pipeline id. */
  target: string;
  label: string;
  command: string;
  ok: boolean;
  ms: number;
  tokens: { input: number; output: number };
  summary: string;
  env: string;
  /** The executive brief (Markdown) for the deliverables shelf; kept on the latest runs only. */
  brief?: string;
};

/**
 * An action a run raised for human approval. Decisions are shared by the brief panel and the Home approval
 * bay; an approved action that a person must perform becomes a task until it's marked done.
 */
export type Approval = {
  id: string;
  runId: string;
  source: string;
  engine: EngineKey;
  title: string;
  detail: string;
  priority: string;
  owner: string;
  at: number;
  status: "pending" | "approved" | "rejected";
  by?: string;
  decidedAt?: number;
  done?: boolean;
};

/** The client engagement this workspace is running: shown in Home's context header. */
export type Project = { client: string; name: string; scope: string };

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
  environments: Environment[];
  activeEnvId: string;
  /** Executive presentation mode: hides logs, JSON and code; shows large metrics and clean animations. */
  demoMode: boolean;
  pipelines: Pipeline[];
  architectureRules: Record<string, ArchitectureRules>;
  runs: RunRecord[];
  approvals: Approval[];
  project: Project;
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
  environments: [
    { id: "alpha-1", name: "Enterprise Node: Alpha-1", region: "us-east" },
    { id: "prod-eu-central", name: "Prod-EU-Central", region: "eu-central" },
  ],
  activeEnvId: "alpha-1",
  demoMode: false,
  pipelines: [],
  architectureRules: {},
  runs: [],
  approvals: [],
  project: { client: "", name: "", scope: "" },
};

const AUDIT_CAP = 1000;
const RUNS_CAP = 200;
/** Briefs are a few KB each; only the latest keep theirs, so local storage stays well inside its quota. */
const BRIEFS_KEPT = 20;
const APPROVALS_CAP = 200;

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
      environments: Array.isArray(parsed.environments) && parsed.environments.length ? parsed.environments : DEFAULT_SETTINGS.environments,
      pipelines: Array.isArray(parsed.pipelines) ? parsed.pipelines : [],
      architectureRules: parsed.architectureRules ?? {},
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
      project: { ...DEFAULT_SETTINGS.project, ...parsed.project },
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

export const activeEnv = (s: DeskSettings) => s.environments.find((e) => e.id === s.activeEnvId) ?? s.environments[0];

/** The canonical text an audit entry's hash covers, chained to the previous entry's hash. */
export const auditPayload = (prev: string, e: Omit<AuditEntry, "hash">) => `${prev}|${e.id}|${e.at}|${e.kind}|${e.actor}|${e.env ?? ""}|${e.message}`;

/** Appends to the workspace audit log, attributed to the member acting and tagged with the environment. */
export function audit(kind: AuditKind, message: string) {
  updateSettings((s) => {
    const last = s.audit.at(-1);
    // Credentials never reach the log, even if one was pasted into a command.
    const entry: Omit<AuditEntry, "hash"> = { id: (last?.id ?? 0) + 1, at: Date.now(), kind, actor: activeMember(s).name, message: redactSecrets(message), env: activeEnv(s).name };
    const hash = sha256(auditPayload(last?.hash ?? "genesis", entry));
    return { audit: [...s.audit, { ...entry, hash }].slice(-AUDIT_CAP) };
  });
}

/**
 * Walks the chain. Entries before the first hashed one are "unchained" (written before the chain existed);
 * the first hashed entry after a capped trim anchors on its own stored predecessor hash.
 */
export function verifyAudit(entries: AuditEntry[]): { ok: boolean; checked: number; unchained: number; brokenAt: number | null } {
  let prev: string | null = null;
  let checked = 0;
  let unchained = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.hash) {
      if (prev !== null) return { ok: false, checked, unchained, brokenAt: e.id };
      unchained++;
      continue;
    }
    if (prev === null) {
      // The first hashed entry chains to "genesis". Only when the log has hit its cap (so older entries were
      // trimmed away) can it legitimately chain to something we no longer hold; then it's taken as the anchor.
      const { hash, ...body } = e;
      const trimmed = i === 0 && entries.length >= AUDIT_CAP;
      if (!trimmed && sha256(auditPayload("genesis", body)) !== hash) return { ok: false, checked, unchained, brokenAt: e.id };
      prev = hash;
      checked++;
      continue;
    }
    const { hash, ...body } = e;
    if (sha256(auditPayload(prev, body)) !== hash) return { ok: false, checked, unchained, brokenAt: e.id };
    prev = hash;
    checked++;
  }
  return { ok: true, checked, unchained, brokenAt: null };
}

/** Records a finished run in the workspace history (searchable in architecture and audit views). */
export function recordRun(r: Omit<RunRecord, "env">) {
  updateSettings((s) => {
    const runs = [...s.runs, { ...r, command: redactSecrets(r.command), summary: redactSecrets(r.summary), brief: r.brief ? redactSecrets(r.brief) : undefined, env: activeEnv(s).name }].slice(-RUNS_CAP);
    return { runs: runs.map((x, i) => (i < runs.length - BRIEFS_KEPT && x.brief ? { ...x, brief: undefined } : x)) };
  });
}

/** Queues a run's approval-gated actions once (repeat calls for the same run are ignored). */
export function registerApprovals(runId: string, source: string, engine: EngineKey, actions: { title: string; detail: string; priority: string; owner: string }[], indexes: number[]) {
  updateSettings((s) => {
    const fresh = indexes.filter((i) => actions[i] && !s.approvals.some((a) => a.id === `${runId}:${i}`));
    if (!fresh.length) return {};
    const added: Approval[] = fresh.map((i) => ({ id: `${runId}:${i}`, runId, source, engine, title: redactSecrets(actions[i].title), detail: redactSecrets(actions[i].detail), priority: actions[i].priority, owner: actions[i].owner, at: Date.now(), status: "pending" }));
    return { approvals: [...s.approvals, ...added].slice(-APPROVALS_CAP) };
  });
}

export function decideApproval(id: string, decision: "approved" | "rejected") {
  let title = "";
  let source = "";
  updateSettings((s) => ({
    approvals: s.approvals.map((a) => {
      if (a.id !== id || a.status !== "pending") return a;
      title = a.title;
      source = a.source;
      return { ...a, status: decision, by: activeMember(s).name, decidedAt: Date.now() };
    }),
  }));
  if (title) audit("approval", `${decision === "approved" ? "Approved" : "Rejected"} "${title}" (${source})`);
}

export function completeTask(id: string) {
  let title = "";
  updateSettings((s) => ({
    approvals: s.approvals.map((a) => {
      if (a.id !== id) return a;
      title = a.title;
      return { ...a, done: true };
    }),
  }));
  if (title) audit("approval", `Marked done: "${title}"`);
}
