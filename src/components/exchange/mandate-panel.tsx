"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Lock, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { effectiveFloor, InitiatorMandateSchema, SLA_TIERS, type InitiatorMandate } from "@/lib/exchange/types";
import { useExchangeCopy } from "./copy";
import { Badge, Panel, PanelHeader, usd } from "./ui";
import type { Exchange } from "./use-exchange";

const NUMERIC = ["anchorPriceUsd", "floorPriceUsd", "costBasisUsd", "minMarginPct", "maxNetDays", "autoSettleCeilingUsd"] as const;

export function MandatePanel({ x }: { x: Exchange }) {
  const t = useExchangeCopy().mandate;
  const [draft, setDraft] = useState<InitiatorMandate>(x.mandate);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setDraft(x.mandate), [x.mandate]);
  useEffect(() => setOrigin(window.location.origin), []);

  const valid = InitiatorMandateSchema.safeParse(draft).success;
  const dirty = JSON.stringify(draft) !== JSON.stringify(x.mandate);
  const floor = effectiveFloor(draft);
  const cardUrl = `${origin}/.well-known/agent-card.json`;
  const snippet = `import { BloomExchangeClient } from "@bloom/exchange-sdk";

const bloom = new BloomExchangeClient({ baseUrl: "${origin || "https://your-bloom.app"}" });
const run = bloom.negotiate({ mandate: { ceilingPriceUsd: 52_000, maxBudgetUsd: 55_000, requiredSlaTier: "gold", targetNetDays: 45 }, item: { description: "12-month license" } });
const { certificate } = await run.result;
console.log(await bloom.verifyCertificate(certificate!));`;

  const save = async () => {
    setSaving(true);
    const ok = await x.saveMandate(draft);
    setSaving(false);
    if (ok) toast.success(t.saved);
    else toast.error(t.invalid);
  };

  return (
    <Panel className="xl:col-span-4">
      <PanelHeader icon={Lock} title={t.title} sub={x.status?.operator ? t.subOperator : t.subSandbox} />

      <form
        className="mt-4 grid grid-cols-2 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {NUMERIC.map((k) => (
          <label key={k} className="block min-w-0">
            <span className="block truncate font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">{t.fields[k]}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={k === "minMarginPct" ? 0.5 : 1}
              value={draft[k]}
              onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value === "" ? 0 : Number(e.target.value) }))}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-[12.5px] tabular-nums text-white outline-none transition-colors focus:border-os-cyan/60"
              dir="ltr"
            />
          </label>
        ))}
        <label className="block min-w-0">
          <span className="block truncate font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">{t.fields.maxSlaTier}</span>
          <select value={draft.maxSlaTier} onChange={(e) => setDraft((d) => ({ ...d, maxSlaTier: e.target.value as InitiatorMandate["maxSlaTier"] }))} className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[12.5px] capitalize text-white outline-none focus:border-os-cyan/60">
            {SLA_TIERS.map((s) => (
              <option key={s} value={s} className="bg-[#0c0e14]">
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="flex min-w-0 flex-col justify-end">
          <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">{t.effectiveFloor}</span>
          <span className={cn("mt-1 rounded-md border border-dashed px-2.5 py-1.5 font-mono text-[12.5px] tabular-nums", valid ? "border-os-emerald/30 text-os-emerald" : "border-amber-300/40 text-amber-200")} dir="ltr">
            {Number.isFinite(floor) ? usd(floor) : "—"}
          </span>
        </div>
        {!valid && <p className="col-span-2 text-[11px] text-amber-200/90">{t.invalid}</p>}
        <button type="submit" disabled={!valid || !dirty || saving} className="bloom-edge-glow col-span-2 mt-1 rounded-lg border bg-os-cyan/[0.08] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-os-cyan transition-opacity disabled:opacity-35">
          {t.save}
        </button>
      </form>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">{t.endpoint}</p>
          {x.card ? (
            <Badge tone={x.card.verified ? "emerald" : "amber"}>
              {x.card.verified ? <ShieldCheck className="size-3" /> : <ShieldAlert className="size-3" />}
              {x.card.verified ? t.verified : t.unverified}
            </Badge>
          ) : null}
        </div>
        <a href="/.well-known/agent-card.json" target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-1.5 truncate rounded-md border border-white/[0.07] bg-black/30 px-2.5 py-1.5 font-mono text-[11px] text-white/75 hover:text-white" dir="ltr">
          <span className="truncate">{cardUrl}</span>
          <ExternalLink className="size-3 shrink-0" />
        </a>
        {x.card && (
          <p className="mt-1.5 truncate font-mono text-[10px] text-white/35" dir="ltr">
            {x.card.keys[0]?.kid} · {x.card.card.supportedInterfaces.map((i) => i.protocolBinding).join(" · ")} · {x.card.card.skills.map((s) => s.id).join(", ")}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">{t.sdk}</p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(snippet).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              });
            }}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/50 hover:text-white"
          >
            {copied ? <Check className="size-3 text-os-emerald" /> : <Copy className="size-3" />} {copied ? t.copied : t.copy}
          </button>
        </div>
        <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg border border-white/[0.07] bg-black/50 p-3 font-mono text-[10.5px] leading-relaxed text-white/70" dir="ltr">
          {snippet}
        </pre>
      </div>
    </Panel>
  );
}
