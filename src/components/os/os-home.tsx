"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight, Boxes, BrainCircuit, Check, CheckCircle2, CircleDot, ClipboardCheck, CornerDownLeft, Download, FileText, Gavel, Loader2, Pencil, ShieldAlert, Terminal, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANIES, ENGINES, usdFmt, type EngineKey } from "@/components/bloom/command/engines";
import { useCommandCopy } from "@/components/bloom/command/locale";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { PRESETS } from "@/components/desk/copy";
import { fmtMs } from "@/components/desk/format";
import { can } from "@/components/desk/rbac";
import { RunConsoleDrawer, type ConsoleStatus } from "@/components/desk/run-console-drawer";
import { activeEnv, activeMember, audit, completeTask, decideApproval, updateSettings, usageScore, useDeskSettings, verifyAudit, verifyLedger, type DeskSettings, type RunRecord } from "@/components/desk/settings";
import { ARCHITECTURES } from "@/lib/architectures";
import { useLicense } from "@/lib/license-context";
import { OS_NAV } from "./nav";
import { useOsCopy } from "./os-copy";
import { TIER_PILL } from "./os-shell";
import { useOsTelemetry } from "./telemetry-context";

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/**
 * HOME: the operational command center. Who and what this workspace is running for, live workstreams and
 * deliverables, and the approval & action bay; architecture browsing lives on /desk/architectures, with only a
 * compact launcher here.
 */
export function OsHome() {
  const { lang } = useCommandCopy();
  const h = useOsCopy().home;
  const { settings } = useDeskSettings();
  const { engines, isUnlocked } = useLicense();
  const member = activeMember(settings);
  const mayRun = can(member.role, "run");
  const [engine, setEngine] = useState<EngineKey | null>(null);
  const [text, setText] = useState("");
  const [request, setRequest] = useState<{ engine: EngineKey; command: string; id: number } | null>(null);
  const [live, setLive] = useState<ConsoleStatus>({ engine: null, status: "idle", detail: "", startedAt: 0 });
  const ranked = byUsage(settings, engines, (k) => `engine:${k}`);
  const target = engine && isUnlocked(engine) ? engine : ranked[0];

  return (
    <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-5 sm:px-6">
      <ContextHeader live={live} />
      <AdaptiveStrip />
      <ArchitectureLauncher runs={settings.runs} />

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Live workstream feed" className="min-w-0 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim().length >= 3 && mayRun) setRequest({ engine: target, command: text.trim(), id: Date.now() });
            }}
            className="os-panel flex flex-col gap-2 rounded-2xl p-2.5 sm:flex-row sm:items-center"
          >
            <label className="flex shrink-0 items-center gap-2 rounded-xl border border-os-line bg-black/40 px-3 py-2 text-[13px]">
              <Terminal className="size-4 shrink-0 text-os-cyan" />
              <span className="sr-only">{h.engine}</span>
              <select value={target} onChange={(e) => setEngine(e.target.value as EngineKey)} className="bg-transparent text-white focus:outline-none">
                {engines.map((k) => (
                  <option key={k} value={k} className="bg-os-panel">
                    {ENGINES[k].index} {ENGINES[k].name}
                  </option>
                ))}
              </select>
            </label>
            <input value={text} onChange={(e) => setText(e.target.value)} disabled={!mayRun} placeholder={mayRun ? h.dispatchTo(ENGINES[target].name) : h.noDispatch} aria-label={h.task} className="min-w-0 flex-1 rounded-xl border border-os-line bg-black/40 px-3 py-2 text-[14px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none disabled:opacity-50" />
            <div className="flex gap-2">
              <button type="button" disabled={!mayRun} onClick={() => setText(PRESETS[lang][target])} className="rounded-xl border border-os-line px-3 py-2 text-[12px] text-white/60 transition-colors hover:border-os-cyan/30 hover:text-white disabled:opacity-40">
                {h.sample}
              </button>
              <button type="submit" disabled={text.trim().length < 3 || !mayRun} className="flex items-center gap-2 rounded-xl bg-os-cyan px-4 py-2 text-[13px] font-semibold text-black shadow-[0_0_24px_-8px_rgb(0_240_255/0.8)] transition-shadow hover:shadow-[0_0_32px_-6px_rgb(0_240_255/0.9)] disabled:opacity-40">
                {h.dispatch} <CornerDownLeft className="size-3.5 rtl:-scale-x-100" />
              </button>
            </div>
          </form>

          <Workstreams live={live} onOpen={() => request && setRequest({ ...request })} />
          <Deliverables runs={settings.runs} />
        </section>

        <ApprovalBay />
      </div>

      <RunConsoleDrawer request={request} lang={lang} onClose={() => setRequest(null)} onStatus={setLive} />
    </main>
  );
}

// ------------------------------------------------------------------------------------------- context header

function ContextHeader({ live }: { live: ConsoleStatus }) {
  const { settings } = useDeskSettings();
  const { tier, engines } = useLicense();
  const { manifest, latency, uptime, sla } = useOsTelemetry();
  const h = useOsCopy().home;
  const mayEdit = can(activeMember(settings).role, "settings");
  const [editing, setEditing] = useState(false);
  const p = settings.project;
  const env = activeEnv(settings);
  const pending = settings.approvals.filter((a) => a.status === "pending").length;
  const running = live.status === "running" ? 1 : 0;
  const slaTone = sla === "nominal" ? "text-os-emerald" : sla === "degraded" ? "text-amber-300" : "text-red-400";
  const set = (patch: Partial<typeof p>) => updateSettings((s) => ({ project: { ...s.project, ...patch } }));
  const engaged = [p.client, p.name].filter(Boolean).join(" · ");
  const live_ = manifest?.mode === "live";

  return (
    <header className="relative isolate grid gap-5 overflow-hidden rounded-2xl border border-os-cyan/20 bg-linear-to-br from-[#0d0f17] via-[#0a0c12] to-[#07080c] p-5 shadow-[0_0_0_1px_rgb(52_245_181/0.06),0_0_70px_-34px_rgb(0_240_255/0.7),inset_0_1px_0_rgb(255_255_255/0.04)] sm:p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center">
      {/* Accent light: a cyan-to-emerald hairline and a soft glow from the top corner. */}
      <span aria-hidden className="absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-os-cyan/70 to-os-emerald/60" />
      <span aria-hidden className="absolute -start-24 -top-28 -z-10 size-72 rounded-full bg-os-cyan/[0.07] blur-3xl" />
      <span aria-hidden className="absolute -bottom-32 end-10 -z-10 size-64 rounded-full bg-os-emerald/[0.05] blur-3xl" />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1.5 rounded-full border border-os-emerald/35 bg-os-emerald/[0.07] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-os-emerald">
            <span className="size-1.5 animate-pulse rounded-full bg-os-emerald shadow-[0_0_8px_#34f5b5]" /> {env.name} {"//"} {h.active}
          </span>
          <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]", live_ ? "border-os-cyan/35 text-os-cyan" : "border-os-gold/35 text-os-gold")}>{h.runtime(manifest ? manifest.mode : null)}</span>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">{h.license(TIER_PILL[tier])}</span>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{env.region}</span>
        </div>
        <h1 className="mt-3 font-mono text-[22px] font-semibold uppercase leading-tight tracking-[0.14em] sm:text-[30px]">
          <span className="bg-linear-to-b from-white via-[#d6dde8] to-[#7f8a9b] bg-clip-text text-transparent drop-shadow-[0_1px_0_rgb(255_255_255/0.08)]">Bloom AI</span>
          <span className="mx-2 text-os-cyan drop-shadow-[0_0_12px_rgb(0_240_255/0.7)] sm:mx-3">{"//"}</span>
          <span className="bg-linear-to-b from-white via-[#d6dde8] to-[#7f8a9b] bg-clip-text text-transparent">Operating Desk</span>
        </h1>
        {editing ? (
          <form
            className="mt-3 grid gap-1.5 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              setEditing(false);
              audit("settings", `Updated the active engagement: ${p.client || "no client"} · ${p.name || "untitled project"}`);
            }}
          >
            <input value={p.client} onChange={(e) => set({ client: e.target.value.slice(0, 60) })} placeholder={h.clientPh} aria-label={h.client} className="rounded-lg border border-os-line bg-black/40 px-2.5 py-1.5 text-[13px] text-white focus:border-os-cyan/50 focus:outline-none" />
            <input value={p.name} onChange={(e) => set({ name: e.target.value.slice(0, 60) })} placeholder={h.projectPh} aria-label={h.project} className="rounded-lg border border-os-line bg-black/40 px-2.5 py-1.5 text-[13px] text-white focus:border-os-cyan/50 focus:outline-none" />
            <div className="flex gap-1.5">
              <input value={p.scope} onChange={(e) => set({ scope: e.target.value.slice(0, 120) })} placeholder={h.scopePh} aria-label={h.scope} className="min-w-0 flex-1 rounded-lg border border-os-line bg-black/40 px-2.5 py-1.5 text-[13px] text-white focus:border-os-cyan/50 focus:outline-none" />
              <button type="submit" aria-label={h.save} className="rounded-lg border border-os-cyan/40 px-2.5 text-os-cyan hover:bg-os-cyan/10">
                <Check className="size-4" />
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-white/55">
            {settings.branding.logo && (
              // A data URL from the logo uploader.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.branding.logo} alt="" className="h-5 w-auto rounded-sm object-contain" />
            )}
            {engaged ? (
              <span className="min-w-0 truncate">
                <span className="text-white/35">{h.engagement}</span> <span className="text-white/80">{engaged}</span>
                {p.scope && <span className="text-white/35"> · {p.scope}</span>}
              </span>
            ) : (
              <span className="text-white/40">{h.licensed(engines.length)}</span>
            )}
            {mayEdit && (
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-white/40 transition-colors hover:bg-white/5 hover:text-os-cyan">
                <Pencil className="size-3" /> {engaged ? h.edit : h.setEngagement}
              </button>
            )}
          </p>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
        {(
          [
            // [label, value, tone, base salience, alert, related page]
            [h.tiles.runtime, manifest ? (manifest.mode === "live" ? "LIVE" : "SIM") : "…", manifest?.mode === "live" ? "text-os-emerald" : "text-os-gold", 1, false, "/desk/settings"],
            [h.tiles.sla, uptime === null ? "…" : `${Math.round(uptime * 100)}%`, slaTone, 2, sla !== "nominal" && uptime !== null, "/desk/global-pulse"],
            [h.tiles.latency, latency === null ? "…" : `${latency}ms`, "os-glow", 1.5, false, "/desk/audit"],
            [h.tiles.engines, `${engines.length}`, "text-white", 1.2, false, "/desk/engines"],
            [h.tiles.runs, String(running), running ? "text-os-cyan" : "text-white", 1.4, running > 0, "/desk/builder"],
            [h.tiles.approvals, String(pending), pending ? "text-amber-300" : "text-white", 1.8, pending > 0, "/desk/shadow-board"],
          ] as const
        )
          .map((t) => ({ t, w: t[3] + (t[4] ? 20 : 0) + usageScore(settings, `page:${t[5]}`) }))
          .sort((a, b) => b.w - a.w)
          .map(({ t: [k, v, tone, , alert] }) => (
            <div key={k} className={cn("rounded-lg border bg-[#07080c]/60 px-2.5 py-1.5 backdrop-blur-sm transition-colors", alert ? "border-amber-300/40 shadow-[0_0_18px_-10px_rgb(252_211_77/0.8)]" : "border-white/[0.07]")}>
              <dt className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">{k}</dt>
              <dd className={cn("font-mono text-[15px] tabular-nums", tone)}>{v}</dd>
            </div>
          ))}
      </dl>
    </header>
  );
}

// ------------------------------------------------------------------------------------------- launcher

function ArchitectureLauncher({ runs }: { runs: RunRecord[] }) {
  const h = useOsCopy().home;
  const { engines } = useLicense();
  const { settings } = useDeskSettings();
  const recent = [...runs].reverse().flatMap((r) => (r.kind === "architecture" ? [r.target] : []));
  const ids = [...new Set(recent)];
  // Licensed products first; on smaller tiers the rest still show, since their desks explain what unlocks them.
  const fit = (a: (typeof ARCHITECTURES)[number]) => usageScore(settings, `arch:${a.id}`) * 10 + Number(a.engines.every((k) => engines.includes(k)));
  const licensed = [...ARCHITECTURES].sort((a, b) => fit(b) - fit(a));
  const list = [...ids.map((id) => ARCHITECTURES.find((a) => a.id === id)).filter((a): a is (typeof ARCHITECTURES)[number] => Boolean(a)), ...licensed.filter((a) => !ids.includes(a.id))].slice(0, 6);
  const pipelines = settings.pipelines.slice(-2).reverse();

  return (
    <nav aria-label="Quick architecture launcher" className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
      <span className="os-label shrink-0">{ids.length ? h.recent : h.launch}</span>
      {list.map((a) => (
        <Link key={a.id} href={`/desk/architectures/${a.slug}`} className="group flex shrink-0 items-center gap-2 rounded-full border border-os-line bg-os-panel/70 py-1 ps-2.5 pe-3 text-[12px] text-white/75 transition-colors hover:border-os-cyan/40 hover:text-white">
          <span className="flex -space-x-1">
            {a.engines.slice(0, 4).map((k) => (
              <span key={k} className="size-2 rounded-full ring-1 ring-os-bg" style={{ background: PALETTES[k].c1 }} />
            ))}
          </span>
          {a.name}
          {ids.includes(a.id) && <span className="font-mono text-[9px] text-os-cyan/70">●</span>}
        </Link>
      ))}
      {pipelines.map((p) => (
        <Link key={p.id} href={`/desk/sandbox?id=${p.id}`} className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-os-line py-1 ps-2.5 pe-3 text-[12px] text-white/60 transition-colors hover:border-os-cyan/40 hover:text-white">
          <Boxes className="size-3" /> {p.name}
        </Link>
      ))}
      <Link href="/desk/architectures" className="flex shrink-0 items-center gap-1 px-2 text-[12px] text-os-cyan/80 hover:text-os-cyan">
        {h.allProducts} <ArrowUpRight className="size-3" />
      </Link>
    </nav>
  );
}

// ------------------------------------------------------------------------------------------- workstreams

type Stream = { engine: EngineKey; task: string; line: string; progress: number; at: number };

/** One stream per licensed engine, from its own workforce data: what it's working on and its latest action. */
function useWorkstreams(engines: EngineKey[]) {
  const reduce = useReducedMotion();
  const make = (k: EngineKey, progress = Math.random() * 0.8): Stream => {
    const card = pick(ENGINES[k].cards);
    const ev = pick(card.events);
    const amt = ev.amt ? Math.round((ev.amt[0] + Math.random() * (ev.amt[1] - ev.amt[0])) / 100) * 100 : 0;
    const line = ev.text
      .replace("{agent}", `Agent #${String(1 + Math.floor(Math.random() * card.agents)).padStart(2, "0")}`)
      .replace("{co}", pick(COMPANIES))
      .replace("{amt}", usdFmt(amt))
      .replace("{ch}", pick(["LinkedIn", "Reddit", "X", "Instagram"]));
    const task = card.title(card.agents, card.count).replace(/^\d+ agents? /, "");
    return { engine: k, task: task.charAt(0).toUpperCase() + task.slice(1), line, progress, at: Date.now() };
  };
  const [streams, setStreams] = useState<Stream[]>([]);
  const key = engines.join(",");
  useEffect(() => {
    setStreams(engines.map((k) => make(k)));
    // `make` reads only static engine data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      setStreams((ss) =>
        ss.map((s) => {
          if (Math.random() > 0.45) return s;
          const p = s.progress + 0.08 + Math.random() * 0.18;
          // A finished task rolls over to the engine's next one.
          return p >= 1 ? make(s.engine, 0.04) : { ...make(s.engine, p), task: s.task };
        }),
      );
    }, 1600);
    return () => clearInterval(t);
  }, [reduce]);
  return streams;
}

function Workstreams({ live, onOpen }: { live: ConsoleStatus; onOpen: () => void }) {
  const { engines } = useLicense();
  const { settings } = useDeskSettings();
  const h = useOsCopy().home;
  const streams = useWorkstreams(byUsage(settings, engines, (k) => `engine:${k}`));
  const elapsed = useTicker(live.status === "running", live.startedAt);
  return (
    <div className="os-panel rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-os-line px-4 py-2.5">
        <h2 className="os-label flex shrink-0 items-center gap-2 text-white/60">
          <span className="size-1.5 animate-pulse rounded-full bg-os-emerald shadow-[0_0_8px_#34f5b5]" /> {h.workstreams}
        </h2>
        <span className="text-[10.5px] text-white/35">{h.workstreamsNote}</span>
      </div>

      {live.engine && live.status !== "idle" && (
        <button type="button" onClick={onOpen} style={paletteVars(PALETTES[live.engine])} className="flex w-full items-center gap-3 border-b border-os-line bg-c-deep/30 px-4 py-3 text-start transition-colors hover:bg-c-deep/50">
          {live.status === "running" ? <Loader2 className="size-4 shrink-0 animate-spin text-c-2" /> : live.status === "done" ? <CheckCircle2 className="size-4 shrink-0 text-os-emerald" /> : <XCircle className="size-4 shrink-0 text-red-400" />}
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium text-white">
              {h.yourRun(ENGINES[live.engine].name, live.status === "running" ? "running" : live.status === "done" ? "done" : "failed")}
            </span>
            <span className="block truncate text-[12px] text-white/55">{live.detail || (live.status === "done" ? h.briefReady : "")}</span>
          </span>
          <span className="shrink-0 font-mono text-[11px] text-c-2">{live.status === "running" ? fmtMs(elapsed) : h.open}</span>
        </button>
      )}

      <ul className="divide-y divide-os-line/60">
        {streams.map((s) => (
          <li key={s.engine} style={paletteVars(PALETTES[s.engine])}>
            <Link href={`/desk/engines/${s.engine}`} className="group block px-4 py-2.5 transition-colors hover:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-c-1 shadow-[0_0_8px_var(--c-glow)]" />
                <span className="shrink-0 text-[13px] font-medium text-c-2">{ENGINES[s.engine].name}</span>
                <span className="min-w-0 truncate text-[13px] text-white/80">{s.task}</span>
                <span className="ms-auto shrink-0 font-mono text-[10.5px] tabular-nums text-white/40">{Math.round(s.progress * 100)}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-linear-to-r from-c-1 to-c-2 transition-[width] duration-700" style={{ width: `${Math.max(4, s.progress * 100)}%` }} />
              </div>
              <p className="mt-1 truncate text-[11.5px] text-white/45 group-hover:text-white/60">{s.line}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Deliverables({ runs }: { runs: RunRecord[] }) {
  const h = useOsCopy().home;
  const items = [...runs].reverse().filter((r) => r.ok).slice(0, 6);
  const download = (r: RunRecord) => {
    const url = URL.createObjectURL(new Blob([r.brief ?? `# ${r.label}\n\n${r.summary}\n`], { type: "text/markdown" }));
    Object.assign(document.createElement("a"), { href: url, download: `bloom-${r.target}-${r.runId}.md` }).click();
    URL.revokeObjectURL(url);
    audit("run", `Downloaded the ${r.label} deliverable (${r.runId})`);
  };
  const href = (r: RunRecord) => (r.kind === "architecture" ? `/desk/architectures/${ARCHITECTURES.find((a) => a.id === r.target)?.slug ?? ""}` : r.kind === "pipeline" ? `/desk/sandbox?id=${r.target}` : `/desk/engines/${r.target}`);
  return (
    <div className="os-panel rounded-2xl">
      <h2 className="os-label flex items-center gap-2 border-b border-os-line px-4 py-2.5 text-white/60">
        <FileText className="size-3.5 text-os-cyan" /> {h.deliverables}
      </h2>
      {items.length === 0 ? (
        <p className="px-4 py-5 text-[12.5px] text-white/40">{h.deliverablesEmpty}</p>
      ) : (
        <ul className="divide-y divide-os-line/60">
          {items.map((r) => (
            <li key={r.runId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <Link href={href(r)} className="block truncate text-[13px] text-white transition-colors hover:text-os-cyan">
                  {h.brief(r.label)}
                </Link>
                <span dir="auto" className="block truncate text-[11.5px] text-white/45">{r.summary || r.command}</span>
              </span>
              <span className="hidden shrink-0 font-mono text-[10.5px] text-white/35 sm:block">{new Date(r.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              <button type="button" onClick={() => download(r)} title={r.brief ? h.downloadBrief : h.downloadSummary} className="flex shrink-0 items-center gap-1 rounded-full border border-os-line px-2.5 py-1 text-[11.5px] text-white/65 transition-colors hover:border-os-cyan/40 hover:text-os-cyan">
                <Download className="size-3" /> .md
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------- approval bay

function ApprovalBay() {
  const { settings } = useDeskSettings();
  const role = activeMember(settings).role;
  const mayApprove = can(role, "approve");
  const pending = settings.approvals.filter((a) => a.status === "pending").reverse();
  const tasks = settings.approvals.filter((a) => a.status === "approved" && a.owner === "human" && !a.done).reverse();
  const exports = [...settings.audit].reverse().filter((a) => /export|download|pdf/i.test(a.message)).slice(0, 5);
  const boardFor = (id: string) => settings.boardSessions.findLast((b) => b.approvalId === id);
  const h = useOsCopy().home;

  return (
    <aside aria-label="Approval and action bay" className="min-w-0 space-y-4">
      <section className={cn("os-panel rounded-2xl", pending.length && "border-amber-300/30 shadow-[0_0_40px_-24px_rgb(252_211_77/0.6)]")}>
        <h2 className="os-label flex items-center justify-between border-b border-os-line px-4 py-2.5 text-white/60">
          <span className="flex items-center gap-2">
            <ShieldAlert className="size-3.5 text-amber-300" /> {h.pending}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px]", pending.length ? "bg-amber-300/15 text-amber-200" : "text-white/35")}>{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="px-4 py-5 text-[12.5px] text-white/40">{h.pendingEmpty}</p>
        ) : (
          <ul className="max-h-[22rem] divide-y divide-os-line/60 overflow-y-auto">
            {pending.map((a) => (
              <li key={a.id} style={paletteVars(PALETTES[a.engine])} className="px-4 py-3">
                <p className="flex items-center gap-1.5 font-mono text-[10px] text-white/40">
                  <span className="rounded border border-white/15 px-1 uppercase">{a.priority}</span>
                  <span className="truncate text-c-2">{a.source}</span>
                  <span className="ms-auto shrink-0">{new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </p>
                <p dir="auto" className="mt-1 text-[13px] font-medium text-white">{a.title}</p>
                <p dir="auto" className="mt-0.5 line-clamp-2 text-[12px] text-white/50">{a.detail}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Link href={`/desk/shadow-board?approval=${encodeURIComponent(a.id)}`} className="flex items-center gap-1 rounded-full border border-os-cyan/40 px-3 py-1 text-[11.5px] text-os-cyan transition-colors hover:bg-os-cyan/10">
                    <Gavel className="size-3" /> {boardFor(a.id) ? h.board(boardFor(a.id)!.verdict) : h.stressTest}
                  </Link>
                  <button type="button" disabled={!mayApprove} onClick={() => decideApproval(a.id, "approved")} className="flex items-center gap-1 rounded-full border border-os-emerald/40 px-3 py-1 text-[11.5px] text-os-emerald transition-colors hover:bg-os-emerald/10 disabled:opacity-35" title={mayApprove ? undefined : h.noApprove}>
                    <Check className="size-3" /> {h.approve}
                  </button>
                  <button type="button" disabled={!mayApprove} onClick={() => decideApproval(a.id, "rejected")} className="flex items-center gap-1 rounded-full border border-red-400/40 px-3 py-1 text-[11.5px] text-red-200 transition-colors hover:bg-red-500/10 disabled:opacity-35">
                    <X className="size-3" /> {h.reject}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="os-panel rounded-2xl">
        <h2 className="os-label flex items-center justify-between border-b border-os-line px-4 py-2.5 text-white/60">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="size-3.5 text-os-cyan" /> {h.tasks}
          </span>
          <span className="font-mono text-[10px] text-white/35">{tasks.length}</span>
        </h2>
        {tasks.length === 0 ? (
          <p className="px-4 py-4 text-[12.5px] text-white/40">{h.tasksEmpty}</p>
        ) : (
          <ul className="divide-y divide-os-line/60">
            {tasks.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                <CircleDot className="mt-0.5 size-3.5 shrink-0 text-os-cyan" />
                <span className="min-w-0 flex-1">
                  <span dir="auto" className="block text-[12.5px] text-white">{a.title}</span>
                  <span className="block text-[11px] text-white/40">
                    {a.source} · {h.approvedBy(a.by ?? "")}
                  </span>
                </span>
                <button type="button" onClick={() => completeTask(a.id)} className="shrink-0 rounded-full border border-os-line px-2.5 py-1 text-[11px] text-white/65 transition-colors hover:border-os-emerald/40 hover:text-os-emerald">
                  {h.markDone}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="os-panel rounded-2xl">
        <h2 className="os-label flex items-center gap-2 border-b border-os-line px-4 py-2.5 text-white/60">
          <Download className="size-3.5 text-os-cyan" /> {h.exports}
        </h2>
        {exports.length === 0 ? (
          <p className="px-4 py-4 text-[12.5px] text-white/40">{h.exportsEmpty}</p>
        ) : (
          <ul className="space-y-1.5 px-4 py-3">
            {exports.map((e) => (
              <li key={e.id} className="flex gap-2 text-[12px]">
                <span className="shrink-0 font-mono text-[10.5px] text-white/35">{new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span dir="auto" className="min-w-0 truncate text-white/70">{e.message}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/desk/audit" className="flex items-center justify-end gap-1 border-t border-os-line px-4 py-2 text-[11.5px] text-os-cyan/75 hover:text-os-cyan">
          {h.auditTrail} <ArrowUpRight className="size-3" />
        </Link>
      </section>
    </aside>
  );
}

/** Orders keys by their decayed usage weight, keeping the original order for ties. */
function byUsage<T extends string>(s: DeskSettings, keys: T[], key: (k: T) => string): T[] {
  return keys.map((k, i) => ({ k, i, w: usageScore(s, key(k)) })).sort((a, b) => b.w - a.w || a.i - b.i).map((x) => x.k);
}

/**
 * Neuro-adaptive layer: active alerts rise to the top, and the operator's most-used pillars and engines become
 * one-click shortcuts. All weights are local (decaying, 3-day half-life) and can be reset.
 */
function AdaptiveStrip() {
  const { settings } = useDeskSettings();
  const { sla } = useOsTelemetry();
  const t = useOsCopy();
  const h = t.home;
  const pending = settings.approvals.filter((a) => a.status === "pending").length;
  const day = Date.now() - 86_400_000;
  const threats = settings.audit.filter((a) => a.kind === "security" && a.at >= day).length;
  const auditOk = verifyAudit(settings.audit).ok;
  const ledgerOk = verifyLedger(settings.runs).ok;
  const alerts = [
    pending > 0 && { href: "/desk/shadow-board", text: h.approvalsWaiting(pending), tone: "amber" },
    threats > 0 && { href: "/desk/threat-matrix", text: h.securityEvents(threats), tone: "red" },
    !auditOk && { href: "/desk/audit", text: h.auditBroken, tone: "red" },
    !ledgerOk && { href: "/desk/audit", text: h.ledgerBroken, tone: "red" },
    sla === "degraded" && { href: "/desk/global-pulse", text: h.slaDegraded, tone: "amber" },
    sla === "offline" && { href: "/desk/global-pulse", text: h.runtimeOffline, tone: "red" },
  ].filter((x): x is { href: string; text: string; tone: string } => Boolean(x));
  const pages = OS_NAV.filter((n) => n.href !== "/desk")
    .map((n) => ({ n, w: usageScore(settings, `page:${n.href}`) }))
    .filter((x) => x.w > 0.05)
    .sort((a, b) => b.w - a.w)
    .slice(0, 4);
  const learned = Object.keys(settings.usage).length > 0;

  if (!alerts.length && !pages.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {alerts.map((a) => (
        <Link key={a.text} href={a.href} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors", a.tone === "red" ? "border-red-400/40 bg-red-500/[0.06] text-red-200 hover:bg-red-500/10" : "border-amber-300/40 bg-amber-300/[0.06] text-amber-100 hover:bg-amber-300/10")}>
          <span className={cn("size-1.5 animate-pulse rounded-full", a.tone === "red" ? "bg-red-400" : "bg-amber-300")} /> {a.text}
        </Link>
      ))}
      {pages.length > 0 && (
        <span className="ms-auto flex flex-wrap items-center gap-1.5">
          <span className="os-label flex items-center gap-1" title={h.shortcutsTitle}>
            <BrainCircuit className="size-3 text-os-violet" /> {h.shortcuts}
          </span>
          {pages.map(({ n }) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-1.5 rounded-full border border-os-line px-2.5 py-1 text-[12px] text-white/70 transition-colors hover:border-os-cyan/40 hover:text-white">
              <n.icon className="size-3" /> {t.nav[n.href]?.name ?? n.name}
            </Link>
          ))}
          {learned && (
            <button type="button" onClick={() => updateSettings({ usage: {} })} className="px-1 text-[11px] text-white/35 hover:text-white/70">
              {h.reset}
            </button>
          )}
        </span>
      )}
    </div>
  );
}

function useTicker(on: boolean, since: number) {
  const [now, setNow] = useState(0);
  const sinceRef = useRef(since);
  sinceRef.current = since;
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now() - sinceRef.current), 200);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

