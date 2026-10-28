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
    nightShift: "The Night Shift",
    engines: "Engines",
    partners: "Developers",
    morning: "Morning Brief",
    waitlist: "Early Access",
    cta: "Enter Command Center",
    language: "Language",
  },
  hero: {
    status: "In active development",
    badge: "The Bloom AI Lab · 4 standalone apps",
    titlePre: "Category-Defining ",
    titleAccent: "Autonomous Engines",
    titlePost: " for Creators, Founders, and High-End Enterprises.",
    sub: "Bloom AI is an elite technology lab and incubator. We build and launch category-defining, zero-overhead standalone apps that are aware: each one perceives its environment, reasons, and decides on its own, 24/7, without your intervention.",
    ctaPrimary: "Deploy Your Shadow Workforce",
    ctaSecondary: "Explore the Apps",
  },
  nightShift: {
    eyebrow: "The Night Shift",
    titlePre: "You log off. ",
    titleAccent: "Bloom clocks in.",
    description:
      "The grand finale: 24/7 ambient execution across all four engines. Brief them once, the way you'd brief your best hires, and they work every hour you don't.",
  },
  engines: {
    eyebrow: "From the Bloom AI Lab",
    titlePre: "Four standalone apps. ",
    titleAccent: "Zero overhead.",
    description:
      "Bloom AI is a technology lab and incubator. Each engine is its own category-defining app, built on Dynamic Awareness: no templates, no hardcoded rules, nothing for you to configure. It perceives, reasons, and builds its own execution path. All four are in active development, building toward 100% autonomy.",
    badgePre: "With More Game-Changing Engines & Services To Come ",
    badgeAccent: "That Will Bloom Your Business",
    devBanner: "All engines in active development · building toward 100% autonomy",
  },
  partner: {
    eyebrow: "For indie developers & technical founders",
    titlePre: "The Bloom ",
    titleAccent: "Demo Creator Suite",
    subtitle: "A low-cost sandbox portal: spin up branded client demos in seconds and close $3k–$5k retainers without writing backend code.",
    cta: "Launch Demo Creator Suite",
  },
  morning: {
    eyebrow: "The Morning Brief",
    titlePre: "Good morning. ",
    titleAccent: "Here's what bloomed.",
    description:
      "No dashboards to dig through. One brief over coffee: what your engines did overnight, what it earned, and the deals waiting for your signature.",
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
};

export type Dictionary = typeof en;

const es: Dictionary = {
  nav: {
    nightShift: "El turno de noche",
    engines: "Motores",
    partners: "Desarrolladores",
    morning: "Informe matutino",
    waitlist: "Acceso anticipado",
    cta: "Entrar al Centro de Mando",
    language: "Idioma",
  },
  hero: {
    status: "En desarrollo activo",
    badge: "Bloom AI Lab · 4 apps independientes",
    titlePre: "",
    titleAccent: "Motores autónomos",
    titlePost: " que definen categorías para creadores, fundadores y empresas de alto nivel.",
    sub: "Bloom AI es un laboratorio e incubadora tecnológica de élite. Creamos y lanzamos apps independientes que definen su categoría, sin costes operativos, y que son conscientes: cada una percibe su entorno, razona y decide por sí misma, 24/7, sin tu intervención.",
    ctaPrimary: "Despliega tu fuerza de trabajo en la sombra",
    ctaSecondary: "Explorar las apps",
  },
  nightShift: {
    eyebrow: "El turno de noche",
    titlePre: "Tú te desconectas. ",
    titleAccent: "Bloom entra a trabajar.",
    description:
      "El gran final: ejecución ambiental 24/7 en los cuatro motores. Dales las instrucciones una vez, como a tus mejores fichajes, y trabajan cada hora que tú no.",
  },
  engines: {
    eyebrow: "Desde el laboratorio Bloom AI",
    titlePre: "Cuatro apps independientes. ",
    titleAccent: "Cero costes operativos.",
    description:
      "Bloom AI es un laboratorio e incubadora tecnológica. Cada motor es su propia app, construida sobre conciencia dinámica: sin plantillas, sin reglas fijas, nada que configurar. Percibe, razona y construye su propio camino de ejecución. Los cuatro están en desarrollo activo, rumbo al 100% de autonomía.",
    badgePre: "Vienen más motores y servicios revolucionarios ",
    badgeAccent: "que harán florecer tu negocio",
    devBanner: "Todos los motores en desarrollo activo · rumbo al 100% de autonomía",
  },
  partner: {
    eyebrow: "Para desarrolladores independientes y fundadores técnicos",
    titlePre: "La ",
    titleAccent: "Demo Creator Suite de Bloom",
    subtitle: "Un portal sandbox de bajo coste: crea demos con la marca de tu cliente en segundos y cierra retainers de $3k–$5k sin escribir código backend.",
    cta: "Abrir la Demo Creator Suite",
  },
  morning: {
    eyebrow: "El informe matutino",
    titlePre: "Buenos días. ",
    titleAccent: "Esto es lo que floreció.",
    description:
      "Sin paneles que revisar. Un solo informe con el café: lo que hicieron tus motores durante la noche, lo que generaron y los acuerdos que esperan tu firma.",
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
};

const he: Dictionary = {
  nav: {
    nightShift: "משמרת הלילה",
    engines: "המנועים",
    partners: "מפתחים",
    morning: "תדריך הבוקר",
    waitlist: "גישה מוקדמת",
    cta: "כניסה למרכז הפיקוד",
    language: "שפה",
  },
  hero: {
    status: "בפיתוח פעיל",
    badge: "מעבדת Bloom AI · ‏4 אפליקציות עצמאיות",
    titlePre: "",
    titleAccent: "מנועים אוטונומיים",
    titlePost: " שמגדירים קטגוריה, ליוצרים, למייסדים ולארגונים מהשורה הראשונה.",
    sub: "Bloom AI היא מעבדה ואינקובטור טכנולוגי מוביל. אנחנו בונים ומשיקים אפליקציות עצמאיות שמגדירות קטגוריה, בלי תקורה תפעולית, והן מודעות: כל אחת קולטת את הסביבה שלה, מנתחת ומחליטה בעצמה, 24/7, בלי שתצטרכו להתערב.",
    ctaPrimary: "הפעילו את כוח העבודה השקט שלכם",
    ctaSecondary: "גלו את האפליקציות",
  },
  nightShift: {
    eyebrow: "משמרת הלילה",
    titlePre: "אתם מתנתקים. ",
    titleAccent: "Bloom נכנס למשמרת.",
    description:
      "הגמר הגדול: ביצוע סביבתי 24/7 בכל ארבעת המנועים. תדרכו אותם פעם אחת, כמו את הגיוסים הכי טובים שלכם, והם עובדים בכל שעה שאתם לא.",
  },
  engines: {
    eyebrow: "ממעבדת Bloom AI",
    titlePre: "ארבע אפליקציות עצמאיות. ",
    titleAccent: "אפס תקורה.",
    description:
      "Bloom AI היא מעבדה ואינקובטור טכנולוגי. כל מנוע הוא אפליקציה עצמאית שבנויה על מודעות דינמית: בלי תבניות, בלי חוקים קשיחים, בלי שום הגדרה מצדכם. הוא קולט, מנתח ובונה לעצמו את מסלול הביצוע. כל הארבעה בפיתוח פעיל, בדרך ל־100% אוטונומיה.",
    badgePre: "בדרך עוד מנועים ושירותים פורצי דרך ",
    badgeAccent: "שיגרמו לעסק שלכם לפרוח",
    devBanner: "כל המנועים בפיתוח פעיל · בדרך ל־100% אוטונומיה",
  },
  partner: {
    eyebrow: "למפתחים עצמאיים ולמייסדים טכניים",
    titlePre: "",
    titleAccent: "Demo Creator Suite של Bloom",
    subtitle: "פורטל סנדבוקס במחיר נמוך: צרו דמו ממותג ללקוח בתוך שניות וסגרו ריטיינרים של ‎$3k–$5k בלי לכתוב קוד צד שרת.",
    cta: "פתחו את ה־Demo Creator Suite",
  },
  morning: {
    eyebrow: "תדריך הבוקר",
    titlePre: "בוקר טוב. ",
    titleAccent: "הנה מה שפרח.",
    description:
      "בלי דשבורדים לחפור בהם. תדריך אחד עם הקפה: מה המנועים עשו בלילה, כמה זה הכניס, ואילו עסקאות מחכות לחתימה שלכם.",
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

  useEffect(() => {
    document.documentElement.lang = lang;
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
