/**
 * Engine 02's built-in creative synthesizer. Deterministic and offline: a brand vault plus a product
 * angle becomes synchronized, platform-native ad variants built from named hook formulas, and every
 * hook is scored against a transparent rubric (no invented CTR predictions).
 */

export type Brand = {
  name: string;
  product: string;
  description: string;
  audience: string;
  pain: string;
  benefits: string[];
  proof: string[];
  offer: string;
  cta: string;
  voice: Voice;
  banned: string[];
  hashtags: string[];
};

export type Voice = "bold" | "warm" | "clinical" | "playful";
export const VOICES: Record<Voice, string> = { bold: "Bold & direct", warm: "Warm & human", clinical: "Precise & expert", playful: "Playful & loose" };

export type Format = "tiktok" | "reel" | "x" | "reddit";
export const FORMATS: Record<Format, { label: string; limit: number; unit: string }> = {
  tiktok: { label: "TikTok hook script", limit: 30, unit: "seconds" },
  reel: { label: "Instagram Reel caption", limit: 2200, unit: "characters" },
  x: { label: "X / Twitter thread", limit: 280, unit: "characters per post" },
  reddit: { label: "Reddit value post", limit: 300, unit: "character title" },
};

export type HookId = "contrarian" | "number" | "pov" | "question" | "beforeAfter" | "secret" | "proof" | "interrupt";

export const HOOKS: Record<HookId, { label: string; build: (c: Ctx) => string }> = {
  contrarian: { label: "Contrarian", build: (c) => `Stop ${c.painIng}. Here's how ${c.audience} get ${c.benefit} instead.` },
  number: { label: "Number", build: (c) => `${c.number} ${c.audience} switched to ${c.product} this quarter. Here's what changed.` },
  pov: { label: "POV", build: (c) => `POV: you're ${c.audienceOne} and you finally have ${c.benefit}.` },
  question: { label: "Question", build: (c) => `Why are ${c.audience} still ${c.painIng}?` },
  beforeAfter: { label: "Before / after", build: (c) => `Before ${c.product}: ${c.painIng}. After: ${c.benefit}.` },
  secret: { label: "Insider", build: (c) => `The thing top ${c.audience} won't tell you: they stopped ${c.painIng}.` },
  proof: { label: "Proof-first", build: (c) => `“${c.proof}”. That's what ${c.product} did for one of our customers.` },
  interrupt: { label: "Pattern interrupt", build: (c) => `You don't need another tool. You need ${c.benefit}.` },
};
export const HOOK_IDS = Object.keys(HOOKS) as HookId[];

type Ctx = { product: string; audience: string; audienceOne: string; pain: string; painIng: string; benefit: string; proof: string; number: string; offer: string; cta: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const article = (s: string) => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);
const singular = (s: string) => s.replace(/ies\b/, "y").replace(/s\b/, "");

function ctx(b: Brand, angle: string): Ctx {
  const benefit = lower((angle || b.benefits[0] || "more booked calls").replace(/\.$/, ""));
  const pain = lower(b.pain.replace(/\.$/, ""));
  // "triaging leads by hand" reads better than "triage leads by hand" after "Stop".
  const painIng = /^\w+ing\b/.test(pain) ? pain : pain.replace(/^(\w+?)e?\b/, (w) => (w.endsWith("e") ? `${w.slice(0, -1)}ing` : `${w}ing`));
  const num = /\b\d[\d,.]*\s?[%x×k]?/.exec(b.proof.join(" "))?.[0];
  return {
    product: b.product,
    audience: b.audience,
    audienceOne: article(singular(b.audience)),
    pain,
    painIng,
    benefit,
    proof: b.proof[0] ?? `${b.product} paid for itself in a month`,
    number: num && !num.includes("%") ? num.trim() : "312",
    offer: b.offer,
    cta: b.cta,
  };
}

export type Variant = {
  tiktok: { hookId: HookId; hook: string; beats: { t: string; shot: string; vo: string }[] };
  reel: { hookId: HookId; caption: string };
  x: { hookId: HookId; thread: string[] };
  reddit: { title: string; body: string };
};

const voiceLine = (v: Voice, line: string) =>
  v === "bold" ? line.replace(/\.$/, "!").replace(/!!$/, "!") : v === "playful" ? `${line} 👀` : v === "clinical" ? line.replace(/!/g, ".") : line;

export function tiktok(b: Brand, angle: string, hookId: HookId) {
  const c = ctx(b, angle);
  const hook = voiceLine(b.voice, HOOKS[hookId].build(c));
  return {
    hookId,
    hook,
    beats: [
      { t: "0–3s", shot: "Face to camera, text overlay of the hook, hard cut on the last word", vo: hook },
      { t: "3–8s", shot: "Screen recording: the messy before (inbox, spreadsheet)", vo: `If you're ${c.audienceOne}, you know the drill: ${c.painIng}.` },
      { t: "8–18s", shot: `Screen recording: ${c.product} doing it in real time`, vo: `${c.product} handles it: ${c.benefit}. ${b.benefits[1] ? cap(lower(b.benefits[1])) + "." : ""}`.trim() },
      { t: "18–25s", shot: "Testimonial quote card over B-roll", vo: c.proof },
      { t: "25–30s", shot: "Back to camera, point to the link", vo: `${c.offer}. ${c.cta}.` },
    ],
  };
}

export function reel(b: Brand, angle: string, hookId: HookId) {
  const c = ctx(b, angle);
  const tags = b.hashtags.map((h) => `#${h.replace(/^#/, "").replace(/\s+/g, "")}`).join(" ");
  const caption = [
    voiceLine(b.voice, HOOKS[hookId].build(c)),
    "",
    `→ ${cap(c.benefit)}`,
    ...b.benefits.slice(1, 3).map((x) => `→ ${cap(lower(x))}`),
    "",
    c.proof,
    "",
    `${c.offer}. ${c.cta} (link in bio)`,
    "",
    tags,
  ].join("\n");
  return { hookId, caption };
}

export function thread(b: Brand, angle: string, hookId: HookId) {
  const c = ctx(b, angle);
  const t = [
    `${voiceLine(b.voice, HOOKS[hookId].build(c))} 🧵`,
    `The problem: ${c.audience} spend hours ${c.painIng}. It's the most expensive "free" work in the business.`,
    `What ${c.product} does instead:\n\n${[c.benefit, ...b.benefits.slice(1, 3).map(lower)].map((x) => `• ${x}`).join("\n")}`,
    `Proof, not promises: ${c.proof}`,
    `${c.offer}. ${c.cta}.`,
  ];
  return { hookId, thread: t.map((s) => (s.length > 280 ? `${s.slice(0, 277)}…` : s)) };
}

export function redditPost(b: Brand, angle: string) {
  const c = ctx(b, angle);
  return {
    title: `How we stopped ${c.painIng} (what worked, what didn't)`,
    body: [
      `Context: I've worked with a lot of ${c.audience}, and ${c.painIng} kept coming up as the thing that eats the week.`,
      "",
      "What actually helped:",
      `1. Decide what "good" looks like before you automate anything: write down the 3 signals that mean ${c.benefit}.`,
      "2. Route the obvious cases automatically and keep humans on the edge cases.",
      "3. Review the misses weekly; the rules get better fast.",
      "",
      `Result for us: ${c.proof}.`,
      "",
      `Disclosure: I work on ${b.product}, which does this. Happy to share the checklist either way, no pitch.`,
    ].join("\n"),
  };
}

export function synthesize(b: Brand, angle: string, hooks: Partial<Record<Exclude<Format, "reddit">, HookId>> = {}): Variant {
  return {
    tiktok: tiktok(b, angle, hooks.tiktok ?? "contrarian"),
    reel: reel(b, angle, hooks.reel ?? "pov"),
    x: thread(b, angle, hooks.x ?? "number"),
    reddit: redditPost(b, angle),
  };
}

/** The next hook formula after `current`, for one-click regeneration. */
export const nextHook = (current: HookId, skip: HookId[] = []) => {
  const order = HOOK_IDS.filter((h) => !skip.includes(h) || h === current);
  return order[(order.indexOf(current) + 1) % order.length];
};

export type Check = { label: string; pass: boolean };

/** Transparent hook rubric. Each check is a known short-form best practice, not a prediction. */
export function scoreHook(text: string, banned: string[]): { score: number; checks: Check[] } {
  const words = text.replace(/[^\p{L}\p{N}\s']/gu, " ").split(/\s+/).filter(Boolean);
  const checks: Check[] = [
    { label: "≤ 14 words (fits a 3-second read)", pass: words.length <= 14 },
    { label: "Concrete number or named proof", pass: /\d|“|"/.test(text) },
    { label: "Speaks to the viewer (you / your)", pass: /\byou(r|'re)?\b/i.test(text) },
    { label: "Opens a loop (question, contrast or reveal)", pass: /\?|stop|instead|here's|won't tell|before|after|pov/i.test(text) },
    { label: "Plain words (avg ≤ 5.5 letters)", pass: words.reduce((s, w) => s + w.length, 0) / Math.max(1, words.length) <= 5.5 },
    { label: "No banned brand words", pass: !banned.some((w) => w && new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) },
  ];
  return { score: Math.round((checks.filter((c) => c.pass).length / checks.length) * 100), checks };
}

export const SAMPLE_BRAND: Brand = {
  name: "Bloom AI",
  product: "IntentPulse",
  description: "Scores every inbound DM, comment and form fill for buying intent and books the VIPs automatically.",
  audience: "agency owners",
  pain: "triaging leads by hand",
  benefits: ["Hot leads booked in 15 minutes", "Competitors and tire-kickers filtered out", "Every DM scored the moment it lands"],
  proof: ["Northstar Creative cut lead triage time by 70% in 3 weeks", "312 agencies booked 4,100 calls last quarter"],
  offer: "Free 14-day pilot",
  cta: "Start the pilot",
  voice: "bold",
  banned: ["revolutionary", "game-changer", "synergy"],
  hashtags: ["agencylife", "salesautomation", "leadgen"],
};
