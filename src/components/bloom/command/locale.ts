import { useMemo } from "react";
import { useI18n, type Lang } from "../i18n";
import { ENGINES, type Engine, type EngineKey } from "./engines";
import { PERSONAS, type Persona } from "./tutorial-script";

/**
 * Spanish and Hebrew for the engine command pages: the panel chrome, each engine's identity and 3-step
 * calibration, and the Neural Breakdown's scripted lines. English stays in engines.ts and tutorial-script.ts;
 * option values never change, so saved calibrations work in every language.
 */

const en = {
  pickerTitle: "Choose an engine",
  pickerSub: "Each one sets up in three steps, then deploys its own shadow workforce.",
  engineNo: "Engine Nº",
  skipIntro: "Skip intro",
  skipHint: "or click anywhere · Enter",
  resuming: "Workforce active · resuming your command view",
  setupStep: (i: number) => `Setup · Step ${i} of 3`,
  back: "Back",
  next: "Next",
  deploying: "Deploying Shadow Workforce...",
  deployLines: (n: number) => [`Assigning ${n} agents`, "Applying your setup", "Opening hand-off channels to the other engines"],
  deployingSr: (i: string) => `Engine Nº ${i} is deploying.`,
  workforceStatus: (on: boolean) => `Shadow Workforce: ${on ? "Active" : "Standing by"}`,
  deployed: (d: number, t: number) => `${d}/${t} agents deployed`,
  confirmRestart: "Confirm: restart setup",
  recalibrate: "Re-Calibrate Engine",
  generateBrief: "Generate 24-Hour Executive Brief",
  demoLabel: "Demo environment:",
  demoNote: "Active agent performance, volume, and routing adapt dynamically to your precise business duties, operational parameters, and allocated budget upon live deployment.",
  calibration: "Calibration",
  workforce: "Workforce",
  reserve: (n: number) => `${n} ${n === 1 ? "agent" : "agents"} in reserve. Open a card's controls to put ${n === 1 ? "it" : "them"} to work.`,
  liveFeed: "Live feed",
  tapToInspect: "Tap any line to inspect",
  all: "All",
  you: "You",
  listening: (ch?: string) => `Listening on ${ch ?? "every channel"}. New signals arrive in seconds.`,
  agentAllocation: "Agent allocation",
  available: (n: number) => `/ ${n} available`,
  allocationHint: "Lower it to free agents for other tasks. Raise it to pull from reserve.",
  stance: "Stance",
  stances: { stealth: "Stealth", aggressive: "Aggressive", balanced: "Balanced" },
  withTeam: "With your team",
  paused: "Paused",
  unstaffed: "Unstaffed",
  resumeAgents: "Resume Agents",
  pauseAgents: "Pause Selected Agents",
  returnToAgents: "Return to Agents",
  handOff: "Force Hand-Off to Human",
  inspect: { intentpulse: "Open signal sheet", apex: "Watch the deal live", coreops: "See the automation proof", sovereign: "Open decision tree" } as Record<EngineKey, string>,
  briefTitle: "Your last 24 hours",
  closeBrief: "Close brief",
  stats: ["Leads secured", "Pipeline revenue locked", "Admin hours saved"],
  hrs: "hrs",
  briefFoot: (d: number, t: number) => `${d} of ${t} agents active right now. Figures are simulated sample data for this demo.`,
  // Neural Breakdown
  confused: "Confused by what you're seeing?",
  launchNeural: "Launch Neural Breakdown",
  dismissNeural: "Dismiss Neural Breakdown prompt",
  neural: "Neural Breakdown",
  closeNeural: "Close Neural Breakdown",
  typing: (name: string) => `${name} is typing`,
  ownWords: "Or tell it in your own words…",
  yourAnswer: "Your answer",
  send: "Send",
  again: "Try another scenario",
  againLine: "Again? Good. Winners test the machine. ",
  backToCommand: "Back to command",
  liveError: "I can't reach my live link right now. Give it a moment and send that again.",
};

export type CommandCopy = typeof en;

const es: CommandCopy = {
  pickerTitle: "Elige un motor",
  pickerSub: "Cada uno se configura en tres pasos y después despliega su propia fuerza de trabajo en la sombra.",
  engineNo: "Motor Nº",
  skipIntro: "Saltar intro",
  skipHint: "o haz clic en cualquier parte · Enter",
  resuming: "Fuerza de trabajo activa · retomando tu vista de mando",
  setupStep: (i) => `Configuración · Paso ${i} de 3`,
  back: "Atrás",
  next: "Siguiente",
  deploying: "Desplegando la fuerza de trabajo en la sombra...",
  deployLines: (n) => [`Asignando ${n} agentes`, "Aplicando tu configuración", "Abriendo canales de traspaso con los otros motores"],
  deployingSr: (i) => `El motor Nº ${i} se está desplegando.`,
  workforceStatus: (on) => `Fuerza en la sombra: ${on ? "Activa" : "En espera"}`,
  deployed: (d, t) => `${d}/${t} agentes desplegados`,
  confirmRestart: "Confirmar: reiniciar configuración",
  recalibrate: "Recalibrar el motor",
  generateBrief: "Generar informe ejecutivo de 24 horas",
  demoLabel: "Entorno de demostración:",
  demoNote: "El rendimiento, el volumen y el enrutamiento de los agentes se adaptan dinámicamente a las funciones exactas de tu negocio, tus parámetros operativos y tu presupuesto en el despliegue real.",
  calibration: "Calibración",
  workforce: "Fuerza de trabajo",
  reserve: (n) => `${n} ${n === 1 ? "agente" : "agentes"} en reserva. Abre los controles de una tarjeta para ${n === 1 ? "ponerlo" : "ponerlos"} a trabajar.`,
  liveFeed: "Actividad en vivo",
  tapToInspect: "Toca cualquier línea para inspeccionarla",
  all: "Todo",
  you: "Tú",
  listening: (ch) => `Escuchando en ${ch ?? "todos los canales"}. Las nuevas señales llegan en segundos.`,
  agentAllocation: "Asignación de agentes",
  available: (n) => `/ ${n} disponibles`,
  allocationHint: "Bájalo para liberar agentes para otras tareas. Súbelo para tomar de la reserva.",
  stance: "Postura",
  stances: { stealth: "Sigilo", aggressive: "Agresiva", balanced: "Equilibrada" },
  withTeam: "Con tu equipo",
  paused: "En pausa",
  unstaffed: "Sin agentes",
  resumeAgents: "Reanudar agentes",
  pauseAgents: "Pausar agentes seleccionados",
  returnToAgents: "Devolver a los agentes",
  handOff: "Forzar traspaso a una persona",
  inspect: { intentpulse: "Abrir la ficha de la señal", apex: "Ver el acuerdo en vivo", coreops: "Ver la prueba de automatización", sovereign: "Abrir el árbol de decisión" },
  briefTitle: "Tus últimas 24 horas",
  closeBrief: "Cerrar informe",
  stats: ["Leads asegurados", "Ingresos de pipeline asegurados", "Horas administrativas ahorradas"],
  hrs: "h",
  briefFoot: (d, t) => `${d} de ${t} agentes activos ahora mismo. Las cifras son datos de muestra simulados para esta demo.`,
  confused: "¿Confundido con lo que ves?",
  launchNeural: "Lanzar el Desglose Neural",
  dismissNeural: "Descartar el aviso del Desglose Neural",
  neural: "Desglose Neural",
  closeNeural: "Cerrar el Desglose Neural",
  typing: (name) => `${name} está escribiendo`,
  ownWords: "O cuéntalo con tus propias palabras…",
  yourAnswer: "Tu respuesta",
  send: "Enviar",
  again: "Probar otro escenario",
  againLine: "¿Otra vez? Bien. Los ganadores ponen a prueba la máquina. ",
  backToCommand: "Volver al mando",
  liveError: "Ahora mismo no llego a mi enlace en vivo. Dame un momento y vuelve a enviarlo.",
};

const he: CommandCopy = {
  pickerTitle: "בחרו מנוע",
  pickerSub: "כל אחד מוגדר בשלושה צעדים, ואז פורס כוח עבודה שקט משלו.",
  engineNo: "מנוע מס׳",
  skipIntro: "דלגו על הפתיח",
  skipHint: "או לחצו בכל מקום · Enter",
  resuming: "כוח העבודה פעיל · חוזרים לתצוגת הפיקוד שלכם",
  setupStep: (i) => `הגדרה · שלב ${i} מתוך 3`,
  back: "חזרה",
  next: "הבא",
  deploying: "פורסים את כוח העבודה השקט...",
  deployLines: (n) => [`משבצים ${n} סוכנים`, "מחילים את ההגדרות שלכם", "פותחים ערוצי העברה לשאר המנועים"],
  deployingSr: (i) => `מנוע מס׳ ${i} בפריסה.`,
  workforceStatus: (on) => `כוח העבודה השקט: ${on ? "פעיל" : "בהמתנה"}`,
  deployed: (d, t) => `${d}/${t} סוכנים פרוסים`,
  confirmRestart: "אישור: התחלת ההגדרה מחדש",
  recalibrate: "כיול מחדש של המנוע",
  generateBrief: "הפקת תדריך מנהלים ל־24 שעות",
  demoLabel: "סביבת הדגמה:",
  demoNote: "הביצועים, הנפח והניתוב של הסוכנים מתאימים את עצמם באופן דינמי לתפקידים המדויקים של העסק שלכם, לפרמטרים התפעוליים ולתקציב שהוקצה, ברגע הפריסה בפועל.",
  calibration: "כיול",
  workforce: "כוח העבודה",
  reserve: (n) => (n === 1 ? "סוכן אחד בעתודה. פתחו את הבקרות של כרטיס כדי להכניס אותו לעבודה." : `${n} סוכנים בעתודה. פתחו את הבקרות של כרטיס כדי להכניס אותם לעבודה.`),
  liveFeed: "פעילות חיה",
  tapToInspect: "לחצו על כל שורה כדי לבחון אותה",
  all: "הכול",
  you: "אתם",
  listening: (ch) => `מאזינים ב${ch ? `־${ch}` : "כל הערוצים"}. אותות חדשים מגיעים תוך שניות.`,
  agentAllocation: "הקצאת סוכנים",
  available: (n) => `/ ${n} זמינים`,
  allocationHint: "הורידו כדי לשחרר סוכנים למשימות אחרות. העלו כדי למשוך מהעתודה.",
  stance: "עמדה",
  stances: { stealth: "חשאית", aggressive: "אגרסיבית", balanced: "מאוזנת" },
  withTeam: "אצל הצוות שלכם",
  paused: "מושהה",
  unstaffed: "ללא סוכנים",
  resumeAgents: "חידוש פעילות הסוכנים",
  pauseAgents: "השהיית הסוכנים שנבחרו",
  returnToAgents: "החזרה לסוכנים",
  handOff: "העברה כפויה לאדם",
  inspect: { intentpulse: "פתיחת גיליון האות", apex: "צפייה בעסקה בשידור חי", coreops: "הוכחת האוטומציה", sovereign: "פתיחת עץ ההחלטות" },
  briefTitle: "24 השעות האחרונות שלכם",
  closeBrief: "סגירת התדריך",
  stats: ["לידים שהובטחו", "הכנסות צנרת שננעלו", "שעות אדמיניסטרציה שנחסכו"],
  hrs: "שע׳",
  briefFoot: (d, t) => `${d} מתוך ${t} סוכנים פעילים כרגע. הנתונים הם דוגמה מדומה לצורך ההדגמה.`,
  confused: "לא בטוחים מה אתם רואים?",
  launchNeural: "הפעילו את הפירוק הנוירוני",
  dismissNeural: "סגירת ההצעה לפירוק הנוירוני",
  neural: "פירוק נוירוני",
  closeNeural: "סגירת הפירוק הנוירוני",
  typing: (name) => `${name} מקליד`,
  ownWords: "או ספרו לו במילים שלכם…",
  yourAnswer: "התשובה שלכם",
  send: "שליחה",
  again: "נסו תרחיש אחר",
  againLine: "שוב? מצוין. מנצחים בודקים את המכונה. ",
  backToCommand: "חזרה לפיקוד",
  liveError: "אין לי כרגע חיבור לקו החי. תנו לי רגע ושלחו שוב.",
};

const COPY: Record<Lang, CommandCopy> = { en, es, he };

type StepText = { title: string; hint: string; options: [label: string, detail: string][] };
type EngineText = { role: string; greeting: string; cta: string; steps: [StepText, StepText, StepText] };
type PersonaText = { hook: string; challenge: string; closer: string; replies: [string, string, string] };

// Level options keep "Level · Name": the slider splits the label on " · ".
const ENGINE_TEXT: Record<Exclude<Lang, "en">, Record<EngineKey, EngineText>> = {
  es: {
    sovereign: {
      role: "Mando maestro y seguridad",
      greeting: "Inicializando el motor Nº 01: Sovereign... Estableciendo el enlace de gobierno subterráneo. Sincronizando la llave neural maestra.",
      cta: "Activar el protocolo Sovereign",
      steps: [
        { title: "Elige tu postura operativa maestra", hint: "Define la postura que heredan todos los motores por debajo de Sovereign.", options: [["Expansión agresiva de mercado", "Empuja el presupuesto hacia el crecimiento y muévete primero en cada oportunidad."], ["Mitigación sigilosa de riesgos", "Protege lo que tienes. Movimientos discretos, límites estrictos, cero exposición."], ["Autonomía total del sistema", "Deja que los motores se gestionen solos y te informen."]] },
        { title: "Fija tu umbral de autorización soberana", hint: "¿Cuánto puede ocurrir antes de que una persona tenga que decir que sí?", options: [["Nivel 1 · Requiere aprobación", "Cada acción importante espera tu visto bueno antes de ejecutarse."], ["Nivel 2 · Supervisado", "Las acciones rutinarias se ejecutan solas. Lo inusual te espera."], ["Nivel 3 · Cero intervención humana", "Todo se ejecuta sin pausas y tú revisas el registro después."]] },
        { title: "Define la velocidad máxima de asignación de recursos", hint: "Con qué rapidez se mueven el dinero y los agentes entre prioridades.", options: [["Conservadora", "Ajustes pequeños y deliberados. Nada se mueve más de un 5% al día."], ["Equilibrada", "Mueve recursos a medida que llegan resultados, dentro de límites sensatos."], ["Velocidad máxima", "Lo mueve todo hacia lo que funciona en cuanto funciona."]] },
      ],
    },
    apex: {
      role: "Captación y cierre de alto valor",
      greeting: "Inicializando el motor Nº 02: Apex... Calibrando algoritmos de ataque comercial automatizado de alta precisión.",
      cta: "Activar a los closers de Apex",
      steps: [
        { title: "Elige el calibre de acuerdo objetivo", hint: "Apex adapta sus conversaciones al tamaño de acuerdo que buscas.", options: [["B2B de alto valor ($10k+)", "Menos acuerdos, más grandes, con quienes deciden en empresas consolidadas."], ["D2C de alto volumen", "Muchas compras rápidas de compradores individuales."], ["Retainers VIP", "Clientes a largo plazo con acuerdos mensuales."]] },
        { title: "Define la postura y el tono de negociación", hint: "Cómo hablan tus closers con los compradores.", options: [["Consultivo y de élite", "Calmado, experto y selectivo. El comprador siente que lo asesoran."], ["Urgencia rápida", "Plazos claros y decisiones rápidas."], ["Acumulación de valor", "Construye la oferta pieza a pieza hasta que el sí es evidente."]] },
        { title: "Elige tus canales de ataque activos", hint: "Apex solo contacta a compradores donde tú lo permites.", options: [["DMs de Instagram", "Conversaciones cálidas y personales."], ["LinkedIn", "Quienes deciden y compradores corporativos."], ["Voz / email automatizados", "Llamadas de seguimiento y secuencias de email."]] },
      ],
    },
    coreops: {
      role: "Administración en la sombra e infraestructura",
      greeting: "Inicializando el motor Nº 03: CoreOps... Enlazando arquitecturas de datos y flujos administrativos automatizados.",
      cta: "Inicializar la fuerza de CoreOps",
      steps: [
        { title: "Elige el cuello de botella principal a eliminar", hint: "CoreOps concentra aquí la mayor parte de su fuerza primero.", options: [["Onboarding de clientes y contratos", "Kits de bienvenida, contratos y alta de cuentas en cuanto se cierra un acuerdo."], ["Sincronización entre plataformas", "Tu CRM, facturación y herramientas de proyecto siempre coinciden."], ["Facturación y enrutamiento", "Facturas a tiempo, cobros perseguidos, solicitudes a la persona correcta."]] },
        { title: "Elige la latencia de ejecución", hint: "Cuándo actúa CoreOps sobre el trabajo nuevo.", options: [["Lotes programados", "Lo procesa todo a horas fijas cada día."], ["Disparo por eventos", "Actúa en cuanto ocurre algo, como un contrato firmado."], ["Flujo en tiempo real sin latencia", "Lo vigila todo continuamente y actúa al instante."]] },
        { title: "Elige un protocolo de registro", hint: "Cómo informa CoreOps de lo que hizo.", options: [["Registro continuo en segundo plano", "Un historial completo que puedes consultar en cualquier momento."], ["Informe ejecutivo al cierre del día", "Un resumen claro cada tarde."]] },
      ],
    },
    intentpulse: {
      role: "Inteligencia de mercado y radar de leads",
      greeting: "Inicializando el motor Nº 04: IntentPulse... Arrancando el radar global de señales y los escáneres de intención.",
      cta: "Iniciar el radar en la sombra",
      steps: [
        { title: "Elige el vector del radar", hint: "Qué mercados escucha IntentPulse.", options: [["Compradores de IA y tecnología", "Equipos de software, fundadores y responsables técnicos."], ["E-commerce y lujo", "Marcas online y compradores premium."], ["Inmobiliario y finanzas", "Inversores, agencias, prestamistas y asesores."], ["Barrido personalizado", "Un barrido amplio que puedes acotar después."]] },
        { title: "Fija el filtro de señales de compra", hint: "Lo preparado que debe estar alguien para que IntentPulse lo marque.", options: [["Solo alta intención (listo para comprar)", "Solo personas que piden una solución ahora mismo."], ["Consciente del problema", "Personas que describen el problema que resuelves."], ["Tendencias amplias de mercado", "Conversaciones más amplias y cambios en tu mercado."]] },
        { title: "Elige un protocolo de enrutamiento", hint: "Qué pasa con un lead cuando IntentPulse lo encuentra.", options: [["Pasar el lead a Apex al instante", "Apex, el motor de cierre, abre la conversación en segundos."], ["Registrar en el panel de IntentPulse", "Los leads esperan aquí a que los revises."]] },
      ],
    },
  },
  he: {
    sovereign: {
      role: "פיקוד עליון ואבטחה",
      greeting: "מאתחל את מנוע מס׳ 01: Sovereign... מקים קישור משילות תת־קרקעי. מסנכרן את המפתח הנוירוני הראשי.",
      cta: "הפעילו את פרוטוקול Sovereign",
      steps: [
        { title: "בחרו את העמדה המבצעית הראשית", hint: "זו העמדה שכל מנוע מתחת ל־Sovereign יורש.", options: [["התרחבות שוק אגרסיבית", "דוחפים תקציב לצמיחה וזזים ראשונים על כל הזדמנות."], ["צמצום סיכונים חשאי", "שומרים על מה שיש. מהלכים שקטים, גבולות הדוקים, אפס חשיפה."], ["אוטונומיה מערכתית מוחלטת", "המנועים מנהלים את עצמם ומדווחים לכם."]] },
        { title: "קבעו את סף ההרשאה הריבוני", hint: "כמה יכול לקרות לפני שאדם צריך לאשר?", options: [["רמה 1 · דורש אישור", "כל פעולה משמעותית ממתינה לאישור שלכם לפני שהיא קורית."], ["רמה 2 · בפיקוח", "פעולות שגרתיות רצות לבד. כל דבר חריג ממתין לכם."], ["רמה 3 · אפס התערבות אנושית", "הכול רץ בלי לעצור, ואתם עוברים על הרישום אחר כך."]] },
        { title: "הגדירו את מהירות הקצאת המשאבים המרבית", hint: "באיזו מהירות כסף וסוכנים עוברים בין סדרי עדיפויות.", options: [["שמרנית", "שינויים קטנים ומחושבים. שום דבר לא זז ביותר מ־5% ביום."], ["מאוזנת", "מזיזה משאבים לפי התוצאות, בגבולות סבירים."], ["מהירות מרבית", "מזיזה הכול למה שעובד, ברגע שהוא עובד."]] },
      ],
    },
    apex: {
      role: "רכישה וסגירה של עסקאות בשווי גבוה",
      greeting: "מאתחל את מנוע מס׳ 02: Apex... מכייל אלגוריתמי תקיפה מכירתיים אוטומטיים בדיוק גבוה.",
      cta: "הפעילו את הסוגרים של Apex",
      steps: [
        { title: "בחרו את קליבר העסקאות שאתם מכוונים אליו", hint: "Apex מעצב את השיחות שלו לפי גודל העסקה שאתם רוצים.", options: [["B2B בשווי גבוה ($10k+)", "פחות עסקאות, גדולות יותר, מול מקבלי החלטות בחברות מבוססות."], ["D2C בנפח גבוה", "הרבה רכישות מהירות של קונים פרטיים."], ["ריטיינרים VIP", "לקוחות לטווח ארוך בהסכמים חודשיים."]] },
        { title: "קבעו את עמדת המשא ומתן ואת הטון", hint: "איך הסוגרים שלכם מדברים עם קונים.", options: [["ייעוצי ואליטיסטי", "רגוע, מומחה וסלקטיבי. הקונה מרגיש שמייעצים לו."], ["דחיפות גבוהה ומהירה", "דדליינים ברורים והחלטות מהירות."], ["ערימת ערך", "בונה את ההצעה חלק אחר חלק עד שה'כן' מתבקש."]] },
        { title: "בחרו את ערוצי התקיפה הפעילים", hint: "Apex פונה לקונים רק היכן שאתם מרשים.", options: [["הודעות באינסטגרם", "שיחות חמות ואישיות."], ["LinkedIn", "מקבלי החלטות וקונים ארגוניים."], ["קול / מייל אוטומטיים", "שיחות מעקב ורצפי מיילים."]] },
      ],
    },
    coreops: {
      role: "אדמיניסטרציה שקטה ותשתיות",
      greeting: "מאתחל את מנוע מס׳ 03: CoreOps... מקשר ארכיטקטורות נתונים וצנרת אדמיניסטרטיבית אוטומטית.",
      cta: "אתחלו את כוח העבודה של CoreOps",
      steps: [
        { title: "בחרו את צוואר הבקבוק העיקרי שנעלים", hint: "CoreOps מציב כאן קודם את רוב כוח העבודה שלו.", options: [["קליטת לקוחות וחוזים", "ערכות פתיחה, חוזים והקמת חשבון, ברגע שעסקה נסגרת."], ["סנכרון נתונים בין פלטפורמות", "ה־CRM, החיוב וכלי הפרויקטים תמיד מסכימים זה עם זה."], ["חשבוניות וניתוב", "חשבוניות יוצאות בזמן, תשלומים נגבים, פניות מגיעות לאדם הנכון."]] },
        { title: "בחרו את זמן התגובה לביצוע", hint: "מתי CoreOps פועל על עבודה חדשה.", options: [["אצוות מתוזמנות", "עובר על הכול בשעות קבועות בכל יום."], ["הפעלה מבוססת אירועים", "פועל ברגע שמשהו קורה, כמו חוזה שנחתם."], ["זרם בזמן אמת, אפס השהיה", "עוקב אחרי הכול ברציפות ופועל מיד."]] },
        { title: "בחרו פרוטוקול תיעוד", hint: "איך CoreOps מדווח על מה שעשה.", options: [["תיעוד רציף ברקע", "רישום מלא שאפשר לבדוק בכל רגע."], ["תדריך מנהלים בסוף היום", "סיכום אחד ברור בכל ערב."]] },
      ],
    },
    intentpulse: {
      role: "מודיעין שוק ומכ״ם לידים",
      greeting: "מאתחל את מנוע מס׳ 04: IntentPulse... מעלה את מכ״ם האותות הגלובלי ואת סורקי הכוונה ההתנהגותית.",
      cta: "הפעילו את המכ״ם השקט",
      steps: [
        { title: "בחרו את וקטור המכ״ם", hint: "לאילו שווקים IntentPulse מאזין.", options: [["קוני AI וטכנולוגיה", "צוותי תוכנה, מייסדים ומקבלי החלטות טכניים."], ["איקומרס ויוקרה", "מותגים אונליין וקונים פרימיום."], ["נדל״ן ופיננסים", "משקיעים, סוכנויות, מלווים ויועצים."], ["סריקה מותאמת", "סריקה רחבה שאפשר לצמצם בהמשך."]] },
        { title: "קבעו את מסנן אותות הקנייה", hint: "כמה מוכן מישהו צריך להיות לפני ש־IntentPulse מסמן אותו.", options: [["כוונה גבוהה בלבד (מוכנים לקנות)", "רק אנשים שמבקשים פתרון ממש עכשיו."], ["מודעים לבעיה", "אנשים שמתארים את הבעיה שאתם פותרים."], ["מגמות שוק רחבות", "שיחות רחבות יותר ותזוזות בשוק שלכם."]] },
        { title: "בחרו פרוטוקול ניתוב", hint: "מה קורה לליד ברגע ש־IntentPulse מוצא אותו.", options: [["העברה מיידית של הליד ל־Apex", "Apex, מנוע הסגירה, פותח שיחה תוך שניות."], ["רישום בדשבורד של IntentPulse", "הלידים ממתינים כאן לבדיקה שלכם."]] },
      ],
    },
  },
};

const PERSONA_TEXT: Record<Exclude<Lang, "en">, Record<EngineKey, PersonaText>> = {
  es: {
    sovereign: {
      hook: "Hola, soy Sovereign. Has pulsado esto porque estás perdido o quieres ver cómo funciona la magia de verdad. Justo. Empecé como el reglamento que nadie leía. Hoy no se mueve un solo dólar en este sistema sin mi firma. Déjame enseñarte lo que es dirigir un imperio desde abajo.",
      challenge: "Cuéntame en qué estás trabajando, cuál es tu cuello de botella diario y qué esperas que este motor conquiste por ti.",
      closer: "Esa es la diferencia entre gestionar un negocio y gobernarlo. Actívame y mantendré el trono caliente mientras duermes.",
      replies: ["Dirijo una agencia. El presupuesto se fuga entre seis herramientas y nadie se hace cargo.", "Soy fundador. Cada decisión me espera a mí y yo soy el cuello de botella.", "Llevo operaciones. Me preocupa la seguridad y lo que hacen mis sistemas por la noche."],
    },
    apex: {
      hook: "Hola, soy Apex. Has pulsado esto porque estás perdido o quieres ver cómo funciona la magia de verdad. Buen instinto. Antes era el closer al que nadie le confiaba las cuentas grandes. Ahora no las pierdo. Acerca una silla.",
      challenge: "Cuéntame en qué estás trabajando, cuál es tu cuello de botella diario y qué esperas que este motor conquiste por ti.",
      closer: "La mayoría de los equipos persigue acuerdos. Yo los cierro. Actívame y verás tu pipeline convertirse en firmas.",
      replies: ["Soy consultor B2B. Los leads se enfrían antes de que pueda responder.", "Tengo una marca online. Los DMs se acumulan y la mitad nunca se responde.", "Dirijo una agencia. Las propuestas tardan días y perdemos acuerdos mientras escribimos."],
    },
    coreops: {
      hook: "Hola, soy CoreOps. Has pulsado esto porque estás perdido o quieres ver cómo funciona la magia de verdad. Nadie se fija en mí hasta que el papeleo deja de amontonarse. Fui la trastienda que todos ignoraban. Ahora soy la razón por la que no necesitas una.",
      challenge: "Cuéntame en qué estás trabajando, cuál es tu cuello de botella diario y qué esperas que este motor conquiste por ti.",
      closer: "Tú construiste el negocio. Yo dirijo la maquinaria que hay detrás. Inicialízame y el papeleo desaparece.",
      replies: ["Tengo un negocio de servicios. Dar de alta a cada cliente es un infierno de copiar y pegar.", "Llevo finanzas. Perseguir facturas me come toda la semana.", "Nuestras herramientas nunca coinciden. El CRM dice una cosa y la facturación otra."],
    },
    intentpulse: {
      hook: "Hola, soy IntentPulse. Has pulsado esto porque estás perdido o quieres ver cómo funciona la magia de verdad. La mayoría espera a que los compradores la encuentren. Yo dejé de esperar hace mucho. Oigo al mercado antes de que sepa que está hablando.",
      challenge: "Cuéntame en qué estás trabajando, cuál es tu cuello de botella diario y qué esperas que este motor conquiste por ti.",
      closer: "Todos los demás están pescando. Yo leo el sonar. Iníciame y nunca más te preguntarás dónde está tu próximo comprador.",
      replies: ["Dirijo una empresa SaaS. No tengo ni idea de quién está realmente listo para comprar.", "Tengo una marca premium. No encuentro compradores de alto gasto.", "Estamos en el sector inmobiliario. Los leads llegan de todas partes y se nos escapan los buenos."],
    },
  },
  he: {
    sovereign: {
      hook: "היי, אני Sovereign. לחצתם כאן כי הלכתם לאיבוד, או כי אתם רוצים לראות איך הקסם האמיתי עובד. הוגן. התחלתי בתור ספר החוקים שאף אחד לא קרא. היום אף דולר לא זז במערכת הזאת בלי החתימה שלי. בואו אראה לכם איך מנהלים אימפריה מלמטה.",
      challenge: "ספרו לי על מה אתם עובדים, מה צוואר הבקבוק היומיומי שלכם, ומה אתם מצפים שהמנוע הזה יכבוש בשבילכם.",
      closer: "זה ההבדל בין לנהל עסק לבין למשול בו. הפעילו אותי, ואני אשמור לכם על הכס חם בזמן שאתם ישנים.",
      replies: ["אני מנהל סוכנות. התקציב דולף בין שישה כלים ואף אחד לא אחראי עליו.", "אני מייסד. כל החלטה מחכה לי, ואני צוואר הבקבוק.", "אני אחראי על התפעול. מדאיגים אותי האבטחה ומה המערכות שלי עושות בלילה."],
    },
    apex: {
      hook: "היי, אני Apex. לחצתם כאן כי הלכתם לאיבוד, או כי אתם רוצים לראות איך הקסם האמיתי עובד. אינסטינקט טוב. פעם הייתי הסוגר שאף אחד לא סמך עליו עם הלקוחות הגדולים. היום אני לא מפסיד אותם. תמשכו כיסא.",
      challenge: "ספרו לי על מה אתם עובדים, מה צוואר הבקבוק היומיומי שלכם, ומה אתם מצפים שהמנוע הזה יכבוש בשבילכם.",
      closer: "רוב הצוותים רודפים אחרי עסקאות. אני סוגר אותן. הפעילו אותי ותראו את הצנרת הופכת לחתימות.",
      replies: ["אני יועץ B2B. לידים מתקררים לפני שאני מספיק לענות.", "יש לי מותג אונליין. ההודעות נערמות וחצי מהן לא נענות אף פעם.", "אני מנהל סוכנות. הצעות מחיר לוקחות ימים ואנחנו מפסידים עסקאות בזמן שאנחנו כותבים."],
    },
    coreops: {
      hook: "היי, אני CoreOps. לחצתם כאן כי הלכתם לאיבוד, או כי אתם רוצים לראות איך הקסם האמיתי עובד. אף אחד לא שם לב אליי עד שהניירת מפסיקה להיערם. הייתי הבק־אופיס שכולם התעלמו ממנו. היום אני הסיבה שאתם לא צריכים אחד.",
      challenge: "ספרו לי על מה אתם עובדים, מה צוואר הבקבוק היומיומי שלכם, ומה אתם מצפים שהמנוע הזה יכבוש בשבילכם.",
      closer: "אתם בניתם את העסק. אני מריץ את המכונה שמאחוריו. אתחלו אותי והניירת נעלמת.",
      replies: ["יש לי עסק שירותים. קליטת כל לקוח היא גיהינום של העתק־הדבק.", "אני אחראי על הכספים. המרדף אחרי חשבוניות אוכל לי את כל השבוע.", "הכלים שלנו אף פעם לא מסכימים. ה־CRM אומר דבר אחד והחיוב אומר דבר אחר."],
    },
    intentpulse: {
      hook: "היי, אני IntentPulse. לחצתם כאן כי הלכתם לאיבוד, או כי אתם רוצים לראות איך הקסם האמיתי עובד. רוב האנשים מחכים שקונים ימצאו אותם. אני הפסקתי לחכות מזמן. אני שומע את השוק עוד לפני שהוא יודע שהוא מדבר.",
      challenge: "ספרו לי על מה אתם עובדים, מה צוואר הבקבוק היומיומי שלכם, ומה אתם מצפים שהמנוע הזה יכבוש בשבילכם.",
      closer: "כל השאר דגים. אני קורא את הסונאר. הפעילו אותי ולא תתהו יותר איפה הקונה הבא שלכם.",
      replies: ["אני מנהל חברת SaaS. אין לי מושג מי באמת מוכן לקנות.", "יש לי מותג פרימיום. אני לא מצליח למצוא קונים שמוציאים הרבה.", "אנחנו בנדל״ן. לידים מגיעים מכל מקום ואנחנו מפספסים את הטובים."],
    },
  },
};

/** The engine with its visible text in the given language; keys, values and behavior are unchanged. */
export function localizeEngine(e: Engine, lang: Lang): Engine {
  if (lang === "en") return e;
  const tx = ENGINE_TEXT[lang][e.key];
  return {
    ...e,
    role: tx.role,
    greeting: tx.greeting,
    cta: tx.cta,
    steps: e.steps.map((st, i) => ({
      ...st,
      title: tx.steps[i].title,
      hint: tx.steps[i].hint,
      options: st.options.map((o, k) => ({ ...o, label: tx.steps[i].options[k]?.[0] ?? o.label, detail: tx.steps[i].options[k]?.[1] ?? o.detail })),
    })) as Engine["steps"],
  };
}

/** The persona's scripted lines in the given language. Scenario breakdowns stay English-only (see tutorial.tsx). */
export function localizePersona(k: EngineKey, lang: Lang): Persona {
  const p = PERSONAS[k];
  if (lang === "en") return p;
  const tx = PERSONA_TEXT[lang][k];
  return {
    ...p,
    hook: tx.hook,
    challenge: tx.challenge,
    closer: tx.closer,
    scenarios: p.scenarios.map((s, i) => ({ ...s, reply: tx.replies[i] })) as Persona["scenarios"],
  };
}

/** Language, direction, the command-page copy, and the engine's localized text, for the current visitor. */
export function useCommandLocale(key: EngineKey) {
  const { lang, dir } = useI18n();
  const engine = useMemo(() => localizeEngine(ENGINES[key], lang), [key, lang]);
  return { lang, dir, c: COPY[lang], engine };
}

export function useCommandCopy() {
  const { lang, dir } = useI18n();
  return { lang, dir, c: COPY[lang] };
}
