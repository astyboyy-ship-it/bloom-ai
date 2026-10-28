"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock, Loader2, LogIn, LogOut, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ShiftRule } from "@/lib/studio/shift";
import { Button } from "../../command-center/kit";
import { Field, inputCls, PageBar, Panes, PaneSection } from "../frame";
import { BASE, useInfra } from "./store";

const DAY_START = 7 * 60;
const DAY_END = 21 * 60;
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Operator console: clock in and off, the live overnight run, shift rules, and today's focus. */
export function ShiftPage() {
  const s = useInfra();
  const [draftRule, setDraftRule] = useState("");
  const [block, setBlock] = useState({ start: "13:00", end: "14:00", label: "" });

  const toggleRule = (list: ShiftRule[], set: (r: ShiftRule[]) => void, id: string, kind: string) => {
    const r = list.find((x) => x.id === id)!;
    set(list.map((x) => (x.id === id ? { ...x, on: !x.on } : x)));
    s.record(`${kind} rule ${r.on ? "off" : "on"}`, r.text);
  };
  const blocks = [...s.focus].sort((a, b) => toMin(a.start) - toMin(b.start));
  const queued = s.queue();

  return (
    <>
      <PageBar
        icon={Clock}
        accent="#c9d6e6"
        title="Shift console"
        meta={
          <span className="inline-flex items-center gap-2">
            <span className={cn("size-2 rounded-full", s.shift === "in" ? "bg-[#7ee0a1]" : s.shift === "running" ? "animate-pulse bg-[#c9d6e6]" : "bg-[#e9cf98]")} />
            {s.shift === "in" ? "Clocked in" : s.shift === "running" ? "Off shift · overnight run in progress" : "Off shift · run complete"}
          </span>
        }
      />
      <Panes
        leftWidth={300}
        rightWidth={380}
        left={
          <>
            <PaneSection title="When I'm clocked in, I handle">
              <Rules rules={s.human} onToggle={(id) => toggleRule(s.human, s.setHuman, id, "Human")} />
            </PaneSection>
            <PaneSection title="Autonomous while I'm off">
              <Rules rules={s.auto} onToggle={(id) => toggleRule(s.auto, s.setAuto, id, "Autonomous")} />
              <form
                className="mt-2 flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draftRule.trim()) return;
                  s.setAuto([...s.auto, { id: `c${Date.now()}`, text: draftRule.trim(), on: true }]);
                  s.record("Rule added", draftRule.trim());
                  setDraftRule("");
                }}
              >
                <input className={inputCls} value={draftRule} onChange={(e) => setDraftRule(e.target.value)} placeholder="Add a rule…" />
                <Button size="sm" type="submit" aria-label="Add rule">
                  <Plus className="size-3.5" />
                </Button>
              </form>
            </PaneSection>
          </>
        }
        right={
          <>
            <PaneSection title="Tonight">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Clock off">
                  <input type="time" className={inputCls} value={s.window.start} disabled={s.shift === "running"} onChange={(e) => s.setWindow({ ...s.window, start: e.target.value })} />
                </Field>
                <Field label="Back by">
                  <input type="time" className={inputCls} value={s.window.end} disabled={s.shift === "running"} onChange={(e) => s.setWindow({ ...s.window, end: e.target.value })} />
                </Field>
              </div>
              <div className="mt-2.5 inline-flex rounded-md border border-white/[0.08] bg-black/20 p-0.5">
                {(["apply", "dry"] as const).map((m) => (
                  <button key={m} type="button" disabled={s.shift === "running"} onClick={() => s.setMode(m)} className={cn("h-7 rounded px-3 text-[12px]", s.mode === m ? "bg-white/[0.1] text-white" : "text-white/50")}>
                    {m === "apply" ? "Apply changes" : "Dry run"}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-[12px] text-white/55">
                {queued.length} jobs queued ·{" "}
                <Link href={`${BASE}/jobs`} className="text-[#c9d6e6] hover:underline">
                  edit schedules
                </Link>
              </p>
            </PaneSection>
            <div className="p-4">
              {s.shift === "in" ? (
                <Button
                  variant="primary"
                  className="h-14 w-full text-[15px]"
                  onClick={() => {
                    if (!s.clockOff()) toast.error("Enable at least one job first.");
                  }}
                >
                  <LogOut className="size-5" /> Clock off
                </Button>
              ) : (
                <div className="rounded-lg border border-white/[0.08] bg-black/30">
                  <p className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2 text-[12.5px] text-white">
                    {s.shift === "running" ? <Loader2 className="size-4 animate-spin text-[#c9d6e6]" /> : <Check className="size-4 text-[#9fd3a8]" />}
                    {s.shift === "running" ? "Working the night shift…" : "Overnight run complete"}
                  </p>
                  <ol className="max-h-80 space-y-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
                    {s.live.map((l, i) => (
                      <li key={i} className="animate-row-in flex gap-2">
                        <span className="shrink-0 text-white/35">{l.time}</span>
                        <span className="text-white/80">{l.text}</span>
                      </li>
                    ))}
                  </ol>
                  {s.shift === "done" && (
                    <div className="border-t border-white/[0.07] p-3">
                      <Button variant="primary" className="w-full" onClick={s.clockIn}>
                        <LogIn className="size-4" /> Clock in
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-white/35">The run keeps going while you use other pages. It&apos;s simulated (no infrastructure is connected), except the routing savings, which come from the Optimizer.</p>
            </div>
          </>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#0b0a0e]/60 p-4">
          <section className="mx-auto max-w-3xl rounded-lg border border-white/[0.08] bg-[#121116]/90 p-4">
            <h2 className="text-[13px] font-semibold text-white">Today&apos;s focus map</h2>
            <p className="mt-0.5 text-[12px] text-white/45">The blocks you spend on human-only work. Everything outside them runs on your autonomous rules.</p>
            <div className="relative mt-4 h-14 rounded-md border border-white/[0.07] bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.03)_0,rgb(255_255_255/0.03)_1px,transparent_1px,transparent_calc(100%/14))]">
              {blocks.map((b) => {
                const l = ((toMin(b.start) - DAY_START) / (DAY_END - DAY_START)) * 100;
                const w = ((toMin(b.end) - toMin(b.start)) / (DAY_END - DAY_START)) * 100;
                return (
                  <span key={b.id} className="absolute top-1.5 bottom-1.5 overflow-hidden rounded bg-[#c9d6e6]/25 px-1.5 text-[10.5px] leading-[2.6rem] text-white/90" style={{ left: `${Math.max(0, l)}%`, width: `${Math.max(1, w)}%` }} title={`${b.start}–${b.end} ${b.label}`}>
                    {b.label}
                  </span>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10.5px] tabular-nums text-white/35">
              {["07", "09", "11", "13", "15", "17", "19", "21"].map((h) => (
                <span key={h}>{h}:00</span>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-white/55">
              {blocks.reduce((a, b) => a + Math.max(0, toMin(b.end) - toMin(b.start)), 0) / 60} h of human focus · {((DAY_END - DAY_START) / 60 - blocks.reduce((a, b) => a + Math.max(0, toMin(b.end) - toMin(b.start)), 0) / 60).toFixed(1)} h handled by rules
            </p>

            <ul className="mt-4 divide-y divide-white/[0.06]">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center gap-2 py-2">
                  <input type="time" className={cn(inputCls, "w-28")} value={b.start} onChange={(e) => s.setFocus(s.focus.map((x) => (x.id === b.id ? { ...x, start: e.target.value } : x)))} />
                  <span className="text-white/35">–</span>
                  <input type="time" className={cn(inputCls, "w-28")} value={b.end} onChange={(e) => s.setFocus(s.focus.map((x) => (x.id === b.id ? { ...x, end: e.target.value } : x)))} />
                  <input className={inputCls} value={b.label} onChange={(e) => s.setFocus(s.focus.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x)))} />
                  <button type="button" onClick={() => s.setFocus(s.focus.filter((x) => x.id !== b.id))} aria-label="Remove block" className="px-1 text-white/35 hover:text-[#ff9d90]">
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!block.label.trim() || toMin(block.end) <= toMin(block.start)) return toast.error("Give the block a name and an end after its start.");
                s.setFocus([...s.focus, { id: `f${Date.now()}`, ...block, label: block.label.trim() }]);
                setBlock({ start: block.end, end: block.end, label: "" });
              }}
            >
              <input type="time" className={cn(inputCls, "w-28")} value={block.start} onChange={(e) => setBlock({ ...block, start: e.target.value })} />
              <span className="text-white/35">–</span>
              <input type="time" className={cn(inputCls, "w-28")} value={block.end} onChange={(e) => setBlock({ ...block, end: e.target.value })} />
              <input className={inputCls} value={block.label} onChange={(e) => setBlock({ ...block, label: e.target.value })} placeholder="What needs you in this block?" />
              <Button size="sm" type="submit">
                <Plus className="size-3.5" /> Add
              </Button>
            </form>
          </section>
        </div>
      </Panes>
    </>
  );
}

function Rules({ rules, onToggle }: { rules: ShiftRule[]; onToggle: (id: string) => void }) {
  return (
    <ul className="space-y-0.5">
      {rules.map((r) => (
        <li key={r.id}>
          <label className="flex items-start gap-2 rounded px-1 py-1 text-[12.5px] hover:bg-white/[0.03]">
            <input type="checkbox" checked={r.on} onChange={() => onToggle(r.id)} className="mt-0.5 accent-[#c9d6e6]" />
            <span className={r.on ? "text-white/80" : "text-white/40"}>{r.text}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
