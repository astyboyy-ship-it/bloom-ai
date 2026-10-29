"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n";
import { LanguageSwitcher } from "./language-switcher";
import { BloomLogo } from "./logo";
import { SNAP } from "./motion";

export function Navbar() {
  const { t, lang, dir } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // On engine pages, section links point back to the home page; the waitlist exists on both.
  const home = usePathname() === "/" ? "" : "/";
  const links = [
    { href: `${home}#engines`, label: t.nav.engines },
    { href: `${home}#architectures`, label: t.nav.architectures },
    { href: `${home}#developers`, label: t.nav.partners },
    { href: `${home}#morning`, label: t.nav.morning },
    { href: `${home}#night-shift`, label: t.nav.nightShift },
    { href: "#waitlist", label: t.nav.waitlist },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4"
    >
      <nav
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 transition-all duration-500 sm:px-5",
          scrolled ? "glass" : "border border-transparent",
        )}
      >
        <BloomLogo />

        <ul className="hidden items-center lg:flex" onMouseLeave={() => setHovered(null)} lang={lang} dir={dir}>
          {links.map((l) => (
            <li key={l.href} className="relative">
              <a
                href={l.href}
                onMouseEnter={() => setHovered(l.href)}
                className="relative z-10 block px-4 py-2 text-[13px] text-white/55 transition-colors hover:text-white"
              >
                {l.label}
              </a>
              {hovered === l.href && (
                <motion.span
                  layoutId="nav-hover"
                  className="absolute inset-0 rounded-lg bg-white/[0.06]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/command"
            lang={lang}
            className="group relative hidden items-center gap-1.5 overflow-hidden rounded-xl bg-white px-4 py-2 text-[13px] font-medium text-black transition-shadow hover:shadow-[0_0_32px_-4px_rgb(245_169_176/0.8)] sm:inline-flex"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-rose via-sun to-dusk transition-transform duration-500 group-hover:translate-x-0" />
            <span className="relative">{t.nav.cta}</span>
            <ArrowUpRight className="relative size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex size-10 items-center justify-center rounded-xl text-white/70 hover:bg-white/5 hover:text-white lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={SNAP}
            lang={lang}
            dir={dir}
            className="glass mx-auto mt-2 max-w-6xl rounded-2xl p-2 lg:hidden"
          >
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/command"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black"
            >
              {t.nav.cta} <ArrowUpRight className="size-4" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
