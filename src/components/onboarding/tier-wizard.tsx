"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { audit, setPersistence, updateSettings, useDeskSettings } from "@/components/desk/settings";
import { useLicense } from "@/lib/license-context";
import { useLicensingCopy } from "@/components/control-plane/copy";
import { KeyRoleBadge } from "@/components/control-plane/key-badge";
import { CpButton } from "@/components/control-plane/widget";
import { useAgencyClients } from "@/components/modes/role-decks";
import { resolveExperience } from "@/components/experience/experiences";
import { ResearchPanel } from "@/components/research/research-panel";
import { useOnboardingCopy } from "./copy";
import { setSampleData } from "./sample-data";
import { markWizardDone, wizardFor } from "./wizard-state";

const INDUSTRIES = ["finance", "healthcare", "manufacturing", "retail", "logistics"] as const;
const field = "w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none";
const label = "font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/45";

/**
 * Tier-specific guided setup, shown after the key unlock reveal. Each tier's steps write real workspace state:
 *  - operator    organization and node names, default environment, sample data → the Neural Control Plane
 *  - agency      agency name, first client researched and provisioned, its seats and nodes → the desk
 *  - enterprise  organization name, industry and three engines (the domain wizard), credential storage → the desk
 *  - demo        the prospect researched (simulated) and the demo reviewed → Demo Engine Mode
 * Finishing marks this key's setup done, so it runs once per key.
 */
export function TierWizard() {
  const w = useOnboardingCopy().wizard;
  const roleLabel = useLicensingCopy().roleLabel;
  const demoNames = useLicensingCopy().demo.targets;
  const router = useRouter();
  const { access, engines } = useLicense();
  const { settings, persistence } = useDeskSettings();
  const [clients, setClients] = useAgencyClients();
  const kind = wizardFor(access);
  const experience = resolveExperience(access);

  const [step, setStep] = useState(0);
  const [org, setOrg] = useState(settings.branding.orgName || access?.holderName || "");
  const [node, setNode] = useState(settings.nodeId || "operator-01");
  const [env, setEnv] = useState(settings.activeEnvId);
  const [sample, setSample] = useState(true);
  const [client, setClient] = useState("");
  const [seats, setSeats] = useState(5);
  const [nodes, setNodes] = useState(Math.min(250, access?.permissions.maxActiveNodes ?? 250));
  const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>("finance");
  const choices = useMemo(() => ENGINE_ORDER.filter((k) => engines.includes(k)), [engines]);
  const [picked, setPicked] = useState<EngineKey[]>(() => choices.slice(0, 3));
  const [storage, setStorage] = useState(persistence);
  const [prospect, setProspect] = useState("");

  if (!access || !kind) return null;
  const steps = kind === "demo" ? w.steps.demo : w.steps[kind];
  const last = step === steps.length - 1;
  const canNext = kind === "agency" && step === 1 ? client.trim().length > 0 : kind === "enterprise" && step === 1 ? picked.length === 3 : true;

  const finish = () => {
    if (kind === "operator") {
      updateSettings((s) => ({ branding: { ...s.branding, orgName: org.trim() || s.branding.orgName }, nodeId: node.trim() || s.nodeId, activeEnvId: env }));
      setSampleData(sample);
    }
    if (kind === "agency") {
      updateSettings((s) => ({ branding: { ...s.branding, orgName: org.trim() || s.branding.orgName }, project: { ...s.project, client: client.trim() } }));
      const name = client.trim().slice(0, 60);
      if (name && !clients.some((c) => c.name === name)) setClients([...clients, { id: `cl-${Date.now().toString(36)}`, name, seats, nodes }]);
    }
    if (kind === "enterprise") {
      updateSettings((s) => ({ branding: { ...s.branding, orgName: org.trim() || s.branding.orgName } }));
      try {
        localStorage.setItem("bloom-enterprise-domain", JSON.stringify({ industry, engines: picked, launched: true }));
      } catch {
        // The domain wizard on the desk can be completed again.
      }
      if (storage !== persistence) setPersistence(storage);
    }
    if (kind === "demo" && prospect.trim()) {
      updateSettings((s) => ({ project: { ...s.project, client: prospect.trim() } }));
    }
    updateSettings({ onboarded: true });
    markWizardDone(access.keyId);
    audit("system", `Completed ${access.role} guided setup for key ${access.keyId}`);
    router.push(kind === "operator" ? "/desk/control-plane" : "/desk");
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="os-label bloom-glow">{w.kicker(roleLabel[access.role])}</p>
        <KeyRoleBadge role={access.role} />
      </div>
      <ol className="mt-4 flex gap-1.5" aria-label={w.step(step + 1, steps.length)}>
        {steps.map((s, i) => (
          <li key={s.title} className="flex-1">
            <span className={cn("block h-1 rounded-full transition-colors duration-500", i <= step ? "bg-os-cyan" : "bg-white/10")} style={i <= step ? { boxShadow: "0 0 10px var(--tier-glow)" } : undefined} />
            <span className={cn("mt-1.5 block truncate font-mono text-[10px]", i === step ? "text-os-cyan" : "text-white/40")}>
              {i < step ? <Check className="me-1 inline size-3" /> : `0${i + 1} `}
              {s.title}
            </span>
          </li>
        ))}
      </ol>

      <div className="bloom-glass mt-5 rounded-2xl p-6">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-white">{steps[step].title}</h1>
        <p className="mt-1 text-[13.5px] text-white/55">{steps[step].body}</p>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="mt-5 grid gap-4">
            {/* ---------------------------------------------------------------- operator */}
            {kind === "operator" && step === 0 && (
              <>
                <label>
                  <span className={label}>{w.orgName}</span>
                  <input value={org} onChange={(e) => setOrg(e.target.value)} maxLength={80} className={cn("mt-1", field)} />
                </label>
                <label>
                  <span className={label}>{w.nodeId}</span>
                  <input value={node} onChange={(e) => setNode(e.target.value.replace(/[^\w.-]/g, "").slice(0, 40))} dir="ltr" className={cn("mt-1 font-mono", field)} />
                </label>
              </>
            )}
            {kind === "operator" && step === 1 && (
              <>
                <label>
                  <span className={label}>{w.environment}</span>
                  <select value={env} onChange={(e) => setEnv(e.target.value)} className={cn("mt-1", field)}>
                    {settings.environments.map((x) => (
                      <option key={x.id} value={x.id} className="bg-os-panel">
                        {x.name} · {x.region}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-[12.5px] text-white/70">
                  <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} className="accent-[var(--tier-accent)]" /> {w.sampleData}
                </label>
              </>
            )}
            {kind === "operator" && step === 2 && (
              <p className="flex items-center gap-3 rounded-xl border border-os-cyan/25 bg-os-cyan/[0.05] p-4 text-[13px] text-white/75">
                <Cpu className="size-6 shrink-0 text-os-cyan" style={{ filter: "drop-shadow(0 0 8px var(--tier-glow))" }} />
                {access.holderName} · {roleLabel.operator}
              </p>
            )}

            {/* ---------------------------------------------------------------- agency */}
            {kind === "agency" && step === 0 && (
              <label>
                <span className={label}>{w.orgName}</span>
                <input value={org} onChange={(e) => setOrg(e.target.value)} maxLength={80} className={cn("mt-1", field)} />
              </label>
            )}
            {kind === "agency" && step === 1 && (
              <>
                <ResearchPanel initialTarget={client} onResult={(r) => setClient(r.target)} />
                <label>
                  <span className={label}>{w.clientName}</span>
                  <input value={client} onChange={(e) => setClient(e.target.value)} maxLength={60} className={cn("mt-1", field)} />
                </label>
              </>
            )}
            {kind === "agency" && step === 2 && (
              <>
                <p className="text-[14px] text-white/85">{client}</p>
                <label>
                  <span className={label}>
                    {w.seats} · <span className="tabular-nums text-white/80">{seats}</span>
                  </span>
                  <input type="range" min={1} max={50} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="mt-2 w-full accent-[var(--tier-accent)]" />
                </label>
                <label>
                  <span className={label}>
                    {w.nodes} · <span className="tabular-nums text-white/80">{nodes}</span>
                  </span>
                  <input type="range" min={0} max={Math.max(10, access.permissions.maxActiveNodes)} step={10} value={nodes} onChange={(e) => setNodes(Number(e.target.value))} className="mt-2 w-full accent-[var(--tier-accent)]" />
                </label>
              </>
            )}

            {/* ---------------------------------------------------------------- enterprise */}
            {kind === "enterprise" && step === 0 && (
              <label>
                <span className={label}>{w.orgName}</span>
                <input value={org} onChange={(e) => setOrg(e.target.value)} maxLength={80} className={cn("mt-1", field)} />
              </label>
            )}
            {kind === "enterprise" && step === 1 && (
              <>
                <div>
                  <span className={label}>{w.industry}</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {INDUSTRIES.map((i) => (
                      <button key={i} type="button" aria-pressed={industry === i} onClick={() => setIndustry(i)} className={cn("rounded-lg border px-3 py-1.5 text-[12.5px] transition-colors", industry === i ? "bloom-edge-glow text-os-cyan" : "border-white/10 text-white/65 hover:text-white")}>
                        {w.industries[i]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={label}>{w.engines(picked.length)}</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {choices.map((k) => {
                      const on = picked.includes(k);
                      return (
                        <button key={k} type="button" aria-pressed={on} disabled={!on && picked.length >= 3} onClick={() => setPicked(on ? picked.filter((x) => x !== k) : [...picked, k])} className={cn("rounded-md border px-2.5 py-1 font-mono text-[11.5px] transition-colors disabled:opacity-35", on ? "border-os-cyan/50 bg-os-cyan/10 text-os-cyan" : "border-white/10 text-white/60 hover:text-white")}>
                          {ENGINES[k].name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            {kind === "enterprise" && step === 2 && (
              <fieldset className="grid gap-2">
                <legend className={label}>{w.persistence}</legend>
                {(["device", "session"] as const).map((m) => (
                  <label key={m} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px]", storage === m ? "border-os-cyan/45 text-white" : "border-white/10 text-white/60")}>
                    <input type="radio" name="storage" checked={storage === m} onChange={() => setStorage(m)} className="accent-[var(--tier-accent)]" /> {m === "device" ? w.device : w.session}
                  </label>
                ))}
              </fieldset>
            )}

            {/* ---------------------------------------------------------------- demo */}
            {kind === "demo" && step === 0 && <ResearchPanel initialTarget={prospect} onResult={(r) => setProspect(r.target)} />}
            {kind === "demo" && step === 1 && (
              <dl className="grid gap-2 sm:grid-cols-3">
                {[
                  [w.architecture, access.permissions.demoTarget ? demoNames[access.permissions.demoTarget].name : w.demoNames[experience] ?? w.demoNames.demo_general],
                  [w.prospect, prospect || "—"],
                  [w.referral, access.permissions.partnerReferralId ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2">
                    <dt className={label}>{k}</dt>
                    <dd className="mt-1 truncate text-[13px] text-white/85">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <CpButton tone="quiet" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft className="size-3 rtl:-scale-x-100" /> {w.back}
        </CpButton>
        <button
          type="button"
          onClick={() => {
            markWizardDone(access.keyId);
            updateSettings({ onboarded: true });
            router.push("/desk");
          }}
          className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/35 hover:text-white/70"
        >
          {w.skip}
        </button>
        {last ? (
          <CpButton onClick={finish}>
            {w.finish} <ArrowRight className="size-3 rtl:-scale-x-100" />
          </CpButton>
        ) : (
          <CpButton disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            {w.next} <ArrowRight className="size-3 rtl:-scale-x-100" />
          </CpButton>
        )}
      </div>
    </div>
  );
}
