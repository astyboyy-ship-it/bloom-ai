"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, animate, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, Presentation, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { paintings } from "@/components/bloom/art/paintings";
import { BloomWordmark } from "@/components/bloom/logo";
import { ENGINE_ORDER, ENGINES } from "@/components/bloom/command/engines";
import { PALETTES, paletteVars } from "@/components/bloom/command/theme";
import { audit, updateSettings, useDeskSettings, verifyAudit } from "@/components/desk/settings";
import { ENGINE_ART } from "./engine-art";
import { localizeEngine, useCommandCopy } from "@/components/bloom/command/locale";
import type { Lang } from "@/components/bloom/i18n";
import { architecturesIn } from "@/lib/architecture-text";
import { useLicense } from "@/lib/license-context";
import { tierInfo } from "@/lib/license/tiers";

const COPY = {
  en: {
    headline: "The autonomous revenue operating system",
    sub: "Eight engines, ten architecture products, one governed workforce running around the clock.",
    engines: "Eight engines, one network",
    publicDomain: "Public domain.",
    credits: "Card artwork: public-domain works by Panini, Piranesi, Leonardo, Cellarius, Raphael, Pige, Constable and a 14th-century Genoese chartmaker, via Wikimedia Commons.",
    was: (n: number) => `was ${n}`,
    model: "Illustrative operating model for a mid-market revenue team.",
    live: "This workspace, live",
    nodes: "Agent nodes online",
    runs: "Runs completed",
    success: "Success rate",
    approved: "Decisions approved",
    trust: "Governed, screened, on the record",
    chain: "Audit chain",
    intact: "Intact",
    broken: "Broken",
    entries: "Entries on record",
    threats: "Threats contained",
    close: "Deploy your shadow workforce",
    closeSub: "From the first buying signal to signed, governed revenue: one operating desk.",
    explore: "Explore the products",
    exit: "Exit demo mode",
    presentation: "Executive presentation",
    slide: (n: number) => `Slide ${n}`,
    prev: "Previous slide",
    next: "Next slide",
    full: "Full screen",
  },
  es: {
    headline: "El sistema operativo de ingresos autónomo",
    sub: "Ocho motores, diez productos de arquitectura y una sola fuerza de trabajo gobernada, funcionando día y noche.",
    engines: "Ocho motores, una red",
    publicDomain: "Dominio público.",
    credits: "Arte de las tarjetas: obras de dominio público de Panini, Piranesi, Leonardo, Cellarius, Rafael, Pige, Constable y un cartógrafo genovés del siglo XIV, vía Wikimedia Commons.",
    was: (n: number) => `antes ${n}`,
    model: "Modelo operativo ilustrativo para un equipo de ingresos mid-market.",
    live: "Este espacio de trabajo, en vivo",
    nodes: "Nodos de agentes en línea",
    runs: "Ejecuciones completadas",
    success: "Tasa de éxito",
    approved: "Decisiones aprobadas",
    trust: "Gobernado, revisado y registrado",
    chain: "Cadena de auditoría",
    intact: "Intacta",
    broken: "Rota",
    entries: "Entradas registradas",
    threats: "Amenazas contenidas",
    close: "Despliega tu fuerza de trabajo en la sombra",
    closeSub: "De la primera señal de compra a ingresos firmados y gobernados: un solo escritorio de operaciones.",
    explore: "Explora los productos",
    exit: "Salir del modo demo",
    presentation: "Presentación ejecutiva",
    slide: (n: number) => `Diapositiva ${n}`,
    prev: "Diapositiva anterior",
    next: "Diapositiva siguiente",
    full: "Pantalla completa",
  },
  he: {
    headline: "מערכת ההפעלה האוטונומית להכנסות",
    sub: "שמונה מנועים, עשרה מוצרי ארכיטקטורה וכוח עבודה מנוהל אחד שעובד מסביב לשעון.",
    engines: "שמונה מנועים, רשת אחת",
    publicDomain: "נחלת הכלל.",
    credits: "האיורים בכרטיסים: יצירות בנחלת הכלל של פניני, פירנזי, לאונרדו, צלריוס, רפאל, פיג׳ה, קונסטבל וקרטוגרף גנואזי מהמאה ה־14, דרך Wikimedia Commons.",
    was: (n: number) => `היה ${n}`,
    model: "מודל תפעולי להמחשה עבור צוות הכנסות בשוק הבינוני.",
    live: "סביבת העבודה הזו, בזמן אמת",
    nodes: "צמתי סוכנים מחוברים",
    runs: "הרצות שהושלמו",
    success: "שיעור הצלחה",
    approved: "החלטות שאושרו",
    trust: "מנוהל, נסרק ומתועד",
    chain: "שרשרת ביקורת",
    intact: "תקינה",
    broken: "שבורה",
    entries: "רשומות מתועדות",
    threats: "איומים שנבלמו",
    close: "פרסו את כוח העבודה הסמוי שלכם",
    closeSub: "מאות הקנייה הראשון ועד הכנסה חתומה ומנוהלת: שולחן תפעול אחד.",
    explore: "הכירו את המוצרים",
    exit: "יציאה ממצב דמו",
    presentation: "מצגת מנהלים",
    slide: (n: number) => `שקופית ${n}`,
    prev: "השקופית הקודמת",
    next: "השקופית הבאה",
    full: "מסך מלא",
  },
} satisfies Record<Lang, unknown>;

/** Large number that counts up when its slide appears. */
function Big({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: setV });
    return () => c.stop();
  }, [value]);
  return (
    <span className="tabular-nums">
      {prefix}
      {v.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

function Card({ label, children, tone = "text-os-cyan" }: { label: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className="os-panel rounded-3xl px-8 py-7">
      <p className="os-label">{label}</p>
      <p className={cn("mt-3 font-mono text-[52px] leading-none sm:text-[64px]", tone)}>{children}</p>
    </div>
  );
}

/** /desk/demo: the OS as a cinematic presentation deck. Turns Demo Mode on, which also hides logs and JSON elsewhere. */
export function DemoDeck() {
  const { lang } = useCommandCopy();
  const t = COPY[lang];
  const { settings } = useDeskSettings();
  const { tier, engines } = useLicense();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!settings.demoMode) {
      updateSettings({ demoMode: true });
      audit("settings", "Entered executive demo mode");
    }
    // Only on arrival: leaving the deck doesn't turn Demo Mode off; the header toggle does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runs = settings.runs;
  const ok = runs.filter((r) => r.ok);
  const approvals = settings.audit.filter((a) => a.kind === "approval").length;
  const threats = settings.audit.filter((a) => a.kind === "security").length;
  const chain = useMemo(() => verifyAudit(settings.audit), [settings.audit]);
  const nodes = engines.reduce((s, k) => s + ENGINES[k].cards.reduce((n, c) => n + c.agents, 0), 0);
  const flagship = architecturesIn(lang).find((a) => a.id === "os")!;

  const slides = [
    {
      key: "title",
      body: (
        <div className="text-center">
          <p className="os-label text-os-cyan">{settings.branding.orgName || "Bloom AI"} · {tierInfo(lang)[tier].label}</p>
          <p className="mt-6 text-7xl sm:text-8xl">
            <BloomWordmark />
          </p>
          <h1 className="mt-6 text-[34px] font-semibold tracking-[-0.02em] text-white sm:text-[48px]">{t.headline}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] text-white/60">{t.sub}</p>
        </div>
      ),
    },
    {
      key: "engines",
      body: (
        <div>
          <h2 className="text-center text-[34px] font-semibold text-white">{t.engines}</h2>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
            {ENGINE_ORDER.map((k, n) => {
              const art = ENGINE_ART[k];
              return (
                <motion.div key={k} style={paletteVars(PALETTES[k])} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n * 0.08 }} title={`${art.title}, ${art.artist} (${art.year}). ${t.publicDomain}`} className="group relative isolate overflow-hidden rounded-2xl border border-os-line bg-os-bg text-center shadow-[0_20px_50px_-30px_rgb(0_0_0/0.9)]">
                  {/* Artwork, sunk under an obsidian glass overlay so the ring and text stay sharp. */}
                  <Image src={art.src} alt="" fill sizes="(min-width: 640px) 25vw, 50vw" className="-z-20 object-cover saturate-[0.85] transition-transform duration-[1.6s] ease-out group-hover:scale-105" />
                  {/* Obsidian glass: the full 80% blurred overlay under the text, easing off toward the top so the artwork reads. */}
                  <span aria-hidden className="absolute inset-0 -z-10 bg-[#07080c]/45" />
                  <span aria-hidden className="absolute inset-0 -z-10 bg-[#07080c]/80 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent_0%,rgb(0_0_0/0.55)_30%,black_58%)]" />
                  <span aria-hidden className="absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-c-1/60 to-transparent" />
                  <div className="p-5">
                    <motion.span className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-c-1 bg-[#07080c]/40 font-mono text-[16px] text-c-2 shadow-[0_0_30px_-6px_var(--c-glow)]" animate={{ boxShadow: ["0 0 18px -6px var(--c-glow)", "0 0 36px -2px var(--c-glow)", "0 0 18px -6px var(--c-glow)"] }} transition={{ duration: 2.4, repeat: Infinity, delay: n * 0.3 }}>
                      {ENGINES[k].index}
                    </motion.span>
                    <p className="mt-3 text-[17px] font-semibold text-white drop-shadow-[0_1px_8px_rgb(0_0_0/0.8)]">{ENGINES[k].name}</p>
                    <p className="mt-1 text-[12px] text-white/60">{localizeEngine(ENGINES[k], lang).role}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p className="mt-5 text-center text-[11px] text-white/30">{t.credits}</p>
        </div>
      ),
    },
    {
      key: "product",
      body: (
        <div>
          <h2 className="text-center text-[34px] font-semibold text-white">{flagship.name}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[16px] text-white/55">{flagship.tagline}</p>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-3">
            {flagship.impact.compare.map((m) => (
              <Card key={m.label} label={m.label} tone="text-os-emerald">
                <Big value={m.after} decimals={m.after % 1 ? 1 : 0} />
                <span className="ms-2 text-[18px] text-white/40">{m.unit}</span>
                <span className="mt-2 block text-[15px] text-white/35 line-through">{t.was(m.before)}</span>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-center text-[12px] text-white/35">{t.model}</p>
        </div>
      ),
    },
    {
      key: "results",
      body: (
        <div>
          <h2 className="text-center text-[34px] font-semibold text-white">{t.live}</h2>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card label={t.nodes}>
              <Big value={nodes} />
            </Card>
            <Card label={t.runs} tone="text-os-emerald">
              <Big value={ok.length} />
            </Card>
            <Card label={t.success}>
              <Big value={runs.length ? (ok.length / runs.length) * 100 : 100} suffix="%" />
            </Card>
            <Card label={t.approved} tone="text-os-gold">
              <Big value={approvals} />
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: "trust",
      body: (
        <div className="text-center">
          <ShieldCheck className="mx-auto size-14 text-os-emerald drop-shadow-[0_0_20px_#34f5b5]" />
          <h2 className="mt-5 text-[34px] font-semibold text-white">{t.trust}</h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            <Card label={t.chain} tone={chain.ok ? "text-os-emerald" : "text-red-300"}>
              {chain.ok ? t.intact : t.broken}
            </Card>
            <Card label={t.entries}>
              <Big value={settings.audit.length} />
            </Card>
            <Card label={t.threats} tone="text-os-gold">
              <Big value={threats} />
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: "close",
      body: (
        <div className="text-center">
          <h2 className="text-[40px] font-semibold tracking-[-0.02em] text-white sm:text-[56px]">{t.close}</h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/60">{t.closeSub}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/desk/architectures" className="rounded-full bg-os-cyan px-7 py-3 text-[15px] font-semibold text-black shadow-[0_0_40px_-8px_#00f0ff]">
              {t.explore}
            </Link>
            <button
              type="button"
              onClick={() => {
                updateSettings({ demoMode: false });
                audit("settings", "Left executive demo mode");
              }}
              className="rounded-full border border-os-line px-7 py-3 text-[15px] text-white/75"
            >
              {t.exit}
            </button>
          </div>
        </div>
      ),
    },
  ];

  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))), [slides.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") go(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const p = paintings[ENGINES[ENGINE_ORDER[i % 8]].painting];

  return (
    <main className="relative isolate flex min-h-[calc(100dvh-7rem)] flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.div key={p.src} className="absolute inset-0 -z-10" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
          <Image src={p.src} alt="" fill sizes="100vw" className="object-cover opacity-20" style={{ objectPosition: p.focus }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(7_8_12/0.55),#07080c_75%)]" />
        </motion.div>
      </AnimatePresence>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div key={slides[i].key} className="w-full" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            {slides[i].body}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-os-line bg-os-bg/70 px-5 py-3 backdrop-blur-md">
        <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-os-violet">
          <Presentation className="size-3.5" /> {t.presentation}
        </span>
        <div className="flex items-center gap-1.5">
          {slides.map((s, n) => (
            <button key={s.key} type="button" aria-label={t.slide(n + 1)} onClick={() => setI(n)} className={cn("h-1.5 rounded-full transition-all", n === i ? "w-8 bg-os-cyan" : "w-3 bg-white/20")} />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => go(-1)} disabled={i === 0} aria-label={t.prev} className="rounded-lg p-2 text-white/60 hover:text-white disabled:opacity-30">
            <ChevronLeft className="size-5 rtl:-scale-x-100" />
          </button>
          <button type="button" onClick={() => go(1)} disabled={i === slides.length - 1} aria-label={t.next} className="rounded-lg p-2 text-white/60 hover:text-white disabled:opacity-30">
            <ChevronRight className="size-5 rtl:-scale-x-100" />
          </button>
          <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} aria-label={t.full} className="rounded-lg p-2 text-white/60 hover:text-white">
            <Expand className="size-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
