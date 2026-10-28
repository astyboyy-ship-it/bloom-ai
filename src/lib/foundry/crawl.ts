import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Fetches a public web page for the Solution Foundry with SSRF guards: http(s) only on default ports,
 * no credentials in the URL, every resolved address must be public, redirects are followed by hand and
 * re-checked, and the body is capped. (A DNS answer could still change between the check and the
 * connection; the guards make that window small, not zero.)
 */

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

export class CrawlError extends Error {}

function privateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast, reserved, broadcast
  );
}

function privateIp(ip: string) {
  if (net.isIPv4(ip)) return privateV4(ip);
  const v6 = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (mapped) return privateV4(mapped[1]);
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb") || v6.startsWith("ff");
}

async function assertPublic(u: URL) {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new CrawlError("Only http and https URLs can be crawled.");
  if (u.username || u.password) throw new CrawlError("URLs with credentials are not allowed.");
  if (u.port && u.port !== "80" && u.port !== "443") throw new CrawlError("Only default web ports can be crawled.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new CrawlError("That host is not public.");
  const addrs = net.isIP(host) ? [host] : (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
  if (!addrs.length || addrs.some(privateIp)) throw new CrawlError("That host resolves to a private address.");
}

export type Fetched = { url: string; finalUrl: string; status: number; ms: number; bytes: number; html: string; truncated: boolean };

export async function safeFetch(raw: string): Promise<Fetched> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new CrawlError("That doesn't look like a URL.");
  }
  const started = Date.now();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "BloomAI-Foundry/1.0 (+https://workflow-architect-two.vercel.app)", Accept: "text/html,application/xhtml+xml" },
      cache: "no-store",
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url);
      continue;
    }
    const type = res.headers.get("content-type") ?? "";
    if (!/html|xml/i.test(type)) throw new CrawlError(`Expected a web page, got ${type || "an unknown type"}.`);
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    let truncated = false;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) {
          truncated = true;
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    return { url: raw, finalUrl: url.toString(), status: res.status, ms: Date.now() - started, bytes, html, truncated };
  }
  throw new CrawlError("Too many redirects.");
}

export type PageFacts = {
  finalUrl: string;
  status: number;
  ms: number;
  bytes: number;
  title: string;
  description: string;
  h1: string[];
  h2: string[];
  ogTitle: string;
  ogImage: string;
  themeColor: string;
  colors: string[];
  /** Brand typefaces, most used first: Google Fonts families, @font-face names, font-family stacks. */
  fonts: string[];
  forms: number;
  emailInputs: number;
  ctas: string[];
  scripts: number;
  images: number;
  imagesNoAlt: number;
  viewport: boolean;
  lang: string;
  canonical: boolean;
  analytics: string[];
  chat: string[];
  booking: string[];
};

const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
const meta = (html: string, key: string) => {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*>`, "i");
  return /content=["']([^"']*)["']/i.exec(re.exec(html)?.[0] ?? "")?.[1]?.trim() ?? "";
};
const GENERIC_FONT = /^(inherit|initial|unset|serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-\w+|-apple-system|blinkmacsystemfont|segoe ui|roboto|helvetica( neue)?|arial|emoji|math|var\(.*)$/i;

/** The typefaces a page actually brands with, counted across font links, @font-face and font-family. */
function fontsOf(html: string) {
  const counts = new Map<string, number>();
  const add = (raw: string, weight: number) => {
    const name = raw.replace(/["']/g, "").replace(/\+/g, " ").trim();
    if (name.length < 2 || name.length > 40 || GENERIC_FONT.test(name)) return;
    counts.set(name, (counts.get(name) ?? 0) + weight);
  };
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?[^"'\s>]*/gi)) for (const f of m[0].matchAll(/family=([^:&;]+)/gi)) add(decodeURIComponent(f[1]), 5);
  for (const m of html.matchAll(/@font-face\s*{[^}]*font-family\s*:\s*([^;}]+)/gi)) add(m[1], 3);
  for (const m of html.matchAll(/font-family\s*:\s*([^;}"]+)/gi)) add(m[1].split(",")[0], 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
}

const all = (html: string, tag: string) => [...html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))].map((m) => text(m[1])).filter(Boolean);

/** Reads what the Foundry needs from raw HTML. Regex-based: robust enough for audit signals. */
export function factsFrom(f: Fetched): PageFacts {
  const h = f.html;
  const body = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");
  const colorCounts = new Map<string, number>();
  for (const m of h.matchAll(/#([0-9a-f]{6})\b/gi)) {
    const c = `#${m[1].toLowerCase()}`;
    if (!/^#(f{6}|0{6}|f{3}|0{3})$/.test(c)) colorCounts.set(c, (colorCounts.get(c) ?? 0) + 1);
  }
  const ctaRe = /^(get started|start( (free|now|trial))?|sign up|book( a)? (demo|call)|request (a )?demo|try (it )?free|contact (us|sales)|talk to sales|buy now|shop now|subscribe|join)/i;
  const ctas = [...body.matchAll(/<(a|button)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => text(m[2]))
    .filter((t) => t.length > 1 && t.length < 40 && ctaRe.test(t));
  const imgs = [...h.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const has = (re: RegExp) => re.test(h);
  return {
    finalUrl: f.finalUrl,
    status: f.status,
    ms: f.ms,
    bytes: f.bytes,
    title: text(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(h)?.[1] ?? ""),
    description: meta(h, "description"),
    h1: all(body, "h1").slice(0, 5),
    h2: all(body, "h2").slice(0, 8),
    ogTitle: meta(h, "og:title"),
    ogImage: meta(h, "og:image"),
    themeColor: meta(h, "theme-color"),
    colors: [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c),
    fonts: fontsOf(h),
    forms: (h.match(/<form\b/gi) ?? []).length,
    emailInputs: (h.match(/<input[^>]+type=["']?email/gi) ?? []).length,
    ctas: [...new Set(ctas)].slice(0, 8),
    scripts: (h.match(/<script\b/gi) ?? []).length,
    images: imgs.length,
    imagesNoAlt: imgs.filter((i) => !/\balt=["'][^"']+["']/i.test(i)).length,
    viewport: has(/<meta[^>]+name=["']viewport["']/i),
    lang: /<html[^>]*\blang=["']([^"']+)["']/i.exec(h)?.[1] ?? "",
    canonical: has(/<link[^>]+rel=["']canonical["']/i),
    analytics: [
      has(/googletagmanager|gtag\(|google-analytics/i) && "Google Analytics/GTM",
      has(/segment\.(com|io)|analytics\.load/i) && "Segment",
      has(/plausible\.io/i) && "Plausible",
      has(/posthog/i) && "PostHog",
      has(/hotjar/i) && "Hotjar",
      has(/connect\.facebook\.net|fbq\(/i) && "Meta Pixel",
    ].filter((x): x is string => !!x),
    chat: [has(/intercom/i) && "Intercom", has(/drift\.com|driftt/i) && "Drift", has(/crisp\.chat/i) && "Crisp", has(/hubspot.*(conversations|messages)/i) && "HubSpot chat"].filter((x): x is string => !!x),
    booking: [has(/calendly\.com/i) && "Calendly", has(/cal\.com/i) && "Cal.com", has(/chilipiper/i) && "Chili Piper", has(/hubspot\.com\/meetings/i) && "HubSpot Meetings"].filter((x): x is string => !!x),
  };
}
