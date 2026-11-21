"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Lock, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/components/desk/rbac";
import { activeMember, audit, auditPolicyRefusal, POLICY_REFUSALS, requestHeaders, useDeskSettings } from "@/components/desk/settings";
import { useLicense } from "@/lib/license-context";
import { usdFromCents } from "@/lib/scout/brief";
import { SCENARIO_IDS } from "@/lib/scout/scenarios";
import type { ScenarioId, ScoutEvent, ScoutRun } from "@/lib/scout/types";
import { useScoutCopy } from "./copy";

export type ScoutHealth = { relayUrl: string; verifierUrl: string; live: boolean; dailyCap: number; relay: { store: string; nonces: string; transports: string[] } | null; error: string | null };

type Line = { tone: "info" | "move" | "gap" | "ok" | "error"; text: string };

/**
 * Starts a live sandbox run. The button is gated here for clarity (live runs on, an Operator access key, a workspace
 * role with scout.run, a reachable relay) but the server re-checks the key, the per-minute limit and the daily cap.
 */
export function RunConsole({ health, onDone }: { health: ScoutHealth | null; onDone: (run: ScoutRun) => void }) {
  const c = useScoutCopy();
  const { settings } = useDeskSettings();
  const { role: keyRole } = useLicense();
  const me = activeMember(settings);
  const [scenario, setScenario] = useState<ScenarioId>("fleet-api");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Line[]>([]);

  const blocked = !health ? null : !health.live ? c.run.blocked.live_disabled : keyRole !== "operator" ? c.run.blocked.operator_only : !can(me.role, "scout.run") ? c.run.blocked.role : !health.relay ? c.run.blocked.relay_down : null;
  const push = (l: Line) => setLog((x) => [...x, l]);

  async function start() {
    setBusy(true);
    setLog([]);
    audit("run", `Started a live Bloom Scout sandbox run (${scenario})`);
    try {
      const res = await fetch("/api/scout/runs", { method: "POST", headers: { ...requestHeaders(settings), "Content-Type": "application/json" }, body: JSON.stringify({ scenario }) });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const e = JSON.parse(line) as ScoutEvent;
          if (e.type === "step") push({ tone: "info", text: c.run.steps[e.step] });
          else if (e.type === "move") push({ tone: "move", text: `#${e.move.seq} ${c.by[e.move.by]} · ${c.moves[e.move.type]}${e.move.priceAtomic ? ` ${usdFromCents(e.move.priceAtomic)}` : ""}` });
          else if (e.type === "gap") push({ tone: "gap", text: c.run.gapLogged(c.states[e.gap.note.kind]) });
          else if (e.type === "error") {
            push({ tone: "error", text: c.run.failed(e.message) });
            if ((POLICY_REFUSALS as readonly string[]).includes(e.code)) auditPolicyRefusal(`a Bloom Scout run (${scenario})`, e.code, e.message);
          }
          else if (e.type === "done") {
            push({ tone: "ok", text: c.run.done });
            onDone(e.run);
          }
        }
      }
    } catch (err) {
      push({ tone: "error", text: c.run.failed(err instanceof Error ? err.message : String(err)) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="os-panel rounded-2xl p-5">
      <h2 className="text-[18px] font-semibold text-white">{c.run.title}</h2>
      <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-white/55">{c.run.lede}</p>

      <p className="os-label mt-4">{c.run.pick}</p>
      <div role="radiogroup" aria-label={c.run.pick} className="mt-2 grid gap-2 sm:grid-cols-2">
        {SCENARIO_IDS.map((id) => (
          <button key={id} type="button" role="radio" aria-checked={scenario === id} disabled={busy} onClick={() => setScenario(id)} className={cn("rounded-xl border p-3 text-start transition-colors", scenario === id ? "border-os-cyan/50 bg-os-cyan/[0.06]" : "border-os-line hover:border-white/25")}>
            <span className="block text-[14px] text-white">{c.scenario[id].title}</span>
            <span className="mt-0.5 block text-[12px] text-white/50">
              {c.scenario[id].counterpart} · {c.scenario[id].vertical}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={start} disabled={busy || Boolean(blocked) || !health} className="inline-flex items-center gap-2 rounded-full border border-os-cyan/50 bg-os-cyan/10 px-4 py-2 text-[13px] text-os-cyan transition-colors hover:bg-os-cyan/20 disabled:cursor-not-allowed disabled:opacity-45">
          {busy ? <Loader2 className="size-4 animate-spin" /> : blocked ? <Lock className="size-4" /> : <Play className="size-4 rtl:-scale-x-100" />}
          {busy ? c.run.running : c.run.start}
        </button>
        {blocked && <span className="text-[12.5px] text-amber-200/80">{blocked}</span>}
      </div>
      <p className="mt-2 text-[11.5px] text-white/40">
        {c.run.permanent} {health && c.run.cap(health.dailyCap)}
      </p>

      {log.length > 0 && (
        <ol aria-live="polite" className="mt-4 grid gap-1 rounded-lg border border-white/[0.06] bg-black/30 p-3 font-mono text-[12px]">
          {log.map((l, i) => (
            <li key={i} className={cn("flex items-start gap-2", l.tone === "error" ? "text-red-300" : l.tone === "gap" ? "text-os-gold" : l.tone === "ok" ? "text-os-emerald" : l.tone === "move" ? "text-white/80" : "text-white/50")}>
              {l.tone === "error" ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> : l.tone === "ok" ? <Check className="mt-0.5 size-3.5 shrink-0" /> : <span className="w-3.5 shrink-0 text-center">·</span>}
              {l.text}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
