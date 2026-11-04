import type { Lang } from "@/components/bloom/i18n";
import type { BoardSession, BoardVote } from "@/components/desk/settings";

/**
 * The Shadow Board's deliberation. Three adversarial agents read the same proposal and score it on their own
 * criteria; Compliance can veto. It's rule-based and runs locally, so it's instant, deterministic and auditable:
 * the same proposal always gets the same verdict, and each agent's timing is its measured compute time.
 * Keywords are matched in English, Spanish and Hebrew; the agents argue in the language asked for.
 */

export type AgentKey = "advocate" | "optimizer" | "compliance";
export const AGENT_COLORS: Record<AgentKey, string> = { advocate: "#ff6b8b", optimizer: "#f0d59a", compliance: "#34f5b5" };

/** Criteria keys (stored in votes); their display names are in the board's copy. */
export const CRITERIA = ["Risk", "Reversibility", "ROI", "Budget fit", "Compliance"] as const;
export type Criterion = (typeof CRITERIA)[number];
const WEIGHTS = { advocate: 0.35, optimizer: 0.35, compliance: 0.3 };

export type Proposal = { subject: string; detail: string; budgetUsd: number; amountOverride?: number | null };

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Everything the agents say, per language. */
export const BOARD_TEXT = {
  en: {
    agents: {
      advocate: { name: "Devil's Advocate Agent", short: "Devil's Advocate", role: "Challenges risk, security and reversibility" },
      optimizer: { name: "Financial Optimizer Agent", short: "Financial Optimizer", role: "Stress-tests ROI and budget bounds" },
      compliance: { name: "Compliance Gate Agent", short: "Compliance Gate", role: "Verifies regulatory alignment; holds a veto" },
    } as Record<AgentKey, { name: string; short: string; role: string }>,
    criteria: { Risk: "Risk", Reversibility: "Reversibility", ROI: "ROI", "Budget fit": "Budget fit", Compliance: "Compliance" } as Record<Criterion, string>,
    irreversible: (w: string) => `Irreversible step detected (${w}). Once executed there is no automatic undo.`,
    reversible: "No irreversible operation named; the action can be unwound.",
    blast: (w: string) => `Blast radius is wide (${w}); a fault propagates beyond a single account.`,
    contained: "Scope is contained to a single target.",
    access: (w: string) => `Touches privileged access (${w}). Treat as a security-sensitive change.`,
    noAccess: "No privileged access or credentials involved.",
    safety: (w: string) => `Mitigation present: ${w}.`,
    noSafety: "No staged rollout, pilot or rollback plan is stated.",
    condStage: "Stage it: pilot on one account before the full change",
    condCred: "Use a scoped, expiring credential",
    noAmount: "No dollar figure stated; budget impact assessed as unknown.",
    amount: (a: string, b: string, pct: string) => `${a} against a ${b} approval budget (${pct}% of bound).`,
    upside: (w: string) => `Upside signals: ${w}.`,
    noUpside: "No measurable return is stated in the proposal.",
    discount: (d: number, band: "floor" | "watch" | "ok") => `Concedes ${d}% ${band === "floor" ? "(below the margin floor)" : band === "watch" ? "(within band, but watch margin)" : "(within band)"}.`,
    noDiscount: "No price concession involved.",
    over: "Exceeds the budget bound: needs re-allocation or a split into tranches.",
    fits: "Fits within the current budget envelope.",
    condTranches: (b: string) => `Split into tranches under ${b}`,
    condCap: "Cap the discount at 20%",
    condReturn: "Attach the expected return before execution",
    data: (w: string) => `Processes regulated data (${w}).`,
    noData: "No personal or regulated data in scope.",
    safeguards: (w: string) => `Safeguards stated: ${w}.`,
    blocking: "No lawful basis, consent or DPA referenced: blocking.",
    noSafeguards: "No additional safeguards required.",
    finance: (w: string) => `Financial/contractual commitment (${w}): human signature required by policy.`,
    noFinance: "No binding commitment created.",
    frameworks: (w: string) => `Frameworks in scope: ${w}.`,
    noFrameworks: "No named regulatory framework triggered.",
    condConsent: "Document consent / DPA before any data leaves the workspace",
    condHitl: "Named human signs off (HITL)",
    condSecond: "Second approver for spend over 2x budget",
    aligned: (them: string, gap: string) => `aligned with ${them} within ${gap} points; no objection to its reading.`,
    overweight: (them: string, cond: string | null) => `${them} is overweighting the upside. ${cond ? `My condition stands: ${cond}.` : "The downside case is not priced in."}`,
    addressable: (them: string, cond: string | null) => `${them}'s concerns are addressable${cond ? ` (${cond})` : ""}; that does not justify blocking.`,
  },
  es: {
    agents: {
      advocate: { name: "Agente abogado del diablo", short: "Abogado del diablo", role: "Cuestiona el riesgo, la seguridad y la reversibilidad" },
      optimizer: { name: "Agente optimizador financiero", short: "Optimizador financiero", role: "Pone a prueba el ROI y los límites de presupuesto" },
      compliance: { name: "Agente de control de cumplimiento", short: "Control de cumplimiento", role: "Verifica el cumplimiento normativo; tiene derecho de veto" },
    },
    criteria: { Risk: "Riesgo", Reversibility: "Reversibilidad", ROI: "ROI", "Budget fit": "Encaje en presupuesto", Compliance: "Cumplimiento" },
    irreversible: (w: string) => `Paso irreversible detectado (${w}). Una vez ejecutado no hay forma automática de deshacerlo.`,
    reversible: "No se menciona ninguna operación irreversible; la acción puede deshacerse.",
    blast: (w: string) => `El radio de impacto es amplio (${w}); un fallo se extiende más allá de una sola cuenta.`,
    contained: "El alcance se limita a un único objetivo.",
    access: (w: string) => `Afecta a accesos privilegiados (${w}). Trátalo como un cambio sensible para la seguridad.`,
    noAccess: "No intervienen accesos privilegiados ni credenciales.",
    safety: (w: string) => `Hay mitigación: ${w}.`,
    noSafety: "No se indica despliegue gradual, piloto ni plan de marcha atrás.",
    condStage: "Hazlo por fases: piloto en una cuenta antes del cambio completo",
    condCred: "Usa una credencial acotada y con caducidad",
    noAmount: "No se indica ninguna cifra; el impacto en el presupuesto es desconocido.",
    amount: (a: string, b: string, pct: string) => `${a} frente a un presupuesto de aprobación de ${b} (${pct}% del límite).`,
    upside: (w: string) => `Señales de beneficio: ${w}.`,
    noUpside: "La propuesta no indica ningún retorno medible.",
    discount: (d: number, band: "floor" | "watch" | "ok") => `Cede un ${d}% ${band === "floor" ? "(por debajo del margen mínimo)" : band === "watch" ? "(dentro del rango, pero vigila el margen)" : "(dentro del rango)"}.`,
    noDiscount: "No hay concesiones de precio.",
    over: "Supera el límite de presupuesto: hay que reasignar o dividir en tramos.",
    fits: "Cabe dentro del presupuesto actual.",
    condTranches: (b: string) => `Divídelo en tramos por debajo de ${b}`,
    condCap: "Limita el descuento al 20%",
    condReturn: "Indica el retorno esperado antes de ejecutar",
    data: (w: string) => `Trata datos regulados (${w}).`,
    noData: "No hay datos personales ni regulados en juego.",
    safeguards: (w: string) => `Salvaguardas indicadas: ${w}.`,
    blocking: "No se menciona base legal, consentimiento ni DPA: se bloquea.",
    noSafeguards: "No se necesitan salvaguardas adicionales.",
    finance: (w: string) => `Compromiso financiero o contractual (${w}): la política exige la firma de una persona.`,
    noFinance: "No se crea ningún compromiso vinculante.",
    frameworks: (w: string) => `Marcos normativos aplicables: ${w}.`,
    noFrameworks: "No se activa ningún marco normativo concreto.",
    condConsent: "Documenta el consentimiento o el DPA antes de que salga ningún dato del espacio",
    condHitl: "Una persona identificada debe firmar (HITL)",
    condSecond: "Segundo aprobador para gastos de más del doble del presupuesto",
    aligned: (them: string, gap: string) => `coincido con ${them} con ${gap} puntos de diferencia; no objeto a su lectura.`,
    overweight: (them: string, cond: string | null) => `${them} sobrevalora el beneficio. ${cond ? `Mi condición sigue en pie: ${cond}.` : "El escenario negativo no está contemplado."}`,
    addressable: (them: string, cond: string | null) => `las objeciones de ${them} se pueden resolver${cond ? ` (${cond})` : ""}; eso no justifica bloquear.`,
  },
  he: {
    agents: {
      advocate: { name: "סוכן פרקליט השטן", short: "פרקליט השטן", role: "מערער על הסיכון, האבטחה והיכולת לחזור לאחור" },
      optimizer: { name: "סוכן האופטימיזציה הפיננסית", short: "אופטימיזציה פיננסית", role: "בודק בלחץ את ה־ROI ואת גבולות התקציב" },
      compliance: { name: "סוכן שער הציות", short: "שער הציות", role: "מוודא התאמה רגולטורית; מחזיק בזכות וטו" },
    },
    criteria: { Risk: "סיכון", Reversibility: "הפיכות", ROI: "ROI", "Budget fit": "התאמה לתקציב", Compliance: "ציות" },
    irreversible: (w: string) => `זוהה צעד בלתי הפיך (${w}). אחרי הביצוע אין ביטול אוטומטי.`,
    reversible: "לא צוינה פעולה בלתי הפיכה; אפשר לבטל את הפעולה.",
    blast: (w: string) => `רדיוס הפגיעה רחב (${w}); תקלה תתפשט מעבר לחשבון אחד.`,
    contained: "ההיקף מוגבל ליעד אחד.",
    access: (w: string) => `נוגע בגישה מורשית (${w}). יש להתייחס לזה כשינוי רגיש מבחינת אבטחה.`,
    noAccess: "אין מעורבות של גישה מורשית או של אישורי גישה.",
    safety: (w: string) => `יש מנגנון הגנה: ${w}.`,
    noSafety: "לא צוינו פריסה מדורגת, פיילוט או תוכנית חזרה לאחור.",
    condStage: "בצעו בשלבים: פיילוט על חשבון אחד לפני השינוי המלא",
    condCred: "השתמשו באישור גישה מוגבל ובעל תוקף",
    noAmount: "לא צוין סכום; ההשפעה על התקציב לא ידועה.",
    amount: (a: string, b: string, pct: string) => `${a} מול תקציב אישור של ${b} (${pct}% מהגבול).`,
    upside: (w: string) => `אותות לתועלת: ${w}.`,
    noUpside: "ההצעה לא מציינת תשואה מדידה.",
    discount: (d: number, band: "floor" | "watch" | "ok") => `מוותר על ${d}% ${band === "floor" ? "(מתחת לרף הרווחיות)" : band === "watch" ? "(בטווח, אבל שימו לב לרווחיות)" : "(בטווח)"}.`,
    noDiscount: "אין ויתור במחיר.",
    over: "חורג מגבול התקציב: צריך הקצאה מחדש או פיצול לפעימות.",
    fits: "נכנס במסגרת התקציב הנוכחית.",
    condTranches: (b: string) => `פצלו לפעימות מתחת ל־${b}`,
    condCap: "הגבילו את ההנחה ל־20%",
    condReturn: "צרפו את התשואה הצפויה לפני הביצוע",
    data: (w: string) => `מעבד מידע מפוקח (${w}).`,
    noData: "אין מידע אישי או מפוקח בהיקף.",
    safeguards: (w: string) => `אמצעי הגנה שצוינו: ${w}.`,
    blocking: "לא צוינו בסיס חוקי, הסכמה או DPA: חסימה.",
    noSafeguards: "לא נדרשים אמצעי הגנה נוספים.",
    finance: (w: string) => `התחייבות כספית או חוזית (${w}): לפי המדיניות נדרשת חתימה של אדם.`,
    noFinance: "לא נוצרת התחייבות מחייבת.",
    frameworks: (w: string) => `מסגרות רגולטוריות בהיקף: ${w}.`,
    noFrameworks: "לא הופעלה מסגרת רגולטורית מסוימת.",
    condConsent: "תעדו הסכמה או DPA לפני שמידע כלשהו יוצא מסביבת העבודה",
    condHitl: "אדם מזוהה חותם (HITL)",
    condSecond: "מאשר שני להוצאה של יותר מפי 2 מהתקציב",
    aligned: (them: string, gap: string) => `מסכים עם ${them} בהפרש של ${gap} נקודות; אין התנגדות לקריאה שלו.`,
    overweight: (them: string, cond: string | null) => `${them} נותן משקל יתר לתועלת. ${cond ? `התנאי שלי עומד: ${cond}.` : "תרחיש הפגיעה לא מתומחר."}`,
    addressable: (them: string, cond: string | null) => `אפשר לטפל בחששות של ${them}${cond ? ` (${cond})` : ""}; זה לא מצדיק חסימה.`,
  },
} satisfies Record<Lang, unknown>;

// Keywords per rule, in English, Spanish and Hebrew. Hebrew has no word boundaries in JS regex, so it matches as a substring.
const K = {
  irreversible: ["delete", "drop", "terminat", "wipe", "purge", "irreversib", "wire", "transfer", "sign", "borrar", "eliminar", "purgar", "irreversib", "transferencia", "firmar", "מחיק", "מחק", "בלתי הפיך", "העברה", "חתימ", "לחתום"],
  blast: ["production", "prod", "all customers", "every", "global", "mass", "entire", "producción", "todos los clientes", "masiv", "global", "ייצור", "כל הלקוחות", "גלובל", "המוני"],
  access: ["credential", "password", "access", "admin", "root", "permission", "api key", "token", "credencial", "contraseña", "acceso", "permiso", "clave", "סיסמ", "גישה", "הרשא", "מפתח", "אישורי"],
  safety: ["rollback", "pilot", "staged", "canary", "test", "sandbox", "dry run", "reversible", "trial", "piloto", "por fases", "prueba", "reversible", "פיילוט", "בשלבים", "ניסיון", "בדיקה", "חזרה לאחור"],
  upside: ["revenue", "renewal", "upsell", "save", "saving", "reduce cost", "roi", "margin", "retain", "pipeline", "close", "ingreso", "renovaci", "ahorr", "margen", "retener", "cerrar", "הכנס", "חידוש", "חיסכון", "חסכון", "רווחיות", "שימור", "פייפליין", "סגירה"],
  data: ["personal data", "pii", "email list", "customer data", "health", "medical", "biometric", "export", "scrape", "share data", "datos personales", "datos de clientes", "lista de email", "salud", "médic", "biométric", "exportar", "מידע אישי", "נתוני לקוחות", "רשימת מיילים", "רפואי", "בריאות", "ביומטר", "ייצוא", "לייצא"],
  safeguards: ["consent", "dpa", "anonymi", "pseudonym", "encrypted", "opt-in", "legal review", "gdpr", "hipaa", "soc ?2", "consentimiento", "cifrad", "revisión legal", "הסכמה", "מוצפן", "הצפנ", "בדיקה משפטית"],
  finance: ["wire", "payment", "invoice", "transfer", "contract", "agreement", "sign", "pago", "factura", "transferencia", "contrato", "acuerdo", "firmar", "תשלום", "חשבונית", "העברה", "חוזה", "הסכם", "לחתום"],
  regulated: ["gdpr", "hipaa", "sox", "pci", "ccpa", "sec ", "aml", "kyc", "rgpd"],
};
const HEBREW = /[֐-׿]/;
const has = (t: string, words: string[]) => [...new Set(words.filter((w) => (HEBREW.test(w) ? t.includes(w) : new RegExp(`\\b${w}`, "i").test(t))))];
const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** The largest dollar figure in the text ("$48,000", "$1.2M", "250k USD"). */
export function amountIn(text: string): number | null {
  let best: number | null = null;
  for (const m of text.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)\s?([kKmMbB])?|(\d[\d,]*(?:\.\d+)?)\s?([kKmM])?\s?(?:usd|dollars|dólares|דולר)/g)) {
    const n = parseFloat((m[1] ?? m[3]).replace(/,/g, ""));
    const unit = (m[2] ?? m[4] ?? "").toLowerCase();
    const v = n * (unit === "k" ? 1e3 : unit === "m" ? 1e6 : unit === "b" ? 1e9 : 1);
    if (best === null || v > best) best = v;
  }
  return best;
}

function timed(fn: () => Omit<BoardVote, "ms">): BoardVote {
  const t0 = performance.now();
  const v = fn();
  return { ...v, ms: Math.max(0.001, performance.now() - t0) };
}

function stanceOf(score: number): BoardVote["stance"] {
  return score >= 0.66 ? "support" : score >= 0.42 ? "conditional" : "oppose";
}

export function deliberate(p: Proposal, lang: Lang = "en"): Omit<BoardSession, "id" | "at" | "hash" | "approvalId" | "runId"> {
  const T = BOARD_TEXT[lang];
  const text = `${p.subject}\n${p.detail}`.toLowerCase();
  // The spend is the figure in the proposal itself; context figures (pipeline, savings) are upside, not cost.
  const amount = p.amountOverride ?? amountIn(p.subject) ?? amountIn(p.detail);
  const budget = Math.max(1, p.budgetUsd);
  const t0 = performance.now();
  const list = (w: string[]) => w.join(", ");

  const advocate = timed(() => {
    const irreversible = has(text, K.irreversible);
    const blast = has(text, K.blast);
    const access = has(text, K.access);
    const safety = has(text, K.safety);
    const risk = clamp(0.25 + irreversible.length * 0.14 + blast.length * 0.12 + access.length * 0.16 + (amount && amount > budget ? 0.15 : 0) - safety.length * 0.12);
    const reversibility = clamp(0.75 - irreversible.length * 0.2 + safety.length * 0.15);
    const score = clamp(1 - risk * 0.7 - (1 - reversibility) * 0.3);
    const points = [
      irreversible.length ? T.irreversible(list(irreversible)) : T.reversible,
      blast.length ? T.blast(list(blast)) : T.contained,
      access.length ? T.access(list(access)) : T.noAccess,
      safety.length ? T.safety(list(safety)) : T.noSafety,
    ];
    const conditions = [...(!safety.length && irreversible.length ? [T.condStage] : []), ...(access.length ? [T.condCred] : [])];
    return { agent: "advocate", stance: stanceOf(score), score, criteria: { Risk: 1 - risk, Reversibility: reversibility }, points, conditions };
  });

  const optimizer = timed(() => {
    const upside = has(text, K.upside);
    const discount = Number(text.match(/(\d{1,2})\s?%\s?(?:discount|off|de descuento|descuento|הנחה)/i)?.[1] ?? 0);
    const ratio = amount ? amount / budget : 0;
    const budgetFit = amount === null ? 0.6 : ratio <= 0.25 ? 0.95 : ratio <= 1 ? 0.8 - ratio * 0.2 : clamp(0.55 - (ratio - 1) * 0.25);
    const roi = clamp(0.45 + upside.length * 0.12 - (discount > 20 ? 0.25 : discount > 10 ? 0.08 : 0));
    const score = clamp(budgetFit * 0.55 + roi * 0.45);
    const points = [
      amount === null ? T.noAmount : T.amount(fmt(amount), fmt(budget), (ratio * 100).toFixed(0)),
      upside.length ? T.upside(list(upside)) : T.noUpside,
      discount ? T.discount(discount, discount > 20 ? "floor" : discount > 10 ? "watch" : "ok") : T.noDiscount,
      ratio > 1 ? T.over : T.fits,
    ];
    const conditions = [...(ratio > 1 ? [T.condTranches(fmt(budget))] : []), ...(discount > 20 ? [T.condCap] : []), ...(!upside.length ? [T.condReturn] : [])];
    return { agent: "optimizer", stance: stanceOf(score), score, criteria: { ROI: roi, "Budget fit": budgetFit }, points, conditions };
  });

  const compliance = timed(() => {
    const data = has(text, K.data);
    const safeguards = has(text, K.safeguards);
    const finance = has(text, K.finance);
    const regulated = has(text, K.regulated);
    const veto = data.length > 0 && safeguards.length === 0;
    const overBudgetFinance = finance.length > 0 && amount !== null && amount > budget * 2;
    const score = veto ? 0.1 : clamp(0.82 - (overBudgetFinance ? 0.3 : 0) - (finance.length && !safeguards.length ? 0.08 : 0) + safeguards.length * 0.04);
    const points = [
      data.length ? T.data(list(data)) : T.noData,
      safeguards.length ? T.safeguards(list(safeguards)) : data.length ? T.blocking : T.noSafeguards,
      finance.length ? T.finance(list(finance)) : T.noFinance,
      regulated.length ? T.frameworks(list(regulated).toUpperCase()) : T.noFrameworks,
    ];
    const conditions = [...(veto ? [T.condConsent] : []), ...(finance.length ? [T.condHitl] : []), ...(overBudgetFinance ? [T.condSecond] : [])];
    return { agent: "compliance", stance: veto ? "veto" : stanceOf(score), score, criteria: { Compliance: score }, points, conditions };
  });

  const votes = [advocate, optimizer, compliance];
  const score = votes.reduce((s, v) => s + v.score * WEIGHTS[v.agent], 0);
  const verdict = compliance.stance === "veto" || score < 0.42 ? "rejected" : score >= 0.62 && !votes.some((v) => v.stance === "oppose") ? "approved" : "escalate";
  return { subject: p.subject, detail: p.detail, amountUsd: amount, verdict, score, votes, ms: performance.now() - t0 };
}

/** The rebuttal round: each agent answers the agent it disagrees with most. */
export function rebuttals(votes: BoardVote[], lang: Lang = "en") {
  const T = BOARD_TEXT[lang];
  return votes.map((v) => {
    const rival = votes.filter((o) => o !== v).sort((a, b) => Math.abs(b.score - v.score) - Math.abs(a.score - v.score))[0];
    const gap = Math.abs(rival.score - v.score);
    const them = T.agents[rival.agent].short;
    const lower = (c: string | undefined) => (c ? c.charAt(0).toLowerCase() + c.slice(1) : null);
    const line = gap < 0.12 ? T.aligned(them, (gap * 100).toFixed(0)) : v.score < rival.score ? T.overweight(them, lower(v.conditions[0])) : T.addressable(them, lower(rival.conditions[0]));
    return { agent: v.agent, line };
  });
}
