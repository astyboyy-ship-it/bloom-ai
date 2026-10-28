"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Download, Monitor, MonitorPlay, ShieldCheck, Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { lockdown } from "@/lib/studio/foundry";
import { Button } from "../../command-center/kit";
import { download, PageBar } from "../frame";
import { BASE, useFoundry } from "./store";
import { TargetPicker } from "./targets";

/** Full-screen editor and live preview for the generated prototype. */
export function SandboxPage() {
  const f = useFoundry();
  const t = f.active;
  const b = f.buildOf(t.id);
  const running = f.running === t.id;
  const [preview, setPreview] = useState(b.code);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  // Follow edits without reloading the preview on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setPreview(b.code), running ? 0 : 400);
    return () => clearTimeout(id);
  }, [b.code, running]);

  const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const failing = b.checks.filter((c) => !c.pass).length;

  return (
    <>
      <PageBar
        icon={MonitorPlay}
        accent="#3fd29a"
        title="Sandbox"
        meta={b.code ? `${t.name} · index.html · ${Math.round(new Blob([b.code]).size / 1024)} KB${running ? " · Builder is writing…" : ""}` : `${t.name} · nothing built yet`}
        actions={
          <>
            <TargetPicker />
            <span className="inline-flex rounded-md border border-white/[0.08] bg-black/20 p-0.5">
              {(["desktop", "mobile"] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDevice(d)} aria-label={`${d} preview`} className={cn("flex h-7 items-center rounded px-2", device === d ? "bg-white/[0.1] text-white" : "text-white/45")}>
                  {d === "desktop" ? <Monitor className="size-3.5" /> : <Smartphone className="size-3.5" />}
                </button>
              ))}
            </span>
            <Button size="sm" disabled={!b.code || running} onClick={() => f.rerunQa(t.id)}>
              <ShieldCheck className="size-3.5" /> Run QA
            </Button>
            <Button size="sm" variant="primary" disabled={!b.code || running} onClick={() => download(`${slug}-fix.html`, b.code, "text/html")}>
              <Download className="size-3.5" /> Download
            </Button>
          </>
        }
      />
      {b.code ? (
        <>
          <div className="grid min-h-0 flex-1 lg:grid-cols-2">
            <textarea
              value={b.code}
              onChange={(e) => f.setCode(t.id, e.target.value)}
              readOnly={running}
              spellCheck={false}
              aria-label="Prototype source"
              className="min-h-[50vh] resize-none border-white/[0.07] bg-[#08080a]/90 p-4 font-mono text-[12px] leading-[1.6] text-[#d7f5e6] focus:outline-none lg:min-h-0 lg:border-r"
            />
            <div className="flex min-h-[50vh] items-start justify-center overflow-auto bg-[#1a1820] p-3 lg:min-h-0">
              <iframe
                title={`${t.name} prototype`}
                srcDoc={lockdown(preview)}
                sandbox="allow-scripts allow-forms"
                className={cn("bg-white shadow-2xl transition-[width] duration-300", device === "desktop" ? "h-full w-full" : "h-[740px] w-[390px] rounded-[18px]")}
              />
            </div>
          </div>
          {b.checks.length > 0 && (
            <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.07] bg-[#0d0c10]/85 px-4 py-2 text-[11.5px]">
              <span className={failing ? "text-[#ffd59a]" : "text-[#9fd3a8]"}>{failing ? `${failing} QA check(s) failing` : "All QA checks pass"}</span>
              {b.checks.map((c) => (
                <span key={c.label} className={cn("inline-flex items-center gap-1", c.pass ? "text-white/50" : "text-[#ffb3a8]")}>
                  {c.pass ? <Check className="size-3" /> : <X className="size-3" />}
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-[#0b0a0e]/60 text-[13px] text-white/45">
          Nothing built for {t.name} yet.
          <Link href={`${BASE}/foundry`} className="text-[#3fd29a] hover:underline">
            Run the swarm in the Foundry →
          </Link>
        </div>
      )}
    </>
  );
}
