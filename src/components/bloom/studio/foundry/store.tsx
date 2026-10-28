"use client";

import { createContext, useContext, useRef, useState } from "react";
import { Hammer, Link2, MonitorPlay, Target as TargetIcon } from "lucide-react";
import { classify, pack, qa, type Finding, type Qa, type Target } from "@/lib/studio/foundry";
import { AGENTS, runSwarm, type AgentId, type Line, type Status } from "@/lib/studio/foundry-run";
import { EngineShell, usePersistent, type Section, type StudioMeta } from "../frame";

export const META: StudioMeta = {
  index: "03",
  name: "Aware Shadow Workforce · Solution Foundry",
  kicker: "Shadow Workforce",
  tagline: "build the fix instead of sending the pitch",
  painting: "consummation",
  palette: "emerald",
  accent: "#3fd29a",
};

export const BASE = "/demo/engine-03";
const SECTIONS: Section[] = [
  { href: `${BASE}/targets`, label: "Targets", hint: "URLs, handles and bottleneck specs", icon: TargetIcon },
  { href: `${BASE}/foundry`, label: "Foundry", hint: "Five agents crawl, audit and build", icon: Hammer },
  { href: `${BASE}/sandbox`, label: "Sandbox", hint: "Edit the prototype, live preview", icon: MonitorPlay },
  { href: `${BASE}/deliveries`, label: "Deliveries", hint: "Secure links and handover notes", icon: Link2 },
];

export { AGENTS };
export type { AgentId, Line, Status };
export type Build = { status: Record<AgentId, Status>; lines: Line[]; findings: Finding[]; code: string; checks: Qa[]; note: string; builtAt?: string };
export type Vaulted = Target & { spec: string; addedAt: string };
export type DeliveryRec = { id: string; targetId: string; name: string; link: string; note: string; createdAt: string; bytes: number };

const idle = (): Build => ({ status: Object.fromEntries(AGENTS.map((a) => [a.id, "queued"])) as Record<AgentId, Status>, lines: [], findings: [], code: "", checks: [], note: "" });

const SEED: Vaulted[] = [
  { id: "t1", ...classify("linear.app"), spec: "", addedAt: "2026-10-26T08:00:00.000Z" },
  { id: "t2", ...classify("@northstarcreative"), spec: "Agency on Instagram; leads arrive as DMs and get lost.", addedAt: "2026-10-26T08:00:00.000Z" },
  {
    id: "t3",
    ...classify("Our demo booking form at Halvorsen Logistics loses leads between the form and the calendar, and we can't tell where they drop"),
    spec: "Ops lead says ~40% of form fills never book.",
    addedAt: "2026-10-26T08:00:00.000Z",
  },
];


function useFoundryState() {
  const [targets, setTargets] = usePersistent<Vaulted[]>("bloom.e3.targets", SEED);
  const [activeId, setActiveId] = usePersistent("bloom.e3.active", SEED[0].id);
  const [builds, setBuilds] = usePersistent<Record<string, Build>>("bloom.e3.builds", {});
  const [deliveries, setDeliveries] = usePersistent<DeliveryRec[]>("bloom.e3.deliveries", []);
  const [running, setRunning] = useState<string | null>(null);
  const runId = useRef(0);

  const active = targets.find((t) => t.id === activeId) ?? targets[0];
  const buildOf = (id: string) => builds[id] ?? idle();
  const patchBuild = (id: string, fn: (b: Build) => Build) => setBuilds((all) => ({ ...all, [id]: fn(all[id] ?? idle()) }));

  const addTarget = (input: string, spec = "") => {
    const t: Vaulted = { id: `t${Date.now()}`, ...classify(input), spec, addedAt: new Date().toISOString() };
    setTargets((ts) => [t, ...ts]);
    setActiveId(t.id);
    return t;
  };
  const updateTarget = (id: string, patch: Partial<Vaulted>) => setTargets((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTarget = (id: string) => {
    setTargets((ts) => ts.filter((t) => t.id !== id));
    setBuilds(({ [id]: _gone, ...rest }) => (void _gone, rest));
  };

  /** The five-agent run. Lives in the layout, so it keeps going while you switch pages. */
  const run = async (target: Vaulted) => {
    const id = ++runId.current;
    const alive = () => runId.current === id;
    const tid = target.id;
    setBuilds((all) => ({ ...all, [tid]: idle() }));
    setRunning(tid);
    const result = await runSwarm(target, {
      alive,
      status: (agent, s) => patchBuild(tid, (b) => ({ ...b, status: { ...b.status, [agent]: s } })),
      line: (l) => patchBuild(tid, (b) => ({ ...b, lines: [...b.lines, l] })),
      finding: (f) => patchBuild(tid, (b) => ({ ...b, findings: [...b.findings, f] })),
      code: (code) => patchBuild(tid, (b) => ({ ...b, code })),
    });
    if (!alive()) return;
    if (result) patchBuild(tid, (b) => ({ ...b, code: result.html, checks: result.checks, note: result.note, builtAt: new Date().toISOString() }));
    setRunning(null);
  };

  const setCode = (id: string, code: string) => patchBuild(id, (b) => ({ ...b, code }));
  const setNote = (id: string, note: string) => patchBuild(id, (b) => ({ ...b, note }));
  const rerunQa = (id: string) => patchBuild(id, (b) => ({ ...b, checks: qa(b.code) }));

  const deliver = async (target: Vaulted) => {
    const b = buildOf(target.id);
    const frag = await pack({ t: target.name, h: b.code, n: b.note.replace("[link]", "this page") });
    const link = `${window.location.origin}${BASE}/deliver#${frag}`;
    const rec: DeliveryRec = { id: `d${Date.now()}`, targetId: target.id, name: target.name, link, note: b.note.replace("[link]", link), createdAt: new Date().toISOString(), bytes: link.length };
    setDeliveries((d) => [rec, ...d]);
    return rec;
  };
  const removeDelivery = (id: string) => setDeliveries((d) => d.filter((x) => x.id !== id));

  return { targets, active, activeId, setActiveId, addTarget, updateTarget, removeTarget, buildOf, run, running, setCode, setNote, rerunQa, deliveries, deliver, removeDelivery };
}

export type FoundryState = ReturnType<typeof useFoundryState>;
const Ctx = createContext<FoundryState | null>(null);

export function useFoundry() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFoundry must be used inside the Engine 03 layout");
  return v;
}

/** Engine 03's persistent layout: the target vault, builds and deliveries, plus the app shell. */
export function FoundryApp({ children }: { children: React.ReactNode }) {
  const state = useFoundryState();
  return (
    <Ctx.Provider value={state}>
      <EngineShell meta={META} base={BASE} sections={SECTIONS}>
        {children}
      </EngineShell>
    </Ctx.Provider>
  );
}
