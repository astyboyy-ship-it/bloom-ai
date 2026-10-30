import type { Lang } from "../i18n";
import type { EngineKey } from "./engines";

/** What each engine does for an enterprise, in one sentence per language. */
export const UTILITY: Record<Lang, Record<EngineKey, string>> = {
  en: {
    sovereign: "Governs budgets, approvals and access for every engine, and routes each command to the engines that own it.",
    apex: "Moves live deals to signature: scores deal velocity, sets the negotiation envelope and writes tiered proposals.",
    coreops: "Keeps CRM, billing and project tools in sync and strips manual steps out of back-office workflows.",
    intentpulse: "Finds buyers describing your exact problem in public, scores their intent and routes the hottest in seconds.",
    vanguard: "Opens outbound pipeline: ranks in-market accounts by live triggers and runs multi-channel sequences.",
    cortex: "Finds where deals stall and arms closers with objection answers, battlecards and risk reads.",
    shield: "Spots accounts about to churn weeks early, runs the rescue play and flags the healthiest for expansion.",
    aether: "Finds what customers will really pay, polices discounts and prices the expansion that grows contract value.",
  },
  es: {
    sovereign: "Gobierna presupuestos, aprobaciones y accesos de todos los motores, y dirige cada orden al motor que la posee.",
    apex: "Lleva los acuerdos a la firma: mide su velocidad, fija el margen de negociación y redacta propuestas por niveles.",
    coreops: "Mantiene sincronizados CRM, facturación y herramientas de proyecto, y elimina pasos manuales del back-office.",
    intentpulse: "Encuentra compradores que describen tu problema en público, puntúa su intención y deriva a los más calientes en segundos.",
    vanguard: "Abre pipeline outbound: prioriza cuentas en mercado por disparadores reales y ejecuta secuencias multicanal.",
    cortex: "Detecta dónde se estancan los acuerdos y arma a los cerradores con respuestas, battlecards y lecturas de riesgo.",
    shield: "Detecta con semanas de antelación las cuentas a punto de irse, ejecuta el rescate y señala las más sanas para crecer.",
    aether: "Descubre cuánto pagarían de verdad tus clientes, controla los descuentos y pone precio a la expansión.",
  },
  he: {
    sovereign: "שולט בתקציבים, באישורים ובהרשאות של כל המנועים, ומנתב כל פקודה למנוע שאחראי עליה.",
    apex: "מוביל עסקאות חיות לחתימה: מודד את קצב העסקה, קובע את מעטפת המשא ומתן וכותב הצעות בשלוש רמות.",
    coreops: "שומר על סנכרון בין ה-CRM, החיוב וכלי ניהול הפרויקטים, ומסיר צעדים ידניים מתהליכי הבק-אופיס.",
    intentpulse: "מוצא קונים שמתארים בפומבי בדיוק את הבעיה שאתם פותרים, מדרג את כוונת הרכישה ומעביר את החמים ביותר תוך שניות.",
    vanguard: "פותח פייפליין יוצא: מדרג חשבונות לפי טריגרים חיים ומריץ רצפי פנייה בכמה ערוצים.",
    cortex: "מזהה איפה עסקאות נתקעות ומצייד את הסוגרים בתשובות להתנגדויות, כרטיסי קרב וקריאת סיכון.",
    shield: "מזהה שבועות מראש חשבונות שעומדים לעזוב, מריץ את תוכנית ההצלה ומסמן את הבריאים ביותר להרחבה.",
    aether: "מגלה כמה הלקוחות באמת מוכנים לשלם, אוכף את מדיניות ההנחות ומתמחר את ההרחבה שמגדילה את ערך החוזה.",
  },
};
