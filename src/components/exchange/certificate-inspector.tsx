"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Loader2, Printer, ShieldCheck, ShieldX, X } from "lucide-react";
import { verifyCertificate, type Jwk, type SettlementCertificate as SdkCertificate, type VerificationResult } from "@bloom/exchange-sdk";
import { cn } from "@/lib/utils";
import type { OperatorView } from "@/lib/exchange/types";
import { useExchangeCopy } from "./copy";
import { Badge, Stat, short, usd, type Tone } from "./ui";

type Tab = "rounds" | "shield" | "aether" | "ap2" | "certificate";
const SEV: Record<string, Tone> = { critical: "red", high: "amber", medium: "amber", low: "muted" };

export function CertificateInspector({ view, keys, onClose }: { view: OperatorView | null; keys: Jwk[]; onClose: () => void }) {
  const t = useExchangeCopy().inspector;
  const [tab, setTab] = useState<Tab>("rounds");
  const [check, setCheck] = useState<VerificationResult | null>(null);
  const cert = view?.certificate ?? null;

  useEffect(() => {
    setCheck(null);
    if (!cert || keys.length === 0) return;
    let alive = true;
    verifyCertificate(cert as unknown as SdkCertificate, keys).then((r) => alive && setCheck(r));
    return () => {
      alive = false;
    };
  }, [cert, keys]);

  useEffect(() => {
    if (!view) return;
    setTab("rounds");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view, onClose]);

  const download = () => {
    if (!view) return;
    const blob = new Blob([JSON.stringify(cert ?? view, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${cert?.certificateId ?? view.taskId}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <AnimatePresence>
      {view && (
        <>
          <motion.div key="backdrop" className="fixed inset-0 z-[80] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={cert?.certificateId ?? view.taskId}
            className="bloom-glass fixed inset-x-3 bottom-3 top-[6vh] z-[90] mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl sm:inset-x-6"
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-5 py-3.5">
              <div className="min-w-0">
                <p className={cn("truncate font-mono text-[15px] tracking-[0.04em]", cert ? "text-os-emerald" : "text-amber-200")} dir="ltr">
                  {cert?.certificateId ?? view.taskId}
                </p>
                <p className="mt-0.5 truncate text-[11.5px] text-white/45">
                  {view.peer.name} · {view.item.description}
                </p>
              </div>
              <div className="ms-auto flex flex-wrap items-center gap-2">
                {cert &&
                  (check === null ? (
                    <Badge tone="muted">
                      <Loader2 className="size-3 animate-spin" /> {t.verifying}
                    </Badge>
                  ) : check.valid ? (
                    <Badge tone="emerald">
                      <ShieldCheck className="size-3" /> {t.valid}
                    </Badge>
                  ) : (
                    <Badge tone="red">
                      <ShieldX className="size-3" /> {t.invalid}: {check.reason}
                    </Badge>
                  ))}
                <button type="button" onClick={download} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/60 hover:text-white">
                  <Download className="size-3" /> {t.download}
                </button>
                {cert && (
                  <button type="button" onClick={() => window.print()} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/60 hover:text-white">
                    <Printer className="size-3" /> {t.print}
                  </button>
                )}
                <button type="button" onClick={onClose} aria-label={t.close} className="rounded-md p-1 text-white/50 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
            </header>

            <nav role="tablist" className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-4 py-2">
              {(Object.keys(t.tabs) as Tab[]).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("shrink-0 rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors", tab === k ? "bg-os-cyan/[0.1] text-os-cyan" : "text-white/45 hover:text-white")}>
                  {t.tabs[k]}
                </button>
              ))}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tab === "rounds" && <Rounds view={view} />}
              {tab === "shield" && <ShieldAudit view={view} />}
              {tab === "aether" && <AetherProof view={view} />}
              {tab === "ap2" && (cert ? <Json value={{ checkoutMandate: cert.ap2.checkoutMandate, paymentMandate: cert.ap2.paymentMandate, settlement: cert.settlement }} /> : <p className="text-[12px] text-white/45">{t.noCert}</p>)}
              {tab === "certificate" && <CertificateSummary view={view} />}
            </div>
          </motion.div>
          {cert && (
            <div className="xch-print" aria-hidden>
              <CertificateSummary view={view} print />
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

function Rounds({ view }: { view: OperatorView }) {
  const t = useExchangeCopy().inspector;
  const detail = new Map(view.operatorRounds.map((d) => [d.n, d]));
  const lastBy: Record<string, number> = {};
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] font-mono text-[11px] tabular-nums">
        <thead>
          <tr className="text-start text-[9px] uppercase tracking-[0.16em] text-white/35">
            {(["n", "side", "price", "delta", "net", "sla", "clamp", "hash"] as const).map((c) => (
              <th key={c} className="pb-2 pe-3 text-start font-normal">
                {t.cols[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.rounds.map((r) => {
            const prev = lastBy[r.by];
            lastBy[r.by] = r.terms.priceUsd;
            const delta = prev === undefined ? null : r.terms.priceUsd - prev;
            const d = detail.get(r.n);
            return (
              <tr key={r.n} className="border-t border-white/[0.05] align-top">
                <td className="py-1.5 pe-3 text-white/35">{r.n}</td>
                <td className={cn("py-1.5 pe-3", r.by === "initiator" ? "text-os-cyan" : "text-amber-200")}>{r.by === "initiator" ? "provider" : "client"}</td>
                <td className="py-1.5 pe-3 text-white/90" dir="ltr">
                  {usd(r.terms.priceUsd)}
                </td>
                <td className={cn("py-1.5 pe-3", delta === null || delta === 0 ? "text-white/30" : delta < 0 ? "text-orange-200/80" : "text-os-emerald/80")} dir="ltr">
                  {delta === null ? "—" : `${delta > 0 ? "+" : ""}${usd(delta)}`.replace("+$0", "$0")}
                </td>
                <td className="py-1.5 pe-3 text-white/55">{r.terms.netDays}</td>
                <td className="py-1.5 pe-3 capitalize text-white/55">{r.terms.slaTier}</td>
                <td className="py-1.5 pe-3">
                  {d?.clamps.length ? (
                    <span className="text-amber-200" dir="ltr">
                      {d.clamps.map((c) => `${c.rule} ${typeof c.from === "number" ? usd(c.from) : c.from}→${typeof c.to === "number" ? usd(c.to) : c.to}`).join(", ")}
                    </span>
                  ) : d ? (
                    <span className="text-white/30" dir="ltr">
                      {d.model.replace("apex/", "")}
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
                <td className="py-1.5 text-white/30" dir="ltr">
                  {short(r.hash)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {view.signals.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-white/[0.06] pt-3 text-[11.5px] text-white/60">
          {view.signals.map((s) => (
            <li key={`${s.kind}${s.round}`}>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-violet-300">cortex · {s.kind.replace("_", " ")}</span> {s.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ShieldAudit({ view }: { view: OperatorView }) {
  const t = useExchangeCopy().inspector;
  const s = view.security;
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t.trust} value={`${s.trust}/100`} tone={s.trust < 40 ? "text-amber-200" : "text-os-emerald"} />
        <Stat label={t.posture} value={s.posture} />
        <Stat label={t.verdict} value={s.verdict} tone={s.verdict === "clean" ? "text-os-emerald" : "text-amber-200"} />
      </div>
      {s.threats.length === 0 ? (
        <p className="mt-5 text-[12px] text-white/45">{t.noThreats}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[11px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.16em] text-white/35">
                {(["vector", "severity", "field", "excerpt"] as const).map((c) => (
                  <th key={c} className="pb-2 pe-3 text-start font-mono font-normal">
                    {t.threatCols[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.threats.map((x, i) => (
                <tr key={i} className="border-t border-white/[0.05] align-top">
                  <td className="py-1.5 pe-3 font-mono text-white/80">{x.vector}</td>
                  <td className="py-1.5 pe-3">
                    <Badge tone={SEV[x.severity]}>{x.severity}</Badge>
                  </td>
                  <td className="py-1.5 pe-3 font-mono text-white/45" dir="ltr">
                    {x.field}
                  </td>
                  <td className="py-1.5 font-mono text-white/40 line-through decoration-red-400/50" dir="ltr">
                    {x.excerpt || x.rule}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AetherProof({ view }: { view: OperatorView }) {
  const copy = useExchangeCopy().inspector;
  const t = copy.margin;
  const a = view.aether;
  if (!a) return <p className="text-[12px] text-white/45">{copy.noCert}</p>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label={t.realized} value={`${a.realizedMarginPct}%`} tone="text-os-emerald" />
        <Stat label={t.floor} value={`${a.minMarginPct}%`} />
        <Stat label={t.headroom} value={`${a.marginHeadroomPct > 0 ? "+" : ""}${a.marginHeadroomPct} pts`} tone={a.marginHeadroomPct < 0 ? "text-orange-200" : undefined} />
        <Stat label={t.pv} value={`${a.pvAdjustedMarginPct}%`} />
        <Stat label={t.timeValue} value={usd(a.timeValueCostUsd)} />
        <Stat label={t.capital} value={`${a.costOfCapitalPct}% / yr`} />
      </div>
      <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">{t.restructures}</p>
      {a.restructures.length === 0 ? (
        <p className="mt-1.5 text-[12px] text-white/45">{t.none}</p>
      ) : (
        <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-sky-200/80">
          {a.restructures.map((r) => (
            <li key={r.round}>
              R{r.round}: net {r.fromNetDays} → net {r.toNetDays}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CertificateSummary({ view, print }: { view: OperatorView; print?: boolean }) {
  const copy = useExchangeCopy().inspector;
  const t = copy.cert;
  const c = view.certificate;
  if (!c) return <p className="text-[12px] text-white/45">{copy.noCert}</p>;
  const rows: [string, string][] = [
    [t.issued, `${new Date(c.issuedAt).toLocaleString()} · ${c.environment} · ${c.source}`],
    [t.terms, `${usd(c.terms.priceUsd)} USD · net ${c.terms.netDays} · ${c.terms.slaTier} SLA`],
    [t.due, c.terms.paymentDueDate],
    [t.compliance, `provider ${c.compliance.initiator} · client ${c.compliance.counterparty} · ${c.compliance.verifiedBy}`],
    [t.commitments, `${c.parties.initiator.mandateCommitment}\n${c.parties.counterparty.mandateCommitment}`],
    [t.chainHead, `${c.rounds.chainHead} (${c.rounds.count})`],
    [t.signature, `${c.signature.kid} · ${c.signature.value}`],
    [t.seal, c.seal.value],
    [t.rail, `${c.settlement.preferredRail} · x402 ${c.settlement.x402.network} · stripe ${c.settlement.stripe.paymentIntent.amount}¢`],
    [t.binding, String(c.settlement.binding)],
  ];
  return (
    <div className={print ? "p-10 font-mono text-[11px] text-black" : ""}>
      {print && (
        <>
          <p className="text-[10px] uppercase tracking-[0.3em]">Bloom Exchange · Settlement Certificate</p>
          <h1 className="mt-2 text-[22px] tracking-[0.06em]">{c.certificateId}</h1>
          <p className="mt-1 text-[11px]">
            {c.parties.initiator.agent} ⇄ {c.parties.counterparty.agent} · {c.item.description}
          </p>
        </>
      )}
      <dl className={cn("grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-[180px_1fr]", print && "mt-6")}>
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className={cn("font-mono text-[9.5px] uppercase tracking-[0.16em]", print ? "text-neutral-500" : "text-white/40")}>{k}</dt>
            <dd className={cn("whitespace-pre-wrap break-all font-mono text-[11px]", print ? "text-black" : "text-white/80")} dir="ltr">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="overflow-auto rounded-lg border border-white/[0.07] bg-black/50 p-4 font-mono text-[10.5px] leading-relaxed text-white/70" dir="ltr">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
