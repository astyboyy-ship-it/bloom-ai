"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Download, History } from "lucide-react";
import { DEFAULT_STEPS, MODELS, stepCost, tokens, type Step } from "@/lib/studio/shift";
import { Button } from "../../command-center/kit";
import { download, PageBar, Panes, PaneSection } from "../frame";
import { total, usd, useInfra } from "./store";

const burn = (s: Step) => (tokens(s.system) + s.inputTokens + s.outputTokens) * s.callsPerDay;
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Shift history, token burn per workflow step against the original setup, and the full change trail. */
export function AuditPage() {
  const s = useInfra();
  const [open, setOpen] = useState<string | null>(s.runs[0]?.id ?? null);
  const burnNow = s.steps.reduce((a, x) => a + burn(x), 0);
  const burnBase = DEFAULT_STEPS.reduce((a, x) => a + burn(x), 0);

  return (
    <>
      <PageBar
        icon={History}
        accent="#c9d6e6"
        title="Audit"
        meta={`${s.runs.length} runs · ${s.trail.length} recorded changes`}
        actions={
          <Button size="sm" onClick={() => download("engine-02-audit.json", JSON.stringify({ runs: s.runs, trail: s.trail, steps: s.steps }, null, 2), "application/json")}>
            <Download className="size-3.5" /> Export audit
          </Button>
        }
      />
      <Panes
        rightWidth={380}
        right={
          <PaneSection title="Change trail">
            <ol className="space-y-2">
              {s.trail.map((t, i) => (
                <li key={i} className="text-[12px] leading-snug">
                  <span className="block tabular-nums text-[11px] text-white/35">{new Date(t.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                  <span className="text-white/85">{t.action}</span> <span className="text-white/45">· {t.detail}</span>
                </li>
              ))}
            </ol>
            {!s.trail.length && <p className="text-[12px] text-white/40">Every optimization, schedule change, rule toggle and clock-off is recorded here.</p>}
          </PaneSection>
        }
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#0b0a0e]/60 p-4">
          <section className="rounded-lg border border-white/[0.08] bg-[#121116]/90">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.07] px-4 py-2.5">
              <h2 className="text-[13px] font-semibold text-white">Token burn</h2>
              <span className="text-[12px] text-white/50">
                {compact.format(burnNow)} tokens/day now vs {compact.format(burnBase)} in the original setup · {usd(s.before)}/day vs {usd(total(DEFAULT_STEPS))}/day
              </span>
            </header>
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[11px] text-white/40">
                  <th className="px-4 py-2 font-normal">Step</th>
                  <th className="py-2 pr-3 font-normal">Model</th>
                  <th className="py-2 pr-3 text-right font-normal">Calls/day</th>
                  <th className="py-2 pr-3 text-right font-normal">Tokens/day</th>
                  <th className="py-2 pr-3 text-right font-normal">$/day</th>
                  <th className="py-2 pr-4 text-right font-normal">$/month</th>
                </tr>
              </thead>
              <tbody>
                {s.steps.map((x) => (
                  <tr key={x.id} className="border-t border-white/[0.05]">
                    <td className="px-4 py-2 text-white/85">{x.name}</td>
                    <td className="py-2 pr-3 text-white/60">
                      {MODELS[x.model].label}
                      {x.cache && " · cached"}
                      {x.batch && " · batch"}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-white/60">{x.callsPerDay.toLocaleString("en-US")}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-white/70">{compact.format(burn(x))}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-white">{usd(stepCost(x).perDay)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-white/70">{usd(stepCost(x).perDay * 30)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-white/[0.06] px-4 py-2 text-[11px] text-white/35">Tokens are estimated at ~4 characters per token; dollars use list prices with caching and batch discounts applied.</p>
          </section>

          <section className="rounded-lg border border-white/[0.08] bg-[#121116]/90">
            <header className="border-b border-white/[0.07] px-4 py-2.5">
              <h2 className="text-[13px] font-semibold text-white">Shift runs</h2>
            </header>
            <ul className="divide-y divide-white/[0.05]">
              {s.runs.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpen((o) => (o === r.id ? null : r.id))} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[12.5px] hover:bg-white/[0.02]">
                    {open === r.id ? <ChevronDown className="size-3.5 text-white/40" /> : <ChevronRight className="size-3.5 text-white/40" />}
                    <span className="w-40 shrink-0 text-white/85">{r.date}</span>
                    <span className="w-20 shrink-0 text-white/50">{r.mode === "dry" ? "Dry run" : "Applied"}</span>
                    <span className="min-w-0 flex-1 truncate text-white/60">{r.summary}</span>
                    <span className="shrink-0 text-[11px] text-[#9fd3a8]">0 failures</span>
                  </button>
                  {open === r.id && (
                    <ol className="space-y-1 bg-black/20 px-11 py-2.5 font-mono text-[11px] leading-relaxed">
                      {r.lines.map((l, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="shrink-0 text-white/35">{l.time}</span>
                          <span className="text-white/75">{l.text}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Panes>
    </>
  );
}
