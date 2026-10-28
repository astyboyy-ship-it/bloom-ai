"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, CalendarCheck, Check, Flame, Loader2, MessageSquareReply, Pause, Play, Plus, Send, ShieldAlert, Sparkles, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { channelDraft } from "@/lib/intentpulse/channel-drafts";
import { PLATFORMS, routeOf, type Platform, type PulseSignal } from "@/lib/intentpulse/signal";
import { ago, fmt, PLATFORM_ICON } from "../../command-center/platform";
import { matchRule, usePulseEngine, type TriggerRule } from "../../command-center/use-pulse-engine";
import { usePersistent } from "../../studio/frame";
import { SpatialGraph, Hud, type Burst, type GraphEdge, type GraphNode } from "../graph";
import { CommandBar, glass, PanelHead, Segmented, Slider, Toggle } from "../ui";
import { IntentPulseShell } from "./shell";

const CHANNELS: Platform[] = ["reddit", "x", "instagram", "tiktok", "linkedin", "email"];
const BOOKING = "cal.com/your-team/priority";
const TIER_LABEL = { VIP: "Hot", QUALIFIED: "Warm", NURTURE: "Cool" } as const;
const TIER_CLS = { VIP: "bg-p-accent text-p-ink", QUALIFIED: "border border-p-accent/45 text-p-hi", NURTURE: "border border-p-edge/15 text-p-text/55" } as const;

const firstRule = (rules: TriggerRule[], s: PulseSignal) => rules.find((r) => r.enabled && matchRule(r, s.text, s.platform));

/** A tag as a matcher: `/pattern/flags` is a regular expression, anything else a whole-word phrase. */
function matcher(tag: string): RegExp | null {
  const re = /^\/(.+)\/([imsu]*)$/.exec(tag);
  try {
    // A space in a phrase also matches a hyphen: "lead routing" finds "lead-routing".
    return re ? new RegExp(re[1], re[2].includes("i") ? re[2] : `${re[2]}i`) : new RegExp(`\\b${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s-]+")}\\b`, "i");
  } catch {
    return null;
  }
}

/** The signal text with tracked phrases lit. */
function Lit({ text, res }: { text: string; res: RegExp[] }) {
  if (!res.length) return <>{text}</>;
  const all = new RegExp(res.map((r) => `(?:${r.source})`).join("|"), "gi");
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(all)) {
    if (!m[0]) break;
    out.push(text.slice(last, m.index), <mark key={m.index} className="rounded bg-p-accent/25 px-0.5 text-p-text">{m[0]}</mark>);
    last = (m.index ?? 0) + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

type Tone = "warm" | "direct" | "brief" | "consultative";
const TONES: { value: Tone; label: string }[] = [
  { value: "warm", label: "Warm" },
  { value: "direct", label: "Direct" },
  { value: "brief", label: "Brief" },
  { value: "consultative", label: "Consultative" },
];

/** The reply's hook and tone, applied to the AI draft (or rule reply) as a deterministic rewrite. */
function applyTone(text: string, tone: Tone, s: PulseSignal) {
  const body = text.trim();
  switch (tone) {
    case "brief": {
      const parts = body.split(/(?<=[.!?])\s+/);
      const booking = parts.find((p) => p.includes(BOOKING));
      return [parts[0], booking && booking !== parts[0] ? booking : ""].filter(Boolean).join(" ");
    }
    case "direct":
      return body.replace(/^(hi|hey|hello)[^,!.]*[,!.]\s*/i, "").replace(/^thanks[^.!]*[.!]\s*/i, "");
    case "consultative":
      return `${body}\n\nHappy to walk through how teams like ${s.author.company || "yours"} set this up. Would a 15-minute call help?`;
    default:
      return /^(hi|hey|hello)\b/i.test(body) ? body : `Hi ${s.author.name.split(" ")[0]}, thanks for reaching out! ${body}`;
  }
}

type Integration = { crm: "none" | "hubspot" | "salesforce" | "pipedrive"; url: string; onSend: boolean };
const CRMS: { value: Integration["crm"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "hubspot", label: "HubSpot" },
  { value: "salesforce", label: "Salesforce" },
  { value: "pipedrive", label: "Pipedrive" },
];

/** Posts a lead to the configured webhook from the browser. Returns a readable outcome. */
async function postWebhook(cfg: Integration, event: string, s: PulseSignal | null) {
  if (!/^https?:\/\//i.test(cfg.url.trim())) return { ok: false, text: "Add an http(s) webhook URL first." };
  const payload = {
    source: "intentpulse",
    event,
    crm: cfg.crm === "none" ? undefined : cfg.crm,
    at: new Date().toISOString(),
    lead: s ? { name: s.author.name, handle: s.author.handle, company: s.author.company, platform: s.platform, score: s.result.score, tier: s.result.tier, text: s.text } : { name: "Test lead", platform: "email", score: 92, tier: "VIP", text: "IntentPulse test payload" },
  };
  try {
    const r = await fetch(cfg.url.trim(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return { ok: r.ok, text: `Webhook answered ${r.status}${r.ok ? "" : ` ${r.statusText}`}` };
  } catch {
    return { ok: false, text: "Couldn't reach the webhook (offline, or its CORS policy blocks browser requests)." };
  }
}

// The radar ring: six channels around the core in a 1000×460 field. No channel sits straight above or
// below the core, so pings on one tendril never land on another channel's label.
const RING: Partial<Record<Platform, number>> = { reddit: 180, instagram: -120, x: -60, tiktok: 0, linkedin: 60, email: 120 };
const ringPos = (deg: number, t = 1): [number, number] => [500 + Math.cos((deg * Math.PI) / 180) * 400 * t, 210 + Math.sin((deg * Math.PI) / 180) * 150 * t];

/** IntentPulse: one live stream across six channels, an intent threshold, keyword rules, and replies already written. */
export function IntentPulseApp() {
  const e = usePulseEngine();
  const [on, setOn] = useState<Platform[]>(CHANNELS);
  const [minScore, setMinScore] = usePersistent("bloom.e4.sensitivity", 0);
  const [hotOnly, setHotOnly] = usePersistent("bloom.e4.hotOnly", false);
  const [negative, setNegative] = usePersistent<string[]>("bloom.e4.negative", ["just curious", "student", "/\\bthes[ie]s\\b/"]);
  const [open, setOpen] = useState<PulseSignal | null>(null);
  const [tone, setTone] = usePersistent<Tone>("bloom.e4.tone", "warm");
  const [hideCompetitors, setHideCompetitors] = usePersistent("bloom.e4.hideCompetitors", false);
  const [blockCompetitorReplies, setBlockCompetitorReplies] = usePersistent("bloom.e4.blockCompetitors", true);
  const [integration, setIntegration] = usePersistent<Integration>("bloom.e4.integration", { crm: "none", url: "", onSend: true });
  const [burst, setBurst] = useState<Burst | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [, tick] = useState(0);
  // Relative times ("12s ago") refresh every few seconds without re-rendering per signal.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const tracked = useMemo(() => e.keywords.map(matcher).filter((r): r is RegExp => !!r), [e.keywords]);
  const negRes = useMemo(() => negative.map(matcher).filter((r): r is RegExp => !!r), [negative]);
  const { feed, muted, competitors } = useMemo(() => {
    const pool = on.flatMap((k) => e.hub.feeds[k]).sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    const isMuted = (s: PulseSignal) => negRes.some((r) => r.test(s.text));
    const scored = pool.filter((s) => !isMuted(s) && (hotOnly ? s.result.tier === "VIP" : s.result.score >= minScore));
    const shown = (hideCompetitors ? scored.filter((s) => routeOf(s) !== "quarantine") : scored).slice(0, 60);
    return { feed: shown, muted: pool.filter(isMuted).length, competitors: scored.filter((s) => routeOf(s) === "quarantine").length };
  }, [e.hub.feeds, on, minScore, hotOnly, negRes, hideCompetitors]);
  const pool = useMemo(() => CHANNELS.flatMap((k) => e.hub.feeds[k]), [e.hub.feeds]);
  const w = e.hub.window;
  const span = w.length > 1 ? (w[w.length - 1].t - w[0].t) / 1000 : 0;
  const perSecond = span ? w.slice(1).reduce((a, b) => a + b.n, 0) / span : 0;
  const urgent = w.reduce((a, b) => a + CHANNELS.reduce((c, k) => c + b.per[k][1], 0), 0);
  const all = on.length === CHANNELS.length;

  // Radar matrix: each channel's tendril burns with its live signal rate; hot leads show as pings on it.
  const perChannel = CHANNELS.map((k) => w.reduce((a, b) => a + b.per[k][0], 0));
  const peak = Math.max(1, ...perChannel);
  // At most two pings per channel, so each tendril stays readable.
  const pings = feed.filter((s) => s.result.tier === "VIP" && routeOf(s) !== "quarantine").filter((s, i, a) => a.slice(0, i).filter((x) => x.platform === s.platform).length < 2).slice(0, 8);
  const pingIndex = new Map<string, number>();
  const nodes: GraphNode[] = [
    { id: "core", label: "Intent core", x: 500, y: 210, r: 30, metric: `${Math.round(perSecond)}/s`, sub: `${fmt(urgent)} urgent / min`, state: e.running ? "active" : "idle" },
    ...CHANNELS.map((k, i) => {
      const [x, y] = ringPos(RING[k] ?? 0);
      return { id: k, label: PLATFORMS[k].label, x, y, metric: `${fmt(perChannel[i])}/min`, sub: `${fmt(w.reduce((a, b) => a + b.per[k][1], 0))} urgent`, state: (on.includes(k) ? "done" : "idle") as GraphNode["state"] };
    }),
    ...pings.map((s) => {
      const n = pingIndex.get(s.platform) ?? 0;
      pingIndex.set(s.platform, n + 1);
      // Keep pings clear of the core: never closer than 40% of the way in.
      const [x, y] = ringPos(RING[s.platform] ?? 0, Math.max(0.4, 0.7 - n * 0.15));
      return { id: `ping:${s.id}`, label: s.author.name.split(" ")[0], x, y, r: 9, metric: String(s.result.score), state: "active" as const };
    }),
  ];
  const edges: GraphEdge[] = [
    ...CHANNELS.map((k, i) => ({ from: k, to: "core", flow: on.includes(k) ? perChannel[i] / peak : 0.02 })),
    ...pings.map((s) => ({ from: `ping:${s.id}`, to: "core", flow: 0.5, curve: 0 })),
  ];
  const openPing = (id: string) => {
    if (!id.startsWith("ping:")) return;
    const s = pings.find((x) => `ping:${x.id}` === id);
    if (!s) return;
    setBurst({ key: Date.now(), path: [id, "core"] });
    setOpen(s);
  };

  const onCommand = async (cmd: string): Promise<string | undefined> => {
    const [verb, ...rest] = cmd.trim().split(/\s+/);
    const arg = rest.join(" ");
    switch (verb.toLowerCase()) {
      case "track":
        if (!arg || !matcher(arg)) return "Usage: track <phrase or /regex/>";
        e.setKeywords([...new Set([...e.keywords, arg])]);
        return `Tracking “${arg}”.`;
      case "mute":
        if (!arg || !matcher(arg)) return "Usage: mute <phrase or /regex/>";
        setNegative([...new Set([...negative, arg])]);
        return `Muting “${arg}”.`;
      case "cutoff": {
        const n = Number(arg);
        if (!Number.isFinite(n) || n < 0 || n > 95) return "Usage: cutoff 0–95";
        setMinScore(Math.round(n / 5) * 5);
        return `Lead score cutoff ${Math.round(n / 5) * 5}.`;
      }
      case "tone": {
        const t = TONES.find((x) => x.value.startsWith(arg.toLowerCase()));
        if (!t) return `Tones: ${TONES.map((x) => x.value).join(", ")}`;
        setTone(t.value);
        return `Replies will be ${t.label.toLowerCase()}.`;
      }
      case "hot":
        setHotOnly(arg !== "off");
        return arg === "off" ? "Showing every score above your cutoff." : "Hot leads only.";
      case "pause":
        e.setRunning(false);
        return "Stream paused.";
      case "resume":
        e.setRunning(true);
        return "Stream live.";
      case "competitors":
        setHideCompetitors(arg === "hide");
        return arg === "hide" ? "Competitor signals hidden." : "Competitor signals shown, flagged.";
      case "webhook":
        return (await postWebhook(integration, "test", null)).text;
      default:
        return undefined;
    }
  };

  return (
    <IntentPulseShell
      title="Who wants to buy, right now."
      subtitle={`Every channel in one stream. ${fmt(urgent)} urgent buying signals in the last minute. Click Reply and your answer is already written.`}
      status={
        <>
          <span className="inline-flex items-center gap-2 tabular-nums">
            <span className={cn("size-1.5 rounded-full", e.running ? "animate-pulse bg-p-accent" : "bg-p-text/30")} /> {e.running ? `Live · ${Math.round(perSecond)}/s` : "Paused"}
          </span>
          <button type="button" onClick={() => e.setRunning(!e.running)} aria-label={e.running ? "Pause the stream" : "Resume the stream"} className="prod-ghost size-8">
            {e.running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
        </>
      }
    >
      <section aria-label="Omnichannel radar" className="-mx-6 lg:-mx-10">
        <SpatialGraph nodes={nodes} edges={edges} burst={burst} onNode={openPing}>
          <Hud className="left-6 top-3 lg:left-10" items={[{ label: "Signals / second", value: String(Math.round(perSecond)) }, { label: "Urgent this minute", value: fmt(urgent) }]} />
          <Hud className="right-6 top-3 text-right lg:right-10" items={[{ label: "Hot pings", value: String(pings.length) }, { label: "Lead score cutoff", value: hotOnly ? "85 (hot only)" : String(minScore) }]} />
          <p className="pointer-events-none absolute inset-x-0 top-3 text-center text-[11.5px] text-p-text/45">Hot leads appear as glowing pings. Touch one to open its reply drawer.</p>
        </SpatialGraph>
      </section>

      <div className="-mx-6 grid gap-0 lg:-mx-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 px-6 py-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setOn(CHANNELS)} className={cn("h-9 rounded-full px-4 text-[13.5px] transition-colors", all ? "bg-p-accent font-medium text-p-ink" : "border border-p-edge/15 text-p-text/65 hover:text-p-text")}>
              All
            </button>
            {CHANNELS.map((k) => {
              const Icon = PLATFORM_ICON[k];
              const active = on.includes(k) && !all;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setOn(all ? [k] : on.includes(k) ? (on.length === 1 ? CHANNELS : on.filter((x) => x !== k)) : [...on, k])}
                  className={cn("inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[13.5px] transition-colors", active ? "border-p-accent/60 bg-p-accent/15 text-p-text" : "border-p-edge/15 text-p-text/65 hover:text-p-text")}
                >
                  <Icon className="size-4" style={{ color: PLATFORMS[k].color }} /> {PLATFORMS[k].label}
                </button>
              );
            })}
            <label className="ml-auto inline-flex items-center gap-2.5 rounded-full border border-p-accent/30 bg-p-glass/50 py-1 pl-3 pr-1.5 text-[13px] text-p-text/85 backdrop-blur-xl">
              <Flame className={cn("size-4", hotOnly ? "text-p-accent" : "text-p-text/45")} /> Hot leads only
              <Toggle on={hotOnly} onChange={setHotOnly} label="Hot leads only" />
            </label>
          </div>
          {(muted > 0 || competitors > 0) && (
            <p className="mt-3 flex flex-wrap gap-x-4 text-[12px] text-p-text/50">
              {competitors > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[#ffb3a3]">
                  <ShieldAlert className="size-3.5" /> {competitors} competitor{competitors === 1 ? "" : "s"} in view · don&apos;t reply
                </span>
              )}
              {muted > 0 && <span>{muted} signal{muted === 1 ? "" : "s"} muted by negative keywords</span>}
            </p>
          )}

          <ol className={cn(glass, "mt-4 divide-y divide-p-edge/[0.07] overflow-hidden")} onPointerEnter={() => (e.hovering.current = true)} onPointerLeave={() => (e.hovering.current = false)}>
            {feed.map((s) => {
              const Icon = PLATFORM_ICON[s.platform];
              const quarantine = routeOf(s) === "quarantine";
              const rule = firstRule(e.rules, s);
              return (
                <li key={s.id} className="animate-row-in flex gap-4 px-5 py-4 transition-colors hover:bg-p-text/[0.03]">
                  <Icon className="mt-1 size-5 shrink-0" style={{ color: PLATFORMS[s.platform].color }} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-[14px]">
                      <span className="font-semibold text-p-text">{s.author.name}</span>
                      {s.author.verified && <BadgeCheck className="size-4 text-[#7cc4ff]" aria-label="Verified" />}
                      <span className="text-p-text/40">
                        {PLATFORMS[s.platform].label} · {ago(s.postedAt)}
                      </span>
                      {rule && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-p-accent/35 px-2 py-px text-[11.5px] text-p-hi">
                          <Zap className="size-3" /> {rule.action}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[14.5px] leading-relaxed text-p-text/80">
                      <Lit text={s.text} res={tracked} />
                    </p>
                    {quarantine && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-[#ffb3a3]">
                        <ShieldAlert className="size-3.5" /> Looks like a competitor researching you. Don&apos;t reply.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums", quarantine ? "border border-[#ff9d84]/40 text-[#ffb3a3]" : TIER_CLS[s.result.tier])}>
                      {quarantine ? "Competitor" : `${TIER_LABEL[s.result.tier]} · ${s.result.score}`}
                    </span>
                    {sent[s.id] ? (
                      <span className="inline-flex items-center gap-1 text-[13px] text-[#a8e0b0]">
                        <Check className="size-4" /> {sent[s.id]}
                      </span>
                    ) : quarantine ? (
                      <button type="button" onClick={() => setOpen(s)} className="h-9 rounded-full px-3 text-[13px] text-p-text/45 hover:text-p-text">
                        Details
                      </button>
                    ) : (
                      <button type="button" onClick={() => setOpen(s)} className={cn("h-9 px-4 text-[13.5px]", s.result.tier === "VIP" ? "prod-btn" : "prod-ghost")}>
                        <MessageSquareReply className="size-4" /> Reply
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
            {!feed.length && <li className="px-5 py-14 text-center font-display text-[20px] italic text-p-text/45">{hotOnly || minScore > 0 ? "Nothing that hot yet. Listening…" : "Listening…"}</li>}
          </ol>
          <p className="mt-3 text-[12px] text-p-text/40">The stream pauses while your pointer is over it. Signals are simulated sample data, each scored by the real IntentPulse engine.</p>
        </div>

        <aside className={cn(glass, "space-y-8 px-6 py-6")}>
          <section className="space-y-6">
            <PanelHead title="Signal rules" hint="What the radar listens for, what it ignores, and how sure it must be." />
            <div className={cn(hotOnly && "opacity-50")}>
              <p className="flex items-baseline justify-between text-[13px] text-p-text/70">
                Lead score cutoff
                <span className="prod-hud text-[22px] font-semibold">
                  {minScore}
                  <span className="text-[12px] font-normal text-p-text/45"> / 100</span>
                </span>
              </p>
              <Slider min={0} max={95} step={5} value={minScore} disabled={hotOnly} onChange={setMinScore} label="Lead score cutoff" className="mt-2" />
              <div className="mt-2">
                <Segmented
                  size="sm"
                  label="Quick threshold"
                  value={String(minScore)}
                  onChange={(v) => setMinScore(Number(v))}
                  options={[
                    { value: "0", label: "Everything" },
                    { value: "60", label: "Warm 60+" },
                    { value: "85", label: "Hot 85+" },
                  ]}
                />
              </div>
              {hotOnly && <p className="mt-2 text-[11.5px] text-p-text/45">Hot leads only is on: showing scores of 85 and up.</p>}
            </div>
            <TagCloud label="Tracked phrases" hint="The stream listens for these, and lights them up." tags={e.keywords} onChange={e.setKeywords} />
            <TagCloud label="Negative keywords" hint="Signals with these are muted." tags={negative} onChange={setNegative} negative />
            <p className="text-[11.5px] text-p-text/40">
              Write <span className="font-mono text-p-text/60">/pattern/</span> for a regular expression, e.g. <span className="font-mono text-p-text/60">/\bRFP\b/</span>.
            </p>
          </section>

          <PatternBuilder pool={pool} onTrack={(p) => e.setKeywords([...new Set([...e.keywords, p])])} onMute={(p) => setNegative([...new Set([...negative, p])])} />

          <section className="space-y-4">
            <PanelHead title="Reply policy" hint="How drafts sound, and what happens with competitors." />
            <div>
              <p className="text-[13px] text-p-text/70">AI hook & tone</p>
              <div className="mt-2">
                <Segmented size="sm" label="Reply tone" value={tone} onChange={setTone} options={TONES} />
              </div>
            </div>
            <label className="flex items-center gap-3 text-[13px] text-p-text/75">
              <Toggle on={hideCompetitors} onChange={setHideCompetitors} label="Hide competitor signals" /> Hide competitor signals from the stream
            </label>
            <label className="flex items-center gap-3 text-[13px] text-p-text/75">
              <Toggle on={blockCompetitorReplies} onChange={setBlockCompetitorReplies} label="Never reply to competitors" /> Never reply to flagged competitors
            </label>
          </section>

          <Integrations cfg={integration} setCfg={setIntegration} />

          <RulesPanel rules={e.rules} setRules={e.setRules} hits={e.hub.triggers} />
        </aside>
      </div>

      {open && (
        <ReplyDrawer
          s={open}
          tone={tone}
          blockCompetitors={blockCompetitorReplies}
          onDispatched={async (kind) => {
            if (integration.onSend && integration.url.trim()) toast(`${(await postWebhook(integration, kind === "vip" ? "call_booked" : "replied", open)).text}`);
          }}
          rule={firstRule(e.rules, open)}
          onClose={() => setOpen(null)}
          onSent={(label) => setSent((x) => ({ ...x, [open.id]: label }))}
          send={(kind) => e.dispatch(open, kind)}
        />
      )}

      <CommandBar placeholder="track /\bRFP\b/ · mute student · cutoff 70 · tone brief · hot on · webhook test" hints={["track <phrase|/regex/>", "mute <phrase|/regex/>", "cutoff <0-95>", "tone <warm|direct|brief|consultative>", "hot on|off", "competitors hide|show", "pause", "resume", "webhook test"]} onRun={onCommand} />
    </IntentPulseShell>
  );
}

/** Live pattern builder: write a phrase or /regex/, see what it catches in the stream right now, then keep it. */
function PatternBuilder({ pool, onTrack, onMute }: { pool: PulseSignal[]; onTrack: (p: string) => void; onMute: (p: string) => void }) {
  const [pattern, setPattern] = useState("");
  const re = pattern.trim() ? matcher(pattern.trim()) : null;
  const hits = re ? pool.filter((s) => re.test(s.text)) : [];
  return (
    <section className="space-y-3">
      <PanelHead title="Pattern builder" hint="Test a phrase or /regex/ against the live stream before you keep it." />
      <input value={pattern} onChange={(ev) => setPattern(ev.target.value)} placeholder="/\b(RFP|procurement)\b/" aria-label="Pattern" aria-invalid={!!pattern.trim() && !re} className={cn("prod-field h-10 w-full px-3 font-mono text-[13px]", pattern.trim() && !re && "border-[#ff9d84]/60")} />
      {pattern.trim() && !re && <p className="text-[11.5px] text-[#ffb3a3]">That regular expression doesn&apos;t compile.</p>}
      {re && (
        <>
          <p className="text-[12.5px] text-p-text/60">
            <span className="prod-hud text-[15px]">{hits.length}</span> of {pool.length} signals in view match
          </p>
          <ul className="space-y-1.5">
            {hits.slice(0, 3).map((s) => (
              <li key={s.id} className="line-clamp-2 text-[12px] leading-snug text-p-text/65">
                <Lit text={s.text} res={[re]} />
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button type="button" onClick={() => (onTrack(pattern.trim()), setPattern(""))} className="prod-ghost h-8 flex-1 text-[12.5px]">
              Track it
            </button>
            <button type="button" onClick={() => (onMute(pattern.trim()), setPattern(""))} className="prod-ghost h-8 flex-1 text-[12.5px]">
              Mute it
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/** Webhook and CRM dispatch: where a lead goes when you reply or book. */
function Integrations({ cfg, setCfg }: { cfg: Integration; setCfg: (c: Integration) => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <section className="space-y-3">
      <PanelHead title="Webhook & CRM dispatch" hint="Send each lead you act on to your endpoint, tagged for your CRM." />
      <Segmented size="sm" label="CRM" value={cfg.crm} onChange={(crm) => setCfg({ ...cfg, crm })} options={CRMS} />
      <input value={cfg.url} onChange={(ev) => setCfg({ ...cfg, url: ev.target.value })} placeholder="https://hooks.example.com/intentpulse" aria-label="Webhook URL" className="prod-field h-10 w-full px-3 font-mono text-[12.5px]" />
      <label className="flex items-center gap-3 text-[13px] text-p-text/75">
        <Toggle on={cfg.onSend} onChange={(onSend) => setCfg({ ...cfg, onSend })} label="Dispatch on every reply" /> Dispatch on every reply and booking
      </label>
      <button
        type="button"
        disabled={busy || !cfg.url.trim()}
        onClick={async () => {
          setBusy(true);
          setResult(await postWebhook(cfg, "test", null));
          setBusy(false);
        }}
        className="prod-ghost h-9 w-full text-[12.5px]"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />} Send a test payload
      </button>
      {result && <p className={cn("text-[12px]", result.ok ? "text-[#a8e0b0]" : "text-[#ffb3a3]")}>{result.text}</p>}
      <p className="text-[11px] text-p-text/40">Sent from your browser as JSON. Nothing is stored by IntentPulse.</p>
    </section>
  );
}

function TagCloud({ label, hint, tags, onChange, negative }: { label: string; hint: string; tags: string[]; onChange: (t: string[]) => void; negative?: boolean }) {
  const [draft, setDraft] = useState("");
  const bad = !!draft.trim() && !matcher(draft.trim());
  const add = () => {
    const t = draft.trim();
    if (!t || bad || tags.includes(t)) return;
    onChange([...tags, t]);
    setDraft("");
  };
  return (
    <div>
      <p className="text-[13px] text-p-text/70">{label}</p>
      <p className="text-[11.5px] text-p-text/40">{hint}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className={cn("inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 font-mono text-[11.5px]", negative ? "border border-[#ff9d84]/30 bg-[#ff7b6b]/10 text-[#ffc2b5]" : "bg-p-accent/15 text-p-hi", !matcher(t) && "line-through opacity-60")}>
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="rounded-full p-0.5 opacity-60 hover:opacity-100">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(ev) => setDraft(ev.target.value)}
        onKeyDown={(ev) => ev.key === "Enter" && (ev.preventDefault(), add())}
        placeholder={negative ? "Add a phrase to ignore…" : "Add a phrase to track…"}
        aria-label={`Add to ${label.toLowerCase()}`}
        aria-invalid={bad}
        className={cn("prod-field mt-2 h-9 w-full px-3 text-[13px]", bad && "border-[#ff9d84]/60")}
      />
      {bad && <p className="mt-1 text-[11.5px] text-[#ffb3a3]">That regular expression doesn&apos;t compile.</p>}
    </div>
  );
}

function RulesPanel({ rules, setRules, hits }: { rules: TriggerRule[]; setRules: (r: TriggerRule[]) => void; hits: Record<string, number> }) {
  const [adding, setAdding] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [channel, setChannel] = useState<Platform | "all">("all");
  const [reply, setReply] = useState("");

  const add = (ev: React.FormEvent) => {
    ev.preventDefault();
    const kws = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (!kws.length || !reply.trim()) return;
    setRules([...rules, { id: `r-${Date.now().toString(36)}`, keywords: kws, channel, action: `Reply on “${kws[0]}”`, reply: reply.trim(), enabled: true }]);
    setKeywords("");
    setReply("");
    setAdding(false);
  };

  return (
    <section className={cn(glass, "p-5")}>
      <PanelHead title="Reply rules" hint="When a message mentions these words, the matching reply is ready in the drawer.">
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="prod-ghost h-8 px-3 text-[12.5px]">
            <Plus className="size-3.5" /> Add
          </button>
        )}
      </PanelHead>

      {adding && (
        <form onSubmit={add} className="mt-4 space-y-2.5 rounded-xl border border-p-edge/10 bg-black/20 p-3">
          <input value={keywords} onChange={(ev) => setKeywords(ev.target.value)} placeholder="Keywords, comma separated" aria-label="Keywords" autoFocus className="prod-field h-10 w-full px-3 text-[13.5px]" />
          <select value={channel} onChange={(ev) => setChannel(ev.target.value as Platform | "all")} aria-label="Channel" className="prod-field h-10 w-full px-3 text-[13.5px]">
            <option value="all" className="bg-[#16120c]">
              Every channel
            </option>
            {CHANNELS.map((k) => (
              <option key={k} value={k} className="bg-[#16120c]">
                {PLATFORMS[k].label} only
              </option>
            ))}
          </select>
          <textarea value={reply} onChange={(ev) => setReply(ev.target.value)} placeholder="Reply to suggest. {{booking_link}} becomes your booking link." aria-label="Reply" rows={3} className="prod-field w-full resize-none p-3 text-[13.5px]" />
          <div className="flex gap-2">
            <button type="submit" disabled={!keywords.trim() || !reply.trim()} className="prod-btn h-9 flex-1 text-[13px]">
              Save rule
            </button>
            <button type="button" onClick={() => setAdding(false)} className="h-9 rounded-full px-3 text-[13px] text-p-text/55 hover:text-p-text">
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="mt-4 space-y-2.5">
        {rules.map((r) => (
          <li key={r.id} className={cn("rounded-xl border border-p-edge/10 bg-black/15 p-3", !r.enabled && "opacity-55")}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-p-text">{r.action}</p>
                <p className="mt-0.5 text-[11.5px] text-p-text/45">
                  {r.channel === "all" ? "Every channel" : PLATFORMS[r.channel].label} · {fmt(hits[r.id] ?? 0)} matches
                </p>
              </div>
              <Toggle on={r.enabled} onChange={(v) => setRules(rules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))} label={`Enable ${r.action}`} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {r.keywords.map((k) => (
                <span key={k} className="rounded-full bg-p-accent/12 px-2 py-0.5 font-mono text-[11px] text-p-hi">
                  {k}
                </span>
              ))}
              <button type="button" onClick={() => setRules(rules.filter((x) => x.id !== r.id))} aria-label={`Delete ${r.action}`} className="ml-auto rounded p-1 text-p-text/30 hover:text-[#ffb3a3]">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
        {!rules.length && <li className="text-[13px] text-p-text/45">No rules yet. Every reply comes from the AI draft.</li>}
      </ul>
    </section>
  );
}

function ReplyDrawer({ s, rule, tone, blockCompetitors, onClose, onSent, onDispatched, send }: { s: PulseSignal; rule?: TriggerRule; tone: Tone; blockCompetitors: boolean; onClose: () => void; onSent: (label: string) => void; onDispatched: (kind: "outreach" | "vip") => void; send: (kind: "outreach" | "vip") => Promise<unknown> }) {
  const draft = channelDraft(s);
  const ruleText = rule?.reply.replaceAll("{{booking_link}}", BOOKING);
  const [source, setSource] = useState<"ai" | "rule">(ruleText ? "rule" : "ai");
  const [text, setText] = useState(applyTone(ruleText ?? draft.text, tone, s));
  const [busy, setBusy] = useState<null | "outreach" | "vip">(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hot = routeOf(s) === "vip";
  // A flagged competitor only gets a reply when the policy allows it.
  const quarantine = routeOf(s) === "quarantine" && blockCompetitors;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pick = (v: "ai" | "rule") => {
    setSource(v);
    setText(applyTone(v === "rule" && ruleText ? ruleText : draft.text, tone, s));
  };

  const go = async (kind: "outreach" | "vip") => {
    setBusy(kind);
    await navigator.clipboard.writeText(text).catch(() => {});
    const res = await send(kind);
    setBusy(null);
    if (res) {
      onDispatched(kind);
      onSent(kind === "vip" ? "Call booked" : "Replied");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="reply-title" className="prod-sheet flex h-full w-full max-w-lg flex-col overflow-y-auto border-y-0 border-r-0 p-7" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="reply-title" className="font-display text-[28px] font-medium leading-tight text-p-text">
              Reply to {s.author.name.split(" ")[0]}
            </h2>
            <p className="mt-1 text-[13px] text-p-text/50">
              {PLATFORMS[s.platform].label} · {s.author.company} · intent {s.result.score}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-p-text/50 hover:text-p-text">
            <X className="size-5" />
          </button>
        </div>
        <div className="prod-hairline mt-5 opacity-50" />
        <p className="mt-5 rounded-xl border border-p-edge/10 bg-black/25 p-4 text-[14.5px] leading-relaxed text-p-text/80">{s.text}</p>
        {quarantine ? (
          <p className="mt-5 flex gap-2 rounded-xl border border-[#ff9d84]/25 bg-[#ff7b6b]/10 p-4 text-[14px] text-[#ffc2b5]">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" /> This looks like a competitor researching you. We suggest not replying.
          </p>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] text-p-text/55">{source === "rule" ? `From your rule: ${rule?.action}` : `${draft.label} · written for you`}</span>
              {ruleText && (
                <Segmented
                  size="sm"
                  label="Reply source"
                  value={source}
                  onChange={pick}
                  options={[
                    { value: "rule", label: <><Zap className="size-3" /> Rule</> },
                    { value: "ai", label: <><Sparkles className="size-3" /> AI draft</> },
                  ]}
                />
              )}
            </div>
            <textarea value={text} onChange={(ev) => setText(ev.target.value)} rows={8} aria-label="Reply" className="prod-field mt-2 w-full resize-y p-4 text-[15px] leading-relaxed" />
            <div className="mt-4 flex flex-wrap gap-2">
              {hot && (
                <button type="button" disabled={!!busy} onClick={() => go("vip")} className="prod-btn h-12 flex-1 text-[15px]">
                  {busy === "vip" ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck className="size-4" />} Send & book a call
                </button>
              )}
              <button type="button" disabled={!!busy || !text.trim()} onClick={() => go("outreach")} className={cn("h-12 flex-1 text-[15px]", hot ? "prod-ghost font-semibold" : "prod-btn")}>
                {busy === "outreach" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send reply
              </button>
            </div>
            <p className="mt-3 text-[12px] text-p-text/40">No {PLATFORMS[s.platform].label} account is connected yet: Send records the dispatch and copies your reply so you can paste it.</p>
          </>
        )}
      </aside>
    </div>
  );
}
