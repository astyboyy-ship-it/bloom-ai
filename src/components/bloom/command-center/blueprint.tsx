"use client";

import { cn } from "@/lib/utils";
import { PLATFORMS, type Platform, type Route } from "@/lib/intentpulse/signal";
import { QUARANTINE_COLOR, TIER_COLOR, compact } from "./platform";

export type Niche = "saas" | "agency" | "ecommerce" | "coaching";

type NicheSpec = {
  label: string;
  sources: Platform[];
  cues: string[];
  actions: Record<Route, string>;
};

export const NICHES: Record<Niche, NicheSpec> = {
  saas: {
    label: "B2B SaaS",
    sources: ["x", "reddit", "instagram", "webhook"],
    cues: ["Budget approved / PO", "Salesforce · HubSpot · SSO", "VP / Head-of titles", "Go-live timelines"],
    actions: { vip: "Cal.com AE priority slot", outreach: "Personal DM + CRM deal", nurture: "21-day product drip", quarantine: "Competitive-intel log" },
  },
  agency: {
    label: "Creative agency",
    sources: ["instagram", "tiktok", "x", "webhook"],
    cues: ["Launch deadlines", "Retainer budgets", "Founder / owner", "Brand & ad stack"],
    actions: { vip: "Strategy call booking", outreach: "Portfolio DM + proposal", nurture: "Case-study drip", quarantine: "Rival agency log" },
  },
  ecommerce: {
    label: "E-commerce / DTC",
    sources: ["tiktok", "instagram", "reddit", "webhook"],
    cues: ["Wholesale volume", "Shopify · Klaviyo", "Buyer / owner", "Seasonal deadlines"],
    actions: { vip: "Wholesale call booking", outreach: "Offer DM + cart link", nurture: "Klaviyo nurture flow", quarantine: "Reseller filter" },
  },
  coaching: {
    label: "High-ticket coaching",
    sources: ["instagram", "tiktok", "x", "webhook"],
    cues: ["Investment ready", "Pain-point language", "Operator / founder", "Start-now urgency"],
    actions: { vip: "Enrollment call booking", outreach: "Voice-note DM", nurture: "Free-masterclass drip", quarantine: "Copycat filter" },
  },
};

const ROUTES: { key: Route; label: string; band: string; color: string }[] = [
  { key: "vip", label: "VIP", band: "85–100", color: TIER_COLOR.VIP },
  { key: "outreach", label: "Qualified", band: "60–84", color: TIER_COLOR.QUALIFIED },
  { key: "nurture", label: "Nurture", band: "< 60 · students ≤ 45", color: TIER_COLOR.NURTURE },
  { key: "quarantine", label: "Quarantine", band: "competitors ≤ 30", color: QUARANTINE_COLOR },
];

const W = 1100;
const H = 460;
const SRC = { x: 16, w: 170, h: 70 };
const PER = { x: 262, y: 120, w: 190, h: 220 };
const REA = { x: 520, y: 120, w: 190, h: 220 };
const RT = { x: 780, w: 140, h: 76 };
const ACT = { x: 950, w: 140, h: 76 };
const rowY = (i: number) => 22 + i * 108;

const link = (x1: number, y1: number, x2: number, y2: number) => {
  const mx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
};

/** The automated workflow chosen for the business niche, with live volumes on every node. */
export function Blueprint({
  niche,
  onNiche,
  perPlatform,
  routed,
  total,
}: {
  niche: Niche;
  onNiche: (n: Niche) => void;
  perPlatform: Record<Platform, number>;
  routed: Record<Route, number>;
  total: number;
}) {
  const spec = NICHES[niche];
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Business niche">
        {(Object.keys(NICHES) as Niche[]).map((n) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={n === niche}
            onClick={() => onNiche(n)}
            className={cn(
              "rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              n === niche ? "border-[#f0d59a]/60 bg-[#f0d59a]/10 text-[#f3e2b8]" : "border-white/10 text-white/50 hover:text-white",
            )}
          >
            {NICHES[n].label}
          </button>
        ))}
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[760px]" role="img" aria-label={`${spec.label} IntentPulse workflow`}>
          {/* Edges */}
          <g fill="none" strokeWidth="1.4">
            {spec.sources.map((p, i) => (
              <path key={p} d={link(SRC.x + SRC.w, rowY(i) + SRC.h / 2, PER.x, PER.y + PER.h / 2)} stroke={PLATFORMS[p].color} strokeOpacity="0.55" strokeDasharray="5 7" className="animate-demo-dash" />
            ))}
            <path d={link(PER.x + PER.w, PER.y + PER.h / 2, REA.x, REA.y + REA.h / 2)} stroke="#f3d48f" strokeOpacity="0.7" strokeDasharray="5 7" className="animate-demo-dash" />
            {ROUTES.map((r, i) => (
              <g key={r.key}>
                <path d={link(REA.x + REA.w, REA.y + REA.h / 2, RT.x, rowY(i) + RT.h / 2)} stroke={r.color} strokeOpacity="0.6" strokeDasharray="5 7" className="animate-demo-dash" />
                <path d={link(RT.x + RT.w, rowY(i) + RT.h / 2, ACT.x, rowY(i) + ACT.h / 2)} stroke={r.color} strokeOpacity="0.45" />
              </g>
            ))}
          </g>

          {/* Sources */}
          {spec.sources.map((p, i) => (
            <Node key={p} x={SRC.x} y={rowY(i)} w={SRC.w} h={SRC.h} accent={PLATFORMS[p].color} kicker="Trigger" title={PLATFORMS[p].label} meta={`${compact(perPlatform[p])} signals`} />
          ))}

          {/* Perceive */}
          <Node x={PER.x} y={PER.y} w={PER.w} h={PER.h} accent="#8ff0ff" kicker="01 · Perceive" title="Cue extraction" meta={`${compact(total)} read`}>
            {spec.cues.map((c, i) => (
              <text key={c} x={PER.x + 16} y={PER.y + 104 + i * 26} className="fill-white/70" style={{ fontSize: 12 }}>
                · {c}
              </text>
            ))}
          </Node>

          {/* Reason */}
          <Node x={REA.x} y={REA.y} w={REA.w} h={REA.h} accent="#f3d48f" kicker="02 · Reason" title="Score 0–100" meta="35/30/20/15 weights">
            {["Budget × 0.35", "Urgency × 0.30", "Stack fit × 0.20", "Authority × 0.15"].map((c, i) => (
              <text key={c} x={REA.x + 16} y={REA.y + 104 + i * 26} className="fill-white/70 font-mono" style={{ fontSize: 11 }}>
                {c}
              </text>
            ))}
          </Node>

          {/* Routes + actions */}
          {ROUTES.map((r, i) => (
            <g key={r.key}>
              <Node x={RT.x} y={rowY(i)} w={RT.w} h={RT.h} accent={r.color} kicker={`03 · ${r.band}`} title={r.label} meta={`${compact(routed[r.key])} routed`} />
              <Node x={ACT.x} y={rowY(i)} w={ACT.w} h={ACT.h} accent={r.color} kicker="Execute" title={spec.actions[r.key]} small />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/** Splits a short label into at most two lines at the space nearest its middle. */
function wrap(s: string) {
  if (s.length <= 16) return [s];
  const mid = s.length / 2;
  let at = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === " " && (at < 0 || Math.abs(i - mid) < Math.abs(at - mid))) at = i;
  return at < 0 ? [s] : [s.slice(0, at), s.slice(at + 1)];
}

function Node({ x, y, w, h, accent, kicker, title, meta, small, children }: {
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  kicker: string;
  title: string;
  meta?: string;
  small?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="14" fill="rgb(16 9 24 / 0.82)" stroke={accent} strokeOpacity="0.45" />
      <rect x={x} y={y + 14} width="2.5" height={h - 28} rx="1.25" fill={accent} />
      <text x={x + 16} y={y + 24} className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.16em" }} fill={accent}>
        {kicker}
      </text>
      {small ? (
        <text x={x + 16} y={y + 45} className="fill-white font-display" style={{ fontSize: 14 }}>
          {wrap(title).map((line, i) => (
            <tspan key={i} x={x + 16} dy={i ? 17 : 0}>
              {line}
            </tspan>
          ))}
        </text>
      ) : (
        <text x={x + 16} y={y + 48} className="fill-white font-display" style={{ fontSize: 19 }}>
          {title}
        </text>
      )}
      {meta && (
        <text x={x + 16} y={y + 66} className="fill-white/45 font-mono" style={{ fontSize: 10 }}>
          {meta}
        </text>
      )}
      {children}
    </g>
  );
}
