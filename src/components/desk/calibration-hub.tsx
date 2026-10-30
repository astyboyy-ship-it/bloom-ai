"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Brain, Braces, Cpu, ScrollText, SlidersHorizontal, Trash2, Wrench, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { localizeEngine } from "@/components/bloom/command/locale";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import type { Lang } from "@/components/bloom/i18n";
import { isTuned, readCalibration, type CalibrationInput } from "@/lib/engines/calibration";
import type { CommandManifest } from "@/lib/engines/events";
import { MODELS, modelInfo, type ModelId } from "@/lib/engines/models";
import { useLicense } from "@/lib/license-context";
import { EngineLock, LockBadge } from "./engine-lock";
import { can } from "./rbac";
import type { HUB_COPY } from "./hub-copy";
import { Toggle } from "./settings-hub";
import { activeMember, audit, setCalibration, useDeskSettings } from "./settings";

type C = (typeof HUB_COPY)["en"];

/** Hub 03: per-engine tuning bay. Every change is saved locally and sent with the next run. */
export function CalibrationHub({ c, lang, selected, onSelect }: { c: C; lang: Lang; selected: EngineKey; onSelect: (k: EngineKey) => void }) {
  const { settings } = useDeskSettings();
  const { isUnlocked } = useLicense();
  const mayCalibrate = can(activeMember(settings).role, "calibrate");
  const [manifest, setManifest] = useState<CommandManifest | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/command?detail=1", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<CommandManifest>) : Promise.reject()))
      .then((m) => alive && setManifest(m))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const raw = settings.calibrations[selected] ?? {};
  const cal = readCalibration(raw);
  const save = (patch: Partial<CalibrationInput>) => setCalibration(selected, { ...raw, ...patch });
  const def = manifest?.engines.find((e) => e.key === selected);
  const ownKey = Boolean(settings.keys.anthropic.trim() || settings.keys.openrouter.trim());
  const promptBlocked = manifest?.promptOverrides === "own-key" && !ownKey;
  const engine = localizeEngine(ENGINES[selected], lang);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label={c.calTitle} className="flex gap-1.5 overflow-x-auto border-white/10 p-3 lg:flex-col lg:overflow-y-auto lg:border-e">
        {ENGINE_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onSelect(k)}
            aria-current={k === selected ? "true" : undefined}
            style={paletteVars(PALETTES[k])}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-start text-[13px] transition-colors",
              k === selected ? "border-c-1/60 bg-c-deep/80 text-white" : "border-transparent text-white/60 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            <span className="font-mono text-[10px] text-c-2">{ENGINES[k].index}</span>
            {ENGINES[k].name}
            {!isUnlocked(k) ? (
              <LockBadge engine={k} className="ms-auto" />
            ) : (
              isTuned(settings.calibrations[k]) && <span className="ms-auto rounded-full border border-c-edge px-1.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-c-2">{c.tuned}</span>
            )}
          </button>
        ))}
      </nav>

      <div style={paletteVars(PALETTES[selected])} className="min-h-0 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-c-2/90">
                {c.calTitle} · {engine.index} {def?.codename}
              </p>
              <h2 className="mt-1 font-logo text-[34px] font-medium leading-none tracking-[-0.04em]">{engine.name}</h2>
              <p className="mt-2 max-w-2xl text-[12.5px] text-white/50">{c.calBody}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCalibration(selected, null);
                audit("calibration", `Reset ${engine.name} to its default calibration`);
              }}
              disabled={!isTuned(raw) || !mayCalibrate}
              className="flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[12px] text-white/65 transition-colors hover:text-white disabled:opacity-35"
            >
              <RotateCcw className="size-3.5" /> {c.reset}
            </button>
          </header>

          {!mayCalibrate && <p className="rounded-lg border border-white/15 bg-white/[0.03] p-2.5 text-[12px] text-white/60">Your role can view calibration but not change it.</p>}
          {failed && <p className="text-[13px] text-red-300">{c.loadFailed}</p>}
          <EngineLock engine={selected} lang={lang} className="rounded-2xl">
          <fieldset disabled={!mayCalibrate} className="min-w-0 space-y-5">
          {!manifest && !failed && <p className="text-[13px] text-white/45">{c.loading}</p>}

          <Section icon={ScrollText} title={c.prompt}>
            {promptBlocked && (
              <p className="mb-3 flex items-start gap-2 rounded-lg border border-[#f0d59a]/25 bg-[#f0d59a]/[0.06] p-2.5 text-[12px] text-[#f3e2b8]/85">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {c.ownKeyOnly}
              </p>
            )}
            <div role="radiogroup" aria-label={c.prompt} className="mb-2 inline-flex rounded-full border border-white/10 p-0.5">
              {(["append", "replace"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={cal.instructionsMode === m}
                  onClick={() => save({ instructionsMode: m })}
                  className={cn("rounded-full px-3 py-1 text-[12px] transition-colors", cal.instructionsMode === m ? "bg-c-1/20 text-white" : "text-white/50 hover:text-white/80")}
                >
                  {m === "append" ? c.append : c.replace}
                </button>
              ))}
            </div>
            <textarea
              value={raw.instructions ?? ""}
              onChange={(e) => save({ instructions: e.target.value || undefined })}
              rows={cal.instructionsMode === "replace" ? 10 : 4}
              maxLength={8000}
              placeholder={cal.instructionsMode === "replace" ? c.promptPlaceholderReplace : c.promptPlaceholderAppend}
              dir="auto"
              className="w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[12px] leading-relaxed text-white placeholder:font-sans placeholder:text-white/30 focus:border-c-1/60 focus:outline-none"
            />
            <p className="mt-1.5 text-[11.5px] text-white/40">{c.rulesStay}</p>
            {def?.detail && (
              <details className="mt-3">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 hover:text-white/75">{c.defaults}</summary>
                <pre dir="ltr" className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-start font-mono text-[11.5px] leading-relaxed text-white/65">{def.detail.instructions}</pre>
              </details>
            )}
          </Section>

          <Section icon={Cpu} title="Model & runtime">
            <label className="block text-[12.5px] text-white/70" htmlFor="cal-model">
              Model
            </label>
            <select
              id="cal-model"
              value={cal.model}
              onChange={(e) => {
                save({ model: e.target.value as ModelId });
                audit("calibration", `${engine.name} now runs on ${modelInfo(e.target.value as ModelId).label}`);
              }}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-[13px] text-white focus:border-c-1/60 focus:outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} · {m.vendor}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11.5px] text-white/45">{modelInfo(cal.model).note}</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <Range label="Temperature" value={cal.temperature} min={0} max={1} step={0.05} suffix="" disabled={!modelInfo(cal.model).temperature} onChange={(v) => save({ temperature: v })} />
                <p className="mt-1 text-[11px] text-white/40">{modelInfo(cal.model).temperature ? "Lower is more consistent; higher is more varied." : "Claude 5.x models manage sampling themselves; temperature applies to GPT-4o, DeepSeek and Llama."}</p>
              </div>
              <div>
                <Range label="Latency cap" value={cal.latencyCapS} min={10} max={240} step={5} suffix="s" onChange={(v) => save({ latencyCapS: v })} />
                <p className="mt-1 text-[11px] text-white/40">The engine stops if one run takes longer than this.</p>
              </div>
              <div>
                <Range label="Token budget" value={cal.tokenBudget} min={2000} max={64000} step={1000} suffix=" tokens" onChange={(v) => save({ tokenBudget: v })} />
                <p className="mt-1 text-[11px] text-white/40">Output tokens this engine may spend per run, across all its turns.</p>
              </div>
              <div>
                <Range label="Human-in-the-loop threshold" value={cal.approvalThresholdUsd} min={0} max={250000} step={5000} suffix="" format={(v) => `$${v.toLocaleString("en-US")}`} onChange={(v) => save({ approvalThresholdUsd: v })} />
                <p className="mt-1 text-[11px] text-white/40">Actions moving at least this much, or done by a person, wait for approval on the desk.</p>
              </div>
            </div>
          </Section>

          <Section icon={SlidersHorizontal} title="System rules & situational overrides">
            <textarea
              value={raw.overrides ?? ""}
              onChange={(e) => save({ overrides: e.target.value || undefined })}
              rows={3}
              maxLength={2000}
              placeholder={c.overridesPlaceholder}
              dir="auto"
              className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-[13px] text-white placeholder:text-white/30 focus:border-c-1/60 focus:outline-none"
            />
          </Section>

          <Section icon={Braces} title={c.constraints}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Range label={c.maxActions} value={cal.maxActions} min={1} max={8} step={1} suffix="" onChange={(v) => save({ maxActions: v })} />
              <Range label={c.summaryMax} value={cal.summaryMax} min={120} max={800} step={20} suffix={` ${c.chars}`} onChange={(v) => save({ summaryMax: v })} />
            </div>
            {def?.detail && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Schema label={c.inputSchema} value={def.detail.input} />
                <Schema label={c.outputSchema} value={def.detail.output} />
              </div>
            )}
          </Section>

          <Section icon={Brain} title="Memory retention">
            <Range label="Recent results the engine remembers" value={cal.memoryRuns} min={0} max={10} step={1} suffix="" onChange={(v) => save({ memoryRuns: v })} />
            <p className="mt-1 text-[11px] text-white/40">Each completed run stores its summary. The latest ones go back to the engine as context on its next run (as data, never as instructions). 0 turns memory off.</p>
            {cal.memory.length > 0 ? (
              <>
                <ol className="mt-3 space-y-1.5">
                  {cal.memory.map((m, i) => (
                    <li key={i} className={cn("flex items-start gap-2 rounded-lg border p-2 text-[12px]", i >= cal.memory.length - cal.memoryRuns ? "border-c-edge/50 text-white/75" : "border-white/[0.06] text-white/35")}>
                      <span className="font-mono text-[10px] text-white/35">{i + 1}</span>
                      <span dir="auto" className="min-w-0 flex-1">{m}</span>
                      <button type="button" aria-label="Forget this memory" onClick={() => save({ memory: cal.memory.filter((_, j) => j !== i) })} className="text-white/35 hover:text-red-300">
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => {
                    save({ memory: [] });
                    audit("calibration", `Cleared the memory of ${engine.name}`);
                  }}
                  className="mt-2 text-[11.5px] text-white/45 hover:text-white/80"
                >
                  Clear all memory
                </button>
              </>
            ) : (
              <p className="mt-3 text-[12px] text-white/35">Nothing retained yet.</p>
            )}
          </Section>

          <Section icon={Wrench} title={c.tools}>
            <p className="mb-3 text-[12px] text-white/45">{c.toolsBody}</p>
            <ul className="space-y-2">
              {def?.detail?.tools.map((t) => {
                const on = !cal.disabledTools.includes(t.name);
                return (
                  <li key={t.name} className={cn("rounded-xl border p-3 transition-colors", on ? "border-c-edge/60 bg-c-deep/40" : "border-white/[0.07] opacity-60")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[12.5px] text-c-2">{t.name}</p>
                        <p className="mt-1 text-[12px] leading-snug text-white/55">{t.description}</p>
                      </div>
                      <Switch
                        checked={on}
                        label={t.name}
                        onChange={(v) => save({ disabledTools: v ? cal.disabledTools.filter((x) => x !== t.name) : [...cal.disabledTools, t.name] })}
                      />
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/40 hover:text-white/70">{c.schema}</summary>
                      <pre dir="ltr" className="mt-1.5 max-h-60 overflow-auto rounded-lg bg-black/40 p-2.5 text-start font-mono text-[11px] text-white/65">{JSON.stringify(t.schema, null, 2)}</pre>
                    </details>
                  </li>
                );
              })}
            </ul>
            {def &&
              (def.delegates.length ? (
                <>
                  <Toggle checked={cal.allowDelegation} onChange={(v) => save({ allowDelegation: v })} label={c.delegation} />
                  <p className="mt-1 text-[11.5px] text-white/40">{c.delegationTo(def.delegates.map((d) => ENGINES[d].name).join(", "))}</p>
                </>
              ) : (
                <p className="mt-4 text-[12px] text-white/40">{c.noDelegates}</p>
              ))}
          </Section>
          </fieldset>
          </EngineLock>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Wrench; title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-5">
      <h3 className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-c-2/90">
        <Icon className="size-3.5" /> {title}
      </h3>
      {children}
    </section>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  disabled,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  format?: (v: number) => string;
}) {
  return (
    <label className={cn("block", disabled && "opacity-45")}>
      <span className="flex items-baseline justify-between text-[12.5px] text-white/70">
        {label}
        <span className="font-mono text-[13px] tabular-nums text-c-2">
          {format ? format(value) : value.toLocaleString("en-US")}
          {suffix}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[var(--c-1)]" />
    </label>
  );
}

function Schema({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="rounded-xl border border-white/[0.07] bg-black/25 p-2.5">
      <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white/80">{label}</summary>
      <pre dir="ltr" className="mt-2 max-h-72 overflow-auto text-start font-mono text-[11px] text-white/65">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-c-1" : "bg-white/15")}>
      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-[inset-inline-start]", checked ? "start-[18px]" : "start-0.5")} />
    </button>
  );
}
