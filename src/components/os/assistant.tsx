"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { UTILITY } from "@/components/bloom/command/utility";
import { ROLE_INFO, can, type Permission } from "@/components/desk/rbac";
import { activeEnv, activeMember, useDeskSettings, verifyAudit, type DeskSettings } from "@/components/desk/settings";
import { ARCHITECTURES } from "@/lib/architectures";
import { isTuned, readCalibration } from "@/lib/engines/calibration";
import type { CommandManifest } from "@/lib/engines/events";
import { modelInfo } from "@/lib/engines/models";
import { useLicense } from "@/lib/license-context";
import { TIER_ENGINES, TIER_INFO, type Tier } from "@/lib/license/tiers";
import { ENGINE_DEMOS } from "./explore-data";
import { OS_NAV } from "./nav";
import { OsPage } from "./os-shell";
import { useOsTelemetry } from "./telemetry-context";

type Line = { id: number; who: "you" | "zero"; text: string };
type Ctx = { s: DeskSettings; tier: Tier; manifest: CommandManifest | null; latency: number | null; sla: string; uptime: number | null };
type Reply = { text: string; go?: string };

const CHIPS = ["Audit License", "Engine Diagnostic", "System Health Check", "Explain Sovereign", "Last runs", "My permissions", "Help"];

const engineIn = (q: string): EngineKey | null => ENGINE_ORDER.find((k) => q.includes(k) || q.includes(ENGINES[k].name.toLowerCase())) ?? null;
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60_000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

/**
 * Agent Zero's brain: deterministic intent matching over the workspace's own state. No model and no network;
 * every answer is computed from what's on this device (settings, license, history, audit) and the last probe.
 */
function respond(input: string, c: Ctx): Reply {
  const q = input.toLowerCase().trim();
  const s = c.s;
  const me = activeMember(s);

  if (/^(help|\?|what can you do|commands)/.test(q))
    return {
      text: [
        "I run entirely on this device: no model, no network. I can:",
        "  audit license              tier, scope, expiry and gaps",
        "  engine diagnostic [name]   calibration, model, memory and run health",
        "  system health check        runtime, latency, SLA, storage, audit chain",
        "  explain <engine|product>   what it does, in plain English",
        "  last runs / failed runs    your recent execution history",
        "  my permissions             what your role allows",
        "  threats                    security events on the record",
        "  open <pillar>              e.g. 'open threat matrix', 'open settings'",
      ].join("\n"),
    };

  if (/^(open|go to|goto|show)\b/.test(q)) {
    const target = OS_NAV.find((n) => q.includes(n.name.toLowerCase()) || q.includes(n.href.split("/").pop()!.replace("-", " ")));
    if (target) return { text: `Opening ${target.label}.`, go: target.href };
    const a = ARCHITECTURES.find((x) => q.includes(x.name.toLowerCase()) || q.includes(x.slug.replace(/-/g, " ")));
    if (a) return { text: `Opening the ${a.name} workspace.`, go: `/desk/architectures/${a.slug}` };
    const k = engineIn(q);
    if (k) return { text: `Opening the ${ENGINES[k].name} console.`, go: `/desk/engines/${k}` };
  }

  if (/licen[cs]e|tier|upgrade/.test(q)) {
    const lic = s.license;
    const locked = ENGINE_ORDER.filter((k) => !TIER_ENGINES[c.tier].includes(k));
    const products = ARCHITECTURES.filter((a) => a.engines.every((k) => TIER_ENGINES[c.tier].includes(k)));
    return {
      text: [
        `License: ${TIER_INFO[c.tier].label}${lic ? ` for ${lic.org}` : " (no key: evaluation)"}`,
        lic ? `  issued ${lic.issuedAt.slice(0, 10)} · ${lic.expiresAt ? `expires ${lic.expiresAt}` : "no expiry"}${lic.dev ? " · development key" : ""} · verified ${ago(lic.verifiedAt)}` : "  add a key in App Settings → License to unlock more engines",
        `  engines: ${TIER_ENGINES[c.tier].map((k) => ENGINES[k].name).join(", ")}`,
        `  products deployable: ${products.length}/10${products.length ? ` (${products.map((a) => a.name).join(", ")})` : ""}`,
        locked.length ? `  locked: ${locked.map((k) => ENGINES[k].name).join(", ")}. Upgrade to ${TIER_INFO[c.tier === "tier1" || c.tier === "evaluation" ? "tier2" : "tier3"].label} or above.` : "  nothing locked.",
      ].join("\n"),
    };
  }

  if (/diagnos|engine health|calibration/.test(q)) {
    const k = engineIn(q);
    const rows = (k ? [k] : ENGINE_ORDER).map((key) => {
      const cal = readCalibration(s.calibrations[key]);
      const runs = s.runs.filter((r) => r.target === key);
      const failed = runs.filter((r) => !r.ok).length;
      const status = !TIER_ENGINES[c.tier].includes(key) ? "LOCKED " : failed && failed === runs.length ? "FAILING" : "OK     ";
      return `  ${ENGINES[key].index} ${ENGINES[key].name.padEnd(12)} ${status} ${modelInfo(cal.model).label.padEnd(17)} budget ${String(cal.tokenBudget).padStart(5)} · memory ${cal.memory.length}/${cal.memoryRuns} · runs ${runs.length}${failed ? ` (${failed} failed)` : ""}${isTuned(s.calibrations[key]) ? " · tuned" : ""}`;
    });
    return { text: [`Engine diagnostic${k ? `: ${ENGINES[k].name}` : " (all 8)"}`, ...rows].join("\n") };
  }

  if (/health|status|system check|uptime|latency/.test(q)) {
    const chain = verifyAudit(s.audit);
    const bytes = new Blob([JSON.stringify(s)]).size;
    const keys = (["anthropic", "openrouter", "openai"] as const).filter((k) => s.keys[k].trim());
    return {
      text: [
        "System health check",
        `  runtime     ${c.manifest ? `${c.manifest.mode} via ${c.manifest.provider} (${c.manifest.model})` : "not probed yet"}`,
        `  latency     ${c.latency === null ? "n/a" : `${c.latency}ms`} · SLA ${c.uptime === null ? "n/a" : `${Math.round(c.uptime * 100)}%`} ${c.sla}`,
        `  environment ${activeEnv(s).name}`,
        `  provider keys on device: ${keys.length ? keys.join(", ") : "none (server configuration or simulation)"}`,
        `  local state ${(bytes / 1024).toFixed(1)} KB · ${s.runs.length} runs · ${s.audit.length} audit entries`,
        `  audit chain ${chain.ok ? `intact (${chain.checked} hashed${chain.unchained ? `, ${chain.unchained} legacy unchained` : ""})` : `BROKEN at entry #${chain.brokenAt}`}`,
        `  onboarding  ${s.onboarded ? "complete" : "not finished: run guided setup"}`,
      ].join("\n"),
    };
  }

  if (/^(explain|what is|what's|tell me about|describe)/.test(q) || /explain/.test(q)) {
    const a = ARCHITECTURES.find((x) => q.includes(x.name.toLowerCase()) || x.name.toLowerCase().split(" ").some((w) => w.length > 6 && q.includes(w)));
    const k = engineIn(q);
    if (k) {
      const d = ENGINE_DEMOS[k];
      return { text: [`${ENGINES[k].name} · Engine Nº ${ENGINES[k].index} · ${ENGINES[k].role}`, `  ${UTILITY.en[k]}`, `  how it works:`, ...d.thoughts.map((t) => `   - ${t}`), `  typical impact: ${d.impact.map((m) => `${m.label} ${m.value}`).join(" · ")}`].join("\n") };
    }
    if (a) return { text: [`${a.name}: ${a.engines.map((e) => ENGINES[e].name).join(" → ")}`, `  ${a.tagline}`, `  $${a.setup.toLocaleString("en-US")} setup · $${a.retainer.toLocaleString("en-US")}/mo`, `  typical: ${a.impact.compare.map((m) => `${m.label} ${m.before} → ${m.after} ${m.unit}`).join("; ")}`].join("\n") };
  }

  if (/fail/.test(q)) {
    const failed = s.runs.filter((r) => !r.ok).slice(-6).reverse();
    return { text: failed.length ? ["Failed runs", ...failed.map((r) => `  ${ago(r.at).padEnd(10)} ${r.label}: ${r.command.slice(0, 70)}`)].join("\n") : "No failed runs on record." };
  }

  if (/run|history|recent|last/.test(q)) {
    const last = s.runs.slice(-8).reverse();
    return { text: last.length ? ["Recent runs", ...last.map((r) => `  ${r.ok ? "✓" : "✗"} ${ago(r.at).padEnd(10)} ${r.label.padEnd(26)} ${(r.ms / 1000).toFixed(1)}s · ${r.tokens.input + r.tokens.output} tokens`)].join("\n") : "No runs yet. Try the Home command bar or an architecture testbed." };
  }

  if (/permission|role|who am i|whoami|can i/.test(q)) {
    const perms: Permission[] = ["run", "approve", "calibrate", "settings", "members", "license"];
    return { text: [`You are ${me.name} (${ROLE_INFO[me.role].label}): ${ROLE_INFO[me.role].blurb}`, ...perms.map((p) => `  ${can(me.role, p) ? "✓" : "·"} ${p}`)].join("\n") };
  }

  if (/threat|security|inject|breach|attack/.test(q)) {
    const sec = s.audit.filter((a) => a.kind === "security");
    return { text: sec.length ? [`${sec.length} security events on record. Latest:`, ...sec.slice(-5).reverse().map((a) => `  ${ago(a.at).padEnd(10)} ${a.message}`), "Open the Threat Matrix for the full picture."].join("\n") : "No security events on record. Prompt-injection attempts and access-control denials will appear here." };
  }

  if (/^(hi|hello|hey|shalom|hola)\b/.test(q)) return { text: `Hello ${me.name}. I'm Agent Zero, the desk's offline assistant. Type 'help' to see what I can do.` };

  return { text: `I didn't match that to anything I can check offline. Try: ${CHIPS.slice(0, 4).join(", ")}, or 'help'.` };
}

/** /desk/assistant: Agent Zero, a zero-LLM terminal assistant over local state. */
export function Assistant() {
  const router = useRouter();
  const { settings } = useDeskSettings();
  const { tier } = useLicense();
  const { manifest, latency, sla, uptime } = useOsTelemetry();
  const [lines, setLines] = useState<Line[]>([{ id: 0, who: "zero", text: "AGENT ZERO // offline assistant. No model, no network: answers come from this workspace's own state.\nType 'help', or pick a quick action below." }]);
  const [input, setInput] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const seq = useRef(1);

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const reply = respond(t, { s: settings, tier, manifest, latency, sla, uptime });
    setLines((l) => [...l, { id: seq.current++, who: "you", text: t }, { id: seq.current++, who: "zero", text: reply.text }]);
    setInput("");
    if (reply.go) setTimeout(() => router.push(reply.go!), 600);
  };

  return (
    <OsPage kicker="Local assistant · Agent Zero" title="Ask the desk about itself" lede="A deterministic, fully offline assistant: it inspects your license, engines, history and audit chain on this device, without calling any model.">
      <section className="os-panel overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-os-line px-4 py-2.5">
          <Cpu className="size-4 text-os-emerald" />
          <span className="font-mono text-[11px] tracking-[0.2em] text-os-emerald">AGENT ZERO</span>
          <span className="ms-auto font-mono text-[10px] text-white/35">offline · deterministic · 0 tokens</span>
        </div>
        <div ref={box} role="log" aria-live="polite" className="h-[28rem] overflow-y-auto bg-black/40 p-4 font-mono text-[12.5px] leading-relaxed">
          {lines.map((l) => (
            <div key={l.id} className={cn("mb-2 whitespace-pre-wrap", l.who === "you" ? "text-os-cyan" : "text-white/80")}>
              <span className={l.who === "you" ? "text-os-cyan/60" : "text-os-emerald"}>{l.who === "you" ? "you> " : "zero> "}</span>
              {l.text}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-os-line px-3 py-2">
          {CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => ask(c)} className="rounded-md border border-os-line px-2 py-1 font-mono text-[10.5px] text-white/60 hover:border-os-cyan/40 hover:text-os-cyan">
              [ {c} ]
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2 border-t border-os-line bg-black/30 px-3 py-2"
        >
          <span className="font-mono text-[12.5px] text-os-cyan">&gt;</span>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Agent Zero…" aria-label="Message Agent Zero" autoComplete="off" className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-white placeholder:text-white/30 focus:outline-none" />
          <button type="submit" aria-label="Send" className="rounded-md p-1.5 text-os-cyan hover:bg-os-cyan/10">
            <CornerDownLeft className="size-4" />
          </button>
        </form>
      </section>
    </OsPage>
  );
}
