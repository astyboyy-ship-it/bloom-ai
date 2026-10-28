"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, FileText, Globe, Hammer, Plus, Target as TargetIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { classify } from "@/lib/studio/foundry";
import { Button } from "../../command-center/kit";
import { Field, inputCls, PageBar, Panes, PaneSection } from "../frame";
import { BASE, useFoundry, type Vaulted } from "./store";

export const KIND_ICON = { url: Globe, handle: AtSign, brief: FileText };
const KIND_LABEL = { url: "Website", handle: "Social handle", brief: "Written bottleneck" };

/** Picks the active target from the page bar on the Foundry, Sandbox and Deliveries pages. */
export function TargetPicker() {
  const f = useFoundry();
  return (
    <select value={f.active?.id} onChange={(e) => f.setActiveId(e.target.value)} disabled={!!f.running} aria-label="Target" className="h-8 max-w-56 rounded-md border border-white/[0.09] bg-[#16141b] px-2 text-[12.5px] text-white">
      {f.targets.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name} · {KIND_LABEL[t.kind]}
        </option>
      ))}
    </select>
  );
}

/** Target intelligence vault: what to build for, and the bottleneck spec that steers the swarm. */
export function TargetsPage() {
  const f = useFoundry();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [spec, setSpec] = useState("");
  const preview = input.trim() ? classify(input) : null;

  const status = (t: Vaulted) => {
    const b = f.buildOf(t.id);
    const delivered = f.deliveries.filter((d) => d.targetId === t.id).length;
    if (f.running === t.id) return { label: "Building…", tone: "text-[#3fd29a]" };
    if (delivered) return { label: `Delivered ×${delivered}`, tone: "text-[#9fd3a8]" };
    if (b.builtAt) return { label: `Built · ${b.findings.length} bottlenecks`, tone: "text-white/75" };
    return { label: "Not built", tone: "text-white/40" };
  };

  return (
    <>
      <PageBar icon={TargetIcon} accent="#3fd29a" title="Target vault" meta={`${f.targets.length} targets`} />
      <Panes
        rightWidth={360}
        right={
          <PaneSection title="Add a target">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim()) return;
                f.addTarget(input.trim(), spec.trim());
                setInput("");
                setSpec("");
              }}
              className="space-y-2.5"
            >
              <Field label="URL, @handle, or a description of their bottleneck">
                <textarea className={cn(inputCls, "resize-none")} rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder={"acme.com\n@acmehq\nOur checkout loses mobile buyers…"} />
              </Field>
              {preview && (
                <p className="text-[11.5px] text-white/50">
                  Detected: <span className="text-white/80">{KIND_LABEL[preview.kind]}</span> · name <span className="text-white/80">{preview.name}</span>
                </p>
              )}
              <Field label="Bottleneck spec (optional)" hint="What you already know: symptoms, numbers, who feels the pain.">
                <textarea className={cn(inputCls, "resize-none")} rows={3} value={spec} onChange={(e) => setSpec(e.target.value)} />
              </Field>
              <Button type="submit" variant="primary" className="w-full" disabled={!input.trim()}>
                <Plus className="size-3.5" /> Add to vault
              </Button>
            </form>
            <p className="mt-3 text-[11px] leading-relaxed text-white/35">URLs are crawled live from our server (public sites only). Handles and written bottlenecks are built from what you enter here.</p>
          </PaneSection>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#0b0a0e]/60 p-3">
          <ul className="space-y-2">
            {f.targets.map((t) => {
              const Icon = KIND_ICON[t.kind];
              const st = status(t);
              return (
                <li key={t.id} className={cn("rounded-lg border bg-[#121116]/90 p-3", t.id === f.activeId ? "border-[#3fd29a]/40" : "border-white/[0.08]")}>
                  <div className="flex flex-wrap items-start gap-3">
                    <Icon className="mt-1 size-4 shrink-0 text-[#3fd29a]" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <input className={cn(inputCls, "max-w-60 font-semibold")} value={t.name} onChange={(e) => f.updateTarget(t.id, { name: e.target.value })} aria-label="Target name" />
                        <span className="text-[11.5px] text-white/40">{KIND_LABEL[t.kind]}</span>
                        <span className={cn("text-[11.5px]", st.tone)}>{st.label}</span>
                      </div>
                      <p className="break-words text-[12.5px] text-white/65">{t.input}</p>
                      <textarea className={cn(inputCls, "resize-y text-[12px]")} rows={2} value={t.spec} placeholder="Bottleneck spec…" onChange={(e) => f.updateTarget(t.id, { spec: e.target.value })} />
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!!f.running}
                        onClick={() => {
                          f.setActiveId(t.id);
                          router.push(`${BASE}/foundry`);
                        }}
                      >
                        <Hammer className="size-3.5" /> Open in Foundry
                      </Button>
                      {f.targets.length > 1 && (
                        <Button size="sm" variant="danger" disabled={f.running === t.id} onClick={() => f.removeTarget(t.id)}>
                          <Trash2 className="size-3.5" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Panes>
    </>
  );
}
