"use client";

import { useMemo, useState } from "react";
import { Award, CheckCircle2, Download, FileText, Link2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { approvalSigPayload, audit, useDeskSettings, verifyLedger, verifyRun, type DeskSettings, type RunRecord } from "@/components/desk/settings";
import { useLicense } from "@/lib/license-context";
import { TIER_INFO, type Tier } from "@/lib/license/tiers";
import { sha256 } from "@/lib/sha256";

/** Builds a Certificate of Autonomous Execution for one sealed run, with every check recomputed now. */
export function buildCertificate(s: DeskSettings, r: RunRecord, tier: Tier) {
  const v = verifyRun(r);
  const ledger = verifyLedger(s.runs);
  const approvals = s.approvals
    .filter((a) => a.runId === r.runId && a.status !== "pending")
    .map((a) => ({ action: a.title, owner: a.owner, decision: a.status, by: a.by ?? "", at: a.decidedAt ? new Date(a.decidedAt).toISOString() : null, signature: a.sig ?? null, signatureValid: !!a.sig && a.sig === sha256(approvalSigPayload(a, r.seal ?? "unsealed")) }));
  const approvalIds = new Set(s.approvals.filter((a) => a.runId === r.runId).map((a) => a.id));
  const board = s.boardSessions.filter((b) => b.runId === r.runId || (b.approvalId && approvalIds.has(b.approvalId))).map((b) => ({ subject: b.subject, verdict: b.verdict, consensus: Number(b.score.toFixed(4)), sessionHash: b.hash }));
  const body = {
    certificate: `CAE-${(r.seal ?? "").slice(0, 12).toUpperCase()}`,
    title: "Certificate of Autonomous Execution",
    issuedAt: new Date().toISOString(),
    issuer: "BLOOM AI // OPERATING DESK",
    workspace: s.branding.orgName || "Workspace",
    license: TIER_INFO[tier].label,
    execution: { runId: r.runId, kind: r.kind, target: r.target, label: r.label, timestamp: new Date(r.at).toISOString(), durationMs: r.ms, succeeded: r.ok, node: r.node ?? null, environment: r.env, tokens: r.tokens },
    integrity: { algorithm: "SHA-256", inputHash: r.inputHash, outputHash: r.outputHash, inputMatch: v.input, outputMatch: v.output, previousSeal: r.prevSeal, seal: r.seal, sealValid: v.seal, ledgerIntact: ledger.ok, ledgerRunsVerified: ledger.checked },
    humanApprovals: approvals,
    shadowBoard: board,
    auditAnchor: s.audit.at(-1)?.hash ?? null,
  };
  const valid = v.input && v.output && v.seal && ledger.ok && approvals.every((a) => a.signatureValid);
  return { ...body, verdict: valid ? "VERIFIED" : "FAILED", certificateHash: sha256(JSON.stringify(body)) };
}
type Certificate = ReturnType<typeof buildCertificate>;

const save = (name: string, body: string, type: string) => {
  const url = URL.createObjectURL(new Blob([body], { type }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
};
const esc = (x: unknown) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function printCertificate(c: Certificate) {
  const w = window.open("", "_blank", "width=860,height=1100");
  if (!w) return;
  const row = (k: string, v: unknown, mono = false) => `<tr><th>${esc(k)}</th><td class="${mono ? "mono" : ""}">${esc(v)}</td></tr>`;
  const ok = (b: boolean) => `<span class="${b ? "ok" : "bad"}">${b ? "MATCH" : "MISMATCH"}</span>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.certificate)}</title>
<style>body{font:12px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#111;margin:40px}.frame{border:2px solid #0b2530;padding:28px 32px;border-radius:6px}
h1{font-size:22px;margin:4px 0 2px;letter-spacing:.02em}.kicker{font:600 10px/1 Consolas,monospace;letter-spacing:.2em;color:#0a7d8c}h2{font-size:11px;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.12em;color:#555}
table{width:100%;border-collapse:collapse}th{width:34%;text-align:left;font-weight:500;color:#555;padding:3px 8px 3px 0;vertical-align:top}td{padding:3px 0;word-break:break-all}.mono{font-family:Consolas,monospace;font-size:10.5px}
.ok{color:#0a7d4f;font-weight:600}.bad{color:#b00020;font-weight:600}.verdict{font-size:16px;margin-top:6px}.foot{margin-top:22px;font-size:10px;color:#777}</style></head><body><div class="frame">
<div class="kicker">BLOOM AI // OPERATING DESK</div><h1>${esc(c.title)}</h1><div class="mono">${esc(c.certificate)} · issued ${esc(c.issuedAt)}</div>
<p class="verdict ${c.verdict === "VERIFIED" ? "ok" : "bad"}">${c.verdict === "VERIFIED" ? "✔ Execution verified" : "✖ Verification failed"}</p>
<h2>Execution</h2><table>${row("Workspace", `${c.workspace} · ${c.license}`)}${row("Run", `${c.execution.label} (${c.execution.kind}) · ${c.execution.runId}`)}${row("Timestamp", c.execution.timestamp)}${row("Node identity", c.execution.node, true)}${row("Environment", c.execution.environment)}${row("Outcome", `${c.execution.succeeded ? "Succeeded" : "Failed"} in ${(c.execution.durationMs / 1000).toFixed(2)}s`)}</table>
<h2>Input / output hash match</h2><table><tr><th>Input hash</th><td class="mono">${esc(c.integrity.inputHash)} ${ok(c.integrity.inputMatch)}</td></tr><tr><th>Output hash</th><td class="mono">${esc(c.integrity.outputHash)} ${ok(c.integrity.outputMatch)}</td></tr>${row("Previous seal", c.integrity.previousSeal, true)}<tr><th>Execution seal</th><td class="mono">${esc(c.integrity.seal)} ${ok(c.integrity.sealValid)}</td></tr>${row("Ledger", c.integrity.ledgerIntact ? `Intact across ${c.integrity.ledgerRunsVerified} sealed runs` : "BROKEN")}</table>
<h2>Human-in-the-loop approvals</h2>${c.humanApprovals.length ? `<table>${c.humanApprovals.map((a) => `<tr><th>${esc(a.decision.toUpperCase())}: ${esc(a.action)}</th><td class="mono">${esc(a.by)} · ${esc(a.at)}<br>${esc(a.signature)} ${ok(a.signatureValid)}</td></tr>`).join("")}</table>` : "<p>No approval-gated actions on this run.</p>"}
<h2>Shadow Board</h2>${c.shadowBoard.length ? `<table>${c.shadowBoard.map((b) => `<tr><th>${esc(b.verdict.toUpperCase())} · ${(b.consensus * 100).toFixed(1)}%</th><td>${esc(b.subject)}<br><span class="mono">${esc(b.sessionHash)}</span></td></tr>`).join("")}</table>` : "<p>Not stress-tested by the board.</p>"}
<h2>Certificate hash</h2><p class="mono">${esc(c.certificateHash)}</p><p class="foot">Hashes are SHA-256 over the stored, credential-redacted records. Recompute them from the JSON export to verify independently. Audit anchor: <span class="mono">${esc(c.auditAnchor)}</span></p>
</div><script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

/** /desk/audit: the proof-of-execution ledger and its downloadable certificates. */
export function ExecutionLedger() {
  const { settings } = useDeskSettings();
  const { tier } = useLicense();
  const sealed = useMemo(() => [...settings.runs].filter((r) => r.seal).reverse(), [settings.runs]);
  const ledger = useMemo(() => verifyLedger(settings.runs), [settings.runs]);
  const [picked, setPicked] = useState<string | null>(null);
  const run = sealed.find((r) => r.runId === picked) ?? sealed[0];
  const cert = run ? buildCertificate(settings, run, tier) : null;

  const exportJson = (c: Certificate) => {
    save(`${c.certificate}.json`, JSON.stringify(c, null, 2), "application/json");
    audit("system", `Exported execution certificate ${c.certificate} (JSON)`);
  };
  const exportPdf = (c: Certificate) => {
    printCertificate(c);
    audit("system", `Exported execution certificate ${c.certificate} (PDF)`);
  };

  return (
    <section className="os-panel mt-4 rounded-2xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-os-line px-4 py-2.5">
        <p className="os-label flex items-center gap-2 text-white/60">
          <Award className="size-3.5 text-os-gold" /> Proof of execution · certificates
        </p>
        <span className={cn("flex items-center gap-1 font-mono text-[10.5px]", ledger.ok ? "text-os-emerald/85" : "text-red-300")}>
          <Link2 className="size-3" /> {ledger.ok ? `ledger intact · ${ledger.checked} sealed runs` : `ledger broken at ${ledger.brokenAt}`}
        </span>
      </div>
      {!run || !cert ? (
        <p className="px-4 py-5 text-[12.5px] text-white/45">No sealed runs yet. Every run completed from now on is sealed into the execution ledger (input hash, output hash, node identity, chained seal) and can be certified here.</p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <ul className="max-h-[26rem] divide-y divide-os-line/60 overflow-y-auto border-os-line lg:border-e">
            {sealed.map((r) => {
              const v = verifyRun(r);
              const good = v.input && v.output && v.seal;
              return (
                <li key={r.runId}>
                  <button type="button" onClick={() => setPicked(r.runId)} className={cn("flex w-full items-center gap-2.5 px-4 py-2 text-start transition-colors", r.runId === run.runId ? "bg-os-cyan/[0.06]" : "hover:bg-white/[0.02]")}>
                    {good ? <CheckCircle2 className="size-3.5 shrink-0 text-os-emerald" /> : <XCircle className="size-3.5 shrink-0 text-red-400" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-white/85">{r.label}</span>
                      <span className="block font-mono text-[10px] text-white/35">
                        CAE-{r.seal!.slice(0, 12).toUpperCase()} · {new Date(r.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="min-w-0 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[10px] tracking-[0.18em] text-os-gold/80">CERTIFICATE OF AUTONOMOUS EXECUTION</p>
                <p className="mt-0.5 font-mono text-[15px] text-white">{cert.certificate}</p>
              </div>
              <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[11px]", cert.verdict === "VERIFIED" ? "border-os-emerald/40 text-os-emerald" : "border-red-400/40 text-red-300")}>{cert.verdict}</span>
            </div>
            <dl className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-[9rem_minmax(0,1fr)]">
              <Field k="Execution" v={`${cert.execution.label} · ${cert.execution.runId}`} />
              <Field k="Timestamp" v={cert.execution.timestamp} mono />
              <Field k="Node identity" v={`${cert.execution.node ?? "—"} · ${cert.execution.environment}`} mono />
              <Field k="Input hash" v={cert.integrity.inputHash} mono ok={cert.integrity.inputMatch} />
              <Field k="Output hash" v={cert.integrity.outputHash} mono ok={cert.integrity.outputMatch} />
              <Field k="Seal" v={cert.integrity.seal} mono ok={cert.integrity.sealValid} />
              <Field k="HITL approvals" v={cert.humanApprovals.length ? cert.humanApprovals.map((a) => `${a.decision} by ${a.by}: ${a.action}`).join(" · ") : "None required on this run"} ok={cert.humanApprovals.length ? cert.humanApprovals.every((a) => a.signatureValid) : undefined} />
              <Field k="Shadow Board" v={cert.shadowBoard.length ? cert.shadowBoard.map((b) => `${b.verdict} (${(b.consensus * 100).toFixed(0)}%)`).join(" · ") : "Not stress-tested"} />
              <Field k="Certificate hash" v={cert.certificateHash} mono />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => exportPdf(cert)} className="flex items-center gap-1.5 rounded-full border border-os-gold/50 px-3.5 py-1.5 text-[12px] text-os-gold hover:bg-os-gold/10">
                <FileText className="size-3.5" /> Certificate PDF
              </button>
              <button type="button" onClick={() => exportJson(cert)} className="flex items-center gap-1.5 rounded-full border border-os-line px-3.5 py-1.5 text-[12px] text-white/75 hover:text-white">
                <Download className="size-3.5" /> JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ k, v, mono, ok }: { k: string; v: string | undefined; mono?: boolean; ok?: boolean }) {
  return (
    <>
      <dt className="text-white/40">{k}</dt>
      <dd className={cn("min-w-0 break-all text-white/80", mono && "font-mono text-[11px]")}>
        {v ?? "—"}
        {ok !== undefined && <span className={cn("ms-2 font-mono text-[10px]", ok ? "text-os-emerald" : "text-red-300")}>{ok ? "✔ match" : "✖ mismatch"}</span>}
      </dd>
    </>
  );
}
