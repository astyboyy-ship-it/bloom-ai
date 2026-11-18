"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Fingerprint, KeyRound, Loader2, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { BloomWordmark } from "@/components/bloom/logo";
import { updateSettings, useDeskSettings } from "@/components/desk/settings";
import { useDeskCopy } from "@/components/exchange/desk-copy";
import { cn } from "@/lib/utils";

/**
 * The entrance to Bloom Exchange: a white gallery wall with one framed painting and a single decision. A Bloom
 * access key is verified by the clearinghouse itself (/api/exchange/status reads it exactly as every negotiation
 * does) and then kept in desk settings on this device; or the visitor enters the sandbox with no key. There are
 * no accounts or passwords here: the key is the credential. The gate shows once per browser session.
 */
export const SESSION_KEY = "bloom-exchange-session";
export type GateResult = { kind: "key" | "sandbox"; operator: boolean; firstVisit: boolean };

const ONBOARDED_KEY = "bloom-exchange-onboarded";
const EASE = [0.22, 1, 0.36, 1] as const;

type Status = { licensed: boolean; operator: boolean };

async function verify(key: string): Promise<Status | "unreachable"> {
  try {
    const r = await fetch("/api/exchange/status", { headers: { "x-bloom-license": key }, cache: "no-store" });
    if (!r.ok) return { licensed: false, operator: false };
    return (await r.json()) as Status;
  } catch {
    return "unreachable";
  }
}

const mask = (k: string) => (k.length > 10 ? `${k.slice(0, 6)}…${k.slice(-4)}` : "••••");

export function markSession(kind: "key" | "sandbox") {
  try {
    sessionStorage.setItem(SESSION_KEY, kind);
  } catch {
    // Not remembered: the gate shows again next load.
  }
}

/** Removes the stored key and ends the session; the caller shows the gate again. */
export function signOut() {
  updateSettings({ licenseKey: "" });
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function BloomLoginGate({ onEnter }: { onEnter: (r: GateResult) => void }) {
  const t = useDeskCopy().gate;
  const reduce = useReducedMotion() ?? false;
  const { settings } = useDeskSettings();
  const saved = settings.licenseKey.trim();
  const [entering, setEntering] = useState(false);
  const [mode, setMode] = useState<"saved" | "new">(saved ? "saved" : "new");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setMode(saved ? "saved" : "new"), [saved]);
  useEffect(() => {
    if (mode === "new") input.current?.focus();
  }, [mode]);

  const finish = (kind: "key" | "sandbox", operator: boolean) => {
    let firstVisit = false;
    try {
      firstVisit = localStorage.getItem(ONBOARDED_KEY) !== "1";
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // Treated as a returning visit.
    }
    markSession(kind);
    setEntering(true);
    window.setTimeout(() => onEnter({ kind, operator, firstVisit }), reduce ? 0 : 520);
  };

  const unlock = async (candidate: string) => {
    const k = candidate.trim();
    if (!k || busy) return;
    setBusy(true);
    setError(null);
    const s = await verify(k);
    setBusy(false);
    if (s === "unreachable") return setError(t.unreachable);
    if (!s.licensed) return setError(t.invalid);
    if (k !== saved) updateSettings({ licenseKey: k });
    finish("key", s.operator);
  };

  return (
    <motion.div
      className="xch xch-atmosphere xch-scroll fixed inset-0 z-[120] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Bloom ${t.product}`}
      initial={{ opacity: 0 }}
      animate={entering ? { opacity: 0, scale: 1.015 } : { opacity: 1, scale: 1 }}
      transition={{ duration: entering ? 0.5 : 0.6, ease: EASE }}
    >
      {/* Daylight on the gallery wall */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="xch-velvet absolute -left-[10%] -top-[20%] h-[60vh] w-[55vw] rounded-full bg-[radial-gradient(closest-side,rgba(225,29,72,0.07),transparent)]" />
        <div className="xch-velvet absolute -bottom-[25%] right-[-5%] h-[70vh] w-[50vw] rounded-full bg-[radial-gradient(closest-side,rgba(214,170,92,0.14),transparent)] [animation-delay:-4s]" />
      </div>

      <div className="relative mx-auto grid min-h-full max-w-[1240px] grid-cols-1 items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16 lg:py-16">
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: EASE }} className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--xch-gold)]">{t.kicker}</p>
          <h1 className="mt-6 flex flex-wrap items-baseline gap-x-4 leading-none">
            <span className="text-[54px] sm:text-[72px]">
              <BloomWordmark tone="ink" />
            </span>
            <span className="xch-gold-italic text-[52px] sm:text-[68px]">{t.product}</span>
          </h1>
          <p className="xch-display mt-5 max-w-md text-[24px] leading-snug text-x-ink/75">{t.tagline}</p>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            {t.points.map((p, i) => {
              const Icon = [ShieldCheck, Fingerprint, Sparkles][i] ?? ShieldCheck;
              return (
                <li key={p} className="flex items-center gap-1.5 text-[12.5px] text-x-ink/55">
                  <Icon className="size-3.5 text-[var(--xch-gold)]" strokeWidth={1.5} /> {p}
                </li>
              );
            })}
          </ul>

          <div className="mt-10 max-w-md">
            <AnimatePresence mode="wait" initial={false}>
              {mode === "saved" ? (
                <motion.div key="saved" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25, ease: EASE }} className="space-y-3">
                  <p className="flex items-center gap-2 text-[12.5px] text-x-ink/55">
                    <KeyRound className="size-3.5 text-[var(--xch-gold)]" strokeWidth={1.5} /> {t.saved} · <span className="font-mono text-x-ink/70">{mask(saved)}</span>
                  </p>
                  <button type="button" disabled={busy} onClick={() => void unlock(saved)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-x-ink text-[14px] font-medium text-x-paper shadow-[0_12px_30px_-14px_rgba(22,17,15,0.6)] transition-transform duration-150 hover:-translate-y-px disabled:opacity-60">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} {busy ? t.checking : t.continue} {!busy && <ArrowRight className="size-4" strokeWidth={1.75} />}
                  </button>
                  <div className="flex items-center justify-between text-[12px]">
                    <button type="button" onClick={() => (setMode("new"), setError(null))} className="text-x-ink/55 underline-offset-4 hover:text-x-ink hover:underline">
                      {t.useAnother}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateSettings({ licenseKey: "" });
                        setMode("new");
                      }}
                      className="flex items-center gap-1 text-x-ink/45 hover:text-[var(--xch-threat)]"
                    >
                      <LogOut className="size-3.5" strokeWidth={1.5} /> {t.signOut}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="new"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void unlock(key);
                  }}
                  className="space-y-3"
                >
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-x-ink/45">{t.keyLabel}</span>
                    <span className={cn("mt-2 flex h-12 items-center gap-2.5 rounded-full border bg-white px-4 shadow-[0_1px_2px_rgba(40,25,20,0.05)] transition-colors duration-150 focus-within:border-[var(--xch-gold)]", error ? "border-[color-mix(in_srgb,var(--xch-threat)_45%,transparent)]" : "border-[var(--xch-line)]")}>
                      <KeyRound className="size-4 shrink-0 text-x-ink/35" strokeWidth={1.5} />
                      <input ref={input} value={key} onChange={(e) => (setKey(e.target.value), setError(null))} placeholder={t.keyPh} autoComplete="off" spellCheck={false} className="h-full w-full bg-transparent font-mono text-[13px] text-x-ink outline-none placeholder:font-sans placeholder:text-x-ink/30" />
                    </span>
                  </label>
                  {error && (
                    <p role="alert" className="text-[12px] leading-relaxed text-[var(--xch-threat)]">
                      {error}
                    </p>
                  )}
                  <button type="submit" disabled={!key.trim() || busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-x-ink text-[14px] font-medium text-x-paper shadow-[0_12px_30px_-14px_rgba(22,17,15,0.6)] transition-[transform,opacity] duration-150 hover:-translate-y-px disabled:opacity-35 disabled:hover:translate-y-0">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} {busy ? t.checking : t.unlock} {!busy && <ArrowRight className="size-4" strokeWidth={1.75} />}
                  </button>
                  <div className="flex items-center gap-3 py-1" aria-hidden>
                    <span className="h-px flex-1 bg-[var(--xch-line)]" />
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-x-ink/30">{t.or}</span>
                    <span className="h-px flex-1 bg-[var(--xch-line)]" />
                  </div>
                  <button type="button" onClick={() => finish("sandbox", false)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--xch-line-strong)] bg-white/60 text-[14px] text-x-ink transition-colors duration-150 hover:bg-white">
                    {t.sandbox}
                  </button>
                  <p className="text-center text-[11.5px] text-x-ink/45">{t.sandboxNote}</p>
                </motion.form>
              )}
            </AnimatePresence>
            <p className="mt-8 text-[11px] leading-relaxed text-x-ink/40">{t.note}</p>
          </div>
        </motion.section>

        {/* The painting, mounted: white mat, gold hairline, daylight shadow */}
        <motion.figure initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.25, ease: EASE }} className="mx-auto w-full max-w-[460px] lg:max-w-none">
          <div className="rounded-[6px] bg-white p-3 shadow-[0_2px_4px_rgba(40,25,20,0.05),0_40px_80px_-40px_rgba(40,25,20,0.35)] ring-1 ring-[var(--xch-line)] sm:p-5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[2px] ring-1 ring-[var(--xch-line-strong)] lg:aspect-[4/5]">
              <Image src="/paintings/villa-deste.jpg" alt="" fill priority sizes="(min-width: 1024px) 520px, 90vw" quality={75} className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_55%,rgba(253,252,250,0.35))]" />
            </div>
          </div>
          <figcaption className="mt-3 text-center font-mono text-[9.5px] uppercase tracking-[0.24em] text-x-ink/35">{t.caption}</figcaption>
        </motion.figure>
      </div>
    </motion.div>
  );
}
