import type { Lang } from "@/components/bloom/i18n";
import { useCommandCopy } from "@/components/bloom/command/locale";

/**
 * The Operating Desk's own copy in every language: header, navigation, each pillar's title block and the Home
 * stage. Spanish and Hebrew are typed against English, so a missing key fails the type-check; nothing falls back to
 * English at runtime. Brand names (Bloom AI, the engine names, Shadow Board) stay as they are.
 */

export type NavHref =
  | "/desk"
  | "/desk/shadow-board"
  | "/desk/assistant"
  | "/desk/demo"
  | "/desk/architectures"
  | "/desk/engines"
  | "/desk/builder"
  | "/desk/exchange-scout"
  | "/desk/global-pulse"
  | "/desk/threat-matrix"
  | "/desk/vector-memory"
  | "/desk/explore"
  | "/desk/audit"
  | "/desk/settings";
export type NavGroupKey = "Command" | "Products" | "Pulse & Threats" | "System";
export type PageRoute =
  | "/desk/architectures"
  | "/desk/assistant"
  | "/desk/audit"
  | "/desk/diagnostics"
  | "/desk/builder"
  | "/desk/exchange-scout"
  | "/desk/sandbox"
  | "/desk/engines"
  | "/desk/explore"
  | "/desk/explore/engines"
  | "/desk/explore/architectures"
  | "/desk/global-pulse"
  | "/desk/settings"
  | "/desk/shadow-board"
  | "/desk/threat-matrix"
  | "/desk/vector-memory";
/** A pillar's title block. `{n}` and `{city}` are filled in from the page. */
export type Page = { kicker: string; title: string; lede: string };
type Status = "running" | "done" | "failed";

const en = {
  shell: {
    sla: "SLA",
    slaState: { nominal: "nominal", degraded: "degraded", offline: "offline" } as Record<string, string>,
    latency: "Global latency",
    nodes: "Active nodes",
    environment: "Environment",
    demo: (on: boolean) => `Demo ${on ? "on" : "off"}`,
    actingAs: "Acting as",
    setup: "Finish setting up this workspace: license, provider keys, branding and a diagnostics check.",
    setupCta: "Start guided setup",
  },
  groups: { Command: "Command", Products: "Products", "Pulse & Threats": "Pulse & Threats", System: "System" } as Record<NavGroupKey, string>,
  /** Menu labels and short names, by route. */
  nav: {
    "/desk": { label: "Home", name: "Home" },
    "/desk/shadow-board": { label: "Shadow Board", name: "Shadow Board" },
    "/desk/assistant": { label: "Local Assistant", name: "Local Assistant" },
    "/desk/demo": { label: "Demo Deck", name: "Demo Deck" },
    "/desk/architectures": { label: "Architectures (10 Stacks)", name: "Architectures" },
    "/desk/engines": { label: "Engine Network (8 Engines)", name: "Engine Network" },
    "/desk/builder": { label: "Pipeline Builder", name: "Pipeline Builder" },
    "/desk/exchange-scout": { label: "Exchange Scout", name: "Exchange Scout" },
    "/desk/global-pulse": { label: "Global Pulse", name: "Global Pulse" },
    "/desk/threat-matrix": { label: "Threat Matrix", name: "Threat Matrix" },
    "/desk/vector-memory": { label: "Vector Memory Time-Travel", name: "Vector Memory" },
    "/desk/explore": { label: "Explore", name: "Explore" },
    "/desk/audit": { label: "Audit & Certificates", name: "Audit" },
    "/desk/settings": { label: "App Settings", name: "App Settings" },
  } as Record<NavHref, { label: string; name: string }>,
  /** Title blocks by route. */
  pages: {
    "/desk/architectures": { kicker: "Architectures · 10 products", title: "Flagship architecture products", lede: "Each architecture is a multi-agent product with its own topology, simulation testbed, governance and audit history. {n} of 10 are available on your license." },
    "/desk/assistant": { kicker: "Local assistant · Agent Zero", title: "Ask the desk about itself", lede: "A deterministic, fully offline assistant: it inspects your license, engines, history and audit chain on this device, without calling any model." },
    "/desk/audit": { kicker: "Audit & certificates", title: "The record of everything", lede: "Every license change, run, approval, security event and setting is appended to a SHA-256 hash chain, and every run is sealed into an execution ledger you can certify. Nothing can be edited or deleted without the chain breaking." },
    "/desk/diagnostics": { kicker: "Diagnostics", title: "Runtime, network & desktop bridge", lede: "Live checks against this deployment: API latency, the SSRF guard on outbound connection tests, and what the desktop shell exposes." },
    "/desk/exchange-scout": { kicker: "Exchange Scout · Bloom Exchange sandbox", title: "Sandbox negotiations, handed to you where agents stop", lede: "Counterpart agents negotiate in the Bloom Exchange sandbox. When one admits it lacks the authority or the policy to close, you get the exact point, the cryptographic proof and the decision left open. Nothing here is binding." },
    "/desk/builder": { kicker: "Pipeline builder", title: "Compose your own architecture", lede: "Drag engines onto the canvas, link them from output port to input port, and run the chain in the sandbox. Data flows input → engines → output." },
    "/desk/sandbox": { kicker: "Sandbox", title: "Pipeline sandbox", lede: "Run a custom pipeline end to end: each engine hands its result to the next, with the same testbed, meters and brief as the architecture products." },
    "/desk/engines": { kicker: "Engine network · 8 engines", title: "Every engine, one network", lede: "Each engine is a full command center with its own live console and calibration. {n} of 8 are unlocked by your license; lines show who may hand work to whom." },
    "/desk/explore": { kicker: "Explore · discovery hub", title: "Learn what the workforce does", lede: "No setup, no license needed: see how each engine thinks and what each architecture is worth to a team like yours." },
    "/desk/explore/engines": { kicker: "Explore · engines", title: "Eight engines, in plain English", lede: "Pick any engine and click through what it does with a real request: the input, how its agents think, and what you get back." },
    "/desk/explore/architectures": { kicker: "Explore · architectures", title: "What each architecture is worth", lede: "Drag the comparison to see a team before and after the stack, then put in your own numbers for an ROI estimate." },
    "/desk/global-pulse": { kicker: "Global pulse · home node {city}", title: "Worldwide operations monitor", lede: "Agent actions moving between regions in real time. The global stream is simulated telemetry built from each engine's activity; your own workspace's runs are marked." },
    "/desk/settings": { kicker: "App settings", title: "Workspace, license & white-label", lede: "Everything here is saved on this device and applies across the Operating Desk. License keys are verified by the Bloom AI server." },
    "/desk/shadow-board": { kicker: "Shadow board · adversarial consensus", title: "Stress-test before you execute", lede: "Three adversarial agents debate a high-stakes operation (a contract, a budget move, a system intervention) and must reach consensus before it touches live systems. The board is rule-based and runs locally: the same proposal always gets the same verdict, and every session is hashed into the audit log." },
    "/desk/threat-matrix": { kicker: "Threat matrix · zero trust", title: "Security & anomaly monitor", lede: "Every command is screened for prompt injection and exfiltration, and every refused or throttled request is recorded. Managed by Shield (perimeter) and Vanguard (anomaly sweep)." },
    "/desk/vector-memory": { kicker: "Vector memory · time-travel", title: "What the agents remember, and when", lede: "Long-term memory is each engine's retained results, sent back as context on its next run; short-term is the last 24 hours of runs. Embeddings here are computed locally (256-d feature hashing over words and character trigrams), not by a model, so search is lexical rather than semantic. Every memory change is a snapshot you can roll back to or fork." },
  } as Record<PageRoute, Page>,
  home: {
    active: "Active",
    ariaFeed: "Live workstream feed",
    ariaLauncher: "Quick architecture launcher",
    ariaBay: "Approval and action bay",
    runtime: (m: "live" | "simulation" | null): string => (m === "live" ? "Live runtime" : m === "simulation" ? "Simulation runtime" : "Runtime …"),
    license: (pill: string) => `${pill} license`,
    engagement: "Engagement",
    licensed: (n: number) => `${n} of 8 engines licensed · autonomous revenue operations`,
    edit: "Edit",
    setEngagement: "Set engagement",
    clientPh: "Client, e.g. Northwind Logistics",
    projectPh: "Project, e.g. Q4 pipeline acceleration",
    scopePh: "Scope, e.g. NA mid-market",
    client: "Client",
    project: "Project",
    scope: "Scope",
    save: "Save engagement",
    tiles: { runtime: "Runtime", sla: "SLA", latency: "Latency", engines: "Engines online", runs: "Runs active", approvals: "Approvals" },
    recent: "Recent desks",
    launch: "Launch",
    allProducts: "All products",
    engine: "Engine",
    task: "Task",
    dispatchTo: (name: string) => `Dispatch a task to ${name}…`,
    noDispatch: "Your role can't dispatch tasks",
    sample: "Sample",
    dispatch: "Dispatch",
    workstreams: "Live workstreams",
    workstreamsNote: "Workforce activity is simulated · your dispatched runs are live",
    yourRun: (name: string, s: Status) => `${name} · your dispatched run ${s === "running" ? "in progress" : s === "done" ? "complete" : "failed"}`,
    briefReady: "Brief ready in the run console",
    open: "open",
    deliverables: "Client deliverables",
    deliverablesEmpty: "Completed runs land here as executive briefs. Dispatch a task above to produce the first one.",
    brief: (label: string) => `${label} brief`,
    downloadBrief: "Download the brief (Markdown)",
    downloadSummary: "Download the summary (full brief not kept for older runs)",
    pending: "Pending approvals",
    pendingEmpty: "Nothing waiting. Actions over your approval threshold, or that a person must do, queue here from every run.",
    board: (verdict: string) => `Board: ${verdict}`,
    stressTest: "Stress-test",
    approve: "Approve",
    reject: "Reject",
    noApprove: "Your role can't approve actions",
    tasks: "Task queue",
    tasksEmpty: "Approved actions that a person must carry out appear here until they're done.",
    approvedBy: (by: string) => `approved by ${by}`,
    markDone: "Mark done",
    exports: "Recently completed exports",
    exportsEmpty: "Reports and briefs you export are logged here.",
    auditTrail: "Full audit trail",
    approvalsWaiting: (n: number) => `${n} approval${n > 1 ? "s" : ""} awaiting sign-off`,
    securityEvents: (n: number) => `${n} security event${n > 1 ? "s" : ""} in 24h`,
    auditBroken: "Audit chain broken",
    ledgerBroken: "Execution ledger broken",
    slaDegraded: "SLA degraded",
    runtimeOffline: "Runtime offline",
    shortcuts: "Your shortcuts",
    shortcutsTitle: "Ranked by how often and how recently you use them, on this device",
    reset: "reset",
  },
};

export type OsCopy = typeof en;

const es: OsCopy = {
  shell: {
    sla: "SLA",
    slaState: { nominal: "nominal", degraded: "degradado", offline: "sin conexión" },
    latency: "Latencia global",
    nodes: "Nodos activos",
    environment: "Entorno",
    demo: (on) => `Demo ${on ? "activa" : "apagada"}`,
    actingAs: "Actuando como",
    setup: "Termina de configurar este espacio: licencia, claves de proveedor, marca y un diagnóstico.",
    setupCta: "Iniciar configuración guiada",
  },
  groups: { Command: "Mando", Products: "Productos", "Pulse & Threats": "Pulso y amenazas", System: "Sistema" },
  nav: {
    "/desk": { label: "Inicio", name: "Inicio" },
    "/desk/shadow-board": { label: "Shadow Board", name: "Shadow Board" },
    "/desk/assistant": { label: "Asistente local", name: "Asistente local" },
    "/desk/demo": { label: "Presentación demo", name: "Presentación" },
    "/desk/architectures": { label: "Arquitecturas (10 stacks)", name: "Arquitecturas" },
    "/desk/engines": { label: "Red de motores (8 motores)", name: "Red de motores" },
    "/desk/builder": { label: "Constructor de pipelines", name: "Constructor" },
    "/desk/exchange-scout": { label: "Exchange Scout", name: "Exchange Scout" },
    "/desk/global-pulse": { label: "Pulso global", name: "Pulso global" },
    "/desk/threat-matrix": { label: "Matriz de amenazas", name: "Amenazas" },
    "/desk/vector-memory": { label: "Memoria vectorial · viaje en el tiempo", name: "Memoria vectorial" },
    "/desk/explore": { label: "Explorar", name: "Explorar" },
    "/desk/audit": { label: "Auditoría y certificados", name: "Auditoría" },
    "/desk/settings": { label: "Ajustes", name: "Ajustes" },
  },
  pages: {
    "/desk/architectures": { kicker: "Arquitecturas · 10 productos", title: "Productos de arquitectura insignia", lede: "Cada arquitectura es un producto multiagente con su propia topología, banco de pruebas simulado, gobierno e historial de auditoría. {n} de 10 están disponibles con tu licencia." },
    "/desk/assistant": { kicker: "Asistente local · Agent Zero", title: "Pregúntale al escritorio sobre sí mismo", lede: "Un asistente determinista y totalmente sin conexión: revisa tu licencia, motores, historial y cadena de auditoría en este dispositivo, sin llamar a ningún modelo." },
    "/desk/audit": { kicker: "Auditoría y certificados", title: "El registro de todo", lede: "Cada cambio de licencia, ejecución, aprobación, evento de seguridad y ajuste se añade a una cadena de hashes SHA-256, y cada ejecución se sella en un libro de ejecución que puedes certificar. Nada puede editarse ni borrarse sin romper la cadena." },
    "/desk/diagnostics": { kicker: "Diagnóstico", title: "Runtime, red y puente de escritorio", lede: "Comprobaciones en vivo contra este despliegue: latencia de la API, la protección SSRF en las pruebas de conexión salientes y lo que expone la app de escritorio." },
    "/desk/exchange-scout": { kicker: "Exchange Scout · sandbox de Bloom Exchange", title: "Negociaciones sandbox que te llegan donde los agentes se detienen", lede: "Agentes contraparte negocian en el sandbox de Bloom Exchange. Cuando uno admite que no tiene la autoridad o la política para cerrar, recibes el punto exacto, la prueba criptográfica y la decisión pendiente. Nada aquí es vinculante." },
    "/desk/builder": { kicker: "Constructor de pipelines", title: "Diseña tu propia arquitectura", lede: "Arrastra motores al lienzo, conéctalos del puerto de salida al de entrada y ejecuta la cadena en el sandbox. Los datos fluyen entrada → motores → salida." },
    "/desk/sandbox": { kicker: "Sandbox", title: "Sandbox de pipelines", lede: "Ejecuta un pipeline propio de principio a fin: cada motor entrega su resultado al siguiente, con el mismo banco de pruebas, medidores e informe que los productos de arquitectura." },
    "/desk/engines": { kicker: "Red de motores · 8 motores", title: "Todos los motores, una red", lede: "Cada motor es un centro de mando completo con su propia consola en vivo y calibración. Tu licencia desbloquea {n} de 8; las líneas muestran quién puede delegar trabajo a quién." },
    "/desk/explore": { kicker: "Explorar · centro de descubrimiento", title: "Descubre lo que hace la fuerza de trabajo", lede: "Sin configuración ni licencia: mira cómo piensa cada motor y cuánto vale cada arquitectura para un equipo como el tuyo." },
    "/desk/explore/engines": { kicker: "Explorar · motores", title: "Ocho motores, en lenguaje claro", lede: "Elige un motor y recorre lo que hace con una petición real: la entrada, cómo piensan sus agentes y lo que recibes." },
    "/desk/explore/architectures": { kicker: "Explorar · arquitecturas", title: "Lo que vale cada arquitectura", lede: "Arrastra la comparación para ver un equipo antes y después del stack, y luego introduce tus propios números para estimar el ROI." },
    "/desk/global-pulse": { kicker: "Pulso global · nodo base {city}", title: "Monitor mundial de operaciones", lede: "Acciones de agentes que se mueven entre regiones en tiempo real. El flujo global es telemetría simulada a partir de la actividad de cada motor; las ejecuciones de tu espacio aparecen marcadas." },
    "/desk/settings": { kicker: "Ajustes", title: "Espacio de trabajo, licencia y marca blanca", lede: "Todo lo que hay aquí se guarda en este dispositivo y se aplica en todo el escritorio. El servidor de Bloom AI verifica las claves de licencia." },
    "/desk/shadow-board": { kicker: "Shadow Board · consenso adversarial", title: "Ponlo a prueba antes de ejecutar", lede: "Tres agentes adversarios debaten una operación de alto riesgo (un contrato, un movimiento de presupuesto, una intervención en sistemas) y deben llegar a un consenso antes de tocar sistemas reales. El board funciona con reglas y en local: la misma propuesta siempre recibe el mismo veredicto, y cada sesión queda con hash en el registro de auditoría." },
    "/desk/threat-matrix": { kicker: "Matriz de amenazas · zero trust", title: "Monitor de seguridad y anomalías", lede: "Cada comando se revisa en busca de inyección de prompts y exfiltración, y cada petición rechazada o limitada queda registrada. Lo gestionan Shield (perímetro) y Vanguard (barrido de anomalías)." },
    "/desk/vector-memory": { kicker: "Memoria vectorial · viaje en el tiempo", title: "Lo que recuerdan los agentes, y cuándo", lede: "La memoria a largo plazo son los resultados que conserva cada motor y que se le devuelven como contexto en su siguiente ejecución; la de corto plazo son las ejecuciones de las últimas 24 horas. Los embeddings se calculan en local (hashing de 256 dimensiones sobre palabras y trigramas de caracteres), no con un modelo, así que la búsqueda es léxica y no semántica. Cada cambio de memoria es una instantánea a la que puedes volver o desde la que puedes bifurcar." },
  },
  home: {
    active: "Activo",
    ariaFeed: "Flujo de trabajo en vivo",
    ariaLauncher: "Lanzador rápido de arquitecturas",
    ariaBay: "Bandeja de aprobaciones y acciones",
    runtime: (m) => (m === "live" ? "Runtime en vivo" : m === "simulation" ? "Runtime simulado" : "Runtime …"),
    license: (pill) => `Licencia ${pill}`,
    engagement: "Proyecto activo",
    licensed: (n) => `${n} de 8 motores con licencia · operaciones de ingresos autónomas`,
    edit: "Editar",
    setEngagement: "Definir proyecto",
    clientPh: "Cliente, p. ej. Northwind Logistics",
    projectPh: "Proyecto, p. ej. aceleración del pipeline T4",
    scopePh: "Alcance, p. ej. mid-market NA",
    client: "Cliente",
    project: "Proyecto",
    scope: "Alcance",
    save: "Guardar proyecto",
    tiles: { runtime: "Runtime", sla: "SLA", latency: "Latencia", engines: "Motores activos", runs: "Ejecuciones", approvals: "Aprobaciones" },
    recent: "Escritorios recientes",
    launch: "Abrir",
    allProducts: "Todos los productos",
    engine: "Motor",
    task: "Tarea",
    dispatchTo: (name) => `Envía una tarea a ${name}…`,
    noDispatch: "Tu rol no puede enviar tareas",
    sample: "Ejemplo",
    dispatch: "Enviar",
    workstreams: "Flujos de trabajo en vivo",
    workstreamsNote: "La actividad de la fuerza de trabajo es simulada · tus ejecuciones son reales",
    yourRun: (name, s) => `${name} · tu ejecución ${s === "running" ? "en curso" : s === "done" ? "completada" : "fallida"}`,
    briefReady: "Informe listo en la consola",
    open: "abrir",
    deliverables: "Entregables para el cliente",
    deliverablesEmpty: "Las ejecuciones completadas llegan aquí como informes ejecutivos. Envía una tarea arriba para crear el primero.",
    brief: (label) => `Informe de ${label}`,
    downloadBrief: "Descargar el informe (Markdown)",
    downloadSummary: "Descargar el resumen (el informe completo no se guarda en ejecuciones antiguas)",
    pending: "Aprobaciones pendientes",
    pendingEmpty: "Nada en espera. Aquí llegan, desde cada ejecución, las acciones que superan tu umbral o que debe hacer una persona.",
    board: (verdict) => `Board: ${verdict}`,
    stressTest: "Poner a prueba",
    approve: "Aprobar",
    reject: "Rechazar",
    noApprove: "Tu rol no puede aprobar acciones",
    tasks: "Cola de tareas",
    tasksEmpty: "Las acciones aprobadas que debe realizar una persona aparecen aquí hasta completarse.",
    approvedBy: (by) => `aprobado por ${by}`,
    markDone: "Marcar hecha",
    exports: "Exportaciones recientes",
    exportsEmpty: "Aquí se registran los informes y documentos que exportas.",
    auditTrail: "Registro de auditoría completo",
    approvalsWaiting: (n) => `${n} aprobación${n > 1 ? "es" : ""} pendiente${n > 1 ? "s" : ""} de firma`,
    securityEvents: (n) => `${n} evento${n > 1 ? "s" : ""} de seguridad en 24 h`,
    auditBroken: "Cadena de auditoría rota",
    ledgerBroken: "Libro de ejecución roto",
    slaDegraded: "SLA degradado",
    runtimeOffline: "Runtime sin conexión",
    shortcuts: "Tus accesos",
    shortcutsTitle: "Ordenados según la frecuencia y lo reciente de su uso en este dispositivo",
    reset: "restablecer",
  },
};

const he: OsCopy = {
  shell: {
    sla: "SLA",
    slaState: { nominal: "תקין", degraded: "ירוד", offline: "מנותק" },
    latency: "השהיה גלובלית",
    nodes: "צמתים פעילים",
    environment: "סביבה",
    demo: (on) => `דמו ${on ? "פעיל" : "כבוי"}`,
    actingAs: "פועל בתור",
    setup: "השלימו את הגדרת סביבת העבודה: רישיון, מפתחות ספקים, מיתוג ובדיקת אבחון.",
    setupCta: "להגדרה מודרכת",
  },
  groups: { Command: "פיקוד", Products: "מוצרים", "Pulse & Threats": "דופק ואיומים", System: "מערכת" },
  nav: {
    "/desk": { label: "בית", name: "בית" },
    "/desk/shadow-board": { label: "Shadow Board", name: "Shadow Board" },
    "/desk/assistant": { label: "עוזר מקומי", name: "עוזר מקומי" },
    "/desk/demo": { label: "מצגת דמו", name: "מצגת" },
    "/desk/architectures": { label: "ארכיטקטורות (10 סטאקים)", name: "ארכיטקטורות" },
    "/desk/engines": { label: "רשת המנועים (8 מנועים)", name: "רשת המנועים" },
    "/desk/builder": { label: "בונה פייפליינים", name: "בונה" },
    "/desk/exchange-scout": { label: "Exchange Scout", name: "Exchange Scout" },
    "/desk/global-pulse": { label: "דופק גלובלי", name: "דופק גלובלי" },
    "/desk/threat-matrix": { label: "מטריצת איומים", name: "איומים" },
    "/desk/vector-memory": { label: "זיכרון וקטורי · מסע בזמן", name: "זיכרון וקטורי" },
    "/desk/explore": { label: "גילוי", name: "גילוי" },
    "/desk/audit": { label: "ביקורת ותעודות", name: "ביקורת" },
    "/desk/settings": { label: "הגדרות", name: "הגדרות" },
  },
  pages: {
    "/desk/architectures": { kicker: "ארכיטקטורות · 10 מוצרים", title: "מוצרי הארכיטקטורה המובילים", lede: "כל ארכיטקטורה היא מוצר מרובה סוכנים עם טופולוגיה, סביבת בדיקה מדומה, משילות והיסטוריית ביקורת משלה. {n} מתוך 10 זמינות ברישיון שלכם." },
    "/desk/assistant": { kicker: "עוזר מקומי · Agent Zero", title: "שאלו את השולחן על עצמו", lede: "עוזר דטרמיניסטי שעובד לגמרי בלי חיבור: הוא בודק את הרישיון, המנועים, ההיסטוריה ושרשרת הביקורת במכשיר הזה, בלי לפנות לשום מודל." },
    "/desk/audit": { kicker: "ביקורת ותעודות", title: "התיעוד של הכול", lede: "כל שינוי רישיון, הרצה, אישור, אירוע אבטחה והגדרה נרשמים בשרשרת גיבובי SHA-256, וכל הרצה נחתמת ביומן ביצוע שאפשר להנפיק לו תעודה. אי אפשר לערוך או למחוק דבר בלי לשבור את השרשרת." },
    "/desk/diagnostics": { kicker: "אבחון", title: "סביבת ריצה, רשת וגשר שולחני", lede: "בדיקות חיות מול הפריסה הזו: השהיית ה־API, ההגנה מפני SSRF בבדיקות חיבור יוצאות, ומה שהאפליקציה השולחנית חושפת." },
    "/desk/exchange-scout": { kicker: "Exchange Scout · ארגז החול של Bloom Exchange", title: "משא ומתן בארגז חול, שמגיע אליך בנקודה שבה הסוכנים נעצרים", lede: "סוכנים של הצד השני מנהלים משא ומתן בארגז החול של Bloom Exchange. כשאחד מהם מודה שאין לו הסמכות או המדיניות לסגור, מקבלים את הנקודה המדויקת, את ההוכחה הקריפטוגרפית ואת ההחלטה שנשארה פתוחה. שום דבר כאן לא מחייב." },
    "/desk/builder": { kicker: "בונה פייפליינים", title: "בנו ארכיטקטורה משלכם", lede: "גררו מנועים לקנבס, חברו אותם מפתח הפלט לפתח הקלט והריצו את השרשרת בארגז החול. הנתונים זורמים קלט ← מנועים ← פלט." },
    "/desk/sandbox": { kicker: "ארגז חול", title: "ארגז חול לפייפליינים", lede: "הריצו פייפליין משלכם מקצה לקצה: כל מנוע מעביר את התוצאה שלו לבא אחריו, עם אותה סביבת בדיקה, אותם מדדים ואותו תדריך כמו במוצרי הארכיטקטורה." },
    "/desk/engines": { kicker: "רשת המנועים · 8 מנועים", title: "כל המנועים, רשת אחת", lede: "כל מנוע הוא מרכז פיקוד מלא עם קונסולה חיה וכיול משלו. הרישיון שלכם פותח {n} מתוך 8; הקווים מראים מי רשאי להעביר עבודה למי." },
    "/desk/explore": { kicker: "גילוי · מרכז היכרות", title: "הכירו את מה שכוח העבודה עושה", lede: "בלי הגדרות ובלי רישיון: ראו איך כל מנוע חושב וכמה כל ארכיטקטורה שווה לצוות כמו שלכם." },
    "/desk/explore/engines": { kicker: "גילוי · מנועים", title: "שמונה מנועים, בשפה פשוטה", lede: "בחרו מנוע ועברו על מה שהוא עושה עם בקשה אמיתית: הקלט, איך הסוכנים שלו חושבים ומה מקבלים בסוף." },
    "/desk/explore/architectures": { kicker: "גילוי · ארכיטקטורות", title: "כמה שווה כל ארכיטקטורה", lede: "גררו את ההשוואה כדי לראות צוות לפני ואחרי הסטאק, ואז הזינו מספרים משלכם להערכת ROI." },
    "/desk/global-pulse": { kicker: "דופק גלובלי · צומת הבית {city}", title: "מוניטור פעילות עולמי", lede: "פעולות סוכנים שנעות בין אזורים בזמן אמת. הזרם הגלובלי הוא טלמטריה מדומה שנבנית מהפעילות של כל מנוע; ההרצות של סביבת העבודה שלכם מסומנות." },
    "/desk/settings": { kicker: "הגדרות", title: "סביבת עבודה, רישיון ומיתוג", lede: "כל מה שכאן נשמר במכשיר הזה וחל על כל השולחן. שרת Bloom AI מאמת את מפתחות הרישיון." },
    "/desk/shadow-board": { kicker: "Shadow Board · קונצנזוס יריבותי", title: "בדיקת לחץ לפני ביצוע", lede: "שלושה סוכנים יריבים מתווכחים על פעולה רגישה (חוזה, הסטת תקציב, התערבות במערכת) וחייבים להגיע לקונצנזוס לפני שהיא נוגעת במערכות חיות. ה־Board מבוסס כללים ורץ מקומית: אותה הצעה תמיד מקבלת אותו פסק דין, וכל ישיבה נרשמת עם גיבוב ביומן הביקורת." },
    "/desk/threat-matrix": { kicker: "מטריצת איומים · zero trust", title: "מוניטור אבטחה וחריגות", lede: "כל פקודה נסרקת להזרקת פרומפטים ולהוצאת מידע, וכל בקשה שנדחתה או הוגבלה נרשמת. מנוהל על ידי Shield (היקף) ו־Vanguard (סריקת חריגות)." },
    "/desk/vector-memory": { kicker: "זיכרון וקטורי · מסע בזמן", title: "מה הסוכנים זוכרים, ומתי", lede: "זיכרון לטווח ארוך הוא התוצאות שכל מנוע שומר ומקבל בחזרה כהקשר בהרצה הבאה; זיכרון לטווח קצר הוא ההרצות של 24 השעות האחרונות. ההטמעות מחושבות מקומית (גיבוב תכונות ב־256 ממדים על מילים וטריגרמות של תווים), לא על ידי מודל, ולכן החיפוש לקסיקלי ולא סמנטי. כל שינוי בזיכרון הוא תמונת מצב שאפשר לחזור אליה או להתפצל ממנה." },
  },
  home: {
    active: "פעיל",
    ariaFeed: "זרם עבודה חי",
    ariaLauncher: "משגר ארכיטקטורות מהיר",
    ariaBay: "מפרץ האישורים והפעולות",
    runtime: (m) => (m === "live" ? "סביבת ריצה חיה" : m === "simulation" ? "סביבת סימולציה" : "סביבת ריצה …"),
    license: (pill) => `רישיון ${pill}`,
    engagement: "התקשרות",
    licensed: (n) => `${n} מתוך 8 מנועים ברישיון · תפעול הכנסות אוטונומי`,
    edit: "עריכה",
    setEngagement: "הגדרת התקשרות",
    clientPh: "לקוח, למשל Northwind Logistics",
    projectPh: "פרויקט, למשל האצת פייפליין ברבעון 4",
    scopePh: "היקף, למשל שוק בינוני בצפון אמריקה",
    client: "לקוח",
    project: "פרויקט",
    scope: "היקף",
    save: "שמירת התקשרות",
    tiles: { runtime: "סביבת ריצה", sla: "SLA", latency: "השהיה", engines: "מנועים פעילים", runs: "הרצות פעילות", approvals: "אישורים" },
    recent: "שולחנות אחרונים",
    launch: "פתיחה",
    allProducts: "כל המוצרים",
    engine: "מנוע",
    task: "משימה",
    dispatchTo: (name) => `שלחו משימה ל־${name}…`,
    noDispatch: "לתפקיד שלכם אין הרשאה לשלוח משימות",
    sample: "דוגמה",
    dispatch: "שליחה",
    workstreams: "זרמי עבודה חיים",
    workstreamsNote: "פעילות כוח העבודה מדומה · ההרצות ששלחתם אמיתיות",
    yourRun: (name, s) => `${name} · ההרצה ששלחתם ${s === "running" ? "בתהליך" : s === "done" ? "הושלמה" : "נכשלה"}`,
    briefReady: "התדריך מוכן בקונסולה",
    open: "פתיחה",
    deliverables: "תוצרים ללקוח",
    deliverablesEmpty: "הרצות שהושלמו מגיעות לכאן כתדריכי מנהלים. שלחו משימה למעלה כדי ליצור את הראשון.",
    brief: (label) => `תדריך ${label}`,
    downloadBrief: "הורדת התדריך (Markdown)",
    downloadSummary: "הורדת הסיכום (התדריך המלא לא נשמר בהרצות ישנות)",
    pending: "אישורים ממתינים",
    pendingEmpty: "אין מה לאשר. פעולות מעל סף האישור, או כאלה שאדם צריך לבצע, מגיעות לכאן מכל הרצה.",
    board: (verdict) => `Board: ${verdict}`,
    stressTest: "בדיקת לחץ",
    approve: "אישור",
    reject: "דחייה",
    noApprove: "לתפקיד שלכם אין הרשאה לאשר פעולות",
    tasks: "תור משימות",
    tasksEmpty: "פעולות מאושרות שאדם צריך לבצע מופיעות כאן עד שהן מסומנות כבוצעו.",
    approvedBy: (by) => `אושר על ידי ${by}`,
    markDone: "סימון כבוצע",
    exports: "ייצואים אחרונים",
    exportsEmpty: "דוחות ותדריכים שאתם מייצאים נרשמים כאן.",
    auditTrail: "יומן הביקורת המלא",
    approvalsWaiting: (n) => (n > 1 ? `${n} אישורים ממתינים לחתימה` : "אישור אחד ממתין לחתימה"),
    securityEvents: (n) => (n > 1 ? `${n} אירועי אבטחה ב־24 שעות` : "אירוע אבטחה אחד ב־24 שעות"),
    auditBroken: "שרשרת הביקורת שבורה",
    ledgerBroken: "יומן הביצוע שבור",
    slaDegraded: "SLA ירוד",
    runtimeOffline: "סביבת הריצה מנותקת",
    shortcuts: "קיצורי הדרך שלכם",
    shortcutsTitle: "מדורגים לפי תדירות ועדכניות השימוש במכשיר הזה",
    reset: "איפוס",
  },
};

export const OS_COPY: Record<Lang, OsCopy> = { en, es, he };

/** The Operating Desk copy for the current language; components re-render when the language changes. */
export function useOsCopy() {
  const { lang } = useCommandCopy();
  return OS_COPY[lang];
}
