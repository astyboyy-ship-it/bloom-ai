"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ChevronDown, Gauge, KeyRound, Presentation, Server, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { BloomWordmark } from "@/components/bloom/logo";
import { LanguageSwitcher } from "@/components/bloom/language-switcher";
import { ENGINES } from "@/components/bloom/command/engines";
import { allocate, clockShift, SHIFTS } from "@/components/bloom/shift-plan";
import { useCommandCopy } from "@/components/bloom/command/locale";
import { useLicense } from "@/lib/license-context";
import type { Tier } from "@/lib/license/tiers";
import { ROLE_INFO } from "@/components/desk/rbac";
import { activeEnv, audit, touchUsage, updateSettings, useDeskSettings } from "@/components/desk/settings";
import { ARCHITECTURES } from "@/lib/architectures";
import { NAV_GROUPS, OS_NAV, type NavItem } from "./nav";
import { useOsCopy } from "./os-copy";
import { TelemetryProvider, useOsTelemetry } from "./telemetry-context";

export const TIER_PILL: Record<Tier, string> = { evaluation: "EVAL", tier1: "TIER 1", tier2: "TIER 2", tier3: "TIER 3", admin: "MASTER ADMIN" };

/**
 * BLOOM AI // OPERATING DESK: the shell every /desk page renders inside. Header telemetry is measured
 * (probe latency, SLA from the probe window, nodes from the licensed engines and the current shift), the
 * twelve pillars sit in the tab row, and Demo Mode flips the whole OS into presentation form via a data attribute.
 */
export function OsShell({ children }: { children: React.ReactNode }) {
  return (
    <TelemetryProvider>
      <Shell>{children}</Shell>
    </TelemetryProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { lang, dir } = useCommandCopy();
  const { settings } = useDeskSettings();
  const path = usePathname();
  const router = useRouter();
  const t = useOsCopy();

  // Older links (/desk?engine=…, /desk?hub=…) and the desktop app's first route land on the right pillar.
  useEffect(() => {
    if (path !== "/desk") return;
    const q = new URLSearchParams(window.location.search);
    const engine = q.get("engine");
    const hub = q.get("hub");
    if (hub === "settings") router.replace(`/desk/settings${window.location.hash}`);
    else if (hub === "calibration") router.replace(`/desk/engines/${engine ?? "sovereign"}?tab=calibration`);
    else if (engine) router.replace(`/desk/engines/${engine}`);
  }, [path, router]);

  // Neuro-adaptive weighting: every visit nudges the pillar (and engine or architecture) it opened.
  useEffect(() => {
    const nav = OS_NAV.find((n) => n.match(path));
    const keys = nav ? [`page:${nav.href}`] : [];
    const engine = path.match(/^\/desk\/engines\/([a-z]+)/)?.[1];
    if (engine) keys.push(`engine:${engine}`);
    const slug = path.match(/^\/desk\/architectures\/([^/?#]+)/)?.[1];
    const arch = slug && ARCHITECTURES.find((a) => a.slug === slug);
    if (arch) keys.push(`arch:${arch.id}`);
    if (keys.length) touchUsage(...keys);
  }, [path]);

  return (
    <div lang={lang} dir={dir} data-demo={settings.demoMode ? "on" : "off"} className="os-backdrop relative isolate flex min-h-dvh flex-col font-sans text-white">
      <Header />
      {!settings.onboarded && path !== "/desk/settings" && (
        <div className="flex flex-wrap items-center gap-3 border-b border-os-line bg-os-cyan/[0.04] px-4 py-2 text-[12.5px] text-white/75">
          <Sparkles className="size-4 shrink-0 text-os-cyan" />
          {t.shell.setup}
          <Link href="/setup" className="ms-auto rounded-full border border-os-cyan/40 px-3 py-1 text-[12px] text-os-cyan hover:bg-os-cyan/10">
            {t.shell.setupCta}
          </Link>
        </div>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function Header() {
  const path = usePathname();
  const { settings } = useDeskSettings();
  const { tier, engines } = useLicense();
  const { latency, uptime, sla } = useOsTelemetry();
  const env = activeEnv(settings);
  const t = useOsCopy();

  // Active nodes: every agent in the licensed engines, plus the compute nodes the current shift runs.
  const nodes = useMemo(() => {
    const shift = clockShift(new Date().getHours());
    const grid = Object.values(allocate(shift)).reduce((a, b) => a + b, 0) || SHIFTS[shift].nodes;
    return engines.reduce((s, k) => s + ENGINES[k].cards.reduce((n, c) => n + c.agents, 0), 0) + grid;
  }, [engines]);

  const slaTone = sla === "nominal" ? "text-os-emerald" : sla === "degraded" ? "text-amber-300" : "text-red-400";

  return (
    <header className="sticky top-0 z-30 border-b border-os-line bg-os-bg/80 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/desk" className="flex shrink-0 items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-os-cyan">
          {settings.branding.logo ? (
            // A data URL from the logo uploader.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.branding.logo} alt="" className="size-7 rounded-md object-contain" />
          ) : (
            <BloomWordmark className="text-[19px]" />
          )}
          <span className="font-mono text-[12px] font-semibold tracking-[0.22em] text-white">
            BLOOM AI <span className="text-os-cyan">{"//"}</span> OPERATING DESK
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]">
          <span className="flex items-center gap-1.5 rounded-full border border-os-line bg-os-panel/70 px-2.5 py-1 text-white/60">
            <Activity className={cn("size-3", slaTone)} />
            <span className={cn("tabular-nums", slaTone)}>{uptime === null ? "—" : `${Math.round(uptime * 100)}%`}</span> {t.shell.sla} {t.shell.slaState[sla] ?? sla}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-os-line bg-os-panel/70 px-2.5 py-1 text-white/60">
            <Gauge className="size-3 text-os-cyan" /> {t.shell.latency} <span className="os-glow tabular-nums">{latency === null ? "—" : `${latency}ms`}</span>
          </span>
          <span className="hidden items-center gap-1.5 rounded-full border border-os-line bg-os-panel/70 px-2.5 py-1 text-white/60 sm:flex">
            <Server className="size-3 text-os-emerald" /> {t.shell.nodes} <span className="tabular-nums text-os-emerald">{nodes.toLocaleString("en-US")}</span>
          </span>
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-1.5">
          <label className="flex items-center gap-1.5 rounded-full border border-os-line bg-os-panel/70 py-0.5 ps-2.5 pe-1 font-mono text-[10.5px] text-white/60">
            <span className="sr-only">{t.shell.environment}</span>
            <span className="size-1.5 rounded-full bg-os-emerald shadow-[0_0_8px_#34f5b5]" />
            <select
              value={settings.activeEnvId}
              onChange={(e) => {
                const next = settings.environments.find((x) => x.id === e.target.value);
                updateSettings({ activeEnvId: e.target.value });
                if (next) audit("settings", `Switched environment to ${next.name}`);
              }}
              className="max-w-44 bg-transparent py-0.5 text-white focus:outline-none"
            >
              {settings.environments.map((x) => (
                <option key={x.id} value={x.id} className="bg-os-panel">
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/desk/settings#license"
            title={env.region}
            className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.16em]", tier === "evaluation" ? "border-white/20 text-white/60" : "border-os-gold/50 text-os-gold")}
          >
            <KeyRound className="size-3" /> {TIER_PILL[tier]}
          </Link>
          <button
            type="button"
            aria-pressed={settings.demoMode}
            onClick={() => {
              updateSettings({ demoMode: !settings.demoMode });
              audit("settings", `${settings.demoMode ? "Left" : "Entered"} executive demo mode`);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
              settings.demoMode ? "border-os-violet/60 bg-os-violet/15 text-os-violet" : "border-os-line text-white/55 hover:text-white",
            )}
          >
            <Presentation className="size-3" /> {t.shell.demo(settings.demoMode)}
          </button>
          {settings.members.length > 1 && (
            <label className="flex items-center gap-1.5 rounded-full border border-os-line py-0.5 ps-2.5 pe-1 text-[11px] text-white/60">
              <UserRound className="size-3" />
              <span className="sr-only">{t.shell.actingAs}</span>
              <select
                value={settings.activeMemberId}
                onChange={(e) => {
                  const m = settings.members.find((x) => x.id === e.target.value);
                  updateSettings({ activeMemberId: e.target.value });
                  if (m) audit("member", `${m.name} is now acting (${ROLE_INFO[m.role].label})`);
                }}
                className="max-w-36 bg-transparent py-0.5 text-[11px] text-white focus:outline-none"
              >
                {settings.members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-os-panel">
                    {m.name} · {ROLE_INFO[m.role].label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <LanguageSwitcher />
        </div>
      </div>

      <nav aria-label="Operating Desk" className="flex flex-wrap gap-1.5 px-3 pb-2">
        {NAV_GROUPS.map((g) => (
          <NavGroup key={g.label} label={g.label} items={g.items} path={path} />
        ))}
      </nav>
    </header>
  );
}

/** One header menu: shows its active pillar, opens on click, closes on outside click, Escape or navigation. */
function NavGroup({ label: groupKey, items, path }: { label: string; items: NavItem[]; path: string }) {
  const t = useOsCopy();
  const label = t.groups[groupKey] ?? groupKey;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = items.find((i) => i.match(path));
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      ref.current?.querySelector("button")?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const Icon = active?.icon;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-2 focus-visible:outline-os-cyan",
          active ? "border-os-cyan/40 bg-os-cyan/[0.08] text-os-cyan shadow-[0_0_20px_-8px_rgb(0_240_255/0.6)]" : open ? "border-os-line text-white/85" : "border-transparent text-white/50 hover:border-os-line hover:text-white/85",
        )}
      >
        <span className="text-white/25">[</span>
        {label}
        {active && Icon && (
          <span className="hidden items-center gap-1 tracking-normal text-white/70 normal-case sm:flex">
            <span className="text-white/25">·</span>
            <Icon className="size-3" />
            {t.nav[active.href]?.name ?? active.name}
          </span>
        )}
        <span className="text-white/25">]</span>
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" aria-label={label} className="os-backdrop absolute start-0 top-full z-50 mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border border-os-line bg-os-panel/95 p-1.5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9),0_0_30px_-18px_rgb(0_240_255/0.5)]">
          {items.map(({ href, label: text, icon: ItemIcon, match }) => {
            const on = match(path);
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                aria-current={on ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors", on ? "bg-os-cyan/[0.08] text-os-cyan" : "text-white/70 hover:bg-white/[0.04] hover:text-white")}
              >
                <ItemIcon className="size-4 shrink-0" />
                {t.nav[href]?.label ?? text}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Page frame for an OS view: kicker, title, optional lede and actions, then the content. */
export function OsPage({ kicker: kickerEn, title: titleEn, lede: ledeEn, actions, children, className }: { kicker: string; title: string; lede?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  // Pages pass English; other languages take this route's entry (an empty field keeps the page's own, e.g. a pipeline name).
  const tr = useOsCopy().pages[usePathname()];
  const kicker = tr?.kicker || kickerEn;
  const title = tr?.title || titleEn;
  const lede = tr ? tr.lede || ledeEn : ledeEn;
  return (
    <main className={cn("mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="os-label text-os-cyan/80">{kicker}</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[36px]">{title}</h1>
          {lede && <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-white/55">{lede}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-6">{children}</div>
    </main>
  );
}
