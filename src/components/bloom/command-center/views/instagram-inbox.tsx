"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Check, ExternalLink, Film, ScanSearch, Search, Send, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { channelDraft } from "@/lib/intentpulse/channel-drafts";
import { routeOf, signalScore, type PulseSignal } from "@/lib/intentpulse/signal";
import { Avatar, Bar, Button, Empty, money, Name, pct, ScoreRing, Surface, TierBadge } from "../kit";
import { ago, compact, fmt } from "../platform";
import { Segmented, type ViewProps } from "./overview";

type Msg = { id: string; from: "lead" | "you"; text: string; at: number; note?: string };

// Simulated replies so a sent thread keeps moving; labelled as simulated in the UI.
const REPLIES = {
  hot: ["Perfect, Thursday 2pm works for us. Sending the invite to my CRO too.", "Booked! Can you send the security docs before the call?", "Great, looping in procurement now."],
  warm: ["Thanks! What does pricing look like for a team our size?", "Interesting. Do you have a case study for agencies?", "Can you do a quick call next week?"],
};

export function InstagramInbox({ e, now, onOpen }: ViewProps) {
  const { hub } = e;
  const [mode, setMode] = useState<"dm" | "reels">("dm");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [read, setRead] = useState<Set<string>>(() => new Set());
  const [threads, setThreads] = useState<Record<string, Msg[]>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pinned = useRef<PulseSignal | null>(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hub.feeds.instagram
      .filter((s) => (mode === "dm" ? s.kind === "dm" : s.kind !== "dm"))
      .filter((s) => !q || `${s.author.name} ${s.author.handle} ${s.text}`.toLowerCase().includes(q));
  }, [hub.feeds.instagram, mode, query]);

  // An opened thread stays pinned even after it scrolls out of the live feed; until then, open on the hottest one.
  const active = (activeId && pinned.current?.id === activeId ? pinned.current : null) ?? list.find((s) => routeOf(s) === "vip") ?? list[0];
  const open = (s: PulseSignal) => {
    pinned.current = s;
    setActiveId(s.id);
    setRead((r) => new Set(r).add(s.id));
  };
  const switchMode = (m: "dm" | "reels") => {
    setMode(m);
    setActiveId(null);
  };

  const send = async (s: PulseSignal, text: string, vip: boolean) => {
    const res = await e.dispatch(s, vip ? "vip" : "outreach");
    if (!res) return;
    setThreads((t) => ({ ...t, [s.id]: [...(t[s.id] ?? []), { id: res.dispatchId, from: "you", text, at: Date.now(), note: `${res.dispatchId} · logged` }] }));
    if (s.result.tier !== "NURTURE") {
      const pool = s.result.tier === "VIP" ? REPLIES.hot : REPLIES.warm;
      const reply = pool[Math.floor(Math.random() * pool.length)];
      timers.current.push(
        setTimeout(() => setThreads((t) => ({ ...t, [s.id]: [...(t[s.id] ?? []), { id: `r-${Date.now()}`, from: "lead", text: reply, at: Date.now(), note: "simulated reply" }] })), 3500 + Math.random() * 3000),
      );
    }
  };

  const sales = hub.sales.instagram;
  const unread = list.filter((s) => !read.has(s.id)).length;

  return (
    <Surface className="grid h-[calc(100dvh-148px)] min-h-[620px] overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_320px]">
      {/* Conversation list */}
      <aside className="flex min-h-0 flex-col border-white/[0.07] max-lg:max-h-[360px] max-lg:border-b lg:border-r" onPointerEnter={() => (e.hovering.current = true)} onPointerLeave={() => (e.hovering.current = false)}>
        <div className="space-y-2.5 border-b border-white/[0.07] p-3">
          <div className="flex items-center justify-between gap-2">
            <Segmented
              value={mode}
              onChange={switchMode}
              options={[
                { id: "dm", label: `Messages · ${fmt(hub.kinds["instagram:dm"] ?? 0)}` },
                { id: "reels", label: "Reel comments" },
              ]}
            />
            <span className="text-[11px] text-white/40">{unread} unread</span>
          </div>
          <label className="flex h-8 items-center gap-2 rounded-md border border-white/[0.08] bg-black/20 px-2.5 text-white/40 focus-within:border-white/20">
            <Search className="size-3.5" />
            <input value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Search people and messages" className="min-w-0 flex-1 bg-transparent text-[12.5px] text-white placeholder:text-white/30 focus:outline-none" />
          </label>
        </div>
        <ol className="min-h-0 flex-1 overflow-y-auto">
          {list.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => open(s)}
                className={cn("flex w-full gap-3 border-b border-white/[0.04] px-3 py-2.5 text-left transition-colors", active?.id === s.id ? "bg-white/[0.06]" : "hover:bg-white/[0.03]")}
              >
                <span className="relative">
                  <Avatar name={s.author.name} handle={s.author.handle} size={36} />
                  {!read.has(s.id) && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#121116] bg-[#7cc4ff]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-[12.5px]">
                    <Name s={s} className={!read.has(s.id) ? "font-semibold" : undefined} />
                    <span className="shrink-0 text-[11px] tabular-nums text-white/35">{ago(s.postedAt, now || undefined)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-white/50">{mode === "reels" && s.context?.reel ? `On “${s.context.reel}”: ` : ""}{s.text}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <TierBadge s={s} outcome={e.outcomes[s.id]} />
                    {threads[s.id]?.some((m) => m.from === "you") && <span className="text-[11px] text-white/40">Replied</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        {list.length === 0 && <Empty>{query ? "No matches." : "Waiting for messages…"}</Empty>}
      </aside>

      {/* Thread */}
      {active ? <Thread key={active.id} s={active} e={e} now={now} messages={threads[active.id] ?? []} onSend={send} onInspect={() => onOpen(active)} /> : <Empty>Select a conversation.</Empty>}

      {/* Lead & conversion */}
      <aside className="min-h-0 overflow-y-auto border-l border-white/[0.07] max-xl:hidden">
        {active && <LeadPanel s={active} e={e} messages={threads[active.id] ?? []} />}
        <section className="border-t border-white/[0.07] p-4">
          <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-white/40">Instagram performance</h3>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
            <div>
              <dt className="text-white/40">Revenue</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-white">{money(sales.revenue)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Deals</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-white">{fmt(sales.deals)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Conv.</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-white">{pct(sales.deals, sales.engaged)}</dd>
            </div>
          </dl>
        </section>
        <section className="border-t border-white/[0.07] p-4">
          <h3 className="flex items-center justify-between text-[11.5px] font-medium uppercase tracking-wide text-white/40">
            Automated DM triggers
            <Link href="/demo/intentpulse/rules" className="normal-case tracking-normal text-[#e9cf98] hover:underline">
              Edit rules
            </Link>
          </h3>
          <ul className="mt-2 divide-y divide-white/[0.05]">
            {e.rules
              .filter((t) => t.channel === "all" || t.channel === "instagram")
              .map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 text-[12px]">
                    <span className="block truncate text-white/85">{t.keywords.map((k) => `“${k}”`).join(" · ")}</span>
                    <span className="block truncate text-white/40">
                      {t.action} · {fmt(hub.triggers[t.id] ?? 0)} matched
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={t.enabled}
                    aria-label={`Toggle ${t.action}`}
                    onClick={() => e.setRules(e.rules.map((x) => (x.id === t.id ? { ...x, enabled: !x.enabled } : x)))}
                    className={cn("relative h-[18px] w-8 shrink-0 rounded-full transition-colors", t.enabled ? "bg-[#e9cf98]" : "bg-white/15")}
                  >
                    <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-white transition-transform", t.enabled ? "translate-x-[16px]" : "translate-x-0.5")} />
                  </button>
                </li>
              ))}
          </ul>
        </section>
      </aside>
    </Surface>
  );
}

function Thread({ s, e, now, messages, onSend, onInspect }: {
  s: PulseSignal;
  e: ViewProps["e"];
  now: number;
  messages: Msg[];
  onSend: (s: PulseSignal, text: string, vip: boolean) => Promise<void>;
  onInspect: () => void;
}) {
  const quarantined = routeOf(s) === "quarantine" || e.outcomes[s.id]?.action === "quarantine";
  const vip = routeOf(s) === "vip";
  const [text, setText] = useState(() => (quarantined ? "" : channelDraft(s).text));
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);
  const busy = e.busy?.id === s.id;

  return (
    <section className="flex min-h-0 flex-col">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={s.author.name} handle={s.author.handle} size={34} />
          <div className="min-w-0">
            <Name s={s} className="text-[13.5px]" />
            <p className="truncate text-[11.5px] text-white/40">
              {s.author.handle} · {compact(s.author.followers)} followers{s.author.title ? ` · ${s.author.title}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {s.url && s.origin !== "simulated" && (
            <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] text-white/55 hover:bg-white/[0.06] hover:text-white">
              <ExternalLink className="size-3.5" /> Profile
            </a>
          )}
          <Button size="sm" variant="ghost" onClick={onInspect}>
            <ScanSearch className="size-3.5" /> Inspect
          </Button>
          <Button size="sm" variant="danger" disabled={quarantined || !!e.busy} onClick={() => e.dispatch(s, "quarantine")}>
            <ShieldAlert className="size-3.5" /> Quarantine
          </Button>
        </div>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {s.context?.reel && (
          <div className="mx-auto flex w-fit items-center gap-2 rounded-md border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[11.5px] text-white/55">
            <Film className="size-3.5" /> Comment on your Reel “{s.context.reel}”
          </div>
        )}
        <p className="text-center text-[11px] text-white/30">{new Date(s.postedAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}</p>
        <Bubble from="lead" text={s.text} meta={ago(s.postedAt, now || undefined)} />
        {messages.map((m) => (
          <Bubble key={m.id} from={m.from} text={m.text} meta={m.note} />
        ))}
      </div>

      <footer className="border-t border-white/[0.07] p-3">
        {quarantined ? (
          <p className="rounded-md bg-[#ff7b6b]/[0.08] px-3 py-2.5 text-[12.5px] text-[#ff9d90]">Competitor recon: replies are suppressed and the thread is logged to the intel feed.</p>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2 text-[11.5px] text-white/40">
              <span className="rounded bg-[#e9cf98]/12 px-1.5 py-0.5 text-[#f0d9a8]">IntentPulse draft</span>
              {vip ? "VIP: booking link included" : s.result.tier === "QUALIFIED" ? "Qualified: scoping-call reply" : "Nurture: soft reply"}
            </div>
            <textarea
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-white/[0.08] bg-black/25 px-3 py-2 text-[13px] leading-relaxed text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
              placeholder="Write a message…"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-white/35">No Instagram account connected: messages are drafted and logged, not delivered.</p>
              <div className="flex gap-1.5">
                {vip && (
                  <Button size="sm" disabled={busy || !text.trim()} onClick={() => onSend(s, text, true)}>
                    <CalendarCheck className="size-3.5" /> Send booking link
                  </Button>
                )}
                <Button size="sm" variant="primary" disabled={busy || !text.trim()} onClick={() => onSend(s, text, false)}>
                  <Send className="size-3.5" /> Send
                </Button>
              </div>
            </div>
          </>
        )}
      </footer>
    </section>
  );
}

function Bubble({ from, text, meta }: { from: "lead" | "you"; text: string; meta?: string }) {
  return (
    <div className={cn("flex", from === "you" && "justify-end")}>
      <div className="max-w-[78%]">
        <p className={cn("whitespace-pre-line rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed", from === "lead" ? "rounded-bl-md bg-white/[0.08] text-white/90" : "rounded-br-md bg-[#e9cf98] text-[#17110a]")}>{text}</p>
        {meta && <p className={cn("mt-1 text-[10.5px] text-white/35", from === "you" && "text-right")}>{meta}</p>}
      </div>
    </div>
  );
}

const STAGES = ["Intercepted", "Engaged", "Conversation", "Booked", "Closed"] as const;

function LeadPanel({ s, e, messages }: { s: PulseSignal; e: ViewProps["e"]; messages: Msg[] }) {
  const outcome = e.outcomes[s.id];
  const closed = e.hub.closes.find((c) => c.id === `c-${s.id}`);
  const reached = [true, !!outcome || messages.some((m) => m.from === "you"), messages.some((m) => m.from === "lead"), outcome?.action === "vip", !!closed];
  return (
    <>
      <section className="flex items-center gap-3 p-4">
        <ScoreRing score={s.result.score} />
        <div className="min-w-0">
          <TierBadge s={s} outcome={outcome} withScore={false} />
          <p className="mt-1 truncate text-[12.5px] text-white/80">{s.result.action.title}</p>
          <p className="truncate text-[11.5px] text-white/40">SLA {s.result.action.sla}</p>
        </div>
      </section>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/[0.07] p-4 text-[12px]">
        {[
          ["Company", s.author.company || "—"],
          ["Title", s.author.title || "—"],
          ["Budget", s.budgetK === null ? "Undisclosed" : `$${fmt(s.budgetK)}k`],
          ["Persona", s.result.persona],
          ["Followers", compact(s.author.followers)],
          ["Source", s.origin === "apify" ? "Live · Apify" : "Simulated"],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-white/40">{k}</dt>
            <dd className="mt-0.5 truncate capitalize text-white/85">{v}</dd>
          </div>
        ))}
      </dl>
      <section className="space-y-2.5 border-t border-white/[0.07] p-4">
        {s.result.signals.map((x) => (
          <div key={x.key}>
            <div className="flex justify-between text-[12px]">
              <span className="text-white/60">{x.label}</span>
              <span className="tabular-nums text-white/85">{signalScore(s, x.key)}</span>
            </div>
            <Bar value={x.score} className="mt-1" color="#cdb27a" />
          </div>
        ))}
      </section>
      <section className="border-t border-white/[0.07] p-4">
        <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-white/40">Conversion</h3>
        <ol className="mt-2.5 space-y-2">
          {STAGES.map((st, i) => (
            <li key={st} className="flex items-center gap-2.5 text-[12.5px]">
              <span className={cn("flex size-4 items-center justify-center rounded-full border", reached[i] ? "border-[#e9cf98] bg-[#e9cf98] text-[#17110a]" : "border-white/20")}>{reached[i] && <Check className="size-2.5" strokeWidth={3} />}</span>
              <span className={reached[i] ? "text-white/90" : "text-white/40"}>{st}</span>
              {st === "Closed" && closed && <span className="ml-auto tabular-nums text-white">{money(closed.amount)}</span>}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
