"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Boxes, CheckCircle2, CornerDownLeft, Lock, Terminal, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { useCommandCopy } from "@/components/bloom/command/locale";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { PRESETS } from "@/components/desk/copy";
import { fmtMs } from "@/components/desk/format";
import { can } from "@/components/desk/rbac";
import { RunConsoleDrawer } from "@/components/desk/run-console-drawer";
import { activeEnv, activeMember, useDeskSettings } from "@/components/desk/settings";
import { ARCHITECTURES } from "@/lib/architectures";
import { useLicense } from "@/lib/license-context";
import { TIER_INFO } from "@/lib/license/tiers";
import { OsPage, TIER_PILL } from "./os-shell";
import { useOsTelemetry } from "./telemetry-context";

/** HOME: the central command portal. Live status, a quick command, the licensed products, recent runs and activity. */
export function OsHome() {
  const { lang } = useCommandCopy();
  const { settings } = useDeskSettings();
  const { tier, engines, isUnlocked } = useLicense();
  const { manifest, latency, uptime, sla } = useOsTelemetry();
  const member = activeMember(settings);
  const mayRun = can(member.role, "run");
  const [engine, setEngine] = useState<EngineKey | null>(null);
  const [text, setText] = useState("");
  const [request, setRequest] = useState<{ engine: EngineKey; command: string; id: number } | null>(null);
  const target = engine && isUnlocked(engine) ? engine : engines[0];

  const today = useMemo(() => {
    const since = new Date().setHours(0, 0, 0, 0);
    const runs = settings.runs.filter((r) => r.at >= since);
    return { runs: runs.length, ok: runs.filter((r) => r.ok).length, tokens: runs.reduce((s, r) => s + r.tokens.input + r.tokens.output, 0) };
  }, [settings.runs]);
  const approvalsLogged = settings.audit.filter((a) => a.kind === "approval").length;
  const products = ARCHITECTURES.map((a) => ({ ...a, open: a.engines.every((k) => engines.includes(k)) }));

  const stats: { label: string; value: string; tone?: string; hint: string }[] = [
    { label: "Runtime", value: manifest ? (manifest.mode === "live" ? "LIVE" : "SIMULATION") : "…", tone: manifest?.mode === "live" ? "text-os-emerald" : "text-os-gold", hint: manifest ? `${manifest.provider} · ${manifest.model}` : "Resolving" },
    { label: "SLA", value: uptime === null ? "…" : `${Math.round(uptime * 100)}%`, tone: sla === "nominal" ? "text-os-emerald" : "text-amber-300", hint: sla },
    { label: "Latency", value: latency === null ? "…" : `${latency}ms`, tone: "os-glow", hint: "Measured every 10s" },
    { label: "Engines", value: `${engines.length}/8`, tone: "text-white", hint: TIER_INFO[tier].label },
    { label: "Runs today", value: String(today.runs), tone: "text-white", hint: `${today.ok} succeeded · ${today.tokens.toLocaleString("en-US")} tokens` },
    { label: "Approvals", value: String(approvalsLogged), tone: "text-white", hint: "Decisions on the record" },
  ];

  return (
    <OsPage
      kicker={`${activeEnv(settings).name} · ${TIER_PILL[tier]}`}
      title={settings.branding.orgName ? `${settings.branding.orgName} command portal` : "Central command portal"}
      lede={`Welcome back, ${member.name}. Command any engine, open an architecture product, or review what the workforce did today.`}
    >
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="os-panel rounded-xl px-4 py-3">
            <dt className="os-label">{s.label}</dt>
            <dd className={cn("mt-1 font-mono text-[22px] tabular-nums", s.tone)}>{s.value}</dd>
            <dd className="truncate text-[11px] text-white/40">{s.hint}</dd>
          </div>
        ))}
      </dl>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length >= 3 && mayRun) setRequest({ engine: target, command: text.trim(), id: Date.now() });
        }}
        className="os-panel mt-5 flex flex-col gap-2 rounded-2xl p-3 sm:flex-row sm:items-center"
      >
        <label className="flex items-center gap-2 rounded-xl border border-os-line bg-black/40 px-3 py-2 text-[13px]">
          <Terminal className="size-4 shrink-0 text-os-cyan" />
          <span className="sr-only">Engine</span>
          <select value={target} onChange={(e) => setEngine(e.target.value as EngineKey)} className="bg-transparent text-white focus:outline-none">
            {engines.map((k) => (
              <option key={k} value={k} className="bg-os-panel">
                {ENGINES[k].index} {ENGINES[k].name}
              </option>
            ))}
          </select>
        </label>
        <input value={text} onChange={(e) => setText(e.target.value)} disabled={!mayRun} placeholder={mayRun ? `Command ${ENGINES[target].name}…` : "Your role can't run engines"} aria-label="Command" className="min-w-0 flex-1 rounded-xl border border-os-line bg-black/40 px-3 py-2 text-[14px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none disabled:opacity-50" />
        <div className="flex gap-2">
          <button type="button" disabled={!mayRun} onClick={() => setText(PRESETS[lang][target])} className="rounded-xl border border-os-line px-3 py-2 text-[12px] text-white/60 hover:text-white disabled:opacity-40">
            Sample
          </button>
          <button type="submit" disabled={text.trim().length < 3 || !mayRun} className="flex items-center gap-2 rounded-xl bg-os-cyan px-5 py-2 text-[13px] font-semibold text-black shadow-[0_0_30px_-8px_rgb(0_240_255/0.8)] disabled:opacity-40">
            Execute <CornerDownLeft className="size-3.5 rtl:-scale-x-100" />
          </button>
        </div>
      </form>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="os-label text-white/60">Architecture products</h2>
            <Link href="/desk/architectures" className="flex items-center gap-1 text-[12px] text-os-cyan/80 hover:text-os-cyan">
              All 10 <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {products.slice(0, 6).map((a) => (
              <Link key={a.id} href={`/desk/architectures/${a.slug}`} className={cn("os-panel group rounded-xl p-3.5 transition-[border-color]", a.open ? "hover:border-os-cyan/40" : "opacity-60")}>
                <div className="flex items-center justify-between">
                  <Boxes className="size-4 text-os-cyan/70" />
                  {!a.open && <Lock className="size-3.5 text-white/40" />}
                </div>
                <p className="mt-2 text-[14px] font-medium text-white">{a.name}</p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {a.engines.map((k) => (
                    <span key={k} style={paletteVars(PALETTES[k])} className="rounded-full border border-c-edge/60 px-1.5 font-mono text-[9px] text-c-2">
                      {ENGINES[k].name}
                    </span>
                  ))}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="demo-hide">
          <h2 className="os-label text-white/60">Recent runs</h2>
          <ul className="os-panel mt-2 divide-y divide-os-line rounded-xl">
            {settings.runs.length === 0 && <li className="p-4 text-[12.5px] text-white/40">No runs yet. Execute a command above.</li>}
            {[...settings.runs]
              .reverse()
              .slice(0, 7)
              .map((r) => (
                <li key={r.runId} className="flex items-center gap-3 px-3.5 py-2.5">
                  {r.ok ? <CheckCircle2 className="size-4 shrink-0 text-os-emerald" /> : <XCircle className="size-4 shrink-0 text-red-400" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-white">{r.label}</span>
                    <span dir="auto" className="block truncate text-[11.5px] text-white/40">{r.command}</span>
                  </span>
                  <span className="shrink-0 text-end font-mono text-[10.5px] text-white/40">
                    {fmtMs(r.ms)}
                    <br />
                    {new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
          </ul>
          <h2 className="os-label mt-5 text-white/60">Live activity</h2>
          <ol className="os-panel mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl p-3 font-mono text-[11.5px]">
            {settings.audit.length === 0 && <li className="text-white/35">Nothing on the record yet.</li>}
            {[...settings.audit]
              .reverse()
              .slice(0, 14)
              .map((a) => (
                <li key={a.id} className="flex gap-2">
                  <span className="shrink-0 text-white/30">{new Date(a.at).toLocaleTimeString([], { hour12: false })}</span>
                  <span className="w-20 shrink-0 uppercase text-os-cyan/70">{a.kind}</span>
                  <span dir="auto" className="min-w-0 truncate text-white/70">{a.message}</span>
                </li>
              ))}
          </ol>
        </section>
      </div>
      <RunConsoleDrawer request={request} lang={lang} onClose={() => setRequest(null)} />
    </OsPage>
  );
}
