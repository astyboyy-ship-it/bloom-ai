import type { Lang } from "@/components/bloom/i18n";
import { useCommandCopy } from "@/components/bloom/command/locale";

/**
 * Copy for the desk's shared run surfaces (brief panel, run stepper, run console, engine drawer and lock, engine
 * console header). Spanish and Hebrew are typed against English, so a missing key fails the type-check.
 */
const en = {
  brief: {
    section: "Executive output",
    title: (name: string) => `Executive output · ${name}`,
    hitl: "Human-in-the-loop",
    awaiting: (n: number) => `${n} awaiting approval`,
    allDecided: "all decided",
    human: "Human",
    approved: "Approved",
    rejected: "Rejected",
    approve: "Approve",
    reject: "Reject",
    noApprove: "Your role can't approve actions",
    priority: { critical: "critical", high: "high", medium: "medium", low: "low" } as Record<string, string>,
  },
  steps: {
    progress: "Run progress",
    parse: "Parsing intent & allocating agent nodes",
    route: "Routing through the engine pipeline",
    compose: "Composing the executive output",
  },
  console: {
    kicker: (index: string) => `Run console · Engine Nº ${index}`,
    openInDesk: "Open in desk",
    close: "Close",
  },
  drawer: {
    kicker: (index: string, model: string) => `Architecture · Engine Nº ${index} · ${model}`,
    close: "Close",
    generated: "$ generated",
    hours: "Hours saved",
    pipeline: "Active pipeline",
    topology: (n: number) => `Live topology · ${n} agent nodes`,
    executing: (n: number) => `${n} jobs executing`,
    memory: "Active agent memory",
    noMemory: (n: number) => `No retained results yet. Each completed run adds one (retention: ${n}).`,
    queue: "Execution queue",
    resume: "Resume queue",
    pause: "Pause queue",
    statuses: { queued: "queued", running: "running", done: "done" } as Record<string, string>,
    note: "Live simulated workforce telemetry for this architecture.",
    command: (name: string) => `Command ${name}`,
    calibrate: "Calibrate",
    graph: "Agent memory graph",
  },
  lock: {
    locked: (name: string) => `${name} is locked`,
    kicker: (index: string) => `Tier lock · Engine Nº ${index}`,
    requires: (name: string, tier: string) => `${name} requires ${tier}`,
    unlock: "What you unlock",
    also: (names: string) => `Also unlocks ${names}`,
    upgrade: "Upgrade Architecture License",
    current: (tier: string) => `Current: ${tier}`,
  },
  engine: {
    openArchitecture: "Open architecture",
    consoleOf: (name: string) => `${name} console`,
    viewer: (name: string) => `${name} is a Viewer: running engines needs Operator or above.`,
  },
};

export type DeskUiCopy = typeof en;

const es: DeskUiCopy = {
  brief: {
    section: "Resultado ejecutivo",
    title: (name) => `Resultado ejecutivo · ${name}`,
    hitl: "Intervención humana",
    awaiting: (n) => `${n} pendiente${n === 1 ? "" : "s"} de aprobación`,
    allDecided: "todo decidido",
    human: "Persona",
    approved: "Aprobado",
    rejected: "Rechazado",
    approve: "Aprobar",
    reject: "Rechazar",
    noApprove: "Tu rol no puede aprobar acciones",
    priority: { critical: "crítica", high: "alta", medium: "media", low: "baja" },
  },
  steps: {
    progress: "Progreso de la ejecución",
    parse: "Analizando la intención y asignando nodos de agentes",
    route: "Enrutando por el pipeline de motores",
    compose: "Redactando el resultado ejecutivo",
  },
  console: {
    kicker: (index) => `Consola de ejecución · Motor Nº ${index}`,
    openInDesk: "Abrir en el escritorio",
    close: "Cerrar",
  },
  drawer: {
    kicker: (index, model) => `Arquitectura · Motor Nº ${index} · ${model}`,
    close: "Cerrar",
    generated: "$ generados",
    hours: "Horas ahorradas",
    pipeline: "Pipeline activo",
    topology: (n) => `Topología en vivo · ${n} nodos de agentes`,
    executing: (n) => `${n} tareas en ejecución`,
    memory: "Memoria activa de los agentes",
    noMemory: (n) => `Aún no hay resultados guardados. Cada ejecución completada añade uno (retención: ${n}).`,
    queue: "Cola de ejecución",
    resume: "Reanudar cola",
    pause: "Pausar cola",
    statuses: { queued: "en cola", running: "en curso", done: "hecha" },
    note: "Telemetría simulada en vivo de la fuerza de trabajo de esta arquitectura.",
    command: (name) => `Dar una orden a ${name}`,
    calibrate: "Calibrar",
    graph: "Grafo de memoria de los agentes",
  },
  lock: {
    locked: (name) => `${name} está bloqueado`,
    kicker: (index) => `Bloqueo por nivel · Motor Nº ${index}`,
    requires: (name, tier) => `${name} requiere ${tier}`,
    unlock: "Lo que desbloqueas",
    also: (names) => `También desbloquea ${names}`,
    upgrade: "Mejorar la licencia de arquitectura",
    current: (tier) => `Actual: ${tier}`,
  },
  engine: {
    openArchitecture: "Abrir arquitectura",
    consoleOf: (name) => `Consola de ${name}`,
    viewer: (name) => `${name} es Observador: ejecutar motores requiere Operador o superior.`,
  },
};

const he: DeskUiCopy = {
  brief: {
    section: "תוצר מנהלים",
    title: (name) => `תוצר מנהלים · ${name}`,
    hitl: "מעורבות אנושית",
    awaiting: (n) => (n === 1 ? "אחד ממתין לאישור" : `${n} ממתינים לאישור`),
    allDecided: "הכול הוחלט",
    human: "אדם",
    approved: "אושר",
    rejected: "נדחה",
    approve: "אישור",
    reject: "דחייה",
    noApprove: "לתפקיד שלכם אין הרשאה לאשר פעולות",
    priority: { critical: "קריטית", high: "גבוהה", medium: "בינונית", low: "נמוכה" },
  },
  steps: {
    progress: "התקדמות ההרצה",
    parse: "ניתוח הכוונה והקצאת צמתי סוכנים",
    route: "ניתוב דרך פייפליין המנועים",
    compose: "כתיבת תוצר המנהלים",
  },
  console: {
    kicker: (index) => `קונסולת הרצה · מנוע מס׳ ${index}`,
    openInDesk: "פתיחה בשולחן",
    close: "סגירה",
  },
  drawer: {
    kicker: (index, model) => `ארכיטקטורה · מנוע מס׳ ${index} · ${model}`,
    close: "סגירה",
    generated: "$ שנוצרו",
    hours: "שעות שנחסכו",
    pipeline: "פייפליין פעיל",
    topology: (n) => `טופולוגיה חיה · ${n} צמתי סוכנים`,
    executing: (n) => `${n} משימות רצות`,
    memory: "זיכרון הסוכנים הפעיל",
    noMemory: (n) => `עדיין אין תוצאות שמורות. כל הרצה שמושלמת מוסיפה אחת (שמירה: ${n}).`,
    queue: "תור הביצוע",
    resume: "חידוש התור",
    pause: "השהיית התור",
    statuses: { queued: "בתור", running: "רצה", done: "הושלמה" },
    note: "טלמטריה מדומה וחיה של כוח העבודה בארכיטקטורה הזו.",
    command: (name) => `פקודה ל־${name}`,
    calibrate: "כיול",
    graph: "גרף זיכרון הסוכנים",
  },
  lock: {
    locked: (name) => `${name} נעול`,
    kicker: (index) => `נעילה לפי רמה · מנוע מס׳ ${index}`,
    requires: (name, tier) => `${name} דורש ${tier}`,
    unlock: "מה נפתח לכם",
    also: (names) => `פותח גם את ${names}`,
    upgrade: "שדרוג רישיון הארכיטקטורה",
    current: (tier) => `נוכחי: ${tier}`,
  },
  engine: {
    openArchitecture: "פתיחת הארכיטקטורה",
    consoleOf: (name) => `הקונסולה של ${name}`,
    viewer: (name) => `${name} בתפקיד צופה: הרצת מנועים דורשת מפעיל ומעלה.`,
  },
};

export const DESK_UI: Record<Lang, DeskUiCopy> = { en, es, he };

export function useDeskUi() {
  const { lang } = useCommandCopy();
  return DESK_UI[lang];
}
