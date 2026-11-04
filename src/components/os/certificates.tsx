"use client";

import { useMemo, useState } from "react";
import { Award, CheckCircle2, Download, FileText, Link2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { approvalSigPayload, audit, useDeskSettings, verifyLedger, verifyRun, type DeskSettings, type RunRecord } from "@/components/desk/settings";
import { useLicense } from "@/lib/license-context";
import { TIER_INFO, type Tier } from "@/lib/license/tiers";
import { sha256 } from "@/lib/sha256";
import { useCommandCopy } from "@/components/bloom/command/locale";
import type { Lang } from "@/components/bloom/i18n";

/** On-screen and PDF wording. The JSON export keeps English field names: it's a machine-readable record. */
const COPY = {
  en: {
    title: "Certificate of Autonomous Execution",
    section: "Proof of execution · certificates",
    ledgerOk: (n: number) => `ledger intact · ${n} sealed runs`,
    ledgerBroken: (id: string | null) => `ledger broken at ${id}`,
    empty: "No sealed runs yet. Every run completed from now on is sealed into the execution ledger (input hash, output hash, node identity, chained seal) and can be certified here.",
    verdict: { VERIFIED: "VERIFIED", FAILED: "FAILED" } as Record<string, string>,
    fields: { execution: "Execution", timestamp: "Timestamp", node: "Node identity", input: "Input hash", output: "Output hash", seal: "Seal", hitl: "HITL approvals", board: "Shadow Board", certHash: "Certificate hash" },
    hitlNone: "None required on this run",
    boardNone: "Not stress-tested",
    decision: { approved: "approved", rejected: "rejected", escalate: "escalated" } as Record<string, string>,
    by: "by",
    match: "✔ match",
    mismatch: "✖ mismatch",
    pdf: "Certificate PDF",
    pdfDoc: {
      issued: "issued",
      ok: "✔ Execution verified",
      bad: "✖ Verification failed",
      execution: "Execution",
      workspace: "Workspace",
      run: "Run",
      timestamp: "Timestamp",
      node: "Node identity",
      environment: "Environment",
      outcome: "Outcome",
      succeeded: (s: string) => `Succeeded in ${s}s`,
      failed: (s: string) => `Failed in ${s}s`,
      hashes: "Input / output hash match",
      input: "Input hash",
      output: "Output hash",
      prev: "Previous seal",
      seal: "Execution seal",
      ledger: "Ledger",
      ledgerOk: (n: number) => `Intact across ${n} sealed runs`,
      ledgerBad: "BROKEN",
      MATCH: "MATCH",
      MISMATCH: "MISMATCH",
      hitl: "Human-in-the-loop approvals",
      noHitl: "No approval-gated actions on this run.",
      board: "Shadow Board",
      noBoard: "Not stress-tested by the board.",
      certHash: "Certificate hash",
      foot: "Hashes are SHA-256 over the stored, credential-redacted records. Recompute them from the JSON export to verify independently. Audit anchor:",
    },
  },
  es: {
    title: "Certificado de ejecución autónoma",
    section: "Prueba de ejecución · certificados",
    ledgerOk: (n: number) => `libro intacto · ${n} ejecuciones selladas`,
    ledgerBroken: (id: string | null) => `libro roto en ${id}`,
    empty: "Aún no hay ejecuciones selladas. Cada ejecución completada a partir de ahora se sella en el libro de ejecución (hash de entrada, hash de salida, identidad del nodo, sello encadenado) y puede certificarse aquí.",
    verdict: { VERIFIED: "VERIFICADO", FAILED: "FALLIDO" } as Record<string, string>,
    fields: { execution: "Ejecución", timestamp: "Fecha y hora", node: "Identidad del nodo", input: "Hash de entrada", output: "Hash de salida", seal: "Sello", hitl: "Aprobaciones humanas", board: "Shadow Board", certHash: "Hash del certificado" },
    hitlNone: "No hizo falta ninguna en esta ejecución",
    boardNone: "Sin prueba de estrés",
    decision: { approved: "aprobado", rejected: "rechazado", escalate: "escalado" } as Record<string, string>,
    by: "por",
    match: "✔ coincide",
    mismatch: "✖ no coincide",
    pdf: "Certificado en PDF",
    pdfDoc: {
      issued: "emitido",
      ok: "✔ Ejecución verificada",
      bad: "✖ La verificación falló",
      execution: "Ejecución",
      workspace: "Espacio de trabajo",
      run: "Ejecución",
      timestamp: "Fecha y hora",
      node: "Identidad del nodo",
      environment: "Entorno",
      outcome: "Resultado",
      succeeded: (s: string) => `Completada en ${s} s`,
      failed: (s: string) => `Fallida en ${s} s`,
      hashes: "Coincidencia de hashes de entrada y salida",
      input: "Hash de entrada",
      output: "Hash de salida",
      prev: "Sello anterior",
      seal: "Sello de ejecución",
      ledger: "Libro",
      ledgerOk: (n: number) => `Intacto en ${n} ejecuciones selladas`,
      ledgerBad: "ROTO",
      MATCH: "COINCIDE",
      MISMATCH: "NO COINCIDE",
      hitl: "Aprobaciones con intervención humana",
      noHitl: "Esta ejecución no tenía acciones sujetas a aprobación.",
      board: "Shadow Board",
      noBoard: "El board no la puso a prueba.",
      certHash: "Hash del certificado",
      foot: "Los hashes son SHA-256 sobre los registros guardados, con las credenciales ocultas. Recálculalos desde la exportación JSON para verificarlos por tu cuenta. Ancla de auditoría:",
    },
  },
  he: {
    title: "תעודת ביצוע אוטונומי",
    section: "הוכחת ביצוע · תעודות",
    ledgerOk: (n: number) => `היומן תקין · ${n} הרצות חתומות`,
    ledgerBroken: (id: string | null) => `היומן שבור ב־${id}`,
    empty: "עדיין אין הרצות חתומות. כל הרצה שתושלם מעכשיו נחתמת ביומן הביצוע (גיבוב קלט, גיבוב פלט, זהות צומת, חותם משורשר) ואפשר להנפיק לה תעודה כאן.",
    verdict: { VERIFIED: "אומת", FAILED: "נכשל" } as Record<string, string>,
    fields: { execution: "ביצוע", timestamp: "חותמת זמן", node: "זהות הצומת", input: "גיבוב קלט", output: "גיבוב פלט", seal: "חותם", hitl: "אישורים אנושיים", board: "Shadow Board", certHash: "גיבוב התעודה" },
    hitlNone: "לא נדרשו בהרצה הזו",
    boardNone: "לא עבר בדיקת לחץ",
    decision: { approved: "אושר", rejected: "נדחה", escalate: "הועבר לאדם" } as Record<string, string>,
    by: "על ידי",
    match: "✔ תואם",
    mismatch: "✖ לא תואם",
    pdf: "תעודה ב־PDF",
    pdfDoc: {
      issued: "הונפקה",
      ok: "✔ הביצוע אומת",
      bad: "✖ האימות נכשל",
      execution: "ביצוע",
      workspace: "סביבת עבודה",
      run: "הרצה",
      timestamp: "חותמת זמן",
      node: "זהות הצומת",
      environment: "סביבה",
      outcome: "תוצאה",
      succeeded: (s: string) => `הצליחה תוך ${s} שניות`,
      failed: (s: string) => `נכשלה תוך ${s} שניות`,
      hashes: "התאמת גיבובי קלט ופלט",
      input: "גיבוב קלט",
      output: "גיבוב פלט",
      prev: "החותם הקודם",
      seal: "חותם הביצוע",
      ledger: "יומן",
      ledgerOk: (n: number) => `תקין לאורך ${n} הרצות חתומות`,
      ledgerBad: "שבור",
      MATCH: "תואם",
      MISMATCH: "לא תואם",
      hitl: "אישורים עם מעורבות אנושית",
      noHitl: "בהרצה הזו לא היו פעולות שדורשות אישור.",
      board: "Shadow Board",
      noBoard: "ה־Board לא בדק אותה בלחץ.",
      certHash: "גיבוב התעודה",
      foot: "הגיבובים הם SHA-256 על הרשומות השמורות, עם אישורי גישה מוסתרים. חשבו אותם מחדש מייצוא ה־JSON כדי לאמת באופן עצמאי. עוגן ביקורת:",
    },
  },
} satisfies Record<Lang, unknown>;


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
    title: COPY.en.title,
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

function printCertificate(c: Certificate, lang: Lang) {
  const t = COPY[lang];
  const P = t.pdfDoc;
  const w = window.open("", "_blank", "width=860,height=1100");
  if (!w) return;
  const row = (k: string, v: unknown, mono = false) => `<tr><th>${esc(k)}</th><td class="${mono ? "mono" : ""}">${esc(v)}</td></tr>`;
  const ok = (b: boolean) => `<span class="${b ? "ok" : "bad"}">${b ? P.MATCH : P.MISMATCH}</span>`;
  w.document.write(`<!doctype html><html lang="${lang}" dir="${lang === "he" ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(c.certificate)}</title>
<style>body{font:12px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#111;margin:40px}.frame{border:2px solid #0b2530;padding:28px 32px;border-radius:6px}
th{text-align:start}h1{font-size:22px;margin:4px 0 2px;letter-spacing:.02em}.kicker{font:600 10px/1 Consolas,monospace;letter-spacing:.2em;color:#0a7d8c}h2{font-size:11px;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.12em;color:#555}
table{width:100%;border-collapse:collapse}th{width:34%;text-align:left;font-weight:500;color:#555;padding:3px 8px 3px 0;vertical-align:top}td{padding:3px 0;word-break:break-all}.mono{font-family:Consolas,monospace;font-size:10.5px}
.ok{color:#0a7d4f;font-weight:600}.bad{color:#b00020;font-weight:600}.verdict{font-size:16px;margin-top:6px}.foot{margin-top:22px;font-size:10px;color:#777}</style></head><body><div class="frame">
<div class="kicker">BLOOM AI // OPERATING DESK</div><h1>${esc(t.title)}</h1><div class="mono">${esc(c.certificate)} · ${P.issued} ${esc(c.issuedAt)}</div>
<p class="verdict ${c.verdict === "VERIFIED" ? "ok" : "bad"}">${c.verdict === "VERIFIED" ? P.ok : P.bad}</p>
<h2>${P.execution}</h2><table>${row(P.workspace, `${c.workspace} · ${c.license}`)}${row(P.run, `${c.execution.label} · ${c.execution.runId}`)}${row(P.timestamp, c.execution.timestamp)}${row(P.node, c.execution.node, true)}${row(P.environment, c.execution.environment)}${row(P.outcome, (c.execution.succeeded ? P.succeeded : P.failed)((c.execution.durationMs / 1000).toFixed(2)))}</table>
<h2>${P.hashes}</h2><table><tr><th>${P.input}</th><td class="mono">${esc(c.integrity.inputHash)} ${ok(c.integrity.inputMatch)}</td></tr><tr><th>${P.output}</th><td class="mono">${esc(c.integrity.outputHash)} ${ok(c.integrity.outputMatch)}</td></tr>${row(P.prev, c.integrity.previousSeal, true)}<tr><th>${P.seal}</th><td class="mono">${esc(c.integrity.seal)} ${ok(c.integrity.sealValid)}</td></tr>${row(P.ledger, c.integrity.ledgerIntact ? P.ledgerOk(c.integrity.ledgerRunsVerified) : P.ledgerBad)}</table>
<h2>${P.hitl}</h2>${c.humanApprovals.length ? `<table>${c.humanApprovals.map((a) => `<tr><th>${esc((t.decision[a.decision] ?? a.decision).toUpperCase())}: ${esc(a.action)}</th><td class="mono">${esc(a.by)} · ${esc(a.at)}<br>${esc(a.signature)} ${ok(a.signatureValid)}</td></tr>`).join("")}</table>` : `<p>${P.noHitl}</p>`}
<h2>${P.board}</h2>${c.shadowBoard.length ? `<table>${c.shadowBoard.map((b) => `<tr><th>${esc((t.decision[b.verdict] ?? b.verdict).toUpperCase())} · ${(b.consensus * 100).toFixed(1)}%</th><td>${esc(b.subject)}<br><span class="mono">${esc(b.sessionHash)}</span></td></tr>`).join("")}</table>` : `<p>${P.noBoard}</p>`}
<h2>${P.certHash}</h2><p class="mono">${esc(c.certificateHash)}</p><p class="foot">${P.foot} <span class="mono">${esc(c.auditAnchor)}</span></p>
</div><script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

/** /desk/audit: the proof-of-execution ledger and its downloadable certificates. */
export function ExecutionLedger() {
  const { lang } = useCommandCopy();
  const t = COPY[lang];
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
    printCertificate(c, lang);
    audit("system", `Exported execution certificate ${c.certificate} (PDF)`);
  };

  return (
    <section className="os-panel mt-4 rounded-2xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-os-line px-4 py-2.5">
        <p className="os-label flex items-center gap-2 text-white/60">
          <Award className="size-3.5 text-os-gold" /> {t.section}
        </p>
        <span className={cn("flex items-center gap-1 font-mono text-[10.5px]", ledger.ok ? "text-os-emerald/85" : "text-red-300")}>
          <Link2 className="size-3" /> {ledger.ok ? t.ledgerOk(ledger.checked) : t.ledgerBroken(ledger.brokenAt)}
        </span>
      </div>
      {!run || !cert ? (
        <p className="px-4 py-5 text-[12.5px] text-white/45">{t.empty}</p>
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
                        CAE-{r.seal!.slice(0, 12).toUpperCase()} · {new Date(r.at).toLocaleString(lang, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-os-gold/80">{t.title}</p>
                <p className="mt-0.5 font-mono text-[15px] text-white">{cert.certificate}</p>
              </div>
              <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[11px]", cert.verdict === "VERIFIED" ? "border-os-emerald/40 text-os-emerald" : "border-red-400/40 text-red-300")}>{t.verdict[cert.verdict]}</span>
            </div>
            <dl className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-[9rem_minmax(0,1fr)]">
              <Field t={t} k={t.fields.execution} v={`${cert.execution.label} · ${cert.execution.runId}`} />
              <Field t={t} k={t.fields.timestamp} v={cert.execution.timestamp} mono />
              <Field t={t} k={t.fields.node} v={`${cert.execution.node ?? "—"} · ${cert.execution.environment}`} mono />
              <Field t={t} k={t.fields.input} v={cert.integrity.inputHash} mono ok={cert.integrity.inputMatch} />
              <Field t={t} k={t.fields.output} v={cert.integrity.outputHash} mono ok={cert.integrity.outputMatch} />
              <Field t={t} k={t.fields.seal} v={cert.integrity.seal} mono ok={cert.integrity.sealValid} />
              <Field t={t} k={t.fields.hitl} v={cert.humanApprovals.length ? cert.humanApprovals.map((a) => `${t.decision[a.decision] ?? a.decision} ${t.by} ${a.by}: ${a.action}`).join(" · ") : t.hitlNone} ok={cert.humanApprovals.length ? cert.humanApprovals.every((a) => a.signatureValid) : undefined} />
              <Field t={t} k={t.fields.board} v={cert.shadowBoard.length ? cert.shadowBoard.map((b) => `${t.decision[b.verdict] ?? b.verdict} (${(b.consensus * 100).toFixed(0)}%)`).join(" · ") : t.boardNone} />
              <Field t={t} k={t.fields.certHash} v={cert.certificateHash} mono />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => exportPdf(cert)} className="flex items-center gap-1.5 rounded-full border border-os-gold/50 px-3.5 py-1.5 text-[12px] text-os-gold hover:bg-os-gold/10">
                <FileText className="size-3.5" /> {t.pdf}
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

function Field({ t, k, v, mono, ok }: { t: (typeof COPY)[Lang]; k: string; v: string | undefined; mono?: boolean; ok?: boolean }) {
  return (
    <>
      <dt className="text-white/40">{k}</dt>
      <dd className={cn("min-w-0 break-all text-white/80", mono && "font-mono text-[11px]")}>
        {v ?? "—"}
        {ok !== undefined && <span className={cn("ms-2 font-mono text-[10px]", ok ? "text-os-emerald" : "text-red-300")}>{ok ? t.match : t.mismatch}</span>}
      </dd>
    </>
  );
}
