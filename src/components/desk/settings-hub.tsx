"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Building2, Check, Download, Eye, EyeOff, KeyRound, Layers, Loader2, Moon, Plug, ShieldCheck, Sun, Trash2, Upload, UserPlus, X, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES } from "@/components/bloom/command/engines";
import type { CommandManifest } from "@/lib/engines/events";
import { useLicense } from "@/lib/license-context";
import { TIER_ENGINES, TIER_INFO, type Tier } from "@/lib/license/tiers";
import type { HUB_COPY } from "./hub-copy";
import { readLogo } from "./logo";
import { ROLES, ROLE_INFO, can, type Role } from "./rbac";
import {
  activeMember,
  audit,
  clearSettings,
  keyHeaders,
  setPersistence,
  updateSettings,
  useDeskSettings,
  type AuditKind,
  type Credentials,
  type Persistence,
  type ShiftDefault,
} from "./settings";
import type { Sla } from "./use-telemetry";

type C = (typeof HUB_COPY)["en"];
type Telemetry = { manifest: CommandManifest | null; latency: number | null; sla: Sla };

/** Hub 02: license, gateway credentials, branding and team, shifts, persistence, diagnostics and audit. */
export function SettingsHub({ c, telemetry }: { c: C; telemetry: Telemetry }) {
  const { settings } = useDeskSettings();
  const role = activeMember(settings).role;
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 sm:p-6 lg:grid-cols-2">
      <LicensePanel allowed={can(role, "license")} />
      <GatewayPanel c={c} allowed={can(role, "settings")} />
      <TeamPanel allowed={can(role, "members")} />
      <div className="grid gap-5">
        <ShiftPanel c={c} allowed={can(role, "settings")} />
        <PersistencePanel c={c} allowed={can(role, "settings")} />
      </div>
      <DiagnosticsPanel telemetry={telemetry} canClear={can(role, "settings")} />
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ shared bits

export function Panel({ id, icon: Icon, title, body, className, locked, children }: { id?: string; icon: LucideIcon; title: string; body?: string; className?: string; locked?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("glass scroll-mt-20 rounded-2xl p-5", className)}>
      <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#f0d59a]/85">
        <Icon className="size-3.5" /> {title}
        {locked && <span className="ms-auto rounded-full border border-white/15 px-2 py-0.5 text-[8.5px] tracking-[0.14em] text-white/45">Read-only for your role</span>}
      </h2>
      {body && <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">{body}</p>}
      <fieldset disabled={locked} className="mt-4 min-w-0 disabled:opacity-60">
        {children}
      </fieldset>
    </section>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 text-[13px] text-white/75">
      {label}
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-[#f0d59a]" : "bg-white/15")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-[inset-inline-start]", checked ? "start-[18px]" : "start-0.5")} />
      </button>
    </label>
  );
}

const input = "w-full min-w-0 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:border-[#f0d59a]/50 focus:outline-none";
const btn = "inline-flex items-center gap-1.5 rounded-full border border-[#f0d59a]/40 px-3.5 py-1.5 text-[12px] text-[#f3e2b8] transition-colors hover:bg-[#f0d59a]/10 disabled:opacity-40";

// ------------------------------------------------------------------------------------------------ license

function LicensePanel({ allowed }: { allowed: boolean }) {
  const { tier, info, engines, activate, deactivate, devIssue, devAvailable, checking } = useLicense();
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    const r = await activate(key);
    setMsg(r.ok ? { ok: true, text: `Activated ${TIER_INFO[r.info.tier].label} for ${r.info.org}.` } : { ok: false, text: r.message });
    if (r.ok) setKey("");
  };

  return (
    <Panel id="license" icon={ShieldCheck} title="License key management" body="Your license decides which architectures this workspace can run. Keys are verified by the Bloom AI server on activation and on every run." locked={!allowed}>
      <div className="rounded-xl border border-[#f0d59a]/25 bg-[#f0d59a]/[0.05] p-4">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/45">Active license</p>
        <p className="mt-1 text-[17px] font-medium text-[#f6ead2]">{TIER_INFO[tier].label}</p>
        <p className="mt-0.5 text-[12px] text-white/55">{info ? `${info.org} · ${info.expiresAt ? `expires ${info.expiresAt}` : "no expiry"}${info.dev ? " · development key" : ""}` : TIER_INFO[tier].blurb}</p>
        <p className="mt-2 flex flex-wrap gap-1">
          {engines.map((k) => (
            <span key={k} className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[9.5px] text-white/70">
              {ENGINES[k].index} {ENGINES[k].name}
            </span>
          ))}
        </p>
        {info && (
          <button type="button" onClick={deactivate} className="mt-3 text-[11.5px] text-white/45 underline-offset-2 hover:text-white/80 hover:underline">
            Remove license
          </button>
        )}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="BLOOM-…" spellCheck={false} autoComplete="off" dir="ltr" className={cn(input, "font-mono text-[12px]")} aria-label="License key" />
        <button type="submit" disabled={!key.trim() || checking} className={btn}>
          {checking ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />} Activate
        </button>
      </form>
      {msg && <p className={cn("mt-2 text-[12px]", msg.ok ? "text-emerald-300" : "text-red-300")}>{msg.text}</p>}

      <div className="mt-4 grid gap-1.5 sm:grid-cols-3">
        {(["tier1", "tier2", "tier3"] as Tier[]).map((t) => (
          <div key={t} className={cn("rounded-lg border p-2.5", tier === t ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.06]" : "border-white/[0.08]")}>
            <p className="text-[12px] font-medium text-white/85">{TIER_INFO[t].label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-white/45">{TIER_ENGINES[t].map((k) => ENGINES[k].name).join(" · ")}</p>
          </div>
        ))}
      </div>

      {devAvailable && (
        <div className="mt-4 rounded-xl border border-dashed border-white/15 p-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/45">Development · tier switcher</p>
          <p className="mt-1 text-[11.5px] text-white/40">Mints a signed 30-day development key on this server. Disabled in production unless BLOOM_DEV_LICENSES=true.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["tier1", "tier2", "tier3", "admin"] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={checking}
                onClick={async () => {
                  const r = await devIssue(t);
                  setMsg(r.ok ? { ok: true, text: `Switched to ${TIER_INFO[t].label}.` } : { ok: false, text: r.message });
                }}
                className={cn("rounded-full border px-2.5 py-1 font-mono text-[10.5px]", tier === t ? "border-[#f0d59a]/60 text-[#f3e2b8]" : "border-white/15 text-white/60 hover:text-white")}
              >
                {TIER_INFO[t].short}
              </button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------------------------------------ gateway

type TestState = { status: "idle" | "testing" | "ok" | "fail"; text: string; ms?: number };

const SECRET_FIELDS: { key: keyof Credentials; label: string; prefix?: string; provider?: "anthropic" | "openrouter" | "openai"; note: string }[] = [
  { key: "anthropic", label: "Anthropic API key", prefix: "sk-ant-", provider: "anthropic", note: "Runs engines on Claude directly." },
  { key: "openrouter", label: "OpenRouter API key", prefix: "sk-or-", provider: "openrouter", note: "Runs engines through OpenRouter; required for GPT-4o, DeepSeek and Llama." },
  { key: "openai", label: "OpenAI API key", prefix: "sk-", provider: "openai", note: "Stored for integrations; engines reach OpenAI models through OpenRouter." },
];

function GatewayPanel({ c, allowed }: { c: C; allowed: boolean }) {
  const { settings } = useDeskSettings();
  const [tests, setTests] = useState<Partial<Record<keyof Credentials, TestState>>>({});
  const set = (k: keyof Credentials, v: string) => updateSettings((s) => ({ keys: { ...s.keys, [k]: v } }));

  const testProvider = async (k: keyof Credentials, provider: "anthropic" | "openrouter" | "openai") => {
    setTests((t) => ({ ...t, [k]: { status: "testing", text: "Pinging provider…" } }));
    try {
      const res = await fetch("/api/settings/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, key: settings.keys[k] }) });
      const d = (await res.json()) as { ok?: boolean; latencyMs?: number; detail?: string; error?: { message?: string } };
      const ok = Boolean(d.ok);
      setTests((t) => ({ ...t, [k]: { status: ok ? "ok" : "fail", text: d.detail ?? d.error?.message ?? "Test failed.", ms: d.latencyMs } }));
      audit("credentials", `Tested the ${provider} key: ${ok ? "connected" : "failed"}`);
    } catch {
      setTests((t) => ({ ...t, [k]: { status: "fail", text: "Couldn't reach the test service." } }));
    }
  };

  /** Browser-side reachability for user-supplied endpoints; the server never fetches arbitrary URLs. */
  const testEndpoint = async (k: keyof Credentials) => {
    const url = settings.keys[k].trim();
    if (!/^https?:\/\//.test(url)) return setTests((t) => ({ ...t, [k]: { status: "fail", text: "Enter a full http(s) URL." } }));
    setTests((t) => ({ ...t, [k]: { status: "testing", text: "Checking reachability…" } }));
    const t0 = performance.now();
    try {
      await fetch(url, { mode: "no-cors", signal: AbortSignal.timeout(6000), cache: "no-store" });
      const ms = Math.round(performance.now() - t0);
      setTests((t) => ({ ...t, [k]: { status: "ok", text: "Reachable from this device (browser check; auth isn't verified).", ms } }));
    } catch {
      setTests((t) => ({ ...t, [k]: { status: "fail", text: "Not reachable from this device within 6 seconds." } }));
    }
  };

  return (
    <Panel icon={Plug} title="API gateway credentials" body={c.keysBody} locked={!allowed}>
      <div className="space-y-4">
        {SECRET_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} note={f.note} test={tests[f.key]}>
            <Secret value={settings.keys[f.key]} placeholder={`${f.prefix}…`} onChange={(v) => set(f.key, v)} />
            <button type="button" disabled={!settings.keys[f.key].trim()} onClick={() => testProvider(f.key, f.provider!)} className={btn}>
              Test connection
            </button>
          </Field>
        ))}
        <Field label="Vector database" note="Endpoint and API key for your vector store (Pinecone, Weaviate, Qdrant…). Stored for integrations." test={tests.vectorDbUrl}>
          <input value={settings.keys.vectorDbUrl} onChange={(e) => set("vectorDbUrl", e.target.value)} placeholder="https://index.svc.pinecone.io" dir="ltr" className={input} aria-label="Vector database URL" />
          <button type="button" disabled={!settings.keys.vectorDbUrl.trim()} onClick={() => testEndpoint("vectorDbUrl")} className={btn}>
            Ping
          </button>
        </Field>
        <Secret value={settings.keys.vectorDbKey} placeholder="Vector DB API key" onChange={(v) => set("vectorDbKey", v)} />
        <Field label="Custom endpoint" note="An OpenAI-compatible gateway or internal service. Stored for integrations." test={tests.customUrl}>
          <input value={settings.keys.customUrl} onChange={(e) => set("customUrl", e.target.value)} placeholder="https://llm.internal.example.com/v1" dir="ltr" className={input} aria-label="Custom endpoint URL" />
          <button type="button" disabled={!settings.keys.customUrl.trim()} onClick={() => testEndpoint("customUrl")} className={btn}>
            Ping
          </button>
        </Field>
        <Secret value={settings.keys.customKey} placeholder="Custom endpoint key" onChange={(v) => set("customKey", v)} />
        <RuntimeCheck />
      </div>
    </Panel>
  );
}

function Field({ label, note, test, children }: { label: string; note: string; test?: TestState; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12.5px] text-white/80">{label}</p>
      <p className="text-[11px] text-white/40">{note}</p>
      <div className="mt-1.5 flex gap-1.5">{children}</div>
      {test && test.status !== "idle" && (
        <p className={cn("mt-1 flex items-center gap-1.5 text-[11.5px]", test.status === "ok" ? "text-emerald-300" : test.status === "fail" ? "text-red-300" : "text-white/50")}>
          {test.status === "testing" ? <Loader2 className="size-3 animate-spin" /> : test.status === "ok" ? <Check className="size-3" /> : <X className="size-3" />}
          {test.text}
          {test.ms !== undefined && <span className="font-mono text-white/40">· {test.ms}ms</span>}
        </p>
      )}
    </div>
  );
}

function Secret({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex min-w-0 flex-1 gap-1.5">
      <input type={shown ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" spellCheck={false} dir="ltr" aria-label={placeholder} className={cn(input, "font-mono text-[12px]")} />
      <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide" : "Show"} className="rounded-lg border border-white/10 px-2.5 text-white/55 hover:text-white">
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function RuntimeCheck() {
  const { settings } = useDeskSettings();
  const [m, setM] = useState<CommandManifest | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-3">
      <button type="button" onClick={async () => setM((await (await fetch("/api/command", { headers: keyHeaders(settings.keys), cache: "no-store" })).json()) as CommandManifest)} className={btn}>
        Resolve engine runtime
      </button>
      {m && (
        <p className="font-mono text-[11px] text-white/60">
          <span className={m.mode === "live" ? "text-emerald-300" : "text-[#f3e2b8]"}>{m.mode}</span> · {m.provider} · {m.model}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ branding & team

function TeamPanel({ allowed }: { allowed: boolean }) {
  const { settings } = useDeskSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ name: string; email: string; role: Role }>({ name: "", email: "", role: "operator" });
  const [err, setErr] = useState<string | null>(null);
  const owners = settings.members.filter((m) => m.role === "owner").length;

  const uploadLogo = async (file: File) => {
    setErr(null);
    try {
      const logo = await readLogo(file);
      updateSettings((s) => ({ branding: { ...s.branding, logo } }));
      audit("settings", "Updated the workspace logo");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That image couldn't be read.");
    }
  };

  const add = () => {
    if (!draft.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email)) return setErr("Enter a name and a valid email.");
    if (settings.members.some((m) => m.email.toLowerCase() === draft.email.toLowerCase())) return setErr("That email is already on the team.");
    setErr(null);
    updateSettings((s) => ({ members: [...s.members, { id: crypto.randomUUID(), name: draft.name.trim(), email: draft.email.trim(), role: draft.role }] }));
    audit("member", `Added ${draft.name.trim()} as ${ROLE_INFO[draft.role].label}`);
    setDraft({ name: "", email: "", role: "operator" });
  };

  return (
    <Panel icon={Building2} title="Client branding & RBAC" body="Your organization's identity on the desk, and who on the team can do what. Roles apply to whoever is acting (top bar)." locked={!allowed} className="lg:row-span-2">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileRef.current?.click()} className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/20 bg-black/30 hover:border-[#f0d59a]/50" aria-label="Upload workspace logo">
          {/* A data URL from the uploader; next/image adds nothing for it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {settings.branding.logo ? <img src={settings.branding.logo} alt="Workspace logo" className="size-full object-contain" /> : <Upload className="size-5 text-white/40 group-hover:text-[#f3e2b8]" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
        <div className="min-w-0 flex-1">
          <label className="text-[12px] text-white/70" htmlFor="org-name">
            Organization name
          </label>
          <input
            id="org-name"
            value={settings.branding.orgName}
            onChange={(e) => updateSettings((s) => ({ branding: { ...s.branding, orgName: e.target.value.slice(0, 60) } }))}
            onBlur={(e) => e.target.value && audit("settings", `Set the organization name to "${e.target.value}"`)}
            placeholder="Acme Corp"
            className={cn(input, "mt-1")}
          />
          {settings.branding.logo && (
            <button type="button" onClick={() => updateSettings((s) => ({ branding: { ...s.branding, logo: null } }))} className="mt-1 text-[11px] text-white/40 hover:text-white/70">
              Remove logo
            </button>
          )}
        </div>
      </div>

      <p className="mt-5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/45">Team · {settings.members.length}</p>
      <ul className="mt-2 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08]">
        {settings.members.map((m) => {
          const lastOwner = m.role === "owner" && owners === 1;
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-2 p-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-[12px] font-medium">{m.name.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-white">
                  {m.name}
                  {m.id === settings.activeMemberId && <span className="ms-1.5 font-mono text-[9px] uppercase text-emerald-300/80">acting</span>}
                </span>
                <span className="block truncate text-[11px] text-white/40">{m.email || "No email"}</span>
              </span>
              <select
                value={m.role}
                disabled={lastOwner}
                title={lastOwner ? "A workspace needs at least one owner" : undefined}
                onChange={(e) => {
                  const role = e.target.value as Role;
                  updateSettings((s) => ({ members: s.members.map((x) => (x.id === m.id ? { ...x, role } : x)) }));
                  audit("member", `Changed ${m.name}'s role to ${ROLE_INFO[role].label}`);
                }}
                className="rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-[12px] text-white"
                aria-label={`${m.name}'s role`}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_INFO[r].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={lastOwner || m.id === settings.activeMemberId}
                onClick={() => {
                  updateSettings((s) => ({ members: s.members.filter((x) => x.id !== m.id) }));
                  audit("member", `Removed ${m.name} from the team`);
                }}
                aria-label={`Remove ${m.name}`}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-red-300 disabled:opacity-25"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className={input} aria-label="New member name" />
        <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="email@company.com" type="email" className={input} aria-label="New member email" />
        <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })} className="rounded-lg border border-white/10 bg-black/50 px-2 text-[12px] text-white" aria-label="New member role">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_INFO[r].label}
            </option>
          ))}
        </select>
        <button type="button" onClick={add} className={btn}>
          <UserPlus className="size-3.5" /> Add
        </button>
      </div>
      {err && <p className="mt-2 text-[12px] text-red-300">{err}</p>}

      <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {ROLES.map((r) => (
          <li key={r} className="rounded-lg border border-white/[0.06] p-2 text-[11.5px] text-white/55">
            <span className="text-white/85">{ROLE_INFO[r].label}</span> · {ROLE_INFO[r].blurb}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ------------------------------------------------------------------------------------------------ shift & persistence

const SHIFT_OPTIONS: { value: ShiftDefault; icon: LucideIcon; label: string }[] = [
  { value: "clock", icon: Layers, label: "" },
  { value: "prime", icon: Sun, label: "Prime" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "surge", icon: Zap, label: "Surge" },
];

function ShiftPanel({ c, allowed }: { c: C; allowed: boolean }) {
  const { settings } = useDeskSettings();
  return (
    <Panel icon={Layers} title={c.shiftTitle} body={c.shiftBody} locked={!allowed}>
      <div role="radiogroup" aria-label={c.shiftTitle} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SHIFT_OPTIONS.map(({ value, icon: Icon, label }) => {
          const on = settings.shiftDefault === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                updateSettings({ shiftDefault: value });
                audit("settings", `Default shift set to ${label || "follow the clock"}`);
              }}
              className={cn("flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[12px] transition-colors", on ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.08] text-[#f3e2b8]" : "border-white/10 text-white/55 hover:text-white/85")}
            >
              <Icon className="size-4" />
              {label || c.followClock}
            </button>
          );
        })}
      </div>
      <Toggle checked={settings.surgeOnRun} onChange={(v) => updateSettings({ surgeOnRun: v })} label={c.surgeOnRun} />
    </Panel>
  );
}

function PersistencePanel({ c, allowed }: { c: C; allowed: boolean }) {
  const { persistence } = useDeskSettings();
  const [cleared, setCleared] = useState(false);
  return (
    <Panel icon={Layers} title={c.persistTitle} body={c.persistBody} locked={!allowed}>
      <div role="radiogroup" aria-label={c.persistTitle} className="space-y-2">
        {(
          [
            ["device", c.device, c.deviceHint],
            ["session", c.session, c.sessionHint],
          ] as [Persistence, string, string][]
        ).map(([value, label, hint]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={persistence === value}
            onClick={() => {
              setPersistence(value);
              audit("settings", `Persistence set to ${label.toLowerCase()}`);
            }}
            className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-start transition-colors", persistence === value ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.06]" : "border-white/10 hover:border-white/20")}
          >
            <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", persistence === value ? "border-[#f0d59a] bg-[#f0d59a] text-black" : "border-white/30")}>{persistence === value && <Check className="size-3" />}</span>
            <span>
              <span className="block text-[13px] text-white">{label}</span>
              <span className="block text-[11.5px] text-white/45">{hint}</span>
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          if (!window.confirm("Clear every desk setting on this device: license, keys, team, calibrations and the audit log?")) return;
          clearSettings();
          setCleared(true);
          setTimeout(() => setCleared(false), 2000);
        }}
        className="mt-4 flex items-center gap-2 rounded-full border border-red-400/30 px-4 py-1.5 text-[12.5px] text-red-200 transition-colors hover:bg-red-500/10"
      >
        {cleared ? <Check className="size-3.5" /> : <Trash2 className="size-3.5" />}
        {cleared ? c.cleared : c.clearAll}
      </button>
    </Panel>
  );
}

// ------------------------------------------------------------------------------------------------ diagnostics

type Line = { id: string; at: number; kind: AuditKind; actor: string; message: string };
const KINDS: (AuditKind | "all")[] = ["all", "run", "approval", "license", "credentials", "calibration", "member", "settings", "system"];

function DiagnosticsPanel({ telemetry, canClear }: { telemetry: Telemetry; canClear: boolean }) {
  const { settings } = useDeskSettings();
  const { tier } = useLicense();
  const [filter, setFilter] = useState<AuditKind | "all">("all");
  const [heartbeat, setHeartbeat] = useState<Line[]>([]);
  const box = useRef<HTMLDivElement>(null);

  // Each telemetry probe becomes a system line in the live stream (kept in memory, not in the audit log).
  useEffect(() => {
    if (telemetry.latency === null) return;
    setHeartbeat((h) =>
      [...h, { id: `hb${Date.now()}`, at: Date.now(), kind: "system" as const, actor: "runtime", message: `Probe ${telemetry.sla === "offline" ? "failed" : "ok"} · ${telemetry.latency}ms · ${telemetry.manifest?.mode ?? "?"} via ${telemetry.manifest?.provider ?? "?"} · SLA ${telemetry.sla}` }].slice(-60),
    );
  }, [telemetry.latency, telemetry.sla, telemetry.manifest]);

  const lines = useMemo(() => {
    const all: Line[] = [...settings.audit.map((a) => ({ ...a, id: `a${a.id}` })), ...heartbeat].sort((a, b) => a.at - b.at);
    return filter === "all" ? all : all.filter((l) => l.kind === filter);
  }, [settings.audit, heartbeat, filter]);

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const storageBytes = useMemo(() => new Blob([JSON.stringify(settings)]).size, [settings]);
  const exportLog = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(settings.audit, null, 2)], { type: "application/json" }));
    Object.assign(document.createElement("a"), { href: url, download: `bloom-audit-${new Date().toISOString().slice(0, 10)}.json` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel icon={Activity} title="System diagnostics & audit logs" className="lg:col-span-2">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["Runtime", telemetry.manifest ? `${telemetry.manifest.mode} · ${telemetry.manifest.provider}` : "…"],
          ["API latency", telemetry.latency === null ? "…" : `${telemetry.latency}ms`],
          ["SLA", telemetry.sla],
          ["License", TIER_INFO[tier].short],
          ["Local state", `${(storageBytes / 1024).toFixed(1)} KB · ${settings.audit.length} audit`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2">
            <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">{k}</dt>
            <dd className="mt-0.5 truncate font-mono text-[12.5px] text-white/85">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {KINDS.map((k) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]", filter === k ? "border-[#f0d59a]/50 text-[#f3e2b8]" : "border-white/10 text-white/45 hover:text-white/75")}>
            {k}
          </button>
        ))}
        <span className="ms-auto flex gap-1.5">
          <button type="button" onClick={exportLog} className={btn}>
            <Download className="size-3.5" /> Export
          </button>
          <button type="button" disabled={!canClear} onClick={() => window.confirm("Clear the audit log?") && updateSettings({ audit: [] })} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/60 hover:text-white disabled:opacity-40">
            Clear
          </button>
        </span>
      </div>
      <div ref={box} role="log" aria-live="polite" className="mt-3 h-64 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/50 p-3 font-mono text-[11.5px] leading-relaxed">
        {lines.length === 0 ? (
          <p className="text-white/35">No activity yet.</p>
        ) : (
          lines.map((l) => (
            <p key={l.id} className="flex gap-2">
              <span className="shrink-0 text-white/30">{new Date(l.at).toLocaleTimeString([], { hour12: false })}</span>
              <span className={cn("w-20 shrink-0 uppercase", l.kind === "system" ? "text-sky-300/70" : l.kind === "license" ? "text-[#f3e2b8]" : l.kind === "approval" ? "text-emerald-300/80" : "text-white/50")}>{l.kind}</span>
              <span className="shrink-0 text-white/45">{l.actor}</span>
              <span dir="auto" className="min-w-0 text-white/80">{l.message}</span>
            </p>
          ))
        )}
      </div>
    </Panel>
  );
}
