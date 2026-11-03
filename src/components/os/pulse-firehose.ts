import type { EngineKey } from "@/components/bloom/command/engines";

/**
 * The Global Pulse firehose: simulated, high-frequency agent telemetry across many operational domains, on top
 * of the engines' own activity. Each domain has its own vocabulary and templates; `{a|b|c}` picks one option,
 * `{n:min-max}` a whole number, `{f:min-max}` a decimal, `{usd:min-max}` dollars, `{hex}` a short hash and
 * `{agent}` an agent id. Everything here is synthetic and labelled as such on the page.
 */

export type PulseDomain = { key: string; label: string; engine: EngineKey; templates: string[] };

export const PULSE_DOMAINS: PulseDomain[] = [
  {
    key: "music",
    label: "Music & Audio",
    engine: "aether",
    templates: [
      "{agent} synced {n:8-64} stems to the {n:120-174} BPM grid for '{Night Shift|Lagos Drift|Glass Hours|Midnight Tender|Second Sun}' (drift {f:0.1-2.9} ms)",
      "{agent} rendered the Ableton Live set '{Afro_Heat|Trap_Lab|Drill_Sketch|Amapiano_Vox}_v{n:2-19}.als' to 24-bit/48k WAV in {n:38-190}s",
      "{agent} cleared a {Kenyan benga|1970s Ethio-jazz|Bollywood string|soul horn|vinyl crackle} sample: {n:12-45}% master-use split, agreement out for e-signature",
      "{agent} exported the 140 BPM {Afrobeat|trap|Afro-trap|drill} master at {f:-9.5--6.0} LUFS integrated, true peak {f:-1.5--0.3} dBTP",
      "{agent} matched vocal chain presets across {n:3-9} producer sessions and flagged {n:1-4} phase-cancelled takes",
      "{agent} filed ISRC codes for {n:2-12} tracks and queued DSP delivery to {n:4-38} storefronts",
    ],
  },
  {
    key: "software",
    label: "Software & Desktop",
    engine: "coreops",
    templates: [
      "{agent} built the Tauri {Windows NSIS|macOS DMG|Linux AppImage} binary v0.{n:1-9}.{n:0-20} in {n:94-410}s ({f:4.1-12.8} MB)",
      "{agent} rolled the Vercel edge deployment back to {hex} in {n:180-950} ms after a {n:2-9}% 5xx spike in {iad1|fra1|sin1|gru1|hnd1}",
      "{agent} patched a Next.js hydration mismatch in {app/desk/layout.tsx|components/os/os-home.tsx|app/[locale]/page.tsx}: server/client date formatting aligned",
      "{agent} verified {n:40-400} 256-d vector memory snapshots: hash chain intact, {n:0-0} mismatches",
      "{agent} bumped {n:3-27} dependencies, re-ran {n:120-1840} tests ({n:0-2} flaky retried), green",
      "{agent} cut p95 cold start on /api/command from {n:900-1600} ms to {n:220-640} ms by lazy-loading the tool registry",
    ],
  },
  {
    key: "personal",
    label: "Personal Micro-Ops",
    engine: "sovereign",
    templates: [
      "{agent} reserved a {07:30|08:15|17:45|18:30} wakeboard cable slot at Lake TLV ({n:2-6} riders, wind {n:4-14} kn)",
      "{agent} re-optimized tomorrow's schedule: {n:2-6} meetings batched, {n:45-150} min of deep work protected",
      "{agent} sourced {smoked paprika|Sichuan peppercorn|sumac|black garlic|yuzu kosho} from {n:2-5} vendors; best price {usd:6-38}, delivery {Tue|Wed|Thu}",
      "{agent} triggered the smart-home evening scene: blinds {n:20-70}%, HVAC {n:21-24}°C, humidity held at {n:42-55}%",
      "{agent} renewed a {gym|co-working|parking|streaming} plan and saved {usd:4-60}/mo by switching to annual billing",
      "{agent} drafted a weekly meal plan at {n:1900-2800} kcal/day and pushed the shopping list to {n:1-3} grocery apps",
    ],
  },
  {
    key: "avian",
    label: "Avian & Micro-Environment",
    engine: "intentpulse",
    templates: [
      "{agent} logged a Common Myna perch-cue response at {n:2-6} kHz: {n:62-98}% success over {n:8-40} trials",
      "{agent} adjusted the aviary room to {f:22.0-27.5}°C / {n:45-65}% RH after the {morning|midday|dusk} activity peak",
      "{agent} shifted the Myna training tone from {n:2-4}.{n:0-9} kHz to {n:3-5}.{n:0-9} kHz; latency to perch fell {n:8-35}%",
      "{agent} detected {n:3-14} vocal mimicry bursts and tagged {n:1-5} new phrases for reinforcement",
      "{agent} ran the UV-B lamp cycle ({n:10-12} h) and logged CO₂ at {n:420-780} ppm",
    ],
  },
  {
    key: "gaming",
    label: "Gaming & Esports",
    engine: "cortex",
    templates: [
      "{agent} computed a Renekton top-lane wave state: freeze at {n:2-5} minions, crash on cannon wave {n:3-6}, level-{n:2-3} all-in window {n:3-9}s",
      "{agent} tracked the Clash Royale ladder meta: {Hog EQ|Log Bait|Lava Loon|X-Bow 3.0|Miner Poison} at {f:4.1-11.9}% usage, {f:48.0-56.5}% win rate",
      "{agent} matched Pokémon Unite synergies: {Blissey + Lucario|Greninja + Mamoswine|Gardevoir + Tsareena|Zeraora + Eldegoss} at {n:51-63}% duo win rate",
      "{agent} solved BTD6 CHIMPS round {n:63-100} micro-pathing on {Dark Castle|Infernal|Ouch|Bloody Puddles}: {n:2-7} tower repositions, ${n:300-4200} saved",
      "{agent} pulled {n:40-400} pro VODs and clustered jungle pathing into {n:3-8} archetypes for scrim prep",
      "{agent} flagged a {n:2-9}% patch-day win-rate swing and queued a counter-pick sheet for the team",
    ],
  },
  {
    key: "security",
    label: "Security & Hashing",
    engine: "shield",
    templates: [
      "{agent} sealed execution certificate CAE-{hex} with SHA-256; chain verified across {n:40-1200} runs",
      "{agent} intercepted a deepfake voice call to {finance|payroll|the CFO's office}: spectral fingerprint mismatch {f:0.71-0.98}, call quarantined",
      "{agent} rotated {n:6-48} API keys across {n:3-12} agent nodes with zero dropped requests",
      "{agent} blocked {n:2-40} prompt-injection attempts ({exfiltration|role override|tool hijack}) at the gateway",
      "{agent} re-hashed {n:1-9}k audit entries post-migration: integrity {ok|ok|ok}, {n:0-0} breaks",
      "{agent} revoked {n:1-6} stale OAuth grants and enforced hardware-key MFA on {n:2-20} admin seats",
    ],
  },
  {
    key: "video",
    label: "Generative Video & Ads",
    engine: "vanguard",
    templates: [
      "{agent} queued {n:4-36} Seedance 2.0 prompt renders ({9:16|16:9|1:1}, {n:5-15}s); {n:1-6} finished, ETA {n:40-300}s",
      "{agent} extracted {n:8-60} brand-safe assets from a Creative Fabrica bundle and tagged licenses per asset",
      "{agent} distributed the '{Summer Drop|Black Friday|Launch Week|Back to School}' cut to {n:3-14} regions, {n:2-6} locales each",
      "{agent} A/B tested {n:3-8} hooks: variant {A|B|C|D} lifted thumb-stop rate {f:4.0-31.0}%",
      "{agent} auto-captioned {n:6-40} spots in {n:3-11} languages and passed loudness to {-14|-16|-23} LUFS",
    ],
  },
  {
    key: "crypto",
    label: "Crypto & Liquidity",
    engine: "apex",
    templates: [
      "{agent} rebalanced DEX liquidity across OKX / Binance / Bybit nodes: {n:2-9} pools shifted, slippage {f:0.02-0.40}%",
      "{agent} routed a cross-chain transfer via {Arbitrum|Base|Optimism|Polygon zkEVM}: gas cut {n:18-74}% vs direct mainnet",
      "{agent} hedged {usd:20000-900000} of inventory exposure; delta now {f:-0.05-0.05}",
      "{agent} widened market-making spreads {n:2-9} bps after a {n:3-12}% volatility spike",
      "{agent} reconciled {n:200-4000} fills across {n:3-6} venues: {n:0-3} discrepancies auto-resolved",
    ],
  },
  {
    key: "freight",
    label: "Freight & Logistics",
    engine: "coreops",
    templates: [
      "{agent} bid on {n:2-20} container slots Rotterdam → Shanghai at {usd:1400-4800}/FEU; {n:1-12} won",
      "{agent} flagged a cold-chain excursion on reefer {hex}: {f:8.1-11.4}°C for {n:6-40} min; QA hold placed",
      "{agent} signed off {n:3-60} customs declarations at {Rotterdam|Hamburg|Antwerp|Felixstowe|Ashdod}; {n:0-2} sent for manual review",
      "{agent} rerouted {n:2-14} TEU around a {n:2-5}-day berth delay in {Singapore|Port Klang|Ningbo|Busan}",
      "{agent} matched {n:4-30} LTL shipments into {n:2-9} full truckloads, saving {usd:800-14000}",
    ],
  },
  {
    key: "legal",
    label: "Legal & Enterprise Admin",
    engine: "sovereign",
    templates: [
      "{agent} routed {n:3-24} litigation intake calls: {n:1-6} to partners, the rest scheduled with associates",
      "{agent} executed {n:1-9} NDAs ({mutual|one-way}) via e-signature; average turnaround {n:4-58} min",
      "{agent} reconciled {n:20-400} invoices against quotes in real time; {n:0-6} variances escalated",
      "{agent} redlined a {MSA|DPA|SOW|lease} in {n:3-14} min against the playbook: {n:2-11} clauses flagged",
      "{agent} renewed {n:2-18} vendor contracts and captured {usd:1200-48000} in negotiated savings",
    ],
  },
  {
    key: "health",
    label: "Health & Wellness Ops",
    engine: "shield",
    templates: [
      "{agent} synced {n:3-14} days of sleep data: deep sleep {n:12-24}%, recovery score {n:48-96}",
      "{agent} rescheduled {n:1-4} clinic appointments around travel and pushed reminders to {n:1-3} devices",
      "{agent} reordered {n:1-5} supplements before stock-out; delivery in {n:1-4} days",
    ],
  },
  {
    key: "research",
    label: "Research & Knowledge",
    engine: "cortex",
    templates: [
      "{agent} read {n:12-140} papers on {retrieval-augmented agents|battery chemistry|protein folding|LLM evals} and filed a {n:1-4}-page brief",
      "{agent} deduplicated {n:200-9000} notes into {n:12-90} topic clusters for the knowledge base",
      "{agent} fact-checked {n:4-30} claims in a draft: {n:0-3} corrected with sources",
    ],
  },
];

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const int = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** Fills a template's placeholders. */
export function fill(t: string, agents = 48): string {
  return t.replace(/\{([^{}]+)\}/g, (_, body: string) => {
    if (body === "agent") return `Agent #${String(int(1, agents)).padStart(2, "0")}`;
    if (body === "hex") return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0").slice(0, 7);
    const m = body.match(/^(n|f|usd):(-?[\d.]+)-(-?[\d.]+)$/);
    if (m) {
      const [lo, hi] = [Number(m[2]), Number(m[3])];
      // Decimals follow the bounds: {f:0.71-0.98} gives two, {f:4.1-12.8} one.
      if (m[1] === "f") return (lo + Math.random() * (hi - lo)).toFixed(Math.max(1, m[2].split(".")[1]?.length ?? 1));
      const v = int(lo, hi);
      return m[1] === "usd" ? `$${v.toLocaleString("en-US")}` : v.toLocaleString("en-US");
    }
    return pick(body.split("|"));
  });
}

/** One synthetic multi-domain action: the handling engine (for color and routing) and its text. */
export function firehoseEvent(): { engine: EngineKey; text: string; domain: string } {
  const d = pick(PULSE_DOMAINS);
  return { engine: d.engine, domain: d.label, text: `[${d.label}] ${fill(pick(d.templates))}` };
}
