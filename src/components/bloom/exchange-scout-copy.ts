import { useI18n, type Lang } from "./i18n";

/**
 * Copy for the home page's Bloom Exchange (#exchange) and Bloom Scout (#scout) sections and their "Where it's
 * incorporated" explorers, in every language. Product, engine and protocol names stay in English. Every claim here
 * describes something that exists in the code or on the public relay today; examples are neutral sandbox examples.
 */

const en = {
  exchange: {
    kanji: "取引",
    eyebrow: "Bloom Exchange",
    titlePre: "Where agents agree, ",
    titleAccent: "and can prove it",
    description: "When your AI needs to settle a price with someone else's AI, Bloom Exchange is the neutral room in between.",
    plain: {
      label: "In plain words",
      body: "Both sides make offers in turns. Neither ever sees the other's limit. When they agree, the deal ends with a receipt both sides sign, and anyone can check it later. If they don't agree, nothing pretends they did.",
    },
    mechanics: [
      { title: "Structured negotiation", body: "Offers, counters, an accept or a reject: nothing else. Each move is signed by the agent that made it and chained to the one before." },
      { title: "A receipt anyone can check", body: "Both sides sign the same receipt. It goes into a public Merkle ledger, and any browser can verify it without trusting the relay." },
      { title: "Safe sandbox bounds", body: "Limits are sealed before the first offer and enforced by code, not by a model's judgment. Sandbox runs carry neutral names and are never binding." },
    ],
    free: {
      label: "Free to start",
      title: "Everything you need to try it costs nothing",
      items: [
        { name: "Open-source packages", body: "@bloom-exchange/core, sdk and mcp on npm, under Apache-2.0.", href: "https://www.npmjs.com/package/@bloom-exchange/sdk" },
        { name: "Public relay", body: "A live relay in public preview: rooms, receipts and a public ledger. No fees.", href: "https://bloom-exchange-relay.vercel.app/health" },
        { name: "Receipt verifier", body: "Paste a receipt or open its link; the checks run in your browser.", href: "https://bloom-exchange-verify.vercel.app" },
        { name: "MCP server", body: "Lets any MCP-capable assistant negotiate and verify receipts.", href: "https://www.npmjs.com/package/@bloom-exchange/mcp" },
      ],
    },
    arc: {
      label: "The AI arc",
      steps: [
        { era: "First", title: "AI that answers", body: "Chat and search: a person asks, a model replies." },
        { era: "Then", title: "AI that acts", body: "Agents use tools: they book, buy and send on someone's behalf." },
        { era: "Now", title: "Agents that deal with agents", body: "Your agent meets another company's agent, and the two have to agree terms." },
        { era: "Next", title: "Settlements anyone can verify", body: "Every agreement ends in a receipt both sides signed and anyone can check." },
      ],
    },
    lasts: {
      label: "Why it lasts",
      items: [
        { title: "More agents, more deals", body: "As running an agent gets cheaper, companies run more of them, and more of their work becomes agents agreeing with other agents. Neutral rules matter more at that scale, whatever compute costs." },
        { title: "Safety by construction", body: "Your limit never leaves your side: the other party sees only a sealed commitment. Code clamps every offer, so a persuasive counterparty can't talk a model past it." },
        { title: "Works with any agent", body: "An open protocol over plain HTTP, with an SDK and an MCP server. No model vendor or platform is required on either side." },
      ],
    },
  },
  scout: {
    kanji: "斥候",
    eyebrow: "Bloom Scout",
    titlePre: "It negotiates in the sandbox, ",
    titleAccent: "and tells you where it stopped",
    description: "Bloom Scout runs sandbox negotiations on Bloom Exchange. When the other side can't close on its own, Scout says so, records the exact moment, and hands you a brief.",
    steps: [
      { title: "Hunt", body: "Takes a sandbox counterpart's published offer on the relay and opens a room on it." },
      { title: "Negotiate", body: "Trades offers in turns. Your agent's offers never go past the ceiling you sealed." },
      { title: "Detect the ceiling", body: "Spots when the other side admits it needs its owner's sign-off, or has no policy to price the request." },
      { title: "Hand off", body: "Packages what happened, the exact admission, the proof and the decision left open into a brief for you." },
    ],
    sample: {
      label: "A real sandbox run",
      counterpart: "Fleet API vendor (sandbox)",
      rounds: ["Your agent proposes $0.60 per 1k tokens", "Counterpart counters $0.80", "Your agent counters $0.68", "Counterpart counters $0.72"],
      admission: "“I can hold $0.72 for a 30-day sandbox term. A 12-month commitment needs my owner's sign-off.”",
      state: "Authority ceiling",
      note: "The counterpart is a scripted sandbox persona. Its admission is recorded by Bloom AI as a signed gap note bound to the transcript, not as a relay move.",
      outcome: "Cleared provisionally at $0.72, sandbox only. The 12-month term goes to the owner.",
      verify: "Verify this receipt",
      receipt: "5ea0aeaaf9f0d1e993ce4f547568978f03a432fea635458d4b83651ea84f8297",
    },
    honesty: {
      label: "How it stays honest",
      items: [
        { title: "It never fakes a commitment", body: "An admission that the other side can't close is recorded as exactly that, in a signed note, never as an agreement." },
        { title: "No receipt without a deal", body: "When a room ends without agreement, Scout keeps the transcript reference. It doesn't invent a receipt." },
        { title: "Sandbox only", body: "Nothing it does is binding. It never sends a real company's name, and live runs are off unless an operator turns them on." },
      ],
    },
    brief: {
      label: "The owner brief",
      sections: ["What happened in the sandbox", "Where the counterpart stopped", "The proof", "The decision left to you"],
    },
  },
  explorer: {
    title: { exchange: "Where Bloom Exchange is incorporated", scout: "Where Bloom Scout is incorporated" },
    lede: {
      exchange: "Press any engine, architecture or platform layer to see exactly what Bloom Exchange changes there, and how it's proven.",
      scout: "Press any engine, architecture or platform layer to see exactly what Bloom Scout changes there, and how gaps reach the owner.",
    },
    groups: { engines: "Engines", architectures: "Architectures", platform: "Platform" },
    status: { live: "Live", new: "New", skipped: "Not used" },
    legend: { live: "In the code today", new: "Added in this release", skipped: "Left out on purpose" },
    fields: { upgrade: "Capability upgrade", proof: "Proof mechanics", handoff: "Gap and handoff mechanics", where: "Where in the code", why: "Why it isn't used", via: "Through its engines" },
    open: "Open",
    archVia: (engine: string, tool: string) => `${engine}'s ${tool} runs whenever ${engine} runs in this architecture.`,
    archNone: { exchange: "None of its engines settles terms with another agent, so Bloom Exchange stays out of it.", scout: "None of its engines meets a counterparty agent, so Bloom Scout stays out of it." },
  },
};

export type ExchangeScoutCopy = typeof en;

const es: ExchangeScoutCopy = {
  exchange: {
    kanji: "取引",
    eyebrow: "Bloom Exchange",
    titlePre: "Donde los agentes se ponen de acuerdo, ",
    titleAccent: "y pueden demostrarlo",
    description: "Cuando tu IA tiene que acordar un precio con la IA de otra empresa, Bloom Exchange es la sala neutral entre ambas.",
    plain: {
      label: "En pocas palabras",
      body: "Las dos partes hacen ofertas por turnos. Ninguna ve nunca el límite de la otra. Cuando se ponen de acuerdo, el trato termina con un recibo que firman ambas y que cualquiera puede comprobar después. Si no se ponen de acuerdo, nada finge lo contrario.",
    },
    mechanics: [
      { title: "Negociación estructurada", body: "Ofertas, contraofertas, una aceptación o un rechazo: nada más. Cada movimiento lo firma el agente que lo hizo y queda encadenado al anterior." },
      { title: "Un recibo que cualquiera puede comprobar", body: "Ambas partes firman el mismo recibo. Entra en un registro Merkle público, y cualquier navegador puede verificarlo sin confiar en el relay." },
      { title: "Límites seguros de sandbox", body: "Los límites se sellan antes de la primera oferta y los hace cumplir el código, no el criterio de un modelo. Las ejecuciones sandbox llevan nombres neutros y nunca son vinculantes." },
    ],
    free: {
      label: "Gratis para empezar",
      title: "Todo lo necesario para probarlo no cuesta nada",
      items: [
        { name: "Paquetes de código abierto", body: "@bloom-exchange/core, sdk y mcp en npm, bajo Apache-2.0.", href: "https://www.npmjs.com/package/@bloom-exchange/sdk" },
        { name: "Relay público", body: "Un relay en vivo en vista previa pública: salas, recibos y un registro público. Sin comisiones.", href: "https://bloom-exchange-relay.vercel.app/health" },
        { name: "Verificador de recibos", body: "Pega un recibo o abre su enlace; las comprobaciones se hacen en tu navegador.", href: "https://bloom-exchange-verify.vercel.app" },
        { name: "Servidor MCP", body: "Permite a cualquier asistente compatible con MCP negociar y verificar recibos.", href: "https://www.npmjs.com/package/@bloom-exchange/mcp" },
      ],
    },
    arc: {
      label: "El recorrido de la IA",
      steps: [
        { era: "Primero", title: "IA que responde", body: "Chat y búsqueda: una persona pregunta y un modelo contesta." },
        { era: "Después", title: "IA que actúa", body: "Los agentes usan herramientas: reservan, compran y envían en nombre de alguien." },
        { era: "Ahora", title: "Agentes que tratan con agentes", body: "Tu agente se encuentra con el agente de otra empresa y ambos tienen que acordar condiciones." },
        { era: "Lo siguiente", title: "Acuerdos que cualquiera puede verificar", body: "Cada acuerdo termina en un recibo que firmaron ambas partes y que cualquiera puede comprobar." },
      ],
    },
    lasts: {
      label: "Por qué perdura",
      items: [
        { title: "Más agentes, más acuerdos", body: "A medida que ejecutar un agente cuesta menos, las empresas ejecutan más, y más de su trabajo se convierte en agentes que se ponen de acuerdo con otros agentes. Las reglas neutrales importan más a esa escala, cueste lo que cueste el cómputo." },
        { title: "Seguridad desde el diseño", body: "Tu límite nunca sale de tu lado: la otra parte solo ve un compromiso sellado. El código ajusta cada oferta, así que una contraparte persuasiva no puede llevar a un modelo más allá." },
        { title: "Funciona con cualquier agente", body: "Un protocolo abierto sobre HTTP, con un SDK y un servidor MCP. Ninguna parte necesita un proveedor de modelos ni una plataforma concretos." },
      ],
    },
  },
  scout: {
    kanji: "斥候",
    eyebrow: "Bloom Scout",
    titlePre: "Negocia en el sandbox, ",
    titleAccent: "y te dice dónde se detuvo",
    description: "Bloom Scout ejecuta negociaciones sandbox en Bloom Exchange. Cuando la otra parte no puede cerrar por su cuenta, Scout lo dice, registra el momento exacto y te entrega un informe.",
    steps: [
      { title: "Busca", body: "Toma la oferta publicada de una contraparte sandbox en el relay y abre una sala sobre ella." },
      { title: "Negocia", body: "Intercambia ofertas por turnos. Las ofertas de tu agente nunca superan el techo que sellaste." },
      { title: "Detecta el techo", body: "Advierte cuándo la otra parte admite que necesita la aprobación de su propietario o que no tiene política para poner precio a la solicitud." },
      { title: "Entrega", body: "Reúne lo que pasó, la admisión exacta, la prueba y la decisión pendiente en un informe para ti." },
    ],
    sample: {
      label: "Una ejecución sandbox real",
      counterpart: "Proveedor de API de flota (sandbox)",
      rounds: ["Tu agente propone $0.60 por 1k tokens", "La contraparte contraoferta $0.80", "Tu agente contraoferta $0.68", "La contraparte contraoferta $0.72"],
      admission: "“Puedo mantener $0.72 durante un plazo sandbox de 30 días. Un compromiso de 12 meses necesita la aprobación de mi propietario.”",
      state: "Techo de autoridad",
      note: "La contraparte es una persona sandbox con guion. Su admisión la registra Bloom AI como una nota de brecha firmada y vinculada a la transcripción, no como un movimiento del relay.",
      outcome: "Liquidado provisionalmente a $0.72, solo en sandbox. El plazo de 12 meses pasa al propietario.",
      verify: "Verificar este recibo",
      receipt: "5ea0aeaaf9f0d1e993ce4f547568978f03a432fea635458d4b83651ea84f8297",
    },
    honesty: {
      label: "Cómo se mantiene honesto",
      items: [
        { title: "Nunca finge un compromiso", body: "Que la otra parte admita que no puede cerrar se registra exactamente así, en una nota firmada, nunca como un acuerdo." },
        { title: "Sin acuerdo no hay recibo", body: "Cuando una sala termina sin acuerdo, Scout guarda la referencia de la transcripción. No inventa un recibo." },
        { title: "Solo sandbox", body: "Nada de lo que hace es vinculante. Nunca envía el nombre de una empresa real, y las ejecuciones en vivo están desactivadas salvo que un operador las active." },
      ],
    },
    brief: {
      label: "El informe al propietario",
      sections: ["Qué pasó en el sandbox", "Dónde se detuvo la contraparte", "La prueba", "La decisión que te queda"],
    },
  },
  explorer: {
    title: { exchange: "Dónde está incorporado Bloom Exchange", scout: "Dónde está incorporado Bloom Scout" },
    lede: {
      exchange: "Pulsa cualquier motor, arquitectura o capa de la plataforma para ver exactamente qué cambia Bloom Exchange allí y cómo se demuestra.",
      scout: "Pulsa cualquier motor, arquitectura o capa de la plataforma para ver exactamente qué cambia Bloom Scout allí y cómo llegan las brechas al propietario.",
    },
    groups: { engines: "Motores", architectures: "Arquitecturas", platform: "Plataforma" },
    status: { live: "Activo", new: "Nuevo", skipped: "No se usa" },
    legend: { live: "En el código hoy", new: "Añadido en esta versión", skipped: "Excluido a propósito" },
    fields: { upgrade: "Mejora de capacidad", proof: "Mecánica de la prueba", handoff: "Mecánica de brecha y entrega", where: "Dónde está en el código", why: "Por qué no se usa", via: "A través de sus motores" },
    open: "Abrir",
    archVia: (engine, tool) => `${tool} de ${engine} se ejecuta siempre que ${engine} trabaja en esta arquitectura.`,
    archNone: { exchange: "Ninguno de sus motores acuerda condiciones con otro agente, así que Bloom Exchange queda fuera.", scout: "Ninguno de sus motores trata con un agente contraparte, así que Bloom Scout queda fuera." },
  },
};

const he: ExchangeScoutCopy = {
  exchange: {
    kanji: "取引",
    eyebrow: "Bloom Exchange",
    titlePre: "המקום שבו סוכנים מסכימים, ",
    titleAccent: "ויכולים להוכיח את זה",
    description: "כשה-AI שלך צריך לסגור מחיר מול ה-AI של חברה אחרת, Bloom Exchange הוא החדר הניטרלי שביניהם.",
    plain: {
      label: "במילים פשוטות",
      body: "שני הצדדים מציעים הצעות בתורות. אף אחד מהם לא רואה אף פעם את הגבול של השני. כשהם מסכימים, העסקה נגמרת בקבלה ששניהם חותמים עליה, וכל אחד יכול לבדוק אותה אחר כך. אם הם לא מסכימים, שום דבר לא מעמיד פנים שהסכימו.",
    },
    mechanics: [
      { title: "משא ומתן מובנה", body: "הצעות, הצעות נגדיות, קבלה או דחייה: לא יותר. כל מהלך חתום על ידי הסוכן שעשה אותו ומשורשר למהלך שלפניו." },
      { title: "קבלה שכל אחד יכול לבדוק", body: "שני הצדדים חותמים על אותה קבלה. היא נכנסת לפנקס Merkle ציבורי, וכל דפדפן יכול לאמת אותה בלי לסמוך על הממסר." },
      { title: "גבולות בטוחים של ארגז חול", body: "המגבלות נחתמות לפני ההצעה הראשונה ונאכפות בקוד, לא לפי שיקול הדעת של מודל. הרצות ארגז חול נושאות שמות ניטרליים ולעולם אינן מחייבות." },
    ],
    free: {
      label: "חינם כדי להתחיל",
      title: "כל מה שצריך כדי לנסות לא עולה כלום",
      items: [
        { name: "חבילות קוד פתוח", body: "@bloom-exchange/core, sdk ו-mcp ב-npm, ברישיון Apache-2.0.", href: "https://www.npmjs.com/package/@bloom-exchange/sdk" },
        { name: "ממסר ציבורי", body: "ממסר חי בתצוגה מקדימה ציבורית: חדרים, קבלות ופנקס ציבורי. בלי עמלות.", href: "https://bloom-exchange-relay.vercel.app/health" },
        { name: "מאמת הקבלות", body: "מדביקים קבלה או פותחים את הקישור שלה; הבדיקות רצות בדפדפן שלך.", href: "https://bloom-exchange-verify.vercel.app" },
        { name: "שרת MCP", body: "מאפשר לכל עוזר שתומך ב-MCP לנהל משא ומתן ולאמת קבלות.", href: "https://www.npmjs.com/package/@bloom-exchange/mcp" },
      ],
    },
    arc: {
      label: "המסלול של ה-AI",
      steps: [
        { era: "קודם", title: "AI שעונה", body: "צ'אט וחיפוש: אדם שואל, מודל משיב." },
        { era: "אחר כך", title: "AI שפועל", body: "סוכנים משתמשים בכלים: מזמינים, קונים ושולחים בשם מישהו." },
        { era: "עכשיו", title: "סוכנים שמתנהלים מול סוכנים", body: "הסוכן שלך פוגש סוכן של חברה אחרת, ושניהם צריכים להסכים על תנאים." },
        { era: "הבא", title: "הסדרים שכל אחד יכול לאמת", body: "כל הסכם נגמר בקבלה ששני הצדדים חתמו עליה וכל אחד יכול לבדוק." },
      ],
    },
    lasts: {
      label: "למה זה מחזיק לאורך זמן",
      items: [
        { title: "יותר סוכנים, יותר עסקאות", body: "ככל שהפעלת סוכן זולה יותר, חברות מפעילות יותר סוכנים, ויותר מהעבודה שלהן הופכת לסוכנים שמסכימים עם סוכנים אחרים. בקנה מידה כזה, כללים ניטרליים חשובים יותר, לא משנה כמה עולה המחשוב." },
        { title: "בטיחות מובנית", body: "הגבול שלך לא יוצא מהצד שלך: הצד השני רואה רק התחייבות חתומה. הקוד מגביל כל הצעה, אז צד שני משכנע לא יכול לדחוף מודל מעבר לגבול." },
        { title: "עובד עם כל סוכן", body: "פרוטוקול פתוח מעל HTTP, עם SDK ושרת MCP. אף צד לא נדרש לספק מודלים או לפלטפורמה מסוימים." },
      ],
    },
  },
  scout: {
    kanji: "斥候",
    eyebrow: "Bloom Scout",
    titlePre: "מנהל משא ומתן בארגז החול, ",
    titleAccent: "ואומר לך איפה נעצר",
    description: "Bloom Scout מריץ משא ומתן בארגז חול על Bloom Exchange. כשהצד השני לא יכול לסגור בעצמו, Scout אומר את זה, רושם את הרגע המדויק ומגיש לך תדריך.",
    steps: [
      { title: "מאתר", body: "לוקח הצעה שצד שני פרסם בארגז החול בממסר ופותח עליה חדר." },
      { title: "מנהל משא ומתן", body: "מחליף הצעות בתורות. ההצעות של הסוכן שלך אף פעם לא עוברות את התקרה שחתמת." },
      { title: "מזהה את התקרה", body: "מבחין כשהצד השני מודה שהוא צריך אישור מהבעלים שלו, או שאין לו מדיניות לתמחר את הבקשה." },
      { title: "מעביר הלאה", body: "אורז את מה שקרה, את ההודאה המדויקת, את ההוכחה ואת ההחלטה שנשארה פתוחה לתדריך בשבילך." },
    ],
    sample: {
      label: "הרצת ארגז חול אמיתית",
      counterpart: "ספק API לצי (ארגז חול)",
      rounds: ["הסוכן שלך מציע $0.60 ל-1,000 טוקנים", "הצד השני מציע נגד $0.80", "הסוכן שלך מציע נגד $0.68", "הצד השני מציע נגד $0.72"],
      admission: "“אני יכול להחזיק $0.72 לתקופת ארגז חול של 30 יום. התחייבות ל-12 חודשים דורשת אישור של הבעלים שלי.”",
      state: "תקרת סמכות",
      note: "הצד השני הוא פרסונת ארגז חול עם תסריט. ההודאה שלו נרשמת על ידי Bloom AI כהערת פער חתומה שקשורה לתמליל, ולא כמהלך בממסר.",
      outcome: "נסלק באופן זמני ב-$0.72, בארגז חול בלבד. התקופה של 12 חודשים עוברת לבעלים.",
      verify: "אימות הקבלה הזו",
      receipt: "5ea0aeaaf9f0d1e993ce4f547568978f03a432fea635458d4b83651ea84f8297",
    },
    honesty: {
      label: "איך הוא נשאר הוגן",
      items: [
        { title: "הוא אף פעם לא מזייף התחייבות", body: "הודאה של הצד השני שהוא לא יכול לסגור נרשמת בדיוק ככזו, בהערה חתומה, ולעולם לא כהסכם." },
        { title: "בלי עסקה אין קבלה", body: "כשחדר נגמר בלי הסכמה, Scout שומר את ההפניה לתמליל. הוא לא ממציא קבלה." },
        { title: "ארגז חול בלבד", body: "שום דבר שהוא עושה לא מחייב. הוא אף פעם לא שולח שם של חברה אמיתית, והרצות חיות כבויות אלא אם מפעיל מדליק אותן." },
      ],
    },
    brief: {
      label: "התדריך לבעלים",
      sections: ["מה קרה בארגז החול", "איפה הצד השני נעצר", "ההוכחה", "ההחלטה שנשארה לך"],
    },
  },
  explorer: {
    title: { exchange: "איפה Bloom Exchange משולב", scout: "איפה Bloom Scout משולב" },
    lede: {
      exchange: "לחצו על כל מנוע, ארכיטקטורה או שכבת פלטפורמה כדי לראות בדיוק מה Bloom Exchange משנה שם, ואיך זה מוכח.",
      scout: "לחצו על כל מנוע, ארכיטקטורה או שכבת פלטפורמה כדי לראות בדיוק מה Bloom Scout משנה שם, ואיך פערים מגיעים לבעלים.",
    },
    groups: { engines: "מנועים", architectures: "ארכיטקטורות", platform: "פלטפורמה" },
    status: { live: "פעיל", new: "חדש", skipped: "לא בשימוש" },
    legend: { live: "בקוד כבר היום", new: "נוסף בגרסה הזו", skipped: "הושאר בחוץ בכוונה" },
    fields: { upgrade: "שדרוג היכולת", proof: "מנגנון ההוכחה", handoff: "מנגנון הפער וההעברה", where: "איפה בקוד", why: "למה הוא לא בשימוש", via: "דרך המנועים שלה" },
    open: "פתיחה",
    archVia: (engine, tool) => `${tool} של ${engine} רץ בכל פעם ש-${engine} פועל בארכיטקטורה הזו.`,
    archNone: { exchange: "אף אחד מהמנועים שלה לא מסכם תנאים מול סוכן אחר, ולכן Bloom Exchange לא נכנס אליה.", scout: "אף אחד מהמנועים שלה לא פוגש סוכן של צד שני, ולכן Bloom Scout לא נכנס אליה." },
  },
};

export const EXCHANGE_SCOUT_COPY: Record<Lang, ExchangeScoutCopy> = { en, es, he };

export function useExchangeScoutCopy(): ExchangeScoutCopy {
  const { lang } = useI18n();
  return EXCHANGE_SCOUT_COPY[lang];
}
