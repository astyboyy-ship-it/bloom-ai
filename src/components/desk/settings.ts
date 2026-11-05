"use client";

import { useSyncExternalStore } from "react";
import type { EngineKey } from "@/components/bloom/command/engines";
import type { ShiftMode } from "@/components/bloom/shift-plan";
import type { CalibrationInput } from "@/lib/engines/calibration";
import type { Tier } from "@/lib/license/tiers";
import type { BloomLicensePayload } from "@/lib/licensing/types";
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
/** `access` is set for BLOOMK- access keys: the verified payload (role, permissions, theme) as the server returned it. */
export type LicenseInfo = { tier: Exclude<Tier, "evaluation">; org: string; expiresAt: string | null; issuedAt: string; dev: boolean; verifiedAt: number; access?: BloomLicensePayload | null };

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
  /**
   * Proof of execution: SHA-256 of the (redacted) command and summary, the executing node, and a seal chaining
   * this run to the one before. Editing any sealed run, or its stored input/output, breaks verification.
   */
  inputHash?: string;
  outputHash?: string;
  node?: string;
  prevSeal?: string;
  seal?: string;
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
  /** Human-in-the-loop signature: SHA-256 over the decision, who made it, when, and the run's seal. */
  sig?: string;
};

/** One Shadow Board deliberation: three adversarial agents stress-test a proposal before it touches live systems. */
export type BoardVote = { agent: "advocate" | "optimizer" | "compliance"; stance: "support" | "conditional" | "oppose" | "veto"; score: number; ms: number; criteria: Record<string, number>; points: string[]; conditions: string[] };
export type BoardSession = {
  id: string;
  at: number;
  subject: string;
  detail: string;
  amountUsd: number | null;
  approvalId?: string;
  runId?: string;
  verdict: "approved" | "rejected" | "escalate";
  score: number;
  votes: BoardVote[];
  ms: number;
  hash: string;
};

/**
 * A snapshot of one engine's long-term memory, like a commit: it has a parent and a branch, so the timeline can be
 * inspected, rolled back (as a new snapshot, so nothing is lost) or forked into a what-if branch.
 */
export type MemorySnapshot = { id: string; engine: EngineKey; at: number; parent: string | null; branch: string; memory: string[]; label: string; hash: string };

/** Local, decaying usage weights (engines, architectures, pages) that let Home adapt to how the operator works. */
export type UsageWeight = { score: number; last: number };

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
  /** This device's node identity, minted on first sealed run. */
  nodeId: string;
  boardSessions: BoardSession[];
  memorySnapshots: MemorySnapshot[];
  /** The snapshot each engine's live memory currently sits on. */
  memoryHeads: Partial<Record<EngineKey, string>>;
  usage: Record<string, UsageWeight>;
};

const OWNER: Member = { id: "owner", name: "Workspace Owner", email: "", role: "owner" };

const OWNER_NAMES = { en: "Workspace Owner", es: "Propietario del espacio", he: "בעלי סביבת העבודה" } as const;
/** A member's name for display: the built-in default owner name follows the language. */
export const displayName = (name: string, lang: "en" | "es" | "he") => (name === OWNER.name ? OWNER_NAMES[lang] : name);

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
  nodeId: "",
  boardSessions: [],
  memorySnapshots: [],
  memoryHeads: {},
  usage: {},
};

const AUDIT_CAP = 1000;
const RUNS_CAP = 200;
/** Briefs are a few KB each; only the latest keep theirs, so local storage stays well inside its quota. */
const BRIEFS_KEPT = 20;
const APPROVALS_CAP = 200;
const BOARD_CAP = 100;
const SNAPSHOTS_CAP = 400;
const USAGE_HALF_LIFE = 3 * 86_400_000;

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
      nodeId: typeof parsed.nodeId === "string" ? parsed.nodeId : "",
      boardSessions: Array.isArray(parsed.boardSessions) ? parsed.boardSessions : [],
      memorySnapshots: Array.isArray(parsed.memorySnapshots) ? parsed.memorySnapshots : [],
      memoryHeads: parsed.memoryHeads ?? {},
      usage: parsed.usage ?? {},
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
  const next = { ...cur, ...(typeof patch === "function" ? patch(cur) : patch) };
  write(next.calibrations === cur.calibrations ? next : snapshotMemory(cur, next));
}

const memOf = (s: DeskSettings, k: EngineKey) => s.calibrations[k]?.memory ?? [];
const sameMem = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

/** Builds a snapshot chained to its parent's hash. */
export function makeSnapshot(s: Pick<DeskSettings, "memorySnapshots">, engine: EngineKey, parent: string | null, branch: string, memory: string[], label: string, at = Date.now()): MemorySnapshot {
  const prev = s.memorySnapshots.find((x) => x.id === parent);
  const id = newId().slice(0, 12);
  return { id, engine, at, parent, branch, memory, label, hash: sha256(`${prev?.hash ?? "root"}|${id}|${engine}|${at}|${branch}|${JSON.stringify(memory)}`) };
}

/**
 * Any change to an engine's memory (a run's retained result, seeding, forgetting, clearing) is committed as a
 * snapshot on the engine's current branch. Rollbacks and forks move the head themselves and are skipped here.
 */
function snapshotMemory(cur: DeskSettings, next: DeskSettings): DeskSettings {
  const engines = new Set([...Object.keys(cur.calibrations), ...Object.keys(next.calibrations)] as EngineKey[]);
  let snaps = next.memorySnapshots;
  const heads = { ...next.memoryHeads };
  for (const k of engines) {
    const before = memOf(cur, k);
    const after = memOf(next, k);
    if (sameMem(before, after) || next.memoryHeads[k] !== cur.memoryHeads[k]) continue;
    let head = snaps.find((x) => x.id === heads[k]) ?? null;
    if (!head && before.length) {
      // Memory that predates time-travel becomes the root, so the first change can be rolled back.
      head = makeSnapshot({ memorySnapshots: snaps }, k, null, "main", before, "Baseline", Date.now() - 1);
      snaps = [...snaps, head];
    }
    const added = after.filter((m) => !before.includes(m)).length;
    const removed = before.filter((m) => !after.includes(m)).length;
    const label = !after.length ? "Memory cleared" : added && !removed ? `Retained ${added} result${added > 1 ? "s" : ""}` : removed && !added ? `Forgot ${removed} memor${removed > 1 ? "ies" : "y"}` : `+${added} / -${removed} memories`;
    const snap = makeSnapshot({ memorySnapshots: snaps }, k, head?.id ?? null, head?.branch ?? "main", after, label);
    snaps = [...snaps, snap];
    heads[k] = snap.id;
  }
  return { ...next, memorySnapshots: snaps.slice(-SNAPSHOTS_CAP), memoryHeads: heads };
}

/** Re-hydrates an engine's memory to a past snapshot, recorded as a new snapshot so the history is kept. */
export function rollbackMemory(id: string) {
  let label = "";
  updateSettings((s) => {
    const target = s.memorySnapshots.find((x) => x.id === id);
    if (!target) return {};
    const k = target.engine;
    const head = s.memorySnapshots.find((x) => x.id === s.memoryHeads[k]);
    const snap = makeSnapshot(s, k, head?.id ?? target.id, head?.branch ?? target.branch, target.memory, `Rollback to ${target.id.slice(0, 7)}`);
    label = `Rolled ${k} memory back to snapshot ${target.id.slice(0, 7)} (${new Date(target.at).toISOString()})`;
    return { calibrations: { ...s.calibrations, [k]: { ...s.calibrations[k], memory: target.memory } }, memorySnapshots: [...s.memorySnapshots, snap].slice(-SNAPSHOTS_CAP), memoryHeads: { ...s.memoryHeads, [k]: snap.id } };
  });
  if (label) audit("calibration", label);
}

/** Forks a what-if branch from a snapshot, optionally injecting a scenario premise, and checks it out. */
export function forkMemory(id: string, branch: string, scenario: string) {
  let label = "";
  updateSettings((s) => {
    const from = s.memorySnapshots.find((x) => x.id === id);
    if (!from) return {};
    const k = from.engine;
    const memory = scenario.trim() ? [...from.memory, `WHAT-IF SCENARIO: ${redactSecrets(scenario.trim()).slice(0, 760)}`].slice(-10) : from.memory;
    const snap = makeSnapshot(s, k, from.id, branch, memory, scenario.trim() ? `Fork: ${scenario.trim().slice(0, 48)}` : `Fork from ${from.id.slice(0, 7)}`);
    label = `Forked ${k} memory into branch "${branch}" from snapshot ${from.id.slice(0, 7)}`;
    return { calibrations: { ...s.calibrations, [k]: { ...s.calibrations[k], memory } }, memorySnapshots: [...s.memorySnapshots, snap].slice(-SNAPSHOTS_CAP), memoryHeads: { ...s.memoryHeads, [k]: snap.id } };
  });
  if (label) audit("calibration", label);
}

/**
 * Commits an engine's current memory as an explicit snapshot on its current branch, even when nothing changed:
 * a named checkpoint to roll back or fork from. Returns the new snapshot's id.
 */
export function commitMemory(engine: EngineKey, label: string): string | null {
  let id: string | null = null;
  updateSettings((s) => {
    const head = s.memorySnapshots.find((x) => x.id === s.memoryHeads[engine]) ?? null;
    const snap = makeSnapshot(s, engine, head?.id ?? null, head?.branch ?? "main", memOf(s, engine), label.slice(0, 80));
    id = snap.id;
    return { memorySnapshots: [...s.memorySnapshots, snap].slice(-SNAPSHOTS_CAP), memoryHeads: { ...s.memoryHeads, [engine]: snap.id } };
  });
  if (id) audit("calibration", `Committed ${engine} memory state as snapshot ${(id as string).slice(0, 7)}`);
  return id;
}

/** Switches an engine to the latest snapshot on a branch. */
export function checkoutBranch(engine: EngineKey, branch: string) {
  let ok = false;
  updateSettings((s) => {
    const tip = s.memorySnapshots.filter((x) => x.engine === engine && x.branch === branch).at(-1);
    if (!tip || s.memoryHeads[engine] === tip.id) return {};
    ok = true;
    return { calibrations: { ...s.calibrations, [engine]: { ...s.calibrations[engine], memory: tip.memory } }, memoryHeads: { ...s.memoryHeads, [engine]: tip.id } };
  });
  if (ok) audit("calibration", `Checked out ${engine} memory branch "${branch}"`);
}

/** Walks every snapshot's hash back to its parent. Returns the ids that don't verify. */
export function verifySnapshots(snaps: MemorySnapshot[]): string[] {
  const byId = new Map(snaps.map((x) => [x.id, x]));
  return snaps.filter((x) => x.hash !== sha256(`${(x.parent && byId.get(x.parent)?.hash) || "root"}|${x.id}|${x.engine}|${x.at}|${x.branch}|${JSON.stringify(x.memory)}`)).map((x) => x.id);
}

/** Bumps a usage weight (exponential decay, 3-day half-life) so Home can lift what the operator uses most. */
export function touchUsage(...keys: string[]) {
  const now = Date.now();
  updateSettings((s) => {
    const usage = { ...s.usage };
    for (const key of keys) {
      const w = usage[key];
      usage[key] = { score: (w ? w.score * 0.5 ** ((now - w.last) / USAGE_HALF_LIFE) : 0) + 1, last: now };
    }
    // Keep the table small: drop the faintest entries.
    const kept = Object.entries(usage).sort((a, b) => b[1].score - a[1].score).slice(0, 120);
    return { usage: Object.fromEntries(kept) };
  });
}

/** A usage weight decayed to now. */
export const usageScore = (s: Pick<DeskSettings, "usage">, key: string, now = Date.now()) => {
  const w = s.usage[key];
  return w ? w.score * 0.5 ** ((now - w.last) / USAGE_HALF_LIFE) : 0;
};

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
export function recordRun(r: Omit<RunRecord, "env" | "inputHash" | "outputHash" | "node" | "prevSeal" | "seal">) {
  updateSettings((s) => {
    const nodeId = s.nodeId || `node-${newId().slice(0, 8)}`;
    const env = activeEnv(s);
    const command = redactSecrets(r.command);
    const summary = redactSecrets(r.summary);
    const sealed = { ...r, command, summary, brief: r.brief ? redactSecrets(r.brief) : undefined, env: env.name, node: `${nodeId}@${env.region}`, inputHash: sha256(command), outputHash: sha256(summary) };
    const prevSeal = s.runs.findLast((x) => x.seal)?.seal ?? "genesis";
    const runs = [...s.runs, { ...sealed, prevSeal, seal: sha256(sealPayload(prevSeal, sealed)) }].slice(-RUNS_CAP);
    return { nodeId, runs: runs.map((x, i) => (i < runs.length - BRIEFS_KEPT && x.brief ? { ...x, brief: undefined } : x)) };
  });
  touchUsage(`${r.kind === "architecture" ? "arch" : r.kind}:${r.target}`);
}

/** The canonical text a run's seal covers. */
export const sealPayload = (prev: string, r: Pick<RunRecord, "runId" | "at" | "node" | "env" | "inputHash" | "outputHash" | "ok" | "target">) => `${prev}|${r.runId}|${r.at}|${r.node}|${r.env}|${r.target}|${r.inputHash}|${r.outputHash}|${r.ok}`;

/** Checks one run: its stored input/output still hash to what was sealed, and the seal covers them. */
export function verifyRun(r: RunRecord) {
  return {
    input: r.inputHash === sha256(r.command),
    output: r.outputHash === sha256(r.summary),
    seal: !!r.seal && !!r.prevSeal && r.seal === sha256(sealPayload(r.prevSeal, r)),
  };
}

/** Walks the execution ledger: every sealed run must verify and chain to the sealed run before it. */
export function verifyLedger(runs: RunRecord[]): { ok: boolean; checked: number; brokenAt: string | null } {
  let prev: string | null = null;
  let checked = 0;
  for (const r of runs) {
    if (!r.seal) continue;
    const v = verifyRun(r);
    // The first sealed run may chain to a run trimmed off the capped history.
    const linked = prev === null ? r.prevSeal === "genesis" || runs.length >= RUNS_CAP : r.prevSeal === prev;
    if (!v.input || !v.output || !v.seal || !linked) return { ok: false, checked, brokenAt: r.runId };
    prev = r.seal;
    checked++;
  }
  return { ok: true, checked, brokenAt: null };
}

/** The canonical text a human approval signature covers. */
export const approvalSigPayload = (a: Pick<Approval, "id" | "status" | "by" | "decidedAt">, seal: string) => `${a.id}|${a.status}|${a.by}|${a.decidedAt}|${seal}`;

/** Records a Shadow Board deliberation (hashed over its votes) and audits the verdict. */
export function recordBoardSession(b: Omit<BoardSession, "hash">) {
  const hash = sha256(JSON.stringify(b));
  updateSettings((s) => ({ boardSessions: [...s.boardSessions, { ...b, subject: redactSecrets(b.subject), detail: redactSecrets(b.detail), hash }].slice(-BOARD_CAP) }));
  audit("approval", `Shadow Board ${b.verdict === "escalate" ? "escalated" : b.verdict} "${b.subject}" (consensus ${(b.score * 100).toFixed(0)}%, ${hash.slice(0, 12)})`);
  return hash;
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
      const decided = { ...a, status: decision, by: activeMember(s).name, decidedAt: Date.now() };
      const seal = s.runs.find((r) => r.runId === a.runId)?.seal ?? "unsealed";
      return { ...decided, sig: sha256(approvalSigPayload(decided, seal)) };
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
