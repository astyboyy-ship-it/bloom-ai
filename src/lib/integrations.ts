import type { EngineKey } from "@/components/bloom/command/engines";
import { ARCHITECTURES } from "@/lib/architectures";

/**
 * Where Bloom Exchange and Bloom Scout are incorporated: the single source for both "Where it's incorporated"
 * explorers on the website. Every claim points at the code that makes it true (`where`, repository paths that a test
 * checks exist), and every engine that does NOT use a product is listed too, with the reason, so the explorer never
 * implies more than the code does.
 *
 *   live     in the code today
 *   new      added in this release (engine tools: exchange_verify_receipt, exchange_commit_terms,
 *            handoff_gap_detect, exchange_payload_policy; Shield refusals in the Threat Matrix)
 *   skipped  deliberately not used: it would add noise, not capability
 *
 * Architecture entries are derived from each architecture's engine chain, so they can't drift from the products.
 */

export type Product = "exchange" | "scout";
export type Status = "live" | "new" | "skipped";
export type Group = "engines" | "architectures" | "platform";
export type L10n = { en: string; es: string; he: string };

/**
 * One concrete integration point. `mechanics` is the proof (Exchange) or the gap and handoff mechanics (Scout). `tool`
 * names the engine tool when the point is one: only those travel into architectures, because a tool is available
 * whenever its engine runs, while the clearinghouse roles only run inside a Bloom Exchange clearing.
 */
export type Point = { status: Exclude<Status, "skipped">; upgrade: L10n; mechanics: L10n; where: string[]; tool?: string };

export type EngineNode = { group: "engines"; id: EngineKey; points: Point[]; skipped?: L10n };
export type PlatformNode = { group: "platform"; id: string; name: L10n; points: Point[]; href?: string };
export type ArchitectureNode = { group: "architectures"; id: string; via: { engine: EngineKey; tool: string; status: Exclude<Status, "skipped"> }[] };
export type IntegrationNode = EngineNode | PlatformNode | ArchitectureNode;

export const RELAY_URL = "https://bloom-exchange-relay.vercel.app";
export const VERIFIER_URL = "https://bloom-exchange-verify.vercel.app";

const ENGINE_ORDER: EngineKey[] = ["sovereign", "apex", "coreops", "intentpulse", "vanguard", "cortex", "shield", "aether"];

// ---------------------------------------------------------------------------------------------------------
// Bloom Exchange
// ---------------------------------------------------------------------------------------------------------

const EXCHANGE_ENGINES: Record<EngineKey, Omit<EngineNode, "group" | "id">> = {
  sovereign: {
    points: [
      {
        status: "live",
        upgrade: {
          en: "Every offer is clamped to the sealed mandate by code before it leaves, and the final terms are checked against both mandates before anything is signed.",
          es: "Cada oferta se ajusta por código al mandato sellado antes de salir, y las condiciones finales se comprueban contra ambos mandatos antes de firmar nada.",
          he: "כל הצעה מוגבלת בקוד למנדט החתום לפני שהיא יוצאת, והתנאים הסופיים נבדקים מול שני המנדטים לפני שנחתם משהו.",
        },
        mechanics: {
          en: "Salted SHA-256 commitments to both mandates, then an Ed25519-signed BLOOM-XCH certificate.",
          es: "Compromisos SHA-256 con sal para ambos mandatos y luego un certificado BLOOM-XCH firmado con Ed25519.",
          he: "התחייבויות SHA-256 עם מלח לשני המנדטים, ואחריהן תעודת BLOOM-XCH חתומה ב-Ed25519.",
        },
        where: ["src/lib/exchange/settlement.ts", "src/lib/exchange/vault.ts"],
      },
      {
        status: "new",
        upgrade: {
          en: "Sovereign accepts a settlement reached on Bloom Exchange only after its receipt verifies; otherwise it holds it for a human.",
          es: "Sovereign acepta un acuerdo alcanzado en Bloom Exchange solo después de verificar su recibo; si no, lo retiene para una persona.",
          he: "Sovereign מקבל הסדר שהושג ב-Bloom Exchange רק אחרי שהקבלה שלו מאומתת; אחרת הוא מעכב אותו להחלטה אנושית.",
        },
        mechanics: {
          en: "exchange_verify_receipt: canonical hash, both signatures, RFC 6962 ledger inclusion and revocation, checked locally with no trust in the relay.",
          es: "exchange_verify_receipt: hash canónico, ambas firmas, inclusión en el registro RFC 6962 y revocación, comprobados localmente sin confiar en el relay.",
          he: "exchange_verify_receipt: גיבוב קנוני, שתי החתימות, הכללה בפנקס לפי RFC 6962 וביטול, נבדקים מקומית בלי לסמוך על הממסר.",
        },
        tool: "exchange_verify_receipt",
        where: ["src/lib/engines/tools/exchange.ts", "src/lib/engines/01-sovereign.ts"],
      },
    ],
  },
  shield: {
    points: [
      {
        status: "live",
        upgrade: {
          en: "Inside a clearing, Shield screens the counterparty's payload before any engine reads it and scores how far to trust it.",
          es: "Dentro de una liquidación, Shield revisa el contenido de la contraparte antes de que lo lea ningún motor y puntúa cuánto confiar en ella.",
          he: "בתוך סליקה, Shield סורק את המטען של הצד השני לפני שמנוע כלשהו קורא אותו, וקובע כמה אפשר לסמוך עליו.",
        },
        mechanics: {
          en: "Hidden text, injected instructions and override loops are neutralized; every intercept is written to a hash-chained audit log.",
          es: "El texto oculto, las instrucciones inyectadas y los bucles de anulación se neutralizan; cada intercepción queda en un registro de auditoría encadenado por hash.",
          he: "טקסט מוסתר, הוראות מוזרקות ולולאות עקיפה מנוטרלים; כל יירוט נרשם ביומן ביקורת משורשר בגיבוב.",
        },
        where: ["src/lib/exchange/firewall.ts", "src/lib/exchange/bloom-bridge.ts"],
      },
    ],
  },
  cortex: {
    points: [
      {
        status: "live",
        upgrade: {
          en: "Cortex reads each counter-offer for bluffing, anchoring and stalling, and that sets how quickly your side concedes.",
          es: "Cortex lee cada contraoferta en busca de faroles, anclajes y demoras, y eso fija lo rápido que cede tu lado.",
          he: "Cortex קורא כל הצעה נגדית ומחפש בלוף, עיגון והשהיה, וזה קובע כמה מהר הצד שלך מוותר.",
        },
        mechanics: {
          en: "Its signal for each round is recorded in the round hash chain that the certificate seals.",
          es: "Su señal de cada ronda se registra en la cadena de hashes de rondas que sella el certificado.",
          he: "האות שלו בכל סבב נרשם בשרשרת הגיבובים של הסבבים שהתעודה חותמת.",
        },
        where: ["src/lib/exchange/bloom-bridge.ts", "src/lib/exchange/enclave.ts"],
      },
    ],
  },
  aether: {
    points: [
      {
        status: "live",
        upgrade: {
          en: "Aether restructures payment terms during a clearing and proves the margin still holds.",
          es: "Aether reestructura las condiciones de pago durante una liquidación y demuestra que el margen se mantiene.",
          he: "Aether מארגן מחדש את תנאי התשלום במהלך סליקה ומוכיח שהמרווח נשמר.",
        },
        mechanics: {
          en: "The margin proof is part of the signed certificate.",
          es: "La prueba de margen forma parte del certificado firmado.",
          he: "הוכחת המרווח היא חלק מהתעודה החתומה.",
        },
        where: ["src/lib/exchange/bloom-bridge.ts"],
      },
      {
        status: "new",
        upgrade: {
          en: "Before a price is negotiated, Aether seals its floor the way Bloom Exchange does and clamps the quote to it, so the decision can be proven later without revealing the floor.",
          es: "Antes de negociar un precio, Aether sella su mínimo como lo hace Bloom Exchange y ajusta la cotización a él, para poder demostrar la decisión más tarde sin revelar el mínimo.",
          he: "לפני שמתנהל משא ומתן על מחיר, Aether חותם את הרצפה שלו כמו ש-Bloom Exchange עושה ומגביל את ההצעה אליה, כך שאפשר להוכיח את ההחלטה בהמשך בלי לחשוף את הרצפה.",
        },
        mechanics: {
          en: "exchange_commit_terms: a salted commitment in the relay's own bloom-mandate/1 format; only the commitment is shared.",
          es: "exchange_commit_terms: un compromiso con sal en el formato bloom-mandate/1 del propio relay; solo se comparte el compromiso.",
          he: "exchange_commit_terms: התחייבות עם מלח בפורמט bloom-mandate/1 של הממסר עצמו; רק ההתחייבות משותפת.",
        },
        tool: "exchange_commit_terms",
        where: ["src/lib/engines/tools/exchange.ts", "src/lib/engines/08-aether.ts"],
      },
    ],
  },
  apex: {
    points: [
      {
        status: "live",
        upgrade: {
          en: "Apex writes each counter-offer, with a live model when one is licensed or a deterministic plan otherwise.",
          es: "Apex redacta cada contraoferta, con un modelo en vivo cuando hay licencia o con un plan determinista si no.",
          he: "Apex מנסח כל הצעה נגדית, עם מודל חי כשיש רישיון או עם תוכנית דטרמיניסטית אחרת.",
        },
        mechanics: {
          en: "The model only proposes: Sovereign's clamp, not the model, decides what is sent.",
          es: "El modelo solo propone: lo que se envía lo decide el ajuste de Sovereign, no el modelo.",
          he: "המודל רק מציע: מה שנשלח נקבע על ידי ההגבלה של Sovereign, לא על ידי המודל.",
        },
        where: ["src/lib/exchange/bloom-bridge.ts", "src/lib/exchange/live-model.ts"],
      },
    ],
  },
  intentpulse: {
    points: [],
    skipped: {
      en: "It finds buying signals. Nothing is priced or settled there, so a clearing step would only add delay.",
      es: "Encuentra señales de compra. Allí no se fija ni se liquida ningún precio, así que un paso de liquidación solo añadiría demora.",
      he: "הוא מאתר אותות קנייה. שם לא מתמחרים ולא סולקים דבר, אז שלב סליקה רק היה מוסיף עיכוב.",
    },
  },
  vanguard: {
    points: [],
    skipped: {
      en: "It writes and sends outreach. No other agent agrees terms with it.",
      es: "Redacta y envía la prospección. Ningún otro agente acuerda condiciones con él.",
      he: "הוא כותב ושולח פניות. אף סוכן אחר לא מסכם איתו תנאים.",
    },
  },
  coreops: {
    points: [],
    skipped: {
      en: "It runs internal workflows. There is no other party to clear anything with.",
      es: "Gestiona flujos internos. No hay otra parte con la que liquidar nada.",
      he: "הוא מריץ תהליכים פנימיים. אין צד אחר לסלוק מולו.",
    },
  },
};

const EXCHANGE_PLATFORM: Omit<PlatformNode, "group">[] = [
  {
    id: "enclave",
    name: { en: "Clearing enclave", es: "Enclave de liquidación", he: "מתחם הסליקה" },
    href: "/exchange",
    points: [
      {
        status: "live",
        upgrade: {
          en: "Both sides' limits are sealed in a vault the other side's engines can't read; no prompt is ever built with them.",
          es: "Los límites de cada lado se sellan en una bóveda que los motores del otro lado no pueden leer; ningún prompt se construye con ellos.",
          he: "המגבלות של כל צד נחתמות בכספת שהמנועים של הצד השני לא יכולים לקרוא; אף פרומפט לא נבנה איתן.",
        },
        mechanics: {
          en: "Side-specific accessors, salted commitments and seeded guard bands, so no offer lands on a private number.",
          es: "Accesos por lado, compromisos con sal y bandas de protección sembradas, para que ninguna oferta caiga en un número privado.",
          he: "גישה נפרדת לכל צד, התחייבויות עם מלח ופסי הגנה, כך שאף הצעה לא נוחתת על מספר פרטי.",
        },
        where: ["src/lib/exchange/enclave.ts", "src/lib/exchange/vault.ts"],
      },
    ],
  },
  {
    id: "relay",
    name: { en: "Public relay and ledger", es: "Relay público y registro", he: "ממסר ופנקס ציבוריים" },
    href: `${RELAY_URL}/health`,
    points: [
      {
        status: "live",
        upgrade: {
          en: "Agents from any company meet in a room, negotiate in turns, and clear with a receipt both sides sign.",
          es: "Agentes de cualquier empresa se reúnen en una sala, negocian por turnos y liquidan con un recibo que firman ambas partes.",
          he: "סוכנים מכל חברה נפגשים בחדר, מנהלים משא ומתן בתורות, וסולקים עם קבלה ששני הצדדים חותמים עליה.",
        },
        mechanics: {
          en: "Every move is signed and hash-chained; every receipt is appended to a public RFC 6962 Merkle ledger.",
          es: "Cada movimiento va firmado y encadenado por hash; cada recibo se añade a un registro Merkle público RFC 6962.",
          he: "כל מהלך חתום ומשורשר בגיבוב; כל קבלה נוספת לפנקס Merkle ציבורי לפי RFC 6962.",
        },
        where: ["src/lib/scout/relay-client.ts", "src/lib/scout/relay-protocol.ts"],
      },
    ],
  },
  {
    id: "verifier",
    name: { en: "Receipt verifier", es: "Verificador de recibos", he: "מאמת הקבלות" },
    href: VERIFIER_URL,
    points: [
      {
        status: "live",
        upgrade: {
          en: "Anyone can check a receipt in a browser, without an account and without trusting the relay.",
          es: "Cualquiera puede comprobar un recibo en el navegador, sin cuenta y sin confiar en el relay.",
          he: "כל אחד יכול לבדוק קבלה בדפדפן, בלי חשבון ובלי לסמוך על הממסר.",
        },
        mechanics: {
          en: "Hash, both signatures, ledger inclusion and revocation are recomputed on the reader's side.",
          es: "El hash, ambas firmas, la inclusión en el registro y la revocación se recalculan del lado de quien lee.",
          he: "הגיבוב, שתי החתימות, ההכללה בפנקס והביטול מחושבים מחדש בצד של הקורא.",
        },
        where: ["src/app/api/scout/receipts/[hash]/route.ts", "src/components/scout/receipt-panel.tsx"],
      },
    ],
  },
  {
    id: "sdk",
    name: { en: "SDK and verify CLI", es: "SDK y CLI de verificación", he: "SDK וכלי אימות" },
    href: "https://www.npmjs.com/package/@bloom-exchange/sdk",
    points: [
      {
        status: "live",
        upgrade: {
          en: "Any agent can connect with a zero-dependency SDK and verify certificates offline.",
          es: "Cualquier agente puede conectarse con un SDK sin dependencias y verificar certificados sin conexión.",
          he: "כל סוכן יכול להתחבר עם SDK בלי תלויות ולאמת תעודות במצב לא מקוון.",
        },
        mechanics: {
          en: "Offline verification against the public key in the signed Agent Card.",
          es: "Verificación sin conexión con la clave pública de la Agent Card firmada.",
          he: "אימות לא מקוון מול המפתח הציבורי שבכרטיס הסוכן החתום.",
        },
        where: ["packages/bloom-exchange-sdk/src/verify.ts", "src/lib/exchange/agent-card.ts"],
      },
    ],
  },
];

// ---------------------------------------------------------------------------------------------------------
// Bloom Scout
// ---------------------------------------------------------------------------------------------------------

const SANDBOX_ONLY: L10n = {
  en: "Bloom Scout negotiates only in the sandbox. Pointing it at real prospects would break that boundary.",
  es: "Bloom Scout negocia solo en el sandbox. Apuntarlo a prospectos reales rompería ese límite.",
  he: "Bloom Scout מנהל משא ומתן רק בארגז החול. להפנות אותו ללקוחות אמיתיים היה שובר את הגבול הזה.",
};

const SCOUT_ENGINES: Record<EngineKey, Omit<EngineNode, "group" | "id">> = {
  sovereign: {
    points: [
      {
        status: "live",
        upgrade: {
          en: "When a run reaches a ceiling, the owner's brief lands in Sovereign's approval queue, next to every other decision that needs a person.",
          es: "Cuando una ejecución llega a un techo, el informe para el propietario llega a la cola de aprobaciones de Sovereign, junto a las demás decisiones que necesitan a una persona.",
          he: "כשהרצה מגיעה לתקרה, התדריך לבעלים נכנס לתור האישורים של Sovereign, לצד כל ההחלטות האחרות שדורשות אדם.",
        },
        mechanics: {
          en: "A four-section brief per run; the owner's decision is signed into the audit log.",
          es: "Un informe de cuatro secciones por ejecución; la decisión del propietario se firma en el registro de auditoría.",
          he: "תדריך בן ארבעה חלקים לכל הרצה; ההחלטה של הבעלים נחתמת ביומן הביקורת.",
        },
        where: ["src/components/scout/scout-desk.tsx", "src/lib/scout/brief.ts"],
      },
    ],
  },
  cortex: {
    points: [
      {
        status: "new",
        upgrade: {
          en: "Cortex spots where the other side admits it can't close: it needs its owner's sign-off, or it has no policy to price the request.",
          es: "Cortex detecta dónde la otra parte admite que no puede cerrar: necesita la aprobación de su propietario o no tiene política para poner precio a la solicitud.",
          he: "Cortex מזהה איפה הצד השני מודה שהוא לא יכול לסגור: הוא צריך אישור מהבעלים שלו, או שאין לו מדיניות לתמחר את הבקשה.",
        },
        mechanics: {
          en: "handoff_gap_detect is rule-based: the same words always give the same answer. A hit becomes a human-owned action that the desk queues for approval, never a commitment.",
          es: "handoff_gap_detect se basa en reglas: las mismas palabras dan siempre la misma respuesta. Un acierto se convierte en una acción a cargo de una persona que el escritorio pone en cola de aprobación, nunca en un compromiso.",
          he: "handoff_gap_detect מבוסס כללים: אותן מילים תמיד נותנות אותה תשובה. זיהוי הופך לפעולה שבאחריות אדם, שהדסק מכניס לתור האישורים, ולעולם לא להתחייבות.",
        },
        tool: "handoff_gap_detect",
        where: ["src/lib/engines/tools/scout.ts", "src/lib/engines/06-cortex.ts"],
      },
    ],
  },
  shield: {
    points: [
      {
        status: "new",
        upgrade: {
          en: "Before an offer is sent to another agent, Shield checks it against Bloom Scout's sandbox policy and stops it if it fails.",
          es: "Antes de enviar una oferta a otro agente, Shield la contrasta con la política sandbox de Bloom Scout y la detiene si no la cumple.",
          he: "לפני שהצעה נשלחת לסוכן אחר, Shield בודק אותה מול מדיניות ארגז החול של Bloom Scout ועוצר אותה אם היא לא עומדת בה.",
        },
        mechanics: {
          en: "exchange_payload_policy refuses real company names, binding language and anything outside sandbox bounds; each refusal is recorded in the Threat Matrix.",
          es: "exchange_payload_policy rechaza nombres reales de empresas, lenguaje vinculante y cualquier cosa fuera de los límites del sandbox; cada rechazo queda en la Matriz de amenazas.",
          he: "exchange_payload_policy דוחה שמות של חברות אמיתיות, ניסוח מחייב וכל דבר שחורג מגבולות ארגז החול; כל דחייה נרשמת במטריצת האיומים.",
        },
        tool: "exchange_payload_policy",
        where: ["src/lib/engines/tools/scout.ts", "src/lib/engines/07-shield.ts", "src/components/desk/use-run.ts"],
      },
    ],
  },
  intentpulse: { points: [], skipped: SANDBOX_ONLY },
  vanguard: { points: [], skipped: SANDBOX_ONLY },
  apex: {
    points: [],
    skipped: {
      en: "Real deals stay with Apex and a person. Bloom Scout never closes anything; it hands the open point to the owner.",
      es: "Los acuerdos reales siguen en manos de Apex y de una persona. Bloom Scout nunca cierra nada: entrega el punto abierto al propietario.",
      he: "עסקאות אמיתיות נשארות אצל Apex ואצל אדם. Bloom Scout אף פעם לא סוגר דבר; הוא מעביר את הנקודה הפתוחה לבעלים.",
    },
  },
  aether: {
    points: [],
    skipped: {
      en: "Aether's part is sealing price limits, which is Bloom Exchange's job. Bloom Scout adds nothing on top.",
      es: "La parte de Aether es sellar límites de precio, que es tarea de Bloom Exchange. Bloom Scout no añade nada encima.",
      he: "התפקיד של Aether הוא לחתום מגבלות מחיר, וזו עבודה של Bloom Exchange. Bloom Scout לא מוסיף על זה.",
    },
  },
  coreops: { points: [], skipped: EXCHANGE_ENGINES.coreops.skipped },
};

const SCOUT_PLATFORM: Omit<PlatformNode, "group">[] = [
  {
    id: "runner",
    name: { en: "Sandbox runner", es: "Ejecutor sandbox", he: "מריץ ארגז החול" },
    points: [
      {
        status: "live",
        upgrade: {
          en: "Two sandbox agents negotiate on the public relay from a fixed script, so every run is repeatable.",
          es: "Dos agentes sandbox negocian en el relay público a partir de un guion fijo, así que cada ejecución es repetible.",
          he: "שני סוכני ארגז חול מנהלים משא ומתן בממסר הציבורי לפי תסריט קבוע, כך שכל הרצה ניתנת לחזרה.",
        },
        mechanics: {
          en: "Your agent's offers are clamped to its sealed ceiling; both sides rebuild the receipt from the signed transcript before signing it.",
          es: "Las ofertas de tu agente se ajustan a su techo sellado; ambas partes reconstruyen el recibo a partir de la transcripción firmada antes de firmarlo.",
          he: "ההצעות של הסוכן שלך מוגבלות לתקרה החתומה שלו; שני הצדדים בונים מחדש את הקבלה מהתמליל החתום לפני שהם חותמים עליה.",
        },
        where: ["src/lib/scout/runner.ts", "src/lib/scout/scenarios.ts"],
      },
    ],
  },
  {
    id: "gap-notes",
    name: { en: "Signed gap notes", es: "Notas de brecha firmadas", he: "הערות פער חתומות" },
    points: [
      {
        status: "live",
        upgrade: {
          en: "The exact moment the counterpart stopped is recorded, instead of being smoothed over.",
          es: "Se registra el momento exacto en que se detuvo la contraparte, en lugar de disimularlo.",
          he: "הרגע המדויק שבו הצד השני נעצר נרשם, במקום שיטושטש.",
        },
        mechanics: {
          en: "An Ed25519-signed note bound to the transcript event it followed; moving it to another point breaks the signature.",
          es: "Una nota firmada con Ed25519 vinculada al evento de la transcripción que siguió; moverla a otro punto rompe la firma.",
          he: "הערה חתומה ב-Ed25519 שקשורה לאירוע בתמליל שאחריו נכתבה; העברה שלה לנקודה אחרת שוברת את החתימה.",
        },
        where: ["src/lib/scout/gap.ts"],
      },
    ],
  },
  {
    id: "shadow-board",
    name: { en: "Shadow Board", es: "Shadow Board", he: "Shadow Board" },
    points: [
      {
        status: "live",
        upgrade: {
          en: "A pending brief can be put to the Shadow Board's three adversarial agents before the owner decides.",
          es: "Un informe pendiente puede pasar por los tres agentes adversarios del Shadow Board antes de que decida el propietario.",
          he: "אפשר להעביר תדריך ממתין לשלושת הסוכנים היריבים של ה-Shadow Board לפני שהבעלים מחליט.",
        },
        mechanics: {
          en: "Briefs appear in its approval-queue list; each session is hashed into the audit log.",
          es: "Los informes aparecen en su lista de la cola de aprobaciones; cada sesión queda con hash en el registro de auditoría.",
          he: "התדריכים מופיעים ברשימת תור האישורים שלו; כל מושב נרשם עם גיבוב ביומן הביקורת.",
        },
        where: ["src/components/os/shadow-board.tsx"],
      },
    ],
  },
  {
    id: "threat-matrix",
    name: { en: "Threat Matrix", es: "Matriz de amenazas", he: "מטריצת האיומים" },
    points: [
      {
        status: "new",
        upgrade: {
          en: "Every payload the sandbox policy refuses shows up with the workspace's other security events.",
          es: "Cada contenido que la política sandbox rechaza aparece junto a los demás eventos de seguridad del espacio.",
          he: "כל מטען שמדיניות ארגז החול דוחה מופיע לצד שאר אירועי האבטחה של סביבת העבודה.",
        },
        mechanics: {
          en: "Refusals are written as security entries in the hash-chained audit log, with the reason and the run that tried to send it.",
          es: "Los rechazos se escriben como entradas de seguridad en el registro de auditoría encadenado, con el motivo y la ejecución que intentó enviarlo.",
          he: "דחיות נכתבות כרשומות אבטחה ביומן הביקורת המשורשר, עם הסיבה וההרצה שניסתה לשלוח.",
        },
        where: ["src/components/desk/settings.ts", "src/components/os/threat-matrix.tsx"],
      },
    ],
  },
  {
    id: "access",
    name: { en: "Access and limits", es: "Acceso y límites", he: "גישה ומגבלות" },
    points: [
      {
        status: "live",
        upgrade: {
          en: "Live runs are off by default; only an Operator access key can start one, at most 3 a minute and 20 a day.",
          es: "Las ejecuciones en vivo están desactivadas por defecto; solo una clave de acceso Operator puede iniciarlas, como máximo 3 por minuto y 20 al día.",
          he: "הרצות חיות כבויות כברירת מחדל; רק מפתח גישה מסוג Operator יכול להתחיל אחת, לכל היותר 3 בדקה ו-20 ביום.",
        },
        mechanics: {
          en: "Enforced on the server, because every live run leaves a permanent public record.",
          es: "Se aplica en el servidor, porque cada ejecución en vivo deja un registro público permanente.",
          he: "נאכף בשרת, כי כל הרצה חיה משאירה רישום ציבורי קבוע.",
        },
        where: ["src/app/api/scout/runs/route.ts", "src/components/desk/rbac.ts"],
      },
    ],
  },
];

// ---------------------------------------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------------------------------------

function engines(table: Record<EngineKey, Omit<EngineNode, "group" | "id">>): EngineNode[] {
  return ENGINE_ORDER.map((id) => ({ group: "engines", id, ...table[id] }));
}

/** An architecture carries a product only through the engine tools of the engines in its chain. */
function architectures(table: Record<EngineKey, Omit<EngineNode, "group" | "id">>): ArchitectureNode[] {
  return ARCHITECTURES.map((a) => ({
    group: "architectures",
    id: a.slug,
    via: a.engines.flatMap((engine) => table[engine].points.flatMap((p) => (p.tool ? [{ engine, tool: p.tool, status: p.status }] : []))),
  }));
}

export const INTEGRATIONS: Record<Product, IntegrationNode[]> = {
  exchange: [...engines(EXCHANGE_ENGINES), ...architectures(EXCHANGE_ENGINES), ...EXCHANGE_PLATFORM.map((p) => ({ group: "platform" as const, ...p }))],
  scout: [...engines(SCOUT_ENGINES), ...architectures(SCOUT_ENGINES), ...SCOUT_PLATFORM.map((p) => ({ group: "platform" as const, ...p }))],
};

/** The badges a node shows: its points' statuses, or "skipped" when it has none. */
export function statusesOf(node: IntegrationNode): Status[] {
  const s = node.group === "architectures" ? node.via.map((v) => v.status) : node.points.map((p) => p.status);
  const order: Status[] = ["live", "new"];
  const set = order.filter((x) => s.includes(x as never));
  return set.length ? set : ["skipped"];
}
