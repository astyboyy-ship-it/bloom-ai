"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Loader2, Printer, ShieldCheck, ShieldX } from "lucide-react";
import { verifyCertificate, type Jwk, type SettlementCertificate as SdkCertificate, type VerificationResult } from "@bloom/exchange-sdk";
import { cn } from "@/lib/utils";
import type { OperatorView } from "@/lib/exchange/types";
import { useExchangeCopy } from "./copy";
import { Badge, HashDecode, num, Panel, Stat, SPRING, short, usd, type Tone } from "./ui";
import type { Exchange } from "./use-exchange";

type Tab = "rounds" | "resources" | "shield" | "aether" | "ap2" | "certificate";
const SEV: Record<string, Tone> = { critical: "rose", high: "rose", medium: "amber", low: "muted" };
const STATE_TONE: Record<string, Tone> = { completed: "emerald", input_required: "amber", failed: "rose", canceled: "muted", working: "solid", submitted: "solid" };

export function InspectorView({ x, selected, onSelect }: { x: Exchange; selected: string | null; onSelect: (id: string) => void }) {
  const t = useExchangeCopy().inspector;
  const [view, setView] = useState<OperatorView | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return setView(null);
    let alive = true;
    setLoading(true);
    void x.loadView(selected).then((v) => {
      if (!alive) return;
      setView(v);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // x.views changes when a decision updates the view; reload then too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, x.views[selected ?? ""]]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Panel className="p-2 sm:p-2">
        <p className="px-2 pb-2 pt-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{t.list}</p>
        <ul className="max-h-[70vh] space-y-px overflow-y-auto">
          {x.rows.length === 0 && <li className="px-2 py-6 text-center text-[11.5px] text-white/35">{t.none}</li>}
          {x.rows.map((r) => (
            <li key={r.taskId}>
              <button type="button" onClick={() => onSelect(r.taskId)} className={cn("w-full rounded-lg px-2.5 py-2 text-start transition-colors duration-150", selected === r.taskId ? "bg-white/[0.06]" : "hover:bg-white/[0.03]")}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("tnum truncate font-mono text-[10.5px]", r.certificateId ? "text-[var(--xch-emerald)]" : "text-white/60")} dir="ltr">
                    {r.certificateId ?? r.taskId}
                  </span>
                  <span className="tnum shrink-0 font-mono text-[11px] text-white/85" dir="ltr">
                    {usd(r.priceUsd)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-white/40">
                  <span className="truncate">{r.peer.name}</span>
                  <Badge tone={STATE_TONE[r.state]} className="ms-auto">
                    {r.state.replace("_", " ")}
                  </Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <AnimatePresence mode="wait">
        <motion.div key={view?.taskId ?? "empty"} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={SPRING} className="min-w-0">
          {!view ? (
            <Panel className="flex min-h-[320px] items-center justify-center">
              {loading ? <Loader2 className="size-4 animate-spin text-white/40" /> : <p className="max-w-sm text-center text-[12px] leading-relaxed text-white/40">{t.select}</p>}
            </Panel>
          ) : (
            <Detail view={view} keys={x.card?.keys ?? []} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Detail({ view, keys }: { view: OperatorView; keys: Jwk[] }) {
  const t = useExchangeCopy().inspector;
  const [tab, setTab] = useState<Tab>("rounds");
  const [check, setCheck] = useState<VerificationResult | null>(null);
  const cert = view.certificate;

  useEffect(() => {
    setCheck(null);
    if (!cert || keys.length === 0) return;
    let alive = true;
    void verifyCertificate(cert as unknown as SdkCertificate, keys).then((r) => alive && setCheck(r));
    return () => {
      alive = false;
    };
  }, [cert, keys]);

  const download = () => {
    const blob = new Blob([JSON.stringify(cert ?? view, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${cert?.certificateId ?? view.taskId}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <Panel className="p-0 sm:p-0">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--xch-line)] px-5 py-4">
        <div className="min-w-0">
          <p className={cn("truncate text-[15px] tracking-[0.03em]", cert ? "text-[var(--xch-emerald)]" : "font-mono text-[var(--xch-amber)]")}>{cert ? <HashDecode text={cert.certificateId} /> : view.taskId}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-white/45">
            {view.peer.name} · {view.item.description}
          </p>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {cert &&
            (check === null ? (
              <Badge>
                <Loader2 className="size-3 animate-spin" /> {t.verifying}
              </Badge>
            ) : check.valid ? (
              <Badge tone="emerald">
                <ShieldCheck className="size-3" /> {t.valid}
              </Badge>
            ) : (
              <Badge tone="rose">
                <ShieldX className="size-3" /> {t.invalid}: {check.reason}
              </Badge>
            ))}
          <button type="button" onClick={download} className="flex items-center gap-1 rounded-md border border-[var(--xch-line)] px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/60 hover:text-white">
            <Download className="size-3" /> {t.download}
          </button>
          {cert && (
            <button type="button" onClick={() => window.print()} className="flex items-center gap-1 rounded-md border border-[var(--xch-line)] px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/60 hover:text-white">
              <Printer className="size-3" /> {t.print}
            </button>
          )}
        </div>
      </header>

      <nav role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--xch-line)] px-3 py-2">
        {(Object.keys(t.tabs) as Tab[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("relative shrink-0 rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-150", tab === k ? "text-white" : "text-white/40 hover:text-white/80")}>
            {tab === k && <motion.span layoutId="xch-tab" className="absolute inset-0 rounded-md bg-white/[0.07]" transition={SPRING} />}
            <span className="relative">{t.tabs[k]}</span>
          </button>
        ))}
      </nav>

      <div className="max-h-[64vh] min-h-[300px] overflow-y-auto p-5">
        {tab === "rounds" && <Rounds view={view} />}
        {tab === "resources" && <Resources view={view} />}
        {tab === "shield" && <ShieldAudit view={view} />}
        {tab === "aether" && <AetherProof view={view} />}
        {tab === "ap2" && (cert ? <Json value={{ checkoutMandate: cert.ap2.checkoutMandate, paymentMandate: cert.ap2.paymentMandate, settlement: cert.settlement }} /> : <p className="text-[12px] text-white/45">{t.noCert}</p>)}
        {tab === "certificate" && <CertificateSummary view={view} />}
      </div>
      {cert && (
        <div className="xch-print" aria-hidden>
          <CertificateSummary view={view} print />
        </div>
      )}
    </Panel>
  );
}

function Rounds({ view }: { view: OperatorView }) {
  const t = useExchangeCopy().inspector;
  const detail = new Map(view.operatorRounds.map((d) => [d.n, d]));
  const lastBy: Record<string, number> = {};
  return (
    <div className="overflow-x-auto">
      <table className="tnum w-full min-w-[640px] font-mono text-[11px]">
        <thead>
          <tr className="text-[9.5px] uppercase tracking-[0.14em] text-white/35">
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
              <tr key={r.n} className={cn("border-t border-[var(--xch-line)] align-top", d?.clamps.length && "xch-clamp")}>
                <td className="py-1.5 pe-3 text-white/35">{r.n}</td>
                <td className={cn("py-1.5 pe-3", r.by === "initiator" ? "text-white/85" : "text-white/45")}>{r.by === "initiator" ? "provider" : "client"}</td>
                <td className="py-1.5 pe-3 text-white" dir="ltr">
                  {usd(r.terms.priceUsd)}
                </td>
                <td className="py-1.5 pe-3 text-white/45" dir="ltr">
                  {delta === null ? "—" : `${delta > 0 ? "+" : ""}${usd(delta)}`.replace("+$0", "$0")}
                </td>
                <td className="py-1.5 pe-3 text-white/55">{r.terms.netDays}</td>
                <td className="py-1.5 pe-3 capitalize text-white/55">{r.terms.slaTier}</td>
                <td className="py-1.5 pe-3">
                  {d?.clamps.length ? (
                    <span className="text-[var(--xch-amber)]" dir="ltr">
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
        <ul className="mt-4 space-y-1 border-t border-[var(--xch-line)] pt-3 text-[11.5px] text-white/60">
          {view.signals.map((s) => (
            <li key={`${s.kind}${s.round}`}>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">cortex · {s.kind.replace("_", " ")}</span> {s.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Resources({ view }: { view: OperatorView }) {
  const t = useExchangeCopy().inspector;
  const res = view.resources ?? null;
  if (!res) return <p className="text-[12px] text-white/45">{t.noResources}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="tnum w-full min-w-[620px] text-[11.5px]">
        <thead>
          <tr className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
            {(["dimension", "requested", "granted", "compliance", "commitment"] as const).map((c) => (
              <th key={c} className="pb-2 pe-3 text-start font-normal">
                {t.resCols[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {res.proofs.map((p) => (
            <tr key={p.dimension} className="border-t border-[var(--xch-line)]">
              <td className="py-2 pe-3 font-mono text-white/85">{p.dimension}</td>
              <td className="py-2 pe-3 font-mono text-white/55" dir="ltr">
                {num(p.requested)} {p.unit}
              </td>
              <td className="py-2 pe-3 font-mono text-white" dir="ltr">
                {num(p.granted)} {p.unit}
              </td>
              <td className="py-2 pe-3">
                <Badge tone={p.compliance === "within_mandate" ? "emerald" : "amber"}>{p.compliance.replace(/_/g, " ")}</Badge>
              </td>
              <td className="py-2 font-mono text-white/30" dir="ltr">
                {short(p.floorCommitment, 14)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShieldAudit({ view }: { view: OperatorView }) {
  const t = useExchangeCopy().inspector;
  const s = view.security;
  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Stat label={t.trust} value={`${s.trust}/100`} tone={s.trust < 40 ? "text-[var(--xch-rose)]" : "text-[var(--xch-emerald)]"} />
        <Stat label={t.posture} value={s.posture} />
        <Stat label={t.verdict} value={s.verdict} tone={s.verdict === "clean" ? "text-[var(--xch-emerald)]" : "text-[var(--xch-rose)]"} />
      </div>
      {s.threats.length === 0 ? (
        <p className="mt-5 text-[12px] text-white/45">{t.noThreats}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[11px]">
            <thead>
              <tr className="text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                {(["vector", "severity", "field", "excerpt"] as const).map((c) => (
                  <th key={c} className="pb-2 pe-3 text-start font-mono font-normal">
                    {t.threatCols[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.threats.map((x, i) => (
                <tr key={i} className="xch-intercept border-t border-[var(--xch-line)] align-top" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                  <td className="py-1.5 pe-3 font-mono text-white/80">{x.vector}</td>
                  <td className="py-1.5 pe-3">
                    <Badge tone={SEV[x.severity]}>{x.severity}</Badge>
                  </td>
                  <td className="py-1.5 pe-3 font-mono text-white/45" dir="ltr">
                    {x.field}
                  </td>
                  <td className="py-1.5 font-mono text-white/40 line-through decoration-[color-mix(in_srgb,var(--xch-rose)_60%,transparent)]" dir="ltr">
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t.realized} value={`${a.realizedMarginPct}%`} tone="text-[var(--xch-emerald)]" />
        <Stat label={t.floor} value={`${a.minMarginPct}%`} />
        <Stat label={t.headroom} value={`${a.marginHeadroomPct > 0 ? "+" : ""}${a.marginHeadroomPct} pts`} tone={a.marginHeadroomPct < 0 ? "text-[var(--xch-amber)]" : undefined} />
        <Stat label={t.pv} value={`${a.pvAdjustedMarginPct}%`} />
        <Stat label={t.timeValue} value={usd(a.timeValueCostUsd)} />
        <Stat label={t.capital} value={`${a.costOfCapitalPct}% / yr`} />
        <Stat label={t.resourceFloor} value={a.resourceFloorUsd ? usd(a.resourceFloorUsd) : "—"} />
        <Stat label={t.resourceHeadroom} value={a.resourceFloorUsd ? usd(a.resourceHeadroomUsd) : "—"} tone={a.resourceFloorUsd ? "text-[var(--xch-emerald)]" : undefined} />
      </div>
      <p className="mt-5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">{t.restructures}</p>
      {a.restructures.length === 0 ? (
        <p className="mt-1.5 text-[12px] text-white/45">{t.none}</p>
      ) : (
        <ul className="tnum mt-1.5 space-y-1 font-mono text-[11px] text-white/70">
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
    [t.terms, `${usd(c.terms.priceUsd)} USD · net ${c.terms.netDays} · ${c.terms.slaTier} SLA${c.resources ? ` · ${Object.entries(c.resources.allocation).map(([d, q]) => `${d} ${num(q)}`).join(", ")}` : ""}`],
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
      <dl className={cn("grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-[170px_1fr]", print && "mt-6")}>
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className={cn("font-mono text-[9.5px] uppercase tracking-[0.14em]", print ? "text-neutral-500" : "text-white/40")}>{k}</dt>
            <dd className={cn("tnum whitespace-pre-wrap break-all font-mono text-[11px]", print ? "text-black" : "text-white/80")} dir="ltr">
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
    <pre className="tnum overflow-auto rounded-[10px] border border-[var(--xch-line)] bg-black/50 p-4 font-mono text-[10.5px] leading-relaxed text-white/70" dir="ltr">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

