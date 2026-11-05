"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CircleDashed, KeyRound, Loader2, Plug, Building2, Stethoscope, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BloomWordmark } from "@/components/bloom/logo";
import { ENGINES } from "@/components/bloom/command/engines";
import type { CommandManifest } from "@/lib/engines/events";
import { useLicense } from "@/lib/license-context";
import { TIER_INFO, tierInfo } from "@/lib/license/tiers";
import { useCommandCopy } from "@/components/bloom/command/locale";
import type { Lang } from "@/components/bloom/i18n";
import { readLogo } from "./logo";
import { audit, keyHeaders, requestHeaders, updateSettings, useDeskSettings, type DeskSettings, type ShiftDefault } from "./settings";

const STEP_ICONS = [KeyRound, Plug, Building2, Stethoscope] as const;

const COPY = {
  en: {
    steps: [
      ["Product license", "Your license key decides which architectures this workspace runs."],
      ["Model providers", "Connect Anthropic or OpenRouter to run engines live. Skip to use the simulation runtime."],
      ["Workspace & branding", "Name the workspace, add your logo and set yourself up as its owner."],
      ["System diagnostics", "A full check of the workspace before you enter the Operating Desk."],
    ] as [string, string][],
    completed: "Completed guided setup",
    back: "Back",
    backToDesk: "Back to the desk",
    skip: "Skip for now",
    kicker: (n: number) => `Guided setup · Step ${n} of 4`,
    stepsLabel: "Setup steps",
    continue: "Continue",
    enter: "Enter the Operating Desk",
    activated: (tier: string, org: string) => `Activated ${tier} for ${org}.`,
    licenseKey: "License key",
    validate: "Validate",
    thisWorkspace: "This workspace",
    expires: (d: string) => ` · expires ${d}`,
    noKey: "No key yet: you can continue in Evaluation and add one later in App Settings.",
    devKeys: "Development keys:",
    testing: "Testing…",
    testFailed: "Test failed.",
    noService: "Couldn't reach the test service.",
    anthropic: "Anthropic API key",
    openrouter: "OpenRouter API key",
    test: "Test",
    keysNote: "Keys stay on this device and travel with each run over HTTPS; the server uses them for that request only. With no key, engines run on the server's configuration, or the simulation runtime if none is set. More gateways (OpenAI, vector databases, custom endpoints) are in App Settings.",
    uploadLogo: "Upload workspace logo",
    logoAlt: "Workspace logo",
    badImage: "That image couldn't be read.",
    orgName: "Organization name",
    ownerName: "Your name (workspace owner)",
    defaultOwner: "Workspace Owner",
    email: "Your email",
    shift: "Default shift when the desk opens",
    followClock: "Follow clock",
    shifts: { prime: "Prime", dark: "Dark", surge: "Surge" } as Record<string, string>,
    checks: ["License verification", "Runtime API reachability", "Model provider", "Engine definitions & schemas", "Run gateway accepts this license", "Local persistence"],
    failed: "Failed.",
    noKeyAs: (tier: string) => `No key: running as ${tier}.`,
    rejected: "Rejected.",
    apiStatus: (n: number) => `Runtime API returned ${n}.`,
    responded: (ms: number) => `Responded in ${ms}ms.`,
    liveOn: (provider: string, model: string) => `Live on ${provider} · ${model}.`,
    simulation: "No provider key: engines run on the simulation runtime.",
    expected: (n: number) => `Expected 8 engines, found ${n}.`,
    schemas: (tools: number) => `8 engines, ${tools} tools, input and output schemas loaded.`,
    refused: (name: string) => `The gateway refused ${name} for this license.`,
    rateLimited: "Rate limited right now; try the check again in a minute.",
    authorized: (n: number, name: string) => `${n} engine${n === 1 ? "" : "s"} authorized, starting with ${name}.`,
    unexpected: (n: number) => `Unexpected gateway response ${n}.`,
    storage: "Couldn't write to local storage.",
    saved: (kb: string) => `Workspace state saved (${kb} KB).`,
    ran: (ok: boolean) => `Ran setup diagnostics: ${ok ? "all checks passed" : "some checks failed"}`,
    intro: "Six checks: license, runtime API, model provider, engine schemas, run gateway authorization and local persistence.",
    again: "Run diagnostics again",
    runIt: "Run system diagnostics",
    amber: "Amber checks are advisories: the workspace works, with the noted limitation.",
  },
  es: {
    steps: [
      ["Licencia del producto", "Tu clave de licencia decide qué arquitecturas ejecuta este espacio."],
      ["Proveedores de modelos", "Conecta Anthropic u OpenRouter para ejecutar los motores en vivo. Sáltalo para usar el runtime de simulación."],
      ["Espacio de trabajo y marca", "Pon nombre al espacio, añade tu logo y regístrate como propietario."],
      ["Diagnóstico del sistema", "Una comprobación completa del espacio antes de entrar en el escritorio de operaciones."],
    ],
    completed: "Configuración guiada completada",
    back: "Atrás",
    backToDesk: "Volver al escritorio",
    skip: "Omitir por ahora",
    kicker: (n: number) => `Configuración guiada · Paso ${n} de 4`,
    stepsLabel: "Pasos de la configuración",
    continue: "Continuar",
    enter: "Entrar al escritorio de operaciones",
    activated: (tier: string, org: string) => `${tier} activado para ${org}.`,
    licenseKey: "Clave de licencia",
    validate: "Validar",
    thisWorkspace: "Este espacio de trabajo",
    expires: (d: string) => ` · caduca ${d}`,
    noKey: "Aún no hay clave: puedes continuar en Evaluación y añadir una más tarde en Ajustes.",
    devKeys: "Claves de desarrollo:",
    testing: "Probando…",
    testFailed: "La prueba falló.",
    noService: "No se pudo contactar con el servicio de pruebas.",
    anthropic: "Clave de API de Anthropic",
    openrouter: "Clave de API de OpenRouter",
    test: "Probar",
    keysNote: "Las claves se quedan en este dispositivo y viajan con cada ejecución por HTTPS; el servidor solo las usa para esa petición. Sin clave, los motores usan la configuración del servidor, o el runtime de simulación si no hay ninguna. Hay más gateways (OpenAI, bases de datos vectoriales, endpoints propios) en Ajustes.",
    uploadLogo: "Subir el logo del espacio",
    logoAlt: "Logo del espacio",
    badImage: "No se pudo leer esa imagen.",
    orgName: "Nombre de la organización",
    ownerName: "Tu nombre (propietario del espacio)",
    defaultOwner: "Propietario del espacio",
    email: "Tu email",
    shift: "Turno predeterminado al abrir el escritorio",
    followClock: "Seguir el reloj",
    shifts: { prime: "Prime", dark: "Dark", surge: "Surge" },
    checks: ["Verificación de la licencia", "Acceso a la API del runtime", "Proveedor de modelos", "Definiciones y esquemas de los motores", "El gateway de ejecución acepta esta licencia", "Persistencia local"],
    failed: "Falló.",
    noKeyAs: (tier: string) => `Sin clave: funcionando como ${tier}.`,
    rejected: "Rechazada.",
    apiStatus: (n: number) => `La API del runtime devolvió ${n}.`,
    responded: (ms: number) => `Respondió en ${ms} ms.`,
    liveOn: (provider: string, model: string) => `En vivo en ${provider} · ${model}.`,
    simulation: "Sin clave de proveedor: los motores funcionan en el runtime de simulación.",
    expected: (n: number) => `Se esperaban 8 motores y hay ${n}.`,
    schemas: (tools: number) => `8 motores, ${tools} herramientas, esquemas de entrada y salida cargados.`,
    refused: (name: string) => `El gateway rechazó ${name} con esta licencia.`,
    rateLimited: "Ahora mismo hay límite de frecuencia; vuelve a comprobarlo en un minuto.",
    authorized: (n: number, name: string) => `${n} motor${n === 1 ? "" : "es"} autorizado${n === 1 ? "" : "s"}, empezando por ${name}.`,
    unexpected: (n: number) => `Respuesta inesperada del gateway: ${n}.`,
    storage: "No se pudo escribir en el almacenamiento local.",
    saved: (kb: string) => `Estado del espacio guardado (${kb} KB).`,
    ran: (ok: boolean) => `Diagnóstico de configuración: ${ok ? "todas las comprobaciones correctas" : "algunas comprobaciones fallaron"}`,
    intro: "Seis comprobaciones: licencia, API del runtime, proveedor de modelos, esquemas de los motores, autorización del gateway y persistencia local.",
    again: "Repetir el diagnóstico",
    runIt: "Ejecutar el diagnóstico del sistema",
    amber: "Las comprobaciones en ámbar son avisos: el espacio funciona, con la limitación indicada.",
  },
  he: {
    steps: [
      ["רישיון המוצר", "מפתח הרישיון קובע אילו ארכיטקטורות סביבת העבודה מריצה."],
      ["ספקי מודלים", "חברו את Anthropic או OpenRouter כדי להריץ את המנועים בזמן אמת. דלגו כדי להשתמש בסביבת הסימולציה."],
      ["סביבת עבודה ומיתוג", "תנו שם לסביבת העבודה, הוסיפו לוגו והגדירו את עצמכם כבעלים."],
      ["אבחון מערכת", "בדיקה מלאה של סביבת העבודה לפני הכניסה לשולחן התפעול."],
    ],
    completed: "ההגדרה המודרכת הושלמה",
    back: "חזרה",
    backToDesk: "חזרה לשולחן",
    skip: "דילוג בינתיים",
    kicker: (n: number) => `הגדרה מודרכת · שלב ${n} מתוך 4`,
    stepsLabel: "שלבי ההגדרה",
    continue: "המשך",
    enter: "כניסה לשולחן התפעול",
    activated: (tier: string, org: string) => `${tier} הופעל עבור ${org}.`,
    licenseKey: "מפתח רישיון",
    validate: "אימות",
    thisWorkspace: "סביבת העבודה הזו",
    expires: (d: string) => ` · בתוקף עד ${d}`,
    noKey: "עדיין אין מפתח: אפשר להמשיך במצב הערכה ולהוסיף מפתח מאוחר יותר בהגדרות.",
    devKeys: "מפתחות פיתוח:",
    testing: "בודק…",
    testFailed: "הבדיקה נכשלה.",
    noService: "לא הצלחנו להגיע לשירות הבדיקה.",
    anthropic: "מפתח API של Anthropic",
    openrouter: "מפתח API של OpenRouter",
    test: "בדיקה",
    keysNote: "המפתחות נשארים במכשיר הזה ונשלחים עם כל הרצה ב־HTTPS; השרת משתמש בהם רק לאותה בקשה. בלי מפתח, המנועים רצים לפי הגדרות השרת, או בסביבת הסימולציה אם אין כאלה. שערים נוספים (OpenAI, מסדי נתונים וקטוריים, נקודות קצה מותאמות) נמצאים בהגדרות.",
    uploadLogo: "העלאת לוגו לסביבת העבודה",
    logoAlt: "לוגו סביבת העבודה",
    badImage: "לא הצלחנו לקרוא את התמונה.",
    orgName: "שם הארגון",
    ownerName: "השם שלכם (בעלי סביבת העבודה)",
    defaultOwner: "בעלי סביבת העבודה",
    email: "המייל שלכם",
    shift: "משמרת ברירת המחדל בפתיחת השולחן",
    followClock: "לפי השעון",
    shifts: { prime: "Prime", dark: "Dark", surge: "Surge" },
    checks: ["אימות הרישיון", "נגישות ה־API של סביבת הריצה", "ספק המודלים", "הגדרות וסכמות המנועים", "שער ההרצה מקבל את הרישיון", "שמירה מקומית"],
    failed: "נכשל.",
    noKeyAs: (tier: string) => `בלי מפתח: פועל כ־${tier}.`,
    rejected: "נדחה.",
    apiStatus: (n: number) => `ה־API של סביבת הריצה החזיר ${n}.`,
    responded: (ms: number) => `הגיב תוך ${ms} מ״ש.`,
    liveOn: (provider: string, model: string) => `חי על ${provider} · ${model}.`,
    simulation: "אין מפתח ספק: המנועים רצים בסביבת הסימולציה.",
    expected: (n: number) => `ציפינו ל־8 מנועים ונמצאו ${n}.`,
    schemas: (tools: number) => `8 מנועים, ${tools} כלים, סכמות הקלט והפלט נטענו.`,
    refused: (name: string) => `השער דחה את ${name} עבור הרישיון הזה.`,
    rateLimited: "יש כרגע הגבלת קצב; נסו את הבדיקה שוב בעוד דקה.",
    authorized: (n: number, name: string) => (n === 1 ? `מנוע אחד מורשה: ${name}.` : `${n} מנועים מורשים, החל מ־${name}.`),
    unexpected: (n: number) => `תשובה לא צפויה מהשער: ${n}.`,
    storage: "לא הצלחנו לכתוב לאחסון המקומי.",
    saved: (kb: string) => `מצב סביבת העבודה נשמר (${kb} KB).`,
    ran: (ok: boolean) => `אבחון ההגדרה: ${ok ? "כל הבדיקות עברו" : "חלק מהבדיקות נכשלו"}`,
    intro: "שש בדיקות: רישיון, API של סביבת הריצה, ספק המודלים, סכמות המנועים, הרשאת שער ההרצה ושמירה מקומית.",
    again: "הרצת האבחון שוב",
    runIt: "הרצת אבחון המערכת",
    amber: "בדיקות בכתום הן המלצות: סביבת העבודה פועלת, עם המגבלה שצוינה.",
  },
} satisfies Record<Lang, unknown>;
type WT = (typeof COPY)[Lang];

const input = "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-[14px] text-white placeholder:text-white/25 focus:border-[#f0d59a]/50 focus:outline-none";

/** The four-step client onboarding flow: license, providers, workspace, diagnostics. Then into the desk. */
export function SetupWizard() {
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { settings } = useDeskSettings();
  const [diagnosticsPassed, setDiagnosticsPassed] = useState(false);
  const { role } = useLicense();

  // Operator keys bypass the setup wizard, including when one is activated mid-wizard.
  useEffect(() => {
    if (role === "operator") router.replace("/desk");
  }, [role, router]);

  const finish = () => {
    updateSettings({ onboarded: true });
    audit("system", t.completed);
    router.push("/desk");
  };

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-ink px-4 py-8 font-sans text-white sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgb(255_189_110/0.1),transparent_55%)]" />
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link href="/">
          <BloomWordmark className="text-[24px]" />
        </Link>
        <Link href="/desk" className="text-[12.5px] text-white/45 hover:text-white/80">
          {settings.onboarded ? t.backToDesk : t.skip}
        </Link>
      </div>

      <main className="mx-auto mt-10 w-full max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#f0d59a]/80">{t.kicker(step + 1)}</p>
        <ol className="mt-4 grid grid-cols-4 gap-2" aria-label={t.stepsLabel}>
          {STEP_ICONS.map((Icon, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? "step" : undefined}
                className={cn("w-full rounded-xl border p-2.5 text-start transition-colors", i === step ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.07]" : i < step ? "border-emerald-400/30 hover:bg-white/[0.03]" : "border-white/[0.07] opacity-50")}
              >
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/45">
                  {i < step ? <Check className="size-3.5 text-emerald-400" /> : <Icon className="size-3.5" />} 0{i + 1}
                </span>
                <span className="mt-1 block truncate text-[12.5px] text-white/85">{t.steps[i][0]}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="os-panel mt-6 rounded-3xl p-6 sm:p-8">
          <h1 className="font-display text-[34px] font-light leading-tight">{t.steps[step][0]}</h1>
          <p className="mt-1 text-[14px] text-white/55">{t.steps[step][1]}</p>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="mt-6">
              {step === 0 && <LicenseStep t={t} lang={lang} />}
              {step === 1 && <ProviderStep t={t} />}
              {step === 2 && <WorkspaceStep t={t} />}
              {step === 3 && <DiagnosticsStep settings={settings} onPassed={setDiagnosticsPassed} t={t} lang={lang} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] text-white/60 hover:text-white disabled:opacity-30">
            <ArrowLeft className="size-4 rtl:-scale-x-100" /> {t.back}
          </button>
          {step < 3 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="flex items-center gap-2 rounded-full bg-[#f3e2b8] px-6 py-2.5 text-[13.5px] font-semibold text-[#1a0f05]">
              {t.continue} <ArrowRight className="size-4 rtl:-scale-x-100" />
            </button>
          ) : (
            <button type="button" onClick={finish} disabled={!diagnosticsPassed} className="flex items-center gap-2 rounded-full bg-[#f3e2b8] px-6 py-2.5 text-[13.5px] font-semibold text-[#1a0f05] shadow-[0_0_50px_-12px_rgb(243_212_143/0.8)] disabled:opacity-40">
              {t.enter} <ArrowRight className="size-4 rtl:-scale-x-100" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function LicenseStep({ t, lang }: { t: WT; lang: Lang }) {
  const tiers = tierInfo(lang);
  const { tier, info, engines, activate, devIssue, devAvailable, checking } = useLicense();
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await activate(key);
          setMsg(r.ok ? { ok: true, text: t.activated(tiers[r.info.tier].label, r.info.org) } : { ok: false, text: r.message });
        }}
      >
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="BLOOM-…" dir="ltr" spellCheck={false} autoComplete="off" className={cn(input, "font-mono text-[12.5px]")} aria-label={t.licenseKey} />
        <button type="submit" disabled={!key.trim() || checking} className="flex items-center gap-1.5 rounded-xl border border-[#f0d59a]/45 px-4 text-[13px] text-[#f3e2b8] hover:bg-[#f0d59a]/10 disabled:opacity-40">
          {checking ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} {t.validate}
        </button>
      </form>
      {msg && <p className={cn("mt-2 text-[12.5px]", msg.ok ? "text-emerald-300" : "text-red-300")}>{msg.text}</p>}
      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/25 p-4">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/45">{t.thisWorkspace}</p>
        <p className="mt-1 text-[16px] text-[#f6ead2]">{tiers[tier].label}</p>
        <p className="text-[12px] text-white/50">{info ? `${info.org}${info.expiresAt ? t.expires(info.expiresAt) : ""}` : t.noKey}</p>
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {Object.values(ENGINES).map((e) => (
            <span key={e.key} className={cn("rounded-lg border px-2 py-1.5 text-[11.5px]", engines.includes(e.key) ? "border-emerald-400/35 text-white/85" : "border-white/[0.06] text-white/30")}>
              {engines.includes(e.key) ? "✓" : "·"} {e.index} {e.name}
            </span>
          ))}
        </div>
      </div>
      {devAvailable && (
        <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[11.5px] text-white/40">
          {t.devKeys}
          {(["tier1", "tier2", "tier3", "admin"] as const).map((tk) => (
            <button key={tk} type="button" onClick={() => devIssue(tk)} className={cn("rounded-full border px-2 py-0.5 font-mono", tier === tk ? "border-[#f0d59a]/60 text-[#f3e2b8]" : "border-white/15 hover:text-white")}>
              {TIER_INFO[tk].short}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}

type Test = { status: "idle" | "testing" | "ok" | "fail"; text: string };

function ProviderStep({ t }: { t: WT }) {
  const { settings } = useDeskSettings();
  const [tests, setTests] = useState<Record<"anthropic" | "openrouter", Test>>({ anthropic: { status: "idle", text: "" }, openrouter: { status: "idle", text: "" } });
  const test = async (provider: "anthropic" | "openrouter") => {
    setTests((x) => ({ ...x, [provider]: { status: "testing", text: t.testing } }));
    try {
      const res = await fetch("/api/settings/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, key: settings.keys[provider] }) });
      const d = (await res.json()) as { ok?: boolean; detail?: string; error?: { message?: string } };
      setTests((x) => ({ ...x, [provider]: { status: d.ok ? "ok" : "fail", text: d.detail ?? d.error?.message ?? t.testFailed } }));
    } catch {
      setTests((x) => ({ ...x, [provider]: { status: "fail", text: t.noService } }));
    }
  };
  return (
    <div className="space-y-5">
      {(
        [
          ["anthropic", t.anthropic, "sk-ant-…"],
          ["openrouter", t.openrouter, "sk-or-…"],
        ] as const
      ).map(([k, label, ph]) => (
        <div key={k}>
          <label className="text-[13px] text-white/75" htmlFor={`wiz-${k}`}>
            {label}
          </label>
          <div className="mt-1.5 flex gap-2">
            <input id={`wiz-${k}`} type="password" value={settings.keys[k]} onChange={(e) => updateSettings((s) => ({ keys: { ...s.keys, [k]: e.target.value } }))} placeholder={ph} dir="ltr" autoComplete="off" className={cn(input, "font-mono text-[12.5px]")} />
            <button type="button" disabled={!settings.keys[k].trim()} onClick={() => test(k)} className="rounded-xl border border-[#f0d59a]/45 px-4 text-[13px] text-[#f3e2b8] hover:bg-[#f0d59a]/10 disabled:opacity-40">
              {t.test}
            </button>
          </div>
          {tests[k].status !== "idle" && (
            <p className={cn("mt-1.5 flex items-center gap-1.5 text-[12px]", tests[k].status === "ok" ? "text-emerald-300" : tests[k].status === "fail" ? "text-red-300" : "text-white/50")}>
              {tests[k].status === "testing" ? <Loader2 className="size-3.5 animate-spin" /> : tests[k].status === "ok" ? <Check className="size-3.5" /> : <X className="size-3.5" />} {tests[k].text}
            </p>
          )}
        </div>
      ))}
      <p className="rounded-xl border border-white/[0.07] bg-black/25 p-3 text-[12px] leading-relaxed text-white/50">
        {t.keysNote}
      </p>
    </div>
  );
}

function WorkspaceStep({ t }: { t: WT }) {
  const { settings } = useDeskSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const owner = settings.members.find((m) => m.role === "owner") ?? settings.members[0];
  const setOwner = (patch: Partial<typeof owner>) => updateSettings((s) => ({ members: s.members.map((m) => (m.id === owner.id ? { ...m, ...patch } : m)) }));
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileRef.current?.click()} className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-black/30 hover:border-[#f0d59a]/50" aria-label={t.uploadLogo}>
          {/* A data URL from the uploader. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {settings.branding.logo ? <img src={settings.branding.logo} alt={t.logoAlt} className="size-full object-contain" /> : <Upload className="size-6 text-white/40" />}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const logo = await readLogo(f);
              updateSettings((s) => ({ branding: { ...s.branding, logo } }));
              setErr(null);
            } catch (x) {
              setErr(x instanceof Error ? x.message : t.badImage);
            }
          }}
        />
        <div className="min-w-0 flex-1">
          <label className="text-[13px] text-white/75" htmlFor="wiz-org">
            {t.orgName}
          </label>
          <input id="wiz-org" value={settings.branding.orgName} onChange={(e) => updateSettings((s) => ({ branding: { ...s.branding, orgName: e.target.value.slice(0, 60) } }))} placeholder="Acme Corp" className={cn(input, "mt-1.5")} />
        </div>
      </div>
      {err && <p className="text-[12px] text-red-300">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[13px] text-white/75" htmlFor="wiz-owner">
            {t.ownerName}
          </label>
          <input id="wiz-owner" value={owner.name} onChange={(e) => setOwner({ name: e.target.value.slice(0, 60) || t.defaultOwner })} className={cn(input, "mt-1.5")} />
        </div>
        <div>
          <label className="text-[13px] text-white/75" htmlFor="wiz-email">
            {t.email}
          </label>
          <input id="wiz-email" type="email" value={owner.email} onChange={(e) => setOwner({ email: e.target.value.slice(0, 120) })} placeholder="you@company.com" className={cn(input, "mt-1.5")} />
        </div>
      </div>
      <div>
        <p className="text-[13px] text-white/75">{t.shift}</p>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {(["clock", "prime", "dark", "surge"] as ShiftDefault[]).map((v) => (
            <button key={v} type="button" onClick={() => updateSettings({ shiftDefault: v })} className={cn("rounded-xl border py-2 text-[12.5px] capitalize", settings.shiftDefault === v ? "border-[#f0d59a]/50 bg-[#f0d59a]/[0.08] text-[#f3e2b8]" : "border-white/10 text-white/55")}>
              {v === "clock" ? t.followClock : t.shifts[v] ?? v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type DiagCheck = { label: string; status: "pending" | "running" | "ok" | "warn" | "fail"; detail: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function DiagnosticsStep({ settings, onPassed, t, lang }: { settings: DeskSettings; onPassed: (ok: boolean) => void; t: WT; lang: Lang }) {
  const tiers = tierInfo(lang);
  const { tier, engines } = useLicense();
  const [checks, setChecks] = useState<DiagCheck[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    onPassed(false);
    // Labels are worded at render time from the check's position, so they follow the language.
    const list: DiagCheck[] = t.checks.map((label) => ({ label, status: "pending" as const, detail: "" }));
    setChecks(list);
    const set = (i: number, c: Partial<DiagCheck>) => setChecks((cs) => cs.map((x, j) => (j === i ? { ...x, ...c } : x)));
    const step = async (i: number, fn: () => Promise<Omit<DiagCheck, "label">>) => {
      set(i, { status: "running" });
      const t0 = performance.now();
      let r: Omit<DiagCheck, "label">;
      try {
        r = await fn();
      } catch (e) {
        r = { status: "fail", detail: e instanceof Error ? e.message : t.failed };
      }
      // Each check holds long enough to be seen.
      await sleep(Math.max(0, 450 - (performance.now() - t0)));
      set(i, r);
      return r.status !== "fail";
    };

    const results = [
      await step(0, async () => {
        if (!settings.licenseKey) return { status: "warn", detail: t.noKeyAs(tiers[tier].label) };
        const res = await fetch("/api/license", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: settings.licenseKey }) });
        const d = (await res.json()) as { tier?: string; org?: string; error?: { message?: string } };
        return res.ok ? { status: "ok", detail: `${tiers[tier].label} · ${d.org}` } : { status: "fail", detail: d.error?.message ?? t.rejected };
      }),
      await step(1, async () => {
        const t0 = performance.now();
        const res = await fetch("/api/command", { cache: "no-store" });
        if (!res.ok) throw new Error(t.apiStatus(res.status));
        return { status: "ok", detail: t.responded(Math.round(performance.now() - t0)) };
      }),
      await step(2, async () => {
        const m = (await (await fetch("/api/command", { headers: keyHeaders(settings.keys), cache: "no-store" })).json()) as CommandManifest;
        return m.mode === "live" ? { status: "ok", detail: t.liveOn(m.provider, m.model) } : { status: "warn", detail: t.simulation };
      }),
      await step(3, async () => {
        const m = (await (await fetch("/api/command?detail=1", { cache: "no-store" })).json()) as CommandManifest;
        const tools = m.engines.reduce((s, e) => s + (e.detail?.tools.length ?? 0), 0);
        if (m.engines.length !== 8) throw new Error(t.expected(m.engines.length));
        return { status: "ok", detail: t.schemas(tools) };
      }),
      await step(4, async () => {
        // An empty command is rejected (422) only after the license check passes, so this costs nothing to run.
        const engine = engines[0];
        const res = await fetch(`/api/command/${engine}`, { method: "POST", headers: { "Content-Type": "application/json", ...requestHeaders(settings) }, body: JSON.stringify({ command: "" }) });
        if (res.status === 403) throw new Error(t.refused(ENGINES[engine].name));
        if (res.status === 429) return { status: "warn", detail: t.rateLimited };
        return res.status === 422 ? { status: "ok", detail: t.authorized(engines.length, ENGINES[engine].name) } : { status: "fail", detail: t.unexpected(res.status) };
      }),
      await step(5, async () => {
        const k = "bloom-desk-diagnostic";
        localStorage.setItem(k, "ok");
        const ok = localStorage.getItem(k) === "ok";
        localStorage.removeItem(k);
        if (!ok) throw new Error(t.storage);
        return { status: "ok", detail: t.saved((new Blob([JSON.stringify(settings)]).size / 1024).toFixed(1)) };
      }),
    ];
    const passed = results.every(Boolean);
    audit("system", t.ran(passed));
    onPassed(passed);
    setRunning(false);
  };

  return (
    <div>
      {checks.length === 0 ? (
        <p className="text-[13px] text-white/55">{t.intro}</p>
      ) : (
        <ul className="space-y-2">
          {checks.map((c, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-3">
              <span className="mt-0.5">
                {c.status === "pending" && <CircleDashed className="size-5 text-white/25" />}
                {c.status === "running" && <Loader2 className="size-5 animate-spin text-[#f3e2b8]" />}
                {(c.status === "ok" || c.status === "warn") && (
                  <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className={cn("flex size-5 items-center justify-center rounded-full", c.status === "ok" ? "bg-emerald-400 text-black" : "bg-amber-400 text-black")}>
                    <Check className="size-3.5" strokeWidth={3} />
                  </motion.span>
                )}
                {c.status === "fail" && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-white">
                    <X className="size-3.5" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] text-white/90">{t.checks[i]}</span>
                {c.detail && <span className={cn("block text-[12px]", c.status === "fail" ? "text-red-300" : c.status === "warn" ? "text-amber-200/80" : "text-white/50")}>{c.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={run} disabled={running} className="mt-5 flex items-center gap-2 rounded-full border border-[#f0d59a]/45 px-5 py-2 text-[13px] text-[#f3e2b8] hover:bg-[#f0d59a]/10 disabled:opacity-50">
        {running ? <Loader2 className="size-4 animate-spin" /> : <Stethoscope className="size-4" />} {checks.length ? t.again : t.runIt}
      </button>
      <p className="mt-2 text-[11.5px] text-white/35">{t.amber}</p>
    </div>
  );
}
