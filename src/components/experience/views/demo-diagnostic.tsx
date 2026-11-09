"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy, FileText, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { useLicensingCopy } from "@/components/control-plane/copy";
import { obsidianToast } from "@/components/control-plane/obsidian-toast";
import { CpButton, Widget } from "@/components/control-plane/widget";
import { useExperienceCopy } from "../copy";

type Pain = "leads" | "ops" | "deals" | "risk" | "data";
type Industry = "saas" | "finance" | "health" | "retail" | "industrial" | "media";
const PAINS: Pain[] = ["leads", "ops", "deals", "risk", "data"];
const INDUSTRIES: Industry[] = ["saas", "finance", "health", "retail", "industrial", "media"];
const HOURLY = 85;

/** Which engines answer which problem, and how strongly. Industry nudges the regulated / revenue engines. */
const PAIN_WEIGHTS: Record<Pain, Partial<Record<EngineKey, number>>> = {
  leads: { intentpulse: 1, vanguard: 0.8, cortex: 0.3 },
  ops: { coreops: 1, aether: 0.5, sovereign: 0.3 },
  deals: { apex: 1, vanguard: 0.4, cortex: 0.4 },
  risk: { shield: 1, sovereign: 0.8 },
  data: { cortex: 1, aether: 0.6, coreops: 0.3 },
};
const INDUSTRY_BOOST: Partial<Record<Industry, Partial<Record<EngineKey, number>>>> = {
  finance: { shield: 0.4, sovereign: 0.3 },
  health: { shield: 0.5, sovereign: 0.2 },
  saas: { intentpulse: 0.3, apex: 0.2 },
  retail: { coreops: 0.3, intentpulse: 0.2 },
  industrial: { coreops: 0.4, aether: 0.3 },
  media: { cortex: 0.3, vanguard: 0.3 },
};

/**
 * Client Diagnostic & Proposal Generator for the general demo partner key. Deterministic and local: the
 * prospect's answers score every engine, the top three become the recommended architecture, the team size picks
 * the key tier, and a plain-text proposal is drafted from it. Savings are stated as illustrative estimates.
 */
export function ClientDiagnostic() {
  const d = useExperienceCopy().diagnostic;
  const roleLabel = useLicensingCopy().roleLabel;
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState<Industry>("saas");
  const [team, setTeam] = useState(25);
  const [hours, setHours] = useState(40);
  const [pains, setPains] = useState<Pain[]>(["ops", "leads"]);
  const [ran, setRan] = useState(false);

  const scores = useMemo(() => {
    const s: Partial<Record<EngineKey, number>> = {};
    const add = (w: Partial<Record<EngineKey, number>> | undefined) => Object.entries(w ?? {}).forEach(([k, v]) => (s[k as EngineKey] = (s[k as EngineKey] ?? 0) + (v ?? 0)));
    pains.forEach((p) => add(PAIN_WEIGHTS[p]));
    add(INDUSTRY_BOOST[industry]);
    const top = Math.max(1, ...Object.values(s).map((v) => v ?? 0));
    return (Object.entries(s) as [EngineKey, number][]).map(([k, v]) => ({ k, fit: Math.round((v / top) * 100) })).sort((a, b) => b.fit - a.fit);
  }, [pains, industry]);

  const engines = scores.slice(0, 3).map((x) => x.k);
  if (engines.length < 3) for (const k of ["sovereign", "coreops", "intentpulse"] as EngineKey[]) if (engines.length < 3 && !engines.includes(k)) engines.push(k);
  // A prospect is one organization, so the production key is Enterprise; Agency keys are for multi-client operators.
  const tier = roleLabel.enterprise;
  const hoursSaved = Math.round(hours * Math.min(0.75, 0.35 + pains.length * 0.08));
  const annual = `$${(hoursSaved * HOURLY * 48).toLocaleString("en-US")}`;
  const proposal = d.build({
    company: company.trim() || d.placeholder,
    industry: d.industries[industry],
    team,
    hours,
    pains: pains.map((p) => d.painLabels[p]),
    engines: engines.map((k) => ENGINES[k].name),
    tier,
    annual,
    hoursSaved,
  });

  const field = "w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[12.5px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none";
  const label = "font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/45";

  return (
    <div className="grid gap-[var(--bloom-gap)] lg:grid-cols-2">
      <Widget icon={Stethoscope} title={d.title} sub={d.sub}>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setRan(true);
          }}
        >
          <label className="sm:col-span-2">
            <span className={label}>{d.company}</span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} placeholder={d.placeholder} className={cn("mt-1", field)} />
          </label>
          <label>
            <span className={label}>{d.industry}</span>
            <select value={industry} onChange={(e) => setIndustry(e.target.value as Industry)} className={cn("mt-1", field)}>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i} className="bg-os-panel">
                  {d.industries[i]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>
              {d.team} · <span className="tabular-nums text-white/80">{team}</span>
            </span>
            <input type="range" min={2} max={500} value={team} onChange={(e) => setTeam(Number(e.target.value))} className="mt-2 w-full accent-[var(--tier-accent)]" />
          </label>
          <label className="sm:col-span-2">
            <span className={label}>
              {d.hours} · <span className="tabular-nums text-white/80">{hours}</span>
            </span>
            <input type="range" min={0} max={400} step={5} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="mt-2 w-full accent-[var(--tier-accent)]" />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className={label}>{d.pains}</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PAINS.map((p) => {
                const on = pains.includes(p);
                return (
                  <button key={p} type="button" aria-pressed={on} onClick={() => setPains(on ? pains.filter((x) => x !== p) : [...pains, p])} className={cn("rounded-md border px-2.5 py-1 text-[12px] transition-colors", on ? "border-os-cyan/50 bg-os-cyan/10 text-os-cyan" : "border-white/10 text-white/60 hover:text-white")}>
                    {d.painLabels[p]}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <CpButton type="submit" className="sm:col-span-2 sm:justify-self-start">
            <Stethoscope className="size-3" /> {d.run}
          </CpButton>
        </form>
      </Widget>

      <Widget
        icon={FileText}
        title={d.proposal}
        actions={
          ran ? (
            <CpButton
              tone="quiet"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(proposal);
                } catch {
                  // Clipboard blocked: the proposal is still on screen to copy by hand.
                }
                obsidianToast(d.copied);
              }}
            >
              <ClipboardCopy className="size-3" /> {d.copy}
            </CpButton>
          ) : undefined
        }
      >
        <p className={label}>{d.fit}</p>
        <ul className="mt-1.5 space-y-1">
          {scores.slice(0, 5).map((s) => (
            <li key={s.k} className="grid grid-cols-[7rem_minmax(0,1fr)_2.5rem] items-center gap-2 font-mono text-[11px]">
              <span className={engines.includes(s.k) ? "text-os-cyan" : "text-white/60"}>{ENGINES[s.k].name}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <span className="block h-full rounded-full bg-os-cyan transition-[width] duration-700" style={{ width: `${s.fit}%`, opacity: engines.includes(s.k) ? 1 : 0.4 }} />
              </span>
              <span className="text-end tabular-nums text-white/60">{s.fit}</span>
            </li>
          ))}
        </ul>
        {ran && <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-black/40 p-3 font-sans text-[12.5px] leading-relaxed text-white/80">{proposal}</pre>}
        <p className="mt-2 text-[10.5px] text-white/35">{d.note}</p>
      </Widget>
    </div>
  );
}
