"use client";

import { memo, useMemo, useState } from "react";
import { AtSign, CalendarCheck, Film, Heart, MessageCircle, Quote, Repeat2, ScanSearch, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { channelDraft } from "@/lib/intentpulse/channel-drafts";
import type { DispatchResult } from "@/lib/intentpulse/outreach";
import { PLATFORMS, routeOf, type PulseSignal } from "@/lib/intentpulse/signal";
import { Avatar, Button, Empty, money, Name, pct, StatStrip, Surface, SurfaceHeader, TierBadge } from "../kit";
import { ago, compact, fmt } from "../platform";
import type { Staged } from "../use-pulse-engine";
import { Segmented, useRolling, type ViewProps } from "./overview";

type Composer = { id: string; kind: "reply" | "quote" };
type Filter = "all" | "mentions" | "hot";

const COPY = {
  instagram: { title: "Comments, DMs & Reel replies", reply: "Reply", quote: "Reply in DM", posted: { reply: "Comment reply posted", quote: "DM reply queued" } },
  x: { title: "Mentions & buying posts", reply: "Reply", quote: "Quote", posted: { reply: "Reply posted", quote: "Quote posted" } },
  tiktok: { title: "Comments on your videos", reply: "Reply", quote: "Reply with video", posted: { reply: "Creator reply posted", quote: "Video reply queued" } },
} as const;

export function Stream({ e, now, selectedId, onOpen, platform }: ViewProps & { platform: "x" | "tiktok" | "instagram" }) {
  const { hub } = e;
  const copy = COPY[platform];
  const [filter, setFilter] = useState<Filter>("all");
  const [composer, setComposer] = useState<Composer | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const rolling = useRolling(e);
  const rows = useMemo(
    () => hub.feeds[platform].filter((s) => (filter === "mentions" ? s.context?.mention : filter === "hot" ? s.result.score >= 60 && routeOf(s) !== "quarantine" : true)),
    [hub.feeds, platform, filter],
  );
  const queued = Object.values(e.staged).filter((st) => st.signal.platform === platform).sort((a, b) => b.at - a.at);
  const sales = hub.sales[platform];
  const label = PLATFORMS[platform].label;

  return (
    <div className="space-y-4">
      <StatStrip
        items={[
          { label: `${label} signals / min`, value: fmt(rolling[platform][0]), sub: `${fmt(rolling[platform][1])} urgent` },
          platform === "x" ? { label: "Brand mentions", value: compact(hub.kinds["x:mention"] ?? 0), sub: "this session" } : { label: platform === "instagram" ? "DMs & comments" : "Comments intercepted", value: compact(hub.perPlatform[platform]), sub: "this session" },
          { label: "Replies & DMs sent", value: fmt(sales.engaged), sub: `${fmt(sales.conversations)} conversations` },
          { label: "Deals closed", value: fmt(sales.deals), sub: `${pct(sales.deals, sales.engaged)} of engaged` },
          { label: "Revenue", value: money(sales.revenue), sub: "simulated attribution" },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Surface className="flex flex-col" onPointerEnter={() => (e.hovering.current = true)} onPointerLeave={() => (e.hovering.current = false)}>
          <SurfaceHeader
            title={copy.title}
            meta={`${fmt(rows.length)} · pauses while hovered`}
            right={
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: "All" },
                  ...(platform === "x" ? [{ id: "mentions" as const, label: "Mentions" }] : []),
                  { id: "hot", label: "High intent" },
                ]}
              />
            }
          />
          <ol className="h-[680px] divide-y divide-white/[0.06] overflow-y-auto">
            {rows.map((s) => (
              <Row
                key={s.id}
                s={s}
                now={now}
                active={selectedId === s.id}
                outcome={e.outcomes[s.id]}
                staged={e.staged[s.id]}
                composer={composer?.id === s.id ? composer.kind : null}
                draft={drafts[s.id]}
                copy={copy}
                busy={!!e.busy}
                onCompose={(kind) => setComposer((c) => (c?.id === s.id && c.kind === kind ? null : { id: s.id, kind }))}
                onDraft={(t) => setDrafts((d) => ({ ...d, [s.id]: t }))}
                onPost={(kind, text) => {
                  e.stage(s, copy.posted[kind], text);
                  setComposer(null);
                }}
                onDm={() => e.dispatch(s, routeOf(s) === "vip" ? "vip" : "outreach")}
                onOpen={onOpen}
              />
            ))}
          </ol>
          {rows.length === 0 && <Empty>Waiting for signals…</Empty>}
        </Surface>

        <Surface className="flex flex-col">
          <SurfaceHeader title="Queued actions" meta={`${queued.length} staged`} />
          <ol className="max-h-[680px] divide-y divide-white/[0.05] overflow-y-auto">
            {queued.map((st) => (
              <li key={st.signal.id} className="px-4 py-2.5 text-[12.5px]">
                <p className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-white/85">{st.label}</span>
                  <span className="shrink-0 text-[11px] text-white/35">{ago(new Date(st.at).toISOString(), now || undefined)}</span>
                </p>
                <p className="truncate text-[11.5px] text-white/40">to {st.signal.author.handle}</p>
                {st.text && <p className="mt-1 line-clamp-2 text-[12px] text-white/60">{st.text}</p>}
              </li>
            ))}
          </ol>
          {queued.length === 0 && <Empty>Replies and quotes you post appear here.</Empty>}
          <p className="mt-auto border-t border-white/[0.07] px-4 py-2.5 text-[11px] text-white/35">No {label} account connected: posts are staged; DMs go through the dispatch API.</p>
        </Surface>
      </div>
    </div>
  );
}

const Row = memo(function Row({ s, now, active, outcome, staged, composer, draft, copy, busy, onCompose, onDraft, onPost, onDm, onOpen }: {
  s: PulseSignal;
  now: number;
  active: boolean;
  outcome?: DispatchResult;
  staged?: Staged;
  composer: "reply" | "quote" | null;
  draft?: string;
  copy: (typeof COPY)[keyof typeof COPY];
  busy: boolean;
  onCompose: (kind: "reply" | "quote") => void;
  onDraft: (t: string) => void;
  onPost: (kind: "reply" | "quote", text: string) => void;
  onDm: () => void;
  onOpen: (s: PulseSignal) => void;
}) {
  const blocked = routeOf(s) === "quarantine";
  const vip = routeOf(s) === "vip";
  const text = draft ?? channelDraft(s).text;
  return (
    <li className={cn("flex gap-3 px-4 py-3", active && "bg-[#e9cf98]/[0.06]")}>
      <Avatar name={s.author.name} handle={s.author.handle} size={34} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[12.5px]">
          <Name s={s} />
          <span className="truncate text-white/40">
            {s.author.handle} · {ago(s.postedAt, now || undefined)}
          </span>
          <span className="ml-auto">
            <TierBadge s={s} outcome={outcome} />
          </span>
        </p>
        {(s.context?.mention || s.context?.video) && (
          <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-white/40">
            {s.context.mention ? <AtSign className="size-3" /> : <Film className="size-3" />}
            {s.context.mention ? "Mentioned you" : `On “${s.context.video}”`}
          </p>
        )}
        <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-white/80">{s.text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-white/40">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Heart className="size-3.5" /> {compact(s.engagement?.likes ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageCircle className="size-3.5" /> {fmt(s.engagement?.replies ?? 0)}
          </span>
          <span className="tabular-nums">{compact(s.author.followers)} followers</span>
          <span className="ml-auto flex flex-wrap gap-0.5">
            {!blocked && !staged && (
              <>
                <Button size="sm" variant={composer === "reply" ? "secondary" : "ghost"} onClick={() => onCompose("reply")}>
                  <MessageCircle className="size-3.5" /> {copy.reply}
                </Button>
                <Button size="sm" variant={composer === "quote" ? "secondary" : "ghost"} onClick={() => onCompose("quote")}>
                  {copy.quote === "Quote" ? <Quote className="size-3.5" /> : <Repeat2 className="size-3.5" />} {copy.quote}
                </Button>
              </>
            )}
            {!blocked && (
              <Button size="sm" variant="ghost" disabled={busy || !!outcome} onClick={onDm}>
                {vip ? <CalendarCheck className="size-3.5" /> : <Send className="size-3.5" />} {outcome ? (outcome.action === "vip" ? "Booking sent" : "DM sent") : vip ? "DM booking" : "DM"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onOpen(s)} aria-label="Inspect">
              <ScanSearch className="size-3.5" />
            </Button>
          </span>
        </div>
        {staged && (
          <p className="mt-2 rounded-md border border-white/[0.07] bg-black/20 px-3 py-2 text-[12px] text-white/65">
            <span className="text-[#f0d9a8]">{staged.label}</span> · {staged.text}
          </p>
        )}
        {composer && !staged && (
          <div className="mt-2.5 rounded-md border border-white/[0.1] bg-black/25 p-2.5">
            <textarea value={text} onChange={(ev) => onDraft(ev.target.value)} rows={3} className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-white focus:outline-none" />
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className={cn("text-[11px] tabular-nums", text.length > 280 ? "text-[#ff9d90]" : "text-white/35")}>{text.length}/280</span>
              <Button size="sm" variant="primary" disabled={!text.trim()} onClick={() => onPost(composer, text)}>
                {composer === "reply" ? "Post reply" : copy.quote === "Quote" ? "Post quote" : copy.quote === "Reply in DM" ? "Queue DM reply" : "Queue video reply"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
});
