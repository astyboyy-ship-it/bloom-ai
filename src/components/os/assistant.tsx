"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_ORDER, ENGINES, type EngineKey } from "@/components/bloom/command/engines";
import { localizeEngine, useCommandCopy } from "@/components/bloom/command/locale";
import type { Lang } from "@/components/bloom/i18n";
import { UTILITY } from "@/components/bloom/command/utility";
import { PERMISSION_TEXT, can, roleInfo, type Permission } from "@/components/desk/rbac";
import { activeEnv, activeMember, displayName, useDeskSettings, verifyAudit, type DeskSettings } from "@/components/desk/settings";
import { architecturesIn } from "@/lib/architecture-text";
import { ARCHITECTURES } from "@/lib/architectures";
import { isTuned, readCalibration } from "@/lib/engines/calibration";
import type { CommandManifest } from "@/lib/engines/events";
import { modelInfo } from "@/lib/engines/models";
import { useLicense } from "@/lib/license-context";
import { TIER_ENGINES, tierInfo, type Tier } from "@/lib/license/tiers";
import { engineDemos } from "./explore-data-text";
import { OS_NAV } from "./nav";
import { OS_COPY } from "./os-copy";
import { OsPage } from "./os-shell";
import { useOsTelemetry } from "./telemetry-context";

type Line = { id: number; who: "you" | "zero"; text: string };
type Ctx = { s: DeskSettings; tier: Tier; manifest: CommandManifest | null; latency: number | null; sla: string; uptime: number | null; lang: Lang };
type Reply = { text: string; go?: string };

/**
 * Agent Zero's words in each language. Intent keywords cover all three languages, so a question is understood
 * whatever language it's typed in; the answer comes back in the desk's current language.
 */
const T = {
  en: {
    chips: ["Audit License", "Engine Diagnostic", "System Health Check", "Explain Sovereign", "Last runs", "My permissions", "Help"],
    ago: (m: number) => (m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`),
    help: ["I run entirely on this device: no model, no network. I can:", "  audit license              tier, scope, expiry and gaps", "  engine diagnostic [name]   calibration, model, memory and run health", "  system health check        runtime, latency, SLA, storage, audit chain", "  explain <engine|product>   what it does, in plain English", "  last runs / failed runs    your recent execution history", "  my permissions             what your role allows", "  threats                    security events on the record", "  open <pillar>              e.g. 'open threat matrix', 'open settings'"],
    opening: (x: string) => `Opening ${x}.`,
    openingProduct: (x: string) => `Opening the ${x} workspace.`,
    openingEngine: (x: string) => `Opening the ${x} console.`,
    license: (label: string, org: string | null) => `License: ${label}${org ? ` for ${org}` : " (no key: evaluation)"}`,
    licenseMeta: (issued: string, expires: string | null, dev: boolean, verified: string) => `  issued ${issued} · ${expires ? `expires ${expires}` : "no expiry"}${dev ? " · development key" : ""} · verified ${verified}`,
    addKey: "  add a key in App Settings → License to unlock more engines",
    engines: "  engines",
    products: (n: number, names: string) => `  products deployable: ${n}/10${names ? ` (${names})` : ""}`,
    locked: (names: string, next: string) => `  locked: ${names}. Upgrade to ${next} or above.`,
    nothingLocked: "  nothing locked.",
    status: { locked: "LOCKED ", failing: "FAILING", ok: "OK     " },
    diagRow: (budget: number, mem: string, runs: number, failed: number, tuned: boolean) => `budget ${String(budget).padStart(5)} · memory ${mem} · runs ${runs}${failed ? ` (${failed} failed)` : ""}${tuned ? " · tuned" : ""}`,
    diagTitle: (name: string | null) => `Engine diagnostic${name ? `: ${name}` : " (all 8)"}`,
    health: "System health check",
    runtime: (m: CommandManifest | null) => `  runtime     ${m ? (m.mode === "live" ? `live via ${m.provider} (${m.model})` : "simulation (local scripts)") : "not probed yet"}`,
    latency: (l: string, sla: string) => `  latency     ${l} · SLA ${sla}`,
    environment: (e: string) => `  environment ${e}`,
    keys: (k: string | null) => `  provider keys on device: ${k ?? "none (server configuration or simulation)"}`,
    local: (kb: string, runs: number, audit: number) => `  local state ${kb} KB · ${runs} runs · ${audit} audit entries`,
    chain: (ok: boolean, checked: number, unchained: number, broken: number | null) => `  audit chain ${ok ? `intact (${checked} hashed${unchained ? `, ${unchained} legacy unchained` : ""})` : `BROKEN at entry #${broken}`}`,
    onboarding: (done: boolean) => `  onboarding  ${done ? "complete" : "not finished: run guided setup"}`,
    na: "n/a",
    engineLine: (index: string) => `Engine Nº ${index}`,
    howItWorks: "  how it works:",
    typical: "  typical impact:",
    pricing: (setup: string, retainer: string) => `  ${setup} setup · ${retainer}/mo`,
    typicalProduct: "  typical:",
    failedTitle: "Failed runs",
    noFailed: "No failed runs on record.",
    recentTitle: "Recent runs",
    noRuns: "No runs yet. Try the Home command bar or an architecture testbed.",
    tokens: "tokens",
    youAre: (name: string, role: string, blurb: string) => `You are ${name} (${role}): ${blurb}`,
    threats: (n: number) => `${n} security events on record. Latest:`,
    threatsMore: "Open the Threat Matrix for the full picture.",
    noThreats: "No security events on record. Prompt-injection attempts and access-control denials will appear here.",
    hello: (name: string) => `Hello ${name}. I'm Agent Zero, the desk's offline assistant. Type 'help' to see what I can do.`,
    unknown: (tries: string) => `I didn't match that to anything I can check offline. Try: ${tries}, or 'help'.`,
    welcome: "AGENT ZERO // offline assistant. No model, no network: answers come from this workspace's own state.\nType 'help', or pick a quick action below.",
    badge: "offline · deterministic · 0 tokens",
    placeholder: "Ask Agent Zero…",
    inputLabel: "Message Agent Zero",
    send: "Send",
    you: "you",
  },
  es: {
    chips: ["Auditar licencia", "Diagnóstico de motores", "Chequeo del sistema", "Explicar Sovereign", "Últimas ejecuciones", "Mis permisos", "Ayuda"],
    ago: (m: number) => (m < 1 ? "ahora mismo" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`),
    help: ["Funciono por completo en este dispositivo: sin modelo y sin red. Puedo:", "  auditar licencia             nivel, alcance, caducidad y carencias", "  diagnóstico de motores [nombre]  calibración, modelo, memoria y salud de ejecuciones", "  chequeo del sistema          runtime, latencia, SLA, almacenamiento, cadena de auditoría", "  explicar <motor|producto>    qué hace, en lenguaje claro", "  últimas / fallidas           tu historial reciente de ejecuciones", "  mis permisos                 lo que permite tu rol", "  amenazas                     eventos de seguridad registrados", "  abrir <pilar>                p. ej. «abrir matriz de amenazas», «abrir ajustes»"],
    opening: (x: string) => `Abriendo ${x}.`,
    openingProduct: (x: string) => `Abriendo el espacio de ${x}.`,
    openingEngine: (x: string) => `Abriendo la consola de ${x}.`,
    license: (label: string, org: string | null) => `Licencia: ${label}${org ? ` para ${org}` : " (sin clave: evaluación)"}`,
    licenseMeta: (issued: string, expires: string | null, dev: boolean, verified: string) => `  emitida ${issued} · ${expires ? `caduca ${expires}` : "sin caducidad"}${dev ? " · clave de desarrollo" : ""} · verificada ${verified}`,
    addKey: "  añade una clave en Ajustes → Licencia para desbloquear más motores",
    engines: "  motores",
    products: (n: number, names: string) => `  productos disponibles: ${n}/10${names ? ` (${names})` : ""}`,
    locked: (names: string, next: string) => `  bloqueados: ${names}. Pasa a ${next} o superior.`,
    nothingLocked: "  nada bloqueado.",
    status: { locked: "BLOQ.  ", failing: "FALLA  ", ok: "OK     " },
    diagRow: (budget: number, mem: string, runs: number, failed: number, tuned: boolean) => `presupuesto ${String(budget).padStart(5)} · memoria ${mem} · ejecuciones ${runs}${failed ? ` (${failed} fallidas)` : ""}${tuned ? " · calibrado" : ""}`,
    diagTitle: (name: string | null) => `Diagnóstico de motores${name ? `: ${name}` : " (los 8)"}`,
    health: "Chequeo del sistema",
    runtime: (m: CommandManifest | null) => `  runtime     ${m ? (m.mode === "live" ? `en vivo vía ${m.provider} (${m.model})` : "simulación (guiones locales)") : "aún sin comprobar"}`,
    latency: (l: string, sla: string) => `  latencia    ${l} · SLA ${sla}`,
    environment: (e: string) => `  entorno     ${e}`,
    keys: (k: string | null) => `  claves de proveedor en el dispositivo: ${k ?? "ninguna (configuración del servidor o simulación)"}`,
    local: (kb: string, runs: number, audit: number) => `  estado local ${kb} KB · ${runs} ejecuciones · ${audit} entradas de auditoría`,
    chain: (ok: boolean, checked: number, unchained: number, broken: number | null) => `  cadena de auditoría ${ok ? `intacta (${checked} con hash${unchained ? `, ${unchained} antiguas sin encadenar` : ""})` : `ROTA en la entrada #${broken}`}`,
    onboarding: (done: boolean) => `  configuración ${done ? "completa" : "sin terminar: ejecuta la configuración guiada"}`,
    na: "n/d",
    engineLine: (index: string) => `Motor Nº ${index}`,
    howItWorks: "  cómo funciona:",
    typical: "  impacto típico:",
    pricing: (setup: string, retainer: string) => `  ${setup} de implantación · ${retainer}/mes`,
    typicalProduct: "  típico:",
    failedTitle: "Ejecuciones fallidas",
    noFailed: "No hay ejecuciones fallidas registradas.",
    recentTitle: "Ejecuciones recientes",
    noRuns: "Aún no hay ejecuciones. Prueba la barra de comandos de Inicio o un banco de pruebas de arquitectura.",
    tokens: "tokens",
    youAre: (name: string, role: string, blurb: string) => `Eres ${name} (${role}): ${blurb}`,
    threats: (n: number) => `${n} eventos de seguridad registrados. Los últimos:`,
    threatsMore: "Abre la Matriz de amenazas para ver el panorama completo.",
    noThreats: "No hay eventos de seguridad registrados. Aquí aparecerán los intentos de inyección de prompts y los accesos denegados.",
    hello: (name: string) => `Hola, ${name}. Soy Agent Zero, el asistente sin conexión del escritorio. Escribe «ayuda» para ver lo que puedo hacer.`,
    unknown: (tries: string) => `No he podido relacionar eso con nada que pueda comprobar sin conexión. Prueba: ${tries}, o «ayuda».`,
    welcome: "AGENT ZERO // asistente sin conexión. Sin modelo y sin red: las respuestas salen del propio estado de este espacio de trabajo.\nEscribe «ayuda» o elige una acción rápida abajo.",
    badge: "sin conexión · determinista · 0 tokens",
    placeholder: "Pregúntale a Agent Zero…",
    inputLabel: "Mensaje para Agent Zero",
    send: "Enviar",
    you: "tú",
  },
  he: {
    chips: ["ביקורת רישיון", "אבחון מנועים", "בדיקת מערכת", "הסבר על Sovereign", "הרצות אחרונות", "ההרשאות שלי", "עזרה"],
    ago: (m: number) => (m < 1 ? "עכשיו" : m < 60 ? `לפני ${m} דק׳` : m < 1440 ? `לפני ${Math.round(m / 60)} ש׳` : `לפני ${Math.round(m / 1440)} ימים`),
    help: ["אני רץ כולי במכשיר הזה: בלי מודל ובלי רשת. אני יכול:", "  ביקורת רישיון              רמה, היקף, תוקף ופערים", "  אבחון מנועים [שם]          כיול, מודל, זיכרון ובריאות הרצות", "  בדיקת מערכת                סביבת ריצה, השהיה, SLA, אחסון, שרשרת ביקורת", "  הסבר <מנוע|מוצר>           מה הוא עושה, בשפה פשוטה", "  הרצות אחרונות / נכשלו      היסטוריית הביצוע האחרונה שלכם", "  ההרשאות שלי                מה התפקיד שלכם מאפשר", "  איומים                     אירועי אבטחה מתועדים", "  פתח <עמוד>                 למשל ״פתח מטריצת איומים״, ״פתח הגדרות״"],
    opening: (x: string) => `פותח את ${x}.`,
    openingProduct: (x: string) => `פותח את סביבת העבודה של ${x}.`,
    openingEngine: (x: string) => `פותח את הקונסולה של ${x}.`,
    license: (label: string, org: string | null) => `רישיון: ${label}${org ? ` עבור ${org}` : " (בלי מפתח: הערכה)"}`,
    licenseMeta: (issued: string, expires: string | null, dev: boolean, verified: string) => `  הונפק ${issued} · ${expires ? `בתוקף עד ${expires}` : "ללא תפוגה"}${dev ? " · מפתח פיתוח" : ""} · אומת ${verified}`,
    addKey: "  הוסיפו מפתח בהגדרות ← רישיון כדי לפתוח מנועים נוספים",
    engines: "  מנועים",
    products: (n: number, names: string) => `  מוצרים זמינים: ${n}/10${names ? ` (${names})` : ""}`,
    locked: (names: string, next: string) => `  נעולים: ${names}. שדרגו ל־${next} ומעלה.`,
    nothingLocked: "  שום דבר לא נעול.",
    status: { locked: "נעול   ", failing: "נכשל   ", ok: "תקין   " },
    diagRow: (budget: number, mem: string, runs: number, failed: number, tuned: boolean) => `תקציב ${String(budget).padStart(5)} · זיכרון ${mem} · הרצות ${runs}${failed ? ` (${failed} נכשלו)` : ""}${tuned ? " · מכויל" : ""}`,
    diagTitle: (name: string | null) => `אבחון מנועים${name ? `: ${name}` : " (כל ה־8)"}`,
    health: "בדיקת מערכת",
    runtime: (m: CommandManifest | null) => `  סביבת ריצה  ${m ? (m.mode === "live" ? `חיה דרך ${m.provider} (${m.model})` : "סימולציה (תסריטים מקומיים)") : "עוד לא נבדקה"}`,
    latency: (l: string, sla: string) => `  השהיה       ${l} · SLA ${sla}`,
    environment: (e: string) => `  סביבה       ${e}`,
    keys: (k: string | null) => `  מפתחות ספקים במכשיר: ${k ?? "אין (הגדרות השרת או סימולציה)"}`,
    local: (kb: string, runs: number, audit: number) => `  מצב מקומי ${kb} KB · ${runs} הרצות · ${audit} רשומות ביקורת`,
    chain: (ok: boolean, checked: number, unchained: number, broken: number | null) => `  שרשרת ביקורת ${ok ? `תקינה (${checked} עם גיבוב${unchained ? `, ${unchained} ישנות לא משורשרות` : ""})` : `שבורה ברשומה #${broken}`}`,
    onboarding: (done: boolean) => `  הגדרה ראשונית ${done ? "הושלמה" : "לא הושלמה: הריצו את ההגדרה המודרכת"}`,
    na: "לא זמין",
    engineLine: (index: string) => `מנוע מס׳ ${index}`,
    howItWorks: "  איך זה עובד:",
    typical: "  השפעה טיפוסית:",
    pricing: (setup: string, retainer: string) => `  הקמה ${setup} · ${retainer} לחודש`,
    typicalProduct: "  טיפוסי:",
    failedTitle: "הרצות שנכשלו",
    noFailed: "אין הרצות שנכשלו.",
    recentTitle: "הרצות אחרונות",
    noRuns: "עדיין אין הרצות. נסו את שורת הפקודות בבית או סביבת בדיקה של ארכיטקטורה.",
    tokens: "טוקנים",
    youAre: (name: string, role: string, blurb: string) => `אתם ${name} (${role}): ${blurb}`,
    threats: (n: number) => `${n} אירועי אבטחה מתועדים. האחרונים:`,
    threatsMore: "פתחו את מטריצת האיומים לתמונה המלאה.",
    noThreats: "אין אירועי אבטחה מתועדים. ניסיונות הזרקת פרומפטים וחסימות גישה יופיעו כאן.",
    hello: (name: string) => `שלום ${name}. אני Agent Zero, העוזר הלא־מקוון של השולחן. כתבו ״עזרה״ כדי לראות מה אני יכול לעשות.`,
    unknown: (tries: string) => `לא הצלחתי לקשר את זה לשום דבר שאני יכול לבדוק בלי חיבור. נסו: ${tries}, או ״עזרה״.`,
    welcome: "AGENT ZERO // עוזר לא־מקוון. בלי מודל ובלי רשת: התשובות מגיעות מהמצב של סביבת העבודה עצמה.\nכתבו ״עזרה״ או בחרו פעולה מהירה למטה.",
    badge: "לא מקוון · דטרמיניסטי · 0 טוקנים",
    placeholder: "שאלו את Agent Zero…",
    inputLabel: "הודעה ל־Agent Zero",
    send: "שליחה",
    you: "אתם",
  },
} satisfies Record<Lang, unknown>;

// Intent patterns in all three languages.
const RX = {
  help: /^(help|\?|what can you do|commands|ayuda|qué puedes|comandos|עזרה|מה אתה יכול)/,
  open: /^(open|go to|goto|show|abrir|abre|ir a|muestra|פתח|פתחי|עבור ל|הצג)/,
  license: /licen[cs]|tier|upgrade|nivel|mejorar|רישיון|רמה|שדרוג/,
  diag: /diagnos|engine health|calibrat|salud de motor|אבחון|כיול/,
  health: /health|status|system check|uptime|latency|chequeo|estado|sistema|latencia|בדיקת מערכת|סטטוס|השהיה|מערכת/,
  explain: /^(explain|what is|what's|tell me about|describe|explica|qué es|háblame|describe|הסבר|מה זה|ספר לי)/,
  fail: /fail|fallid|fall[oó]|נכשל/,
  runs: /run|history|recent|last|ejecuci|historial|reciente|últim|הרצ|היסטוריה|אחרונ/,
  perms: /permission|role|who am i|whoami|can i|permiso|rol|quién soy|הרשא|תפקיד|מי אני/,
  threats: /threat|security|inject|breach|attack|amenaza|seguridad|inyecci|ataque|איום|איומים|אבטחה|הזרקה|מתקפה/,
  hello: /^(hi|hello|hey|shalom|hola|buenas|שלום|היי)/,
};

/** Finds an engine by key or name; engine names are the same in every language. */
const engineIn = (q: string): EngineKey | null => ENGINE_ORDER.find((k) => q.includes(k) || q.includes(ENGINES[k].name.toLowerCase())) ?? null;

/**
 * Agent Zero's brain: deterministic intent matching over the workspace's own state. No model and no network;
 * every answer is computed from what's on this device (settings, license, history, audit) and the last probe.
 */
function respond(input: string, c: Ctx): Reply {
  const t = T[c.lang];
  const q = input.toLowerCase().trim();
  const s = c.s;
  const me = activeMember(s);
  const ago = (at: number) => t.ago(Math.round((Date.now() - at) / 60_000));
  const tiers = tierInfo(c.lang);
  const archs = architecturesIn(c.lang);
  const anyArch = (pred: (name: string, slug: string) => boolean) => ARCHITECTURES.findIndex((a, i) => (["en", "es", "he"] as const).some((l) => pred(architecturesIn(l)[i].name.toLowerCase(), a.slug)));

  if (RX.help.test(q)) return { text: t.help.join("\n") };

  if (RX.open.test(q)) {
    const target = OS_NAV.find((n) => Object.values(OS_COPY).some((cp) => q.includes(cp.nav[n.href].name.toLowerCase())) || q.includes(n.href.split("/").pop()!.replace("-", " ")));
    if (target) return { text: t.opening(OS_COPY[c.lang].nav[target.href].label), go: target.href };
    const ai = anyArch((name, slug) => q.includes(name) || q.includes(slug.replace(/-/g, " ")));
    if (ai >= 0) return { text: t.openingProduct(archs[ai].name), go: `/desk/architectures/${ARCHITECTURES[ai].slug}` };
    const k = engineIn(q);
    if (k) return { text: t.openingEngine(ENGINES[k].name), go: `/desk/engines/${k}` };
  }

  if (RX.license.test(q)) {
    const lic = s.license;
    const locked = ENGINE_ORDER.filter((k) => !TIER_ENGINES[c.tier].includes(k));
    const products = archs.filter((a) => a.engines.every((k) => TIER_ENGINES[c.tier].includes(k)));
    return {
      text: [
        t.license(tiers[c.tier].label, lic ? lic.org : null),
        lic ? t.licenseMeta(lic.issuedAt.slice(0, 10), lic.expiresAt, lic.dev, ago(lic.verifiedAt)) : t.addKey,
        `${t.engines}: ${TIER_ENGINES[c.tier].map((k) => ENGINES[k].name).join(", ")}`,
        t.products(products.length, products.map((a) => a.name).join(", ")),
        locked.length ? t.locked(locked.map((k) => ENGINES[k].name).join(", "), tiers[c.tier === "tier1" || c.tier === "evaluation" ? "tier2" : "tier3"].label) : t.nothingLocked,
      ].join("\n"),
    };
  }

  if (RX.diag.test(q)) {
    const k = engineIn(q);
    const rows = (k ? [k] : ENGINE_ORDER).map((key) => {
      const cal = readCalibration(s.calibrations[key]);
      const runs = s.runs.filter((r) => r.target === key);
      const failed = runs.filter((r) => !r.ok).length;
      const status = !TIER_ENGINES[c.tier].includes(key) ? t.status.locked : failed && failed === runs.length ? t.status.failing : t.status.ok;
      return `  ${ENGINES[key].index} ${ENGINES[key].name.padEnd(12)} ${status} ${modelInfo(cal.model).label.padEnd(17)} ${t.diagRow(cal.tokenBudget, `${cal.memory.length}/${cal.memoryRuns}`, runs.length, failed, isTuned(s.calibrations[key]))}`;
    });
    return { text: [t.diagTitle(k ? ENGINES[k].name : null), ...rows].join("\n") };
  }

  if (RX.health.test(q)) {
    const chain = verifyAudit(s.audit);
    const bytes = new Blob([JSON.stringify(s)]).size;
    const keys = (["anthropic", "openrouter", "openai"] as const).filter((k) => s.keys[k].trim());
    return {
      text: [
        t.health,
        t.runtime(c.manifest),
        t.latency(c.latency === null ? t.na : `${c.latency}ms`, `${c.uptime === null ? t.na : `${Math.round(c.uptime * 100)}%`} ${OS_COPY[c.lang].shell.slaState[c.sla] ?? c.sla}`),
        t.environment(activeEnv(s).name),
        t.keys(keys.length ? keys.join(", ") : null),
        t.local((bytes / 1024).toFixed(1), s.runs.length, s.audit.length),
        t.chain(chain.ok, chain.checked, chain.unchained, chain.brokenAt),
        t.onboarding(s.onboarded),
      ].join("\n"),
    };
  }

  if (RX.explain.test(q) || /explain|explica|הסבר/.test(q)) {
    const k = engineIn(q);
    if (k) {
      const d = engineDemos(c.lang)[k];
      const e = localizeEngine(ENGINES[k], c.lang);
      return { text: [`${e.name} · ${t.engineLine(e.index)} · ${e.role}`, `  ${UTILITY[c.lang][k]}`, t.howItWorks, ...d.thoughts.map((x) => `   - ${x}`), `${t.typical} ${d.impact.map((m) => `${m.label} ${m.value}`).join(" · ")}`].join("\n") };
    }
    const ai = anyArch((name) => q.includes(name) || name.split(" ").some((w) => w.length > 6 && q.includes(w)));
    if (ai >= 0) {
      const a = archs[ai];
      const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
      return { text: [`${a.name}: ${a.engines.map((e) => ENGINES[e].name).join(" → ")}`, `  ${a.tagline}`, t.pricing(fmt(a.setup), fmt(a.retainer)), `${t.typicalProduct} ${a.impact.compare.map((m) => `${m.label} ${m.before} → ${m.after} ${m.unit}`).join("; ")}`].join("\n") };
    }
  }

  if (RX.fail.test(q)) {
    const failed = s.runs.filter((r) => !r.ok).slice(-6).reverse();
    return { text: failed.length ? [t.failedTitle, ...failed.map((r) => `  ${ago(r.at).padEnd(12)} ${r.label}: ${r.command.slice(0, 70)}`)].join("\n") : t.noFailed };
  }

  if (RX.runs.test(q)) {
    const last = s.runs.slice(-8).reverse();
    return { text: last.length ? [t.recentTitle, ...last.map((r) => `  ${r.ok ? "✓" : "✗"} ${ago(r.at).padEnd(12)} ${r.label.padEnd(26)} ${(r.ms / 1000).toFixed(1)}s · ${r.tokens.input + r.tokens.output} ${t.tokens}`)].join("\n") : t.noRuns };
  }

  if (RX.perms.test(q)) {
    const perms: Permission[] = ["run", "approve", "calibrate", "settings", "members", "license"];
    const r = roleInfo(c.lang)[me.role];
    return { text: [t.youAre(displayName(me.name, c.lang), r.label, r.blurb), ...perms.map((p) => `  ${can(me.role, p) ? "✓" : "·"} ${PERMISSION_TEXT[c.lang][p]}`)].join("\n") };
  }

  if (RX.threats.test(q)) {
    const sec = s.audit.filter((a) => a.kind === "security");
    return { text: sec.length ? [t.threats(sec.length), ...sec.slice(-5).reverse().map((a) => `  ${ago(a.at).padEnd(12)} ${a.message}`), t.threatsMore].join("\n") : t.noThreats };
  }

  if (RX.hello.test(q)) return { text: t.hello(displayName(me.name, c.lang)) };

  return { text: t.unknown(t.chips.slice(0, 4).join(", ")) };
}

/** /desk/assistant: Agent Zero, a zero-LLM terminal assistant over local state. */
export function Assistant() {
  const router = useRouter();
  const { lang } = useCommandCopy();
  const t = T[lang];
  const { settings } = useDeskSettings();
  const { tier } = useLicense();
  const { manifest, latency, sla, uptime } = useOsTelemetry();
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const seq = useRef(1);

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const reply = respond(q, { s: settings, tier, manifest, latency, sla, uptime, lang });
    setLines((l) => [...l, { id: seq.current++, who: "you", text: q }, { id: seq.current++, who: "zero", text: reply.text }]);
    setInput("");
    if (reply.go) setTimeout(() => router.push(reply.go!), 600);
  };

  return (
    <OsPage route="/desk/assistant">
      <section className="os-panel overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-os-line px-4 py-2.5">
          <Cpu className="size-4 text-os-emerald" />
          <span className="font-mono text-[11px] tracking-[0.2em] text-os-emerald">AGENT ZERO</span>
          <span className="ms-auto font-mono text-[10px] text-white/35">{t.badge}</span>
        </div>
        <div ref={box} role="log" aria-live="polite" className="h-[28rem] overflow-y-auto bg-black/40 p-4 font-mono text-[12.5px] leading-relaxed">
          {/* The greeting follows the current language; the conversation keeps what was said. */}
          {[{ id: 0, who: "zero" as const, text: t.welcome }, ...lines].map((l) => (
            <div key={l.id} dir="auto" className={cn("mb-2 whitespace-pre-wrap", l.who === "you" ? "text-os-cyan" : "text-white/80")}>
              <span className={l.who === "you" ? "text-os-cyan/60" : "text-os-emerald"}>{l.who === "you" ? `${t.you}> ` : "zero> "}</span>
              {l.text}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-os-line px-3 py-2">
          {t.chips.map((c) => (
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
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholder} aria-label={t.inputLabel} autoComplete="off" className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-white placeholder:text-white/30 focus:outline-none" />
          <button type="submit" aria-label={t.send} className="rounded-md p-1.5 text-os-cyan hover:bg-os-cyan/10">
            <CornerDownLeft className="size-4 rtl:-scale-x-100" />
          </button>
        </form>
      </section>
    </OsPage>
  );
}
