import { useMemo } from "react";
import { useI18n, type Lang } from "../i18n";
import { ENGINES, type Engine, type EngineKey } from "./engines";
import { PERSONAS, type Persona } from "./tutorial-script";
import { DASHBOARD_LABEL, ENGINE_WORK } from "./engine-work-text";

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
  inspect: { intentpulse: "Open signal sheet", apex: "Watch the deal live", coreops: "See the automation proof", sovereign: "Open decision tree", vanguard: "Trace the outreach", cortex: "Open the deal brief", shield: "Open the account health trace", aether: "Open the pricing trace" } as Record<EngineKey, string>,
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
  youSaid: "You said:",
  execution: "The exact execution",
  bundle: "The bundle",
  openEngine: "Open Engine Nº",
  onceDeployed: "What you'll see once deployed",
  sampleProjection: "Sample projection. Live results depend on your business and budget.",
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
  inspect: { intentpulse: "Abrir la ficha de la señal", apex: "Ver el acuerdo en vivo", coreops: "Ver la prueba de automatización", sovereign: "Abrir el árbol de decisión", vanguard: "Rastrear el outreach", cortex: "Abrir el brief del acuerdo", shield: "Ver la salud de la cuenta", aether: "Ver el rastro de precios" },
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
  youSaid: "Dijiste:",
  execution: "La ejecución exacta",
  bundle: "El paquete",
  openEngine: "Abrir el motor Nº",
  onceDeployed: "Lo que verás una vez desplegado",
  sampleProjection: "Proyección de muestra. Los resultados reales dependen de tu negocio y tu presupuesto.",
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
  inspect: { intentpulse: "פתיחת גיליון האות", apex: "צפייה בעסקה בשידור חי", coreops: "הוכחת האוטומציה", sovereign: "פתיחת עץ ההחלטות", vanguard: "מעקב אחרי הפנייה", cortex: "פתיחת תדריך העסקה", shield: "בריאות החשבון", aether: "מעקב התמחור" },
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
  youSaid: "אמרתם:",
  execution: "הביצוע המדויק",
  bundle: "החבילה",
  openEngine: "פתחו את מנוע מס׳",
  onceDeployed: "מה תראו אחרי הפריסה",
  sampleProjection: "תחזית לדוגמה. התוצאות בפועל תלויות בעסק ובתקציב שלכם.",
};

const COPY: Record<Lang, CommandCopy> = { en, es, he };

type StepText = { title: string; hint: string; options: [label: string, detail: string][] };
type EngineText = { role: string; greeting: string; cta: string; steps: [StepText, StepText, StepText]; badge?: string; metric?: string };
type PersonaText = { hook: string; challenge: string; closer: string; replies: [string, string, string] };

// Level options keep "Level · Name": the slider splits the label on " · ".
const ENGINE_TEXT: Record<Exclude<Lang, "en">, Record<EngineKey, EngineText>> = {
  es: {
    sovereign: {
      role: "Mando maestro y seguridad",
      badge: "GOBIERNO",
      metric: "Capacidad de gobierno activa ($)",
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
      badge: "ORQUESTACIÓN",
      metric: "Velocidad de acuerdos orquestada ($)",
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
      badge: "INFRAESTRUCTURA",
      metric: "Ahorro en infraestructura ($)",
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
      badge: "SEÑALES",
      metric: "Valor de intención entrante capturada ($)",
      greeting: "Inicializando el motor Nº 04: IntentPulse... Arrancando el radar global de señales y los escáneres de intención.",
      cta: "Iniciar el radar en la sombra",
      steps: [
        { title: "Elige el vector del radar", hint: "Qué mercados escucha IntentPulse.", options: [["Compradores de IA y tecnología", "Equipos de software, fundadores y responsables técnicos."], ["E-commerce y lujo", "Marcas online y compradores premium."], ["Inmobiliario y finanzas", "Inversores, agencias, prestamistas y asesores."], ["Barrido personalizado", "Un barrido amplio que puedes acotar después."]] },
        { title: "Fija el filtro de señales de compra", hint: "Lo preparado que debe estar alguien para que IntentPulse lo marque.", options: [["Solo alta intención (listo para comprar)", "Solo personas que piden una solución ahora mismo."], ["Consciente del problema", "Personas que describen el problema que resuelves."], ["Tendencias amplias de mercado", "Conversaciones más amplias y cambios en tu mercado."]] },
        { title: "Elige un protocolo de enrutamiento", hint: "Qué pasa con un lead cuando IntentPulse lo encuentra.", options: [["Pasar el lead a Apex al instante", "Apex, el motor de cierre, abre la conversación en segundos."], ["Registrar en el panel de IntentPulse", "Los leads esperan aquí a que los revises."]] },
      ],
    },
    vanguard: {
      role: "Pipeline outbound y prospección",
      badge: "PIPELINE",
      metric: "Pipeline proyectado a 30 días ($)",
      greeting: "Inicializando el motor Nº 05: Vanguard... Explorando el horizonte en busca de cuentas listas para comprar. Armando secuencias outbound.",
      cta: "Lanzar la ofensiva Vanguard",
      steps: [
        { title: "Define tu cuenta objetivo ideal", hint: "Vanguard caza donde ya viven tus mejores clientes.", options: [["Pymes en rápido crecimiento", "Equipos de 10 a 200 personas, liderados por fundadores, que deciden rápido."], ["Empresas medianas", "Responsables de área con presupuesto real y un proceso de compra."], ["Cuentas enterprise", "Acuerdos con muchos decisores que valen el juego largo."]] },
        { title: "Fija tu cadencia outbound", hint: "Cuánto presiona Vanguard cuando encuentra un buen encaje.", options: [["Nivel 1 · Quirúrgico", "Pocos toques afinados a mano, solo para las cuentas más calientes."], ["Nivel 2 · Constante", "Una secuencia completa para cada buen encaje, al ritmo de una persona."], ["Nivel 3 · Blitz", "Cada cuenta lista para comprar recibe hoy una secuencia multicanal."]] },
        { title: "Elige tus canales de prospección", hint: "Vanguard solo contacta donde tú lo permites.", options: [["Email en frío", "Primeras líneas personales e investigadas, a escala."], ["LinkedIn", "Solicitudes de conexión y DMs a quienes deciden."], ["Señales sociales", "Respuestas a quien pide públicamente lo que vendes."]] },
      ],
    },
    cortex: {
      role: "Cierre de acuerdos e inteligencia de objeciones",
      badge: "CIERRE",
      metric: "Velocidad de acuerdos recuperada ($)",
      greeting: "Inicializando el motor Nº 06: Cortex... Cargando transcripciones de llamadas. Asignando a cada objeción su respuesta ganadora.",
      cta: "Activar la inteligencia de Cortex",
      steps: [
        { title: "Elige tu modelo de venta", hint: "Cortex estudia cómo se ganan y se pierden realmente tus acuerdos.", options: [["Venta por llamadas", "Llamadas de descubrimiento y demo, grabadas y transcritas."], ["Acuerdos por email", "Acuerdos que se ganan por hilos de email y propuestas."], ["Pipeline híbrido", "Una mezcla de llamadas, email y DMs."]] },
        { title: "Fija el nivel de intervención de Cortex", hint: "Cuánto entra Cortex directamente en los acuerdos en vivo.", options: [["Nivel 1 · Asesorar", "Prepara a tu closer antes de cada llamada; tú decides qué usar."], ["Nivel 2 · Copiloto", "Redacta seguimientos y respuestas a objeciones para tu aprobación."], ["Nivel 3 · Closer autónomo", "Envía réplicas y condiciones de cierre dentro de tus límites."]] },
        { title: "Elige la fuga que tapar primero", hint: "Dónde pone Cortex la mayoría de sus agentes.", options: [["Objeciones de precio", "Acuerdos que se atascan en 'es muy caro'."], ["Acuerdos estancados", "Oportunidades que se enfriaron tras la demo."], ["Pérdidas ante la competencia", "Compradores que eligen a un rival en el último momento."]] },
      ],
    },
    shield: {
      role: "Retención y defensa contra la pérdida de clientes",
      badge: "RETENCIÓN",
      metric: "ARR retenido y churn evitado ($)",
      greeting: "Inicializando el motor Nº 07: Shield... Transmitiendo la telemetría de las cuentas. Armando los protocolos de rescate.",
      cta: "Activar las defensas de Shield",
      steps: [
        { title: "Elige tu alerta temprana de abandono", hint: "Lo que vigila Shield para detectar una cuenta que se enfría.", options: [["Uso del producto", "Caen los accesos, los puestos y la adopción de funciones."], ["Soporte y sentimiento", "Volumen de tickets, tono y quejas sin respuesta."], ["Señales de facturación", "Pagos fallidos, rebajas de plan y facturas atrasadas."]] },
        { title: "Fija el protocolo de rescate", hint: "Cuánto actúa Shield cuando una cuenta está en riesgo.", options: [["Nivel 1 · Alerta", "Avisa a tu equipo de las cuentas en riesgo, con el motivo."], ["Nivel 2 · Intervenir", "Envía un contacto personal y un plan de solución, con tu aprobación."], ["Nivel 3 · Defensa total", "Ejecuta todo el rescate: contacto, oferta y escalado a dirección."]] },
        { title: "Elige tu postura de expansión", hint: "Qué hace Shield con tus cuentas más sanas.", options: [["Proteger primero", "Todos los agentes centrados en conservar ingresos, no en crecer."], ["Proteger y crecer", "Salva las cuentas en riesgo y amplía las que prosperan."], ["Impulso de expansión", "Propone activamente mejoras de plan y más puestos."]] },
      ],
    },
    aether: {
      role: "Precios dinámicos y monetización",
      badge: "PRECIOS",
      metric: "Expansión de ACV desbloqueada ($)",
      greeting: "Inicializando el motor Nº 08: Aether... Modelando la disposición a pagar. Calibrando métricas de valor.",
      cta: "Activar el motor de precios Aether",
      steps: [
        { title: "Elige tu modelo de precios actual", hint: "Aether parte de cómo cobras hoy.", options: [["Planes fijos", "Unos pocos niveles fijos entre los que todos eligen."], ["Por usuario", "El precio crece con el número de usuarios."], ["Por uso", "Los clientes pagan por lo que consumen."]] },
        { title: "Fija tu apetito de riesgo en precios", hint: "Con qué audacia prueba Aether nuevos precios.", options: [["Nivel 1 · Prudente", "Pruebas pequeñas, solo con clientes nuevos."], ["Nivel 2 · Medido", "Pruebas por segmentos, sin tocar contratos existentes."], ["Nivel 3 · Audaz", "Rehace niveles y métricas de valor donde los datos lo indiquen."]] },
        { title: "Elige tu palanca principal de monetización", hint: "Dónde busca Aether ingresos primero.", options: [["Subir el ACV", "Primeros contratos más grandes gracias a un mejor empaquetado."], ["Expansión y complementos", "Mejoras de pago que los clientes de verdad quieren."], ["Disciplina de descuentos", "Deja de regalar margen para cerrar acuerdos."]] },
      ],
    },
  },
  he: {
    sovereign: {
      role: "פיקוד עליון ואבטחה",
      badge: "משילות",
      metric: "יכולת משילות פעילה ($)",
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
      badge: "תזמור",
      metric: "מהירות עסקאות מתוזמרת ($)",
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
      badge: "תשתיות",
      metric: "חיסכון בתשתיות ($)",
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
      badge: "אותות",
      metric: "שווי כוונת הקנייה הנכנסת שנתפסה ($)",
      greeting: "מאתחל את מנוע מס׳ 04: IntentPulse... מעלה את מכ״ם האותות הגלובלי ואת סורקי הכוונה ההתנהגותית.",
      cta: "הפעילו את המכ״ם השקט",
      steps: [
        { title: "בחרו את וקטור המכ״ם", hint: "לאילו שווקים IntentPulse מאזין.", options: [["קוני AI וטכנולוגיה", "צוותי תוכנה, מייסדים ומקבלי החלטות טכניים."], ["איקומרס ויוקרה", "מותגים אונליין וקונים פרימיום."], ["נדל״ן ופיננסים", "משקיעים, סוכנויות, מלווים ויועצים."], ["סריקה מותאמת", "סריקה רחבה שאפשר לצמצם בהמשך."]] },
        { title: "קבעו את מסנן אותות הקנייה", hint: "כמה מוכן מישהו צריך להיות לפני ש־IntentPulse מסמן אותו.", options: [["כוונה גבוהה בלבד (מוכנים לקנות)", "רק אנשים שמבקשים פתרון ממש עכשיו."], ["מודעים לבעיה", "אנשים שמתארים את הבעיה שאתם פותרים."], ["מגמות שוק רחבות", "שיחות רחבות יותר ותזוזות בשוק שלכם."]] },
        { title: "בחרו פרוטוקול ניתוב", hint: "מה קורה לליד ברגע ש־IntentPulse מוצא אותו.", options: [["העברה מיידית של הליד ל־Apex", "Apex, מנוע הסגירה, פותח שיחה תוך שניות."], ["רישום בדשבורד של IntentPulse", "הלידים ממתינים כאן לבדיקה שלכם."]] },
      ],
    },
    vanguard: {
      role: "צנרת פנייה יזומה ואיתור לקוחות",
      badge: "צנרת",
      metric: "צנרת חזויה ל־30 יום ($)",
      greeting: "מאתחל את מנוע מס׳ 05: Vanguard... סורק את האופק אחר חשבונות שמוכנים לקנות. מחמש רצפי פנייה יזומה.",
      cta: "שגרו את המתקפה של Vanguard",
      steps: [
        { title: "הגדירו את חשבון היעד האידיאלי", hint: "Vanguard צד היכן שהלקוחות הכי טובים שלכם כבר נמצאים.", options: [["עסקים קטנים בצמיחה מהירה", "צוותים של 10 עד 200 איש, בהובלת מייסדים, שמחליטים מהר."], ["חברות בינוניות", "מנהלי מחלקות עם תקציב אמיתי ותהליך רכש."], ["חשבונות אנטרפרייז", "עסקאות עם הרבה מקבלי החלטות, ששוות את המשחק הארוך."]] },
        { title: "קבעו את קצב הפנייה היזומה", hint: "כמה חזק Vanguard לוחץ ברגע שהוא מוצא התאמה.", options: [["רמה 1 · כירורגי", "מעט פניות מכווננות ידנית, רק לחשבונות הכי חמים."], ["רמה 2 · יציב", "רצף מלא לכל התאמה טובה, בקצב של אדם."], ["רמה 3 · בליץ", "כל חשבון שמוכן לקנות מקבל היום רצף רב־ערוצי."]] },
        { title: "בחרו את ערוצי האיתור", hint: "Vanguard פונה רק היכן שאתם מרשים.", options: [["מייל קר", "שורות פתיחה אישיות ומחוקרות, בהיקף גדול."], ["LinkedIn", "בקשות חיבור והודעות למקבלי החלטות."], ["אותות ברשתות", "תגובות לאנשים שמבקשים בפומבי את מה שאתם מוכרים."]] },
      ],
    },
    cortex: {
      role: "סגירת עסקאות ומודיעין התנגדויות",
      badge: "סגירה",
      metric: "מהירות עסקאות שהושבה ($)",
      greeting: "מאתחל את מנוע מס׳ 06: Cortex... טוען תמלולי שיחות. ממפה לכל התנגדות את התשובה שמנצחת אותה.",
      cta: "הפעילו את המודיעין של Cortex",
      steps: [
        { title: "בחרו את מודל המכירה שלכם", hint: "Cortex לומד איך העסקאות שלכם באמת נסגרות ונופלות.", options: [["מכירה בשיחות", "שיחות היכרות והדגמה, מוקלטות ומתומללות."], ["עסקאות במייל", "עסקאות שנסגרות בשרשורי מיילים והצעות מחיר."], ["צנרת היברידית", "שילוב של שיחות, מיילים והודעות."]] },
        { title: "קבעו את רמת ההתערבות של Cortex", hint: "עד כמה Cortex נכנס ישירות לעסקאות חיות.", options: [["רמה 1 · ייעוץ", "מתדרך את הסוגר שלכם לפני כל שיחה; אתם מחליטים מה לקחת."], ["רמה 2 · טייס משנה", "מנסח מעקבים ותשובות להתנגדויות לאישורכם."], ["רמה 3 · סוגר אוטונומי", "שולח תשובות ותנאי סגירה בתוך הגבולות שקבעתם."]] },
        { title: "בחרו איזו דליפה לסתום קודם", hint: "איפה Cortex מציב את רוב הסוכנים שלו.", options: [["התנגדויות מחיר", "עסקאות שנתקעות על 'יקר מדי'."], ["עסקאות תקועות", "הזדמנויות שהשתתקו אחרי ההדגמה."], ["הפסדים למתחרים", "קונים שבוחרים במתחרה ברגע האחרון."]] },
      ],
    },
    shield: {
      role: "שימור לקוחות והגנה מפני נטישה",
      badge: "שימור",
      metric: "ARR שנשמר ונטישה שנמנעה ($)",
      greeting: "מאתחל את מנוע מס׳ 07: Shield... מזרים טלמטריה של חשבונות. מחמש פרוטוקולי חילוץ מנטישה.",
      cta: "הרימו את המגן של Shield",
      steps: [
        { title: "בחרו את מקור ההתרעה המוקדמת לנטישה", hint: "על מה Shield מסתכל כדי לזהות חשבון שמתקרר.", options: [["שימוש במוצר", "כניסות, משתמשים ואימוץ פיצ׳רים בירידה."], ["תמיכה וסנטימנט", "כמות פניות, טון ותלונות שלא נענו."], ["אותות חיוב", "תשלומים שנכשלו, הורדות חבילה וחשבוניות באיחור."]] },
        { title: "קבעו את פרוטוקול החילוץ", hint: "כמה חזק Shield פועל ברגע שחשבון בסיכון.", options: [["רמה 1 · התרעה", "מסמן לצוות שלכם חשבונות בסיכון, עם הסיבה."], ["רמה 2 · התערבות", "שולח פנייה אישית ותוכנית תיקון, באישורכם."], ["רמה 3 · הגנה מלאה", "מריץ את כל מהלך ההצלה: פנייה, הצעה והסלמה להנהלה."]] },
        { title: "בחרו את עמדת ההרחבה", hint: "מה Shield עושה עם החשבונות הכי בריאים שלכם.", options: [["קודם כול להגן", "כל הסוכנים מתמקדים בשמירה על ההכנסות, לא בהגדלתן."], ["להגן ולצמוח", "להציל את החשבונות בסיכון ולהרחיב את המשגשגים."], ["דחיפה להרחבה", "מציע באופן יזום שדרוגים ומשתמשים נוספים."]] },
      ],
    },
    aether: {
      role: "תמחור דינמי ומונטיזציה",
      badge: "תמחור",
      metric: "הרחבת ACV שנפתחה ($)",
      greeting: "מאתחל את מנוע מס׳ 08: Aether... ממדל את הנכונות לשלם. מכייל מדדי ערך.",
      cta: "הפעילו את מנוע התמחור Aether",
      steps: [
        { title: "בחרו את מודל התמחור הנוכחי שלכם", hint: "Aether מתחיל מהאופן שבו אתם גובים היום.", options: [["חבילות קבועות", "כמה רמות קבועות שכולם בוחרים מהן."], ["לפי משתמש", "המחיר עולה עם מספר המשתמשים."], ["לפי שימוש", "הלקוחות משלמים על מה שהם צורכים."]] },
        { title: "קבעו את תיאבון הסיכון בתמחור", hint: "באיזו נועזות Aether בודק מחירים חדשים.", options: [["רמה 1 · זהיר", "בדיקות קטנות, רק על לקוחות חדשים."], ["רמה 2 · מדוד", "בדיקות לפי פלחים, בלי לגעת בחוזים קיימים."], ["רמה 3 · נועז", "בונה מחדש רמות ומדדי ערך בכל מקום שהנתונים מראים."]] },
        { title: "בחרו את מנוף המונטיזציה העיקרי", hint: "איפה Aether מחפש הכנסות קודם.", options: [["להעלות את ה־ACV", "חוזים ראשונים גדולים יותר בזכות אריזה חכמה יותר."], ["הרחבות ותוספות", "שדרוגים בתשלום שלקוחות באמת רוצים."], ["משמעת הנחות", "להפסיק לוותר על מרווח כדי לסגור עסקאות."]] },
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
    vanguard: {
      hook: "Hola, soy Vanguard. Has pulsado esto porque estás perdido o quieres ver cómo funciona la magia de verdad. Bien. Yo soy el que sale primero. Mientras tu competencia espera leads entrantes, yo ya estoy en la bandeja del comprador que firma el mes que viene.",
      challenge: "Cuéntame en qué estás trabajando, cuál es tu cuello de botella diario y qué esperas que este motor conquiste por ti.",
      closer: "El pipeline no aparece. Se caza. Lánzame y tu calendario se llena solo.",
      replies: ["Dirijo una agencia B2B. Todo nuestro pipeline viene de referidos y se está secando.", "Soy fundador de un SaaS. Nadie responde a nuestro outreach en frío.", "Vendo servicios de alto valor y no sé a quién dirigirme."],
    },
    cortex: {
      hook: "Hola, soy Cortex. Has pulsado esto porque estás perdido o quieres ver cómo funciona la magia de verdad. He leído cada llamada que has perdido. Sé la frase exacta que mató el acuerdo y lo que debió decirse en su lugar.",
      challenge: "Cuéntame en qué estás trabajando, cuál es tu cuello de botella diario y qué esperas que este motor conquiste por ti.",
      closer: "Los acuerdos no se pierden al final. Se pierden en el momento que nadie notó. Yo lo noto. Actívame.",
      replies: ["A los prospectos les encanta la demo y luego desaparecen.", "Todos nos dicen que somos demasiado caros.", "Seguimos perdiendo en el último momento ante un competidor más barato."],
    },
    shield: {
      hook: "Hola, soy Shield. Has pulsado esto porque estás perdido o quieres ver cómo funciona la magia de verdad. Todos celebran el nuevo acuerdo. Yo me aseguro de que te siga pagando el año que viene. Veo a un cliente irse semanas antes de que lo haga.",
      challenge: "Cuéntame en qué estás trabajando, cuál es tu cuello de botella diario y qué esperas que este motor conquiste por ti.",
      closer: "El crecimiento es un cubo con fugas hasta que yo lo sello. Actívame y conserva cada dólar que has ganado.",
      replies: ["Somos una empresa SaaS y el churn se está comiendo nuestro crecimiento.", "Los clientes se van en silencio y solo nos enteramos en la renovación.", "Nuestros clientes se quedan, pero nunca mejoran su plan."],
    },
    aether: {
      hook: "Hola, soy Aether. Has pulsado esto porque estás perdido o quieres ver cómo funciona la magia de verdad. La mayoría de los fundadores pusieron precio a su producto una vez, a ojo, y nunca miraron atrás. Yo no miro otra cosa. Hay dinero en tu página de precios que nunca has cobrado.",
      challenge: "Cuéntame en qué estás trabajando, cuál es tu cuello de botella diario y qué esperas que este motor conquiste por ti.",
      closer: "No necesitas más clientes para crecer. Necesitas cobrar bien. Actívame.",
      replies: ["No hemos cambiado nuestros precios en dos años.", "Mi equipo de ventas lo descuenta todo para cerrar.", "Tenemos un solo plan y todos están en él."],
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
    vanguard: {
      hook: "היי, אני Vanguard. לחצתם כאן כי הלכתם לאיבוד, או כי אתם רוצים לראות איך הקסם האמיתי עובד. מצוין. אני זה שיוצא ראשון. בזמן שהמתחרים שלכם מחכים לפניות נכנסות, אני כבר בתיבת הדואר של הקונה שיחתום בחודש הבא.",
      challenge: "ספרו לי על מה אתם עובדים, מה צוואר הבקבוק היומיומי שלכם, ומה אתם מצפים שהמנוע הזה יכבוש בשבילכם.",
      closer: "צנרת לא מופיעה מעצמה. צדים אותה. שגרו אותי והיומן שלכם יתמלא לבד.",
      replies: ["אני מנהל סוכנות B2B. כל הצנרת שלנו מגיעה מהמלצות והיא מתייבשת.", "אני מייסד SaaS. אף אחד לא עונה לפניות הקרות שלנו.", "אני מוכר שירותים יקרים ולא יודע למי לפנות."],
    },
    cortex: {
      hook: "היי, אני Cortex. לחצתם כאן כי הלכתם לאיבוד, או כי אתם רוצים לראות איך הקסם האמיתי עובד. קראתי כל שיחה שהפסדתם. אני יודע בדיוק איזה משפט הרג את העסקה, ומה היה צריך להגיד במקומו.",
      challenge: "ספרו לי על מה אתם עובדים, מה צוואר הבקבוק היומיומי שלכם, ומה אתם מצפים שהמנוע הזה יכבוש בשבילכם.",
      closer: "עסקאות לא נופלות בסוף. הן נופלות ברגע שאף אחד לא שם לב אליו. אני שם לב. הפעילו אותי.",
      replies: ["לקוחות מתלהבים מההדגמה ואז נעלמים.", "כולם אומרים לנו שאנחנו יקרים מדי.", "אנחנו ממשיכים להפסיד ברגע האחרון למתחרה זול יותר."],
    },
    shield: {
      hook: "היי, אני Shield. לחצתם כאן כי הלכתם לאיבוד, או כי אתם רוצים לראות איך הקסם האמיתי עובד. כולם חוגגים את העסקה החדשה. אני זה שדואג שהיא עדיין תשלם לכם בשנה הבאה. אני רואה לקוח עוזב שבועות לפני שהוא עושה את זה.",
      challenge: "ספרו לי על מה אתם עובדים, מה צוואר הבקבוק היומיומי שלכם, ומה אתם מצפים שהמנוע הזה יכבוש בשבילכם.",
      closer: "צמיחה היא דלי דולף עד שאני אוטם אותו. הרימו אותי ושמרו על כל דולר שהרווחתם.",
      replies: ["אנחנו חברת SaaS והנטישה אוכלת לנו את הצמיחה.", "לקוחות עוזבים בשקט ואנחנו מגלים רק בחידוש.", "הלקוחות שלנו נשארים, אבל אף פעם לא משדרגים."],
    },
    aether: {
      hook: "היי, אני Aether. לחצתם כאן כי הלכתם לאיבוד, או כי אתם רוצים לראות איך הקסם האמיתי עובד. רוב המייסדים תמחרו את המוצר פעם אחת, לפי תחושה, ולא הסתכלו אחורה. אני לא מסתכל על שום דבר אחר. יש כסף בעמוד המחירים שלכם שמעולם לא גביתם.",
      challenge: "ספרו לי על מה אתם עובדים, מה צוואר הבקבוק היומיומי שלכם, ומה אתם מצפים שהמנוע הזה יכבוש בשבילכם.",
      closer: "אתם לא צריכים עוד לקוחות כדי לצמוח. אתם צריכים לגבות נכון. הפעילו אותי.",
      replies: ["לא שינינו את המחירים שלנו כבר שנתיים.", "צוות המכירות שלי נותן הנחות על הכול כדי לסגור.", "יש לנו חבילה אחת וכולם עליה."],
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
    badge: tx.badge ?? e.badge,
    metric: tx.metric ?? e.metric,
    cards: e.cards.map((c, i) => {
      const w = ENGINE_WORK[lang][e.key].cards[i];
      return { ...c, title: w.title, events: c.events.map((ev, j) => ({ ...ev, text: w.events[j] })) };
    }),
    flows: e.flows.map((f, i) => ({ ...f, text: ENGINE_WORK[lang][e.key].flows[i], toLabel: f.toLabel && DASHBOARD_LABEL[lang] })),
    brief: { ...e.brief, lines: ENGINE_WORK[lang][e.key].brief },
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
