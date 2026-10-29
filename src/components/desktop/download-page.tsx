"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Laptop, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, type Lang } from "@/components/bloom/i18n";
import { LanguageSwitcher } from "@/components/bloom/language-switcher";
import { BloomWordmark } from "@/components/bloom/logo";

const COPY: Record<Lang, { eyebrow: string; title: string; pending: (os: string) => string; body: string; openDesk: string; waitlist: string; windows: string; mac: string; requirements: Record<"windows" | "mac", string> }> = {
  en: {
    eyebrow: "Bloom AI Desktop",
    title: "The Operating Desk, native.",
    pending: (os) => `The ${os} build isn't published yet.`,
    body: "Desktop builds ship from our release pipeline. Until yours is out, the full desk runs in your browser, with the same engines, settings and calibrations.",
    openDesk: "Open the desk in your browser",
    waitlist: "Get notified at launch",
    windows: "Windows",
    mac: "macOS",
    requirements: { windows: "Windows 10 or 11 · 64-bit installer (.exe)", mac: "macOS 11 or later · Apple silicon and Intel (.dmg)" },
  },
  es: {
    eyebrow: "Bloom AI Desktop",
    title: "La Mesa de Operaciones, nativa.",
    pending: (os) => `La versión para ${os} aún no está publicada.`,
    body: "Las versiones de escritorio salen de nuestro pipeline de releases. Mientras llega la tuya, la mesa completa funciona en tu navegador, con los mismos motores, ajustes y calibraciones.",
    openDesk: "Abrir la mesa en el navegador",
    waitlist: "Avísame en el lanzamiento",
    windows: "Windows",
    mac: "macOS",
    requirements: { windows: "Windows 10 u 11 · instalador de 64 bits (.exe)", mac: "macOS 11 o posterior · Apple silicon e Intel (.dmg)" },
  },
  he: {
    eyebrow: "Bloom AI Desktop",
    title: "שולחן הפיקוד, כאפליקציה.",
    pending: (os) => `הגרסה ל-${os} עדיין לא פורסמה.`,
    body: "גרסאות הדסקטופ יוצאות מצינור השחרורים שלנו. עד שהגרסה שלכם תצא, השולחן המלא עובד בדפדפן, עם אותם מנועים, הגדרות וכיולים.",
    openDesk: "פתיחת השולחן בדפדפן",
    waitlist: "עדכנו אותי בהשקה",
    windows: "Windows",
    mac: "macOS",
    requirements: { windows: "Windows 10 או 11 · מתקין 64 ביט (.exe)", mac: "macOS 11 ומעלה · Apple silicon ו-Intel (.dmg)" },
  },
};

/** Where the download route sends visitors when no installer is published for their OS yet. */
export function DownloadPage() {
  const { lang, dir } = useI18n();
  const c = COPY[lang];
  const [os, setOs] = useState<"windows" | "mac" | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("os");
    setOs(q === "mac" ? "mac" : q === "windows" ? "windows" : null);
  }, []);

  return (
    <div lang={lang} dir={dir} className="relative isolate flex min-h-dvh flex-col bg-ink px-4 py-8 font-sans text-white sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgb(255_189_110/0.1),transparent_55%)]" />
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link href="/">
          <BloomWordmark className="text-[24px]" />
        </Link>
        <LanguageSwitcher />
      </div>
      <main className="mx-auto mt-16 w-full max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#f0d59a]/80">{c.eyebrow}</p>
        <h1 className="mt-3 font-display text-[44px] font-light leading-tight sm:text-[56px]">{c.title}</h1>
        {os && <p className="mt-4 text-[17px] text-[#f3e2b8]">{c.pending(os === "mac" ? c.mac : c.windows)}</p>}
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60">{c.body}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {(["windows", "mac"] as const).map((k) => {
            const Icon = k === "mac" ? Laptop : Monitor;
            return (
              <div key={k} className={cn("glass rounded-2xl p-5", os === k && "ring-1 ring-[#f0d59a]/40")}>
                <Icon className="size-5 text-[#f3e2b8]" />
                <p className="mt-3 text-[16px] font-medium">{k === "mac" ? c.mac : c.windows}</p>
                <p className="mt-1 text-[12.5px] text-white/50">{c.requirements[k]}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/desk" className="inline-flex items-center gap-2 rounded-full bg-[#f3e2b8] px-6 py-3 text-sm font-semibold text-[#1a0f05]">
            {c.openDesk} <ArrowUpRight className="size-4 rtl:-scale-x-100" />
          </Link>
          <Link href="/#waitlist" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm text-white/80 hover:border-white/40 hover:text-white">
            {c.waitlist}
          </Link>
        </div>
      </main>
    </div>
  );
}
