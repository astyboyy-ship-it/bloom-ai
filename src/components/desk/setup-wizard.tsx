"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CircleDashed, KeyRound, Loader2, Plug, Building2, Stethoscope, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BloomWordmark } from "@/components/bloom/logo";
import { ENGINES } from "@/components/bloom/command/engines";
import type { CommandManifest } from "@/lib/engines/events";
import { useLicense } from "@/lib/license-context";
import { TIER_INFO } from "@/lib/license/tiers";
import { readLogo } from "./logo";
import { audit, keyHeaders, requestHeaders, updateSettings, useDeskSettings, type DeskSettings, type ShiftDefault } from "./settings";

const STEPS = [
  { title: "Product license", icon: KeyRound, blurb: "Your license key decides which architectures this workspace runs." },
  { title: "Model providers", icon: Plug, blurb: "Connect Anthropic or OpenRouter to run engines live. Skip to use the simulation runtime." },
  { title: "Workspace & branding", icon: Building2, blurb: "Name the workspace, add your logo and set yourself up as its owner." },
  { title: "System diagnostics", icon: Stethoscope, blurb: "A full check of the workspace before you enter the Operating Desk." },
] as const;

const input = "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/25 focus:border-[#f0d59a]/50 focus:outline-none";

/** The four-step client onboarding flow: license, providers, workspace, diagnostics. Then into the desk. */
export function SetupWizard() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { settings } = useDeskSettings();
  const [diagnosticsPassed, setDiagnosticsPassed] = useState(false);

  const finish = () => {
    updateSettings({ onboarded: true });
    audit("system", "Completed guided setup");
    router.push("/desk");
  };

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-ink px-4 py-8 font-sans text-white sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgb(255_189_110/0.1),transparent_55%)]" />
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link href="/">
          <BloomWordmark className="text-[24px]" />
        </Link>
        <Link href="/desk" className="text-[12.5px] text-white/45 hover:text-white/80">
          {settings.onboarded ? "Back to the desk" : "Skip for now"}
        </Link>
      </div>

      <main className="mx-auto mt-10 w-full max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#f0d59a]/80">Guided setup · Step {step + 1} of 4</p>
        <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Setup steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? "step" : undefined}
                className={cn("w-full rounded-xl border p-2.5 text-start transition-colors", i === step ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.07]" : i < step ? "border-emerald-400/30 hover:bg-white/[0.03]" : "border-white/[0.07] opacity-50")}
              >
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/45">
                  {i < step ? <Check className="size-3.5 text-emerald-400" /> : <s.icon className="size-3.5" />} 0{i + 1}
                </span>
                <span className="mt-1 block truncate text-[12.5px] text-white/85">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="glass mt-6 rounded-3xl p-6 sm:p-8">
          <h1 className="font-display text-[34px] font-light leading-tight">{STEPS[step].title}</h1>
          <p className="mt-1 text-[14px] text-white/55">{STEPS[step].blurb}</p>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="mt-6">
              {step === 0 && <LicenseStep />}
              {step === 1 && <ProviderStep />}
              {step === 2 && <WorkspaceStep />}
              {step === 3 && <DiagnosticsStep settings={settings} onPassed={setDiagnosticsPassed} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] text-white/60 hover:text-white disabled:opacity-30">
            <ArrowLeft className="size-4 rtl:-scale-x-100" /> Back
          </button>
          {step < 3 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="flex items-center gap-2 rounded-full bg-[#f3e2b8] px-6 py-2.5 text-[13.5px] font-semibold text-[#1a0f05]">
              Continue <ArrowRight className="size-4 rtl:-scale-x-100" />
            </button>
          ) : (
            <button type="button" onClick={finish} disabled={!diagnosticsPassed} className="flex items-center gap-2 rounded-full bg-[#f3e2b8] px-6 py-2.5 text-[13.5px] font-semibold text-[#1a0f05] shadow-[0_0_50px_-12px_rgb(243_212_143/0.8)] disabled:opacity-40">
              Enter the Operating Desk <ArrowRight className="size-4 rtl:-scale-x-100" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function LicenseStep() {
  const { tier, info, engines, activate, devIssue, devAvailable, checking } = useLicense();
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await activate(key);
          setMsg(r.ok ? { ok: true, text: `Activated ${TIER_INFO[r.info.tier].label} for ${r.info.org}.` } : { ok: false, text: r.message });
        }}
      >
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="BLOOM-…" dir="ltr" spellCheck={false} autoComplete="off" className={cn(input, "font-mono text-[12.5px]")} aria-label="License key" />
        <button type="submit" disabled={!key.trim() || checking} className="flex items-center gap-1.5 rounded-xl border border-[#f0d59a]/45 px-4 text-[13px] text-[#f3e2b8] hover:bg-[#f0d59a]/10 disabled:opacity-40">
          {checking ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Validate
        </button>
      </form>
      {msg && <p className={cn("mt-2 text-[12.5px]", msg.ok ? "text-emerald-300" : "text-red-300")}>{msg.text}</p>}
      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/45">This workspace</p>
        <p className="mt-1 text-[16px] text-[#f6ead2]">{TIER_INFO[tier].label}</p>
        <p className="text-[12px] text-white/50">{info ? `${info.org}${info.expiresAt ? ` · expires ${info.expiresAt}` : ""}` : "No key yet: you can continue in Evaluation and add one later in App Settings."}</p>
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {Object.values(ENGINES).map((e) => (
            <span key={e.key} className={cn("rounded-lg border px-2 py-1.5 text-[11.5px]", engines.includes(e.key) ? "border-emerald-400/35 text-white/85" : "border-white/[0.06] text-white/30")}>
              {engines.includes(e.key) ? "✓" : "·"} {e.index} {e.name}
            </span>
          ))}
        </div>
      </div>
      {devAvailable && (
        <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[11.5px] text-white/40">
          Development keys:
          {(["tier1", "tier2", "tier3", "admin"] as const).map((t) => (
            <button key={t} type="button" onClick={() => devIssue(t)} className={cn("rounded-full border px-2 py-0.5 font-mono", tier === t ? "border-[#f0d59a]/60 text-[#f3e2b8]" : "border-white/15 hover:text-white")}>
              {TIER_INFO[t].short}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}

type Test = { status: "idle" | "testing" | "ok" | "fail"; text: string };

function ProviderStep() {
  const { settings } = useDeskSettings();
  const [tests, setTests] = useState<Record<"anthropic" | "openrouter", Test>>({ anthropic: { status: "idle", text: "" }, openrouter: { status: "idle", text: "" } });
  const test = async (provider: "anthropic" | "openrouter") => {
    setTests((t) => ({ ...t, [provider]: { status: "testing", text: "Testing…" } }));
    try {
      const res = await fetch("/api/settings/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, key: settings.keys[provider] }) });
      const d = (await res.json()) as { ok?: boolean; detail?: string; error?: { message?: string } };
      setTests((t) => ({ ...t, [provider]: { status: d.ok ? "ok" : "fail", text: d.detail ?? d.error?.message ?? "Test failed." } }));
    } catch {
      setTests((t) => ({ ...t, [provider]: { status: "fail", text: "Couldn't reach the test service." } }));
    }
  };
  return (
    <div className="space-y-5">
      {(
        [
          ["anthropic", "Anthropic API key", "sk-ant-…"],
          ["openrouter", "OpenRouter API key", "sk-or-…"],
        ] as const
      ).map(([k, label, ph]) => (
        <div key={k}>
          <label className="text-[13px] text-white/75" htmlFor={`wiz-${k}`}>
            {label}
          </label>
          <div className="mt-1.5 flex gap-2">
            <input id={`wiz-${k}`} type="password" value={settings.keys[k]} onChange={(e) => updateSettings((s) => ({ keys: { ...s.keys, [k]: e.target.value } }))} placeholder={ph} dir="ltr" autoComplete="off" className={cn(input, "font-mono text-[12.5px]")} />
            <button type="button" disabled={!settings.keys[k].trim()} onClick={() => test(k)} className="rounded-xl border border-[#f0d59a]/45 px-4 text-[13px] text-[#f3e2b8] hover:bg-[#f0d59a]/10 disabled:opacity-40">
              Test
            </button>
          </div>
          {tests[k].status !== "idle" && (
            <p className={cn("mt-1.5 flex items-center gap-1.5 text-[12px]", tests[k].status === "ok" ? "text-emerald-300" : tests[k].status === "fail" ? "text-red-300" : "text-white/50")}>
              {tests[k].status === "testing" ? <Loader2 className="size-3.5 animate-spin" /> : tests[k].status === "ok" ? <Check className="size-3.5" /> : <X className="size-3.5" />} {tests[k].text}
            </p>
          )}
        </div>
      ))}
      <p className="rounded-xl border border-white/[0.07] bg-black/25 p-3 text-[12px] leading-relaxed text-white/50">
        Keys stay on this device and travel with each run over HTTPS; the server uses them for that request only. With no key, engines run on the server&apos;s configuration, or the simulation runtime if none is set. More gateways (OpenAI, vector databases, custom endpoints) are in App Settings.
      </p>
    </div>
  );
}

function WorkspaceStep() {
  const { settings } = useDeskSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const owner = settings.members.find((m) => m.role === "owner") ?? settings.members[0];
  const setOwner = (patch: Partial<typeof owner>) => updateSettings((s) => ({ members: s.members.map((m) => (m.id === owner.id ? { ...m, ...patch } : m)) }));
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileRef.current?.click()} className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-black/30 hover:border-[#f0d59a]/50" aria-label="Upload workspace logo">
          {/* A data URL from the uploader. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {settings.branding.logo ? <img src={settings.branding.logo} alt="Workspace logo" className="size-full object-contain" /> : <Upload className="size-6 text-white/40" />}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const logo = await readLogo(f);
              updateSettings((s) => ({ branding: { ...s.branding, logo } }));
              setErr(null);
            } catch (x) {
              setErr(x instanceof Error ? x.message : "That image couldn't be read.");
            }
          }}
        />
        <div className="min-w-0 flex-1">
          <label className="text-[13px] text-white/75" htmlFor="wiz-org">
            Organization name
          </label>
          <input id="wiz-org" value={settings.branding.orgName} onChange={(e) => updateSettings((s) => ({ branding: { ...s.branding, orgName: e.target.value.slice(0, 60) } }))} placeholder="Acme Corp" className={cn(input, "mt-1.5")} />
        </div>
      </div>
      {err && <p className="text-[12px] text-red-300">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[13px] text-white/75" htmlFor="wiz-owner">
            Your name (workspace owner)
          </label>
          <input id="wiz-owner" value={owner.name} onChange={(e) => setOwner({ name: e.target.value.slice(0, 60) || "Workspace Owner" })} className={cn(input, "mt-1.5")} />
        </div>
        <div>
          <label className="text-[13px] text-white/75" htmlFor="wiz-email">
            Your email
          </label>
          <input id="wiz-email" type="email" value={owner.email} onChange={(e) => setOwner({ email: e.target.value.slice(0, 120) })} placeholder="you@company.com" className={cn(input, "mt-1.5")} />
        </div>
      </div>
      <div>
        <p className="text-[13px] text-white/75">Default shift when the desk opens</p>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {(["clock", "prime", "dark", "surge"] as ShiftDefault[]).map((v) => (
            <button key={v} type="button" onClick={() => updateSettings({ shiftDefault: v })} className={cn("rounded-xl border py-2 text-[12.5px] capitalize", settings.shiftDefault === v ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.08] text-[#f3e2b8]" : "border-white/10 text-white/55")}>
              {v === "clock" ? "Follow clock" : v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type DiagCheck = { label: string; status: "pending" | "running" | "ok" | "warn" | "fail"; detail: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function DiagnosticsStep({ settings, onPassed }: { settings: DeskSettings; onPassed: (ok: boolean) => void }) {
  const { tier, engines } = useLicense();
  const [checks, setChecks] = useState<DiagCheck[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    onPassed(false);
    const list: DiagCheck[] = [
      { label: "License verification", status: "pending", detail: "" },
      { label: "Runtime API reachability", status: "pending", detail: "" },
      { label: "Model provider", status: "pending", detail: "" },
      { label: "Engine definitions & schemas", status: "pending", detail: "" },
      { label: "Run gateway accepts this license", status: "pending", detail: "" },
      { label: "Local persistence", status: "pending", detail: "" },
    ];
    setChecks(list);
    const set = (i: number, c: Partial<DiagCheck>) => setChecks((cs) => cs.map((x, j) => (j === i ? { ...x, ...c } : x)));
    const step = async (i: number, fn: () => Promise<Omit<DiagCheck, "label">>) => {
      set(i, { status: "running" });
      const t0 = performance.now();
      let r: Omit<DiagCheck, "label">;
      try {
        r = await fn();
      } catch (e) {
        r = { status: "fail", detail: e instanceof Error ? e.message : "Failed." };
      }
      // Each check holds long enough to be seen.
      await sleep(Math.max(0, 450 - (performance.now() - t0)));
      set(i, r);
      return r.status !== "fail";
    };

    const results = [
      await step(0, async () => {
        if (!settings.licenseKey) return { status: "warn", detail: `No key: running as ${TIER_INFO[tier].label}.` };
        const res = await fetch("/api/license", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: settings.licenseKey }) });
        const d = (await res.json()) as { tier?: string; org?: string; error?: { message?: string } };
        return res.ok ? { status: "ok", detail: `${TIER_INFO[tier].label} · ${d.org}` } : { status: "fail", detail: d.error?.message ?? "Rejected." };
      }),
      await step(1, async () => {
        const t0 = performance.now();
        const res = await fetch("/api/command", { cache: "no-store" });
        if (!res.ok) throw new Error(`Runtime API returned ${res.status}.`);
        return { status: "ok", detail: `Responded in ${Math.round(performance.now() - t0)}ms.` };
      }),
      await step(2, async () => {
        const m = (await (await fetch("/api/command", { headers: keyHeaders(settings.keys), cache: "no-store" })).json()) as CommandManifest;
        return m.mode === "live" ? { status: "ok", detail: `Live on ${m.provider} · ${m.model}.` } : { status: "warn", detail: "No provider key: engines run on the simulation runtime." };
      }),
      await step(3, async () => {
        const m = (await (await fetch("/api/command?detail=1", { cache: "no-store" })).json()) as CommandManifest;
        const tools = m.engines.reduce((s, e) => s + (e.detail?.tools.length ?? 0), 0);
        if (m.engines.length !== 8) throw new Error(`Expected 8 engines, found ${m.engines.length}.`);
        return { status: "ok", detail: `8 engines, ${tools} tools, input and output schemas loaded.` };
      }),
      await step(4, async () => {
        // An empty command is rejected (422) only after the license check passes, so this costs nothing to run.
        const engine = engines[0];
        const res = await fetch(`/api/command/${engine}`, { method: "POST", headers: { "Content-Type": "application/json", ...requestHeaders(settings) }, body: JSON.stringify({ command: "" }) });
        if (res.status === 403) throw new Error(`The gateway refused ${ENGINES[engine].name} for this license.`);
        if (res.status === 429) return { status: "warn", detail: "Rate limited right now; try the check again in a minute." };
        return res.status === 422 ? { status: "ok", detail: `${engines.length} engine${engines.length === 1 ? "" : "s"} authorized, starting with ${ENGINES[engine].name}.` } : { status: "fail", detail: `Unexpected gateway response ${res.status}.` };
      }),
      await step(5, async () => {
        const k = "bloom-desk-diagnostic";
        localStorage.setItem(k, "ok");
        const ok = localStorage.getItem(k) === "ok";
        localStorage.removeItem(k);
        if (!ok) throw new Error("Couldn't write to local storage.");
        return { status: "ok", detail: `Workspace state saved (${(new Blob([JSON.stringify(settings)]).size / 1024).toFixed(1)} KB).` };
      }),
    ];
    const passed = results.every(Boolean);
    audit("system", `Ran setup diagnostics: ${passed ? "all checks passed" : "some checks failed"}`);
    onPassed(passed);
    setRunning(false);
  };

  return (
    <div>
      {checks.length === 0 ? (
        <p className="text-[13px] text-white/55">Six checks: license, runtime API, model provider, engine schemas, run gateway authorization and local persistence.</p>
      ) : (
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-3">
              <span className="mt-0.5">
                {c.status === "pending" && <CircleDashed className="size-5 text-white/25" />}
                {c.status === "running" && <Loader2 className="size-5 animate-spin text-[#f3e2b8]" />}
                {(c.status === "ok" || c.status === "warn") && (
                  <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className={cn("flex size-5 items-center justify-center rounded-full", c.status === "ok" ? "bg-emerald-400 text-black" : "bg-amber-400 text-black")}>
                    <Check className="size-3.5" strokeWidth={3} />
                  </motion.span>
                )}
                {c.status === "fail" && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-white">
                    <X className="size-3.5" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] text-white/90">{c.label}</span>
                {c.detail && <span className={cn("block text-[12px]", c.status === "fail" ? "text-red-300" : c.status === "warn" ? "text-amber-200/80" : "text-white/50")}>{c.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={run} disabled={running} className="mt-5 flex items-center gap-2 rounded-full border border-[#f0d59a]/45 px-5 py-2 text-[13px] text-[#f3e2b8] hover:bg-[#f0d59a]/10 disabled:opacity-50">
        {running ? <Loader2 className="size-4 animate-spin" /> : <Stethoscope className="size-4" />} {checks.length ? "Run diagnostics again" : "Run system diagnostics"}
      </button>
      <p className="mt-2 text-[11.5px] text-white/35">Amber checks are advisories: the workspace works, with the noted limitation.</p>
    </div>
  );
}
