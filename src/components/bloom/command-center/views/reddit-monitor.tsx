"use client";

import { useMemo, useState } from "react";
import { ArrowBigUp, MessageSquare, MessageSquareText, ScanSearch, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { channelDraft } from "@/lib/intentpulse/channel-drafts";
import { SUBREDDITS } from "@/lib/intentpulse/data-simulator";
import { routeOf, type PulseSignal } from "@/lib/intentpulse/signal";
import { Button, Empty, money, pct, StatStrip, Surface, SurfaceHeader, TierBadge } from "../kit";
import { ago, compact, fmt } from "../platform";
import type { Staged } from "../use-pulse-engine";
import type { ViewProps } from "./overview";

/** Splits a post into a title (first sentence) and body, the way a Reddit post reads. */
function titleBody(text: string) {
  const m = /^(.{12,140}?[.?!])\s+([\s\S]+)$/.exec(text);
  return m ? { title: m[1], body: m[2] } : { title: text, body: "" };
}

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Simulated attribution for a posted comment: profile clicks accrue over time, a share become DMs. */
function attribution(st: Staged, now: number) {
  const age = Math.max(0, (now - st.at) / 1000);
  const rate = 0.08 + (hash(st.signal.id) % 7) / 40;
  const clicks = Math.floor(age * rate);
  return { clicks, dms: Math.floor(clicks * (0.12 + (hash(st.signal.id) % 5) / 50)) };
}

export function RedditMonitor({ e, now, onOpen }: ViewProps) {
  const { hub, watchedSubs, setWatchedSubs } = e;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const posts = useMemo(
    () => hub.feeds.reddit.filter((s) => s.origin === "apify" || !s.context?.subreddit || watchedSubs.includes(s.context.subreddit)),
    [hub.feeds.reddit, watchedSubs],
  );
  const posted = Object.values(e.staged).filter((st) => st.signal.platform === "reddit").sort((a, b) => b.at - a.at);
  const sales = hub.sales.reddit;
  const totals = posted.reduce((a, st) => {
    const at = attribution(st, e.now);
    return { clicks: a.clicks + at.clicks, dms: a.dms + at.dms };
  }, { clicks: 0, dms: 0 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] text-white/45">Watching</span>
        {SUBREDDITS.map((sub) => {
          const on = watchedSubs.includes(sub);
          return (
            <button
              key={sub}
              type="button"
              aria-pressed={on}
              onClick={() => setWatchedSubs((ws) => (on ? ws.filter((x) => x !== sub) : [...ws, sub]))}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors",
                on ? "border-[#ff8f6b]/35 bg-[#ff8f6b]/10 text-white" : "border-white/10 text-white/40 hover:text-white/75",
              )}
            >
              r/{sub}
              <span className="tabular-nums text-white/40">{compact(hub.subreddits[sub] ?? 0)}</span>
              {on && <X className="size-3 text-white/40" />}
            </button>
          );
        })}
      </div>

      <StatStrip
        items={[
          { label: "Threads intercepted", value: compact(hub.perPlatform.reddit), sub: `${watchedSubs.length} subreddits watched` },
          { label: "Comments posted", value: fmt(posted.length), sub: "value comments, no links" },
          { label: "Profile clicks", value: fmt(totals.clicks), sub: `${fmt(totals.dms)} DMs opened` },
          { label: "Deals closed", value: fmt(sales.deals), sub: `${pct(sales.deals, sales.engaged)} of engaged` },
          { label: "Revenue", value: money(sales.revenue), sub: "simulated attribution" },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Surface className="flex flex-col" onPointerEnter={() => (e.hovering.current = true)} onPointerLeave={() => (e.hovering.current = false)}>
          <SurfaceHeader title="Live posts" meta={`newest first · pauses while hovered`} />
          <ol className="h-[640px] divide-y divide-white/[0.06] overflow-y-auto">
            {posts.map((s) => (
              <Post
                key={s.id}
                s={s}
                now={now}
                e={e}
                expanded={expanded === s.id}
                draft={drafts[s.id] ?? channelDraft(s).text}
                onDraft={(t) => setDrafts((d) => ({ ...d, [s.id]: t }))}
                onToggle={() => setExpanded((x) => (x === s.id ? null : s.id))}
                onOpen={onOpen}
              />
            ))}
          </ol>
          {posts.length === 0 && <Empty>Waiting for posts in the watched subreddits…</Empty>}
        </Surface>

        <Surface className="flex flex-col">
          <SurfaceHeader title="Link attribution" meta="from your posted comments" />
          {posted.length ? (
            <div className="max-h-[640px] overflow-y-auto">
              <table className="w-full table-fixed text-left text-[12.5px]">
                <colgroup>
                  <col />
                  <col className="w-[64px]" />
                  <col className="w-[48px]" />
                  <col className="w-[76px]" />
                </colgroup>
                <thead className="sticky top-0 bg-[#141318]">
                  <tr className="border-b border-white/[0.07] text-[11px] text-white/40">
                    <th className="py-2 pl-4 pr-2 font-normal">Thread</th>
                    <th className="px-2 py-2 text-right font-normal">Clicks</th>
                    <th className="px-2 py-2 text-right font-normal">DMs</th>
                    <th className="py-2 pl-2 pr-4 text-right font-normal">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {posted.map((st) => {
                    const at = attribution(st, e.now);
                    const close = hub.closes.find((c) => c.id === `c-${st.signal.id}`);
                    return (
                      <tr key={st.signal.id} className="border-b border-white/[0.05]">
                        <td className="py-2 pl-4 pr-2">
                          <p className="truncate text-white/85">{titleBody(st.signal.text).title}</p>
                          <p className="truncate text-[11px] text-white/40">
                            r/{st.signal.context?.subreddit ?? "reddit"} · {ago(new Date(st.at).toISOString(), now || undefined)}
                          </p>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-white/70">{fmt(at.clicks)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-white/70">{fmt(at.dms)}</td>
                        <td className="py-2 pl-2 pr-4 text-right tabular-nums text-white">{close ? money(close.amount) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Post a value comment on a thread to start tracking clicks, DMs and revenue from it.</Empty>
          )}
          <p className="mt-auto border-t border-white/[0.07] px-4 py-2.5 text-[11px] text-white/35">Simulated attribution: no Reddit account is connected, comments are staged.</p>
        </Surface>
      </div>
    </div>
  );
}

function Post({ s, now, e, expanded, draft, onDraft, onToggle, onOpen }: {
  s: PulseSignal;
  now: number;
  e: ViewProps["e"];
  expanded: boolean;
  draft: string;
  onDraft: (t: string) => void;
  onToggle: () => void;
  onOpen: (s: PulseSignal) => void;
}) {
  const { title, body } = titleBody(s.text);
  const posted = e.staged[s.id];
  const blocked = routeOf(s) === "quarantine";
  return (
    <li className="px-4 py-3.5">
      <p className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-white/45">
        <span className="font-medium text-white/80">r/{s.context?.subreddit ?? "reddit"}</span>·<span>{s.author.handle}</span>·<span>{ago(s.postedAt, now || undefined)}</span>
        {s.origin === "apify" && <span className="rounded bg-[#7cc4ff]/12 px-1 text-[#9fd3ff]">live</span>}
        <span className="ml-auto">
          <TierBadge s={s} outcome={e.outcomes[s.id]} />
        </span>
      </p>
      <h3 className="mt-1.5 text-[14px] font-semibold leading-snug text-white/95">{title}</h3>
      {body && <p className="mt-1 text-[13px] leading-relaxed text-white/60">{body}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-white/45">
        <span className="inline-flex items-center gap-1 tabular-nums">
          <ArrowBigUp className="size-4" /> {fmt(s.engagement?.likes ?? 0)}
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <MessageSquare className="size-3.5" /> {fmt(s.engagement?.replies ?? 0)}
        </span>
        <span className="ml-auto flex gap-1">
          {!blocked && !posted && (
            <Button size="sm" variant={expanded ? "secondary" : "ghost"} onClick={onToggle}>
              <MessageSquareText className="size-3.5" /> {expanded ? "Hide draft" : "Draft comment"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onOpen(s)}>
            <ScanSearch className="size-3.5" /> Inspect
          </Button>
        </span>
      </div>

      {posted && (
        <div className="ml-2 mt-3 border-l-2 border-white/10 pl-3">
          <p className="text-[11.5px] text-white/45">
            <span className="font-medium text-[#f0d9a8]">u/yourbrand</span> · {ago(new Date(posted.at).toISOString(), now || undefined)} · staged
          </p>
          <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-white/75">{posted.text}</p>
        </div>
      )}
      {expanded && !posted && (
        <div className="ml-2 mt-3 border-l-2 border-[#e9cf98]/40 pl-3">
          <p className="text-[11.5px] text-white/45">
            Reply as <span className="font-medium text-[#f0d9a8]">u/yourbrand</span> · value comment, no link
          </p>
          <textarea
            value={draft}
            onChange={(ev) => onDraft(ev.target.value)}
            rows={6}
            className="mt-1.5 w-full resize-y rounded-md border border-white/[0.08] bg-black/25 px-3 py-2 text-[12.5px] leading-relaxed text-white focus:border-white/20 focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={onToggle}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!draft.trim()}
              onClick={() => {
                e.stage(s, "Value comment posted", draft);
                onToggle();
              }}
            >
              Post comment
            </Button>
          </div>
        </div>
      )}
      {blocked && <p className="mt-2 text-[12px] text-[#ff9d90]">Competitor recon: no reply, logged to the intel feed.</p>}
    </li>
  );
}
