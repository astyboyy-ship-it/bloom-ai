/**
 * The Global Pulse firehose in Spanish and Hebrew: each domain's label and templates, by index with the English in
 * pulse-firehose.ts and with the same placeholder syntax. Song titles, product and brand names stay as they are.
 */
export const FIREHOSE_TEXT: Record<"es" | "he", Record<string, { label: string; templates: string[] }>> = {
  es: {
    music: {
      label: "Música y audio",
      templates: [
        "{agent} sincronizó {n:8-64} stems con la rejilla de {n:120-174} BPM de «{Night Shift|Lagos Drift|Glass Hours|Midnight Tender|Second Sun}» (desfase {f:0.1-2.9} ms)",
        "{agent} renderizó la sesión de Ableton Live «{Afro_Heat|Trap_Lab|Drill_Sketch|Amapiano_Vox}_v{n:2-19}.als» a WAV de 24 bits/48k en {n:38-190} s",
        "{agent} licenció un sample de {benga keniata|ethio-jazz de los 70|cuerdas de Bollywood|metales soul|crujido de vinilo}: reparto del master del {n:12-45}%, acuerdo enviado para firma electrónica",
        "{agent} exportó el master a 140 BPM de {afrobeat|trap|afro-trap|drill} a {f:-9.5--6.0} LUFS integrados, pico real {f:-1.5--0.3} dBTP",
        "{agent} igualó los presets de la cadena de voz en {n:3-9} sesiones de productores y marcó {n:1-4} tomas con cancelación de fase",
        "{agent} registró códigos ISRC para {n:2-12} temas y programó la entrega a {n:4-38} tiendas digitales",
      ],
    },
    software: {
      label: "Software y escritorio",
      templates: [
        "{agent} compiló el binario Tauri {Windows NSIS|macOS DMG|Linux AppImage} v0.{n:1-9}.{n:0-20} en {n:94-410} s ({f:4.1-12.8} MB)",
        "{agent} revirtió el despliegue edge de Vercel a {hex} en {n:180-950} ms tras un pico de 5xx del {n:2-9}% en {iad1|fra1|sin1|gru1|hnd1}",
        "{agent} corrigió un desajuste de hidratación de Next.js en {app/desk/layout.tsx|components/os/os-home.tsx|app/[locale]/page.tsx}: formato de fechas alineado entre servidor y cliente",
        "{agent} verificó {n:40-400} instantáneas de memoria vectorial de 256 dimensiones: cadena de hashes intacta, {n:0-0} discrepancias",
        "{agent} actualizó {n:3-27} dependencias y volvió a pasar {n:120-1840} tests ({n:0-2} inestables reintentados): todo en verde",
        "{agent} bajó el arranque en frío p95 de /api/command de {n:900-1600} ms a {n:220-640} ms cargando el registro de herramientas bajo demanda",
      ],
    },
    personal: {
      label: "Microgestión personal",
      templates: [
        "{agent} reservó un turno de cable de wakeboard a las {07:30|08:15|17:45|18:30} en Lake TLV ({n:2-6} riders, viento {n:4-14} nudos)",
        "{agent} reoptimizó la agenda de mañana: {n:2-6} reuniones agrupadas y {n:45-150} min de trabajo profundo protegidos",
        "{agent} buscó {pimentón ahumado|pimienta de Sichuan|zumaque|ajo negro|yuzu kosho} en {n:2-5} proveedores; mejor precio {usd:6-38}, entrega el {martes|miércoles|jueves}",
        "{agent} activó la escena de tarde de la casa: persianas al {n:20-70}%, climatización a {n:21-24} °C, humedad estable al {n:42-55}%",
        "{agent} renovó un plan de {gimnasio|coworking|aparcamiento|streaming} y ahorró {usd:4-60} al mes pasando a pago anual",
        "{agent} preparó un menú semanal de {n:1900-2800} kcal al día y envió la lista de la compra a {n:1-3} apps de supermercado",
      ],
    },
    avian: {
      label: "Aves y microentorno",
      templates: [
        "{agent} registró una respuesta de un miná común a la señal de percha a {n:2-6} kHz: {n:62-98}% de éxito en {n:8-40} intentos",
        "{agent} ajustó el aviario a {f:22.0-27.5} °C / {n:45-65}% de humedad tras el pico de actividad de {la mañana|mediodía|la tarde}",
        "{agent} pasó el tono de entrenamiento del miná de {n:2-4}.{n:0-9} kHz a {n:3-5}.{n:0-9} kHz; el tiempo hasta la percha bajó un {n:8-35}%",
        "{agent} detectó {n:3-14} ráfagas de imitación vocal y marcó {n:1-5} frases nuevas para reforzar",
        "{agent} completó el ciclo de lámpara UV-B ({n:10-12} h) y registró CO₂ a {n:420-780} ppm",
      ],
    },
    gaming: {
      label: "Videojuegos y esports",
      templates: [
        "{agent} calculó el estado de oleadas de Renekton en la calle superior: congelar con {n:2-5} súbditos, romper en la oleada de cañón {n:3-6}, ventana de all-in a nivel {n:2-3} de {n:3-9} s",
        "{agent} siguió el meta de la escalera de Clash Royale: {Hog EQ|Log Bait|Lava Loon|X-Bow 3.0|Miner Poison} con {f:4.1-11.9}% de uso y {f:48.0-56.5}% de victorias",
        "{agent} emparejó sinergias de Pokémon Unite: {Blissey + Lucario|Greninja + Mamoswine|Gardevoir + Tsareena|Zeraora + Eldegoss} con {n:51-63}% de victorias en dúo",
        "{agent} resolvió el micro-recorrido de la ronda {n:63-100} de BTD6 CHIMPS en {Dark Castle|Infernal|Ouch|Bloody Puddles}: {n:2-7} torres recolocadas, ${n:300-4200} ahorrados",
        "{agent} recopiló {n:40-400} VODs profesionales y agrupó las rutas de jungla en {n:3-8} arquetipos para preparar scrims",
        "{agent} detectó un cambio del {n:2-9}% en la tasa de victorias tras el parche y preparó una hoja de counter-picks para el equipo",
      ],
    },
    security: {
      label: "Seguridad y hashing",
      templates: [
        "{agent} selló el certificado de ejecución CAE-{hex} con SHA-256; cadena verificada en {n:40-1200} ejecuciones",
        "{agent} interceptó una llamada con voz deepfake dirigida a {finanzas|nóminas|la oficina del CFO}: huella espectral no coincidente {f:0.71-0.98}, llamada en cuarentena",
        "{agent} rotó {n:6-48} claves API en {n:3-12} nodos de agentes sin perder ninguna petición",
        "{agent} bloqueó {n:2-40} intentos de inyección de prompts ({exfiltración|suplantación de rol|secuestro de herramientas}) en el gateway",
        "{agent} volvió a calcular el hash de {n:1-9}k entradas de auditoría tras la migración: integridad correcta, {n:0-0} roturas",
        "{agent} revocó {n:1-6} autorizaciones OAuth caducadas y exigió MFA con llave física en {n:2-20} puestos de administrador",
      ],
    },
    video: {
      label: "Vídeo generativo y anuncios",
      templates: [
        "{agent} puso en cola {n:4-36} renders de prompts de Seedance 2.0 ({9:16|16:9|1:1}, {n:5-15} s); {n:1-6} terminados, faltan {n:40-300} s",
        "{agent} extrajo {n:8-60} recursos seguros para la marca de un pack de Creative Fabrica y etiquetó la licencia de cada uno",
        "{agent} distribuyó el corte «{Summer Drop|Black Friday|Launch Week|Back to School}» en {n:3-14} regiones, con {n:2-6} idiomas cada una",
        "{agent} probó {n:3-8} ganchos en A/B: la variante {A|B|C|D} subió la tasa de retención del scroll un {f:4.0-31.0}%",
        "{agent} subtituló {n:6-40} spots en {n:3-11} idiomas y ajustó la sonoridad a {-14|-16|-23} LUFS",
      ],
    },
    crypto: {
      label: "Cripto y liquidez",
      templates: [
        "{agent} reequilibró la liquidez de DEX entre nodos de OKX / Binance / Bybit: {n:2-9} pools movidos, deslizamiento {f:0.02-0.40}%",
        "{agent} enrutó una transferencia entre cadenas por {Arbitrum|Base|Optimism|Polygon zkEVM}: gas un {n:18-74}% más bajo que directo en mainnet",
        "{agent} cubrió {usd:20000-900000} de exposición de inventario; delta ahora {f:-0.05-0.05}",
        "{agent} amplió {n:2-9} pb los spreads de market making tras un pico de volatilidad del {n:3-12}%",
        "{agent} cuadró {n:200-4000} ejecuciones en {n:3-6} mercados: {n:0-3} discrepancias resueltas automáticamente",
      ],
    },
    freight: {
      label: "Carga y logística",
      templates: [
        "{agent} pujó por {n:2-20} huecos de contenedor Róterdam → Shanghái a {usd:1400-4800}/FEU; {n:1-12} ganados",
        "{agent} marcó una desviación de la cadena de frío en el contenedor refrigerado {hex}: {f:8.1-11.4} °C durante {n:6-40} min; retenido por calidad",
        "{agent} aprobó {n:3-60} declaraciones de aduanas en {Róterdam|Hamburgo|Amberes|Felixstowe|Asdod}; {n:0-2} enviadas a revisión manual",
        "{agent} desvió {n:2-14} TEU por un retraso de {n:2-5} días en el atraque de {Singapur|Port Klang|Ningbó|Busan}",
        "{agent} agrupó {n:4-30} envíos de grupaje en {n:2-9} camiones completos y ahorró {usd:800-14000}",
      ],
    },
    legal: {
      label: "Legal y administración",
      templates: [
        "{agent} enrutó {n:3-24} llamadas de nuevos litigios: {n:1-6} a socios y el resto agendadas con asociados",
        "{agent} formalizó {n:1-9} NDAs ({mutuos|unilaterales}) por firma electrónica; plazo medio de {n:4-58} min",
        "{agent} cuadró {n:20-400} facturas con sus presupuestos en tiempo real; {n:0-6} diferencias escaladas",
        "{agent} revisó un {MSA|DPA|SOW|contrato de arrendamiento} en {n:3-14} min según el manual: {n:2-11} cláusulas marcadas",
        "{agent} renovó {n:2-18} contratos de proveedores y obtuvo {usd:1200-48000} en ahorros negociados",
      ],
    },
    health: {
      label: "Salud y bienestar",
      templates: [
        "{agent} sincronizó {n:3-14} días de datos de sueño: sueño profundo {n:12-24}%, puntuación de recuperación {n:48-96}",
        "{agent} reprogramó {n:1-4} citas médicas en torno a un viaje y envió recordatorios a {n:1-3} dispositivos",
        "{agent} repuso {n:1-5} suplementos antes de que se agotaran; entrega en {n:1-4} días",
      ],
    },
    research: {
      label: "Investigación y conocimiento",
      templates: [
        "{agent} leyó {n:12-140} artículos sobre {agentes con recuperación aumentada|química de baterías|plegamiento de proteínas|evaluación de LLMs} y redactó un informe de {n:1-4} páginas",
        "{agent} eliminó duplicados en {n:200-9000} notas y las agrupó en {n:12-90} temas para la base de conocimiento",
        "{agent} verificó {n:4-30} afirmaciones de un borrador: {n:0-3} corregidas con fuentes",
      ],
    },
  },
  he: {
    music: {
      label: "מוזיקה ואודיו",
      templates: [
        "{agent} סנכרן {n:8-64} סטמים לגריד של {n:120-174} BPM עבור ״{Night Shift|Lagos Drift|Glass Hours|Midnight Tender|Second Sun}״ (סטייה {f:0.1-2.9} מ״ש)",
        "{agent} רנדר את סט ה־Ableton Live ״{Afro_Heat|Trap_Lab|Drill_Sketch|Amapiano_Vox}_v{n:2-19}.als״ ל־WAV של ‏24 ביט/48k תוך {n:38-190} שניות",
        "{agent} השיג אישור לסמפל של {בנגה קנייתי|אתיו־ג׳אז משנות ה־70|כלי מיתר בוליוודיים|כלי נשיפה של סול|חריקת ויניל}: חלוקת מאסטר של {n:12-45}%, ההסכם נשלח לחתימה דיגיטלית",
        "{agent} ייצא את המאסטר של {אפרוביט|טראפ|אפרו־טראפ|דריל} ב־140 BPM ב־{f:-9.5--6.0} LUFS משולב, שיא אמיתי {f:-1.5--0.3} dBTP",
        "{agent} התאים פריסטים של שרשרת הווקאל ב־{n:3-9} סשנים של מפיקים וסימן {n:1-4} טייקים עם ביטול פאזה",
        "{agent} רשם קודי ISRC ל־{n:2-12} שירים ותזמן הפצה ל־{n:4-38} חנויות דיגיטליות",
      ],
    },
    software: {
      label: "תוכנה ודסקטופ",
      templates: [
        "{agent} בנה את הבינארי של Tauri ‏{Windows NSIS|macOS DMG|Linux AppImage} גרסה 0.{n:1-9}.{n:0-20} תוך {n:94-410} שניות ({f:4.1-12.8} MB)",
        "{agent} החזיר את פריסת ה־edge ב־Vercel ל־{hex} תוך {n:180-950} מ״ש אחרי קפיצה של {n:2-9}% בשגיאות 5xx ב־{iad1|fra1|sin1|gru1|hnd1}",
        "{agent} תיקן אי־התאמת הידרציה ב־Next.js ב־{app/desk/layout.tsx|components/os/os-home.tsx|app/[locale]/page.tsx}: פורמט התאריכים יושר בין השרת ללקוח",
        "{agent} אימת {n:40-400} תמונות מצב של זיכרון וקטורי ב־256 ממדים: שרשרת הגיבוב תקינה, {n:0-0} אי־התאמות",
        "{agent} עדכן {n:3-27} תלויות והריץ מחדש {n:120-1840} בדיקות ({n:0-2} לא יציבות הורצו שוב): הכול ירוק",
        "{agent} קיצר את זמן העלייה הקרה p95 של ‏/api/command מ־{n:900-1600} מ״ש ל־{n:220-640} מ״ש בטעינה עצלה של רישום הכלים",
      ],
    },
    personal: {
      label: "מיקרו־תפעול אישי",
      templates: [
        "{agent} שריין סלוט בכבל הווייקבורד ב־{07:30|08:15|17:45|18:30} ב־Lake TLV ({n:2-6} רוכבים, רוח {n:4-14} קשר)",
        "{agent} סידר מחדש את הלו״ז של מחר: {n:2-6} פגישות רוכזו ו־{n:45-150} דקות של עבודה עמוקה נשמרו",
        "{agent} איתר {פפריקה מעושנת|פלפל סצ׳ואן|סומק|שום שחור|יוזו קושו} אצל {n:2-5} ספקים; המחיר הטוב ביותר {usd:6-38}, משלוח ביום {שלישי|רביעי|חמישי}",
        "{agent} הפעיל את סצנת הערב בבית החכם: תריסים {n:20-70}%, מיזוג {n:21-24}°C, לחות נשמרת על {n:42-55}%",
        "{agent} חידש מנוי {לחדר כושר|לחלל עבודה משותף|לחניה|לסטרימינג} וחסך {usd:4-60} בחודש במעבר לתשלום שנתי",
        "{agent} בנה תפריט שבועי של {n:1900-2800} קלוריות ליום ושלח את רשימת הקניות ל־{n:1-3} אפליקציות סופרמרקט",
      ],
    },
    avian: {
      label: "ציפורים ומיקרו־סביבה",
      templates: [
        "{agent} תיעד תגובה של מיינה מצויה לסימן מוט נחיתה ב־{n:2-6} קילו־הרץ: {n:62-98}% הצלחה ב־{n:8-40} ניסיונות",
        "{agent} כיוון את חדר הציפורים ל־{f:22.0-27.5}°C ו־{n:45-65}% לחות אחרי שיא הפעילות של {הבוקר|הצהריים|הדמדומים}",
        "{agent} העביר את צליל האימון של המיינה מ־{n:2-4}.{n:0-9} קילו־הרץ ל־{n:3-5}.{n:0-9} קילו־הרץ; הזמן עד הנחיתה ירד ב־{n:8-35}%",
        "{agent} זיהה {n:3-14} פרצי חיקוי קולי וסימן {n:1-5} ביטויים חדשים לחיזוק",
        "{agent} הריץ את מחזור מנורת ה־UV-B ‏({n:10-12} שעות) ורשם CO₂ ב־{n:420-780} ppm",
      ],
    },
    gaming: {
      label: "גיימינג וספורט אלקטרוני",
      templates: [
        "{agent} חישב את מצב הגלים של Renekton בנתיב העליון: הקפאה ב־{n:2-5} מיניונים, ריסוק בגל התותח {n:3-6}, חלון all-in ברמה {n:2-3} של {n:3-9} שניות",
        "{agent} עקב אחרי מטא הסולם ב־Clash Royale: ‏{Hog EQ|Log Bait|Lava Loon|X-Bow 3.0|Miner Poison} ב־{f:4.1-11.9}% שימוש ו־{f:48.0-56.5}% ניצחונות",
        "{agent} התאים סינרגיות ב־Pokémon Unite: ‏{Blissey + Lucario|Greninja + Mamoswine|Gardevoir + Tsareena|Zeraora + Eldegoss} עם {n:51-63}% ניצחונות בזוג",
        "{agent} פתר את מסלולי המיקרו של סיבוב {n:63-100} ב־BTD6 CHIMPS במפה {Dark Castle|Infernal|Ouch|Bloody Puddles}: {n:2-7} מגדלים הוזזו, ${n:300-4200} נחסכו",
        "{agent} אסף {n:40-400} הקלטות של מקצוענים וקיבץ את מסלולי הג׳ונגל ל־{n:3-8} ארכיטיפים להכנה לסקרימים",
        "{agent} זיהה תנודה של {n:2-9}% בשיעור הניצחונות ביום הפאץ׳ והכין לצוות דף קאונטר־פיקים",
      ],
    },
    security: {
      label: "אבטחה וגיבוב",
      templates: [
        "{agent} חתם את תעודת הביצוע CAE-{hex} ב־SHA-256; השרשרת אומתה לאורך {n:40-1200} הרצות",
        "{agent} יירט שיחת דיפפייק קולי אל {הכספים|השכר|לשכת סמנכ״ל הכספים}: אי־התאמה בטביעה הספקטרלית {f:0.71-0.98}, השיחה הועברה להסגר",
        "{agent} החליף {n:6-48} מפתחות API ב־{n:3-12} צמתי סוכנים בלי לאבד אף בקשה",
        "{agent} חסם {n:2-40} ניסיונות הזרקת פרומפט ({הוצאת מידע|התחזות לתפקיד|השתלטות על כלים}) בשער",
        "{agent} חישב מחדש גיבוב ל־{n:1-9} אלף רשומות ביקורת אחרי ההגירה: השלמות תקינה, {n:0-0} שברים",
        "{agent} ביטל {n:1-6} הרשאות OAuth ישנות וחייב אימות עם מפתח חומרה ב־{n:2-20} עמדות מנהל",
      ],
    },
    video: {
      label: "וידאו גנרטיבי ופרסום",
      templates: [
        "{agent} הכניס לתור {n:4-36} רינדורים של פרומפטים ב־Seedance 2.0 ‏({9:16|16:9|1:1}, {n:5-15} שניות); {n:1-6} הסתיימו, עוד {n:40-300} שניות",
        "{agent} חילץ {n:8-60} נכסים בטוחים למותג מחבילת Creative Fabrica וסימן רישיון לכל נכס",
        "{agent} הפיץ את הגרסה ״{Summer Drop|Black Friday|Launch Week|Back to School}״ ל־{n:3-14} אזורים, {n:2-6} שפות בכל אחד",
        "{agent} הריץ A/B על {n:3-8} פתיחים: גרסה {A|B|C|D} העלתה את שיעור עצירת הגלילה ב־{f:4.0-31.0}%",
        "{agent} כתב כתוביות ל־{n:6-40} סרטונים ב־{n:3-11} שפות וכיוון את העוצמה ל־{-14|-16|-23} LUFS",
      ],
    },
    crypto: {
      label: "קריפטו ונזילות",
      templates: [
        "{agent} איזן מחדש נזילות DEX בין צמתים של OKX / Binance / Bybit: {n:2-9} מאגרים הוזזו, החלקה {f:0.02-0.40}%",
        "{agent} ניתב העברה בין רשתות דרך {Arbitrum|Base|Optimism|Polygon zkEVM}: הגז ירד ב־{n:18-74}% לעומת ישירות ב־mainnet",
        "{agent} גידר {usd:20000-900000} של חשיפת מלאי; הדלתא עכשיו {f:-0.05-0.05}",
        "{agent} הרחיב את מרווחי עשיית השוק ב־{n:2-9} נקודות בסיס אחרי קפיצת תנודתיות של {n:3-12}%",
        "{agent} התאים {n:200-4000} ביצועים ב־{n:3-6} בורסות: {n:0-3} אי־התאמות נפתרו אוטומטית",
      ],
    },
    freight: {
      label: "מטען ולוגיסטיקה",
      templates: [
        "{agent} הגיש הצעות על {n:2-20} מקומות למכולות רוטרדם ← שנגחאי ב־{usd:1400-4800} ל־FEU; {n:1-12} זכו",
        "{agent} סימן חריגה בשרשרת הקירור במכולה {hex}: ‏{f:8.1-11.4}°C במשך {n:6-40} דקות; הוטל עיכוב בקרת איכות",
        "{agent} אישר {n:3-60} הצהרות מכס ב־{רוטרדם|המבורג|אנטוורפן|פליקסטו|אשדוד}; {n:0-2} נשלחו לבדיקה ידנית",
        "{agent} ניתב מחדש {n:2-14} TEU סביב עיכוב של {n:2-5} ימים ברציף ב־{סינגפור|פורט קלאנג|נינגבו|בוסאן}",
        "{agent} איחד {n:4-30} משלוחים חלקיים ל־{n:2-9} משאיות מלאות וחסך {usd:800-14000}",
      ],
    },
    legal: {
      label: "משפט ואדמיניסטרציה",
      templates: [
        "{agent} ניתב {n:3-24} שיחות של תיקי ליטיגציה חדשים: {n:1-6} לשותפים, והשאר נקבעו עם עורכי דין",
        "{agent} השלים {n:1-9} הסכמי סודיות ({הדדיים|חד־צדדיים}) בחתימה דיגיטלית; זמן ממוצע {n:4-58} דקות",
        "{agent} התאים {n:20-400} חשבוניות להצעות המחיר בזמן אמת; {n:0-6} פערים הוסלמו",
        "{agent} עבר על {MSA|DPA|SOW|חוזה שכירות} תוך {n:3-14} דקות מול ספר הנהלים: {n:2-11} סעיפים סומנו",
        "{agent} חידש {n:2-18} חוזי ספקים והשיג {usd:1200-48000} בחיסכון שנוהל במשא ומתן",
      ],
    },
    health: {
      label: "בריאות ורווחה",
      templates: [
        "{agent} סנכרן {n:3-14} ימים של נתוני שינה: שינה עמוקה {n:12-24}%, ציון התאוששות {n:48-96}",
        "{agent} קבע מחדש {n:1-4} תורים במרפאה סביב נסיעה ושלח תזכורות ל־{n:1-3} מכשירים",
        "{agent} הזמין מחדש {n:1-5} תוספי תזונה לפני שנגמרו; משלוח תוך {n:1-4} ימים",
      ],
    },
    research: {
      label: "מחקר וידע",
      templates: [
        "{agent} קרא {n:12-140} מאמרים על {סוכנים עם אחזור מוגבר|כימיה של סוללות|קיפול חלבונים|הערכת מודלי שפה} וכתב תקציר של {n:1-4} עמודים",
        "{agent} הסיר כפילויות מ־{n:200-9000} הערות וקיבץ אותן ל־{n:12-90} נושאים במאגר הידע",
        "{agent} בדק {n:4-30} טענות בטיוטה: {n:0-3} תוקנו עם מקורות",
      ],
    },
  },
};

/** City names in Hebrew; Spanish uses its own spellings for the few that differ. */
export const CITY_TEXT: Record<"es" | "he", Record<string, string>> = {
  es: { nyc: "Nueva York", sfo: "San Francisco", yyz: "Toronto", gru: "São Paulo", lhr: "Londres", fra: "Fráncfort", cdg: "París", tlv: "Tel Aviv", dxb: "Dubái", bom: "Bombay", sin: "Singapur", icn: "Seúl", nrt: "Tokio", syd: "Sídney", jnb: "Johannesburgo" },
  he: { nyc: "ניו יורק", sfo: "סן פרנסיסקו", yyz: "טורונטו", gru: "סאו פאולו", lhr: "לונדון", fra: "פרנקפורט", cdg: "פריז", tlv: "תל אביב", dxb: "דובאי", bom: "מומבאי", sin: "סינגפור", icn: "סיאול", nrt: "טוקיו", syd: "סידני", jnb: "יוהנסבורג" },
};
