import type { Brief, EngineKey } from "./engines";

/**
 * The engines' workforce text in Spanish and Hebrew: card titles, live activity lines, hand-off flows and the
 * morning-brief lines. Entries line up by index with the English in engines.ts; {agent}, {co}, {amt} and {ch}
 * are filled in live, exactly as in English.
 */
export type EngineWork = {
  cards: { title: (agents: number, count: number) => string; events: string[] }[];
  flows: ((n: number) => string)[];
  brief: (b: Brief) => string[];
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const es_ = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const ag = (n: number) => es_(n, "agente", "agentes");
const he_ = (n: number, one: string, many: string) => (n === 1 ? `${one} אחד` : `${n} ${many}`);
const sh = (n: number) => (n === 1 ? "סוכן אחד" : `${n} סוכנים`);

/** The live agent label used in activity lines ("Agent #07"). */
export const AGENT_LABEL = { en: "Agent", es: "Agente", he: "סוכן" } as const;

export const ENGINE_WORK: Record<"es" | "he", Record<EngineKey, EngineWork>> = {
  es: {
    sovereign: {
      cards: [
        { title: (a, n) => `${ag(a)} aplicando ${es_(n, "regla de aprobación", "reglas de aprobación")}`, events: ["{agent} bloqueó un pago de $12,400 a un proveedor que incumplía tus reglas de gasto", "{agent} aprobó {amt} en publicidad para {co} dentro de tu umbral", "{agent} bloqueó un acceso compartido usado desde dos países a la vez"] },
        { title: (a, n) => `${ag(a)} reequilibrando ${es_(n, "partida presupuestaria", "partidas presupuestarias")}`, events: ["{agent} movió {amt} de una campaña lenta a la que está convirtiendo", "{agent} canceló una licencia de software sin uso y ahorró {amt} al año", "{agent} reservó presupuesto para el próximo impulso de cierre de Apex"] },
        { title: (a, n) => `${ag(a)} vigilando ${es_(n, "riesgo abierto", "riesgos abiertos")}`, events: ["{agent} detectó una bajada de precio de un competidor y avisó a Apex", "{agent} encontró un contrato con {co} que se renueva en 9 días", "{agent} confirmó que todas las copias de seguridad terminaron durante la noche"] },
        { title: (a, n) => `${ag(a)} ejecutando ${es_(n, "orden estratégica", "órdenes estratégicas")}`, events: ["{agent} pidió a todos los motores que se centren en compradores enterprise esta semana", "{agent} subió el listón de calidad de leads de IntentPulse tras una mañana fuerte", "{agent} programó una revisión de crecimiento para el viernes a las 9:00"] },
      ],
      flows: [(n) => `Liberando presupuesto para ${es_(n, "nueva campaña de cierre", "nuevas campañas de cierre")}`, (n) => `Aprobado ${es_(n, "contrato de proveedor", "contratos de proveedor")} para archivar`, (n) => `Escalado ${es_(n, "cambio de mercado", "cambios de mercado")} para decidir`],
      brief: (b) => [`Todos los motores se mantuvieron dentro de las reglas que fijaste. Nada requirió tu atención urgente.`, `${b.leads} leads cualificados pasaron por el sistema, y el presupuesto siguió a los que tienen más probabilidad de comprar.`, `${usd(b.pipeline)} de pipeline están ahora protegidos por presupuestos aprobados y condiciones firmadas.`, `Te ahorraste unas ${Math.round(b.hours)} horas de aprobaciones, revisiones y reuniones de presupuesto.`],
    },
    apex: {
      cards: [
        { title: (a, n) => `${ag(a)} cerrando ${es_(n, "venta activa", "ventas activas")}`, events: ["{agent} cerró un acuerdo de {amt} con {co}", "{agent} envió las condiciones finales a {co} y agendó una llamada de firma para mañana", "{agent} resolvió una objeción de precio de {co} y mantuvo la tarifa completa"] },
        { title: (a, n) => `${ag(a)} llevando ${es_(n, "conversación con comprador", "conversaciones con compradores")}`, events: ["{agent} inició una conversación consultiva por DM en Instagram", "{agent} recibió respuesta del responsable de crecimiento de {co} en LinkedIn", "{agent} agendó una llamada de descubrimiento con {co} tras una llamada de seguimiento", "{agent} respondió en menos de un minuto la duda de un comprador sobre el onboarding"] },
        { title: (a, n) => `${ag(a)} redactando ${es_(n, "propuesta a medida", "propuestas a medida")}`, events: ["{agent} envió una propuesta de {amt} a {co}", "{agent} añadió un caso de éxito a la propuesta de {co} cuando pidieron pruebas"] },
        { title: (a, n) => `${ag(a)} haciendo seguimiento a ${es_(n, "prospecto inactivo", "prospectos inactivos")}`, events: ["{agent} reabrió un acuerdo con {co} que llevaba dos semanas en silencio", "{agent} envió a {co} un breve mensaje de seguimiento por email", "{agent} recordó a un contacto de LinkedIn en {co} la llamada de la semana pasada", "{agent} retomó una conversación de Instagram que se quedó a mitad de pregunta"] },
      ],
      flows: [(n) => `Entregando ${es_(n, "lead", "leads")} para cierre inmediato`, (n) => `Enviando ${es_(n, "acuerdo firmado", "acuerdos firmados")} para contratos y facturación`, (n) => `Pidiendo aprobación de ${es_(n, "descuento", "descuentos")} por encima del 15%`],
      brief: (b) => [`Tus closers hablaron con ${b.leads} compradores interesados en las últimas 24 horas.`, `${usd(b.pipeline)} de pipeline están ahora asegurados en propuestas, acuerdos verbales y contratos firmados.`, `Los acuerdos firmados pasaron directamente a CoreOps para contratos y facturas. Nadie tuvo que volver a teclear nada.`, `Son unas ${Math.round(b.hours)} horas de mensajes, seguimientos y redacción de propuestas que no tuviste que hacer.`],
    },
    coreops: {
      cards: [
        { title: (a, n) => `${ag(a)} incorporando ${es_(n, "cliente nuevo", "clientes nuevos")}`, events: ["{agent} envió a {co} su contrato y su pack de bienvenida 40 segundos después de cerrar el acuerdo", "{agent} creó un espacio de proyecto compartido para {co}", "{agent} recogió el contrato firmado de {co} y lo archivó"] },
        { title: (a, n) => `${ag(a)} sincronizando ${es_(n, "sistema conectado", "sistemas conectados")}`, events: ["{agent} cruzó 312 contactos del CRM con los registros de facturación", "{agent} corrigió 14 registros de clientes duplicados en tres herramientas", "{agent} actualizó la etapa del acuerdo de {co} en todos los sitios donde aparece"] },
        { title: (a, n) => `${ag(a)} procesando ${es_(n, "factura", "facturas")}`, events: ["{agent} envió a {co} una factura de {amt}", "{agent} cobró un pago atrasado de {amt} a {co}", "{agent} cuadró 46 pagos bancarios con sus facturas"] },
        { title: (a, n) => `${ag(a)} enrutando ${es_(n, "solicitud entrante", "solicitudes entrantes")}`, events: ["{agent} pasó una consulta de facturación de {co} a finanzas con la respuesta redactada", "{agent} pasó una nueva consulta comercial a Apex", "{agent} cerró 9 solicitudes de soporte que ya estaban resueltas"] },
      ],
      flows: [(n) => `Recibido ${es_(n, "acuerdo firmado", "acuerdos firmados")} para incorporar`, (n) => `Marcada ${es_(n, "factura vencida", "facturas vencidas")} de más de $20k para revisión`, (n) => `Devuelto ${es_(n, "aviso de baja", "avisos de baja")} al radar`],
      brief: (b) => [`Los nuevos clientes se incorporaron minutos después de firmar, con contratos y packs de bienvenida enviados automáticamente.`, `Se emitieron o cobraron ${usd(b.pipeline)} en facturas, y cada pago quedó cuadrado con su factura.`, `${b.leads} consultas nuevas llegaron a la persona o el motor adecuado sin que nadie ordenara la bandeja de entrada.`, `Tu equipo recuperó unas ${Math.round(b.hours)} horas de introducción de datos, archivo y reclamaciones.`],
    },
    intentpulse: {
      cards: [
        { title: (a, n) => `${ag(a)} explorando ${es_(n, "fuente de señales en vivo", "fuentes de señales en vivo")}`, events: ["{agent} encontró en {ch} a un comprador pidiendo exactamente lo que vendes", "{agent} detectó una publicación de {co} en {ch} que apunta a un nuevo presupuesto", "{agent} vio a 6 personas en {ch} comparando a tus competidores"] },
        { title: (a, n) => `${ag(a)} cualificando ${es_(n, "comprador interesado", "compradores interesados")}`, events: ["{agent} extrajo un lead verificado de {ch}: una persona con poder de decisión en {co}", "{agent} confirmó por un hilo de {ch} que {co} tiene presupuesto y plazo este trimestre", "{agent} descartó un lead de {ch} que resultó ser un proyecto de estudiantes"] },
        { title: (a, n) => `${ag(a)} siguiendo ${es_(n, "movimiento de la competencia", "movimientos de la competencia")}`, events: ["{agent} notó que los compradores en {ch} reaccionan a la subida del 12% de un competidor", "{agent} encontró en {ch} a clientes descontentos de un competidor buscando alternativas"] },
        { title: (a, n) => `${ag(a)} preparando ${es_(n, "traspaso de lead", "traspasos de leads")}`, events: ["{agent} pasó a Apex un lead de {ch} de {co} con un resumen de lo que necesita", "{agent} registró un lead de {ch} de {co} en tu panel para revisarlo", "{agent} estimó que un lead de {ch} de {co} vale unos {amt}"] },
      ],
      flows: [(n) => `Entregando ${es_(n, "lead", "leads")} para cierre inmediato`, (n) => `Registrado ${es_(n, "lead de alta intención", "leads de alta intención")} para tu revisión`, (n) => `Escalado ${es_(n, "cambio de mercado", "cambios de mercado")} para decidir`, (n) => `Recibido ${es_(n, "aviso de baja", "avisos de baja")} para vigilar`],
      brief: (b) => [`IntentPulse encontró ${b.leads} personas que buscan activamente lo que ofreces.`, `Juntas valen unos ${usd(b.pipeline)} en ingresos potenciales.`, `Los leads más fuertes se traspasaron en segundos, antes de que la competencia pudiera llegar a ellos.`, `Eso ahorró unas ${Math.round(b.hours)} horas de búsqueda, investigación y cualificación manual.`],
    },
    vanguard: {
      cards: [
        { title: (a, n) => `${ag(a)} investigando ${es_(n, "cuenta objetivo", "cuentas objetivo")}`, events: ["{agent} vio que {co} está contratando tres comerciales, una señal de compra clásica", "{agent} identificó a cuatro decisores en {co} y verificó sus emails", "{agent} marcó la nueva ronda de financiación de {co} como una oportunidad"] },
        { title: (a, n) => `${ag(a)} ejecutando ${es_(n, "secuencia de prospección", "secuencias de prospección")}`, events: ["{agent} envió un primer contacto personal al VP de Ventas de {co}", "{agent} agendó una llamada de descubrimiento con {co} a partir de una respuesta a un email en frío", "{agent} abrió una conversación en LinkedIn con el fundador de {co}", "{agent} pausó una secuencia después de que {co} respondiera «este trimestre no»"] },
        { title: (a, n) => `${ag(a)} siguiendo ${es_(n, "señal de intención", "señales de intención")}`, events: ["{agent} vio una publicación pidiendo exactamente lo que vendes y respondió en minutos", "{agent} detectó a {co} comparando a tus competidores en un sitio de reseñas", "{agent} registró {amt} de nuevo pipeline con las respuestas de esta mañana"] },
        { title: (a, n) => `${ag(a)} cualificando ${es_(n, "reunión agendada", "reuniones agendadas")}`, events: ["{agent} cualificó a {co}: presupuesto confirmado, decisión en 30 días", "{agent} pasó a Apex una reunión con {co} ya caliente, con toda la investigación adjunta", "{agent} añadió {amt} a tu pipeline a 30 días"] },
      ],
      flows: [(n) => `Entregando ${es_(n, "reunión agendada", "reuniones agendadas")}`, (n) => `Pasando ${es_(n, "señal caliente", "señales calientes")} para contactar`, (n) => `Sincronizando ${es_(n, "cuenta nueva", "cuentas nuevas")} con el CRM`],
      brief: (b) => [`Se investigaron y contactaron ${b.leads} cuentas objetivo con tu propia voz.`, `Se abrieron ${usd(b.pipeline)} de pipeline previsto a partir de prospección en frío.`, `Las respuestas más calientes se agendaron como reuniones y pasaron a Apex en la misma hora.`, `Se hicieron por ti unas ${Math.round(b.hours)} horas de creación de listas, investigación y seguimiento.`],
    },
    cortex: {
      cards: [
        { title: (a, n) => `${ag(a)} analizando ${es_(n, "transcripción de llamada", "transcripciones de llamadas")}`, events: ["{agent} vio que {co} planteó dudas de presupuesto tres veces en la llamada de ayer", "{agent} marcó una señal de compra: {co} preguntó por los plazos de onboarding", "{agent} puntuó la demo de {co}: encaje fuerte, urgencia baja"] },
        { title: (a, n) => `${ag(a)} rebatiendo ${es_(n, "objeción en vivo", "objeciones en vivo")}`, events: ["{agent} redactó una respuesta centrada en el valor a la queja de precio de {co}", "{agent} convirtió el «tenemos que pensarlo» de {co} en una llamada de decisión agendada", "{agent} preparó una comparativa para {co} frente al competidor que mencionaron"] },
        { title: (a, n) => `${ag(a)} redactando ${es_(n, "informe de cierre", "informes de cierre")}`, events: ["{agent} informó a tu closer sobre {co}: quién decide, el presupuesto y el único riesgo a desactivar", "{agent} anticipó que {co} pedirá un descuento y preparó la contrapartida", "{agent} recuperó {amt} reactivando un acuerdo que se enfrió tras la demo"] },
        { title: (a, n) => `${ag(a)} acelerando ${es_(n, "acuerdo abierto", "acuerdos abiertos")}`, events: ["{agent} acortó el ciclo de {co} enviando el paquete de seguridad antes de que lo pidieran", "{agent} llevó a {co} a la fase de contrato, por valor de {amt}", "{agent} avisó a Shield de que {co} solo firmó un compromiso a corto plazo"] },
      ],
      flows: [(n) => `Pedido ${es_(n, "informe de objeciones", "informes de objeciones")}`, (n) => `Enviado ${es_(n, "guion de cierre", "guiones de cierre")}`, (n) => `Marcado ${es_(n, "patrón de objeción de precio", "patrones de objeción de precio")}`],
      brief: (b) => [`Se analizaron ${b.leads} acuerdos en curso, cada uno con un plan para sus objeciones.`, `Se recuperaron ${usd(b.pipeline)} en velocidad de acuerdos estancados o en riesgo.`, `Cada closer entró a sus llamadas con un informe de una página sobre lo que decidirá el acuerdo.`, `Se ahorraron unas ${Math.round(b.hours)} horas de revisión de llamadas, notas y redacción de seguimientos.`],
    },
    shield: {
      cards: [
        { title: (a, n) => `${ag(a)} monitorizando ${es_(n, "cuenta de cliente", "cuentas de clientes")}`, events: ["{agent} notó que los usuarios activos de {co} cayeron un 30% en dos semanas", "{agent} marcó a {co}: su principal defensor interno acaba de dejar la empresa", "{agent} confirmó que {co} adoptó la nueva función tras el onboarding"] },
        { title: (a, n) => `${ag(a)} rescatando ${es_(n, "cuenta en riesgo", "cuentas en riesgo")}`, events: ["{agent} agendó una llamada de rescate con el COO de {co} antes de su renovación", "{agent} rescató a {co} y protegió {amt} de ingresos anuales", "{agent} envió a {co} un plan para resolver el problema del que se quejaron"] },
        { title: (a, n) => `${ag(a)} asegurando ${es_(n, "renovación próxima", "renovaciones próximas")}`, events: ["{agent} renovó a {co} por otro año, con 60 días de antelación", "{agent} preparó un informe de renovación para {co} con pruebas de uso", "{agent} detectó un pago fallido de {co} y lo resolvió antes de que se cortara el servicio"] },
        { title: (a, n) => `${ag(a)} ampliando ${es_(n, "cuenta sana", "cuentas sanas")}`, events: ["{agent} vio que {co} está llegando a su límite de licencias y propuso una mejora", "{agent} cerró una ampliación de {amt} con {co}", "{agent} pidió a Aether el mejor precio de mejora para {co}"] },
      ],
      flows: [(n) => `Recibida ${es_(n, "cuenta recién incorporada", "cuentas recién incorporadas")}`, (n) => `Pedido ${es_(n, "precio de mejora", "precios de mejora")}`, (n) => `Enviada ${es_(n, "renovación en riesgo", "renovaciones en riesgo")} para un informe de cierre`],
      brief: (b) => [`Se vigilaron ${b.leads} cuentas de clientes las 24 horas en busca de señales tempranas de baja.`, `Se retuvieron o salvaron de la cancelación ${usd(b.pipeline)} en ingresos recurrentes.`, `Cada cuenta en riesgo recibió una respuesta personal antes de que pudiera perderse.`, `Se gestionaron por ti unas ${Math.round(b.hours)} horas de revisiones de cuentas, preparación de renovaciones y llamadas de rescate.`],
    },
    aether: {
      cards: [
        { title: (a, n) => `${ag(a)} modelando ${es_(n, "punto de precio", "puntos de precio")}`, events: ["{agent} descubrió que compradores como {co} pagarían un 22% más por el plan anual", "{agent} probó un nuevo plan Growth con 40 visitantes y las conversiones se mantuvieron", "{agent} identificó qué funciones usa más {co} para ponerles un precio adecuado"] },
        { title: (a, n) => `${ag(a)} reestructurando ${es_(n, "plan de precios", "planes de precios")}`, events: ["{agent} movió los informes al plan Pro, donde impulsan las mejoras", "{agent} propuso un complemento por uso para cuentas intensivas como {co}", "{agent} desbloqueó {amt} en ampliaciones reempaquetando el plan Pro"] },
        { title: (a, n) => `${ag(a)} controlando ${es_(n, "solicitud de descuento", "solicitudes de descuento")}`, events: ["{agent} bloqueó un descuento innecesario del 25% para {co} y ofreció un plazo de dos años", "{agent} aprobó un 10% de descuento para {co} a cambio de un caso de éxito", "{agent} ahorró {amt} de margen en los acuerdos de esta semana"] },
        { title: (a, n) => `${ag(a)} poniendo precio a ${es_(n, "oferta de ampliación", "ofertas de ampliación")}`, events: ["{agent} fijó un precio para la ampliación de licencias de {co} que aceptaron en un día", "{agent} envió a Shield la oferta de mejora adecuada para {co}", "{agent} aumentó el valor del contrato de {co} en {amt} al renovar"] },
      ],
      flows: [(n) => `Enviada ${es_(n, "nueva tarifa", "nuevas tarifas")}`, (n) => `Pedido ${es_(n, "precio de mejora", "precios de mejora")}`, (n) => `Enviado ${es_(n, "cambio de precio", "cambios de precio")} para aprobación`],
      brief: (b) => [`Se gestionaron ${b.leads} pruebas de precio y solicitudes de descuento sin una sola reunión.`, `Se desbloquearon ${usd(b.pipeline)} en valor de contrato con paquetes, mejoras y disciplina en descuentos.`, `Ningún acuerdo se cerró por debajo del margen mínimo que fijaste.`, `Se ahorraron unas ${Math.round(b.hours)} horas de modelos en hojas de cálculo y debates de precios.`],
    },
  },
  he: {
    sovereign: {
      cards: [
        { title: (a, n) => `${sh(a)} אוכפים ${he_(n, "כלל אישור", "כללי אישור")}`, events: ["{agent} חסם תשלום של $12,400 לספק שהפר את כללי ההוצאה שלכם", "{agent} אישר {amt} בהוצאות פרסום עבור {co} בתוך הסף שלכם", "{agent} נעל חשבון משותף שהיה בשימוש משתי מדינות בו־זמנית"] },
        { title: (a, n) => `${sh(a)} מאזנים מחדש ${he_(n, "סעיף תקציב", "סעיפי תקציב")}`, events: ["{agent} העביר {amt} מקמפיין איטי לזה שממיר", "{agent} ביטל רישיון תוכנה שלא היה בשימוש וחסך {amt} בשנה", "{agent} שריין תקציב לדחיפת הסגירה הבאה של Apex"] },
        { title: (a, n) => `${sh(a)} עוקבים אחרי ${he_(n, "סיכון פתוח", "סיכונים פתוחים")}`, events: ["{agent} זיהה הורדת מחיר אצל מתחרה והתריע ל־Apex", "{agent} מצא חוזה עם {co} שמתחדש בעוד 9 ימים", "{agent} וידא שכל הגיבויים הסתיימו במהלך הלילה"] },
        { title: (a, n) => `${sh(a)} מבצעים ${he_(n, "הוראה אסטרטגית", "הוראות אסטרטגיות")}`, events: ["{agent} הנחה את כל המנועים להתמקד השבוע בלקוחות אנטרפרייז", "{agent} העלה את רף איכות הלידים של IntentPulse אחרי בוקר חזק", "{agent} קבע סקירת צמיחה ליום שישי ב־9:00"] },
      ],
      flows: [(n) => `משחרר תקציב ל־${he_(n, "קמפיין סגירה חדש", "קמפייני סגירה חדשים")}`, (n) => `אושרו ${he_(n, "חוזה ספק", "חוזי ספקים")} לתיוק`, (n) => `הוסלמו ${he_(n, "שינוי שוק", "שינויי שוק")} להחלטה`],
      brief: (b) => [`כל המנועים נשארו בתוך הכללים שקבעתם. שום דבר לא דרש את תשומת הלב הדחופה שלכם.`, `${b.leads} לידים מסוננים עברו במערכת, והתקציב הלך אחרי אלה שהכי סביר שיקנו.`, `${usd(b.pipeline)} בפייפליין מוגנים כעת בתקציבים מאושרים ובתנאים חתומים.`, `נחסכו לכם כ־${Math.round(b.hours)} שעות של אישורים, סקירות ופגישות תקציב.`],
    },
    apex: {
      cards: [
        { title: (a, n) => `${sh(a)} סוגרים ${he_(n, "מכירה פעילה", "מכירות פעילות")}`, events: ["{agent} סגר עסקה של {amt} עם {co}", "{agent} שלח ל־{co} את התנאים הסופיים וקבע שיחת חתימה למחר", "{agent} טיפל בהתנגדות מחיר של {co} ושמר על התעריף המלא"] },
        { title: (a, n) => `${sh(a)} מנהלים ${he_(n, "שיחה עם קונה", "שיחות עם קונים")}`, events: ["{agent} פתח שיחת ייעוץ בהודעה פרטית באינסטגרם", "{agent} קיבל תשובה ממנהל הצמיחה של {co} בלינקדאין", "{agent} קבע שיחת היכרות עם {co} אחרי שיחת מעקב", "{agent} ענה בתוך פחות מדקה על שאלה של קונה לגבי תהליך ההטמעה"] },
        { title: (a, n) => `${sh(a)} מנסחים ${he_(n, "הצעה מותאמת", "הצעות מותאמות")}`, events: ["{agent} שלח הצעה של {amt} ל־{co}", "{agent} הוסיף סיפור הצלחה להצעה ל־{co} אחרי שביקשו הוכחה"] },
        { title: (a, n) => `${sh(a)} חוזרים אל ${he_(n, "ליד שקט", "לידים שקטים")}`, events: ["{agent} פתח מחדש עסקה עם {co} ששתקה כבר שבועיים", "{agent} שלח ל־{co} מייל מעקב קצר", "{agent} הזכיר לאיש קשר בלינקדאין ב־{co} את השיחה מהשבוע שעבר", "{agent} חזר לשיחת אינסטגרם שנעצרה באמצע שאלה"] },
      ],
      flows: [(n) => `מעביר ${he_(n, "ליד", "לידים")} לסגירה מיידית`, (n) => `שולח ${he_(n, "עסקה חתומה", "עסקאות חתומות")} לחוזים ולחשבוניות`, (n) => `מבקש אישור על ${he_(n, "הנחה", "הנחות")} מעל 15%`],
      brief: (b) => [`הסוגרים שלכם דיברו עם ${b.leads} קונים מתעניינים ב־24 השעות האחרונות.`, `${usd(b.pipeline)} בפייפליין נעולים כעת בהצעות, הסכמות בעל פה ועסקאות חתומות.`, `עסקאות חתומות עברו ישר ל־CoreOps לחוזים ולחשבוניות. אף אחד לא נאלץ להקליד שום דבר מחדש.`, `אלה כ־${Math.round(b.hours)} שעות של הודעות, מעקבים וכתיבת הצעות שלא הייתם צריכים לעשות.`],
    },
    coreops: {
      cards: [
        { title: (a, n) => `${sh(a)} קולטים ${he_(n, "לקוח חדש", "לקוחות חדשים")}`, events: ["{agent} שלח ל־{co} את החוזה וערכת הפתיחה 40 שניות אחרי סגירת העסקה", "{agent} הקים מרחב פרויקט משותף עבור {co}", "{agent} אסף מ־{co} את החוזה החתום ותייק אותו"] },
        { title: (a, n) => `${sh(a)} מסנכרנים ${he_(n, "מערכת מחוברת", "מערכות מחוברות")}`, events: ["{agent} התאים 312 אנשי קשר ב־CRM לרשומות החיוב", "{agent} תיקן 14 רשומות לקוח כפולות בשלושה כלים", "{agent} עדכן את שלב העסקה של {co} בכל מקום שבו היא מופיעה"] },
        { title: (a, n) => `${sh(a)} מעבדים ${he_(n, "חשבונית", "חשבוניות")}`, events: ["{agent} שלח ל־{co} חשבונית על {amt}", "{agent} גבה מ־{co} תשלום באיחור של {amt}", "{agent} התאים 46 תשלומים בבנק לחשבוניות שלהם"] },
        { title: (a, n) => `${sh(a)} מנתבים ${he_(n, "פנייה נכנסת", "פניות נכנסות")}`, events: ["{agent} העביר שאלת חיוב של {co} לכספים עם טיוטת תשובה", "{agent} העביר פניית מכירה חדשה ל־Apex", "{agent} סגר 9 פניות תמיכה שכבר נפתרו"] },
      ],
      flows: [(n) => `התקבלו ${he_(n, "עסקה חתומה", "עסקאות חתומות")} לקליטה`, (n) => `סומנו ${he_(n, "חשבונית באיחור", "חשבוניות באיחור")} מעל $20k לבדיקה`, (n) => `הוחזרו ${he_(n, "אזהרת נטישה", "אזהרות נטישה")} למכ״ם`],
      brief: (b) => [`לקוחות חדשים נקלטו בתוך דקות מהחתימה, עם חוזים וערכות פתיחה שנשלחו אוטומטית.`, `${usd(b.pipeline)} בחשבוניות נשלחו או נגבו, וכל תשלום הותאם לחשבונית שלו.`, `${b.leads} פניות חדשות הגיעו לאדם או למנוע הנכון בלי שאף אחד מיין את תיבת הדואר.`, `הצוות שלכם קיבל בחזרה כ־${Math.round(b.hours)} שעות של הזנת נתונים, תיוק ומרדפים.`],
    },
    intentpulse: {
      cards: [
        { title: (a, n) => `${sh(a)} סורקים ${he_(n, "מקור אותות חי", "מקורות אותות חיים")}`, events: ["{agent} מצא ב־{ch} קונה שמבקש בדיוק את מה שאתם מוכרים", "{agent} קלט פוסט של {co} ב־{ch} שמרמז על תקציב חדש", "{agent} זיהה 6 אנשים ב־{ch} שמשווים את המתחרים שלכם"] },
        { title: (a, n) => `${sh(a)} מסננים ${he_(n, "קונה חם", "קונים חמים")}`, events: ["{agent} חילץ ליד מאומת מ־{ch}: מקבל החלטות ב־{co}", "{agent} אישר מתוך שרשור ב־{ch} של־{co} יש תקציב ודדליין ברבעון הזה", "{agent} סינן ליד מ־{ch} שהתברר כפרויקט של סטודנטים"] },
        { title: (a, n) => `${sh(a)} עוקבים אחרי ${he_(n, "מהלך של מתחרה", "מהלכים של מתחרים")}`, events: ["{agent} שם לב שקונים ב־{ch} מגיבים להעלאת מחיר של 12% אצל מתחרה", "{agent} מצא ב־{ch} לקוחות לא מרוצים של מתחרה שמחפשים חלופות"] },
        { title: (a, n) => `${sh(a)} מכינים ${he_(n, "העברת ליד", "העברות לידים")}`, events: ["{agent} העביר ל־Apex ליד מ־{ch} של {co} עם סיכום של מה שהם צריכים", "{agent} רשם ליד מ־{ch} של {co} בלוח הבקרה שלכם לבדיקה", "{agent} העריך שליד מ־{ch} של {co} שווה כ־{amt}"] },
      ],
      flows: [(n) => `מעביר ${he_(n, "ליד", "לידים")} לסגירה מיידית`, (n) => `נרשמו ${he_(n, "ליד בכוונה גבוהה", "לידים בכוונה גבוהה")} לבדיקתכם`, (n) => `הוסלמו ${he_(n, "שינוי שוק", "שינויי שוק")} להחלטה`, (n) => `התקבלו ${he_(n, "אזהרת נטישה", "אזהרות נטישה")} למעקב`],
      brief: (b) => [`IntentPulse מצא ${b.leads} אנשים שמחפשים באופן פעיל את מה שאתם מציעים.`, `יחד הם שווים כ־${usd(b.pipeline)} בהכנסות פוטנציאליות.`, `הלידים החזקים ביותר הועברו בתוך שניות, לפני שהמתחרים הספיקו להגיע אליהם.`, `זה חסך כ־${Math.round(b.hours)} שעות של חיפוש, מחקר וסינון ידני.`],
    },
    vanguard: {
      cards: [
        { title: (a, n) => `${sh(a)} חוקרים ${he_(n, "חשבון יעד", "חשבונות יעד")}`, events: ["{agent} גילה ש־{co} מגייסת שלושה אנשי מכירות, טריגר קנייה קלאסי", "{agent} מיפה ארבעה מקבלי החלטות ב־{co} ואימת את כתובות המייל שלהם", "{agent} סימן את סבב הגיוס החדש של {co} כהזדמנות"] },
        { title: (a, n) => `${sh(a)} מריצים ${he_(n, "רצף פנייה יזומה", "רצפי פנייה יזומה")}`, events: ["{agent} שלח פנייה ראשונה אישית לסמנכ״ל המכירות של {co}", "{agent} קבע שיחת היכרות עם {co} בעקבות תשובה למייל קר", "{agent} פתח שיחה בלינקדאין עם המייסד של {co}", "{agent} השהה רצף אחרי ש־{co} ענו ״לא ברבעון הזה״"] },
        { title: (a, n) => `${sh(a)} עוקבים אחרי ${he_(n, "אות כוונה", "אותות כוונה")}`, events: ["{agent} תפס פוסט שמבקש בדיוק את מה שאתם מוכרים וענה בתוך דקות", "{agent} זיהה את {co} משווים את המתחרים שלכם באתר ביקורות", "{agent} רשם {amt} בפייפליין חדש מהתשובות של הבוקר"] },
        { title: (a, n) => `${sh(a)} מסננים ${he_(n, "פגישה שנקבעה", "פגישות שנקבעו")}`, events: ["{agent} סינן את {co}: התקציב אושר, החלטה בתוך 30 יום", "{agent} העביר ל־Apex פגישה חמה עם {co} עם כל המחקר מצורף", "{agent} הוסיף {amt} לפייפליין של 30 הימים הקרובים"] },
      ],
      flows: [(n) => `מעביר ${he_(n, "פגישה שנקבעה", "פגישות שנקבעו")}`, (n) => `מעביר ${he_(n, "אות חם", "אותות חמים")} לפנייה`, (n) => `מסנכרן ${he_(n, "חשבון חדש", "חשבונות חדשים")} ל־CRM`],
      brief: (b) => [`${b.leads} חשבונות יעד נחקרו ונוצר איתם קשר בקול שלכם.`, `${usd(b.pipeline)} בפייפליין צפוי נפתחו מפנייה קרה.`, `התשובות החמות ביותר נקבעו כפגישות והועברו ל־Apex באותה שעה.`, `כ־${Math.round(b.hours)} שעות של בניית רשימות, מחקר ומעקב נעשו בשבילכם.`],
    },
    cortex: {
      cards: [
        { title: (a, n) => `${sh(a)} מנתחים ${he_(n, "תמלול שיחה", "תמלולי שיחות")}`, events: ["{agent} גילה ש־{co} העלו חששות תקציב שלוש פעמים בשיחה של אתמול", "{agent} סימן אות קנייה: {co} שאלו על לוחות זמנים להטמעה", "{agent} דירג את הדמו של {co}: התאמה חזקה, דחיפות נמוכה"] },
        { title: (a, n) => `${sh(a)} מתמודדים עם ${he_(n, "התנגדות חיה", "התנגדויות חיות")}`, events: ["{agent} ניסח תשובה שמובילה בערך להתנגדות המחיר של {co}", "{agent} הפך את ה״אנחנו צריכים לחשוב על זה״ של {co} לשיחת החלטה שנקבעה", "{agent} בנה ל־{co} השוואה מול המתחרה שהזכירו"] },
        { title: (a, n) => `${sh(a)} כותבים ${he_(n, "תדריך סגירה", "תדריכי סגירה")}`, events: ["{agent} תדרך את הסוגר שלכם על {co}: מקבל ההחלטות, התקציב והסיכון האחד שצריך לנטרל", "{agent} צפה ש־{co} יבקשו הנחה והכין את הפשרה", "{agent} החזיר {amt} כשהחייה עסקה ששתקה אחרי הדמו"] },
        { title: (a, n) => `${sh(a)} מאיצים ${he_(n, "עסקה פתוחה", "עסקאות פתוחות")}`, events: ["{agent} קיצר את המחזור של {co} כששלח את חבילת האבטחה לפני שביקשו", "{agent} העביר את {co} לשלב החוזה, בשווי {amt}", "{agent} התריע ל־Shield ש־{co} חתמו רק על התחייבות קצרת טווח"] },
      ],
      flows: [(n) => `התבקשו ${he_(n, "תדריך התנגדויות", "תדריכי התנגדויות")}`, (n) => `נשלחו ${he_(n, "תסריט סגירה", "תסריטי סגירה")}`, (n) => `סומנו ${he_(n, "דפוס התנגדות מחיר", "דפוסי התנגדות מחיר")}`],
      brief: (b) => [`${b.leads} עסקאות חיות נותחו, כל אחת עם תוכנית להתנגדויות.`, `${usd(b.pipeline)} במהירות עסקאות הוחזרו מעסקאות תקועות ובסיכון.`, `כל סוגר נכנס לשיחות עם תדריך בעמוד אחד על מה שיכריע את העסקה.`, `נחסכו כ־${Math.round(b.hours)} שעות של סקירת שיחות, רישום והכנת מעקבים.`],
    },
    shield: {
      cards: [
        { title: (a, n) => `${sh(a)} מנטרים ${he_(n, "חשבון לקוח", "חשבונות לקוחות")}`, events: ["{agent} שם לב שהמשתמשים הפעילים של {co} ירדו ב־30% בתוך שבועיים", "{agent} סימן את {co}: האלוף הפנימי שלהם עזב הרגע את החברה", "{agent} אישר ש־{co} אימצו את הפיצ׳ר החדש אחרי ההטמעה"] },
        { title: (a, n) => `${sh(a)} מצילים ${he_(n, "חשבון בסיכון", "חשבונות בסיכון")}`, events: ["{agent} קבע שיחת הצלה עם סמנכ״ל התפעול של {co} לפני החידוש", "{agent} הציל את {co} ושמר על {amt} בהכנסה שנתית", "{agent} שלח ל־{co} תוכנית תיקון לבעיה שהתלוננו עליה"] },
        { title: (a, n) => `${sh(a)} מבטיחים ${he_(n, "חידוש קרוב", "חידושים קרובים")}`, events: ["{agent} חידש את {co} לשנה נוספת, 60 יום מראש", "{agent} הכין ל־{co} תדריך חידוש עם הוכחות שימוש", "{agent} תפס תשלום שנכשל אצל {co} ותיקן אותו לפני שהשירות נעצר"] },
        { title: (a, n) => `${sh(a)} מרחיבים ${he_(n, "חשבון בריא", "חשבונות בריאים")}`, events: ["{agent} זיהה ש־{co} מגיעים למכסת הרישיונות והציע שדרוג", "{agent} סגר הרחבה של {amt} עם {co}", "{agent} ביקש מ־Aether את מחיר השדרוג הטוב ביותר עבור {co}"] },
      ],
      flows: [(n) => `התקבלו ${he_(n, "חשבון שנקלט עכשיו", "חשבונות שנקלטו עכשיו")}`, (n) => `התבקשו ${he_(n, "מחיר שדרוג", "מחירי שדרוג")}`, (n) => `נשלחו ${he_(n, "חידוש בסיכון", "חידושים בסיכון")} לתדריך סגירה`],
      brief: (b) => [`${b.leads} חשבונות לקוחות נוטרו מסביב לשעון לאיתור סימנים מוקדמים לנטישה.`, `${usd(b.pipeline)} בהכנסה חוזרת נשמרו או ניצלו מביטול.`, `כל חשבון בסיכון קיבל מענה אישי לפני שהספיק לחמוק.`, `כ־${Math.round(b.hours)} שעות של סקירות חשבונות, הכנות לחידוש ושיחות הצלה טופלו בשבילכם.`],
    },
    aether: {
      cards: [
        { title: (a, n) => `${sh(a)} ממדלים ${he_(n, "נקודת מחיר", "נקודות מחיר")}`, events: ["{agent} גילה שקונים כמו {co} ישלמו 22% יותר על התוכנית השנתית", "{agent} בדק מסלול Growth חדש על 40 מבקרים וההמרות נשארו יציבות", "{agent} מיפה באילו פיצ׳רים {co} משתמשים הכי הרבה כדי לתמחר אותם נכון"] },
        { title: (a, n) => `${sh(a)} מארגנים מחדש ${he_(n, "מסלול תמחור", "מסלולי תמחור")}`, events: ["{agent} העביר את הדוחות למסלול Pro, שם הם מגדילים שדרוגים", "{agent} הציע תוסף לפי שימוש לחשבונות כבדים כמו {co}", "{agent} פתח {amt} בהרחבות כשאיגד מחדש את מסלול Pro"] },
        { title: (a, n) => `${sh(a)} מפקחים על ${he_(n, "בקשת הנחה", "בקשות הנחה")}`, events: ["{agent} חסם הנחה מיותרת של 25% ל־{co} והציע במקומה התחייבות לשנתיים", "{agent} אישר ל־{co} הנחה של 10% בתמורה לסיפור הצלחה", "{agent} חסך {amt} ברווחיות בעסקאות של השבוע"] },
        { title: (a, n) => `${sh(a)} מתמחרים ${he_(n, "הצעת הרחבה", "הצעות הרחבה")}`, events: ["{agent} תמחר את הרחבת הרישיונות של {co} במחיר שהם קיבלו בתוך יום", "{agent} שלח ל־Shield את הצעת השדרוג הנכונה עבור {co}", "{agent} הגדיל את ערך החוזה של {co} ב־{amt} בחידוש"] },
      ],
      flows: [(n) => `נשלחו ${he_(n, "מחירון חדש", "מחירונים חדשים")}`, (n) => `התבקשו ${he_(n, "מחיר שדרוג", "מחירי שדרוג")}`, (n) => `הוגשו ${he_(n, "שינוי מחיר", "שינויי מחיר")} לאישור`],
      brief: (b) => [`${b.leads} בדיקות מחיר ובקשות הנחה טופלו בלי פגישה אחת.`, `${usd(b.pipeline)} בערך חוזים נפתחו דרך איגוד חבילות, שדרוגים ומשמעת בהנחות.`, `אף עסקה לא נסגרה מתחת לרף הרווחיות שקבעתם.`, `נחסכו כ־${Math.round(b.hours)} שעות של מידול בגיליונות ודיונים על מחירים.`],
    },
  },
};

/** The flow target label for flows that go to a screen rather than an engine. */
export const DASHBOARD_LABEL = { en: "Dashboard", es: "Panel", he: "לוח בקרה" } as const;
