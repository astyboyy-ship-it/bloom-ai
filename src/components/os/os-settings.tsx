"use client";

import { useState } from "react";
import { Globe2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandCopy } from "@/components/bloom/command/locale";
import { HUB_COPY } from "@/components/desk/hub-copy";
import { can } from "@/components/desk/rbac";
import { Panel, SettingsHub } from "@/components/desk/settings-hub";
import { activeMember, audit, updateSettings, useDeskSettings } from "@/components/desk/settings";
import { OsPage } from "./os-shell";
import { useOsTelemetry } from "./telemetry-context";

const REGIONS = ["us-east", "us-west", "eu-central", "eu-west", "ap-southeast", "ap-northeast", "sa-east", "me-central"];

/** App Settings: license, gateways, branding and RBAC, shifts, persistence, diagnostics, plus deployment environments. */
export function OsSettings() {
  const { lang } = useCommandCopy();
  const { manifest, latency, sla } = useOsTelemetry();
  return (
    <OsPage kicker="App settings" title="Workspace, license & white-label" lede="Everything here is saved on this device and applies across the Operating Desk. License keys are verified by the Bloom AI server.">
      {/* Matches the hub's own padding below, so the two line up. */}
      <div className="mx-auto max-w-6xl p-4 pb-0 sm:p-6 sm:pb-0">
        <Environments />
      </div>
      <SettingsHub c={HUB_COPY[lang]} telemetry={{ manifest, latency, sla }} />
    </OsPage>
  );
}

function Environments() {
  const { settings } = useDeskSettings();
  const allowed = can(activeMember(settings).role, "settings");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("us-east");
  return (
    <Panel icon={Globe2} title="Deployment environments" body="Runs, audit entries and Global Pulse are tagged with the active environment. Switch it from the header." locked={!allowed}>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {settings.environments.map((e) => (
          <li key={e.id} className={cn("flex items-center gap-3 rounded-xl border p-3", e.id === settings.activeEnvId ? "border-os-cyan/40 bg-os-cyan/[0.05]" : "border-os-line")}>
            <span className={cn("size-2 rounded-full", e.id === settings.activeEnvId ? "bg-os-emerald shadow-[0_0_8px_#34f5b5]" : "bg-white/25")} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-white">{e.name}</span>
              <span className="font-mono text-[10.5px] text-white/40">{e.region}</span>
            </span>
            <button
              type="button"
              disabled={settings.environments.length < 2 || e.id === settings.activeEnvId}
              onClick={() => {
                updateSettings((s) => ({ environments: s.environments.filter((x) => x.id !== e.id) }));
                audit("settings", `Removed environment ${e.name}`);
              }}
              aria-label={`Remove ${e.name}`}
              className="rounded-lg p-1.5 text-white/40 hover:text-red-300 disabled:opacity-25"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          const n = name.trim();
          if (!n) return;
          const id = `${n.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${Date.now().toString(36).slice(-4)}`;
          updateSettings((s) => ({ environments: [...s.environments, { id, name: n.slice(0, 50), region }] }));
          audit("settings", `Added environment ${n} (${region})`);
          setName("");
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Environment name, e.g. Staging-US-West" aria-label="Environment name" className="min-w-0 flex-1 rounded-lg border border-os-line bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:border-os-cyan/50 focus:outline-none" />
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region" className="rounded-lg border border-os-line bg-os-panel px-2 text-[12.5px] text-white">
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-full border border-os-cyan/40 px-3.5 py-1.5 text-[12px] text-os-cyan hover:bg-os-cyan/10">
          <Plus className="size-3.5" /> Add environment
        </button>
      </form>
    </Panel>
  );
}
