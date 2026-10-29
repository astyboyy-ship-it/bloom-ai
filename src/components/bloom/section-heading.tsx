"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n";

export function SectionHeading({
  kanji,
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  kanji?: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { lang, dir } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      lang={lang}
      dir={dir}
      className={cn("mx-auto max-w-3xl text-center [text-shadow:0_2px_36px_rgb(11_6_18/0.7)]", className)}
    >
      <p className="mb-6 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-white/45">
        {kanji && <span className="font-jp text-sm normal-case tracking-normal text-rose">{kanji}</span>}
        <span className="h-px w-8 bg-gradient-to-r from-rose/60 to-transparent" />
        {eyebrow}
      </p>
      <h2 className="text-balance text-4xl font-medium leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl">{title}</h2>
      {description && (
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/55 sm:text-lg">{description}</p>
      )}
      {children}
    </motion.div>
  );
}

/** Serif italic accent used inside headings. */
export function Accent({ children, gradient = true }: { children: React.ReactNode; gradient?: boolean }) {
  return (
    <span className={cn("font-serif font-normal italic tracking-[-0.01em]", gradient && "text-bloom-gradient pr-[0.08em]")}>
      {children}
    </span>
  );
}
