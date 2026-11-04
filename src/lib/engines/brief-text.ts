import type { EngineKey } from "@/components/bloom/command/engines";

/**
 * Server-side wording for a run in each language: the executive brief's headings, labels for the engines' output
 * fields, engine roles, and the live stage lines. Free of client imports so the orchestrator can use it.
 */
export type RunLang = "en" | "es" | "he";

type BriefText = {
  title: (name: string) => string;
  engineNo: (index: string) => string;
  simulation: string;
  summary: string;
  confidence: string;
  keyMetrics: string;
  metric: string;
  value: string;
  actions: string;
  requiresApproval: string;
  detail: string;
  total: (label: string) => string;
  architecture: string;
  human: string;
  priority: Record<string, string>;
  roles: Record<EngineKey, string>;
  fields: Record<string, string>;
  phases: {
    parse: (nodes: number, engine: string, reach: number) => string;
    route: (engine: string, model: string | null) => string;
    compose: string;
    parseStack: (nodes: number, engines: number, label: string) => string;
    stage: (i: number, n: number, engine: string, upstream: number) => string;
    composeStack: (label: string) => string;
  };
};

const EN: BriefText = {
  title: (name) => `${name} · Executive Brief`,
  engineNo: (i) => `Engine Nº ${i}`,
  simulation: "simulation",
  summary: "Summary",
  confidence: "Confidence",
  keyMetrics: "Key metrics",
  metric: "Metric",
  value: "Value",
  actions: "Actions",
  requiresApproval: "requires approval",
  detail: "Detail",
  total: (l) => `Total ${l.toLowerCase()}`,
  architecture: "Architecture",
  human: "human",
  priority: {},
  roles: {
    sovereign: "Master Command & Security",
    apex: "High-Value Acquisition & Closing",
    coreops: "Shadow Administration & Infrastructure",
    intentpulse: "Market Intelligence & Lead Radar",
    vanguard: "Outbound Pipeline & Prospecting",
    cortex: "Deal Closing & Objection Intelligence",
    shield: "Retention & Anti-Churn Defense",
    aether: "Dynamic Pricing & Monetization",
  },
  fields: {},
  phases: {
    parse: (nodes, engine, reach) => `Parsing intent · allocating ${nodes} agent nodes on ${engine}${reach ? ` with ${reach} licensed hand-off target${reach === 1 ? "" : "s"}` : ""}`,
    route: (engine, model) => `Routing through the ${engine} pipeline on ${model ?? "the simulation runtime"}`,
    compose: "Composing the executive brief",
    parseStack: (nodes, engines, label) => `Parsing intent · allocating ${nodes} agent nodes across ${engines} engines of ${label}`,
    stage: (i, n, engine, up) => `Stage ${i} of ${n}: ${engine}${up ? ` (with ${up} upstream result${up === 1 ? "" : "s"})` : ""}`,
    composeStack: (label) => `Composing the ${label} executive brief`,
  },
};

const ES: BriefText = {
  title: (name) => `${name} · Informe ejecutivo`,
  engineNo: (i) => `Motor Nº ${i}`,
  simulation: "simulación",
  summary: "Resumen",
  confidence: "Confianza",
  keyMetrics: "Métricas clave",
  metric: "Métrica",
  value: "Valor",
  actions: "Acciones",
  requiresApproval: "requiere aprobación",
  detail: "Detalle",
  total: (l) => `Total · ${l.toLowerCase()}`,
  architecture: "Arquitectura",
  human: "persona",
  priority: { critical: "crítica", high: "alta", medium: "media", low: "baja", p0: "p0", p1: "p1", p2: "p2" },
  roles: {
    sovereign: "Mando maestro y seguridad",
    apex: "Captación y cierre de alto valor",
    coreops: "Administración en la sombra e infraestructura",
    intentpulse: "Inteligencia de mercado y radar de leads",
    vanguard: "Pipeline outbound y prospección",
    cortex: "Cierre de acuerdos e inteligencia de objeciones",
    shield: "Retención y defensa contra la pérdida de clientes",
    aether: "Precios dinámicos y monetización",
  },
  fields: {
    account: "Cuenta", accounts: "Cuentas", action: "Acción", actions: "Acciones", acvUsd: "ACV", amountUsd: "Importe", arrAtRiskUsd: "ARR en riesgo", arrUsd: "ARR", author: "Autor", avgDiscountPct: "Descuento medio", battlecard: "Tarjeta de batalla", budgetK: "Presupuesto (miles)", budgetUsd: "Presupuesto", buyerAskDiscountPct: "Descuento pedido por el comprador", championIdentified: "Defensor identificado", channels: "Canales", command: "Orden", company: "Empresa", competitor: "Competidor", competitorPriceUsd: "Precio del competidor", confidence: "Confianza", currentPriceUsd: "Precio actual", dataSource: "Fuente de datos", daysInStage: "Días en la etapa", daysPastDue: "Días de retraso", daysSinceLastTouch: "Días desde el último contacto", deal: "Acuerdo", detail: "Detalle", employees: "Empleados", excerpt: "Extracto", expansion: "Expansión", expansionCandidates: "Candidatos a expansión", fitScore: "Puntuación de encaje", forecast: "Previsión", governance: "Gobierno", guardrails: "Límites", input: "Entrada", jobs: "Tareas", keywords: "Palabras clave", listPriceUsd: "Precio de lista", manual: "Manual", maxDiscountPct: "Descuento máximo", minutes: "Minutos", mode: "Modo", modules: "Módulos", name: "Nombre", negotiation: "Negociación", nextStep: "Siguiente paso", nps: "NPS", objections: "Objeciones", openTickets: "Tickets abiertos", ourStrengths: "Nuestras fortalezas", owner: "Responsable", params: "Parámetros", persona: "Perfil", pricing: "Precios", priorities: "Prioridades", priority: "Prioridad", proposal: "Propuesta", renewalInDays: "Renovación en días", requestedDiscountPct: "Descuento solicitado", risk: "Riesgo", routeTo: "Enviar a", routing: "Enrutamiento", runsPerMonth: "Ejecuciones al mes", schema: "Esquema", score: "Puntuación", seatPriceUsd: "Precio por licencia", seatUtilizationPct: "Uso de licencias", sequence: "Secuencia", shift: "Turno", signals: "Señales", source: "Fuente", stage: "Etapa", stakeholdersEngaged: "Interlocutores implicados", steps: "Pasos", summary: "Resumen", sync: "Sincronización", system: "Sistema", systems: "Sistemas", targetAcvUsd: "ACV objetivo", targets: "Objetivos", termMonths: "Plazo en meses", text: "Texto", tier: "Nivel", title: "Título", usageTrendPct: "Tendencia de uso", winRatePct: "Tasa de cierre", window: "Ventana", workflow: "Flujo de trabajo",
    pipelineUsd: "Pipeline", hoursSaved: "Horas ahorradas", savingsUsd: "Ahorro", revenueUsd: "Ingresos", valueUsd: "Valor", spendUsd: "Gasto", healthScore: "Puntuación de salud", intentScore: "Puntuación de intención", meetings: "Reuniones", replies: "Respuestas", nodes: "Nodos", records: "Registros", days: "Días", objectives: "Objetivos", allocation: "Asignación", approvals: "Aprobaciones", leads: "Leads", plan: "Plan", rationale: "Justificación", recommendation: "Recomendación",
  },
  phases: {
    parse: (nodes, engine, reach) => `Analizando la intención · asignando ${nodes} nodos de agentes en ${engine}${reach ? ` con ${reach} destino${reach === 1 ? "" : "s"} de traspaso con licencia` : ""}`,
    route: (engine, model) => `Enrutando por el pipeline de ${engine} en ${model ?? "el runtime de simulación"}`,
    compose: "Redactando el informe ejecutivo",
    parseStack: (nodes, engines, label) => `Analizando la intención · asignando ${nodes} nodos de agentes en ${engines} motores de ${label}`,
    stage: (i, n, engine, up) => `Etapa ${i} de ${n}: ${engine}${up ? ` (con ${up} resultado${up === 1 ? "" : "s"} previo${up === 1 ? "" : "s"})` : ""}`,
    composeStack: (label) => `Redactando el informe ejecutivo de ${label}`,
  },
};

const HE: BriefText = {
  title: (name) => `${name} · תדריך מנהלים`,
  engineNo: (i) => `מנוע מס׳ ${i}`,
  simulation: "סימולציה",
  summary: "סיכום",
  confidence: "רמת ביטחון",
  keyMetrics: "מדדים מרכזיים",
  metric: "מדד",
  value: "ערך",
  actions: "פעולות",
  requiresApproval: "דורש אישור",
  detail: "פירוט",
  total: (l) => `סה״כ · ${l}`,
  architecture: "ארכיטקטורה",
  human: "אדם",
  priority: { critical: "קריטית", high: "גבוהה", medium: "בינונית", low: "נמוכה", p0: "p0", p1: "p1", p2: "p2" },
  roles: {
    sovereign: "פיקוד עליון ואבטחה",
    apex: "רכישה וסגירה של עסקאות בשווי גבוה",
    coreops: "אדמיניסטרציה שקטה ותשתיות",
    intentpulse: "מודיעין שוק ומכ״ם לידים",
    vanguard: "צנרת פנייה יזומה ואיתור לקוחות",
    cortex: "סגירת עסקאות ומודיעין התנגדויות",
    shield: "שימור לקוחות והגנה מפני נטישה",
    aether: "תמחור דינמי ומונטיזציה",
  },
  fields: {
    account: "חשבון", accounts: "חשבונות", action: "פעולה", actions: "פעולות", acvUsd: "ACV", amountUsd: "סכום", arrAtRiskUsd: "ARR בסיכון", arrUsd: "ARR", author: "כותב", avgDiscountPct: "הנחה ממוצעת", battlecard: "כרטיס קרב", budgetK: "תקציב (באלפים)", budgetUsd: "תקציב", buyerAskDiscountPct: "ההנחה שהקונה ביקש", championIdentified: "אלוף שזוהה", channels: "ערוצים", command: "פקודה", company: "חברה", competitor: "מתחרה", competitorPriceUsd: "מחיר המתחרה", confidence: "רמת ביטחון", currentPriceUsd: "מחיר נוכחי", dataSource: "מקור נתונים", daysInStage: "ימים בשלב", daysPastDue: "ימי פיגור", daysSinceLastTouch: "ימים מהמגע האחרון", deal: "עסקה", detail: "פירוט", employees: "עובדים", excerpt: "קטע", expansion: "הרחבה", expansionCandidates: "מועמדים להרחבה", fitScore: "ציון התאמה", forecast: "תחזית", governance: "משילות", guardrails: "גבולות", input: "קלט", jobs: "משימות", keywords: "מילות מפתח", listPriceUsd: "מחיר מחירון", manual: "ידני", maxDiscountPct: "הנחה מרבית", minutes: "דקות", mode: "מצב", modules: "מודולים", name: "שם", negotiation: "משא ומתן", nextStep: "הצעד הבא", nps: "NPS", objections: "התנגדויות", openTickets: "פניות פתוחות", ourStrengths: "החוזקות שלנו", owner: "אחראי", params: "פרמטרים", persona: "פרסונה", pricing: "תמחור", priorities: "סדרי עדיפויות", priority: "עדיפות", proposal: "הצעה", renewalInDays: "חידוש בעוד ימים", requestedDiscountPct: "הנחה מבוקשת", risk: "סיכון", routeTo: "ניתוב אל", routing: "ניתוב", runsPerMonth: "הרצות בחודש", schema: "סכמה", score: "ציון", seatPriceUsd: "מחיר לרישיון", seatUtilizationPct: "ניצול רישיונות", sequence: "רצף", shift: "משמרת", signals: "אותות", source: "מקור", stage: "שלב", stakeholdersEngaged: "בעלי עניין מעורבים", steps: "שלבים", summary: "סיכום", sync: "סנכרון", system: "מערכת", systems: "מערכות", targetAcvUsd: "ACV יעד", targets: "יעדים", termMonths: "תקופה בחודשים", text: "טקסט", tier: "רמה", title: "כותרת", usageTrendPct: "מגמת שימוש", winRatePct: "שיעור זכייה", window: "חלון", workflow: "תהליך עבודה",
    pipelineUsd: "פייפליין", hoursSaved: "שעות שנחסכו", savingsUsd: "חיסכון", revenueUsd: "הכנסה", valueUsd: "ערך", spendUsd: "הוצאה", healthScore: "ציון בריאות", intentScore: "ציון כוונה", meetings: "פגישות", replies: "תשובות", nodes: "צמתים", records: "רשומות", days: "ימים", objectives: "מטרות", allocation: "הקצאה", approvals: "אישורים", leads: "לידים", plan: "תוכנית", rationale: "נימוק", recommendation: "המלצה",
  },
  phases: {
    parse: (nodes, engine, reach) => `מנתח את הכוונה · מקצה ${nodes} צמתי סוכנים ב־${engine}${reach ? ` עם ${reach} יעדי העברה ברישיון` : ""}`,
    route: (engine, model) => `מנתב דרך הפייפליין של ${engine} על ${model ?? "סביבת הסימולציה"}`,
    compose: "כותב את תדריך המנהלים",
    parseStack: (nodes, engines, label) => `מנתח את הכוונה · מקצה ${nodes} צמתי סוכנים ב־${engines} מנועים של ${label}`,
    stage: (i, n, engine, up) => `שלב ${i} מתוך ${n}: ${engine}${up ? ` (עם ${up} תוצאות קודמות)` : ""}`,
    composeStack: (label) => `כותב את תדריך המנהלים של ${label}`,
  },
};

export const BRIEF_TEXT: Record<RunLang, BriefText> = { en: EN, es: ES, he: HE };
