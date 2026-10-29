"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "es" | "he";

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "EN", native: "English" },
  { code: "es", label: "ES", native: "Español" },
  { code: "he", label: "HE", native: "עברית" },
];

const en = {
  nav: {
    engines: "Engines",
    partners: "Developers",
    architectures: "Architectures",
    shifts: "Shifts",
    waitlist: "Early Access",
    cta: "Enter Command Center",
    language: "Language",
  },
  hero: {
    status: "In active development",
    badge: "The Bloom AI Lab · 8 specialized engines",
    titlePre: "Category-Defining ",
    titleAccent: "Autonomous Engines",
    titlePost: " for Creators, Founders, and High-End Enterprises.",
    sub: "Bloom AI is an elite technology lab and incubator. We build and launch category-defining, zero-overhead standalone apps that are aware: each one perceives its environment, reasons, and decides on its own, 24/7, without your intervention.",
    ctaPrimary: "Deploy Your Shadow Workforce",
    ctaSecondary: "Explore the Apps",
  },
  engines: {
    eyebrow: "From the Bloom AI Lab",
    titlePre: "8 Specialized Engines. ",
    titleAccent: "Pre-Engineered Enterprise Architecture.",
    description:
      "Bloom AI is a technology lab and incubator. Each engine is its own category-defining app, built on Dynamic Awareness: no templates, no hardcoded rules, nothing for you to configure. It perceives, reasons, and builds its own execution path. All eight are in active development, building toward 100% autonomy.",
    badgePre: "With More Game-Changing Engines & Services To Come ",
    badgeAccent: "That Will Bloom Your Business",
    devBanner: "All engines in active development · building toward 100% autonomy",
  },
  shifts: {
    eyebrow: "Dynamic Shift Topology",
    titlePre: "One engine. Three shifts. ",
    titleAccent: "Zero downtime.",
    description: "Bloom never clocks out. The Dynamic Shift Topology Engine moves compute between your engines around the clock: closing hard while your market is awake, mining and cleaning while it sleeps, and surging the moment a high-value signal lands.",
    liveNow: "Live in your timezone now",
    eventDriven: "Event-driven",
    preview: "Bloom switches shifts automatically. Select one to preview its allocation.",
    nodes: "compute nodes",
    allocation: "Live node allocation",
    running: "Running in this shift",
    trigger: "Trigger",
    modes: {
      prime: {
        name: "Prime Market Shift",
        trigger: "Peak regional business hours",
        body: "High-velocity deal orchestration while your buyers are online.",
        ops: ["Real-time lead qualification", "Live deal orchestration across Apex and Cortex", "Active objection handling on open conversations", "Same-hour hand-offs to your closers"],
      },
      dark: {
        name: "Dark Market Shift",
        trigger: "Off-peak hours, every region",
        body: "The quiet hours do the heavy lifting, so mornings start clean.",
        ops: ["Continuous vector DB ingestion", "Intent signal mining across channels", "Cross-border lead scoring", "Pipeline hygiene and CRM clean-up"],
      },
      surge: {
        name: "Surge Shift",
        trigger: "Inbound signal spike or off-hours high-ACV lead",
        body: "Event-driven compute scaling the instant demand spikes.",
        ops: ["Compute scaled up automatically", "High-ACV leads answered within seconds, any hour", "Extra closing capacity on the spike", "Scales back down when the wave passes"],
      },
    },
  },
  architectures: {
    eyebrow: "Enterprise architectures",
    titlePre: "Ten architectures. ",
    titleAccent: "Deployed for you.",
    description: "Pre-packaged combinations of Bloom engines, wired together and deployed by our team: a one-time setup that seeds your data, wires your CRM and locks in an SLA, then a monthly retainer for the platform compute that runs it 24/7.",
  },
  partner: {
    eyebrow: "For indie developers & technical founders",
    titlePre: "The Bloom ",
    titleAccent: "Demo Creator Suite",
    subtitle: "A low-cost sandbox portal: spin up branded client demos in seconds and close $3k–$5k retainers without writing backend code.",
    cta: "Launch Demo Creator Suite",
  },
  waitlist: {
    eyebrow: "Early access",
    titlePre: "Your business, ",
    titleAccent: "in full bloom.",
    description:
      "Bloom AI opens each app to a limited first cohort of creators, founders, and enterprises. Pick the engine you want and be first in line when it launches.",
    submit: "Claim Early Access",
    trackUpdates: "Track Development Updates",
  },
  core: {
    eyebrow: "Bloom's core architecture",
    titlePre: "Not automation. ",
    titleAccent: "Dynamic Awareness.",
    body: "None of our engines run on static templates or hardcoded rules. Each one perceives its environment in real time, diagnoses the context on its own, and decides what to do next, with no human configuration.",
    step: "Step",
    loop: [
      { title: "Real-Time Environmental Perception", body: "Every engine continuously senses live data from its environment: markets, inboxes, systems, and buyer behavior." },
      { title: "Context Auto-Diagnosis", body: "It reasons about what that data means right now for your business, your floors, and your goals." },
      { title: "Autonomous Decision-Making", body: "It constructs its own execution path, acts on it, and adapts the moment the situation changes." },
    ],
    loops: "Then it loops, continuously, 24/7.",
    difference: "The difference",
    colTemplate: "Template automation",
    colAware: "Bloom aware engines",
    contrast: [
      { template: "You design the workflow", aware: "The engine designs its own path" },
      { template: "Static templates and hardcoded rules", aware: "Dynamic reasoning over live data" },
      { template: "Breaks when conditions change", aware: "Re-diagnoses and adapts in real time" },
      { template: "Needs a human to configure and maintain", aware: "Zero configuration, self-maintaining" },
    ],
    closingLead: "You never build or configure a workflow.",
    closing: " You tell an engine what matters (your goals, your limits, your voice), and it is aware enough to build and run everything else itself.",
  },
  engineCard: {
    index: "Engine Nº",
    status: "In active development",
    autonomous: "autonomous",
    command: "Enter Command Center",
    enter: "Enter the engine",
  },
};

export type Dictionary = typeof en;

const es: Dictionary = {
  nav: {
    engines: "Motores",
    partners: "Desarrolladores",
    architectures: "Arquitecturas",
    shifts: "Turnos",
    waitlist: "Acceso anticipado",
    cta: "Entrar al Centro de Mando",
    language: "Idioma",
  },
  hero: {
    status: "En desarrollo activo",
    badge: "Bloom AI Lab · 8 motores especializados",
    titlePre: "",
    titleAccent: "Motores autónomos",
    titlePost: " que definen categorías para creadores, fundadores y empresas de alto nivel.",
    sub: "Bloom AI es un laboratorio e incubadora tecnológica de élite. Creamos y lanzamos apps independientes que definen su categoría, sin costes operativos, y que son conscientes: cada una percibe su entorno, razona y decide por sí misma, 24/7, sin tu intervención.",
    ctaPrimary: "Despliega tu fuerza de trabajo en la sombra",
    ctaSecondary: "Explorar las apps",
  },
  engines: {
    eyebrow: "Desde el laboratorio Bloom AI",
    titlePre: "8 motores especializados. ",
    titleAccent: "Arquitectura empresarial preingenierizada.",
    description:
      "Bloom AI es un laboratorio e incubadora tecnológica. Cada motor es su propia app, construida sobre conciencia dinámica: sin plantillas, sin reglas fijas, nada que configurar. Percibe, razona y construye su propio camino de ejecución. Los ocho están en desarrollo activo, rumbo al 100% de autonomía.",
    badgePre: "Vienen más motores y servicios revolucionarios ",
    badgeAccent: "que harán florecer tu negocio",
    devBanner: "Todos los motores en desarrollo activo · rumbo al 100% de autonomía",
  },
  shifts: {
    eyebrow: "Topología dinámica de turnos",
    titlePre: "Un motor. Tres turnos. ",
    titleAccent: "Cero interrupciones.",
    description: "Bloom nunca ficha la salida. El motor de topología dinámica de turnos mueve capacidad de cómputo entre tus motores a todas horas: cierra con fuerza mientras tu mercado está despierto, extrae y limpia mientras duerme, y se dispara en cuanto llega una señal de alto valor.",
    liveNow: "Activo ahora en tu zona horaria",
    eventDriven: "Por eventos",
    preview: "Bloom cambia de turno automáticamente. Elige uno para ver su asignación.",
    nodes: "nodos de cómputo",
    allocation: "Asignación de nodos en vivo",
    running: "En marcha en este turno",
    trigger: "Activador",
    modes: {
      prime: {
        name: "Turno de mercado activo",
        trigger: "Horario comercial punta de cada región",
        body: "Orquestación de acuerdos a alta velocidad mientras tus compradores están conectados.",
        ops: ["Cualificación de leads en tiempo real", "Orquestación de acuerdos en vivo entre Apex y Cortex", "Gestión activa de objeciones en conversaciones abiertas", "Traspasos a tus closers en la misma hora"],
      },
      dark: {
        name: "Turno de mercado inactivo",
        trigger: "Horas valle, en todas las regiones",
        body: "Las horas tranquilas hacen el trabajo pesado para que las mañanas empiecen limpias.",
        ops: ["Ingesta continua en la base vectorial", "Extracción de señales de intención en todos los canales", "Puntuación de leads entre países", "Higiene del pipeline y limpieza del CRM"],
      },
      surge: {
        name: "Turno de pico",
        trigger: "Pico de señales entrantes o lead de alto ACV fuera de horario",
        body: "Escalado de cómputo por eventos en el instante en que se dispara la demanda.",
        ops: ["Cómputo escalado automáticamente", "Leads de alto ACV respondidos en segundos, a cualquier hora", "Capacidad extra de cierre durante el pico", "Vuelve a reducirse cuando pasa la ola"],
      },
    },
  },
  architectures: {
    eyebrow: "Arquitecturas empresariales",
    titlePre: "Diez arquitecturas. ",
    titleAccent: "Desplegadas para ti.",
    description: "Combinaciones de motores Bloom listas para usar, conectadas y desplegadas por nuestro equipo: una puesta en marcha única que carga tus datos, conecta tu CRM y fija un SLA, y después un retainer mensual por la capacidad de cómputo que lo ejecuta 24/7.",
  },
  partner: {
    eyebrow: "Para desarrolladores independientes y fundadores técnicos",
    titlePre: "La ",
    titleAccent: "Demo Creator Suite de Bloom",
    subtitle: "Un portal sandbox de bajo coste: crea demos con la marca de tu cliente en segundos y cierra retainers de $3k–$5k sin escribir código backend.",
    cta: "Abrir la Demo Creator Suite",
  },
  waitlist: {
    eyebrow: "Acceso anticipado",
    titlePre: "Tu negocio, ",
    titleAccent: "en plena floración.",
    description:
      "Bloom AI abre cada app a un primer grupo limitado de creadores, fundadores y empresas. Elige el motor que quieres y sé de los primeros cuando se lance.",
    submit: "Solicitar acceso anticipado",
    trackUpdates: "Seguir el desarrollo",
  },
  core: {
    eyebrow: "La arquitectura central de Bloom",
    titlePre: "No es automatización. ",
    titleAccent: "Es conciencia dinámica.",
    body: "Ninguno de nuestros motores funciona con plantillas estáticas ni reglas fijas. Cada uno percibe su entorno en tiempo real, diagnostica el contexto por sí mismo y decide qué hacer a continuación, sin configuración humana.",
    step: "Paso",
    loop: [
      { title: "Percepción del entorno en tiempo real", body: "Cada motor capta de forma continua datos en vivo de su entorno: mercados, bandejas de entrada, sistemas y comportamiento de compra." },
      { title: "Autodiagnóstico del contexto", body: "Razona qué significan esos datos ahora mismo para tu negocio, tus mínimos y tus objetivos." },
      { title: "Toma de decisiones autónoma", body: "Construye su propio camino de ejecución, actúa y se adapta en cuanto cambia la situación." },
    ],
    loops: "Y vuelve a empezar, sin parar, 24/7.",
    difference: "La diferencia",
    colTemplate: "Automatización por plantillas",
    colAware: "Motores conscientes de Bloom",
    contrast: [
      { template: "Tú diseñas el flujo de trabajo", aware: "El motor diseña su propio camino" },
      { template: "Plantillas estáticas y reglas fijas", aware: "Razonamiento dinámico sobre datos en vivo" },
      { template: "Se rompe cuando cambian las condiciones", aware: "Se rediagnostica y se adapta en tiempo real" },
      { template: "Necesita a una persona que lo configure y mantenga", aware: "Cero configuración, se mantiene solo" },
    ],
    closingLead: "Nunca construyes ni configuras un flujo de trabajo.",
    closing: " Le dices al motor qué importa (tus objetivos, tus límites, tu voz) y es lo bastante consciente para construir y ejecutar todo lo demás por sí mismo.",
  },
  engineCard: {
    index: "Motor Nº",
    status: "En desarrollo activo",
    autonomous: "autónomo",
    command: "Entrar al Centro de Mando",
    enter: "Entrar al motor",
  },
};

const he: Dictionary = {
  nav: {
    engines: "המנועים",
    partners: "מפתחים",
    architectures: "ארכיטקטורות",
    shifts: "משמרות",
    waitlist: "גישה מוקדמת",
    cta: "כניסה למרכז הפיקוד",
    language: "שפה",
  },
  hero: {
    status: "בפיתוח פעיל",
    badge: "מעבדת Bloom AI · ‏8 מנועים מתמחים",
    titlePre: "",
    titleAccent: "מנועים אוטונומיים",
    titlePost: " שמגדירים קטגוריה, ליוצרים, למייסדים ולארגונים מהשורה הראשונה.",
    sub: "Bloom AI היא מעבדה ואינקובטור טכנולוגי מוביל. אנחנו בונים ומשיקים אפליקציות עצמאיות שמגדירות קטגוריה, בלי תקורה תפעולית, והן מודעות: כל אחת קולטת את הסביבה שלה, מנתחת ומחליטה בעצמה, 24/7, בלי שתצטרכו להתערב.",
    ctaPrimary: "הפעילו את כוח העבודה השקט שלכם",
    ctaSecondary: "גלו את האפליקציות",
  },
  engines: {
    eyebrow: "ממעבדת Bloom AI",
    titlePre: "8 מנועים מתמחים. ",
    titleAccent: "ארכיטקטורה ארגונית מתוכננת מראש.",
    description:
      "Bloom AI היא מעבדה ואינקובטור טכנולוגי. כל מנוע הוא אפליקציה עצמאית שבנויה על מודעות דינמית: בלי תבניות, בלי חוקים קשיחים, בלי שום הגדרה מצדכם. הוא קולט, מנתח ובונה לעצמו את מסלול הביצוע. כל השמונה בפיתוח פעיל, בדרך ל־100% אוטונומיה.",
    badgePre: "בדרך עוד מנועים ושירותים פורצי דרך ",
    badgeAccent: "שיגרמו לעסק שלכם לפרוח",
    devBanner: "כל המנועים בפיתוח פעיל · בדרך ל־100% אוטונומיה",
  },
  shifts: {
    eyebrow: "טופולוגיית משמרות דינמית",
    titlePre: "מנוע אחד. שלוש משמרות. ",
    titleAccent: "אפס השבתה.",
    description: "Bloom אף פעם לא מסיים משמרת. מנוע טופולוגיית המשמרות הדינמית מזיז כוח מחשוב בין המנועים שלכם מסביב לשעון: סוגר בכוח כשהשוק שלכם ער, כורה ומנקה כשהוא ישן, ומזנק ברגע שנוחת אות בשווי גבוה.",
    liveNow: "פעיל עכשיו באזור הזמן שלכם",
    eventDriven: "מבוסס אירועים",
    preview: "Bloom מחליף משמרות אוטומטית. בחרו אחת כדי לראות את ההקצאה שלה.",
    nodes: "צמתי מחשוב",
    allocation: "הקצאת צמתים חיה",
    running: "רץ במשמרת הזו",
    trigger: "טריגר",
    modes: {
      prime: {
        name: "משמרת שוק פעיל",
        trigger: "שעות הפעילות העסקית בשיא בכל אזור",
        body: "תזמור עסקאות במהירות גבוהה כשהקונים שלכם מחוברים.",
        ops: ["סינון לידים בזמן אמת", "תזמור עסקאות חי בין Apex ל־Cortex", "טיפול פעיל בהתנגדויות בשיחות פתוחות", "העברה לסוגרים שלכם באותה שעה"],
      },
      dark: {
        name: "משמרת שוק שקט",
        trigger: "שעות השפל, בכל האזורים",
        body: "השעות השקטות עושות את העבודה הכבדה, כדי שהבוקר יתחיל נקי.",
        ops: ["הטמעה רציפה למסד הנתונים הווקטורי", "כריית אותות כוונה בכל הערוצים", "דירוג לידים חוצה גבולות", "היגיינת צנרת וניקוי ה־CRM"],
      },
      surge: {
        name: "משמרת זינוק",
        trigger: "זינוק באותות נכנסים או ליד בשווי ACV גבוה מחוץ לשעות",
        body: "הגדלת כוח מחשוב מבוססת אירועים ברגע שהביקוש מזנק.",
        ops: ["כוח מחשוב שגדל אוטומטית", "לידים בשווי ACV גבוה נענים תוך שניות, בכל שעה", "קיבולת סגירה נוספת לאורך הזינוק", "חוזר לגודל רגיל כשהגל עובר"],
      },
    },
  },
  architectures: {
    eyebrow: "ארכיטקטורות לארגונים",
    titlePre: "עשר ארכיטקטורות. ",
    titleAccent: "נפרסות בשבילכם.",
    description: "שילובים ארוזים מראש של מנועי Bloom, מחוברים ונפרסים על ידי הצוות שלנו: הקמה חד־פעמית שטוענת את הנתונים שלכם, מחברת את ה־CRM ונועלת SLA, ואחריה ריטיינר חודשי על כוח המחשוב שמריץ הכול 24/7.",
  },
  partner: {
    eyebrow: "למפתחים עצמאיים ולמייסדים טכניים",
    titlePre: "",
    titleAccent: "Demo Creator Suite של Bloom",
    subtitle: "פורטל סנדבוקס במחיר נמוך: צרו דמו ממותג ללקוח בתוך שניות וסגרו ריטיינרים של ‎$3k–$5k בלי לכתוב קוד צד שרת.",
    cta: "פתחו את ה־Demo Creator Suite",
  },
  waitlist: {
    eyebrow: "גישה מוקדמת",
    titlePre: "העסק שלכם, ",
    titleAccent: "בפריחה מלאה.",
    description:
      "Bloom AI פותחת כל אפליקציה לקבוצה ראשונה ומצומצמת של יוצרים, מייסדים וארגונים. בחרו את המנוע שאתם רוצים והיו הראשונים בתור כשהוא יושק.",
    submit: "קבלו גישה מוקדמת",
    trackUpdates: "עקבו אחרי הפיתוח",
  },
  core: {
    eyebrow: "ארכיטקטורת הליבה של Bloom",
    titlePre: "לא אוטומציה. ",
    titleAccent: "מודעות דינמית.",
    body: "אף אחד מהמנועים שלנו לא רץ על תבניות קבועות או חוקים מקודדים. כל אחד קולט את הסביבה שלו בזמן אמת, מאבחן את ההקשר בעצמו ומחליט מה הצעד הבא, בלי שום הגדרה אנושית.",
    step: "שלב",
    loop: [
      { title: "קליטת סביבה בזמן אמת", body: "כל מנוע קולט ברציפות נתונים חיים מהסביבה שלו: שווקים, תיבות דואר, מערכות והתנהגות קונים." },
      { title: "אבחון הקשר אוטומטי", body: "הוא מנתח מה הנתונים האלה אומרים עכשיו על העסק שלכם, על הרף שקבעתם ועל היעדים שלכם." },
      { title: "קבלת החלטות אוטונומית", body: "הוא בונה לעצמו את מסלול הביצוע, פועל לפיו, ומתאים את עצמו ברגע שהמצב משתנה." },
    ],
    loops: "ואז חוזר על עצמו, ברציפות, 24/7.",
    difference: "ההבדל",
    colTemplate: "אוטומציה מבוססת תבניות",
    colAware: "המנועים המודעים של Bloom",
    contrast: [
      { template: "אתם מתכננים את תהליך העבודה", aware: "המנוע מתכנן לעצמו את המסלול" },
      { template: "תבניות קבועות וחוקים מקודדים", aware: "חשיבה דינמית על נתונים חיים" },
      { template: "נשבר כשהתנאים משתנים", aware: "מאבחן מחדש ומסתגל בזמן אמת" },
      { template: "צריך אדם שיגדיר ויתחזק", aware: "אפס הגדרות, מתחזק את עצמו" },
    ],
    closingLead: "אתם אף פעם לא בונים או מגדירים תהליך עבודה.",
    closing: " אתם אומרים למנוע מה חשוב (היעדים, הגבולות והקול שלכם), והוא מודע מספיק כדי לבנות ולהריץ את כל השאר בעצמו.",
  },
  engineCard: {
    index: "מנוע מס׳",
    status: "בפיתוח פעיל",
    autonomous: "אוטונומי",
    command: "כניסה למרכז הפיקוד",
    enter: "כניסה למנוע",
  },
};

const dictionaries: Record<Lang, Dictionary> = { en, es, he };

type I18n = { lang: Lang; dir: "ltr" | "rtl"; t: Dictionary; setLang: (l: Lang) => void };

const I18nContext = createContext<I18n>({ lang: "en", dir: "ltr", t: en, setLang: () => {} });

const STORAGE_KEY = "bloom-lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Restore the viewer's last choice (per-browser convenience only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "es" || saved === "he") setLangState(saved);
    } catch {
      // Storage unavailable (private mode, blocked cookies): stay on English.
    }
  }, []);

  // The whole document follows the language, so every page and overlay (portals included) flips for Hebrew.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Ignore: the choice still applies for this visit.
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({ lang, dir: lang === "he" ? "rtl" : "ltr", t: dictionaries[lang], setLang }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
