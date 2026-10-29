"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Layers, Moon, Sun, Trash2, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandManifest } from "@/lib/engines/events";
import type { HUB_COPY } from "./hub-copy";
import { clearSettings, keyHeaders, setPersistence, updateSettings, useDeskSettings, type Persistence, type ShiftDefault } from "./settings";

type C = (typeof HUB_COPY)["en"];

const SHIFT_OPTIONS: { value: ShiftDefault; icon: LucideIcon; label: string }[] = [
  { value: "clock", icon: Layers, label: "" },
  { value: "prime", icon: Sun, label: "Prime" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "surge", icon: Zap, label: "Surge" },
];

/** Hub 02: provider keys, shift defaults, and where all of it is kept. */
export function SettingsHub({ c }: { c: C }) {
  const { settings, persistence } = useDeskSettings();
  const [checked, setChecked] = useState<CommandManifest | null>(null);
  const [checking, setChecking] = useState(false);
  const [cleared, setCleared] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/command", { headers: keyHeaders(settings.keys), cache: "no-store" });
      setChecked(res.ok ? ((await res.json()) as CommandManifest) : null);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 p-4 sm:p-6 lg:grid-cols-2">
      <Panel icon={KeyRound} title={c.keysTitle} body={c.keysBody} className="lg:col-span-2">
        <div className="grid gap-4 md:grid-cols-2">
          <KeyField c={c} label={c.anthropicKey} prefix="sk-ant-" provider="Anthropic" value={settings.keys.anthropic} onChange={(v) => updateSettings((s) => ({ keys: { ...s.keys, anthropic: v } }))} />
          <KeyField c={c} label={c.openrouterKey} prefix="sk-or-" provider="OpenRouter" value={settings.keys.openrouter} onChange={(v) => updateSettings((s) => ({ keys: { ...s.keys, openrouter: v } }))} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={check} disabled={checking} className="rounded-full border border-[#f0d59a]/40 px-4 py-1.5 text-[12.5px] text-[#f3e2b8] transition-colors hover:bg-[#f0d59a]/10 disabled:opacity-50">
            {checking ? c.checking : c.check}
          </button>
          {checked && (
            <p className="font-mono text-[11px] text-white/60">
              {c.resolved}: <span className={checked.mode === "live" ? "text-emerald-300" : "text-[#f3e2b8]"}>{checked.mode}</span> · {checked.provider} · {checked.model}
            </p>
          )}
          {!checked && !settings.keys.anthropic && !settings.keys.openrouter && <p className="text-[12px] text-white/40">{c.serverKey}</p>}
        </div>
      </Panel>

      <Panel icon={Layers} title={c.shiftTitle} body={c.shiftBody}>
        <div role="radiogroup" aria-label={c.shiftTitle} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SHIFT_OPTIONS.map(({ value, icon: Icon, label }) => {
            const on = settings.shiftDefault === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => updateSettings({ shiftDefault: value })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[12px] transition-colors",
                  on ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.08] text-[#f3e2b8]" : "border-white/10 text-white/55 hover:text-white/85",
                )}
              >
                <Icon className="size-4" />
                {label || c.followClock}
              </button>
            );
          })}
        </div>
        <Toggle checked={settings.surgeOnRun} onChange={(v) => updateSettings({ surgeOnRun: v })} label={c.surgeOnRun} />
      </Panel>

      <Panel icon={Layers} title={c.persistTitle} body={c.persistBody}>
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
              onClick={() => setPersistence(value)}
              className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-start transition-colors", persistence === value ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.06]" : "border-white/10 hover:border-white/20")}
            >
              <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", persistence === value ? "border-[#f0d59a] bg-[#f0d59a] text-black" : "border-white/30")}>
                {persistence === value && <Check className="size-3" />}
              </span>
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
            clearSettings();
            setChecked(null);
            setCleared(true);
            setTimeout(() => setCleared(false), 2000);
          }}
          className="mt-4 flex items-center gap-2 rounded-full border border-red-400/30 px-4 py-1.5 text-[12.5px] text-red-200 transition-colors hover:bg-red-500/10"
        >
          {cleared ? <Check className="size-3.5" /> : <Trash2 className="size-3.5" />}
          {cleared ? c.cleared : c.clearAll}
        </button>
      </Panel>
    </div>
  );
}

function Panel({ icon: Icon, title, body, className, children }: { icon: LucideIcon; title: string; body: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("glass rounded-2xl p-5", className)}>
      <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#f0d59a]/85">
        <Icon className="size-3.5" /> {title}
      </h2>
      <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">{body}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function KeyField({ c, label, prefix, provider, value, onChange }: { c: C; label: string; prefix: string; provider: string; value: string; onChange: (v: string) => void }) {
  const [shown, setShown] = useState(false);
  const bad = value.trim() !== "" && !value.trim().startsWith(prefix);
  const id = `key-${provider.toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="text-[12px] text-white/70">
        {label}
      </label>
      <div className="mt-1.5 flex gap-1.5">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${prefix}…`}
          autoComplete="off"
          spellCheck={false}
          dir="ltr"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12.5px] text-white placeholder:text-white/25 focus:border-[#f0d59a]/50 focus:outline-none"
        />
        <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? c.hide : c.show} className="rounded-lg border border-white/10 px-2.5 text-white/55 hover:text-white">
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")} className="rounded-lg border border-white/10 px-2.5 text-[11.5px] text-white/55 hover:text-white">
            {c.clear}
          </button>
        )}
      </div>
      {bad && <p className="mt-1 text-[11px] text-amber-300/80">{c.badKey(provider)}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 text-[13px] text-white/75">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-[#f0d59a]" : "bg-white/15")}
      >
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-[inset-inline-start]", checked ? "start-[18px]" : "start-0.5")} />
      </button>
    </label>
  );
}
