"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BellRing, Check, Loader2, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { joinNetwork, type JoinState } from "./actions";
import { FloraField } from "./art/flora";


import { ENGINE_IDS, ENGINE_LABELS, isEngineId, type EngineId } from "./engines/catalog";
import { useI18n } from "./i18n";
import { Accent } from "./section-heading";
import { useSiteCopy } from "./site-copy";

const roles = ["creator", "founder", "enterprise", "developer"] as const;

type Role = (typeof roles)[number];
const isRole = (v: unknown): v is Role => roles.some((r) => r === v);

export function Waitlist({ defaultEngine = "general" }: { defaultEngine?: EngineId } = {}) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(joinNetwork, { status: "idle" });
  const [role, setRole] = useState<Role>("creator");
  const [engine, setEngine] = useState<EngineId>(defaultEngine);
  const { t, lang, dir } = useI18n();
  const w = useSiteCopy().s.waitlist;
  const [intent, setIntent] = useState<"access" | "updates">("access");
  const emailRef = useRef<HTMLInputElement>(null);

  // Every "#waitlist" CTA lands the cursor in the email field. CTAs can also pre-select the
  // engine (data-engine), the visitor's role (data-role), and access vs. updates (data-intent).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href="#waitlist"]');
      if (!link) return;
      const picked = link.dataset.engine;
      if (isEngineId(picked)) setEngine(picked);
      if (isRole(link.dataset.role)) setRole(link.dataset.role);
      setIntent(link.dataset.intent === "updates" ? "updates" : "access");
      window.setTimeout(() => emailRef.current?.focus({ preventScroll: true }), 700);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <section id="waitlist" className="relative scroll-mt-16 overflow-hidden px-4 pb-24 pt-32 sm:pt-44">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="glass relative mx-auto max-w-6xl overflow-hidden rounded-[36px]"
      >
        {/* Bloom behind the copy */}
        <FloraField
          className="opacity-60"
          blooms={[
            { kind: "rose", x: "4%", y: "10%", size: 150, rotate: -12 },
            { kind: "rose", x: "12%", y: "4%", size: 96, rotate: 18 },
            { kind: "rose", x: "97%", y: "94%", size: 130, rotate: 8 },
          ]}
        />
        <div className="pointer-events-none absolute -bottom-32 right-0 size-96 rounded-full bg-dusk/10 blur-[110px]" />
        <div className="bg-noise pointer-events-none absolute inset-0" />

        <div className="relative grid gap-12 p-8 sm:p-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:p-16">
          <div className="flex flex-col justify-center">
            <div lang={lang} dir={dir}>
              <p className="inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-white/45">
                <span className="font-jp text-sm normal-case tracking-normal text-rose">一番咲き</span>
                <span className="h-px w-8 bg-gradient-to-r from-rose/60 to-transparent" />
                {t.waitlist.eyebrow}
              </p>
              <h2 className="mt-6 text-balance text-4xl font-medium leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl">
                {t.waitlist.titlePre}
                <Accent>{t.waitlist.titleAccent}</Accent>
              </h2>
              <p className="mt-6 max-w-lg text-pretty leading-relaxed text-white/55">{t.waitlist.description}</p>
            </div>
            <ul className="mt-8 space-y-3">
              {w.perks.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.12 }}
                  className="flex items-start gap-3 text-sm text-white/70"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-rose/15 text-rose">
                    <Check className="size-3" />
                  </span>
                  {p}
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center">
            <div className="w-full rounded-3xl border border-white/[0.08] bg-ink/70 p-6 shadow-2xl sm:p-8">
              <AnimatePresence mode="wait" initial={false}>
                {state.status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    className="flex flex-col items-center py-4 text-center"
                    role="status"
                  >
                    <div className="relative size-28">
                      <FloraField blooms={[{ kind: "rose", x: "50%", y: "50%", size: 112 }]} />
                    </div>
                    <h3 className="mt-4 font-serif text-3xl italic text-white">{w.successTitle}</h3>
                    <p className="mt-3 max-w-xs text-sm text-white/55">
                      {state.intent === "updates" ? (
                        <>
                          {w.updatesMsg[0]}
                          <span className="text-white">{ENGINE_LABELS[state.engine]}</span>
                          {w.updatesMsg[1]}
                          <span dir="ltr" className="text-white">{state.email}</span>
                          {w.updatesMsg[2]}
                        </>
                      ) : (
                        <>
                          {w.accessMsg[0]}
                          <span dir="ltr" className="text-white">{state.email}</span>
                          {w.accessMsg[1]}
                          <span className="text-white">{ENGINE_LABELS[state.engine]}</span>
                          {w.accessMsg[2]}
                        </>
                      )}
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    action={formAction}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-5"
                  >
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-medium text-white">
                        {intent === "updates" ? (
                          <>
                            <BellRing className="size-4 text-[#5ee7ff]" /> {w.trackTitle}
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-4 text-sun" /> {w.claimTitle}
                          </>
                        )}
                      </h3>
                      <p className="mt-1 text-sm text-white/45">
                        {intent === "updates" ? w.trackSub : w.claimSub}
                      </p>
                    </div>

                    <input type="hidden" name="engine" value={engine} />
                    <input type="hidden" name="intent" value={intent} />

                    <fieldset>
                      <legend className="mb-2 text-xs text-white/40">{w.engine}</legend>
                      <div className="flex flex-wrap gap-1.5">
                        {ENGINE_IDS.map((id) => (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={engine === id}
                            onClick={() => setEngine(id)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-[11px] transition-all",
                              engine === id
                                ? "border-sun/50 bg-gradient-to-r from-rose/25 to-sun/20 text-white shadow-[0_0_20px_-6px_rgb(255_123_74/0.7)]"
                                : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/80",
                            )}
                          >
                            {ENGINE_LABELS[id]}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="mb-2 text-xs text-white/40">{w.iAm}</legend>
                      <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
                        {roles.map((r) => (
                          <label key={r} className="relative cursor-pointer">
                            <input
                              type="radio"
                              name="role"
                              value={r}
                              checked={role === r}
                              onChange={() => setRole(r)}
                              className="peer sr-only"
                            />
                            {role === r && (
                              <motion.span
                                layoutId="role-pill"
                                className="absolute inset-0 rounded-lg bg-gradient-to-r from-rose/25 to-sun/20"
                                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                              />
                            )}
                            <span
                              className={cn(
                                "relative block rounded-lg py-2 text-center text-xs transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-rose/50",
                                role === r ? "text-white" : "text-white/45 hover:text-white/70",
                              )}
                            >
                              {w.roles[r]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div>
                      <label htmlFor="bloom-email" className="mb-2 block text-xs text-white/40">
                        {w.email}
                      </label>
                      <input
                        ref={emailRef}
                        id="bloom-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@company.com"
                        dir="ltr"
                        defaultValue={state.status === "error" ? state.email : ""}
                        aria-invalid={state.status === "error"}
                        aria-describedby={state.status === "error" ? "bloom-email-error" : undefined}
                        className={cn(
                          "h-12 w-full rounded-xl border bg-white/[0.03] px-4 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgb(245_169_176/0.12)]",
                          state.status === "error" ? "border-red-400/50" : "border-white/10 focus:border-rose/50",
                        )}
                      />
                      <AnimatePresence>
                        {state.status === "error" && (
                          <motion.p
                            id="bloom-email-error"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 text-xs text-red-300"
                          >
                            {state.message}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      type="submit"
                      disabled={pending}
                      className="group relative flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-white text-sm font-semibold text-black shadow-[0_0_50px_-12px_rgb(245_169_176/0.8)] transition-shadow hover:shadow-[0_0_70px_-8px_rgb(245_169_176/0.9)] disabled:cursor-wait disabled:opacity-70"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-rose via-sun to-dusk transition-transform duration-700 ease-out group-hover:translate-x-0" />
                      {pending ? (
                        <span className="relative flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" /> {w.planting}
                        </span>
                      ) : (
                        <span className="relative flex items-center gap-2">
                          {intent === "updates" ? t.waitlist.trackUpdates : t.waitlist.submit}
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
                        </span>
                      )}
                    </button>

                    <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/30">
                      <Lock className="size-3" /> {w.noSpam}
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>    </section>
  );
}
