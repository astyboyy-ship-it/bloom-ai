"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_KEYS, PLATFORMS, SWEEPABLE, type Platform } from "@/lib/intentpulse/signal";
import { usePulse } from "./command-center";
import { ActivityList, Bar, Button, ChannelSalesTable, Empty, money, pct, Surface, SurfaceHeader } from "./kit";
import { clock, compact, fmt, PLATFORM_ICON } from "./platform";
import { DEFAULT_AUTORESPONDER, matchRule, type AutoResponder, type TriggerRule } from "./use-pulse-engine";
import { InstagramInbox } from "./views/instagram-inbox";
import { BlueprintView, Shifts } from "./views/operations";
import { LiveSignals, Overview, Segmented } from "./views/overview";
import { RedditMonitor } from "./views/reddit-monitor";
import { Stream } from "./views/stream";

/** Scopes the app bar's sweep to a channel while a page is open. */
function useSweepScope(channel?: Platform) {
  const { setSweepChannel } = usePulse();
  useEffect(() => {
    setSweepChannel(channel);
    return () => setSweepChannel(undefined);
  }, [channel, setSweepChannel]);
}

export function OverviewPage() {
  return <Overview {...usePulse()} />;
}

type RadarTab = "all" | "instagram" | "reddit" | "x" | "tiktok";

/** Real-time radar: every channel in one live table, or one channel's native stream. */
export function RadarPage() {
  const p = usePulse();
  const [tab, setTab] = useState<RadarTab>("all");
  useSweepScope(tab === "all" ? undefined : tab);
  const urgent = useMemo(() => {
    const out = Object.fromEntries(PLATFORM_KEYS.map((k) => [k, 0])) as Record<Platform, number>;
    for (const w of p.e.hub.window) for (const k of PLATFORM_KEYS) out[k] += w.per[k][1];
    return out;
  }, [p.e.hub.window]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["all", ...SWEEPABLE] as RadarTab[]).map((t) => {
          const Icon = t === "all" ? null : PLATFORM_ICON[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn("inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[12.5px] transition-colors", tab === t ? "border-white/20 bg-white/[0.08] text-white" : "border-white/[0.07] text-white/55 hover:text-white")}
            >
              {Icon && <Icon className="size-3.5" style={{ color: PLATFORMS[t as Platform].color }} />}
              {t === "all" ? "All channels" : PLATFORMS[t as Platform].label}
              <span className="tabular-nums text-[11px] text-white/40">{fmt(t === "all" ? SWEEPABLE.reduce((a, k) => a + urgent[k], 0) : urgent[t])} urgent/min</span>
            </button>
          );
        })}
      </div>
      {tab === "all" && <LiveSignals {...p} height="h-[calc(100dvh-260px)] min-h-[480px]" />}
      {tab === "reddit" && <RedditMonitor {...p} />}
      {(tab === "instagram" || tab === "x" || tab === "tiktok") && <Stream key={tab} {...p} platform={tab} />}
    </div>
  );
}

export function InboxPage() {
  useSweepScope("instagram");
  return <InstagramInbox {...usePulse()} />;
}

type RulesTab = "triggers" | "auto" | "schedule" | "blueprint";

/** Keyword triggers, the auto-responder, and the automation schedule. */
export function RulesPage() {
  const p = usePulse();
  const [tab, setTab] = useState<RulesTab>("triggers");
  return (
    <div className="space-y-4">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { id: "triggers", label: "Keyword triggers" },
          { id: "auto", label: "Auto-responder" },
          { id: "schedule", label: "Shift schedule" },
          { id: "blueprint", label: "Workflow blueprint" },
        ]}
      />
      {tab === "triggers" && <Triggers />}
      {tab === "auto" && <AutoResponderForm />}
      {tab === "schedule" && <Shifts {...p} />}
      {tab === "blueprint" && <BlueprintView {...p} />}
    </div>
  );
}

const input = "w-full rounded-md border border-white/[0.09] bg-black/25 px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none";

function Triggers() {
  const { e } = usePulse();
  const [test, setTest] = useState("Hey! What's your pricing? We need a demo next week.");
  const [testChannel, setTestChannel] = useState<Platform>("instagram");
  const update = (id: string, patch: Partial<TriggerRule>) => e.setRules(e.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const fired = e.rules.filter((r) => r.enabled && matchRule(r, test, testChannel));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Surface>
        <SurfaceHeader
          title="Keyword triggers"
          meta="matched counts are live from the stream"
          right={
            <Button size="sm" onClick={() => e.setRules([...e.rules, { id: `r${Date.now()}`, keywords: ["keyword"], channel: "all", action: "New action", reply: "", enabled: true }])}>
              <Plus className="size-3.5" /> Add trigger
            </Button>
          }
        />
        <ul className="divide-y divide-white/[0.06]">
          {e.rules.map((r) => (
            <li key={r.id} className={cn("grid gap-2.5 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_140px_minmax(0,1fr)_auto]", !r.enabled && "opacity-55")}>
              <label className="block">
                <span className="mb-1 block text-[11px] text-white/40">Keywords (comma-separated)</span>
                <input className={input} value={r.keywords.join(", ")} onChange={(ev) => update(r.id, { keywords: ev.target.value.split(",").map((k) => k.trimStart()) })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-white/40">Channel</span>
                <select className={input} value={r.channel} onChange={(ev) => update(r.id, { channel: ev.target.value as TriggerRule["channel"] })}>
                  <option value="all" className="bg-[#16141b]">
                    All channels
                  </option>
                  {PLATFORM_KEYS.map((k) => (
                    <option key={k} value={k} className="bg-[#16141b]">
                      {PLATFORMS[k].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-white/40">Action</span>
                <input className={input} value={r.action} onChange={(ev) => update(r.id, { action: ev.target.value })} />
              </label>
              <div className="flex items-end gap-2">
                <span className="pb-1.5 text-[11.5px] tabular-nums text-white/55">{fmt(e.hub.triggers[r.id] ?? 0)} matched</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={r.enabled}
                  aria-label={`Toggle ${r.action}`}
                  onClick={() => update(r.id, { enabled: !r.enabled })}
                  className={cn("relative mb-1.5 h-[18px] w-8 shrink-0 rounded-full transition-colors", r.enabled ? "bg-[#e9cf98]" : "bg-white/15")}
                >
                  <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-white transition-transform", r.enabled ? "translate-x-[16px]" : "translate-x-0.5")} />
                </button>
                <button type="button" onClick={() => e.setRules(e.rules.filter((x) => x.id !== r.id))} aria-label="Delete trigger" className="mb-1 ml-1.5 px-1 text-white/35 hover:text-[#ff9d90]">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <label className="block md:col-span-4">
                <span className="mb-1 block text-[11px] text-white/40">Auto-reply</span>
                <textarea className={cn(input, "resize-y")} rows={2} value={r.reply} onChange={(ev) => update(r.id, { reply: ev.target.value })} placeholder="What gets sent when this fires…" />
              </label>
            </li>
          ))}
        </ul>
        {!e.rules.length && <Empty>No triggers. Add one to start auto-replying on keywords.</Empty>}
      </Surface>

      <Surface>
        <SurfaceHeader title="Test a message" meta="see which triggers fire" />
        <div className="space-y-2.5 p-4">
          <select className={input} value={testChannel} onChange={(ev) => setTestChannel(ev.target.value as Platform)}>
            {PLATFORM_KEYS.map((k) => (
              <option key={k} value={k} className="bg-[#16141b]">
                {PLATFORMS[k].label}
              </option>
            ))}
          </select>
          <textarea className={cn(input, "resize-y")} rows={4} value={test} onChange={(ev) => setTest(ev.target.value)} />
          {fired.length ? (
            <ul className="space-y-2">
              {fired.map((r) => (
                <li key={r.id} className="rounded-md border border-[#e9cf98]/25 bg-[#e9cf98]/[0.06] p-2.5 text-[12.5px]">
                  <span className="font-medium text-[#f0d9a8]">{r.action}</span>
                  {r.reply && <p className="mt-1 text-white/75">{r.reply.replaceAll("{{booking_link}}", "cal.com/your-team/priority")}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-white/45">No enabled trigger matches this message on {PLATFORMS[testChannel].label}.</p>
          )}
        </div>
      </Surface>
    </div>
  );
}

function AutoResponderForm() {
  const { e } = usePulse();
  const a = e.autoResponder;
  const set = (patch: Partial<AutoResponder>) => e.setAutoResponder({ ...a, ...patch });
  const Row = ({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) => (
    <li className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_300px] md:items-center">
      <span>
        <span className="block text-[13px] text-white/90">{label}</span>
        <span className="block text-[11.5px] text-white/45">{hint}</span>
      </span>
      {children}
    </li>
  );
  const choice = <T extends string>(value: T, options: [T, string][], on: (v: T) => void) => (
    <Segmented value={value} onChange={on} options={options.map(([id, label]) => ({ id, label }))} />
  );
  return (
    <Surface className="max-w-4xl">
      <SurfaceHeader
        title="Auto-responder"
        meta="what happens when nobody is watching"
        right={
          <Button size="sm" variant="ghost" onClick={() => e.setAutoResponder(DEFAULT_AUTORESPONDER)}>
            Reset
          </Button>
        }
      />
      <ul className="divide-y divide-white/[0.06]">
        <Row label="VIP (score 85+)" hint="Hot buyers with budget and a timeline">
          {choice(a.vip, [["book", "Send booking link"], ["draft", "Draft for review"]], (vip) => set({ vip }))}
        </Row>
        <Row label="Qualified (60–84)" hint="Interested, needs a conversation">
          {choice(a.qualified, [["send", "Auto-send reply"], ["draft", "Draft for review"]], (qualified) => set({ qualified }))}
        </Row>
        <Row label="Nurture (under 60, students ≤ 45)" hint="Early or low intent">
          {choice(a.nurture, [["playbook", "Send playbook"], ["ignore", "No reply"]], (nurture) => set({ nurture }))}
        </Row>
        <Row label="Competitors (capped at 30)" hint="Recon traffic">
          <label className="flex items-center gap-2 text-[12.5px] text-white/75">
            <input type="checkbox" checked={a.quarantine} onChange={(ev) => set({ quarantine: ev.target.checked })} className="accent-[#e9cf98]" /> Quarantine silently and log to intel
          </label>
        </Row>
        <Row label="Rate limit" hint="Maximum automatic sends per hour, across channels">
          <input type="number" min={1} max={2000} className={input} value={a.maxPerHour} onChange={(ev) => set({ maxPerHour: Math.max(1, Number(ev.target.value) || 1) })} />
        </Row>
        <Row label="Active hours" hint="Outside these, everything waits as a draft">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12px] text-white/70">
              <input type="checkbox" checked={a.hours.always} onChange={(ev) => set({ hours: { ...a.hours, always: ev.target.checked } })} className="accent-[#e9cf98]" /> 24/7
            </label>
            <input type="time" disabled={a.hours.always} className={input} value={a.hours.start} onChange={(ev) => set({ hours: { ...a.hours, start: ev.target.value } })} />
            <input type="time" disabled={a.hours.always} className={input} value={a.hours.end} onChange={(ev) => set({ hours: { ...a.hours, end: ev.target.value } })} />
          </div>
        </Row>
      </ul>
      <p className="border-t border-white/[0.06] px-4 py-2.5 text-[11.5px] text-white/35">These settings shape the drafts and dispatches IntentPulse prepares. No social account is connected, so nothing is posted automatically.</p>
    </Surface>
  );
}

/** Channel funnels, engagement attribution, and every closed deal. */
export function AnalyticsPage() {
  const { e, now } = usePulse();
  const { hub } = e;
  const revenue = PLATFORM_KEYS.reduce((a, k) => a + hub.sales[k].revenue, 0);
  const actions = useMemo(() => {
    const out = Object.fromEntries(PLATFORM_KEYS.map((k) => [k, { posts: 0, dms: 0 }])) as Record<Platform, { posts: number; dms: number }>;
    for (const st of Object.values(e.staged)) out[st.signal.platform].posts += 1;
    for (const id of Object.keys(e.outcomes)) {
      const sig = hub.ledger.find((s) => s.id === id) ?? Object.values(hub.feeds).flat().find((s) => s.id === id);
      if (sig) out[sig.platform].dms += 1;
    }
    return out;
  }, [e.staged, e.outcomes, hub.ledger, hub.feeds]);

  return (
    <div className="space-y-4">
      <Surface>
        <SurfaceHeader title="Channel funnels" meta="signals → engaged → conversations → deals · simulated attribution" />
        <div className="grid gap-px bg-white/[0.05] md:grid-cols-2 xl:grid-cols-5">
          {PLATFORM_KEYS.map((k) => {
            const Icon = PLATFORM_ICON[k];
            const s = hub.sales[k];
            const steps = [
              ["Signals", hub.perPlatform[k]],
              ["Engaged", s.engaged],
              ["Conversations", s.conversations],
              ["Deals", s.deals],
            ] as const;
            return (
              <div key={k} className="bg-[#121116] p-4">
                <p className="flex items-center gap-2 text-[13px] font-medium text-white">
                  <Icon className="size-4" style={{ color: PLATFORMS[k].color }} /> {PLATFORMS[k].label}
                </p>
                <ol className="mt-3 space-y-2">
                  {steps.map(([label, n], i) => (
                    <li key={label}>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-white/60">{label}</span>
                        <span className="tabular-nums text-white/85">
                          {compact(n)}
                          {i > 0 && <span className="ml-1.5 text-white/35">{pct(n, steps[i - 1][1])}</span>}
                        </span>
                      </div>
                      <Bar value={hub.perPlatform[k] ? Math.max(i ? 2 : 0, Math.sqrt(n / hub.perPlatform[k]) * 100) : 0} className="mt-1" color={PLATFORMS[k].color} />
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-[12px] text-white/50">
                  Revenue <span className="font-medium tabular-nums text-white">{money(s.revenue)}</span>
                </p>
              </div>
            );
          })}
        </div>
      </Surface>

      <div className="grid gap-4 xl:grid-cols-2">
        <Surface>
          <SurfaceHeader title="Engagement attribution" meta="what you sent, and what it earned" />
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/[0.07] text-[11px] text-white/40">
                <th className="px-4 py-2 font-normal">Channel</th>
                <th className="px-2 py-2 text-right font-normal">Replies & posts</th>
                <th className="px-2 py-2 text-right font-normal">DMs & bookings</th>
                <th className="px-2 py-2 text-right font-normal">Revenue share</th>
                <th className="px-4 py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {PLATFORM_KEYS.map((k) => (
                <tr key={k} className="border-b border-white/[0.05] last:border-0">
                  <td className="px-4 py-2.5 text-white/85">{PLATFORMS[k].label}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-white/65">{actions[k].posts}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-white/65">{actions[k].dms}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-white">{pct(hub.sales[k].revenue, revenue)}</td>
                  <td className="w-28 px-4 py-2.5">
                    <Bar value={revenue ? (hub.sales[k].revenue / revenue) * 100 : 0} color={PLATFORMS[k].color} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-white/[0.06] px-4 py-2 text-[11px] text-white/35">Replies and posts are what you staged in Radar and Inbox; DMs and bookings went through the dispatch API.</p>
        </Surface>

        <Surface>
          <SurfaceHeader title="Closed deals" meta={`${hub.closes.length} this session · ${money(revenue)}`} />
          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-[12.5px]">
              <tbody>
                {hub.closes.map((c) => {
                  const Icon = PLATFORM_ICON[c.platform];
                  return (
                    <tr key={c.id} className="border-b border-white/[0.05]">
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-2 text-white/85">
                          <Icon className="size-3.5" style={{ color: PLATFORMS[c.platform].color }} /> {c.name}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-white/45">{c.handle}</td>
                      <td className="px-2 py-2 text-right tabular-nums font-medium text-white">{money(c.amount)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-white/40">{clock(new Date(c.t)).slice(0, 5)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!hub.closes.length && <Empty>No deals closed yet this session.</Empty>}
          </div>
        </Surface>
      </div>

      <Surface>
        <SurfaceHeader title="Sales & conversion by channel" meta="simulated attribution" />
        <div className="overflow-x-auto">
          <ChannelSalesTable sales={hub.sales} perPlatform={hub.perPlatform} />
        </div>
      </Surface>

      <Surface>
        <SurfaceHeader title="Activity" meta={now ? `as of ${clock(new Date(now)).slice(0, 5)}` : undefined} />
        <ActivityList entries={hub.log.slice(0, 60)} className="max-h-[360px] overflow-y-auto" />
      </Surface>
    </div>
  );
}
