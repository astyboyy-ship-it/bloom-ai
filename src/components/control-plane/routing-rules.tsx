"use client";

import { Route, RotateCcw } from "lucide-react";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { audit, setCalibration, useDeskSettings } from "@/components/desk/settings";
import { DEFAULT_CALIBRATION, readCalibration } from "@/lib/engines/calibration";
import { MODELS, modelInfo, type ModelId } from "@/lib/engines/models";
import { useLicense } from "@/lib/license-context";
import { useLicensingCopy } from "./copy";
import { obsidianToast } from "./obsidian-toast";
import { Widget } from "./widget";

const select = "w-full rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[11.5px] text-white transition-colors hover:border-os-cyan/40 focus:border-os-cyan/60 focus:outline-none";

/**
 * Model routing rules: each licensed engine's primary model, fallback and temperature. These are the engine's real
 * calibration fields: saved to the workspace and sent with every run, which the orchestrator honors. Temperature
 * is only offered for models that accept it.
 */
export function RoutingRules() {
  const r = useLicensingCopy().ops.routing;
  const { settings } = useDeskSettings();
  const { isUnlocked } = useLicense();

  const save = (k: EngineKey, patch: { model?: ModelId; fallbackModel?: ModelId | undefined; temperature?: number }) => {
    const cur = settings.calibrations[k] ?? {};
    setCalibration(k, { ...cur, ...patch });
    audit("calibration", `Routing for ${ENGINES[k].name}: ${Object.entries(patch).map(([f, v]) => `${f}=${v ?? "none"}`).join(", ")}`);
    obsidianToast(r.saved(ENGINES[k].name));
  };
  const reset = (k: EngineKey) => {
    const cur = settings.calibrations[k] ?? {};
    setCalibration(k, { ...cur, model: DEFAULT_CALIBRATION.model, fallbackModel: undefined, temperature: DEFAULT_CALIBRATION.temperature });
    audit("calibration", `Routing for ${ENGINES[k].name} reset to defaults`);
    obsidianToast(r.saved(ENGINES[k].name));
  };

  return (
    <Widget icon={Route} title={r.title} sub={r.sub}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-[11.5px]">
          <thead>
            <tr className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">
              <th className="px-2 text-start font-normal">{r.engine}</th>
              <th className="px-2 text-start font-normal">{r.model}</th>
              <th className="px-2 text-start font-normal">{r.fallback}</th>
              <th className="px-2 text-start font-normal">{r.temperature}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ENGINE_ORDER.filter(isUnlocked).map((k) => {
              const c = readCalibration(settings.calibrations[k]);
              const info = modelInfo(c.model);
              return (
                <tr key={k} className="bg-white/[0.02] transition-colors hover:bg-white/[0.04]">
                  <td className="rounded-s-md px-2 py-1.5 font-mono text-white/85">{ENGINES[k].name}</td>
                  <td className="px-2 py-1.5">
                    <select value={c.model} onChange={(e) => save(k, { model: e.target.value as ModelId })} className={select}>
                      {MODELS.map((m) => (
                        <option key={m.id} value={m.id} className="bg-os-panel">
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={c.fallbackModel ?? ""} onChange={(e) => save(k, { fallbackModel: (e.target.value || undefined) as ModelId | undefined })} className={select}>
                      <option value="" className="bg-os-panel">
                        {r.none}
                      </option>
                      {MODELS.filter((m) => m.id !== c.model).map((m) => (
                        <option key={m.id} value={m.id} className="bg-os-panel">
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    {info.temperature ? (
                      <span className="flex items-center gap-2">
                        <input type="range" min={0} max={1} step={0.05} defaultValue={c.temperature} onMouseUp={(e) => save(k, { temperature: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => save(k, { temperature: Number((e.target as HTMLInputElement).value) })} className="w-20 accent-[var(--tier-accent)]" aria-label={`${r.temperature} ${ENGINES[k].name}`} />
                        <span className="w-8 font-mono tabular-nums text-white/70">{c.temperature.toFixed(2)}</span>
                      </span>
                    ) : (
                      <span className="font-mono text-[10.5px] text-white/35">{r.fixed}</span>
                    )}
                  </td>
                  <td className="rounded-e-md px-2 py-1.5 text-end">
                    <button type="button" onClick={() => reset(k)} title={r.reset} aria-label={`${r.reset} ${ENGINES[k].name}`} className="rounded p-1 text-white/35 transition-colors hover:bg-white/5 hover:text-os-cyan">
                      <RotateCcw className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10.5px] text-white/35">{r.note}</p>
    </Widget>
  );
}
