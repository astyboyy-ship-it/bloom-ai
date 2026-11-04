"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileText, Gauge, Loader2, MonitorCog, Search, ShieldCheck, ShieldX, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDesktopApp } from "@/components/desktop/desktop-env";
import { activeEnv, audit, displayName, useDeskSettings, verifyAudit, type AuditEntry, type AuditKind } from "@/components/desk/settings";
import { DESK_COPY } from "@/components/desk/copy";
import { useLicense } from "@/lib/license-context";
import { TIER_INFO, tierInfo } from "@/lib/license/tiers";
import { ExecutionLedger } from "./certificates";
import { OsPage } from "./os-shell";
import { useCommandCopy } from "@/components/bloom/command/locale";
import type { Lang } from "@/components/bloom/i18n";
import { useOsTelemetry } from "./telemetry-context";

const KINDS: (AuditKind | "all")[] = ["all", "run", "approval", "security", "license", "credentials", "calibration", "member", "settings", "system"];

const COPY = {
  en: {
    tabs: { audit: "Audit & certificates", diagnostics: "Diagnostics" },
    kinds: { all: "all", run: "run", approval: "approval", security: "security", license: "license", credentials: "credentials", calibration: "calibration", member: "member", settings: "settings", system: "system" } as Record<AuditKind | "all", string>,
    integrity: "Chain integrity",
    intact: "Intact",
    brokenAt: (n: number | null) => `Broken at entry #${n}`,
    verifiedLine: (n: number) => `${n} hashed entries verified`,
    legacy: (n: number) => ` · ${n} legacy entries predate the chain`,
    checkedAt: (t: string) => ` · checked ${t}`,
    verifyNow: "Verify now",
    searchPh: "Search messages, actors, environments, entry numbers",
    searchLabel: "Search audit log",
    pdfReport: "PDF report",
    cols: ["#", "Time", "Kind", "Actor", "Environment", "Message", "Hash"],
    noEntries: "No entries match.",
    unchained: "unchained",
    retention: "The log keeps the latest 1,000 entries on this device. Export regularly for long-term retention.",
    report: {
      title: "Compliance report",
      workspace: "Workspace",
      generated: "generated",
      integrity: "Integrity",
      intact: (n: number, legacy: number) => `Hash chain intact across ${n} entries${legacy ? ` (${legacy} legacy entries predate the chain)` : ""}.`,
      broken: (n: number | null) => `Hash chain BROKEN at entry #${n}.`,
      summary: "Summary",
      entries: (n: number) => `Entries (${n})`,
    },
    diag: {
      burst: "Runtime latency burst",
      burstBody: (rt: string) => `Ten sequential probes of the runtime API (${rt}).`,
      stats: { min: "min", avg: "avg", p95: "p95", errors: "errors" },
      runProbe: "Run latency test",
      ssrf: "SSRF guard",
      ssrfBody: "Asks the connection tester to reach the cloud metadata address (169.254.169.254). A secure deployment refuses before any request leaves the server.",
      checking: "Checking…",
      refused: (code: number) => `Refused (${code}): the tester only reaches fixed provider hosts.`,
      unexpected: (code: number) => `Unexpected ${code}: investigate before production.`,
      unreachable: "The check couldn't reach the server.",
      runSsrf: "Run SSRF check",
      bridge: "Desktop bridge telemetry",
      rows: { desktop: "Desktop app session", ipc: "Native IPC bridge", engine: "Rendering engine", platform: "Platform", cpu: "CPU threads", memory: "Device memory", screen: "Screen", network: "Network", language: "Language", storage: "Storage quota" },
      yesDesktop: "Yes (opened by the Bloom AI desktop app)",
      noBrowser: "No (browser)",
      available: "Available",
      notExposed: "Not exposed (remote content; by design)",
      unknown: "Unknown",
      na: "n/a",
      online: "online",
      offline: "offline",
      storage: (used: string, quota: string) => `${used} MB used of ${quota} GB`,
    },
  },
  es: {
    tabs: { audit: "Auditoría y certificados", diagnostics: "Diagnóstico" },
    kinds: { all: "todo", run: "ejecución", approval: "aprobación", security: "seguridad", license: "licencia", credentials: "credenciales", calibration: "calibración", member: "miembro", settings: "ajustes", system: "sistema" },
    integrity: "Integridad de la cadena",
    intact: "Intacta",
    brokenAt: (n: number | null) => `Rota en la entrada #${n}`,
    verifiedLine: (n: number) => `${n} entradas con hash verificadas`,
    legacy: (n: number) => ` · ${n} entradas antiguas anteriores a la cadena`,
    checkedAt: (t: string) => ` · comprobada a las ${t}`,
    verifyNow: "Verificar ahora",
    searchPh: "Busca mensajes, autores, entornos, números de entrada",
    searchLabel: "Buscar en el registro de auditoría",
    pdfReport: "Informe PDF",
    cols: ["#", "Hora", "Tipo", "Autor", "Entorno", "Mensaje", "Hash"],
    noEntries: "Ninguna entrada coincide.",
    unchained: "sin encadenar",
    retention: "El registro conserva las últimas 1.000 entradas en este dispositivo. Exporta con regularidad para conservarlas a largo plazo.",
    report: {
      title: "Informe de cumplimiento",
      workspace: "Espacio de trabajo",
      generated: "generado",
      integrity: "Integridad",
      intact: (n: number, legacy: number) => `Cadena de hashes intacta en ${n} entradas${legacy ? ` (${legacy} entradas antiguas anteriores a la cadena)` : ""}.`,
      broken: (n: number | null) => `Cadena de hashes ROTA en la entrada #${n}.`,
      summary: "Resumen",
      entries: (n: number) => `Entradas (${n})`,
    },
    diag: {
      burst: "Ráfaga de latencia del runtime",
      burstBody: (rt: string) => `Diez sondeos seguidos de la API del runtime (${rt}).`,
      stats: { min: "mín", avg: "media", p95: "p95", errors: "errores" },
      runProbe: "Probar latencia",
      ssrf: "Protección SSRF",
      ssrfBody: "Pide al probador de conexiones que llegue a la dirección de metadatos de la nube (169.254.169.254). Un despliegue seguro lo rechaza antes de que salga ninguna petición del servidor.",
      checking: "Comprobando…",
      refused: (code: number) => `Rechazado (${code}): el probador solo llega a hosts fijos de proveedores.`,
      unexpected: (code: number) => `Respuesta inesperada ${code}: investígalo antes de producción.`,
      unreachable: "La comprobación no pudo llegar al servidor.",
      runSsrf: "Comprobar SSRF",
      bridge: "Telemetría del puente de escritorio",
      rows: { desktop: "Sesión de la app de escritorio", ipc: "Puente IPC nativo", engine: "Motor de renderizado", platform: "Plataforma", cpu: "Hilos de CPU", memory: "Memoria del dispositivo", screen: "Pantalla", network: "Red", language: "Idioma", storage: "Cuota de almacenamiento" },
      yesDesktop: "Sí (abierta por la app de escritorio de Bloom AI)",
      noBrowser: "No (navegador)",
      available: "Disponible",
      notExposed: "No expuesto (contenido remoto; por diseño)",
      unknown: "Desconocido",
      na: "n/d",
      online: "en línea",
      offline: "sin conexión",
      storage: (used: string, quota: string) => `${used} MB usados de ${quota} GB`,
    },
  },
  he: {
    tabs: { audit: "ביקורת ותעודות", diagnostics: "אבחון" },
    kinds: { all: "הכול", run: "הרצה", approval: "אישור", security: "אבטחה", license: "רישיון", credentials: "אישורי גישה", calibration: "כיול", member: "חבר צוות", settings: "הגדרות", system: "מערכת" },
    integrity: "שלמות השרשרת",
    intact: "תקינה",
    brokenAt: (n: number | null) => `שבורה ברשומה #${n}`,
    verifiedLine: (n: number) => `${n} רשומות עם גיבוב אומתו`,
    legacy: (n: number) => ` · ${n} רשומות ישנות קודמות לשרשרת`,
    checkedAt: (t: string) => ` · נבדקה ב־${t}`,
    verifyNow: "לאמת עכשיו",
    searchPh: "חיפוש בהודעות, במבצעים, בסביבות ובמספרי רשומות",
    searchLabel: "חיפוש ביומן הביקורת",
    pdfReport: "דוח PDF",
    cols: ["#", "שעה", "סוג", "מבצע", "סביבה", "הודעה", "גיבוב"],
    noEntries: "אין רשומות תואמות.",
    unchained: "לא משורשרת",
    retention: "היומן שומר במכשיר הזה את 1,000 הרשומות האחרונות. ייצאו באופן קבוע לשמירה לטווח ארוך.",
    report: {
      title: "דוח ציות",
      workspace: "סביבת עבודה",
      generated: "הופק",
      integrity: "שלמות",
      intact: (n: number, legacy: number) => `שרשרת הגיבוב תקינה לאורך ${n} רשומות${legacy ? ` (${legacy} רשומות ישנות קודמות לשרשרת)` : ""}.`,
      broken: (n: number | null) => `שרשרת הגיבוב שבורה ברשומה #${n}.`,
      summary: "סיכום",
      entries: (n: number) => `רשומות (${n})`,
    },
    diag: {
      burst: "פרץ השהיה של סביבת הריצה",
      burstBody: (rt: string) => `עשר בדיקות רצופות של ה־API של סביבת הריצה (${rt}).`,
      stats: { min: "מינ׳", avg: "ממוצע", p95: "p95", errors: "שגיאות" },
      runProbe: "בדיקת השהיה",
      ssrf: "הגנת SSRF",
      ssrfBody: "מבקש מבודק החיבורים להגיע לכתובת המטא־דאטה של הענן (169.254.169.254). פריסה מאובטחת מסרבת לפני שבקשה כלשהי יוצאת מהשרת.",
      checking: "בודק…",
      refused: (code: number) => `נדחה (${code}): הבודק מגיע רק לשרתי ספקים קבועים.`,
      unexpected: (code: number) => `תשובה לא צפויה ${code}: בדקו לפני ייצור.`,
      unreachable: "הבדיקה לא הצליחה להגיע לשרת.",
      runSsrf: "בדיקת SSRF",
      bridge: "טלמטריית הגשר השולחני",
      rows: { desktop: "סשן באפליקציה השולחנית", ipc: "גשר IPC מקורי", engine: "מנוע תצוגה", platform: "פלטפורמה", cpu: "תהליכוני מעבד", memory: "זיכרון המכשיר", screen: "מסך", network: "רשת", language: "שפה", storage: "מכסת אחסון" },
      yesDesktop: "כן (נפתח באפליקציה השולחנית של Bloom AI)",
      noBrowser: "לא (דפדפן)",
      available: "זמין",
      notExposed: "לא חשוף (תוכן מרוחק; בכוונה)",
      unknown: "לא ידוע",
      na: "לא זמין",
      online: "מחובר",
      offline: "לא מחובר",
      storage: (used: string, quota: string) => `${used} MB בשימוש מתוך ${quota} GB`,
    },
  },
} satisfies Record<Lang, unknown>;
type RowKey = keyof (typeof COPY)["en"]["diag"]["rows"];

function Tabs({ on }: { on: "audit" | "diagnostics" }) {
  const t = COPY[useCommandCopy().lang];
  return (
    <div className="mb-4 flex gap-1.5">
      {(
        [
          ["audit", "/desk/audit", t.tabs.audit, ShieldCheck],
          ["diagnostics", "/desk/diagnostics", t.tabs.diagnostics, Stethoscope],
        ] as const
      ).map(([id, href, label, Icon]) => (
        <Link key={id} href={href} className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em]", on === id ? "border-os-cyan/40 bg-os-cyan/[0.08] text-os-cyan" : "border-os-line text-white/55 hover:text-white")}>
          <Icon className="size-3.5" /> {label}
        </Link>
      ))}
    </div>
  );
}

const download = (name: string, body: string, type: string) => {
  const url = URL.createObjectURL(new Blob([body], { type }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
};

/** /desk/audit: the tamper-evident audit log, integrity verification, and compliance exports. */
export function AuditBay() {
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const { settings } = useDeskSettings();
  const { tier, info } = useLicense();
  const [kind, setKind] = useState<AuditKind | "all">("all");
  const [q, setQ] = useState("");
  // Derived from the live log: settings hydrate after the first render, and every new entry re-verifies.
  const check = useMemo(() => verifyAudit(settings.audit), [settings.audit]);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const rows = useMemo(() => [...settings.audit].reverse().filter((a) => (kind === "all" || a.kind === kind) && (!q || `${a.message} ${a.actor} ${a.env ?? ""} ${a.id}`.toLowerCase().includes(q.toLowerCase()))), [settings.audit, kind, q]);
  const counts = useMemo(() => Object.fromEntries(KINDS.slice(1).map((k) => [k, settings.audit.filter((a) => a.kind === k).length])) as Record<AuditKind, number>, [settings.audit]);

  const verify = () => {
    const r = verifyAudit(settings.audit);
    setCheckedAt(Date.now());
    audit("system", `Verified the audit chain: ${r.ok ? `intact across ${r.checked} entries` : `broken at entry #${r.brokenAt}`}`);
  };
  const stamp = new Date().toISOString().slice(0, 10);
  const csv = () => {
    const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    download(`bloom-audit-${stamp}.csv`, [["id", "time", "kind", "actor", "environment", "message", "hash"].join(","), ...rows.map((a) => [a.id, new Date(a.at).toISOString(), a.kind, a.actor, a.env, a.message, a.hash].map(esc).join(","))].join("\n"), "text/csv");
    audit("system", `Exported ${rows.length} audit entries as CSV`);
  };
  const json = () => {
    download(`bloom-audit-${stamp}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), workspace: settings.branding.orgName || null, environment: activeEnv(settings).name, license: TIER_INFO[tier].label, integrity: verifyAudit(settings.audit), entries: rows }, null, 2), "application/json");
    audit("system", `Exported ${rows.length} audit entries as JSON`);
  };
  /** A print-ready compliance report in a new window; the browser's print dialog saves it as PDF. */
  const pdf = () => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const integrity = verifyAudit(settings.audit);
    w.document.write(`<!doctype html><html lang="${lang}" dir="${lang === "he" ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>Bloom AI · ${esc(t.report.title)} ${stamp}</title>
<style>body{font:12px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0}h2{font-size:13px;margin:22px 0 6px;text-transform:uppercase;letter-spacing:.08em;color:#555}
table{width:100%;border-collapse:collapse;font-size:10.5px}th,td{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f4f4f4}.mono{font-family:Consolas,monospace;font-size:9.5px;color:#666}.ok{color:#0a7d4f}.bad{color:#b00020}</style></head><body>
<h1>BLOOM AI // OPERATING DESK · ${esc(t.report.title)}</h1>
<p>${esc(settings.branding.orgName || t.report.workspace)} · ${esc(activeEnv(settings).name)} · ${esc(tierInfo(lang)[tier].label)}${info ? ` (${esc(info.org)})` : ""} · ${t.report.generated} ${new Date().toLocaleString(lang)}</p>
<h2>${t.report.integrity}</h2><p class="${integrity.ok ? "ok" : "bad"}">${integrity.ok ? t.report.intact(integrity.checked, integrity.unchained) : t.report.broken(integrity.brokenAt)}</p>
<h2>${t.report.summary}</h2><p>${KINDS.slice(1).map((k) => `${t.kinds[k]}: ${counts[k as AuditKind]}`).join(" · ")}</p>
<h2>${t.report.entries(rows.length)}</h2><table><tr>${t.cols.map((c) => `<th>${c}</th>`).join("")}</tr>
${rows.map((a) => `<tr><td>${a.id}</td><td>${esc(new Date(a.at).toLocaleString(lang))}</td><td>${t.kinds[a.kind]}</td><td>${esc(a.actor)}</td><td>${esc(a.env ?? "")}</td><td>${esc(a.message)}</td><td class="mono">${a.hash ? a.hash.slice(0, 16) : "—"}</td></tr>`).join("")}
</table><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
    audit("system", `Generated a PDF compliance report (${rows.length} entries)`);
  };

  return (
    <OsPage route="/desk/audit">
      <Tabs on="audit" />
      <div className="grid gap-3 lg:grid-cols-[1.2fr_2fr]">
        <div className={cn("os-panel rounded-2xl p-4", check.ok ? "border-os-emerald/40" : "border-red-400/50")}>
          <p className="os-label">{t.integrity}</p>
          <p className={cn("mt-2 flex items-center gap-2 text-[18px] font-medium", check.ok ? "text-os-emerald" : "text-red-300")}>
            {check.ok ? <ShieldCheck className="size-5" /> : <ShieldX className="size-5" />}
            {check.ok ? t.intact : t.brokenAt(check.brokenAt)}
          </p>
          <p className="mt-1 text-[12px] text-white/50">
            {t.verifiedLine(check.checked)}
            {check.unchained ? t.legacy(check.unchained) : ""}
            {checkedAt ? t.checkedAt(new Date(checkedAt).toLocaleTimeString(lang)) : ""}
          </p>
          <button type="button" onClick={verify} className="mt-3 rounded-full border border-os-cyan/40 px-3.5 py-1.5 text-[12px] text-os-cyan hover:bg-os-cyan/10">
            {t.verifyNow}
          </button>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {(["run", "approval", "security", "license", "calibration"] as AuditKind[]).map((k) => (
            <div key={k} className="os-panel rounded-xl px-3 py-2.5">
              <dt className="os-label">{t.kinds[k]}</dt>
              <dd className="mt-1 font-mono text-[20px] tabular-nums text-white">{counts[k]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ExecutionLedger />

      <section className="os-panel mt-4 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-os-line bg-black/30 px-3 py-1.5">
            <Search className="size-4 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh} aria-label={t.searchLabel} className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 focus:outline-none" />
          </label>
          <button type="button" onClick={csv} className="flex items-center gap-1.5 rounded-full border border-os-line px-3 py-1.5 text-[12px] text-white/75 hover:text-white">
            <Download className="size-3.5" /> CSV
          </button>
          <button type="button" onClick={json} className="flex items-center gap-1.5 rounded-full border border-os-line px-3 py-1.5 text-[12px] text-white/75 hover:text-white">
            <Download className="size-3.5" /> JSON
          </button>
          <button type="button" onClick={pdf} className="flex items-center gap-1.5 rounded-full border border-os-cyan/40 px-3 py-1.5 text-[12px] text-os-cyan">
            <FileText className="size-3.5" /> {t.pdfReport}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]", kind === k ? "border-os-cyan/50 text-os-cyan" : "border-os-line text-white/45 hover:text-white/75")}>
              {t.kinds[k]}
            </button>
          ))}
        </div>
        <div className="mt-3 max-h-[30rem] overflow-auto">
          <table className="w-full min-w-[52rem] text-start text-[12px]">
            <thead className="sticky top-0 bg-os-panel">
              <tr className="os-label">
                {t.cols.map((h) => (
                  <th key={h} className="border-b border-os-line py-2 pe-3 text-start font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-white/40">
                    {t.noEntries}
                  </td>
                </tr>
              )}
              {rows.map((a: AuditEntry) => (
                <tr key={a.id} className="border-b border-os-line/50 align-top">
                  <td className="py-1.5 pe-3 font-mono text-white/40">{a.id}</td>
                  <td className="py-1.5 pe-3 font-mono text-[11px] text-white/50">{new Date(a.at).toLocaleString(lang)}</td>
                  <td className={cn("py-1.5 pe-3 font-mono text-[10.5px] uppercase", a.kind === "security" ? "text-red-300" : a.kind === "approval" ? "text-os-emerald" : "text-os-cyan/70")}>{t.kinds[a.kind]}</td>
                  <td className="py-1.5 pe-3 text-white/65">{displayName(a.actor, lang)}</td>
                  <td className="py-1.5 pe-3 text-white/45">{a.env ?? "—"}</td>
                  <td dir="auto" className="py-1.5 pe-3 text-white/80">{a.message}</td>
                  <td className="py-1.5 font-mono text-[10px] text-white/30" title={a.hash}>
                    {a.hash ? `${a.hash.slice(0, 10)}…` : t.unchained}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-white/35">{t.retention}</p>
      </section>
    </OsPage>
  );
}

type Probe = { status: "idle" | "running" | "done"; samples: number[] };

/** /desk/diagnostics: runtime latency burst, SSRF guard check, and desktop bridge telemetry. */
export function Diagnostics() {
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const d = t.diag;
  const { manifest } = useOsTelemetry();
  const [probe, setProbe] = useState<Probe>({ status: "idle", samples: [] });
  const [ssrf, setSsrf] = useState<{ status: "idle" | "running" | "pass" | "fail"; detail: string }>({ status: "idle", detail: "" });
  const [env, setEnv] = useState<Partial<Record<RowKey, string>>>({});

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; rtt?: number; downlink?: number } };
    const ua = nav.userAgent;
    const webview = /Edg\//.test(ua) && isDesktopApp() ? "WebView2 (Edge)" : /AppleWebKit/.test(ua) && !/Chrome/.test(ua) ? "WKWebView / Safari" : /Chrome/.test(ua) ? "Chromium" : /Firefox/.test(ua) ? "Gecko" : d.unknown;
    const base: Partial<Record<RowKey, string>> = {
      desktop: isDesktopApp() ? d.yesDesktop : d.noBrowser,
      ipc: "__TAURI_INTERNALS__" in window ? d.available : d.notExposed,
      engine: webview,
      platform: (nav as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || nav.platform || d.unknown,
      cpu: String(nav.hardwareConcurrency ?? d.na),
      memory: nav.deviceMemory ? `${nav.deviceMemory} GB` : d.na,
      screen: `${screen.width}×${screen.height} @ ${window.devicePixelRatio}x`,
      network: nav.onLine ? `${d.online}${nav.connection?.effectiveType ? ` · ${nav.connection.effectiveType}` : ""}${nav.connection?.rtt ? ` · rtt ${nav.connection.rtt}ms` : ""}` : d.offline,
      language: nav.language,
    };
    setEnv(base);
    navigator.storage?.estimate?.().then((e) => setEnv((x) => ({ ...x, storage: d.storage(((e.usage ?? 0) / 1048576).toFixed(1), ((e.quota ?? 0) / 1073741824).toFixed(1)) })));
    // Re-read when the language changes so the values are worded in it.
  }, [d]);

  const runProbe = async () => {
    setProbe({ status: "running", samples: [] });
    const samples: number[] = [];
    for (let i = 0; i < 10; i++) {
      const t0 = performance.now();
      try {
        await fetch("/api/command", { cache: "no-store" });
        samples.push(Math.round(performance.now() - t0));
      } catch {
        samples.push(-1);
      }
      setProbe({ status: "running", samples: [...samples] });
    }
    setProbe({ status: "done", samples });
    const ok = samples.filter((x) => x >= 0).sort((a, b) => a - b);
    audit("system", `Latency burst: ${ok.length}/10 ok, p95 ${ok[Math.floor(ok.length * 0.95) - 1] ?? ok.at(-1) ?? "n/a"}ms`);
  };

  // The connection tester only ever contacts fixed provider hosts; asking it for an internal address must fail.
  const runSsrf = async () => {
    setSsrf({ status: "running", detail: "" });
    try {
      const res = await fetch("/api/settings/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "http://169.254.169.254/latest/meta-data", key: "x".repeat(20) }) });
      const pass = res.status === 422 || res.status === 400;
      setSsrf({ status: pass ? "pass" : "fail", detail: pass ? d.refused(res.status) : d.unexpected(res.status) });
      audit("security", `SSRF guard check ${pass ? "passed" : "FAILED"} (${res.status})`);
    } catch {
      setSsrf({ status: "fail", detail: d.unreachable });
    }
  };

  const ok = probe.samples.filter((x) => x >= 0).sort((a, b) => a - b);
  const stat = (p: number) => (ok.length ? ok[Math.min(ok.length - 1, Math.floor(ok.length * p))] : null);

  return (
    <OsPage route="/desk/diagnostics">
      <Tabs on="diagnostics" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="os-panel rounded-2xl p-5">
          <p className="os-label flex items-center gap-2">
            <Gauge className="size-3.5 text-os-cyan" /> {d.burst}
          </p>
          <p className="mt-1 text-[12.5px] text-white/50">{d.burstBody(manifest ? (manifest.mode === "live" ? `${DESK_COPY[lang].mode.live} · ${manifest.provider}` : DESK_COPY[lang].mode.simulation) : "…")}</p>
          <div className="mt-3 flex h-24 items-end gap-1.5">
            {Array.from({ length: 10 }, (_, i) => {
              const v = probe.samples[i];
              const max = Math.max(...ok, 1);
              return <div key={i} className={cn("flex-1 rounded-t", v === undefined ? "bg-white/5" : v < 0 ? "bg-red-500/60" : "bg-os-cyan/70 shadow-[0_0_10px_rgb(0_240_255/0.4)]")} style={{ height: v === undefined ? "6%" : v < 0 ? "100%" : `${Math.max(8, (v / max) * 100)}%` }} title={v !== undefined ? `${v}ms` : undefined} />;
            })}
          </div>
          <dl className="mt-3 grid grid-cols-4 gap-2 font-mono text-[12px]">
            {(
              [
                ["min", stat(0)],
                ["avg", ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : null],
                ["p95", stat(0.95)],
                ["errors", probe.samples.filter((x) => x < 0).length],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-os-line px-2 py-1.5">
                <dt className="text-[9.5px] uppercase text-white/40">{d.stats[k]}</dt>
                <dd className="text-os-cyan">{v === null ? "—" : k === "errors" ? v : `${v}ms`}</dd>
              </div>
            ))}
          </dl>
          <button type="button" onClick={runProbe} disabled={probe.status === "running"} className="mt-3 flex items-center gap-1.5 rounded-full border border-os-cyan/40 px-3.5 py-1.5 text-[12px] text-os-cyan disabled:opacity-50">
            {probe.status === "running" ? <Loader2 className="size-3.5 animate-spin" /> : <Gauge className="size-3.5" />} {d.runProbe}
          </button>
        </section>

        <section className="os-panel rounded-2xl p-5">
          <p className="os-label flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-os-emerald" /> {d.ssrf}
          </p>
          <p className="mt-1 text-[12.5px] text-white/50">{d.ssrfBody}</p>
          {ssrf.status !== "idle" && (
            <p className={cn("mt-3 flex items-center gap-2 text-[13px]", ssrf.status === "pass" ? "text-os-emerald" : ssrf.status === "fail" ? "text-red-300" : "text-white/50")}>
              {ssrf.status === "running" ? <Loader2 className="size-4 animate-spin" /> : ssrf.status === "pass" ? <CheckCircle2 className="size-4" /> : <ShieldX className="size-4" />}
              {ssrf.status === "running" ? d.checking : ssrf.detail}
            </p>
          )}
          <button type="button" onClick={runSsrf} disabled={ssrf.status === "running"} className="mt-3 rounded-full border border-os-emerald/40 px-3.5 py-1.5 text-[12px] text-os-emerald disabled:opacity-50">
            {d.runSsrf}
          </button>
        </section>

        <section className="os-panel rounded-2xl p-5 lg:col-span-2">
          <p className="os-label flex items-center gap-2">
            <MonitorCog className="size-3.5 text-os-violet" /> {d.bridge}
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {(Object.entries(env) as [RowKey, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-os-line/50 py-1.5 text-[12.5px]">
                <dt className="text-white/50">{d.rows[k]}</dt>
                <dd dir="ltr" className="text-end font-mono text-[12px] text-white/85">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </OsPage>
  );
}
