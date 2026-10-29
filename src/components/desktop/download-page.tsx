"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Download, Laptop, Monitor } from "lucide-react";
import type { ReleaseSummary } from "@/lib/desktop/releases";
import { cn } from "@/lib/utils";
import { useI18n, type Lang } from "@/components/bloom/i18n";
import { LanguageSwitcher } from "@/components/bloom/language-switcher";
import { BloomWordmark } from "@/components/bloom/logo";

type Copy = {
  eyebrow: string;
  title: string;
  pending: (os: string) => string;
  body: string;
  ready: string;
  download: string;
  notYet: string;
  version: (v: string) => string;
  openDesk: string;
  waitlist: string;
  windows: string;
  mac: string;
  requirements: Record<"windows" | "mac", string>;
};

const COPY: Record<Lang, Copy> = {
  en: {
    eyebrow: "Bloom AI Desktop",
    title: "The Operating Desk, native.",
    pending: (os) => `The ${os} build isn't published yet.`,
    body: "Desktop builds ship from our release pipeline. Until yours is out, the full desk runs in your browser with the same eight engines.",
    ready: "Download the installer for your computer. The app opens the same Operating Desk in its own native window.",
    download: "Download",
    notYet: "Not published yet",
    version: (v) => `Version ${v}`,
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
    body: "Las versiones de escritorio salen de nuestro pipeline de releases. Mientras llega la tuya, la mesa completa funciona en tu navegador con los mismos ocho motores.",
    ready: "Descarga el instalador para tu equipo. La app abre la misma Mesa de Operaciones en su propia ventana nativa.",
    download: "Descargar",
    notYet: "Aún no publicado",
    version: (v) => `Versión ${v}`,
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
    body: "גרסאות הדסקטופ יוצאות מצינור השחרורים שלנו. עד שהגרסה שלכם תצא, השולחן המלא עובד בדפדפן עם אותם שמונה מנועים.",
    ready: "הורידו את המתקין למחשב שלכם. האפליקציה פותחת את אותו שולחן פיקוד בחלון נייטיב משלה.",
    download: "הורדה",
    notYet: "עדיין לא פורסם",
    version: (v) => `גרסה ${v}`,
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
  const [release, setRelease] = useState<ReleaseSummary | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("os");
    setOs(q === "mac" ? "mac" : q === "windows" ? "windows" : null);
    fetch("/api/desktop/release", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<ReleaseSummary>) : null))
      .then(setRelease)
      .catch(() => setRelease(null));
  }, []);
  const anyReady = Boolean(release?.installers.windows || release?.installers.mac);
  const requestedMissing = os !== null && release !== null && !release.installers[os];

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
        {requestedMissing && <p className="mt-4 text-[17px] text-[#f3e2b8]">{c.pending(os === "mac" ? c.mac : c.windows)}</p>}
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60">{anyReady ? c.ready : c.body}</p>
        {release?.version && <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">{c.version(release.version)}</p>}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {(["windows", "mac"] as const).map((k) => {
            const Icon = k === "mac" ? Laptop : Monitor;
            const installer = release?.installers[k];
            return (
              <div key={k} className={cn("glass flex flex-col rounded-2xl p-5", os === k && "ring-1 ring-[#f0d59a]/40")}>
                <Icon className="size-5 text-[#f3e2b8]" />
                <p className="mt-3 text-[16px] font-medium">{k === "mac" ? c.mac : c.windows}</p>
                <p className="mt-1 text-[12.5px] text-white/50">{c.requirements[k]}</p>
                {installer ? (
                  <a
                    href={`/api/desktop/download?os=${k}`}
                    className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#f3e2b8] px-5 py-2.5 text-[13px] font-semibold text-[#1a0f05] shadow-[0_0_40px_-12px_rgb(243_212_143/0.8)]"
                  >
                    <Download className="size-4" /> {c.download}
                    {installer.size > 0 && <span className="font-normal text-[#1a0f05]/60">· {(installer.size / 1_048_576).toFixed(1)} MB</span>}
                  </a>
                ) : (
                  <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/35">{release ? c.notYet : "…"}</p>
                )}
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
