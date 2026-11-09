/**
 * Mock intelligence engine: a stub harness that simulates deep client research instantly (synchronous, no
 * network, no model). Nothing here is researched. Every result is marked `simulated: true`, and its `source`
 * says where it came from:
 *  - "preset"     team-entered data for a known target (Matrix Builders Group)
 *  - "simulated"  a deterministic 4-vector diagnostic generated from the target's name, so the same name always
 *                 gives the same diagnostic
 * Low-data mode drops the confidence and returns five refinement questions; answering them sharpens the
 * diagnostic and restores the confidence.
 */

export type ResearchLang = "en" | "es" | "he";
type Engine = "sovereign" | "apex" | "coreops" | "intentpulse" | "vanguard" | "cortex" | "shield" | "aether";

export interface ResearchVector {
  id: string;
  title: string;
  detail: string;
  /** The headline figure, e.g. "18.4% margin leakage". */
  metric: string;
  severity: "high" | "medium";
  /** The BLOOM engine that answers it. */
  engine: Engine;
}

export interface RefinementQuestion {
  id: "model" | "team" | "hours" | "bottleneck" | "systems";
  question: string;
  options: { id: string; label: string }[];
}

export interface ResearchResult {
  target: string;
  /** Always true: this engine simulates research, it never performs it. */
  simulated: true;
  source: "preset" | "simulated";
  /** Simulated confidence, 0–100. */
  confidence: number;
  lowConfidence: boolean;
  location: string;
  niche: string;
  vectors: ResearchVector[];
  /** Present in low-data mode until every question is answered. */
  refinement: RefinementQuestion[];
  elapsedMs: 0;
}

export type ResearchOptions = { lang?: ResearchLang; lowData?: boolean; answers?: Partial<Record<RefinementQuestion["id"], string>> };

/* ----------------------------------------------------------------------------------------------- preset */

const MATRIX = /\bmatrix\s+builders?(\s+group)?\b/i;

const PRESET: Record<ResearchLang, { niche: string; vectors: Omit<ResearchVector, "id" | "engine" | "severity">[] }> = {
  en: {
    niche: "Commercial Wall & Structural Concrete Systems",
    vectors: [
      { title: "Subcontractor schedule drift", detail: "Crew handoffs slip against the master schedule, and the overrun lands on fixed-bid margins.", metric: "18.4% margin leakage" },
      { title: "Procurement delay on specialty aggregate", detail: "Specialty aggregate orders wait on manual supplier quotes, holding pours on critical-path walls.", metric: "Pours held on critical path" },
      { title: "Paper field log latency", detail: "Daily field logs travel on paper before billing can start, stretching the invoice cycle.", metric: "22-day invoice delay" },
    ],
  },
  es: {
    niche: "Sistemas comerciales de muros y hormigón estructural",
    vectors: [
      { title: "Desvío del calendario de subcontratistas", detail: "Los relevos de cuadrillas se retrasan frente al calendario maestro y el sobrecoste recae en márgenes de precio cerrado.", metric: "18,4 % de fuga de margen" },
      { title: "Retraso en la compra de árido especial", detail: "Los pedidos de árido especial esperan cotizaciones manuales de proveedores y frenan vertidos en muros de ruta crítica.", metric: "Vertidos detenidos en ruta crítica" },
      { title: "Latencia de partes de obra en papel", detail: "Los partes diarios de obra circulan en papel antes de poder facturar, lo que alarga el ciclo de facturación.", metric: "22 días de retraso en facturas" },
    ],
  },
  he: {
    niche: "מערכות קירות מסחריים ובטון מבני",
    vectors: [
      { title: "סטיית לוח הזמנים של קבלני המשנה", detail: "החלפות צוותים מתעכבות מול לוח הזמנים הראשי, והחריגה נופלת על מרווחי מחיר קבוע.", metric: "18.4% זליגת מרווח" },
      { title: "עיכוב ברכש אגרגט מיוחד", detail: "הזמנות אגרגט מיוחד ממתינות להצעות מחיר ידניות מספקים ומעכבות יציקות בקירות בנתיב הקריטי.", metric: "יציקות מעוכבות בנתיב הקריטי" },
      { title: "השהיית יומני שטח בנייר", detail: "יומני השטח היומיים עוברים בנייר לפני שאפשר לחייב, וזה מאריך את מחזור החשבוניות.", metric: "22 ימי עיכוב בחשבוניות" },
    ],
  },
};
const PRESET_ENGINES: Engine[] = ["sovereign", "coreops", "aether"];

/* -------------------------------------------------------------------------------------------- simulated */

type Category = "construction" | "health" | "finance" | "retail" | "software" | "logistics" | "media" | "operations";

const CATEGORY_HINTS: [Category, RegExp][] = [
  ["construction", /build|construct|concrete|steel|contract|roof|paving|homes?\b|structur/i],
  ["health", /health|clinic|medical|care|pharma|dental|bio/i],
  ["finance", /capital|bank|financ|invest|fund|insur|credit|pay/i],
  ["retail", /retail|store|shop|market|goods|apparel|brand/i],
  ["software", /soft|tech|labs?\b|data|cloud|ai\b|systems|digital/i],
  ["logistics", /freight|logistic|transport|ship|fleet|cargo|supply/i],
  ["media", /media|studio|music|records|film|creative|games?/i],
];

const NICHES: Record<ResearchLang, Record<Category, string>> = {
  en: { construction: "Commercial construction", health: "Healthcare services", finance: "Financial services", retail: "Retail & e-commerce", software: "B2B software", logistics: "Freight & logistics", media: "Media & entertainment", operations: "Multi-site operations" },
  es: { construction: "Construcción comercial", health: "Servicios de salud", finance: "Servicios financieros", retail: "Retail y e-commerce", software: "Software B2B", logistics: "Transporte y logística", media: "Medios y entretenimiento", operations: "Operaciones multisede" },
  he: { construction: "בנייה מסחרית", health: "שירותי בריאות", finance: "שירותים פיננסיים", retail: "קמעונאות ומסחר מקוון", software: "תוכנה לעסקים", logistics: "הובלה ולוגיסטיקה", media: "מדיה ובידור", operations: "תפעול רב־אתרי" },
};

const CITIES = ["Austin, TX", "Denver, CO", "Charlotte, NC", "Phoenix, AZ", "Columbus, OH", "Nashville, TN", "Salt Lake City, UT", "Raleigh, NC", "Tampa, FL", "Minneapolis, MN"];

type VectorTemplate = { engine: Engine; title: string; detail: string; metric: (n: number) => string };
const POOL: Record<ResearchLang, VectorTemplate[]> = {
  en: [
    { engine: "coreops", title: "Manual back-office reconciliation", detail: "Finance and ops re-key the same records across systems every week.", metric: (n) => `${n} hrs/week of re-keying` },
    { engine: "apex", title: "Quote-to-close drag", detail: "Proposals wait on approvals and pricing checks before they reach the buyer.", metric: (n) => `${n}-day average sales cycle` },
    { engine: "intentpulse", title: "Untracked buying signals", detail: "Inbound intent goes unscored, so warm accounts cool before anyone calls.", metric: (n) => `${n}% of warm leads uncontacted` },
    { engine: "sovereign", title: "Approval bottlenecks", detail: "Spend and policy decisions queue on a few executives.", metric: (n) => `${n} decisions waiting per week` },
    { engine: "shield", title: "Compliance exposure", detail: "Customer data moves through tools without consistent controls or audit trails.", metric: (n) => `${n} unaudited data flows` },
    { engine: "cortex", title: "Scattered operating data", detail: "KPIs live in spreadsheets that disagree, so planning runs on stale numbers.", metric: (n) => `${n} disconnected sources` },
    { engine: "aether", title: "Field-to-office latency", detail: "Work done in the field reaches the office days later, delaying billing.", metric: (n) => `${n}-day billing lag` },
    { engine: "vanguard", title: "Thin outbound pipeline", detail: "Outbound depends on a few reps, so pipeline swings with their calendars.", metric: (n) => `${n}% pipeline variance` },
  ],
  es: [
    { engine: "coreops", title: "Conciliación manual de back office", detail: "Finanzas y operaciones vuelven a teclear los mismos registros en varios sistemas cada semana.", metric: (n) => `${n} h/semana de recaptura` },
    { engine: "apex", title: "Lentitud de la oferta al cierre", detail: "Las propuestas esperan aprobaciones y revisiones de precio antes de llegar al comprador.", metric: (n) => `ciclo de venta medio de ${n} días` },
    { engine: "intentpulse", title: "Señales de compra sin seguimiento", detail: "La intención entrante no se puntúa y las cuentas tibias se enfrían antes de que alguien llame.", metric: (n) => `${n} % de leads tibios sin contactar` },
    { engine: "sovereign", title: "Cuellos de botella en aprobaciones", detail: "Las decisiones de gasto y política se acumulan en pocos directivos.", metric: (n) => `${n} decisiones en espera por semana` },
    { engine: "shield", title: "Exposición de cumplimiento", detail: "Los datos de clientes circulan por herramientas sin controles ni trazas de auditoría coherentes.", metric: (n) => `${n} flujos de datos sin auditar` },
    { engine: "cortex", title: "Datos operativos dispersos", detail: "Los KPI viven en hojas de cálculo que no coinciden, así que se planifica con cifras desfasadas.", metric: (n) => `${n} fuentes desconectadas` },
    { engine: "aether", title: "Latencia del campo a la oficina", detail: "El trabajo hecho en campo llega a la oficina días después y retrasa la facturación.", metric: (n) => `${n} días de retraso en facturación` },
    { engine: "vanguard", title: "Pipeline saliente escaso", detail: "La prospección depende de pocos comerciales y el pipeline oscila con sus agendas.", metric: (n) => `${n} % de variación del pipeline` },
  ],
  he: [
    { engine: "coreops", title: "התאמות ידניות בבק־אופיס", detail: "הכספים והתפעול מקלידים מחדש את אותן רשומות במערכות שונות בכל שבוע.", metric: (n) => `${n} שעות הקלדה חוזרת בשבוע` },
    { engine: "apex", title: "גרירה מהצעה לסגירה", detail: "הצעות ממתינות לאישורים ולבדיקות מחיר לפני שהן מגיעות לקונה.", metric: (n) => `מחזור מכירה ממוצע של ${n} ימים` },
    { engine: "intentpulse", title: "אותות רכישה שלא נעקבים", detail: "כוונה נכנסת לא מדורגת, ולקוחות חמים מתקררים לפני שמישהו מתקשר.", metric: (n) => `${n}% מהלידים החמים ללא פנייה` },
    { engine: "sovereign", title: "צווארי בקבוק באישורים", detail: "החלטות הוצאה ומדיניות נערמות אצל מעט מנהלים.", metric: (n) => `${n} החלטות ממתינות בשבוע` },
    { engine: "shield", title: "חשיפה רגולטורית", detail: "נתוני לקוחות עוברים בין כלים בלי בקרות ושובלי ביקורת אחידים.", metric: (n) => `${n} זרימות נתונים ללא ביקורת` },
    { engine: "cortex", title: "נתונים תפעוליים מפוזרים", detail: "מדדי הביצוע יושבים בגיליונות שלא מסכימים זה עם זה, והתכנון רץ על מספרים מיושנים.", metric: (n) => `${n} מקורות מנותקים` },
    { engine: "aether", title: "השהיה בין השטח למשרד", detail: "עבודה שנעשית בשטח מגיעה למשרד ימים אחר כך ומעכבת חיוב.", metric: (n) => `${n} ימי פיגור בחיוב` },
    { engine: "vanguard", title: "צנרת יוצאת דלה", detail: "הפנייה היזומה תלויה במעט אנשי מכירות, והצנרת משתנה לפי היומנים שלהם.", metric: (n) => `${n}% תנודתיות בצנרת` },
  ],
};

/** Each answer to the bottleneck question points at one template, which then leads the diagnostic. */
const BOTTLENECK_TEMPLATE: Record<string, number> = { backoffice: 0, sales: 1, leads: 2, approvals: 3, compliance: 4, data: 5 };

const QUESTIONS: Record<ResearchLang, RefinementQuestion[]> = {
  en: [
    { id: "model", question: "How does the company mainly earn revenue?", options: [{ id: "project", label: "Project / contract work" }, { id: "recurring", label: "Recurring subscriptions" }, { id: "transactional", label: "Transactional sales" }] },
    { id: "team", question: "How many people work there?", options: [{ id: "s", label: "Under 50" }, { id: "m", label: "50–250" }, { id: "l", label: "Over 250" }] },
    { id: "hours", question: "Roughly how many hours a week go to manual operations?", options: [{ id: "low", label: "Under 20" }, { id: "mid", label: "20–80" }, { id: "high", label: "Over 80" }] },
    { id: "bottleneck", question: "Where does work slow down most?", options: [{ id: "backoffice", label: "Back office" }, { id: "sales", label: "Closing deals" }, { id: "leads", label: "Finding leads" }, { id: "approvals", label: "Approvals" }, { id: "compliance", label: "Compliance" }, { id: "data", label: "Reporting & data" }] },
    { id: "systems", question: "What do they run operations on today?", options: [{ id: "spreadsheets", label: "Spreadsheets & email" }, { id: "erp", label: "An ERP or CRM" }, { id: "mixed", label: "A mix of tools" }] },
  ],
  es: [
    { id: "model", question: "¿Cómo genera la empresa la mayor parte de sus ingresos?", options: [{ id: "project", label: "Proyectos / contratos" }, { id: "recurring", label: "Suscripciones recurrentes" }, { id: "transactional", label: "Ventas transaccionales" }] },
    { id: "team", question: "¿Cuántas personas trabajan allí?", options: [{ id: "s", label: "Menos de 50" }, { id: "m", label: "50–250" }, { id: "l", label: "Más de 250" }] },
    { id: "hours", question: "¿Cuántas horas semanales se dedican, aproximadamente, a operaciones manuales?", options: [{ id: "low", label: "Menos de 20" }, { id: "mid", label: "20–80" }, { id: "high", label: "Más de 80" }] },
    { id: "bottleneck", question: "¿Dónde se frena más el trabajo?", options: [{ id: "backoffice", label: "Back office" }, { id: "sales", label: "Cierre de acuerdos" }, { id: "leads", label: "Captación de leads" }, { id: "approvals", label: "Aprobaciones" }, { id: "compliance", label: "Cumplimiento" }, { id: "data", label: "Informes y datos" }] },
    { id: "systems", question: "¿Con qué gestionan hoy las operaciones?", options: [{ id: "spreadsheets", label: "Hojas de cálculo y correo" }, { id: "erp", label: "Un ERP o CRM" }, { id: "mixed", label: "Varias herramientas" }] },
  ],
  he: [
    { id: "model", question: "ממה החברה מרוויחה בעיקר?", options: [{ id: "project", label: "פרויקטים / חוזים" }, { id: "recurring", label: "מנויים חוזרים" }, { id: "transactional", label: "מכירות בודדות" }] },
    { id: "team", question: "כמה אנשים עובדים שם?", options: [{ id: "s", label: "פחות מ־50" }, { id: "m", label: "50–250" }, { id: "l", label: "יותר מ־250" }] },
    { id: "hours", question: "בערך כמה שעות בשבוע הולכות על תפעול ידני?", options: [{ id: "low", label: "פחות מ־20" }, { id: "mid", label: "20–80" }, { id: "high", label: "יותר מ־80" }] },
    { id: "bottleneck", question: "איפה העבודה מאטה הכי הרבה?", options: [{ id: "backoffice", label: "בק־אופיס" }, { id: "sales", label: "סגירת עסקאות" }, { id: "leads", label: "מציאת לידים" }, { id: "approvals", label: "אישורים" }, { id: "compliance", label: "ציות" }, { id: "data", label: "דיווח ונתונים" }] },
    { id: "systems", question: "על מה מנהלים היום את התפעול?", options: [{ id: "spreadsheets", label: "גיליונות ואימייל" }, { id: "erp", label: "מערכת ERP או CRM" }, { id: "mixed", label: "שילוב כלים" }] },
  ],
};

/** FNV-1a: the same target always yields the same simulated diagnostic. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

const SIMULATED_CONFIDENCE = 96.8;
const LOW_CONFIDENCE = 41.5;

/** Simulates research on a target, synchronously. See the module comment: nothing is looked up. */
export function researchTarget(rawTarget: string, opts: ResearchOptions = {}): ResearchResult {
  const lang = opts.lang ?? "en";
  const target = rawTarget.trim().slice(0, 120) || "—";
  const answers = opts.answers ?? {};
  const answered = QUESTIONS[lang].every((q) => answers[q.id]);
  const low = Boolean(opts.lowData) && !answered;

  if (MATRIX.test(target)) {
    const p = PRESET[lang];
    return {
      target,
      simulated: true,
      source: "preset",
      confidence: low ? LOW_CONFIDENCE : 99.1,
      lowConfidence: low,
      location: "Austin, TX",
      niche: p.niche,
      vectors: p.vectors.map((v, i) => ({ ...v, id: `preset-${i}`, engine: PRESET_ENGINES[i], severity: i === 0 || i === 2 ? "high" : "medium" })),
      refinement: low ? QUESTIONS[lang] : [],
      elapsedMs: 0,
    };
  }

  const h = hash(target.toLowerCase());
  const category = CATEGORY_HINTS.find(([, re]) => re.test(target))?.[0] ?? "operations";
  const pool = POOL[lang];
  // Four distinct templates, picked from the hash; a bottleneck answer moves its template to the front.
  const order = pool.map((_, i) => i).sort((a, b) => ((h >>> (a * 3)) % 97) - ((h >>> (b * 3)) % 97));
  const lead = answers.bottleneck !== undefined ? BOTTLENECK_TEMPLATE[answers.bottleneck] : undefined;
  const picked = (lead !== undefined ? [lead, ...order.filter((i) => i !== lead)] : order).slice(0, low ? 2 : 4);
  const scale = answers.hours === "high" ? 1.6 : answers.hours === "low" ? 0.6 : 1;
  const figure = (i: number) => Math.max(2, Math.round((8 + ((h >>> (i * 4)) % 40)) * scale));

  return {
    target,
    simulated: true,
    source: "simulated",
    confidence: low ? LOW_CONFIDENCE : SIMULATED_CONFIDENCE,
    lowConfidence: low,
    location: CITIES[h % CITIES.length],
    niche: NICHES[lang][category],
    vectors: picked.map((t, i) => {
      const v = pool[t];
      return { id: `sim-${t}`, title: v.title, detail: v.detail, metric: v.metric(figure(i)), engine: v.engine, severity: i < 2 ? "high" : "medium" };
    }),
    refinement: low ? QUESTIONS[lang] : [],
    elapsedMs: 0,
  };
}
