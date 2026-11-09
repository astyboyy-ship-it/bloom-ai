"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, CircleX, Server, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLicense } from "@/lib/license-context";
import { useDeskSettings, verifyAudit, verifyLedger } from "@/components/desk/settings";
import { useOsTelemetry } from "@/components/os/telemetry-context";
import { CpButton, Widget } from "@/components/control-plane/widget";
import { useExperienceCopy } from "../copy";

/* ----------------------------------------------------------------------------------------- node manager */

type ClusterState = Record<string, { cordoned: boolean; drained: boolean }>;
const STORE = "bloom-enterprise-clusters";

/**
 * Cluster Node Manager: one cluster per workspace environment (the environments and regions in Settings), with
 * the key's maxActiveNodes split across schedulable clusters. Cordon stops new scheduling; drain also moves the
 * cluster's nodes onto the others. Load is modeled and drifts like a live gauge.
 */
export function ClusterNodeManager() {
  const e = useExperienceCopy().enterprise;
  const { settings } = useDeskSettings();
  const { permissions } = useLicense();
  const max = permissions?.maxActiveNodes ?? 0;
  const [state, setState] = useState<ClusterState>({});
  const [load, setLoad] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setState(JSON.parse(raw) as ClusterState);
    } catch {
      // Defaults: every cluster schedulable.
    }
  }, []);
  const save = (next: ClusterState) => {
    setState(next);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {
      // Kept for this page view.
    }
  };

  const envs = settings.environments;
  useEffect(() => {
    const tick = () => setLoad((prev) => Object.fromEntries(envs.map((x, i) => [x.id, Math.max(8, Math.min(97, (prev[x.id] ?? 42 + i * 9) + (Math.random() - 0.5) * 8))])));
    tick();
    const id = setInterval(tick, 1600);
    return () => clearInterval(id);
  }, [envs]);

  const active = envs.filter((x) => !state[x.id]?.drained);
  const share = active.length ? Math.floor(max / active.length) : 0;
  const nodesOf = (id: string) => (state[id]?.drained ? 0 : share);
  const scheduled = envs.reduce((s, x) => s + nodesOf(x.id), 0);
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <Widget icon={Server} title={e.nodesTitle} sub={e.nodesSub(fmt(max))} actions={<span className="font-mono text-[10.5px] text-white/50">{e.capacity(fmt(scheduled), fmt(max))}</span>}>
      <ul className="space-y-1.5">
        {envs.map((x) => {
          const s = state[x.id] ?? { cordoned: false, drained: false };
          const l = s.drained ? 0 : (load[x.id] ?? 0);
          const status = s.cordoned || s.drained ? "cordoned" : l > 85 ? "degraded" : "healthy";
          return (
            <li key={x.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 sm:grid-cols-[minmax(0,12rem)_5rem_minmax(0,1fr)_auto]">
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] text-white/85">{x.name}</span>
                <span className="block font-mono text-[10px] text-white/40">{x.region}</span>
              </span>
              <span className="hidden font-mono text-[11.5px] tabular-nums text-white/70 sm:block">
                {fmt(nodesOf(x.id))} <span className="text-white/35">{e.nodes.toLowerCase()}</span>
              </span>
              <span className="hidden items-center gap-2 sm:flex">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <span className={cn("block h-full rounded-full transition-[width] duration-700", status === "degraded" ? "bg-amber-300" : "bg-os-cyan")} style={{ width: `${l}%` }} />
                </span>
                <span className="w-9 text-end font-mono text-[10.5px] tabular-nums text-white/60">{Math.round(l)}%</span>
                <span className={cn("w-20 font-mono text-[9.5px] uppercase tracking-[0.14em]", status === "healthy" ? "text-os-emerald" : status === "degraded" ? "text-amber-300" : "text-white/40")}>{e.status[status]}</span>
              </span>
              <span className="flex gap-1.5">
                <CpButton tone="quiet" onClick={() => save({ ...state, [x.id]: { cordoned: !s.cordoned, drained: s.cordoned ? false : s.drained } })}>
                  {s.cordoned ? e.uncordon : e.cordon}
                </CpButton>
                <CpButton tone="warn" disabled={s.drained || active.length <= 1} onClick={() => save({ ...state, [x.id]: { cordoned: true, drained: true } })}>
                  {e.drain}
                </CpButton>
              </span>
            </li>
          );
        })}
      </ul>
      {Object.values(state).some((s) => s.cordoned || s.drained) && (
        <CpButton className="mt-2" onClick={() => save({})}>
          {e.rebalance}
        </CpButton>
      )}
    </Widget>
  );
}

/* ------------------------------------------------------------------------------------------- SOC 2 board */

type Check = { id: string; name: string; state: "pass" | "warn" | "fail"; detail: string };

/**
 * SOC 2 Compliance Board: real checks of this workspace's own controls, mapped to Trust Services Criteria. A
 * readiness view, not an audit: it verifies the audit hash chain and the run ledger seals, and reads the RBAC
 * roster, the license key, credential storage, probe uptime and recent security events.
 */
export function Soc2Board() {
  const e = useExperienceCopy().enterprise;
  const c = e.controls;
  const { settings, persistence } = useDeskSettings();
  const { info } = useLicense();
  const { uptime } = useOsTelemetry();

  const checks = useMemo<Check[]>(() => {
    const audit = verifyAudit(settings.audit);
    const ledger = verifyLedger(settings.runs);
    const roles = new Set(settings.members.map((m) => m.role)).size;
    const week = Date.now() - 7 * 86_400_000;
    const security = settings.audit.filter((x) => x.kind === "security" && x.at >= week).length;
    const up = uptime === null ? null : Math.round(uptime * 1000) / 10;
    return [
      { id: "CC6.1", name: c.rbac.name, state: settings.members.length > 0 ? "pass" : "fail", detail: c.rbac.detail(settings.members.length, roles) },
      { id: "CC6.6", name: c.key.name, state: !info ? "fail" : info.dev ? "warn" : "pass", detail: !info ? c.key.none : info.dev ? c.key.dev : c.key.ok },
      { id: "CC7.2", name: c.audit.name, state: audit.ok ? "pass" : "fail", detail: audit.ok ? c.audit.ok(audit.checked) : c.audit.broken(audit.brokenAt ?? 0) },
      { id: "PI1.4", name: c.ledger.name, state: ledger.ok ? "pass" : "fail", detail: ledger.ok ? c.ledger.ok(ledger.checked) : c.ledger.broken },
      { id: "CC6.7", name: c.retention.name, state: persistence === "session" ? "pass" : "warn", detail: persistence === "session" ? c.retention.session : c.retention.device },
      { id: "A1.2", name: c.availability.name, state: up === null ? "warn" : up >= 99 ? "pass" : "warn", detail: up === null ? c.availability.none : up >= 99 ? c.availability.ok(up) : c.availability.low(up) },
      { id: "CC7.3", name: c.security.name, state: security ? "warn" : "pass", detail: security ? c.security.some(security) : c.security.none },
    ];
  }, [settings.audit, settings.runs, settings.members, persistence, info, uptime, c]);

  const passing = checks.filter((x) => x.state === "pass").length;
  const Icon = { pass: CheckCircle2, warn: CircleAlert, fail: CircleX };
  const tone = { pass: "text-os-emerald", warn: "text-amber-300", fail: "text-red-300" };

  return (
    <Widget icon={ShieldCheck} title={e.socTitle} sub={e.socSub} actions={<span className="bloom-glow font-mono text-[12px] tabular-nums">{e.score(passing, checks.length)}</span>}>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <span className="block h-full rounded-full bg-os-cyan transition-[width] duration-700" style={{ width: `${(passing / checks.length) * 100}%`, boxShadow: "0 0 12px var(--tier-glow)" }} />
      </div>
      <ul className="grid gap-1.5 md:grid-cols-2">
        {checks.map((x) => {
          const I = Icon[x.state];
          return (
            <li key={x.id} className="flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
              <I className={cn("mt-0.5 size-4 shrink-0", tone[x.state])} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12.5px] text-white/85">{x.name}</span>
                  <span className="shrink-0 font-mono text-[9.5px] text-white/35">{x.id}</span>
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-white/50">{x.detail}</span>
              </span>
              <span className={cn("shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em]", tone[x.state])}>{e.state[x.state]}</span>
            </li>
          );
        })}
      </ul>
    </Widget>
  );
}
