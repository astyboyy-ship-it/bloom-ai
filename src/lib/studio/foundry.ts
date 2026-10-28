import type { PageFacts } from "@/lib/foundry/crawl";

/**
 * Engine 03 (Shadow Workforce) Solution Foundry: turns crawled page facts, or a written bottleneck,
 * into findings with evidence and a working, self-contained prototype that fixes them. Everything here
 * runs in the browser; the prototype is plain HTML/CSS/JS with no external requests.
 */

export type TargetKind = "url" | "handle" | "brief";
export type Target = { id: string; input: string; kind: TargetKind; name: string; note?: string };

export function classify(input: string): Omit<Target, "id"> {
  const s = input.trim();
  if (/^@?[a-z0-9_.]{2,30}$/i.test(s) && s.startsWith("@")) return { input: s, kind: "handle", name: titleCase(s.slice(1).replace(/[_.]/g, " ")) };
  if (/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(s)) {
    const host = s.replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./, "");
    return { input: s, kind: "url", name: titleCase(host.split(".")[0].replace(/-/g, " ")) };
  }
  const name = /(?:at|for)\s+([A-Z][\w&-]+(?:\s[A-Z][\w&-]+)?)/.exec(s)?.[1] ?? "Your company";
  return { input: s, kind: "brief", name };
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export type Severity = "high" | "medium" | "low";
export type Finding = { id: string; severity: Severity; title: string; evidence: string; fix: string };

/** Facts for a target that wasn't crawled: what a handle or a written brief tells us. */
export function briefFacts(t: Omit<Target, "id">): PageFacts {
  return {
    finalUrl: "",
    status: 0,
    ms: 0,
    bytes: 0,
    title: t.name,
    description: t.kind === "brief" ? t.input : "",
    h1: [],
    h2: [],
    ogTitle: "",
    ogImage: "",
    themeColor: "",
    colors: [],
    fonts: [],
    forms: 0,
    emailInputs: 0,
    ctas: [],
    scripts: 0,
    images: 0,
    imagesNoAlt: 0,
    viewport: true,
    lang: "en",
    canonical: false,
    analytics: [],
    chat: [],
    booking: [],
  };
}

export function audit(f: PageFacts, t: Omit<Target, "id">): Finding[] {
  const out: Finding[] = [];
  const crawled = t.kind === "url";
  const brief = t.kind === "brief" ? t.input.toLowerCase() : "";
  if (crawled) {
    if (!f.forms || !f.emailInputs)
      out.push({ id: "capture", severity: "high", title: "No way to capture a lead on the page", evidence: `${f.forms} form${f.forms === 1 ? "" : "s"}, ${f.emailInputs} email field${f.emailInputs === 1 ? "" : "s"} found`, fix: "Inline lead qualifier with validation" });
    if (!f.booking.length && !f.chat.length)
      out.push({ id: "booking", severity: "high", title: "Ready buyers can't book or ask a question", evidence: "No Calendly, Cal.com, Chili Piper or chat widget detected", fix: "Booking slots shown instantly to qualified leads" });
    if (!f.ctas.length) out.push({ id: "cta", severity: "medium", title: "No clear call to action", evidence: "No “Get started / Book a demo / Contact sales” style button found", fix: "Hero with one primary and one secondary CTA" });
    if (f.h1.length !== 1) out.push({ id: "h1", severity: "medium", title: f.h1.length ? "Several competing H1 headlines" : "No H1 headline", evidence: f.h1.length ? f.h1.map((h) => `“${h.slice(0, 40)}”`).join(", ") : "0 <h1> elements", fix: "One outcome-led headline" });
    if (!f.description || !f.ogTitle) out.push({ id: "meta", severity: "medium", title: "Weak search snippet and share card", evidence: `${f.description ? "" : "No meta description. "}${f.ogTitle ? "" : "No og:title. "}${f.ogImage ? "" : "No og:image."}`.trim(), fix: "Complete meta and Open Graph tags" });
    if (!f.analytics.length) out.push({ id: "analytics", severity: "medium", title: "The funnel isn't measured", evidence: "No analytics tags detected", fix: "Event tracking on every CTA and form step" });
    if (!f.viewport) out.push({ id: "viewport", severity: "high", title: "Not set up for mobile", evidence: "No viewport meta tag", fix: "Responsive viewport and layout" });
    if (f.bytes > 600_000 || f.scripts > 30) out.push({ id: "weight", severity: "low", title: "Heavy page", evidence: `${Math.round(f.bytes / 1024)} KB HTML, ${f.scripts} scripts`, fix: "Self-contained prototype under 20 KB" });
    if (f.imagesNoAlt > 2) out.push({ id: "alt", severity: "low", title: "Images missing alt text", evidence: `${f.imagesNoAlt} of ${f.images} images`, fix: "Accessible markup throughout" });
  } else if (t.kind === "handle") {
    out.push(
      { id: "capture", severity: "high", title: "Audience lives on a platform you don't own", evidence: `${t.input} sends traffic to a link-in-bio with no capture`, fix: "Owned lead capture page" },
      { id: "booking", severity: "high", title: "DM → call handoff is manual", evidence: "Buyers have to ask for a call in DMs", fix: "Instant booking for qualified leads" },
      { id: "analytics", severity: "medium", title: "No attribution from social to revenue", evidence: "No tracked landing page", fix: "UTM-aware event tracking" },
    );
  } else {
    if (/demo|call|meeting|book/.test(brief)) out.push({ id: "booking", severity: "high", title: "Demo requests leak between form and calendar", evidence: `From the brief: “${t.input.slice(0, 80)}”`, fix: "Qualify and book in one step" });
    if (/form|lead|sign ?up|convert|inbound/.test(brief)) out.push({ id: "capture", severity: "high", title: "Inbound leads aren't qualified at the door", evidence: "Every submission gets the same treatment", fix: "Lead qualifier with routing" });
    if (/track|attribution|measure|analytics|don't know/.test(brief)) out.push({ id: "analytics", severity: "medium", title: "The funnel isn't measured", evidence: "Called out in the brief", fix: "Event tracking on every step" });
    if (!out.length) out.push({ id: "capture", severity: "high", title: "No structured path from interest to conversation", evidence: `From the brief: “${t.input.slice(0, 80)}”`, fix: "Qualifier + instant booking" }, { id: "booking", severity: "medium", title: "Hot leads wait for a reply", evidence: "No self-serve booking", fix: "Instant booking for qualified leads" });
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function brandColor(f: PageFacts) {
  const c = (f.themeColor && /^#[0-9a-f]{6}$/i.test(f.themeColor) ? f.themeColor : f.colors[0]) || "#2f6fed";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Too light to carry white button text: darken it.
  if (lum > 0.6) return `#${[r, g, b].map((v) => Math.round(v * 255 * 0.55).toString(16).padStart(2, "0")).join("")}`;
  return c;
}

/** The target's typeface as a CSS family name, or the system stack when none was detected. */
export function brandFont(f: Pick<PageFacts, "fonts">) {
  // Letters in any script (Söhne, Noto Sans JP…), digits, spaces and hyphens: nothing that can break out of the CSS.
  const name = f.fonts[0]?.replace(/[^\p{L}\p{N}\s-]/gu, "").trim();
  return name ? `"${name}"` : "system-ui";
}

/** Builds the working prototype: one self-contained HTML file that fixes each finding. */
export function buildPrototype(t: Omit<Target, "id">, f: PageFacts, findings: Finding[]): string {
  const name = t.name;
  const brand = brandColor(f);
  const rawTitle = (f.title || name).split(/\s[|\-–—·]\s/)[0].trim();
  const h1 = f.h1[0] && f.h1[0].split(" ").length >= 3 && f.h1[0].split(" ").length <= 14 ? f.h1[0] : `${rawTitle}: from first visit to booked call in one step`;
  const sub = f.description || f.h2[0] || (t.kind === "brief" ? `We rebuilt the path from interest to conversation: ${t.input}` : `See if ${name} is a fit in two minutes, then pick a time that works.`);
  const desc = (f.description || sub).slice(0, 155);
  const host = f.finalUrl ? new URL(f.finalUrl).hostname : t.input;
  const fixes = findings.map((x) => `  - ${x.title} → ${x.fix}`).join("\n");

  return `<!doctype html>
<html lang="${esc(f.lang || "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(rawTitle)} · Book a call</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(h1)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${brand}">
<!--
  Fix pack for ${esc(host)}, prepared by the Bloom AI Shadow Workforce.
  What this prototype fixes:
${esc(fixes)}
  Self-contained: no external scripts, fonts or images. Events are pushed to window.dataLayer.
-->
<style>
  /* --brand-font is the target's own typeface: it renders where installed (the file embeds no fonts). */
  :root { --brand: ${brand}; --brand-font: ${brandFont(f)}; --ink: #14161a; --muted: #5b616e; --line: #e6e8ec; --bg: #fbfbfc; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.55 var(--brand-font), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--ink); background: var(--bg); }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
  nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; }
  .logo { font-weight: 700; letter-spacing: -0.02em; }
  .btn { display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 10px; padding: 12px 18px; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; background: var(--brand); color: #fff; }
  .btn.ghost { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1px var(--line); }
  .btn:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid color-mix(in srgb, var(--brand) 40%, transparent); outline-offset: 2px; }
  .hero { display: grid; gap: 40px; grid-template-columns: 1.1fr 0.9fr; align-items: start; padding: 48px 0 72px; }
  .eyebrow { color: var(--brand); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 12px; }
  h1 { font-size: clamp(32px, 5vw, 52px); line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 16px; }
  .sub { color: var(--muted); font-size: 18px; margin: 0 0 24px; max-width: 34em; }
  .ctas { display: flex; flex-wrap: wrap; gap: 10px; }
  .proof { display: flex; flex-wrap: wrap; gap: 18px; padding: 0; margin: 28px 0 0; list-style: none; color: var(--muted); font-size: 14px; }
  .proof li::before { content: "✓ "; color: var(--brand); font-weight: 700; }
  .card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px -18px rgb(20 22 26 / 0.25); }
  .card h2 { margin: 0 0 4px; font-size: 20px; }
  .card p.hint { margin: 0 0 18px; color: var(--muted); font-size: 14px; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 12px 0 6px; }
  input, select, textarea { width: 100%; padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px; font: inherit; background: #fff; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .err { color: #b42318; font-size: 13px; min-height: 18px; margin: 6px 0 0; }
  .slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; }
  .slot { padding: 10px; border: 1px solid var(--line); border-radius: 10px; background: #fff; font: inherit; font-size: 14px; cursor: pointer; }
  .slot[aria-pressed="true"] { border-color: var(--brand); box-shadow: inset 0 0 0 1px var(--brand); }
  .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 0 0 72px; }
  .step { border-top: 2px solid var(--brand); padding-top: 14px; }
  .step b { display: block; margin-bottom: 6px; }
  .step span { color: var(--muted); font-size: 15px; }
  footer { border-top: 1px solid var(--line); padding: 24px 0; color: var(--muted); font-size: 13px; }
  [hidden] { display: none !important; }
  @media (max-width: 820px) { .hero, .steps { grid-template-columns: 1fr; } .slots { grid-template-columns: 1fr 1fr; } }
</style>
</head>
<body>
<div class="wrap">
  <nav>
    <span class="logo">${esc(name)}</span>
    <a class="btn" href="#qualify" data-track="nav_cta">Book a call</a>
  </nav>

  <section class="hero">
    <div>
      <p class="eyebrow">${esc(name)}</p>
      <h1>${esc(h1)}</h1>
      <p class="sub">${esc(sub)}</p>
      <div class="ctas">
        <a class="btn" href="#qualify" data-track="hero_primary">Book a 15-minute call</a>
        <a class="btn ghost" href="#how" data-track="hero_secondary">See how it works</a>
      </div>
      <ul class="proof"><li>Answer in two minutes</li><li>Pick a time instantly</li><li>No sales spam</li></ul>
    </div>

    <div class="card" id="qualify">
      <form id="qualifier" novalidate>
        <h2>Is ${esc(name)} a fit?</h2>
        <p class="hint">Four questions. Qualified teams can book straight away.</p>
        <label for="q-name">Name</label>
        <input id="q-name" name="name" autocomplete="name" required>
        <label for="q-email">Work email</label>
        <input id="q-email" name="email" type="email" autocomplete="email" required>
        <div class="row">
          <div>
            <label for="q-size">Team size</label>
            <select id="q-size" name="size" required>
              <option value="">Choose…</option><option value="1">Just me</option><option value="2">2–10</option><option value="3">11–50</option><option value="4">51–250</option><option value="5">250+</option>
            </select>
          </div>
          <div>
            <label for="q-when">Timeline</label>
            <select id="q-when" name="when" required>
              <option value="">Choose…</option><option value="3">This month</option><option value="2">This quarter</option><option value="1">Just exploring</option>
            </select>
          </div>
        </div>
        <label for="q-need">What are you trying to fix?</label>
        <textarea id="q-need" name="need" rows="3"></textarea>
        <p class="err" id="q-err" role="alert"></p>
        <button class="btn" type="submit" data-track="qualify_submit">Check fit</button>
      </form>

      <div id="book" hidden>
        <h2>You're a fit. Pick a time.</h2>
        <p class="hint">15 minutes with a specialist. Times shown in your timezone.</p>
        <div class="slots" id="slots"></div>
        <button class="btn" id="confirm" type="button" disabled data-track="booking_confirm">Confirm booking</button>
      </div>

      <div id="done" hidden>
        <h2 id="done-title">Booked.</h2>
        <p class="hint" id="done-text"></p>
      </div>
    </div>
  </section>

  <section class="steps" id="how">
    ${findings
      .slice(0, 3)
      .map((x) => `<div class="step"><b>${esc(x.fix)}</b><span>${esc(x.title)}: fixed.</span></div>`)
      .join("\n    ")}
  </section>

  <footer>${esc(name)} · prototype prepared by Bloom AI · ${new Date().getFullYear()}</footer>
</div>

<script>
  window.dataLayer = window.dataLayer || [];
  function track(event, props) {
    window.dataLayer.push(Object.assign({ event: event, ts: Date.now() }, props || {}));
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-track]");
    if (el) track(el.getAttribute("data-track"));
  });

  var form = document.getElementById("qualifier");
  var err = document.getElementById("q-err");
  var started = false;
  form.addEventListener("input", function () {
    if (!started) { started = true; track("qualify_start"); }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var email = String(d.get("email") || "").trim();
    if (!String(d.get("name") || "").trim()) return (err.textContent = "Add your name.");
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return (err.textContent = "Use a valid work email.");
    if (/@(gmail|yahoo|hotmail|outlook)\\./i.test(email)) return (err.textContent = "Please use your work email.");
    if (!d.get("size") || !d.get("when")) return (err.textContent = "Choose a team size and a timeline.");
    err.textContent = "";
    var score = Number(d.get("size")) * 12 + Number(d.get("when")) * 18 + (String(d.get("need") || "").length > 20 ? 10 : 0);
    track("qualify_scored", { score: score });
    form.hidden = true;
    if (score >= 60) return showSlots();
    document.getElementById("done").hidden = false;
    document.getElementById("done-title").textContent = "Thanks, we'll be in touch.";
    document.getElementById("done-text").textContent = "We'll send a short playbook for teams like yours. Reply to it whenever you're ready to talk.";
    track("lead_nurture");
  });

  function showSlots() {
    document.getElementById("book").hidden = false;
    var box = document.getElementById("slots");
    var day = new Date();
    var picked = null;
    var made = 0;
    while (made < 6) {
      day.setDate(day.getDate() + 1);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      [10, 14].forEach(function (h) {
        if (made >= 6) return;
        var t = new Date(day); t.setHours(h, 0, 0, 0);
        var b = document.createElement("button");
        b.type = "button"; b.className = "slot"; b.setAttribute("aria-pressed", "false");
        b.textContent = t.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }) + " · " + t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        b.addEventListener("click", function () {
          box.querySelectorAll(".slot").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true"); picked = t;
          document.getElementById("confirm").disabled = false;
        });
        box.appendChild(b); made++;
      });
    }
    track("booking_shown");
    document.getElementById("confirm").addEventListener("click", function () {
      if (!picked) return;
      document.getElementById("book").hidden = true;
      document.getElementById("done").hidden = false;
      document.getElementById("done-text").textContent = "See you " + picked.toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" }) + ". A calendar invite is on its way.";
      track("booking_confirmed", { at: picked.toISOString() });
    });
  }
</script>
</body>
</html>
`;
}

export type Qa = { label: string; pass: boolean };

/** Checks the prototype in the browser before delivery. */
export function qa(html: string): Qa[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const ext = [...doc.querySelectorAll("script[src],link[href],img[src]")].filter((e) => /^https?:/i.test(e.getAttribute("src") ?? e.getAttribute("href") ?? ""));
  return [
    { label: "Parses as a complete HTML document", pass: !!doc.querySelector("html > head") && !!doc.querySelector("body") },
    { label: "Title and meta description present", pass: !!doc.title && !!doc.querySelector('meta[name="description"]') },
    { label: "Open Graph tags present", pass: !!doc.querySelector('meta[property="og:title"]') },
    { label: "Lead form with a required email field", pass: !!doc.querySelector('form input[type="email"][required]') },
    { label: "Every CTA is tracked", pass: [...doc.querySelectorAll("a.btn, button.btn")].every((b) => b.hasAttribute("data-track")) },
    { label: "Mobile viewport set", pass: !!doc.querySelector('meta[name="viewport"]') },
    { label: "Self-contained: no external requests", pass: ext.length === 0 },
    { label: `Size ${Math.round(new Blob([html]).size / 1024)} KB (under 40 KB)`, pass: new Blob([html]).size < 40_000 },
  ];
}

// No network, no form posts, no external assets: a delivered page can render and run its own script,
// but can't phone home with anything typed into it.
const LOCKDOWN = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'; base-uri 'none'">`;

/**
 * Pins the lockdown CSP into a page before it is rendered in a sandboxed frame. It goes first, before
 * any of the page's own markup, so nothing in the page (comments, a fake <head>) can push it out of
 * the document head. Our doctype keeps standards mode; the page's own doctype is dropped.
 */
export function lockdown(html: string) {
  return `<!doctype html>${LOCKDOWN}\n${html.replace(/^\s*<!doctype[^>]*>/i, "")}`;
}

// Chunked: spreading a large prototype into one fromCharCode call overflows the argument limit.
function b64url(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/**
 * t: target name, h: prototype HTML, n: handover note. Access controls, enforced by the delivery page:
 * exp: expiry (ms since epoch), dl: whether the recipient may download the source.
 */
export type Delivery = { t: string; h: string; n?: string; exp?: number; dl?: boolean };

/** Gzips the delivery into a URL fragment, which browsers never send to a server. */
export async function pack(d: Delivery): Promise<string> {
  const stream = new Blob([JSON.stringify(d)]).stream().pipeThrough(new CompressionStream("gzip"));
  return b64url(new Uint8Array(await new Response(stream).arrayBuffer()));
}

export async function unpack(fragment: string): Promise<Delivery> {
  const stream = new Blob([fromB64url(fragment)]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text()) as Delivery;
}

/*
 * Sealed deliveries: the gzipped delivery encrypted with AES-256-GCM.
 *   k1.<key>.<iv>.<ciphertext>   random key carried in the fragment: the link alone opens it.
 *   p1.<salt>.<iv>.<ciphertext>  key derived from a passcode (PBKDF2-SHA-256): the link alone can't.
 * Fragments never reach a server, so neither form is ever seen by Bloom AI.
 */
const PBKDF2_ROUNDS = 310_000;

async function passcodeKey(passcode: string, salt: Uint8Array<ArrayBuffer>, use: KeyUsage) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passcode.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: PBKDF2_ROUNDS, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, [use]);
}

export async function seal(d: Delivery, passcode?: string): Promise<string> {
  const plain = new Uint8Array(await new Response(new Blob([JSON.stringify(d)]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  if (passcode) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await passcodeKey(passcode, salt, "encrypt"), plain));
    return `p1.${b64url(salt)}.${b64url(iv)}.${b64url(ct)}`;
  }
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  return `k1.${b64url(raw)}.${b64url(iv)}.${b64url(ct)}`;
}

export const needsPasscode = (fragment: string) => fragment.startsWith("p1.");

/** Opens any delivery link: sealed (k1/p1) or the original gzip-only form. Throws on a wrong passcode. */
export async function openDelivery(fragment: string, passcode?: string): Promise<Delivery> {
  const m = /^([kp])1\.([\w-]+)\.([\w-]+)\.([\w-]+)$/.exec(fragment);
  if (!m) return unpack(fragment);
  const [a, iv, ct] = [fromB64url(m[2]), fromB64url(m[3]), fromB64url(m[4])];
  const key = m[1] === "p" ? await passcodeKey(passcode ?? "", a, "decrypt") : await crypto.subtle.importKey("raw", a, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"))).text()) as Delivery;
}
