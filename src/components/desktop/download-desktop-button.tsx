"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, type Lang } from "@/components/bloom/i18n";
import { detectOs, isDesktopApp, type DesktopOs } from "./desktop-env";

const LABELS: Record<Lang, Record<DesktopOs, string> & { short: string }> = {
  en: { windows: "Download for Windows", mac: "Download for macOS", other: "Get the desktop app", short: "Download OS" },
  es: { windows: "Descargar para Windows", mac: "Descargar para macOS", other: "Obtener la app de escritorio", short: "Descargar OS" },
  he: { windows: "הורדה ל-Windows", mac: "הורדה ל-macOS", other: "לאפליקציית הדסקטופ", short: "הורדת OS" },
};

/** Windows and Mac get their installer; anyone else gets the page that lists both. */
const href = (os: DesktopOs) => (os === "other" ? "/download" : `/api/desktop/download?os=${os}`);

/**
 * "Download OS": detects Windows or macOS and serves that installer (.exe / .dmg) through /api/desktop/download.
 * Hidden inside the desktop app itself. `nav` is the compact header form; `hero` sits beside the hero's main CTA.
 */
export function DownloadDesktopButton({ variant = "hero", className, onClick }: { variant?: "nav" | "hero"; className?: string; onClick?: () => void }) {
  const { lang } = useI18n();
  const [os, setOs] = useState<DesktopOs | null>(null);
  const [inApp, setInApp] = useState(false);

  // Detected after mount, so the server render and first client render match.
  useEffect(() => {
    setOs(detectOs());
    setInApp(isDesktopApp());
  }, []);

  if (inApp) return null;
  const l = LABELS[lang];
  const label = os ? l[os] : l.other;

  if (variant === "nav")
    return (
      <a
        href={href(os ?? "other")}
        onClick={onClick}
        title={label}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-[13px] text-white/80 transition-colors hover:border-[#f0d59a]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-[#f0d59a]",
          className,
        )}
      >
        <Download className="size-4" />
        <span>{l.short}</span>
      </a>
    );

  return (
    <a
      href={href(os ?? "other")}
      onClick={onClick}
      className={cn(
        "inline-flex h-13 items-center gap-2 rounded-full border border-[#f0d59a]/40 bg-ink/40 px-7 text-sm font-medium text-[#f3e2b8] backdrop-blur-md transition-colors hover:border-[#f0d59a]/70 hover:bg-[#f0d59a]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d59a]",
        className,
      )}
    >
      <Download className="size-4" />
      {label}
    </a>
  );
}
