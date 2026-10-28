"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "../../command-center/kit";
import { inputCls, PageBar, Panes, PaneSection } from "../frame";
import { BASE, useFoundry } from "./store";
import { TargetPicker } from "./targets";

const copy = async (text: string, what: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error("Copy failed. Select the text manually.");
  }
};

/** Self-contained delivery links and the handover note that replaces a cold pitch. */
export function DeliveriesPage() {
  const f = useFoundry();
  const t = f.active;
  const b = f.buildOf(t.id);
  const [busy, setBusy] = useState(false);
  const failing = b.checks.filter((c) => !c.pass).length;

  const create = async () => {
    setBusy(true);
    try {
      const rec = await f.deliver(t);
      await navigator.clipboard.writeText(rec.link).catch(() => {});
      toast.success("Secure delivery link created and copied");
    } catch {
      toast.error("This browser can't compress the delivery. Download the file from the Sandbox instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageBar icon={Link2} accent="#3fd29a" title="Deliveries" meta={`${f.deliveries.length} links issued`} actions={<TargetPicker />} />
      <Panes
        leftWidth={420}
        left={
          <>
            <PaneSection title={`New delivery · ${t.name}`}>
              {b.code ? (
                <>
                  <p className="text-[12px] text-white/55">
                    {b.findings.length} bottlenecks fixed · {Math.round(new Blob([b.code]).size / 1024)} KB prototype
                    {failing > 0 && <span className="text-[#ffd59a]"> · {failing} QA check(s) failing</span>}
                  </p>
                  <p className="mb-1 mt-3 text-[11.5px] text-white/50">Handover note (“[link]” becomes the delivery link)</p>
                  <textarea className={cn(inputCls, "resize-y leading-relaxed")} rows={11} value={b.note} onChange={(e) => f.setNote(t.id, e.target.value)} />
                  <Button variant="primary" className="mt-2.5 h-11 w-full" disabled={busy || f.running === t.id} onClick={create}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Create secure delivery link
                  </Button>
                </>
              ) : (
                <p className="text-[12.5px] text-white/45">
                  Nothing built for {t.name} yet.{" "}
                  <Link href={`${BASE}/foundry`} className="text-[#3fd29a] hover:underline">
                    Run the swarm →
                  </Link>
                </p>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-white/35">The link is self-contained: the prototype is gzipped into the part after “#”, which browsers never send to a server, so nothing is stored by us. Anyone with the link can open it, and the page it opens can&apos;t send data anywhere.</p>
            </PaneSection>
          </>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#0b0a0e]/60 p-3">
          <ul className="space-y-2.5">
            {f.deliveries.map((d) => (
              <li key={d.id} className="rounded-lg border border-white/[0.08] bg-[#121116]/90 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-white">{d.name}</span>
                  <span className="text-[11.5px] text-white/40">{new Date(d.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                  <span className="text-[11.5px] text-white/40">· {(d.bytes / 1024).toFixed(1)} KB link</span>
                  <span className="ml-auto flex gap-1">
                    <Button size="sm" onClick={() => copy(d.link, "Link")}>
                      <Copy className="size-3.5" /> Link
                    </Button>
                    <Button size="sm" onClick={() => copy(d.note, "Note")}>
                      <Copy className="size-3.5" /> Note
                    </Button>
                    <a href={d.link} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[12px] font-medium text-white/85 hover:border-white/20">
                      <ExternalLink className="size-3.5" /> Open
                    </a>
                    <Button size="sm" variant="danger" aria-label="Forget delivery" onClick={() => f.removeDelivery(d.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </span>
                </div>
                <p className="mt-2 break-all font-mono text-[10.5px] text-white/40">{d.link.slice(0, 120)}…</p>
                <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-black/25 p-2.5 font-sans text-[12px] leading-relaxed text-white/70">{d.note}</pre>
              </li>
            ))}
            {!f.deliveries.length && <li className="py-16 text-center text-[13px] text-white/40">Delivery links you create appear here. Removing one here doesn&apos;t revoke it: the prototype lives in the link itself.</li>}
          </ul>
        </div>
      </Panes>
    </>
  );
}
