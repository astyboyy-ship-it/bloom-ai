"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGUAGES, useI18n } from "./i18n";
import { SNAP } from "./motion";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t.nav.language}: ${current.native}`}
        onClick={() => setOpen((o) => !o)}
        className="glass inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12px] font-medium text-white/80 transition-colors hover:text-white"
      >
        <Globe className="size-4 text-sun" />
        {current.label}
        <ChevronDown className={cn("size-3.5 text-white/40 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={SNAP}
            className="glass absolute end-0 top-full z-50 mt-2 w-44 origin-top-right overflow-hidden rounded-2xl p-1.5 rtl:origin-top-left"
          >
            {LANGUAGES.map((l) => (
              <li key={l.code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={lang === l.code}
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition-colors",
                    lang === l.code ? "bg-white/[0.08] text-white" : "text-white/65 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <span className="w-6 font-mono text-[10px] text-white/40">{l.label}</span>
                  <span className="flex-1" lang={l.code} dir={l.code === "he" ? "rtl" : "ltr"}>
                    {l.native}
                  </span>
                  {lang === l.code && <Check className="size-3.5 text-sun" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
