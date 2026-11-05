"use client";

import { useEffect, useId, useRef, useState } from "react";
import { KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import type { DemoTargetId } from "@/lib/demo/demoGenerator";
import { useLicense } from "@/lib/license-context";
import { audit } from "@/components/desk/settings";
import { useLicensingCopy } from "@/components/control-plane/copy";
import { CpButton } from "@/components/control-plane/widget";

const TRACK = "bloom-demo-referrals";
/** Where requests go. Unset, the request is copied to the clipboard for the partner to forward. */
const PROVISION_URL = process.env.NEXT_PUBLIC_BLOOM_PROVISION_URL;

type Tally = Record<string, { opens: number; requests: number; last: number }>;

/** Local referral funnel: how often the CTA was opened and a request made, per partner referral. */
function track(ref: string, what: "opens" | "requests") {
  try {
    const all = JSON.parse(localStorage.getItem(TRACK) ?? "{}") as Tally;
    const cur = all[ref] ?? { opens: 0, requests: 0, last: 0 };
    all[ref] = { ...cur, [what]: cur[what] + 1, last: Date.now() };
    localStorage.setItem(TRACK, JSON.stringify(all));
  } catch {
    // Tracking is best-effort.
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The demo's conversion path: a floating "Provision Production Key" button and modal. Every request carries the
 * partner's referral ID from the signed demo key (it can't be edited here), the architecture being shown and
 * the prospect's details; it is sent to NEXT_PUBLIC_BLOOM_PROVISION_URL when configured, else copied as JSON.
 */
export function ProvisionCta({ target }: { target: DemoTargetId }) {
  const d = useLicensingCopy().demo;
  const m = d.modal;
  const { access } = useLicense();
  const referral = access?.permissions.partnerReferralId ?? "direct";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", notes: "" });
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const show = () => {
    setOpen(true);
    track(referral, "opens");
  };

  const submit = async () => {
    if (!form.name.trim() || !form.company.trim() || !EMAIL.test(form.email.trim())) {
      setError(m.required);
      return;
    }
    const request = {
      type: "bloom.production_key_request",
      referral,
      partner: access?.holderName ?? null,
      demoKeyId: access?.keyId ?? null,
      architecture: target,
      contact: { name: form.name.trim(), company: form.company.trim(), email: form.email.trim() },
      notes: form.notes.trim().slice(0, 1000),
      requestedAt: new Date().toISOString(),
    };
    track(referral, "requests");
    audit("license", `Demo partner ${referral}: production key requested for ${request.contact.company} (${target})`);
    if (PROVISION_URL) {
      const url = new URL(PROVISION_URL);
      url.searchParams.set("ref", referral);
      url.searchParams.set("architecture", target);
      url.searchParams.set("company", request.contact.company);
      url.searchParams.set("email", request.contact.email);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
      toast.success(m.sent);
    } else {
      try {
        await navigator.clipboard.writeText(JSON.stringify(request, null, 2));
      } catch {
        // Clipboard blocked: the audit entry still records the request.
      }
      toast.success(m.copied);
    }
    setOpen(false);
    setError("");
    setForm({ name: "", company: "", email: "", notes: "" });
  };

  const field = "w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-os-cyan/50 focus:outline-none";

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="bloom-glass bloom-edge-glow fixed end-5 bottom-5 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-os-cyan transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-os-cyan"
      >
        <KeyRound className="size-4" style={{ animation: "bloom-pulse 2s ease-in-out infinite" }} />
        {d.cta}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        className="bloom-glass m-auto w-[min(520px,calc(100vw-2rem))] rounded-2xl p-0 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <form
          method="dialog"
          className="p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-[18px] font-semibold tracking-[-0.01em]">
              {m.title}
            </h2>
            <button type="button" onClick={() => setOpen(false)} aria-label={m.close} className="rounded p-1 text-white/50 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{m.body}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] text-white/50">
              {m.name}
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} className={`mt-1 ${field}`} autoComplete="name" />
            </label>
            <label className="text-[11px] text-white/50">
              {m.company}
              <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={120} className={`mt-1 ${field}`} autoComplete="organization" />
            </label>
            <label className="text-[11px] text-white/50 sm:col-span-2">
              {m.email}
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={160} className={`mt-1 ${field}`} autoComplete="email" dir="ltr" />
            </label>
            <label className="text-[11px] text-white/50 sm:col-span-2">
              {m.notes}
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} rows={3} className={`mt-1 resize-none ${field}`} />
            </label>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-white/[0.06] bg-black/30 p-3 font-mono text-[11px]">
            <div>
              <dt className="text-[9px] uppercase tracking-[0.16em] text-white/35">{m.architecture}</dt>
              <dd className="mt-0.5 text-white/80">{d.targets[target].name}</dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-[0.16em] text-white/35">{m.referral}</dt>
              <dd className="mt-0.5 text-os-cyan" dir="ltr">
                {referral}
              </dd>
            </div>
          </dl>

          {error && (
            <p role="alert" className="mt-3 text-[12px] text-red-300">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <CpButton tone="quiet" onClick={() => setOpen(false)}>
              {m.close}
            </CpButton>
            <CpButton type="submit">
              <KeyRound className="size-3" /> {m.submit}
            </CpButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
