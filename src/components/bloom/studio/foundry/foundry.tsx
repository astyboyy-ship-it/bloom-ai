"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, Hammer, Loader2, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../command-center/kit";
import { PageBar } from "../frame";
import { AGENTS, BASE, useFoundry } from "./store";
import { TargetPicker } from "./targets";

const SEV = { high: "text-[#ff9d90]", medium: "text-[#ffd59a]", low: "text-white/55" } as const;

/** The five-agent terminal: live crawl, bottleneck detection, and the build streaming into the sandbox. */
export function FoundryPage() {
  const f = useFoundry();
  const t = f.active;
  const b = f.buildOf(t.id);
  const running = f.running === t.id;
  const logRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [b.lines.length]);

  return (
    <>
      <PageBar
        icon={Hammer}
        accent="#3fd29a"
        title="Solution Foundry"
        meta={t.kind === "url" ? t.input : t.kind === "handle" ? "social handle" : "written bottleneck"}
        actions={
          <>
            <TargetPicker />
            <Button size="sm" variant="primary" disabled={!!f.running} onClick={() => f.run(t)}>
              {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} {b.builtAt ? "Rebuild" : "Run the swarm"}
            </Button>
          </>
        }
      />
      <div className="grid shrink-0 grid-cols-5 border-b border-white/[0.07] bg-[#0d0c10]/70">
        {AGENTS.map((a) => {
          const s = b.status[a.id];
          return (
            <div key={a.id} className="flex items-center gap-2.5 border-white/[0.05] px-4 py-3 [&:not(:last-child)]:border-r">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border",
                  s === "queued" && "border-white/15 text-white/30",
                  s === "working" && "border-[#3fd29a]/60 text-[#3fd29a]",
                  s === "done" && "border-[#3fd29a] bg-[#3fd29a] text-[#06140d]",
                  s === "failed" && "border-[#ff7b6b] text-[#ff9d90]",
                )}
              >
                {s === "working" ? <Loader2 className="size-3.5 animate-spin" /> : s === "done" ? <Check className="size-3.5" /> : s === "failed" ? <X className="size-3.5" /> : <span className="size-1 rounded-full bg-current" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium text-white/90">{a.label}</span>
                <span className="block truncate text-[11px] text-white/40 max-md:hidden">{a.role}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ol ref={logRef} className="min-h-0 space-y-1.5 overflow-y-auto border-white/[0.07] bg-[#08080a]/85 p-4 font-mono text-[12px] leading-relaxed max-lg:max-h-[50vh] lg:border-r">
          {b.lines.map((l, i) => (
            <li key={i} className="animate-row-in">
              <span className="text-[#3fd29a]/80">{l.agent.padEnd(9, " ")}</span>{" "}
              <span className={l.tone === "err" ? "text-[#ff9d90]" : l.tone === "warn" ? "text-[#ffd59a]" : l.tone === "ok" ? "text-[#9fd3a8]" : "text-white/75"}>{l.text}</span>
            </li>
          ))}
          {running && b.status.builder === "working" && <li className="text-white/45">builder   writing index.html… {Math.round(new Blob([b.code]).size / 1024)} KB</li>}
          {!b.lines.length && <li className="font-sans text-[13px] text-white/40">Run the swarm on {t.name}. It crawls the page, finds the bottlenecks, and builds the working fix.</li>}
        </ol>

        <div className="min-h-0 overflow-y-auto bg-[#0b0a0e]/60 p-4">
          <h2 className="text-[13px] font-semibold text-white">Bottlenecks · {b.findings.length}</h2>
          <ul className="mt-2.5 space-y-2.5">
            {b.findings.map((x) => (
              <li key={x.id} className="rounded-md border border-white/[0.07] bg-[#121116]/90 p-3">
                <p className="flex items-center gap-2 text-[12.5px]">
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", SEV[x.severity], "bg-white/[0.05]")}>{x.severity}</span>
                  <span className="font-medium text-white/90">{x.title}</span>
                </p>
                <p className="mt-1 text-[11.5px] text-white/50">{x.evidence}</p>
                <p className="mt-1 text-[12px] text-[#9fd3a8]">Fix → {x.fix}</p>
              </li>
            ))}
            {!b.findings.length && <li className="text-[12.5px] text-white/40">Findings appear as the Auditor works.</li>}
          </ul>
          {b.builtAt && !running && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`${BASE}/sandbox`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#e9cf98] text-[12.5px] font-medium text-[#17110a] hover:bg-[#f3dfb4]">
                Open in sandbox <ArrowRight className="size-3.5" />
              </Link>
              <Link href={`${BASE}/deliveries`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] text-[12.5px] font-medium text-white/85 hover:border-white/20">
                Deliver <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
