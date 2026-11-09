"use client";

import { Building2, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { audit, updateSettings, useDeskSettings } from "@/components/desk/settings";
import { useAgencyClients } from "@/components/modes/role-decks";
import { useLicensingCopy } from "./copy";
import { obsidianToast } from "./obsidian-toast";
import { Widget } from "./widget";

/**
 * Workspace context switch: the active environment and the client every run, brief and audit entry is attributed
 * to. Both are the desk's real settings (the header's environment picker and the engagement client), so the
 * switch takes effect everywhere at once. Clients come from the agency workspaces plus the current engagement.
 */
export function WorkspaceContext() {
  const w = useLicensingCopy().ops.workspace;
  const { settings } = useDeskSettings();
  const [clients] = useAgencyClients();
  const names = [...new Set([...clients.map((c) => c.name), settings.project.client].filter(Boolean))];

  const setEnv = (id: string) => {
    const env = settings.environments.find((e) => e.id === id);
    if (!env || id === settings.activeEnvId) return;
    updateSettings({ activeEnvId: id });
    audit("settings", `Switched environment to ${env.name}`);
    obsidianToast(w.switched(env.name));
  };
  const setClient = (name: string) => {
    if (name === settings.project.client) return;
    updateSettings((s) => ({ project: { ...s.project, client: name } }));
    audit("settings", name ? `Switched client context to ${name}` : "Cleared the client context");
    obsidianToast(w.switched(name || w.none));
  };

  const chip = (on: boolean) => cn("rounded-lg border px-3 py-1.5 text-start text-[12px] transition-all duration-200 hover:-translate-y-px", on ? "bloom-edge-glow text-os-cyan" : "border-white/10 text-white/65 hover:border-os-cyan/35 hover:text-white");

  return (
    <Widget icon={Globe2} title={w.title} sub={w.sub}>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{w.environment}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {settings.environments.map((e) => (
          <button key={e.id} type="button" aria-pressed={e.id === settings.activeEnvId} onClick={() => setEnv(e.id)} className={chip(e.id === settings.activeEnvId)}>
            {e.name}
            <span className="ms-1.5 font-mono text-[10px] text-white/40">{e.region}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{w.client}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={!settings.project.client} onClick={() => setClient("")} className={chip(!settings.project.client)}>
          {w.none}
        </button>
        {names.map((n) => (
          <button key={n} type="button" aria-pressed={n === settings.project.client} onClick={() => setClient(n)} className={chip(n === settings.project.client)}>
            <Building2 className="me-1.5 inline size-3.5 align-[-2px]" />
            {n}
          </button>
        ))}
      </div>
    </Widget>
  );
}
