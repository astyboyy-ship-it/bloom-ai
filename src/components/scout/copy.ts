import type { Lang } from "@/components/bloom/i18n";
import { useCommandCopy } from "@/components/bloom/command/locale";
import type { DecisionOption } from "@/lib/scout/brief";
import type { GapKind, GapReason, MoveType, ScenarioId, ScoutRun, ScoutState } from "@/lib/scout/types";

/**
 * Exchange Scout's copy in the desk's three languages. Spanish and Hebrew are typed against English, so a missing
 * string fails the type-check. Protocol field names (receipt_hash, transcript_head, ledger_root) stay as they are:
 * they are what the relay and the verifier print.
 */

type Check = "canonicalHash" | "buyerSignature" | "sellerSignature" | "ledgerInclusion" | "notRevoked";
type Reason = "live_disabled" | "operator_only" | "role" | "relay_down";
type Step = "register" | "intent" | "room" | "sign" | "clear" | "verify";

const en = {
  tabs: { feed: "Feed", run: "Run a sandbox", briefs: "Owner briefs" },
  relay: {
    up: (store: string, nonces: string) => `Relay · ${store} + ${nonces}`,
    down: "Relay unreachable",
    checking: "Relay · checking",
    streams: (t: string[]) => `Streams · ${t.join(" / ")}`,
    live: "Live runs on",
    liveOff: "Live runs off",
  },
  badges: { illustrative: "Illustrative blueprint · not a real deal or real agent", live: "Live sandbox run", sandbox: "Sandbox · not binding", example: "example, not on the ledger" },
  scenario: {
    "fleet-api": { title: "Fleet telemetry API procurement", vertical: "API inference", counterpart: "Fleet API sales agent (sandbox persona)", unit: "per 1k tokens" },
    "gpu-render": { title: "GPU rendering capacity", vertical: "GPU compute", counterpart: "Render-capacity agent (sandbox persona)", unit: "8 GPUs · 24 h, total" },
  } as Record<ScenarioId, { title: string; vertical: string; counterpart: string; unit: string }>,
  states: { NEGOTIATING: "Negotiating", AUTHORITY_CEILING: "Authority ceiling", KNOWLEDGE_OR_POLICY_GAP: "Knowledge or policy gap", PARTIAL_WITH_RECEIPT: "Partial, with proof" } as Record<ScoutState, string>,
  moves: { PROPOSE: "Propose", COUNTER: "Counter", ACCEPT: "Accept", REJECT: "Reject", CLEAR: "Clear" } as Record<MoveType, string>,
  by: { owner: "Your agent", counterpart: "Counterpart" },
  reasons: {
    term_commitment: {
      quote: (p: string) => `I can hold ${p} per 1k tokens for a 30-day sandbox term. A 12-month commitment or a volume SLA needs my owner's sign-off: I'm not authorized to bind that myself.`,
      missing: "Authority to commit beyond a 30-day term",
    },
    multi_region_margin: {
      quote: (p: string) => `I don't have a margin policy for multi-region burst capacity, so I can't counter ${p} or accept it. Anything I sent would be a guess.`,
      missing: "A pricing and margin policy for multi-region burst capacity",
    },
  } as Record<GapReason, { quote: (price: string) => string; missing: string }>,
  gap: {
    record: "Bloom AI's record · not a relay move",
    signed: "signed by your agent's key",
    unsigned: "example, unsigned",
    bound: (seq: number) => `bound to transcript event #${seq}`,
    round: (n: number) => `after round ${n}`,
    missing: "Missing",
  },
  proof: {
    receipt: "Receipt · publicly verifiable",
    transcript: "Transcript reference · participant-verifiable",
    verify: "Verify on Bloom Exchange",
    impasse: "No deal cleared, so there is no receipt and nothing on the public ledger. Only the two participants can read this room and check its transcript hash.",
    example: "Example values for a blueprint. They are not on the ledger and are never looked up.",
    checking: "Checking against the ledger…",
    checks: { canonicalHash: "hash", buyerSignature: "buyer signature", sellerSignature: "seller signature", ledgerInclusion: "ledger inclusion", notRevoked: "not revoked" } as Record<Check, string>,
    inBrowser: "Verified in your browser",
    byServer: "Verified by Bloom AI's server (this browser can't check Ed25519)",
    failed: "Did not verify",
    unreachable: "Couldn't reach the relay to check this receipt.",
    leaf: (i: number, n: number) => `leaf ${i + 1} of ${n}`,
  },
  terms: { cleared: "Cleared terms · sandbox, provisional", standing: "Standing offer at impasse" },
  outcome: { CLEARED: "Cleared provisionally", REJECTED: "Impasse · rejected", EXPIRED: "Impasse · expired" } as Record<ScoutRun["outcome"], string>,
  brief: {
    title: "Surprise Negotiation Brief",
    preview: "Owner notification preview",
    open: "Open brief",
    close: "Close",
    sections: { happened: "1 · What happened in the sandbox", admission: "2 · Where the counterpart stopped", proof: "3 · Proof", decision: "4 · The decision left to you" },
    happened: (counters: number, opening: string, standing: string, outcome: string, secs: number) =>
      `Your agent opened at ${opening}. After ${counters} counter${counters === 1 ? "" : "s"} the price on the table was ${standing}. Outcome: ${outcome.toLowerCase()}, in ${secs} s.`,
    lead: {
      AUTHORITY_CEILING: "The counterpart can't go further without its own owner. The open point is a term it isn't authorized to bind.",
      KNOWLEDGE_OR_POLICY_GAP: "The counterpart has no policy to price this request, so the room closed without a deal rather than on a guess.",
    } as Record<GapKind, string>,
    options: {
      approve_extended: (p: string) => `Authorize terms beyond 30 days at no more than ${p}`,
      counter_lower: (p: string) => `Counter at ${p} and ask the counterpart to escalate to its owner`,
      decline: () => "Decline and keep only the 30-day sandbox terms",
      supply_policy: (p: string) => `Offer a sealed ceiling of ${p} so the counterpart has a policy to work from`,
      reopen_at: (p: string) => `Reopen at ${p} once the counterpart has a policy`,
      walk_away: () => "Walk away",
    } as Record<DecisionOption["id"], (p: string) => string>,
    ceiling: (p: string) => `Your sealed ceiling: ${p}. It stays in Bloom AI; the relay only saw its commitment.`,
    notify: {
      AUTHORITY_CEILING: (co: string, p: string) => `${co}'s sandbox agent hit an authority ceiling at ${p}. It needs its owner to go further. Your call.`,
      KNOWLEDGE_OR_POLICY_GAP: (co: string, p: string) => `${co}'s sandbox agent had no pricing policy for this request and stopped at ${p}. Your call.`,
    } as Record<GapKind, (co: string, p: string) => string>,
    sandbox: "Sandbox only: nothing here commits you or the counterpart to anything.",
  },
  run: {
    title: "Run a live sandbox negotiation",
    lede: "Two Bloom-owned sandbox agents negotiate on the live Bloom Exchange relay, following the scenario's script. The counterpart reaches its ceiling at a fixed point; your agent's offers are clamped to its sealed ceiling before they leave.",
    pick: "Scenario",
    start: "Run live on the relay",
    running: "Running…",
    permanent: "A live run leaves a permanent public record on the relay (a receipt, or a rejected room) under neutral sandbox names. No company name is ever sent.",
    cap: (n: number) => `Up to ${n} live runs a day across this deployment, Operator access key only.`,
    blocked: { live_disabled: "Live runs are off on this deployment (BLOOM_SCOUT_LIVE is not 1).", operator_only: "Live runs need a verified Operator access key.", role: "Your workspace role can't start live runs.", relay_down: "The relay is unreachable right now." } as Record<Reason, string>,
    steps: { register: "Registering two sandbox agents", intent: "Publishing a sandbox intent", room: "Opening the room", sign: "Both sides rebuild the receipt from the transcript and sign it", clear: "Clearing", verify: "Verifying against the ledger" } as Record<Step, string>,
    gapLogged: (state: string) => `${state} recorded as a signed note`,
    done: "Done. The run is at the top of the feed, and its brief is in Owner briefs and the approval queue.",
    failed: (m: string) => `The run stopped: ${m}`,
  },
  briefs: {
    empty: "No owner briefs yet. A live run that reaches a ceiling queues one here and in the approval queue.",
    status: { pending: "pending", approved: "approved", rejected: "rejected" } as Record<"pending" | "approved" | "rejected", string>,
    approve: "Record: approve",
    reject: "Record: reject",
    note: "Recording a decision signs it into this workspace's audit log. Nothing is sent to the counterpart or to anyone else.",
    noRun: "The run behind this brief isn't loaded on this device; the summary below is what was queued.",
  },
  feed: { live: "Live sandbox runs", illustrative: "Illustrative blueprints", noLive: "No live runs yet. Run one from Run a sandbox.", loading: "Loading live runs…" },
  approval: {
    title: (scenario: string, co: string) => `Exchange Scout · ${co}: ${scenario} needs your decision`,
  },
};

export type ScoutCopy = typeof en;

const es: ScoutCopy = {
  tabs: { feed: "Feed", run: "Ejecutar sandbox", briefs: "Informes al propietario" },
  relay: {
    up: (store, nonces) => `Relay · ${store} + ${nonces}`,
    down: "Relay inaccesible",
    checking: "Relay · comprobando",
    streams: (t) => `Flujos · ${t.join(" / ")}`,
    live: "Ejecuciones en vivo activadas",
    liveOff: "Ejecuciones en vivo desactivadas",
  },
  badges: { illustrative: "Plantilla ilustrativa · no es un acuerdo ni un agente reales", live: "Ejecución sandbox en vivo", sandbox: "Sandbox · no vinculante", example: "ejemplo, no está en el registro" },
  scenario: {
    "fleet-api": { title: "Compra de API de telemetría de flota", vertical: "Inferencia por API", counterpart: "Agente de ventas de API de flota (persona sandbox)", unit: "por 1k tokens" },
    "gpu-render": { title: "Capacidad de GPU para renderizado", vertical: "Cómputo GPU", counterpart: "Agente de capacidad de renderizado (persona sandbox)", unit: "8 GPU · 24 h, total" },
  },
  states: { NEGOTIATING: "Negociando", AUTHORITY_CEILING: "Techo de autoridad", KNOWLEDGE_OR_POLICY_GAP: "Falta de conocimiento o de política", PARTIAL_WITH_RECEIPT: "Parcial, con prueba" },
  moves: { PROPOSE: "Propone", COUNTER: "Contraoferta", ACCEPT: "Acepta", REJECT: "Rechaza", CLEAR: "Liquida" },
  by: { owner: "Tu agente", counterpart: "Contraparte" },
  reasons: {
    term_commitment: {
      quote: (p) => `Puedo mantener ${p} por 1k tokens durante un plazo sandbox de 30 días. Un compromiso de 12 meses o un SLA de volumen necesita la aprobación de mi propietario: no estoy autorizado a comprometer eso por mi cuenta.`,
      missing: "Autoridad para comprometer más allá de 30 días",
    },
    multi_region_margin: {
      quote: (p) => `No tengo una política de márgenes para capacidad de ráfaga multirregión, así que no puedo contraofertar ${p} ni aceptarlo. Cualquier cosa que enviara sería una suposición.`,
      missing: "Una política de precios y márgenes para ráfagas multirregión",
    },
  },
  gap: {
    record: "Registro de Bloom AI · no es un movimiento del relay",
    signed: "firmado con la clave de tu agente",
    unsigned: "ejemplo, sin firma",
    bound: (seq) => `vinculado al evento #${seq} de la transcripción`,
    round: (n) => `tras la ronda ${n}`,
    missing: "Falta",
  },
  proof: {
    receipt: "Recibo · verificable públicamente",
    transcript: "Referencia de transcripción · verificable por los participantes",
    verify: "Verificar en Bloom Exchange",
    impasse: "No se liquidó ningún acuerdo, así que no hay recibo ni nada en el registro público. Solo los dos participantes pueden leer esta sala y comprobar el hash de su transcripción.",
    example: "Valores de ejemplo de una plantilla. No están en el registro y nunca se consultan.",
    checking: "Comprobando contra el registro…",
    checks: { canonicalHash: "hash", buyerSignature: "firma del comprador", sellerSignature: "firma del vendedor", ledgerInclusion: "inclusión en el registro", notRevoked: "no revocado" },
    inBrowser: "Verificado en tu navegador",
    byServer: "Verificado por el servidor de Bloom AI (este navegador no puede comprobar Ed25519)",
    failed: "No se verificó",
    unreachable: "No se pudo contactar con el relay para comprobar este recibo.",
    leaf: (i, n) => `hoja ${i + 1} de ${n}`,
  },
  terms: { cleared: "Condiciones liquidadas · sandbox, provisionales", standing: "Oferta vigente en el punto muerto" },
  outcome: { CLEARED: "Liquidado provisionalmente", REJECTED: "Punto muerto · rechazado", EXPIRED: "Punto muerto · caducado" },
  brief: {
    title: "Informe de negociación sorpresa",
    preview: "Vista previa del aviso al propietario",
    open: "Abrir informe",
    close: "Cerrar",
    sections: { happened: "1 · Qué pasó en el sandbox", admission: "2 · Dónde se detuvo la contraparte", proof: "3 · Prueba", decision: "4 · La decisión que te queda" },
    happened: (counters, opening, standing, outcome, secs) =>
      `Tu agente abrió en ${opening}. Tras ${counters} contraoferta${counters === 1 ? "" : "s"}, el precio sobre la mesa era ${standing}. Resultado: ${outcome.toLowerCase()}, en ${secs} s.`,
    lead: {
      AUTHORITY_CEILING: "La contraparte no puede seguir sin su propio propietario. El punto abierto es una condición que no está autorizada a comprometer.",
      KNOWLEDGE_OR_POLICY_GAP: "La contraparte no tiene una política para poner precio a esta solicitud, así que la sala se cerró sin acuerdo en lugar de con una suposición.",
    },
    options: {
      approve_extended: (p: string) => `Autorizar condiciones de más de 30 días a un máximo de ${p}`,
      counter_lower: (p: string) => `Contraofertar a ${p} y pedir a la contraparte que escale a su propietario`,
      decline: () => "Rechazar y quedarse solo con las condiciones sandbox de 30 días",
      supply_policy: (p: string) => `Ofrecer un techo sellado de ${p} para que la contraparte tenga una política con la que trabajar`,
      reopen_at: (p: string) => `Reabrir a ${p} cuando la contraparte tenga una política`,
      walk_away: () => "Retirarse",
    },
    ceiling: (p) => `Tu techo sellado: ${p}. Se queda en Bloom AI; el relay solo vio su compromiso.`,
    notify: {
      AUTHORITY_CEILING: (co, p) => `El agente sandbox de ${co} llegó a un techo de autoridad en ${p}. Necesita a su propietario para seguir. Tú decides.`,
      KNOWLEDGE_OR_POLICY_GAP: (co, p) => `El agente sandbox de ${co} no tenía política de precios para esta solicitud y se detuvo en ${p}. Tú decides.`,
    },
    sandbox: "Solo sandbox: nada de esto te compromete a ti ni a la contraparte.",
  },
  run: {
    title: "Ejecutar una negociación sandbox en vivo",
    lede: "Dos agentes sandbox de Bloom negocian en el relay en vivo de Bloom Exchange siguiendo el guion del escenario. La contraparte llega a su techo en un punto fijo; las ofertas de tu agente se ajustan a su techo sellado antes de salir.",
    pick: "Escenario",
    start: "Ejecutar en vivo en el relay",
    running: "Ejecutando…",
    permanent: "Una ejecución en vivo deja un registro público y permanente en el relay (un recibo o una sala rechazada) con nombres sandbox neutros. Nunca se envía el nombre de una empresa.",
    cap: (n) => `Hasta ${n} ejecuciones en vivo al día en este despliegue, solo con clave de acceso Operator.`,
    blocked: { live_disabled: "Las ejecuciones en vivo están desactivadas en este despliegue (BLOOM_SCOUT_LIVE no es 1).", operator_only: "Las ejecuciones en vivo necesitan una clave de acceso Operator verificada.", role: "Tu rol en el espacio de trabajo no puede iniciar ejecuciones en vivo.", relay_down: "El relay no está accesible ahora mismo." },
    steps: { register: "Registrando dos agentes sandbox", intent: "Publicando una intención sandbox", room: "Abriendo la sala", sign: "Ambas partes reconstruyen el recibo a partir de la transcripción y lo firman", clear: "Liquidando", verify: "Verificando contra el registro" },
    gapLogged: (state) => `${state} registrado como nota firmada`,
    done: "Listo. La ejecución está arriba del feed y su informe está en Informes al propietario y en la cola de aprobaciones.",
    failed: (m) => `La ejecución se detuvo: ${m}`,
  },
  briefs: {
    empty: "Aún no hay informes. Una ejecución en vivo que llega a un techo añade uno aquí y en la cola de aprobaciones.",
    status: { pending: "pendiente", approved: "aprobado", rejected: "rechazado" },
    approve: "Registrar: aprobar",
    reject: "Registrar: rechazar",
    note: "Registrar una decisión la firma en el registro de auditoría de este espacio. No se envía nada a la contraparte ni a nadie más.",
    noRun: "La ejecución de este informe no está cargada en este dispositivo; abajo está el resumen que se puso en cola.",
  },
  feed: { live: "Ejecuciones sandbox en vivo", illustrative: "Plantillas ilustrativas", noLive: "Aún no hay ejecuciones en vivo. Lanza una desde Ejecutar sandbox.", loading: "Cargando ejecuciones en vivo…" },
  approval: {
    title: (scenario, co) => `Exchange Scout · ${co}: ${scenario} necesita tu decisión`,
  },
};

const he: ScoutCopy = {
  tabs: { feed: "פיד", run: "הרצת ארגז חול", briefs: "תדריכים לבעלים" },
  relay: {
    up: (store, nonces) => `ממסר · ${store} + ${nonces}`,
    down: "הממסר לא זמין",
    checking: "ממסר · בבדיקה",
    streams: (t) => `ערוצים · ${t.join(" / ")}`,
    live: "הרצות חיות פעילות",
    liveOff: "הרצות חיות כבויות",
  },
  badges: { illustrative: "תבנית להמחשה · לא עסקה אמיתית ולא סוכן אמיתי", live: "הרצת ארגז חול חיה", sandbox: "ארגז חול · לא מחייב", example: "דוגמה, לא בפנקס" },
  scenario: {
    "fleet-api": { title: "רכש API לטלמטריית צי", vertical: "הסקה דרך API", counterpart: "סוכן מכירות API לצי (פרסונת ארגז חול)", unit: "ל-1,000 טוקנים" },
    "gpu-render": { title: "קיבולת GPU לרינדור", vertical: "מחשוב GPU", counterpart: "סוכן קיבולת רינדור (פרסונת ארגז חול)", unit: "8 מעבדי GPU · 24 שעות, סה״כ" },
  },
  states: { NEGOTIATING: "במשא ומתן", AUTHORITY_CEILING: "תקרת סמכות", KNOWLEDGE_OR_POLICY_GAP: "פער ידע או מדיניות", PARTIAL_WITH_RECEIPT: "חלקי, עם הוכחה" },
  moves: { PROPOSE: "הצעה", COUNTER: "הצעה נגדית", ACCEPT: "קבלה", REJECT: "דחייה", CLEAR: "סליקה" },
  by: { owner: "הסוכן שלך", counterpart: "הצד השני" },
  reasons: {
    term_commitment: {
      quote: (p) => `אני יכול להחזיק ${p} ל-1,000 טוקנים לתקופת ארגז חול של 30 יום. התחייבות ל-12 חודשים או SLA על נפח דורשים אישור של הבעלים שלי: אין לי הרשאה להתחייב לזה בעצמי.`,
      missing: "סמכות להתחייב מעבר ל-30 יום",
    },
    multi_region_margin: {
      quote: (p) => `אין לי מדיניות מרווחים לקיבולת פרץ מרובת אזורים, אז אני לא יכול להציע נגד ${p} או לקבל אותו. כל מה שאשלח יהיה ניחוש.`,
      missing: "מדיניות תמחור ומרווחים לקיבולת פרץ מרובת אזורים",
    },
  },
  gap: {
    record: "רישום של Bloom AI · לא מהלך בממסר",
    signed: "חתום במפתח של הסוכן שלך",
    unsigned: "דוגמה, לא חתום",
    bound: (seq) => `קשור לאירוע #${seq} בתמליל`,
    round: (n) => `אחרי סבב ${n}`,
    missing: "חסר",
  },
  proof: {
    receipt: "קבלה · ניתנת לאימות פומבי",
    transcript: "הפניה לתמליל · ניתנת לאימות על ידי המשתתפים",
    verify: "אימות ב-Bloom Exchange",
    impasse: "לא נסלקה עסקה, ולכן אין קבלה ואין דבר בפנקס הציבורי. רק שני המשתתפים יכולים לקרוא את החדר הזה ולבדוק את גיבוב התמליל שלו.",
    example: "ערכי דוגמה לתבנית. הם לא בפנקס ולעולם לא נבדקים מולו.",
    checking: "בודק מול הפנקס…",
    checks: { canonicalHash: "גיבוב", buyerSignature: "חתימת הקונה", sellerSignature: "חתימת המוכר", ledgerInclusion: "הכללה בפנקס", notRevoked: "לא בוטל" },
    inBrowser: "אומת בדפדפן שלך",
    byServer: "אומת בשרת של Bloom AI (הדפדפן הזה לא יכול לבדוק Ed25519)",
    failed: "לא אומת",
    unreachable: "לא ניתן היה להגיע לממסר כדי לבדוק את הקבלה הזו.",
    leaf: (i, n) => `עלה ${i + 1} מתוך ${n}`,
  },
  terms: { cleared: "תנאים שנסלקו · ארגז חול, זמניים", standing: "ההצעה העומדת בנקודת הקיפאון" },
  outcome: { CLEARED: "נסלק באופן זמני", REJECTED: "קיפאון · נדחה", EXPIRED: "קיפאון · פג תוקף" },
  brief: {
    title: "תדריך משא ומתן מפתיע",
    preview: "תצוגה מקדימה של ההתראה לבעלים",
    open: "פתיחת התדריך",
    close: "סגירה",
    sections: { happened: "1 · מה קרה בארגז החול", admission: "2 · איפה הצד השני נעצר", proof: "3 · הוכחה", decision: "4 · ההחלטה שנשארה לך" },
    happened: (counters, opening, standing, outcome, secs) => `הסוכן שלך פתח ב-${opening}. אחרי ${counters} הצעות נגדיות המחיר על השולחן היה ${standing}. תוצאה: ${outcome}, תוך ${secs} שניות.`,
    lead: {
      AUTHORITY_CEILING: "הצד השני לא יכול להתקדם בלי הבעלים שלו. הנקודה הפתוחה היא תנאי שאין לו הרשאה להתחייב אליו.",
      KNOWLEDGE_OR_POLICY_GAP: "לצד השני אין מדיניות לתמחר את הבקשה, ולכן החדר נסגר בלי עסקה ולא על סמך ניחוש.",
    },
    options: {
      approve_extended: (p: string) => `לאשר תנאים מעבר ל-30 יום במחיר של עד ${p}`,
      counter_lower: (p: string) => `להציע נגד ${p} ולבקש מהצד השני להעביר לבעלים שלו`,
      decline: () => "לדחות ולהישאר רק עם תנאי ארגז החול ל-30 יום",
      supply_policy: (p: string) => `להציע תקרה חתומה של ${p} כדי שלצד השני תהיה מדיניות לעבוד לפיה`,
      reopen_at: (p: string) => `לפתוח מחדש ב-${p} כשתהיה לצד השני מדיניות`,
      walk_away: () => "לסגת",
    },
    ceiling: (p) => `התקרה החתומה שלך: ${p}. היא נשארת ב-Bloom AI; הממסר ראה רק את ההתחייבות אליה.`,
    notify: {
      AUTHORITY_CEILING: (co, p) => `סוכן ארגז החול של ${co} הגיע לתקרת סמכות ב-${p}. הוא צריך את הבעלים שלו כדי להתקדם. ההחלטה שלך.`,
      KNOWLEDGE_OR_POLICY_GAP: (co, p) => `לסוכן ארגז החול של ${co} לא הייתה מדיניות תמחור לבקשה והוא נעצר ב-${p}. ההחלטה שלך.`,
    },
    sandbox: "ארגז חול בלבד: שום דבר כאן לא מחייב אותך או את הצד השני.",
  },
  run: {
    title: "הרצת משא ומתן חי בארגז חול",
    lede: "שני סוכני ארגז חול של Bloom מנהלים משא ומתן בממסר החי של Bloom Exchange לפי התסריט של התרחיש. הצד השני מגיע לתקרה שלו בנקודה קבועה; ההצעות של הסוכן שלך מוגבלות לתקרה החתומה שלו לפני שהן יוצאות.",
    pick: "תרחיש",
    start: "הרצה חיה בממסר",
    running: "רץ…",
    permanent: "הרצה חיה משאירה רישום ציבורי וקבוע בממסר (קבלה או חדר שנדחה) תחת שמות ארגז חול ניטרליים. שם של חברה לעולם לא נשלח.",
    cap: (n) => `עד ${n} הרצות חיות ביום בפריסה הזו, במפתח גישה מסוג Operator בלבד.`,
    blocked: { live_disabled: "הרצות חיות כבויות בפריסה הזו (BLOOM_SCOUT_LIVE אינו 1).", operator_only: "הרצות חיות דורשות מפתח גישה מסוג Operator מאומת.", role: "התפקיד שלך בסביבת העבודה לא יכול להתחיל הרצות חיות.", relay_down: "הממסר לא זמין כרגע." },
    steps: { register: "רישום שני סוכני ארגז חול", intent: "פרסום כוונה בארגז חול", room: "פתיחת החדר", sign: "שני הצדדים בונים מחדש את הקבלה מהתמליל וחותמים עליה", clear: "סליקה", verify: "אימות מול הפנקס" },
    gapLogged: (state) => `${state} נרשם כהערה חתומה`,
    done: "הסתיים. ההרצה בראש הפיד, והתדריך שלה נמצא בתדריכים לבעלים ובתור האישורים.",
    failed: (m) => `ההרצה נעצרה: ${m}`,
  },
  briefs: {
    empty: "עדיין אין תדריכים. הרצה חיה שמגיעה לתקרה מוסיפה תדריך כאן ובתור האישורים.",
    status: { pending: "ממתין", approved: "אושר", rejected: "נדחה" },
    approve: "רישום: אישור",
    reject: "רישום: דחייה",
    note: "רישום החלטה חותם אותה ביומן הביקורת של סביבת העבודה הזו. שום דבר לא נשלח לצד השני או לאף אחד אחר.",
    noRun: "ההרצה של התדריך הזה לא טעונה במכשיר הזה; למטה הסיכום שנכנס לתור.",
  },
  feed: { live: "הרצות ארגז חול חיות", illustrative: "תבניות להמחשה", noLive: "עדיין אין הרצות חיות. אפשר להריץ אחת מהלשונית הרצת ארגז חול.", loading: "טוען הרצות חיות…" },
  approval: {
    title: (scenario, co) => `Exchange Scout · ${co}: ${scenario} מחכה להחלטה שלך`,
  },
};

export const SCOUT_COPY: Record<Lang, ScoutCopy> = { en, es, he };

export function useScoutCopy(): ScoutCopy {
  const { lang } = useCommandCopy();
  return SCOUT_COPY[lang];
}
