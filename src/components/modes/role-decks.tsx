"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Building2, Cpu, Factory, Gauge, Layers, Plus, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { audit, updateSettings, useDeskSettings } from "@/components/desk/settings";
import { useOsTelemetry } from "@/components/os/telemetry-context";
import { useLicense } from "@/lib/license-context";
import { fill, useLicensingCopy } from "@/components/control-plane/copy";
import { CpButton, Widget } from "@/components/control-plane/widget";

/** Reads and writes a small JSON value in localStorage after mount (never during render, so hydration matches). */
function useStored<T>(key: string, initial: T): [T, (v: T) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // Unreadable: keep the initial value.
    }
    setLoaded(true);
  }, [key]);
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // Kept for this page view.
    }
  };
  return [value, set, loaded];
}

/* --------------------------------------------------------------------------------------------- Operator */

/** Operator mode: setup is bypassed, live telemetry is mounted, and the Control Plane is one click away. */
export function OperatorDeck() {
  const c = useLicensingCopy();
  const o = c.modes.operator;
  const { access, engines } = useLicense();
  const { latency, uptime } = useOsTelemetry();
  const { settings } = useDeskSettings();
  const today = new Date().setHours(0, 0, 0, 0);
  const runs = settings.runs.filter((r) => r.at >= today).length;

  const stats = [
    { label: o.latency, value: latency === null ? "—" : `${latency}ms` },
    { label: o.uptime, value: uptime === null ? "—" : `${Math.round(uptime * 100)}%` },
    { label: o.engines, value: `${engines.length}/8` },
    { label: o.runs, value: String(runs) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pt-6 sm:px-6">
      <section className="bloom-glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
        <div className="min-w-0 flex-1">
          <p className="os-label bloom-glow">{o.title(access?.holderName ?? "")}</p>
          <p className="mt-1 text-[13px] text-white/55">{o.sub}</p>
        </div>
        <dl className="flex flex-wrap gap-5 font-mono">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-[9px] uppercase tracking-[0.18em] text-white/35">{s.label}</dt>
              <dd className="mt-0.5 text-[18px] tabular-nums text-os-cyan">{s.value}</dd>
            </div>
          ))}
        </dl>
        <Link href="/desk/control-plane" className="bloom-edge-glow flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-os-cyan">
          <Cpu className="size-4" /> {o.open}
        </Link>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------- Agency */

export type Client = { id: string; name: string; seats: number; nodes: number };

/**
 * Agency client workspaces, shared by the provisioner and the revenue hub so both stay in step. Kept in
 * localStorage; subscribers re-render on every change, including changes from another tab.
 */
const CLIENTS_KEY = "bloom-agency-clients";
const NO_CLIENTS: Client[] = [];
const clientListeners = new Set<() => void>();
let clientCache: { raw: string | null; list: Client[] } = { raw: null, list: NO_CLIENTS };
function readClients(): Client[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CLIENTS_KEY);
  } catch {
    // Storage blocked: no clients.
  }
  if (raw !== clientCache.raw) {
    let list = NO_CLIENTS;
    try {
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) list = parsed as Client[];
    } catch {
      // Corrupt entry: treat as empty.
    }
    clientCache = { raw, list };
  }
  return clientCache.list;
}
function writeClients(list: Client[]) {
  try {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(list));
  } catch {
    // Kept for this page view only.
    clientCache = { raw: JSON.stringify(list), list };
  }
  clientListeners.forEach((l) => l());
}
function subscribeClients(l: () => void) {
  clientListeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === CLIENTS_KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    clientListeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}
export function useAgencyClients(): [Client[], (list: Client[]) => void] {
  return [useSyncExternalStore(subscribeClients, readClients, () => NO_CLIENTS), writeClients];
}

/** Agency mode: a multi-tenant client switcher and a seat / node allocation deck bounded by the key's limits. */
export function AgencyDeck() {
  const a = useLicensingCopy().modes.agency;
  const { permissions } = useLicense();
  const { settings } = useDeskSettings();
  const maxClients = permissions?.maxClients ?? 0;
  const maxNodes = permissions?.maxActiveNodes ?? 0;
  const [clients, setClients] = useAgencyClients();
  const [name, setName] = useState("");
  const active = clients.find((x) => x.name === settings.project.client) ?? null;
  const allocated = clients.reduce((s, x) => s + x.nodes, 0);

  const activate = (x: Client) => {
    updateSettings((s) => ({ project: { ...s.project, client: x.name } }));
    audit("settings", `Switched agency workspace to ${x.name}`);
  };
  const add = () => {
    const n = name.trim().slice(0, 60);
    if (!n || clients.length >= maxClients || clients.some((x) => x.name === n)) return;
    const x: Client = { id: `cl-${Date.now().toString(36)}`, name: n, seats: 3, nodes: Math.min(100, Math.max(0, maxNodes - allocated)) };
    setClients([...clients, x]);
    setName("");
    activate(x);
  };
  const patch = (id: string, p: Partial<Client>) => {
    const others = clients.filter((x) => x.id !== id).reduce((s, x) => s + x.nodes, 0);
    setClients(clients.map((x) => (x.id === id ? { ...x, ...p, nodes: Math.min(p.nodes ?? x.nodes, Math.max(0, maxNodes - others)) } : x)));
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pt-6 sm:px-6">
      <Widget
        icon={Users}
        title={a.title}
        sub={a.sub}
        actions={
          <span className="font-mono text-[10.5px] text-white/50">
            {a.clients(clients.length, maxClients)} · {a.nodes(allocated, maxNodes)}
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
            {a.active}
            <select
              value={active?.id ?? ""}
              onChange={(e) => {
                const x = clients.find((c) => c.id === e.target.value);
                if (x) activate(x);
              }}
              className="rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[12px] normal-case tracking-normal text-white focus:outline-none"
            >
              <option value="" disabled className="bg-os-panel">
                —
              </option>
              {clients.map((x) => (
                <option key={x.id} value={x.id} className="bg-os-panel">
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <form
            className="ms-auto flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={a.placeholder} maxLength={60} className="w-44 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-white placeholder:text-white/30 focus:outline-none" />
            <CpButton type="submit" disabled={!name.trim() || clients.length >= maxClients}>
              <Plus className="size-3" /> {a.add}
            </CpButton>
          </form>
        </div>
        {clients.length >= maxClients && maxClients > 0 && <p className="mt-2 font-mono text-[11px] text-amber-200/80">{a.full}</p>}

        {!clients.length ? (
          <p className="mt-4 text-center font-mono text-[12px] text-white/40">{a.empty}</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((x) => (
              <li key={x.id} className={cn("rounded-lg border p-3", active?.id === x.id ? "bloom-edge-glow" : "border-white/[0.07] bg-black/30")}>
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => activate(x)} className="flex min-w-0 items-center gap-2 text-start text-[13px] text-white/85 hover:text-os-cyan">
                    <Building2 className="size-4 shrink-0 text-os-cyan" />
                    <span className="truncate">{x.name}</span>
                  </button>
                  <button type="button" onClick={() => setClients(clients.filter((c) => c.id !== x.id))} aria-label={`${a.remove} ${x.name}`} className="rounded p-1 text-white/35 hover:text-red-300">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <label className="mt-2 flex items-center gap-2 font-mono text-[10.5px] text-white/50">
                  <span className="w-14">{a.seats}</span>
                  <input type="range" min={1} max={50} value={x.seats} onChange={(e) => patch(x.id, { seats: Number(e.target.value) })} className="flex-1 accent-[var(--bloom-accent)]" />
                  <span className="w-10 text-end tabular-nums text-white/80">{x.seats}</span>
                </label>
                <label className="mt-1 flex items-center gap-2 font-mono text-[10.5px] text-white/50">
                  <Layers className="size-3 w-14" />
                  <input type="range" min={0} max={Math.max(1, maxNodes)} step={10} value={x.nodes} onChange={(e) => patch(x.id, { nodes: Number(e.target.value) })} className="flex-1 accent-[var(--bloom-accent)]" />
                  <span className="w-10 text-end tabular-nums text-white/80">{x.nodes}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- Enterprise */

type Industry = "finance" | "healthcare" | "manufacturing" | "retail" | "logistics";
const INDUSTRIES: Industry[] = ["finance", "healthcare", "manufacturing", "retail", "logistics"];
type Domain = { industry: Industry | null; engines: EngineKey[]; launched: boolean };
type FeedItem = { id: number; at: number; text: string; engine: EngineKey };

/** Enterprise mode: a three-step domain wizard (industry, three engines, launch) and an industry-tailored feed. */
export function EnterpriseDeck() {
  const e = useLicensingCopy().modes.enterprise;
  const { engines: licensed } = useLicense();
  const [domain, setDomain, loaded] = useStored<Domain>("bloom-enterprise-domain", { industry: null, engines: [], launched: false });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const choices = useMemo(() => ENGINE_ORDER.filter((k) => licensed.includes(k)), [licensed]);

  // An enterprise key with exactly three engines starts with them chosen.
  useEffect(() => {
    if (loaded && !domain.engines.length && choices.length === 3) setDomain({ ...domain, engines: choices });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, choices]);

  const industry = domain.industry;
  const chosenEngines = domain.engines;
  useEffect(() => {
    if (!domain.launched || !industry || chosenEngines.length !== 3) return;
    let seq = 0;
    const make = (): FeedItem => {
      const engine = chosenEngines[Math.floor(Math.random() * 3)];
      const tpl = e.events[industry][Math.floor(Math.random() * e.events[industry].length)];
      return { id: ++seq, at: Date.now(), engine, text: fill(tpl, { engine: ENGINES[engine].name, n: 2 + Math.floor(Math.random() * 180) }) };
    };
    setFeed(Array.from({ length: 5 }, make));
    const id = setInterval(() => setFeed((f) => [make(), ...f].slice(0, 30)), 2600);
    return () => clearInterval(id);
  }, [domain.launched, industry, chosenEngines, e]);

  const toggle = (k: EngineKey) => {
    const has = domain.engines.includes(k);
    if (!has && domain.engines.length >= 3) return;
    setDomain({ ...domain, engines: has ? domain.engines.filter((x) => x !== k) : [...domain.engines, k] });
  };

  const step = !domain.industry ? 1 : !domain.launched ? 2 : 3;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pt-6 sm:px-6">
      <Widget
        icon={Factory}
        title={e.title}
        sub={e.sub}
        actions={
          domain.launched ? (
            <CpButton tone="quiet" onClick={() => setDomain({ ...domain, launched: false })}>
              {e.reset}
            </CpButton>
          ) : undefined
        }
      >
        <ol className="flex flex-wrap gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em]">
          {[e.step1, e.step2, e.step3].map((label, i) => (
            <li key={label} className={cn("rounded-full border px-2.5 py-1", step === i + 1 ? "bloom-edge-glow text-os-cyan" : step > i + 1 ? "border-os-emerald/40 text-os-emerald" : "border-white/10 text-white/40")}>
              {i + 1} · {label}
            </li>
          ))}
        </ol>

        {!domain.launched && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <button key={i} type="button" onClick={() => setDomain({ ...domain, industry: i })} className={cn("rounded-lg border px-3 py-1.5 text-[12.5px] transition-colors", domain.industry === i ? "bloom-edge-glow text-os-cyan" : "border-white/10 text-white/65 hover:text-white")}>
                  {e.industries[i]}
                </button>
              ))}
            </div>
            {domain.industry && (
              <>
                <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/45">{e.pick(domain.engines.length)}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {choices.map((k) => {
                    const on = domain.engines.includes(k);
                    return (
                      <button key={k} type="button" aria-pressed={on} onClick={() => toggle(k)} disabled={!on && domain.engines.length >= 3} className={cn("rounded-md border px-2.5 py-1 font-mono text-[11.5px] transition-colors disabled:opacity-35", on ? "border-os-cyan/50 bg-os-cyan/10 text-os-cyan" : "border-white/10 text-white/60 hover:text-white")}>
                        {ENGINES[k].name}
                      </button>
                    );
                  })}
                </div>
                <CpButton className="mt-3" disabled={domain.engines.length !== 3} onClick={() => setDomain({ ...domain, launched: true })}>
                  <Gauge className="size-3" /> {e.apply}
                </CpButton>
              </>
            )}
          </>
        )}

        {domain.launched && domain.industry && (
          <div className="mt-3">
            <p className="font-mono text-[10.5px] text-white/50">
              {e.industries[domain.industry]} · {domain.engines.map((k) => ENGINES[k].name).join(" · ")}
            </p>
            <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35">{e.feedTitle}</p>
            <ol className="mt-1 max-h-56 space-y-1 overflow-y-auto">
              {feed.map((f) => (
                <li key={f.id} className="flex gap-2 rounded bg-white/[0.02] px-2 py-1 text-[12px]">
                  <span className="shrink-0 font-mono tabular-nums text-white/30">{new Date(f.at).toLocaleTimeString()}</span>
                  <span className="text-white/75">{f.text}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Widget>
    </div>
  );
}
